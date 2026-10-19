import dns from "node:dns/promises";
import net from "node:net";

export const MAX_BODY_BYTES = 5 * 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 20_000;
export const DEFAULT_MAX_REDIRECTS = 5;
export const DEFAULT_MAX_ATTEMPTS = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function ipv4Number(address) {
  return address.split(".").reduce((value, part) => (value * 256) + Number(part), 0) >>> 0;
}

function ipv4InRange(address, base, bits) {
  const value = ipv4Number(address);
  const baseValue = ipv4Number(base);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

export function isUnsafeAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, bits]) => ipv4InRange(address, base, bits));
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized);
  }
  return true;
}

async function defaultResolver(hostname) {
  return dns.lookup(hostname, { all: true, verbatim: true });
}

export async function assertSafeUrl(value, resolver = defaultResolver, { allowHttp = false } = {}) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw new Error("Invalid source URL");
  }

  if (url.protocol === "http:" && !allowHttp) throw new Error("HTTP source requires allow_http=true");
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`Unsupported source protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Source URL credentials are not allowed");

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("Unsafe source host");

  const literalFamily = net.isIP(hostname);
  const records = literalFamily ? [{ address: hostname, family: literalFamily }] : await resolver(hostname);
  const normalizedRecords = Array.isArray(records) ? records : [records];
  if (!normalizedRecords.length) throw new Error("Source host did not resolve");
  if (normalizedRecords.some((record) => !record?.address || isUnsafeAddress(record.address))) {
    throw new Error("Unsafe source address");
  }
  return url;
}

export function classifyRetry(statusOrError) {
  if (typeof statusOrError === "number") {
    if ([408, 425, 429].includes(statusOrError) || statusOrError >= 500) return "retryable";
    return "permanent";
  }
  const error = statusOrError;
  if (error?.name === "AbortError" || /timeout/i.test(String(error?.message ?? ""))) return "retryable";
  return "permanent";
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBoundedBody(response, maxBytes) {
  const lengthHeader = response.headers?.get?.("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) throw new Error(`Source response too large: ${lengthHeader} bytes`);

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error(`Source response too large: exceeds ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: new TextDecoder().decode(merged), byteSize: size };
  }

  const body = await response.text();
  const byteSize = new TextEncoder().encode(body).byteLength;
  if (byteSize > maxBytes) throw new Error(`Source response too large: ${byteSize} bytes`);
  return { body, byteSize };
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal, redirect: "manual", headers });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Fetch timeout after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSource(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolver = options.resolver ?? defaultResolver;
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;
  const jitter = options.jitter ?? Math.random;
  const allowHttp = source?.allow_http === true || source?.metadata?.allow_http === true;
  const headers = {
    "user-agent": "Mozilla/5.0 (compatible; DataCenterForum/2.0; +https://datacenter.forum)",
    "accept-language": "en-US,en;q=0.9",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/json;q=0.7",
  };

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const started = Date.now();
    try {
      let current = await assertSafeUrl(source?.url, resolver, { allowHttp });
      let redirects = 0;
      let response;

      while (true) {
        response = await fetchWithTimeout(fetchImpl, current.toString(), timeoutMs, headers);
        if (!REDIRECT_STATUSES.has(response.status)) break;
        const location = response.headers?.get?.("location");
        if (!location) throw new Error(`Redirect ${response.status} missing location`);
        redirects += 1;
        if (redirects > maxRedirects) throw new Error(`Too many redirects: ${redirects}`);
        current = await assertSafeUrl(new URL(location, current).toString(), resolver, { allowHttp });
      }

      if (!response.ok) {
        const error = new Error(`Source returned HTTP ${response.status}`);
        error.status = response.status;
        if (classifyRetry(response.status) === "retryable" && attempt < maxAttempts) {
          await sleep((250 * (2 ** (attempt - 1))) + Math.floor(jitter() * 100));
          continue;
        }
        throw error;
      }

      const { body, byteSize } = await readBoundedBody(response, maxBytes);
      return {
        finalUrl: current.toString(),
        status: response.status,
        contentType: response.headers?.get?.("content-type") ?? null,
        byteSize,
        body,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      lastError = error;
      if (classifyRetry(error?.status ?? error) === "retryable" && attempt < maxAttempts) {
        await sleep((250 * (2 ** (attempt - 1))) + Math.floor(jitter() * 100));
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error("Source fetch failed");
}

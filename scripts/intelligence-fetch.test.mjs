import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "intelligence-fetch.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/intelligence-fetch.mjs must exist");
  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

function response(status, body = "ok", headers = {}) {
  const normalized = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => normalized.get(String(name).toLowerCase()) ?? null },
    text: async () => body,
  };
}

test("safe URL validation rejects private, metadata, loopback and unsupported targets", async () => {
  const { assertSafeUrl } = await loadModule();
  await assert.doesNotReject(() => assertSafeUrl("https://example.com/news", publicResolver));
  await assert.rejects(() => assertSafeUrl("ftp://example.com/file", publicResolver), /protocol/i);
  await assert.rejects(() => assertSafeUrl("http://example.com/file", publicResolver), /allow_http/i);
  await assert.doesNotReject(() => assertSafeUrl("http://example.com/file", publicResolver, { allowHttp: true }));
  await assert.rejects(() => assertSafeUrl("https://localhost/file", async () => [{ address: "127.0.0.1", family: 4 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://private.example/file", async () => [{ address: "10.0.0.8", family: 4 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://metadata.example/file", async () => [{ address: "169.254.169.254", family: 4 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://ipv6.example/file", async () => [{ address: "::1", family: 6 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://mapped-loopback.example/file", async () => [{ address: "::ffff:127.0.0.1", family: 6 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://mapped-private.example/file", async () => [{ address: "::ffff:10.0.0.8", family: 6 }]), /unsafe/i);
  await assert.rejects(() => assertSafeUrl("https://multicast.example/file", async () => [{ address: "ff02::1", family: 6 }]), /unsafe/i);
});

test("fetcher validates every redirect before following it", async () => {
  const { fetchSource } = await loadModule();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(302, "", { location: "https://metadata.local/latest" });
  };
  const resolver = async (host) => host === "metadata.local"
    ? [{ address: "169.254.169.254", family: 4 }]
    : [{ address: "93.184.216.34", family: 4 }];
  await assert.rejects(() => fetchSource({ url: "https://example.com/start" }, { fetchImpl, resolver }), /unsafe/i);
  assert.equal(calls, 1, "unsafe redirect target must not be fetched");
});

test("fetcher enforces byte cap and default is 5 MB", async () => {
  const { fetchSource, MAX_BODY_BYTES } = await loadModule();
  assert.equal(MAX_BODY_BYTES, 5 * 1024 * 1024);
  await assert.rejects(
    () => fetchSource({ url: "https://example.com/large" }, { resolver: publicResolver, fetchImpl: async () => response(200, "x".repeat(17)), maxBytes: 16 }),
    /too large/i
  );
});

test("fetcher times out before response headers without hanging the batch", async () => {
  const { fetchSource } = await loadModule();
  const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
  });
  await assert.rejects(
    () => fetchSource({ url: "https://example.com/slow" }, { resolver: publicResolver, fetchImpl, timeoutMs: 5, maxAttempts: 1 }),
    /timeout/i
  );
});

test("fetcher deadline remains active while the response body streams", async () => {
  const { fetchSource } = await loadModule();
  const fetchImpl = async (_url, { signal }) => ({
    status: 200,
    ok: true,
    headers: { get: (name) => String(name).toLowerCase() === "content-type" ? "text/html" : null },
    body: {
      getReader() {
        return {
          read() {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => resolve({ done: true, value: undefined }), 40);
              signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(Object.assign(new Error("aborted while streaming"), { name: "AbortError" }));
              }, { once: true });
            });
          },
          async cancel() {},
        };
      },
    },
  });
  await assert.rejects(
    () => fetchSource({ url: "https://example.com/slow-body" }, { resolver: publicResolver, fetchImpl, timeoutMs: 5, maxAttempts: 1 }),
    /timeout/i
  );
});

test("retry classification and attempts match v1 policy", async () => {
  const { classifyRetry, fetchSource } = await loadModule();
  for (const status of [408, 425, 429, 500, 503]) assert.equal(classifyRetry(status), "retryable");
  for (const status of [400, 401, 403, 404]) assert.equal(classifyRetry(status), "permanent");

  let attempts = 0;
  const result = await fetchSource(
    { url: "https://example.com/retry" },
    {
      resolver: publicResolver,
      fetchImpl: async () => (++attempts < 3 ? response(503) : response(200, "done", { "content-type": "text/html" })),
      sleep: async () => {},
      jitter: () => 0,
    }
  );
  assert.equal(attempts, 3);
  assert.equal(result.body, "done");
  assert.equal(result.status, 200);
});

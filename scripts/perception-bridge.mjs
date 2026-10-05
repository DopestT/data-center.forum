import crypto from "node:crypto";

export function buildPerceptionEvent(change) {
  const sourceId = String(change.source_id ?? "").trim();
  const currentHash = String(change.current_hash ?? "").trim();
  if (!sourceId || !currentHash) {
    throw new Error("Perception source-change event requires source_id and current_hash");
  }

  const observedAt = String(change.detected_at ?? new Date().toISOString());
  const publisher = String(change.publisher ?? sourceId);
  const canonicalUrl = String(change.url ?? "");

  return {
    event_id: `source-change:${sourceId}:${currentHash}`.slice(0, 200),
    event_type: "evidence.observed",
    subject_ref: `official-source:${sourceId}`.slice(0, 500),
    summary: `DataCenter.Forums detected an official-source fingerprint change for ${publisher}`.slice(0, 5000),
    observed_at: observedAt,
    data: {
      canonicalUrl,
      source_id: sourceId,
      publisher,
      project_slugs: Array.isArray(change.project_slugs) ? change.project_slugs : [],
      previous_hash: String(change.previous_hash ?? ""),
      current_hash: currentHash,
      verification_status: "needs_verification",
    },
  };
}

export function signPerceptionBody(secret, timestamp, body) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Perception bridge HMAC secret must be at least 32 characters");
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `sha256=${digest}`;
}

export async function sendPerceptionEvent(event, options = {}) {
  const url = String(options.url ?? process.env.PERCEPTION_BRIDGE_URL ?? "").trim();
  const secret = String(options.secret ?? process.env.PERCEPTION_BRIDGE_HMAC_SECRET ?? "").trim();
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  if (!url) throw new Error("PERCEPTION_BRIDGE_URL is not configured");
  if (secret.length < 32) throw new Error("PERCEPTION_BRIDGE_HMAC_SECRET is not configured");

  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(now() / 1000));
  const signature = signPerceptionBody(secret, timestamp, body);

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-perception-client": "datacenter-forums",
      "x-perception-timestamp": timestamp,
      "x-perception-signature": signature,
    },
    body,
    redirect: "error",
  });

  if (!response.ok) {
    const responseText = typeof response.text === "function" ? await response.text() : "";
    throw new Error(`Perception bridge HTTP ${response.status}${responseText ? `: ${responseText.slice(0, 500)}` : ""}`);
  }

  return typeof response.json === "function" ? await response.json() : { ok: true };
}

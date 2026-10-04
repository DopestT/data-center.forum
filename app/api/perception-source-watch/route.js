import fs from "node:fs";
import { extractContent } from "../../../scripts/intelligence-content.mjs";
import { sendPerceptionEvent } from "../../../scripts/perception-bridge.mjs";
import { runPerceptionSourceWatch } from "../../../scripts/perception-source-watch.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const registryPath = new URL("../../../data/source-registry.json", import.meta.url);
const snapshotPath = new URL("../../../data/source-snapshots.json", import.meta.url);

export function isAuthorizedCron(authHeader, cronSecret) {
  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

async function fetchSourceContent(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DataCenterForum/1.0; +https://datacenter.forum)",
        "accept-language": "en-US,en;q=0.9",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return extractContent(await response.text(), source.url);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET ?? "")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bridgeUrl = (process.env.PERCEPTION_BRIDGE_URL ?? "").trim();
  const bridgeSecret = (process.env.PERCEPTION_BRIDGE_HMAC_SECRET ?? "").trim();
  if (!bridgeUrl || bridgeSecret.length < 32) {
    return Response.json({ error: "Perception bridge is not configured" }, { status: 503 });
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const snapshots = fs.existsSync(snapshotPath)
    ? JSON.parse(fs.readFileSync(snapshotPath, "utf8"))
    : {};

  const result = await runPerceptionSourceWatch({
    registry,
    snapshots,
    fetchContent: fetchSourceContent,
    sendEvent: (event) => sendPerceptionEvent(event, {
      url: bridgeUrl,
      secret: bridgeSecret,
    }),
  });

  const deliveryFailures = result.failures.filter((failure) => failure.stage === "deliver");
  const status = deliveryFailures.length ? 502 : 200;

  return Response.json({
    ok: deliveryFailures.length === 0,
    ...result,
  }, { status });
}

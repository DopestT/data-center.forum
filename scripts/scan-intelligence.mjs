import fs from "node:fs";
import { extractContent, observeSource } from "./intelligence-content.mjs";
const dryRun = process.argv.includes("--dry-run");

const registryPath = new URL("../data/source-registry.json", import.meta.url);
const snapshotPath = new URL("../data/source-snapshots.json", import.meta.url);
const queuePath = new URL("../data/intelligence-change-queue.json", import.meta.url);
const latestPath = new URL("../data/latest-intelligence-changes.md", import.meta.url);

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const snapshots = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")) : {};
const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf8")) : [];

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DataCenterForum/1.0; +https://datacenter.forum)",
        "accept-language": "en-US,en;q=0.9",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return extractContent(await response.text(), url);
  } finally {
    clearTimeout(timeout);
  }
}

const detectedAt = new Date().toISOString();
const changes = [];
const failures = [];
let baselineCount = 0;
let observedCount = 0;

for (const source of registry) {
  try {
    const content = await fetchText(source.url);
    const result = observeSource(source, content, snapshots[source.id], detectedAt);
    snapshots[source.id] = result.snapshot;
    observedCount += 1;
    if (result.baseline) baselineCount += 1;
    if (result.change) changes.push(result.change);
  } catch (error) {
    failures.push({ source_id: source.id, url: source.url, error: error instanceof Error ? error.message : String(error) });
  }
}

if (!dryRun && observedCount) {
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshots, null, 2) + "\n");
}

if (!dryRun && changes.length) {
  const nextQueue = [...changes, ...queue].slice(0, 500);
  fs.writeFileSync(queuePath, JSON.stringify(nextQueue, null, 2) + "\n");

  const lines = [
    "# Intelligence source changes",
    "",
    `Detected: ${detectedAt}`,
    "",
    ...changes.flatMap((change) => [
      `## ${change.publisher} — ${(change.project_slugs ?? []).join(", ") || "multi-project source"}`,
      `- Source: ${change.url}`,
      `- Status: needs verification`,
      `- Previous fingerprint: ${change.previous_hash.slice(0, 12)}…`,
      `- Current fingerprint: ${change.current_hash.slice(0, 12)}…`,
      ""
    ])
  ];
  fs.writeFileSync(latestPath, lines.join("\n"));
}

if (!dryRun && process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `change_count=${changes.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `baseline_count=${baselineCount}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `failure_count=${failures.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `observed_count=${observedCount}\n`);
}

console.log(JSON.stringify({ dryRun, checked: registry.length, observedCount, baselineCount, changeCount: changes.length, failures }, null, 2));

if (failures.length > Math.ceil(registry.length / 2)) {
  process.exitCode = 1;
}

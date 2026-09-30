import fs from "node:fs";
import crypto from "node:crypto";

const registryPath = new URL("../data/source-registry.json", import.meta.url);
const snapshotPath = new URL("../data/source-snapshots.json", import.meta.url);
const queuePath = new URL("../data/intelligence-change-queue.json", import.meta.url);
const latestPath = new URL("../data/latest-intelligence-changes.md", import.meta.url);

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const snapshots = fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, "utf8")) : {};
const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf8")) : [];

function normalizeHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

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
    return normalizeHtml(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

const detectedAt = new Date().toISOString();
const changes = [];
const failures = [];
let baselineCount = 0;

for (const source of registry) {
  try {
    const text = await fetchText(source.url);
    const hash = crypto.createHash("sha256").update(text).digest("hex");
    const previous = snapshots[source.id];

    if (!previous) {
      snapshots[source.id] = { hash, project_slug: source.project_slug, publisher: source.publisher, url: source.url, first_seen_at: detectedAt, changed_at: detectedAt };
      baselineCount += 1;
      continue;
    }

    if (previous.hash !== hash) {
      const change = {
        source_id: source.id,
        project_slug: source.project_slug,
        publisher: source.publisher,
        url: source.url,
        detected_at: detectedAt,
        previous_hash: previous.hash,
        current_hash: hash,
        status: "needs_verification"
      };
      changes.push(change);
      snapshots[source.id] = { ...previous, hash, changed_at: detectedAt };
    }
  } catch (error) {
    failures.push({ source_id: source.id, url: source.url, error: error instanceof Error ? error.message : String(error) });
  }
}

if (baselineCount || changes.length) {
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshots, null, 2) + "\n");
}

if (changes.length) {
  const nextQueue = [...changes, ...queue].slice(0, 500);
  fs.writeFileSync(queuePath, JSON.stringify(nextQueue, null, 2) + "\n");

  const lines = [
    "# Intelligence source changes",
    "",
    `Detected: ${detectedAt}`,
    "",
    ...changes.flatMap((change) => [
      `## ${change.publisher} — ${change.project_slug}`,
      `- Source: ${change.url}`,
      `- Status: needs verification`,
      `- Previous fingerprint: ${change.previous_hash.slice(0, 12)}…`,
      `- Current fingerprint: ${change.current_hash.slice(0, 12)}…`,
      ""
    ])
  ];
  fs.writeFileSync(latestPath, lines.join("\n"));
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `change_count=${changes.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `baseline_count=${baselineCount}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `failure_count=${failures.length}\n`);
}

console.log(JSON.stringify({ checked: registry.length, baselineCount, changeCount: changes.length, failures }, null, 2));

if (failures.length > Math.ceil(registry.length / 2)) {
  process.exitCode = 1;
}

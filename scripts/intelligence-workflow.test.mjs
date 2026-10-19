import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("scheduled intelligence workflow dispatches hourly on Node 22", () => {
  const workflow = read(".github/workflows/intelligence-source-watch.yml");
  assert.match(workflow, /cron:\s*["']17 \* \* \* \*["']/i, "dispatcher must run hourly at minute 17");
  assert.match(workflow, /node-version:\s*["']22["']/i, "scheduled ingestion must use Node 22");
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run intel:test/, "tests must gate the scheduled runner");
  assert.match(workflow, /npm run intel:ingest/, "workflow must call the new due-source ingestion runner");
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL:\s*\$\{\{\s*secrets\.NEXT_PUBLIC_SUPABASE_URL\s*\}\}/);
  assert.match(workflow, /SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\.SUPABASE_SERVICE_ROLE_KEY\s*\}\}/);
  assert.doesNotMatch(workflow, /git add[^\n]*(?:source-snapshots|intelligence-change-queue|latest-intelligence-changes)/i, "new operational state must not be committed back to git");
  assert.doesNotMatch(workflow, /node scripts\/scan-intelligence\.mjs/, "legacy fingerprint scanner must not remain on the hourly production schedule");
});

test("CI uses the Node version required by current Supabase packages", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /node-version:\s*["']22["']/i);
  assert.match(workflow, /npm run intel:test|node --test scripts\/\*\.test\.mjs/);
  assert.match(workflow, /npm run build/);
});

test("package exposes the ingestion runner and focused intelligence suite", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["intel:ingest"], "node scripts/intelligence-ingest.mjs");
  assert.equal(pkg.scripts["intel:test"], "node --test scripts/*.test.mjs");
});

test("README documents migration 010 and the verification boundary", () => {
  const readme = read("README.md");
  assert.match(readme, /010_intelligence_ingestion\.sql/);
  assert.match(readme, /intel-source-snapshots/);
  assert.match(readme, /intel:sources:import/);
  assert.match(readme, /intel:ingest/);
  assert.match(readme, /verified/i);
  assert.match(readme, /unverified|raw observation/i);
});

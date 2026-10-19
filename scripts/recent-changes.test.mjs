import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");
const changesPage = path.join(rootDir, "app", "changes", "page.tsx");
const recentChangesLib = path.join(rootDir, "lib", "recent-changes.ts");
const intelligenceEventsLib = path.join(rootDir, "lib", "intelligence-events.ts");

test("public recent changes surface exists", () => {
  assert.equal(existsSync(changesPage), true, "app/changes/page.tsx must exist so verified intelligence changes have a buyer-facing surface");
  assert.equal(existsSync(recentChangesLib), true, "lib/recent-changes.ts must exist so the page has one bounded aggregation path");
  assert.equal(existsSync(intelligenceEventsLib), true, "lib/intelligence-events.ts must own the verified public event boundary");
});

test("recent changes surface uses verified events and never raw fingerprint detections", () => {
  const pageSource = readFileSync(changesPage, "utf8");
  const recentSource = readFileSync(recentChangesLib, "utf8");
  const eventsSource = readFileSync(intelligenceEventsLib, "utf8");

  assert.match(pageSource, /getRecentChanges\s*\(/, "page must load the bounded recent-changes feed");
  assert.match(pageSource, /VERIFIED CHANGES|Verified changes/i, "page must label the feed as verified");
  assert.match(recentSource, /getVerifiedIntelligenceEvents\s*\(/, "compatibility wrapper must use the shared verified event model");
  assert.match(recentSource, /occurredAt|publishedAt|verifiedAt/, "feed must preserve a verified event date for display");
  assert.match(eventsSource, /eq\(["']verification_status["'],\s*["']verified["']\)/, "event query must require verified status");
  assert.match(eventsSource, /eq\(["']is_public["'],\s*true\)/, "event query must require public visibility");
  assert.match(eventsSource, /getProjectGraph\s*\(/, "migration/outage fallback must still use the verified project graph");
  assert.doesNotMatch(`${recentSource}\n${eventsSource}`, /intelligence-change-queue|needs verification|source-snapshots/i, "raw source-watch detections must not enter the public feed");
});

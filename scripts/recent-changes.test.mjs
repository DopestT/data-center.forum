import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");
const changesPage = path.join(rootDir, "app", "changes", "page.tsx");
const recentChangesLib = path.join(rootDir, "lib", "recent-changes.ts");

test("public recent changes surface exists", () => {
  assert.equal(
    existsSync(changesPage),
    true,
    "app/changes/page.tsx must exist so verified intelligence changes have a buyer-facing surface"
  );
  assert.equal(
    existsSync(recentChangesLib),
    true,
    "lib/recent-changes.ts must exist so the page has one bounded aggregation path"
  );
});

test("recent changes surface uses verified project events, not raw fingerprint detections", () => {
  assert.equal(existsSync(changesPage), true, "changes page must exist before checking its contract");
  assert.equal(existsSync(recentChangesLib), true, "recent changes library must exist before checking its contract");

  const pageSource = readFileSync(changesPage, "utf8");
  const libSource = readFileSync(recentChangesLib, "utf8");

  assert.match(pageSource, /getRecentChanges\s*\(/, "page must load the bounded recent-changes feed");
  assert.match(pageSource, /VERIFIED CHANGES|Verified changes/i, "page must label the feed as verified");
  assert.match(libSource, /getProjectGraph\s*\(/, "feed must be built from verified project graph events");
  assert.match(libSource, /event\.date|\.date\)/, "feed must preserve event dates for sorting/display");
  assert.doesNotMatch(libSource, /fingerprint|needs verification|github.*issues/i, "raw source-watch detections must not enter the public feed");
});

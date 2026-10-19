import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "intelligence-schedule.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/intelligence-schedule.mjs must exist");
  return import(pathToFileURL(modulePath).href);
}

test("refresh classes map to exact v1 intervals", async () => {
  const { refreshIntervalMs } = await loadModule();
  assert.equal(refreshIntervalMs("rapid"), 2 * 60 * 60 * 1000);
  assert.equal(refreshIntervalMs("standard"), 6 * 60 * 60 * 1000);
  assert.equal(refreshIntervalMs("daily"), 24 * 60 * 60 * 1000);
  assert.equal(refreshIntervalMs("weekly"), 7 * 24 * 60 * 60 * 1000);
  assert.throws(() => refreshIntervalMs("unknown"), /refresh class/i);
});

test("nextDueAt advances from a supplied instant", async () => {
  const { nextDueAt } = await loadModule();
  assert.equal(nextDueAt("rapid", new Date("2026-10-19T00:00:00.000Z")), "2026-10-19T02:00:00.000Z");
  assert.equal(nextDueAt("weekly", new Date("2026-10-19T00:00:00.000Z")), "2026-10-26T00:00:00.000Z");
});

test("isSourceDue respects enabled and next_due_at", async () => {
  const { isSourceDue } = await loadModule();
  const now = new Date("2026-10-19T08:00:00.000Z");
  assert.equal(isSourceDue({ enabled: false, next_due_at: "2026-10-19T07:00:00.000Z" }, now), false);
  assert.equal(isSourceDue({ enabled: true, next_due_at: "2026-10-19T09:00:00.000Z" }, now), false);
  assert.equal(isSourceDue({ enabled: true, next_due_at: "2026-10-19T08:00:00.000Z" }, now), true);
  assert.equal(isSourceDue({ enabled: true, next_due_at: "2026-10-19T07:00:00.000Z" }, now), true);
});

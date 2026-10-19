import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "intelligence-ingest.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/intelligence-ingest.mjs must exist");
  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

function makeDb(lastBySource = {}) {
  const state = { fetches: [], observations: [], updates: [] };
  return {
    state,
    async getLastSuccessfulFetch(sourceId) { return lastBySource[sourceId] ?? null; },
    async recordFetch(row) { state.fetches.push(row); return row; },
    async recordObservations(rows) { state.observations.push(...rows); },
    async updateSource(sourceId, patch) { state.updates.push({ sourceId, patch }); },
  };
}

function makeStorage() {
  const uploads = [];
  return { uploads, async upload(pathname, body, options) { uploads.push({ pathname, body, options }); return { path: pathname }; } };
}

const sourceA = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  publisher: "A",
  url: "https://a.example/source",
  project_hint: "a-campus",
  refresh_class: "standard",
  enabled: true,
  consecutive_failures: 0,
};
const sourceB = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  publisher: "B",
  url: "https://b.example/source",
  project_hint: "b-campus",
  refresh_class: "daily",
  enabled: true,
  consecutive_failures: 0,
};

test("batch isolates a failed source and persists successful private observations", async () => {
  const { runIngestionBatch } = await loadModule();
  const db = makeDb();
  const storage = makeStorage();
  const fetchSourceImpl = async (source) => {
    if (source.id === sourceB.id) throw new Error("upstream failed");
    return { finalUrl: source.url, status: 200, contentType: "text/html", byteSize: 50, body: "<html><body>alpha content for project A</body></html>", durationMs: 12 };
  };

  const summary = await runIngestionBatch({
    sources: [sourceA, sourceB], db, storage, fetchSourceImpl,
    now: new Date("2026-10-19T08:00:00.000Z"), concurrency: 20,
  });

  assert.equal(summary.checked, 2);
  assert.equal(summary.succeeded, 1);
  assert.equal(summary.failed, 1);
  assert.equal(storage.uploads.length, 1);
  assert.match(storage.uploads[0].pathname, /^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/2026\/10\//);
  assert.equal(db.state.observations.length, 1);
  assert.equal(db.state.fetches.length, 2);
  assert.equal(db.state.fetches.some((row) => row.state === "fetch_error"), true);
});

test("unchanged content records an unchanged fetch and skips snapshot/observation creation", async () => {
  const { runIngestionBatch, contentHash } = await loadModule();
  const body = "<html><body>same body</body></html>";
  const hash = contentHash("same body");
  const db = makeDb({ [sourceA.id]: { content_hash: hash } });
  const storage = makeStorage();

  await runIngestionBatch({
    sources: [sourceA], db, storage,
    fetchSourceImpl: async () => ({ finalUrl: sourceA.url, status: 200, contentType: "text/html", byteSize: body.length, body, durationMs: 4 }),
    now: new Date("2026-10-19T08:00:00.000Z"),
  });

  assert.equal(db.state.fetches[0].state, "unchanged");
  assert.equal(storage.uploads.length, 0);
  assert.equal(db.state.observations.length, 0);
});

test("tenth consecutive scheduled failure pauses only that source", async () => {
  const { runIngestionBatch } = await loadModule();
  const failing = { ...sourceA, consecutive_failures: 9 };
  const db = makeDb();
  const storage = makeStorage();
  await runIngestionBatch({
    sources: [failing], db, storage,
    fetchSourceImpl: async () => { throw new Error("still broken"); },
    now: new Date("2026-10-19T08:00:00.000Z"),
  });
  const update = db.state.updates.at(-1).patch;
  assert.equal(update.consecutive_failures, 10);
  assert.equal(update.enabled, false);
  assert.match(update.pause_reason, /10 consecutive/i);
});

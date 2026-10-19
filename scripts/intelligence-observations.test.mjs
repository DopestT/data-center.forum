import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "intelligence-observations.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/intelligence-observations.mjs must exist");
  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

const source = {
  id: "11111111-1111-1111-1111-111111111111",
  publisher: "Example Utility",
  url: "https://example.com/filing",
  project_hint: "example-campus",
  company_hint: "Example Data",
  market_hint: "Northern Virginia",
  metadata: { project_slugs: ["example-campus"] },
};

test("observation extraction preserves deterministic source and entity hints", async () => {
  const { extractObservations } = await loadModule();
  const observations = extractObservations(
    source,
    { text: "Example Utility filing says the project filing changed. ".repeat(8), extraction_version: "page-v1" },
    { id: "fetch-1", finalUrl: source.url, contentHash: "abc123", observedAt: "2026-10-19T08:00:00.000Z" }
  );
  assert.equal(observations.length, 1);
  const [observation] = observations;
  assert.equal(observation.subject_text, "example-campus");
  assert.equal(observation.predicate, "source_content");
  assert.deepEqual(observation.value_json.project_slugs, ["example-campus"]);
  assert.equal(observation.value_json.company_hint, "Example Data");
  assert.equal(observation.value_json.market_hint, "Northern Virginia");
  assert.equal(observation.extraction_confidence, 1);
});

test("observation keys are deterministic and change with source facts", async () => {
  const { observationKey } = await loadModule();
  const base = { source_id: "a", predicate: "source_content", value_json: { hash: "1", b: 2, a: 1 }, observed_at: "2026-10-19T08:00:00Z" };
  assert.equal(observationKey(base), observationKey({ ...base, value_json: { a: 1, b: 2, hash: "1" } }));
  assert.notEqual(observationKey(base), observationKey({ ...base, value_json: { hash: "2", b: 2, a: 1 } }));
});

test("entity auto-resolution is deliberately conservative", async () => {
  const { shouldAutoResolveEntity } = await loadModule();
  assert.equal(shouldAutoResolveEntity(0.95, null), true);
  assert.equal(shouldAutoResolveEntity(0.949, null), false);
  assert.equal(shouldAutoResolveEntity(0.98, 0.94), false, "runner must refuse when competitor is within 0.05");
  assert.equal(shouldAutoResolveEntity(0.98, 0.92), true);
});

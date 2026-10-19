import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "scripts", "intelligence-events.mjs");

async function loadModule() {
  assert.equal(existsSync(modulePath), true, "scripts/intelligence-events.mjs must exist");
  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

test("verification state is authority-aware and conflict-preserving", async () => {
  const { verificationState } = await loadModule();
  assert.equal(verificationState([]), "unverified");
  assert.equal(verificationState([{ source_id: "a", authority_tier: 3, direct_authority: false, relation: "supports" }]), "single_source");
  assert.equal(verificationState([
    { source_id: "a", authority_tier: 3, direct_authority: false, relation: "supports" },
    { source_id: "b", authority_tier: 2, direct_authority: false, relation: "supports" },
  ]), "corroborated");
  assert.equal(verificationState([{ source_id: "official", authority_tier: 1, direct_authority: true, relation: "supports" }]), "verified");
  assert.equal(verificationState([{ source_id: "a", authority_tier: 3, direct_authority: false, relation: "supports" }], true), "verified");
  assert.equal(verificationState([
    { source_id: "a", authority_tier: 1, direct_authority: true, relation: "supports" },
    { source_id: "b", authority_tier: 1, direct_authority: true, relation: "contradicts" },
  ], true), "conflicting", "manual approval must not hide live contradiction");
});

test("event keys are stable and distinct for materially different claims", async () => {
  const { eventKey } = await loadModule();
  const base = { entityId: "entity-1", claimType: "capacity", normalizedValue: { unit: "MW", value: 1200 }, effectiveDate: "2026-10-19" };
  assert.equal(eventKey(base), eventKey({ ...base, normalizedValue: { value: 1200, unit: "MW" } }));
  assert.notEqual(eventKey(base), eventKey({ ...base, normalizedValue: { unit: "MW", value: 1400 } }));
});

test("chyron eligibility requires public verified material events", async () => {
  const { isChyronEligible } = await loadModule();
  for (const materiality of ["critical", "high", "medium"]) {
    assert.equal(isChyronEligible({ verification_status: "verified", is_public: true, materiality }), true);
  }
  assert.equal(isChyronEligible({ verification_status: "verified", is_public: true, materiality: "low" }), false);
  assert.equal(isChyronEligible({ verification_status: "corroborated", is_public: true, materiality: "high" }), false);
  assert.equal(isChyronEligible({ verification_status: "stale", is_public: true, materiality: "high" }), false);
  assert.equal(isChyronEligible({ verification_status: "rejected", is_public: true, materiality: "high" }), false);
  assert.equal(isChyronEligible({ verification_status: "verified", is_public: false, materiality: "high" }), false);
});

test("public event builder refuses non-verified claims", async () => {
  const { buildPublicEvent } = await loadModule();
  assert.throws(() => buildPublicEvent({ verification_status: "corroborated" }), /verified/i);
  const event = buildPublicEvent({
    id: "claim-1",
    subject_entity_id: "entity-1",
    project_id: "project-1",
    claim_type: "capacity",
    normalized_value: { value: 1200, unit: "MW" },
    verification_status: "verified",
    materiality: "high",
    last_verified_at: "2026-10-19T08:00:00.000Z",
    headline: "Capacity increases to 1.2 GW",
    summary: "Verified capacity change.",
  });
  assert.equal(event.verification_status, "verified");
  assert.equal(event.is_public, true);
  assert.equal(event.evidence_count, 0);
  assert.match(event.event_key, /^[a-f0-9]{64}$/);
});

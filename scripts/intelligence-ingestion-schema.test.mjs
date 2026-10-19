import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "seed", "010_intelligence_ingestion.sql");

test("ingestion migration exists", () => {
  assert.equal(existsSync(migrationPath), true, "seed/010_intelligence_ingestion.sql must exist");
});

test("ingestion migration creates private operational model and verified public events", () => {
  assert.equal(existsSync(migrationPath), true, "migration must exist before its contract can be checked");
  const sql = readFileSync(migrationPath, "utf8");

  for (const table of [
    "intel_source_fetches",
    "intel_raw_observations",
    "intel_entities",
    "intel_entity_aliases",
    "intel_observation_links",
    "intel_claims",
    "intel_claim_evidence",
    "intel_events",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"), `missing ${table}`);
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table} must have RLS`);
  }

  assert.match(sql, /add column if not exists authority_tier/i);
  assert.match(sql, /add column if not exists refresh_class/i);
  assert.match(sql, /add column if not exists next_due_at/i);
  assert.match(sql, /create index[^;]+intel_sources[^;]+enabled[^;]+next_due_at/is, "due-source index required");
  assert.match(sql, /event_key text not null unique/i, "events require a unique stable key");
  assert.match(sql, /verification_status[^;]+verified/is, "event verification status required");
  assert.match(sql, /materiality[^;]+critical[^;]+high[^;]+medium[^;]+low/is, "event materiality contract required");
  assert.match(sql, /intel_events[^;]+verified_at/is, "event query index must include verified time");
  assert.match(sql, /intel-source-snapshots/i, "private snapshot bucket required");
  assert.match(sql, /public\s*=\s*false/i, "snapshot bucket must be private");

  assert.doesNotMatch(
    sql,
    /grant\s+select[^;]+intel_(?:source_fetches|raw_observations|entities|entity_aliases|observation_links|claims|claim_evidence)[^;]+to\s+(?:anon|authenticated)/is,
    "raw ingestion tables must not be readable by public roles"
  );

  assert.match(sql, /grant\s+select\s+on\s+table\s+public\.intel_events\s+to\s+anon,\s*authenticated/i, "verified events must be exposed explicitly");
  assert.match(sql, /verification_status\s*=\s*'verified'/i, "public event policy must require verified status");
  assert.match(sql, /is_public\s*=\s*true/i, "public event policy must require public visibility");
});

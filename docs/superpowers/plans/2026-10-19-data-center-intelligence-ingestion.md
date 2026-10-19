# DataCenter.forum Intelligence Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready slice of the scalable DataCenter.forum intelligence ingestion system and a site-wide verified news chyron, while preserving the existing verified static fallback.

**Architecture:** Extend the existing Supabase/Postgres intelligence graph with private ingestion tables, a private snapshot bucket, due-source scheduling, bounded fetch/extraction, normalized observations/claims, and a single verified event read model. Public `/changes` and the NewsChyron consume the same verified event query; raw detections remain private and cannot publish directly.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Node 20 ESM scripts, Supabase/Postgres + Storage, `@supabase/supabase-js` 2.112.4, Cheerio 1.1.2, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-19-data-center-intelligence-ingestion-design.md`

## Global Constraints

- Initial architecture target: 500-1,000 enabled sources.
- Refresh classes: rapid 2h, standard 6h, daily 24h, weekly 7d; dispatcher runs hourly at minute 17.
- Fetch limits: max concurrency 20, timeout 20s, body 5 MB, redirects 5.
- Retryable statuses: 408, 425, 429, 5xx; at most 3 attempts per run; auto-pause after 10 consecutive scheduled-run failures.
- Fetcher rejects localhost, loopback, link-local, RFC1918/private, cloud metadata, unsupported protocols, and unsafe redirect targets.
- Raw snapshots live only in private bucket `intel-source-snapshots`; public clients cannot read ingestion tables or raw snapshots.
- Automatic fuzzy entity linking requires confidence >= 0.95 with no competing candidate within 0.05; never auto-merge canonical entities.
- Public database fields and chyron items require `verified`; raw observations never mutate public projections directly.
- Chyron eligibility: verified + public + materiality critical/high/medium; max 20 items.
- Chyron empty/failure copy: `DATA CENTER INTELLIGENCE · SOURCE-LINKED PROJECT DATA`.
- Existing static verified fallback remains functional when Supabase is unavailable.
- No production DNS change in this plan.

## Review Focus

- SSRF inputs: a public-looking URL that resolves/redirects to private or metadata IP space must be rejected before content is accepted; Task 3 tests this.
- Oversized/slow sources: body >5 MB or request >20s must fail one source without aborting the batch; Task 3 tests this.
- Duplicate publication: repeated identical verified claims must not create duplicate `intel_events`; Task 5 tests the unique `event_key` path.
- Verification drift: `/changes` and NewsChyron must filter through one verified-event function so unverified rows cannot leak to either surface; Task 6 tests both consumers.
- Database outage: public event rendering must fall back to existing verified project-graph events or the stable non-news label, never raw source-watch data; Task 6 tests this.

---

## File Structure

- `seed/010_intelligence_ingestion.sql` — ingestion/event schema, enums/checks, indexes, RLS, private bucket, source-registry compatibility migration.
- `scripts/intelligence-schedule.mjs` — refresh-class intervals, due-source selection helpers, next-due calculation.
- `scripts/intelligence-schedule.test.mjs` — scheduler tests.
- `scripts/intelligence-fetch.mjs` — safe HTTP fetch, redirect/IP guards, retry classification, bounded body reader.
- `scripts/intelligence-fetch.test.mjs` — fetch safety/failure tests.
- `scripts/intelligence-observations.mjs` — deterministic observation extraction/normalization and claim-candidate helpers.
- `scripts/intelligence-observations.test.mjs` — normalization/dedup/entity-hint tests.
- `scripts/intelligence-ingest.mjs` — service-role batch runner: due sources → fetch → snapshot → observations → claim candidates; parallel observation mode only.
- `scripts/intelligence-ingest.test.mjs` — failure isolation/idempotency adapter tests with fakes.
- `scripts/import-intelligence-sources.mjs` — validate and bulk upsert source manifests disabled-by-default.
- `scripts/import-intelligence-sources.test.mjs` — manifest validation tests.
- `data/source-manifest.initial.json` — current official registry converted to typed source records plus high-value source-family seed rows where verified.
- `scripts/intelligence-events.mjs` — pure verification/event-key/materiality helpers shared by tests and trusted publication tooling.
- `scripts/intelligence-events.test.mjs` — verification transition/conflict/idempotency tests.
- `lib/intelligence-events.ts` — public verified-event read model with project-graph fallback.
- `components/NewsChyron.tsx` — verified event ticker.
- `components/PublicTopbar.tsx` — shared public navigation + chyron wrapper.
- `app/changes/page.tsx`, `app/page.tsx`, and other public topbar routes — migrate repeated topbar markup to `PublicTopbar` without changing route content.
- `app/globals.css` — chyron crawl, mobile, hover/focus pause, reduced-motion styles.
- `scripts/news-chyron.test.mjs` — static contract tests for shared filtering, accessibility, reduced-motion CSS, and no raw detections.
- `.github/workflows/intelligence-source-watch.yml` — hourly dispatcher using the new runner in parallel mode; preserve legacy scan during migration if needed for comparison.
- `package.json` — add focused test and ingestion/import scripts.
- `README.md` — migration order and operational commands.

---

### Task 1: Add Private Ingestion and Event Schema

**Files:**
- Create: `seed/010_intelligence_ingestion.sql`
- Create: `scripts/intelligence-ingestion-schema.test.mjs`

**Interfaces:**
- Consumes: existing `intel_projects`, `intel_sources`, `intel_organizations`, and admin helper `public.is_dcf_admin()` from earlier seeds.
- Produces: `intel_sources` scheduler columns; `intel_source_fetches`; `intel_raw_observations`; `intel_entities`; `intel_entity_aliases`; `intel_observation_links`; `intel_claims`; `intel_claim_evidence`; `intel_events`; private Storage bucket `intel-source-snapshots`.

- [ ] **Step 1: Write schema contract tests**

Assert the migration contains all required table names, `(enabled,next_due_at)` and event query indexes, unique `event_key`, verification/materiality checks, RLS enablement, no anon/authenticated grants on raw ingestion tables, and private bucket creation.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/intelligence-ingestion-schema.test.mjs`
Expected: FAIL because `seed/010_intelligence_ingestion.sql` does not exist.

- [ ] **Step 3: Implement `seed/010_intelligence_ingestion.sql`**

Extend `intel_sources` additively rather than recreating it. Use service-role-only operational tables; expose `intel_events` to anon/authenticated only through rows where `verification_status='verified' and is_public=true` via RLS. Keep raw tables private. Seed current `data/source-registry.json` mappings in later importer rather than embedding every source in SQL.

- [ ] **Step 4: Run schema contract test**

Run: `node --test scripts/intelligence-ingestion-schema.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

`git add seed/010_intelligence_ingestion.sql scripts/intelligence-ingestion-schema.test.mjs && git commit -m "feat: add intelligence ingestion schema"`

### Task 2: Build Source Scheduling and Manifest Import

**Files:**
- Create: `scripts/intelligence-schedule.mjs`
- Create: `scripts/intelligence-schedule.test.mjs`
- Create: `scripts/import-intelligence-sources.mjs`
- Create: `scripts/import-intelligence-sources.test.mjs`
- Create: `data/source-manifest.initial.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `refreshIntervalMs(refreshClass) -> number`; `nextDueAt(refreshClass, fromDate) -> string`; `isSourceDue(source, now) -> boolean`; `validateSourceManifest(items) -> normalized items`; importer upserts into `intel_sources` with new imports disabled by default.

- [ ] **Step 1: Write failing scheduler tests** for exact 2h/6h/24h/7d intervals, disabled sources, future `next_due_at`, and overdue sources.
- [ ] **Step 2: Run** `node --test scripts/intelligence-schedule.test.mjs` **and verify FAIL**.
- [ ] **Step 3: Implement scheduling helpers** with exact spec intervals and ISO timestamps.
- [ ] **Step 4: Run scheduler tests and verify PASS**.
- [ ] **Step 5: Write failing manifest tests** asserting HTTPS/default validation, authority tier 1-4, valid refresh classes, normalized unique URLs, disabled-by-default behavior, and rejection of duplicate IDs/URLs.
- [ ] **Step 6: Run** `node --test scripts/import-intelligence-sources.test.mjs` **and verify FAIL**.
- [ ] **Step 7: Implement manifest validator/importer and initial manifest** by converting the existing registry without changing its project hints; add `intel:sources:import` and `intel:test` package scripts.
- [ ] **Step 8: Run both tests and verify PASS**.
- [ ] **Step 9: Commit** `git commit -am "feat: add scalable source registry scheduling"` plus new files.

### Task 3: Build Safe Bounded Fetcher

**Files:**
- Create: `scripts/intelligence-fetch.mjs`
- Create: `scripts/intelligence-fetch.test.mjs`

**Interfaces:**
- Consumes: source `{ url }` records.
- Produces: `fetchSource(source, options) -> { finalUrl, status, contentType, byteSize, body, durationMs }`; `classifyRetry(statusOrError) -> 'retryable'|'permanent'`; `assertSafeUrl(url, resolver) -> Promise<void>`.

- [ ] **Step 1: Write failing tests** for HTTPS acceptance, unsupported protocol rejection, localhost/private/link-local/metadata rejection, unsafe redirect rejection, 5 MB limit, 20s abort path, retryable statuses, and batch-safe thrown errors.
- [ ] **Step 2: Run** `node --test scripts/intelligence-fetch.test.mjs` **and verify FAIL**.
- [ ] **Step 3: Implement safe URL resolution and redirect validation** using Node DNS lookup injection for tests; cap redirects at 5 and validate every hop.
- [ ] **Step 4: Implement bounded response reader and retries** with 3 attempts, exponential backoff+jitter injection, and 20s timeout.
- [ ] **Step 5: Run tests and verify PASS**.
- [ ] **Step 6: Commit** `git commit -am "feat: add safe bounded intelligence fetcher"` plus new files.

### Task 4: Normalize Observations and Run Parallel Ingestion

**Files:**
- Create: `scripts/intelligence-observations.mjs`
- Create: `scripts/intelligence-observations.test.mjs`
- Create: `scripts/intelligence-ingest.mjs`
- Create: `scripts/intelligence-ingest.test.mjs`
- Modify: `scripts/intelligence-content.mjs` only if a minimal reusable export is required.
- Modify: `package.json`

**Interfaces:**
- Consumes: `extractContent(html,url)` and content hash behavior from `scripts/intelligence-content.mjs`; safe fetcher from Task 3; Supabase service client supplied/injected into runner.
- Produces: `extractObservations(source, extractedContent, fetchMeta) -> Observation[]`; `observationKey(observation) -> string`; `runIngestionBatch({ sources, db, storage, fetchSourceImpl, now, concurrency=20 }) -> summary`.

- [ ] **Step 1: Write failing observation tests** for project/company/location hints, source-change observation creation, deterministic keys, duplicate collapse, unchanged-content short circuit, and no automatic fuzzy entity merge.
- [ ] **Step 2: Run observation tests and verify FAIL**.
- [ ] **Step 3: Implement deterministic observation normalization**. V1 must create trustworthy source-change/page observations and structured values supplied by deterministic adapters/hints; it must not invent unsupported AI facts.
- [ ] **Step 4: Run observation tests and verify PASS**.
- [ ] **Step 5: Write failing batch tests** with fake DB/storage/fetcher asserting one failed source does not abort others, successful raw body uploads use `intel-source-snapshots`, fetch rows are recorded, unchanged sources skip observation creation, and 10th consecutive scheduled failure sets source disabled/pause reason.
- [ ] **Step 6: Run batch tests and verify FAIL**.
- [ ] **Step 7: Implement `runIngestionBatch`** with bounded worker pool <=20, service-role-only persistence, private snapshot path `<source-id>/<YYYY>/<MM>/<fetch-id>`, and parallel-observation mode that never updates public project fields or creates public events automatically.
- [ ] **Step 8: Run both test files and verify PASS**.
- [ ] **Step 9: Add `intel:ingest` package script and commit** `feat: add parallel intelligence ingestion runner`.

### Task 5: Add Claims, Verification, and Idempotent Event Publication Primitives

**Files:**
- Create: `scripts/intelligence-events.mjs`
- Create: `scripts/intelligence-events.test.mjs`

**Interfaces:**
- Produces: `verificationState(evidence, manualApproval) -> state`; `eventKey({ entityId, claimType, normalizedValue, effectiveDate }) -> string`; `isChyronEligible(event) -> boolean`; `buildPublicEvent(verifiedClaim) -> EventInput`.

- [ ] **Step 1: Write failing tests** for Tier-1 direct-authority verification, two-source corroboration rule, manual verification, conflicting evidence, stale/rejected exclusion, critical/high/medium eligibility, low exclusion, and stable duplicate event keys.
- [ ] **Step 2: Run** `node --test scripts/intelligence-events.test.mjs` **and verify FAIL**.
- [ ] **Step 3: Implement pure helpers** exactly matching the spec; no database side effects in this module.
- [ ] **Step 4: Run tests and verify PASS**.
- [ ] **Step 5: Commit** `git commit -am "feat: add intelligence verification event primitives"` plus new files.

### Task 6: Create One Verified Public Event Read Model and News Chyron

**Files:**
- Create: `lib/intelligence-events.ts`
- Create: `components/NewsChyron.tsx`
- Create: `components/PublicTopbar.tsx`
- Create: `scripts/news-chyron.test.mjs`
- Modify: `lib/recent-changes.ts`
- Modify: `app/changes/page.tsx`
- Modify: public route files currently rendering `<header className="topbar">` to use `PublicTopbar`.
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getVerifiedIntelligenceEvents(limit = 30): Promise<IntelligenceEvent[]>`; `getChyronEvents(limit = 20): Promise<IntelligenceEvent[]>`; `NewsChyron({ events })`; `PublicTopbar({ nav? })`.
- Fallback: convert existing verified project-graph events to `IntelligenceEvent` when Supabase/event table is unavailable.

- [ ] **Step 1: Write failing public-read/chyron tests** asserting `intel_events` filters `verification_status='verified'` and `is_public=true`, chyron cap 20/materiality filter, fallback uses project graph not fingerprint queue, stable empty copy, internal project links, keyboard-focusable anchors, and reduced-motion CSS.
- [ ] **Step 2: Run** `node --test scripts/news-chyron.test.mjs scripts/recent-changes.test.mjs` **and verify FAIL on the new contract**.
- [ ] **Step 3: Implement `lib/intelligence-events.ts`** and make `lib/recent-changes.ts` a compatibility wrapper over it.
- [ ] **Step 4: Implement `NewsChyron` and CSS**: desktop continuous crawl, hover/focus pause, single-line mobile, `prefers-reduced-motion` static overflow list.
- [ ] **Step 5: Implement `PublicTopbar` and migrate current public topbar routes** without altering page-specific content; exclude `/admin` from the shared public chrome by not using the component there.
- [ ] **Step 6: Run tests and verify PASS**.
- [ ] **Step 7: Run** `npx tsc --noEmit` **and** `npm run build`; expected both PASS.
- [ ] **Step 8: Commit** `feat: add verified data center news chyron`.

### Task 7: Wire Hourly Parallel Ingestion and Migration Documentation

**Files:**
- Modify: `.github/workflows/intelligence-source-watch.yml`
- Modify: `README.md`
- Modify: `package.json`
- Create: `scripts/intelligence-workflow.test.mjs`

**Interfaces:**
- Workflow runs hourly at minute 17 and calls `npm run intel:ingest` in parallel-observation mode.
- Existing legacy fingerprint comparison remains available during migration until new persistence is validated.

- [ ] **Step 1: Write failing workflow contract test** asserting hourly cron `17 * * * *`, locked dependency install, new ingestion tests before runner, no routine git commit of raw snapshots/queues by the new path, and presence of required service-role environment references.
- [ ] **Step 2: Run** `node --test scripts/intelligence-workflow.test.mjs` **and verify FAIL**.
- [ ] **Step 3: Update workflow** to run the new ingestion dispatcher hourly. Preserve legacy scan as an explicit comparison step only if it does not write operational state on every hourly run; otherwise leave it manual during parallel validation.
- [ ] **Step 4: Update README** with migration order through `010`, private bucket requirement, import command, dry-run/parallel-mode commands, verification boundary, and rollback/fallback behavior.
- [ ] **Step 5: Run workflow test and full test suite**: `npm run intel:test`; expected PASS.
- [ ] **Step 6: Run** `npx tsc --noEmit && npm run build`; expected PASS.
- [ ] **Step 7: Commit** `feat: wire scalable intelligence ingestion workflow`.

### Task 8: Branch Verification and Review Gate

**Files:** none unless verification finds defects.

- [ ] **Step 1: Run all Node tests** with `npm run intel:test`; expected PASS with zero failures.
- [ ] **Step 2: Run type/build verification** with `npx tsc --noEmit && npm run build`; expected PASS.
- [ ] **Step 3: Compare branch to main** and confirm only approved ingestion/chyron/spec/plan changes exist.
- [ ] **Step 4: Inspect public-security boundary**: raw ingestion tables/storage are not exposed to anon/authenticated; no service-role key appears in browser code.
- [ ] **Step 5: Confirm public behavior**: `/changes` and NewsChyron share the same read model; no raw fingerprint queue reference in either path; empty/failure state is exact stable copy.
- [ ] **Step 6: Open a draft PR** with verification evidence and explicit note that applying `seed/010_intelligence_ingestion.sql` and configuring Supabase Storage are production dependencies; do not merge or change DNS automatically.

# DataCenter.forum MAX Ingestion Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-run due-source batch with a durable, lease-based ingestion queue that can safely support the approved 5,000-active-source gate without weakening verification, provenance, or source-isolation guarantees.

**Architecture:** Keep the existing safe fetcher, observation model, private snapshot storage, claims, verified events, and public RLS boundary. Insert a Postgres-backed scheduler/queue between `intel_sources` and fetch processing, make workers independently claim leased jobs, enforce conservative per-domain throttling, route fetches through an adapter interface, record newly discovered URLs only as source candidates, and expose backlog/failure metrics to admins. The existing hourly GitHub Actions workflow remains a temporary dispatcher/worker host; queue semantics must not depend on GitHub Actions.

**Tech Stack:** Next.js 16.4.2 App Router, React 19.2.8, TypeScript 5.9, Node.js >=22 ESM scripts and `node:test`, Supabase/Postgres + Storage, `@supabase/supabase-js` 2.112.4, Cheerio 1.1.2, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-22-max-ingestion-readability-design.md`

## Global Constraints

- Stage-1 acceptance target: 5,000 enabled monitored sources without sustained queue growth under normal refresh policy.
- Preserve verification states and the rule that raw observations never directly mutate canonical public facts.
- Preserve current SSRF/redirect/IP protections, 20-second request deadline behavior, 5 MB HTML response cap, retry classification, and private snapshot storage.
- Preserve source failure isolation: one failing source or job never aborts unrelated jobs.
- Queue statuses are exactly `pending`, `leased`, `retry_wait`, `succeeded`, `dead_letter`, `cancelled`.
- Default worker lease: 180 seconds.
- Default maximum attempts before dead-letter: 5.
- Stage 1 permits one active claim per source domain at a time; a configurable `min_interval_ms` controls the earliest next claim for that domain.
- Scheduler may enqueue at most 5,000 due fetch jobs per dispatch call; repeated dispatches are safe and do not duplicate active jobs.
- New/discovered URLs are candidates only. No discovered candidate becomes an enabled source without explicit qualification logic added in a later source-expansion plan.
- Operational queue/source-candidate/domain/metrics tables are service-role/admin only; no anon/authenticated raw read grants.
- No production DNS change in this plan.
- Do not add AI/LLM extraction to this foundation plan; cheap deterministic extraction remains the default.

## Review Focus

- **Duplicate dispatch:** two schedulers running at the same time must not create duplicate active fetch jobs for one source; Task 1 and Task 3 pin this with a partial unique index plus enqueue tests.
- **Worker crash:** an expired lease must become claimable again without manual database edits and without double-publishing evidence; Task 2 and Task 5 test reclamation/idempotency.
- **Domain burst:** many due URLs on one publisher domain must not be fetched simultaneously or faster than configured `min_interval_ms`; Task 1 and Task 5 test the locking/throttle path.
- **Untrusted discovery:** links found inside fetched HTML must remain disabled source candidates and must reject non-HTTP(S), same-URL, fragment-only, credentialed, and obvious asset URLs; Task 6 tests this.
- **Backlog invisibility:** operators must be able to see queued, leased, retrying, dead-lettered, success/failure, and oldest-due age without reading raw snapshots; Task 7 tests the admin summary query contract.

---

## File Structure

- `seed/011_max_ingestion_queue.sql` — queue/domain/candidate/metrics schema, indexes, service-role-only grants, queue RPCs, lease reclamation primitives.
- `scripts/intelligence-ingestion-schema.test.mjs` — extend schema contract tests to migration 011 and queue safety rules.
- `scripts/intelligence-queue.mjs` — Supabase queue adapter and pure result normalization for enqueue/claim/finish/reclaim.
- `scripts/intelligence-queue.test.mjs` — queue adapter tests with fake RPC/database clients.
- `scripts/intelligence-dispatch.mjs` — one dispatcher pass: reclaim expired leases, enqueue due fetch work, emit summary.
- `scripts/intelligence-dispatch.test.mjs` — duplicate-safe dispatch, disabled source/domain, due-time, and limit tests.
- `scripts/intelligence-adapters/index.mjs` — adapter registry and stable adapter interface.
- `scripts/intelligence-adapters/html.mjs` — HTML adapter using the existing safe fetch/content extraction path.
- `scripts/intelligence-adapters.test.mjs` — default HTML routing, unknown adapter rejection, normalized envelope tests.
- `scripts/intelligence-fetch-job.mjs` — one source/job processing unit extracted from the current batch runner.
- `scripts/intelligence-fetch-job.test.mjs` — preserve existing success/unchanged/fetch/extract/storage/db failure behavior at job granularity.
- `scripts/intelligence-worker.mjs` — lease-based worker loop with bounded concurrency and max-jobs cap.
- `scripts/intelligence-worker.test.mjs` — multi-worker non-duplication, lease-loss, retry/dead-letter, and failure-isolation tests.
- `scripts/intelligence-discovery.mjs` — deterministic link-to-candidate discovery from successful HTML source bodies.
- `scripts/intelligence-discovery.test.mjs` — URL normalization/rejection and candidate dedup tests.
- `scripts/intelligence-metrics.mjs` — run/backlog metric helpers.
- `scripts/intelligence-metrics.test.mjs` — summary aggregation tests.
- `app/admin/intelligence/page.tsx` — protected ingestion-operations summary using existing admin auth.
- `scripts/intelligence-admin.test.mjs` — static contract tests for protected admin surface and aggregate-only queries.
- `scripts/intelligence-ingest.mjs` — compatibility batch command; refactor to call the shared fetch-job processor rather than maintaining duplicate behavior.
- `scripts/intelligence-ingest.test.mjs` — preserve existing compatibility tests.
- `scripts/import-intelligence-sources.mjs` — derive/store normalized `domain_key` and default adapter configuration during imports.
- `scripts/import-intelligence-sources.test.mjs` — domain/adapter import tests.
- `.github/workflows/intelligence-source-watch.yml` — run tests, dispatch queue work, then process a bounded worker run.
- `package.json` — add `intel:dispatch`, `intel:worker`, `intel:status`/focused test scripts without removing existing compatibility commands.
- `README.md` — migration 011, queue operations, failure recovery, and 5k-gate runbook.

---

### Task 1: Add Durable Queue, Domain Throttle, Candidate, and Metric Schema

**Files:**
- Create: `seed/011_max_ingestion_queue.sql`
- Modify: `scripts/intelligence-ingestion-schema.test.mjs`

**Interfaces:**
- Consumes: existing `public.intel_sources`, `intel_source_fetches`, `intel_raw_observations`, `intel_claims`, `intel_events` from migration 010.
- Produces: `intel_source_domains`, `intel_source_candidates`, `intel_ingest_jobs`, `intel_ingestion_metrics`; source columns `domain_key`, `adapter_type`, `ingest_priority`; RPCs `enqueue_due_intel_fetch_jobs`, `claim_intel_ingest_job`, `finish_intel_ingest_job`, `requeue_expired_intel_ingest_jobs`.

- [ ] **Step 1: Extend the schema test with failing migration-011 assertions**

Assert exact table names, source columns, queue status values, indexes on `(status, scheduled_for, priority)` and `(domain_key, status, lease_expires_at)`, service-role-only raw access, and the existence of all four queue RPCs.

- [ ] **Step 2: Add failing SQL-contract assertions for duplicate and lease safety**

Assert a partial unique index prevents more than one active `fetch` job per source while status is `pending`, `leased`, or `retry_wait`; assert claim SQL contains `FOR UPDATE` and `SKIP LOCKED`; assert lease expiry and `lease_owner` are checked on completion.

- [ ] **Step 3: Run the focused test**

Run: `node --test scripts/intelligence-ingestion-schema.test.mjs`

Expected: FAIL because migration 011 does not exist.

- [ ] **Step 4: Implement `seed/011_max_ingestion_queue.sql`**

Add:

- `intel_source_domains(domain_key primary key, min_interval_ms integer not null default 1000, next_allowed_at timestamptz not null default now(), enabled boolean not null default true, metadata jsonb, created_at, updated_at)`;
- `intel_source_candidates` with normalized URL, discovery parent/source, reason, source-family hint, jurisdiction/entity hints, confidence, status default `candidate`, and unique normalized URL;
- `intel_ingest_jobs` with exact queue fields from the spec plus `domain_key`, `scheduled_for`, `lease_owner`, `lease_expires_at`, `attempt_count`, error fields, timestamps;
- `intel_ingestion_metrics(recorded_at, metric_name, metric_value, dimensions jsonb)`;
- additive `intel_sources.domain_key`, `adapter_type default 'html'`, `ingest_priority default 50`.

Keep all new operational tables private to service role/admin server paths.

- [ ] **Step 5: Implement `enqueue_due_intel_fetch_jobs(p_now timestamptz, p_limit integer default 5000)`**

The function inserts due enabled sources whose domain is enabled, orders by `ingest_priority desc, next_due_at asc`, caps at `p_limit`, and relies on the active-job unique index with `ON CONFLICT DO NOTHING`. Return `{considered, enqueued}` counts.

- [ ] **Step 6: Implement `claim_intel_ingest_job(p_worker_id text, p_lease_seconds integer default 180)`**

Claim exactly one eligible job. Join and lock both the candidate job row and its domain row using `FOR UPDATE ... SKIP LOCKED`; require `scheduled_for <= now()` and `domain.next_allowed_at <= now()`. Update the job to `leased`, set `lease_owner`, increment `attempt_count`, set `lease_expires_at`, and advance `domain.next_allowed_at` by `min_interval_ms`. Return the leased row.

- [ ] **Step 7: Implement finish and expiry functions**

`finish_intel_ingest_job` must refuse a mismatched worker/lease owner. Success becomes `succeeded`; retryable failure becomes `retry_wait` with supplied retry timestamp unless `attempt_count >= 5`, then `dead_letter`; permanent failure becomes `dead_letter`.

`requeue_expired_intel_ingest_jobs(p_now timestamptz default now(), p_max_attempts integer default 5)` converts expired leases to `retry_wait` or `dead_letter` based on attempts and clears lease ownership.

- [ ] **Step 8: Run the schema test**

Run: `node --test scripts/intelligence-ingestion-schema.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add seed/011_max_ingestion_queue.sql scripts/intelligence-ingestion-schema.test.mjs
git commit -m "feat: add durable intelligence ingestion queue"
```

### Task 2: Add the Queue Client Contract

**Files:**
- Create: `scripts/intelligence-queue.mjs`
- Create: `scripts/intelligence-queue.test.mjs`

**Interfaces:**
- Produces:
  - `enqueueDueFetchJobs(db, { now, limit = 5000 }) -> Promise<{ considered:number, enqueued:number }>`
  - `claimNextJob(db, { workerId, leaseSeconds = 180 }) -> Promise<Job|null>`
  - `finishJob(db, { jobId, workerId, outcome, retryAt = null, errorClass = null, errorMessage = null }) -> Promise<Job>`
  - `requeueExpiredJobs(db, { now, maxAttempts = 5 }) -> Promise<{ requeued:number, deadLettered:number }>`
  - `retryDelayMs(attemptCount) -> number`

- [ ] **Step 1: Write failing queue-client tests**

Cover RPC names/arguments, null claim, success finish, retry finish, permanent failure/dead-letter, mismatched result validation, and deterministic retry delays for attempts 1-5 when jitter is not supplied.

- [ ] **Step 2: Run tests**

Run: `node --test scripts/intelligence-queue.test.mjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the queue client**

Keep it independent of global Supabase state. Accept a database adapter exposing `rpc(name,args)` so tests use fakes and CLI callers provide Supabase.

- [ ] **Step 4: Run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/intelligence-queue.mjs scripts/intelligence-queue.test.mjs
git commit -m "feat: add intelligence queue client"
```

### Task 3: Convert Due-Source Scanning into Dispatch

**Files:**
- Create: `scripts/intelligence-dispatch.mjs`
- Create: `scripts/intelligence-dispatch.test.mjs`
- Modify: `scripts/import-intelligence-sources.mjs`
- Modify: `scripts/import-intelligence-sources.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 2 queue functions and existing source schedule fields.
- Produces: `runDispatch({ queue, now, limit = 5000, maxAttempts = 5 }) -> Promise<{ reclaimed, considered, enqueued }>`; CLI command `npm run intel:dispatch`.

- [ ] **Step 1: Write failing dispatcher tests**

Assert reclaim runs before enqueue; a second dispatch with unchanged due sources reports zero additional active jobs through the fake queue; limit defaults to 5000; invalid/negative limit is rejected.

- [ ] **Step 2: Write failing importer tests for domain and adapter defaults**

For `https://news.microsoft.com/x`, normalized `domain_key` is `news.microsoft.com`; `adapter_type` defaults to `html`; explicit supported adapter values survive validation; credentialed URLs are rejected.

- [ ] **Step 3: Run both test files and verify failure**

Run: `node --test scripts/intelligence-dispatch.test.mjs scripts/import-intelligence-sources.test.mjs`

- [ ] **Step 4: Implement dispatcher and importer changes**

Do not fetch content in the dispatcher. It only reclaims expired leases and enqueues work.

- [ ] **Step 5: Add `intel:dispatch` script**

Keep `intel:ingest` for migration compatibility.

- [ ] **Step 6: Run tests and commit**

```bash
git add scripts/intelligence-dispatch.mjs scripts/intelligence-dispatch.test.mjs scripts/import-intelligence-sources.mjs scripts/import-intelligence-sources.test.mjs package.json
git commit -m "feat: dispatch due intelligence work into queue"
```

### Task 4: Introduce an Adapter Boundary and Shared Fetch-Job Processor

**Files:**
- Create: `scripts/intelligence-adapters/index.mjs`
- Create: `scripts/intelligence-adapters/html.mjs`
- Create: `scripts/intelligence-adapters.test.mjs`
- Create: `scripts/intelligence-fetch-job.mjs`
- Create: `scripts/intelligence-fetch-job.test.mjs`
- Modify: `scripts/intelligence-ingest.mjs`
- Modify: `scripts/intelligence-ingest.test.mjs`

**Interfaces:**
- Produces:
  - `getAdapter(adapterType) -> { type, fetchAndExtract(source, options) }`
  - HTML adapter envelope `{ finalUrl, status, contentType, byteSize, rawBody, text, extractionVersion, durationMs }`
  - `processFetchJob({ source, db, storage, adapter, now }) -> Promise<{ state:'success'|'unchanged'|'failed', retryable:boolean, observationCount:number, errorClass?:string, errorMessage?:string }>`

- [ ] **Step 1: Write failing adapter tests**

Default/explicit `html` returns the HTML adapter; unknown adapter types throw a permanent configuration error; normalized envelope includes both `rawBody` and extracted `text` without executing source content.

- [ ] **Step 2: Write failing fetch-job regression tests**

Port the current batch-level behaviors to one-job tests: success snapshot/observation, unchanged skips snapshot/observations, extraction error preserves raw snapshot, storage error, DB error, and tenth consecutive source failure pauses only that source.

- [ ] **Step 3: Run tests and verify failure**

Run: `node --test scripts/intelligence-adapters.test.mjs scripts/intelligence-fetch-job.test.mjs`

- [ ] **Step 4: Implement HTML adapter using existing `fetchSource` and `extractContent`**

Do not duplicate SSRF, redirect, timeout, or body-limit logic.

- [ ] **Step 5: Extract current `processSource` behavior into `processFetchJob`**

Preserve existing content hashing, snapshot paths, fetch rows, failure counting, pause-after-10 behavior, and batch observation upsert.

- [ ] **Step 6: Refactor `runIngestionBatch` to call `processFetchJob`**

Compatibility tests must remain green; no public behavior change yet.

- [ ] **Step 7: Run focused and existing ingestion tests**

Run: `node --test scripts/intelligence-adapters.test.mjs scripts/intelligence-fetch-job.test.mjs scripts/intelligence-ingest.test.mjs scripts/intelligence-fetch.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/intelligence-adapters scripts/intelligence-adapters.test.mjs scripts/intelligence-fetch-job.mjs scripts/intelligence-fetch-job.test.mjs scripts/intelligence-ingest.mjs scripts/intelligence-ingest.test.mjs
git commit -m "refactor: process intelligence sources as queued jobs"
```

### Task 5: Add Lease-Based Worker Execution

**Files:**
- Create: `scripts/intelligence-worker.mjs`
- Create: `scripts/intelligence-worker.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `claimNextJob`, `finishJob`, source lookup by job `source_id`, `processFetchJob`.
- Produces: `runWorker({ queue, loadSource, handler, workerId, concurrency = 20, maxJobs = 500, leaseSeconds = 180, now = () => new Date() }) -> Promise<WorkerSummary>`; CLI `npm run intel:worker`.

- [ ] **Step 1: Write failing multi-worker tests**

Use one fake shared queue with two worker IDs. Assert every job is handled once, unrelated failures do not stop either worker, an empty queue exits cleanly, and `maxJobs` is honored.

- [ ] **Step 2: Add lease-expiry and lost-lease tests**

A handler result must not be allowed to finish a job if its lease owner no longer matches. Expired work reclaimed by another worker may complete exactly once.

- [ ] **Step 3: Add retry/dead-letter tests**

Retryable result schedules `retry_wait`; fifth attempt becomes `dead_letter`; permanent adapter/configuration failure dead-letters immediately.

- [ ] **Step 4: Run tests and verify failure**

Run: `node --test scripts/intelligence-worker.test.mjs`

- [ ] **Step 5: Implement worker loops**

Create at most `concurrency` asynchronous claim loops. Each loop claims one job at a time, loads its source, calls the handler, and finishes the lease before claiming another. A thrown handler error is converted to a retryable worker failure unless explicitly marked permanent.

- [ ] **Step 6: Add CLI adapter**

Use service-role Supabase only in `runCli`; derive a unique default worker ID from GitHub run/job metadata when present or process/host data locally. Do not log secrets.

- [ ] **Step 7: Run tests and commit**

```bash
git add scripts/intelligence-worker.mjs scripts/intelligence-worker.test.mjs package.json
git commit -m "feat: add lease-based intelligence workers"
```

### Task 6: Capture New Source Candidates Without Auto-Trust

**Files:**
- Create: `scripts/intelligence-discovery.mjs`
- Create: `scripts/intelligence-discovery.test.mjs`
- Modify: `scripts/intelligence-fetch-job.mjs`
- Modify: `scripts/intelligence-fetch-job.test.mjs`

**Interfaces:**
- Produces: `discoverCandidateUrls({ source, rawBody, finalUrl }) -> Candidate[]`; `Candidate` includes `url`, `normalizedUrl`, `parentSourceId`, `reason`, `confidence`, `status:'candidate'`.

- [ ] **Step 1: Write failing URL-discovery tests**

Accept absolute HTTPS links and resolvable relative HTTP(S) links; normalize fragments away; reject current-page duplicates, `javascript:`, `mailto:`, `data:`, credentialed URLs, localhost/private literal hosts, and obvious static assets (`.png`, `.jpg`, `.svg`, `.css`, `.js`, fonts).

- [ ] **Step 2: Write candidate-dedup tests**

Repeated links in one page return one candidate. Existing source URLs supplied through the exclusion set are omitted.

- [ ] **Step 3: Run tests and verify failure**

Run: `node --test scripts/intelligence-discovery.test.mjs`

- [ ] **Step 4: Implement deterministic discovery with Cheerio/URL**

Discovery records links; it does not fetch them and does not assign authority above an unqualified candidate.

- [ ] **Step 5: Add optional `db.recordSourceCandidates(rows)` to `processFetchJob`**

Only successful changed HTML fetches call discovery. Candidate write failure is a warning and does not turn an otherwise successful evidence fetch into a failed fetch job.

- [ ] **Step 6: Run discovery and fetch-job tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/intelligence-discovery.mjs scripts/intelligence-discovery.test.mjs scripts/intelligence-fetch-job.mjs scripts/intelligence-fetch-job.test.mjs
git commit -m "feat: discover intelligence source candidates"
```

### Task 7: Add Ingestion Metrics and Protected Operations View

**Files:**
- Create: `scripts/intelligence-metrics.mjs`
- Create: `scripts/intelligence-metrics.test.mjs`
- Create: `app/admin/intelligence/page.tsx`
- Create: `scripts/intelligence-admin.test.mjs`
- Modify: `lib/admin.ts`

**Interfaces:**
- Produces: `summarizeWorkerRun(summary) -> MetricRow[]`; `requireDcfAdmin()` shared admin guard; protected `/admin/intelligence` aggregate operations view.

- [ ] **Step 1: Write failing metric tests**

Map worker/dispatch summaries into metric rows for enqueued, claimed, succeeded, unchanged, retrying, failed/dead-lettered, observations, and duration where available.

- [ ] **Step 2: Write failing admin-surface contract tests**

Assert the page calls the shared admin guard, queries aggregate counts/oldest scheduled job/domain/source states only, and does not render raw snapshots or service-role credentials.

- [ ] **Step 3: Run tests and verify failure**

Run: `node --test scripts/intelligence-metrics.test.mjs scripts/intelligence-admin.test.mjs`

- [ ] **Step 4: Rename/generalize `requireRevenueAdmin` to `requireDcfAdmin` with compatibility export**

Existing revenue admin page must continue working via alias/export until separately migrated.

- [ ] **Step 5: Implement aggregate admin page**

Show active sources, source candidates, pending/leased/retry/dead-letter jobs, oldest pending age, recent success/failure counts, and domains currently throttled/disabled.

- [ ] **Step 6: Run tests and commit**

```bash
git add scripts/intelligence-metrics.mjs scripts/intelligence-metrics.test.mjs app/admin/intelligence/page.tsx scripts/intelligence-admin.test.mjs lib/admin.ts
git commit -m "feat: expose intelligence ingestion operations metrics"
```

### Task 8: Switch the Scheduled Workflow to Dispatch + Worker

**Files:**
- Modify: `.github/workflows/intelligence-source-watch.yml`
- Modify: `package.json`
- Modify: `README.md`
- Create: `scripts/intelligence-workflow-max.test.mjs`

**Interfaces:**
- Produces: hourly workflow that verifies tests, runs `intel:dispatch`, then runs one bounded `intel:worker` process; queue remains durable if the worker does not clear all jobs.

- [ ] **Step 1: Write failing workflow contract test**

Assert schedule remains hourly at minute 17; test step precedes dispatch; dispatch precedes worker; service-role secrets are only passed to dispatch/worker steps; legacy `intel:ingest` is not the scheduled production command.

- [ ] **Step 2: Run test and verify failure**

Run: `node --test scripts/intelligence-workflow-max.test.mjs`

- [ ] **Step 3: Update workflow**

Keep `timeout-minutes: 30`. Worker invocation is bounded by `--max-jobs=500` and 20 internal claim loops by default. Do not assume the queue is empty when the run ends.

- [ ] **Step 4: Update README and scripts**

Document migration 011, manual dispatch, manual worker, dead-letter inspection, lease reclamation, source/domain disable controls, and compatibility `intel:ingest` status.

- [ ] **Step 5: Run workflow test and full intelligence suite**

Run: `npm run intel:test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/intelligence-source-watch.yml package.json README.md scripts/intelligence-workflow-max.test.mjs
git commit -m "ops: run intelligence ingestion through durable queue"
```

### Task 9: Prove the 5,000-Source Gate Before Source Expansion

**Files:**
- Create: `scripts/intelligence-scale.test.mjs`
- Create: `docs/intelligence-5k-gate.md`

**Interfaces:**
- Produces: deterministic synthetic scale harness and recorded pass/fail gate; no external network required.

- [ ] **Step 1: Write a synthetic 5,000-source queue test**

Generate 5,000 enabled sources spread across at least 250 domains and mixed refresh classes. Assert dispatch creates no duplicate active jobs and a second dispatch is idempotent.

- [ ] **Step 2: Simulate multiple workers**

Use shared fake queue state with at least four worker IDs and 20 internal loops each. Assert every claim is unique, domain serialization is respected, retries do not block unrelated domains, and expired leases are reclaimable.

- [ ] **Step 3: Add backlog/failure acceptance assertions**

With a deterministic 2% retryable failure rate and 0.2% permanent failure rate, the harness must finish all eligible work into success/retry/dead-letter states with no stranded `leased` jobs and no duplicate success for one job ID.

- [ ] **Step 4: Run the scale test**

Run: `node --test scripts/intelligence-scale.test.mjs`

Expected: PASS within the repository CI timeout on Node 22.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm run intel:test
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Record the gate result**

`docs/intelligence-5k-gate.md` records source/domain counts, worker settings, retry/dead-letter results, test command, commit SHA, and any measured limitations. Do not claim production 5k readiness unless the database migration is also applied and a non-destructive staging run confirms queue RPC behavior.

- [ ] **Step 7: Commit**

```bash
git add scripts/intelligence-scale.test.mjs docs/intelligence-5k-gate.md
git commit -m "test: prove max ingestion 5k foundation gate"
```

---

## Deferred to the Next MAX Ingestion Plan

These approved-spec items deliberately follow the 5k foundation gate so their design can use measured queue/storage behavior instead of guesses:

- automatic qualification rules for discovered candidates;
- RSS/Atom, JSON/API, CSV/XLSX, PDF/document, sitemap, docket/portal, permit, GIS/property, and jobs adapters;
- 25,000-source and 100,000 tracked-document gates;
- adaptive refresh based on observed change frequency/materiality/cost;
- first-class `intel_entity_relationships`, claim version/history, and expanded graph projections;
- snapshot compression/archive lifecycle;
- source-family expansion waves by operator, utility, jurisdiction, permitting, property, power, water, financing, contractor, and workforce data.

## Self-Review Result

- Spec coverage for the **5k foundation**: queue durability, multiple workers, domain throttling, source candidate capture, adapter boundary, metrics, failure recovery, privacy, and compatibility are assigned to concrete tasks.
- The public verification boundary is unchanged and remains downstream of ingestion.
- UI readability is intentionally excluded and implemented by the separate `2026-10-22-public-readability.md` plan.
- 25k/100k source-family expansion is intentionally deferred until Task 9 produces measured evidence from the foundation.

# DataCenter.forum Intelligence Ingestion + News Chyron Design

Date: 2026-10-19
Branch: `feature/intelligence-ingestion-v1`

## Goal

Turn DataCenter.forum from a small official-page watcher into a scalable data-center intelligence ingestion system while preserving the site's source-linked, verification-first product model. The same verified event layer will power the public Changes feed, project/company/market records, alerts, and a persistent site-wide news chyron.

The system must support an initial operating target of 500-1,000 monitored sources without making raw detections public or allowing source noise to overwrite verified project facts.

## Current State

The repository already contains:

- A Next.js public intelligence surface.
- Supabase/Postgres access used by `lib/intelligence.ts` and other server-side modules, with static JSON fallbacks for verified public data.
- A source registry in `data/source-registry.json` with roughly sixteen official sources.
- A daily GitHub Actions source watcher that fetches registered pages, fingerprints extracted page content, persists snapshots, and writes detected changes to a verification queue.
- A verified project-event layer exposed through `/changes`; raw source-watch detections are intentionally excluded until reviewed.
- Perception bridge support for emitting source-change events.

The main scalability constraints are the small hand-maintained registry, once-daily whole-page scans, repository JSON as the operational queue/snapshot store, and the lack of normalized observation/claim/entity records for combining multiple sources about the same project.

## Product Principles

1. **News discovers; evidence verifies.** Secondary reporting may create leads, but public facts require evidence appropriate to the claim.
2. **Raw observations are immutable evidence, not public facts.** Extraction never directly mutates canonical project records.
3. **One project, many sources.** Utility filings, permits, company releases, land records, contractor releases, and news articles should resolve to the same project entity where evidence supports that match.
4. **Verification state is explicit.** Every promoted fact carries a status, provenance, freshness date, and evidence links.
5. **Conflicts are preserved.** New observations do not silently replace conflicting verified facts.
6. **Public surfaces fail safely.** Existing static verified fallbacks remain available if Supabase/Postgres is unavailable.
7. **The chyron is downstream.** It consumes published intelligence events; it never scrapes sources or publishes raw detections itself.

## Source Families

The registry expands from a single list of official company pages into typed source families:

- hyperscaler/operator announcements
- utility and interconnection filings
- public-service commission dockets
- planning/zoning/permit portals
- county/city agendas and meeting records
- economic-development agencies
- tax-incentive/abatement records
- environmental and water permits
- property/land transaction records
- SEC/company filings
- construction/engineering contractor releases
- power generation/transmission project sources
- procurement/bid records
- official job postings and workforce announcements
- industry RSS/news sources used for discovery only unless they themselves establish a claim

Each source record stores at minimum:

- `id`
- `publisher`
- `source_type`
- `authority_tier`
- `url`
- `jurisdiction`
- optional `company_hint`
- optional `market_hint`
- optional `project_hint`
- `refresh_class`
- `enabled`
- `next_due_at`
- `last_success_at`
- `last_failure_at`
- `consecutive_failures`

## Refresh Classes

Use four refresh classes instead of one daily cadence:

- **rapid:** every 2 hours for high-value feeds or frequently changing official pages
- **standard:** every 6 hours for active operator, utility, and permitting sources
- **daily:** once per day for slower public records
- **weekly:** once per week for low-change reference sources

The first implementation keeps GitHub Actions as the scheduler and runs the dispatcher once per hour at minute 17. Each run selects only enabled sources with `next_due_at <= now()`. The runner interface must not depend on GitHub Actions so the scheduler can later move to a dedicated worker without changing ingestion semantics.

## Storage Architecture

Operational ingestion moves into the existing Supabase/Postgres stack. Repository JSON remains only for static fallback fixtures and migration/seed support, not as the long-term queue or raw snapshot system.

Raw source bodies are stored in a private Supabase Storage bucket named `intel-source-snapshots`. Postgres stores the object path, content hash, MIME type, byte size, and fetch metadata. The bucket is service-role only; public clients receive no direct raw-snapshot access.

### Core tables

#### `intel_sources`
Canonical source registry and scheduler metadata.

Indexes:

- `(enabled, next_due_at)` for due-source selection
- unique normalized source URL
- `(source_type, authority_tier)` for operational filtering

#### `intel_source_fetches`
One row per fetch attempt:

- source id
- fetched timestamp
- HTTP status
- content hash
- extraction version
- fetch duration
- success/failure state
- error classification
- snapshot object path
- response byte size
- content type

Indexes:

- `(source_id, fetched_at desc)`
- content hash for repeated-content detection

#### `intel_raw_observations`
Immutable extracted observations from fetched content. An observation represents what a source appeared to say at a specific time.

Required fields include:

- `id`
- `source_id`
- `fetch_id`
- `observed_at`
- `published_at` when known
- `observation_type`
- `subject_text`
- `predicate`
- `value_json`
- `quote_or_excerpt`
- `source_url`
- extraction confidence
- extractor version

#### `intel_entities`
Normalized entities such as company, project, market, utility, contractor, parcel, permit, substation, transmission project, and jurisdiction.

#### `intel_entity_aliases`
Known names/aliases used for deterministic and fuzzy resolution.

#### `intel_observation_links`
Links observations to candidate or resolved entities, with match method and confidence.

#### `intel_claims`
Normalized claims eligible for verification. Examples:

- project announced capacity = 1,200 MW
- contractor = Walbridge
- project stage = under construction
- permit filed on date X
- investment = $10B
- power supplier = utility Y

Claim fields include:

- canonical subject entity
- claim type
- normalized value
- verification status
- materiality
- first observed time
- last observed time
- last verified time
- current/conflicting state

#### `intel_claim_evidence`
Many-to-many link between claims and observations, including whether evidence supports, contradicts, or supersedes the claim.

#### `intel_events`
Publishable intelligence events derived from verified claims. This becomes the common event source for `/changes`, project timelines, alerts, and the news chyron.

Required event fields:

- `id`
- stable `event_key`
- event type
- headline
- summary
- materiality
- verification status
- project/company/market ids
- occurred/published/verified timestamps
- primary source
- evidence count
- public visibility

`event_key` is unique so repeated ingestion of the same verified change cannot publish duplicate events.

## Verification States

Use a fixed enum:

- `unverified`
- `single_source`
- `corroborated`
- `verified`
- `conflicting`
- `stale`
- `rejected`

Public database fields require `verified` unless a surface explicitly labels another state. Public chyron items require `verified` only.

### Authority model

Evidence ranking is claim-specific:

- **Tier 1:** government filing/permit/docket, utility filing, property record, official company/operator filing or release where the publisher has direct authority over the claim.
- **Tier 2:** directly involved contractor/vendor/partner announcement or authoritative economic-development body.
- **Tier 3:** reputable industry/local reporting used for corroboration or discovery.
- **Tier 4:** unattributed, reposted, social-only, or otherwise weak signals; discovery only.

A Tier 1 source can verify a claim when it has direct authority over that exact fact. Otherwise verification requires at least two independent supporting sources with one at Tier 1 or Tier 2, or an authenticated staff verification action.

Manual verification records the acting user, timestamp, previous state, new state, and reason.

## Ingestion Flow

### 1. Discover

Registry-driven scheduled fetches collect official sources. Discovery feeds may also create candidate URLs or source records, but discovered sources are not automatically treated as trusted evidence.

### 2. Fetch and snapshot

The fetcher records status, headers, content hash, and a private raw snapshot. A source failure affects only that source. Batch execution continues.

Fetcher limits for V1:

- maximum 20 concurrent source requests per runner
- 20-second request timeout
- maximum 5 MB response body after redirects
- maximum 5 redirects
- HTTPS only, except explicitly allowlisted HTTP government sources

### 3. Extract

Content extraction produces structured observations instead of only a page-level hash change. Existing fingerprinting remains useful as a cheap change gate: unchanged content skips full extraction unless the source adapter explicitly requires periodic re-extraction.

### 4. Resolve entities

Resolution order:

1. deterministic ids and explicit registry hints
2. exact aliases
3. normalized company/project/location keys
4. bounded fuzzy match
5. unresolved candidate for review

Automatic fuzzy linking is permitted only at confidence >= 0.95 and only when no competing candidate is within 0.05 confidence points. Otherwise the observation remains unresolved for review. Fuzzy resolution never merges or deletes canonical entities.

### 5. Build claims

Observations are normalized into claim candidates. Duplicate observations from mirrored/repeated content are collapsed by normalized subject + claim type + value + source lineage.

### 6. Verify

Verification evaluates authority tier, evidence agreement, conflicts, freshness, and manual approval state. Conflicting observations create or update a `conflicting` claim rather than overwriting the current public value.

### 7. Publish events

A material verified change produces an `intel_events` row. Event generation is idempotent using `event_key`, derived from entity id + claim type + normalized value + effective date/verification boundary.

### 8. Update public projections

Verified current claims update the canonical project/company/market projection used by public pages. The existing static fallback data remains untouched until explicitly regenerated from verified records.

## Material Event Types

Initial event taxonomy:

- `capacity`
- `construction`
- `stage`
- `power`
- `transmission`
- `generation`
- `land`
- `permit`
- `water`
- `environmental`
- `investment`
- `tax_incentive`
- `contractor`
- `partner`
- `operator`
- `opening`
- `delay`
- `cancellation`
- `jobs`

Materiality values:

- `critical`
- `high`
- `medium`
- `low`

Only critical/high/medium verified events are eligible for the default news chyron. Low-materiality events remain available in detailed timelines.

## News Chyron

### Placement

Render a reusable `NewsChyron` immediately below the global site header/navigation treatment on public pages.

Because headers are currently repeated in individual pages rather than centralized in `app/layout.tsx`, implementation must avoid duplicating ticker logic into every route. The implementation plan must enumerate current topbar routes and choose the smallest safe shared-chrome refactor or layout-level mounting strategy that excludes admin/auth surfaces.

### Content

Each item displays:

- leading label, e.g. `DATA CENTER NEWS`, `POWER WATCH`, `PERMIT WATCH`
- `VERIFIED`
- headline
- market or region
- event date

Click target goes to the related project/event record, not directly to an external source. Source provenance remains visible on the destination record.

### Behavior

- continuous horizontal crawl on desktop
- compact single-line horizontal presentation on mobile
- pause on pointer hover/focus when supported
- keyboard-accessible links
- respect `prefers-reduced-motion`; reduced-motion users see a static horizontally scrollable list
- no modal, overlay, or content obstruction
- no unverified detections

### Empty/failure state

If no eligible verified events are available, render the stable non-news label `DATA CENTER INTELLIGENCE · SOURCE-LINKED PROJECT DATA`. Never synthesize filler headlines.

If the event query fails, use the current verified static/project-graph event fallback if available; otherwise render the same stable non-news label.

## Public Read Model

`lib/intelligence.ts` and `lib/intelligence-graph.ts` remain the public access boundary. They should read verified Supabase projections first and retain static fallback behavior.

Add a focused `lib/intelligence-events.ts` read module for verified event queries. It must centralize chyron and Changes-feed filtering so the two surfaces cannot drift on verification policy.

`lib/intelligence-events.ts` reads `intel_events` first and falls back to the existing verified project-graph events when Supabase is unavailable or the event migration is not complete.

`/changes` migrates from assembling events by loading every project graph to querying this verified event read model directly once `intel_events` is populated.

## Source Growth Workflow

Source expansion must be data-driven rather than code-driven.

1. Add/update source rows in `intel_sources`.
2. Scheduler selects due sources by `next_due_at`.
3. Fetcher runs source adapters based on source type.
4. Generic HTML remains the fallback adapter.
5. Source-specific adapters may be added only when generic extraction cannot reliably capture the needed record structure.

Bulk import supports CSV/JSON source manifests. Imports are validated and inserted disabled by default; an explicit activation step enables them after validation.

## Failure Handling

- One failing source never aborts a batch.
- Retryable HTTP/network failures receive up to 3 attempts with exponential backoff and jitter in the current run.
- HTTP 408, 425, 429, and 5xx responses are retryable; most other 4xx responses are non-retryable for that run.
- A source is automatically paused after 10 consecutive failed scheduled runs. The pause reason is recorded and staff can re-enable it after correction.
- Extraction errors preserve the raw fetch and do not create observations.
- Entity-resolution uncertainty never creates automatic merges below the specified 0.95 threshold.
- Database write failures prevent publication; no public page should infer verification from partially written ingestion state.
- Claim verification and event publication occur in one database transaction when the event is generated from that transition.

## Security and Data Integrity

- Service-role credentials remain server-side only.
- Public clients receive read-only public projections, never ingestion tables.
- Row-level security blocks public mutation of intelligence tables.
- The raw snapshot bucket is private and service-role only.
- Raw HTML/text is treated as untrusted content; extraction must not execute source scripts.
- Fetcher rejects localhost, loopback, link-local, RFC1918/private, and cloud metadata destinations after DNS resolution and on redirects.
- Fetcher follows the redirect/size/time limits defined above and rejects unsupported protocols.
- Manual verification actions require authenticated staff authorization and are auditable.

## Performance Targets

Initial target: 1,000 enabled sources.

- due-source selection uses the `(enabled, next_due_at)` index rather than scanning fetch history
- source fetches execute at maximum concurrency 20 per runner
- unchanged sources skip full extraction where possible
- public chyron query returns at most 20 eligible events
- normal public page rendering never performs source ingestion synchronously
- raw snapshots are never bundled into the Next.js application build
- event/chyron queries should remain bounded by indexed filters on verification status, visibility, materiality, and verified timestamp

## Migration Strategy

### Phase 1 — Schema and compatibility

- add ingestion/event tables, enums, RLS, storage bucket policy, and indexes
- add read/write adapters
- seed current source registry into `intel_sources`
- preserve current JSON source watcher and static public fallback during migration

### Phase 2 — Parallel observation mode

- new ingestion runner writes fetches/observations/claims without publishing canonical changes
- compare new detections against existing fingerprint queue
- verify idempotency, extraction quality, and failure handling

### Phase 3 — Verified event publication

- enable claim verification and `intel_events`
- migrate `/changes` to verified event read model
- add NewsChyron backed by the same event query

### Phase 4 — Scale source registry

- bulk load 500-1,000 sources across the defined source families
- assign refresh classes and authority tiers
- monitor failure rate, duplicate rate, unresolved entity rate, and event precision

### Phase 5 — Retire repo JSON as operational state

- stop writing routine snapshots/queues to git
- keep compact verified fallback fixtures and explicit exports only
- retain historical migration artifacts where useful

## Testing

### Unit tests

- source due-time calculation
- fingerprint change gate
- response size/redirect safety
- observation normalization
- entity alias matching
- fuzzy-match acceptance/refusal behavior
- duplicate collapse
- claim conflict handling
- verification-state transitions
- materiality mapping
- event idempotency
- chyron eligibility filtering

### Integration tests

- fetch → snapshot → observation → claim → verification → event
- repeated identical source fetch creates no duplicate event
- conflicting source preserves current verified public claim
- database unavailable causes public intelligence reads to use static fallback where supported
- one source failure does not abort batch
- retry exhaustion and auto-pause behavior
- private/internal network fetch targets are rejected
- reduced-motion chyron rendering path

### Acceptance tests

- `/changes` and NewsChyron show only verified events
- chyron links resolve to internal records with source provenance
- admin/raw ingestion records and snapshot objects are not publicly writable or exposed
- a known official page change can be ingested and held for verification without appearing publicly
- a verified event becomes visible on both `/changes` and the chyron without duplicate publication
- no eligible events renders the stable intelligence label instead of fake news content

## Operational Metrics

Track at minimum:

- enabled sources
- paused sources
- fetch success rate
- fetch latency
- retryable/permanent failure counts
- changed-source rate
- observation count
- duplicate observation rate
- unresolved entity rate
- conflicting claim count
- verification queue age
- verified event count
- time from source publication to observation
- time from observation to verification

## Scope Boundaries for V1

Included:

- 500-1,000 source-ready architecture
- Supabase/Postgres operational ingestion model
- private Supabase Storage snapshots
- typed source registry and refresh classes
- normalized observations, entities, claims, evidence, and events
- verification policy
- verified event read model
- global NewsChyron
- migration from repository JSON operational state

Not included in V1:

- public rumor feed
- automatic publication of low-confidence AI extraction
- facial/person identification
- paid third-party data licensing integrations
- unrestricted general web crawling
- full geographic GIS visualization redesign
- automated trading/investment recommendations

## Definition of Done

V1 is complete when:

1. Current official sources are seeded into the new registry.
2. The ingestion runner can process due sources with maximum concurrency 20 and isolate failures.
3. Fetch metadata is stored in Postgres and raw source bodies are stored in the private snapshot bucket.
4. Immutable observations are stored in Postgres.
5. Observations resolve to canonical entities or remain explicitly unresolved.
6. Claims preserve evidence and conflicts.
7. Verification transitions are auditable.
8. Verified material changes generate idempotent public events.
9. `/changes` and the site-wide chyron consume the same verified event read model.
10. Unverified detections never appear on public surfaces.
11. The existing public verified fallback remains functional when the database is unavailable.
12. Automated tests cover the critical ingestion and publication paths.
13. The system is structurally ready for 500-1,000 monitored sources without adding one code path per source.

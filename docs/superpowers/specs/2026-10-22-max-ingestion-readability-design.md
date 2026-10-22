# DataCenter.forum MAX Ingestion + Readability Design

Date: 2026-10-22
Status: Approved design, implementation not started
Branch: `feature/max-ingestion-v2`
Supersedes scale assumptions in: `2026-10-19-data-center-intelligence-ingestion-design.md`

## 1. Product decision

DataCenter.forum is valuable only if its coverage becomes materially broader, deeper, and more current than a hand-curated project list. The ingestion system therefore becomes a core product moat, not a support function.

The approved operating model is **MAX ingestion with verification-first publication**:

- discover broadly;
- ingest aggressively from permitted public sources;
- retain provenance and source snapshots;
- normalize observations into an entity graph;
- preserve conflicting claims rather than silently overwriting them;
- promote only evidence-backed facts into canonical public records;
- keep lower-confidence material available as clearly separated signals or private raw intelligence;
- never let paid visibility alter factual rankings, verification, or source treatment.

The public product remains trustworthy because publication rules become stricter as ingestion volume grows.

## 2. Scale target

The previous 500-1,000 monitored-source operating target is removed as a product ceiling.

The new architecture must support staged growth without another redesign:

- Stage A: 5,000+ active monitored sources;
- Stage B: 25,000+ active monitored sources;
- Stage C: 100,000+ tracked URLs/endpoints/documents across monitored and discovery surfaces;
- Long term: no artificial source-count ceiling. Capacity is constrained only by source policy, cost, infrastructure throughput, and quality controls.

The database is expected to grow faster than the canonical project count. One project may accumulate hundreds of documents, observations, entity links, claims, permits, parcels, utility records, contractor relationships, and dated events.

## 3. Scope of intelligence

The graph must evolve from `project -> source` into a multi-entity infrastructure model:

`Project -> Campus -> Building -> Parcel -> Company -> Utility -> Substation -> Transmission -> Generation -> Storage -> Permit -> Contractor -> Vendor -> Financing -> Incentive -> Water -> Workforce -> Event -> Source`

Not every project will have every entity type. Missing facts remain unknown rather than inferred.

### Core entity classes

- data-center project
- campus
- building/phase
- operator
- developer
- owner
- tenant/customer when publicly established
- utility
- ISO/RTO/market
- substation
- transmission line/project
- generation asset
- battery/storage asset
- parcel/property
- jurisdiction
- permit/application/docket
- contractor/EPC
- engineering firm
- equipment vendor
- technology partner
- financier/investor
- tax incentive/abatement
- water utility/water agreement
- workforce/job signal
- public meeting/hearing
- source/publisher

## 4. Source coverage

MAX ingestion uses source families rather than a flat hand-maintained URL list.

### Authority lane A: direct-authority evidence

Highest-priority monitored sources:

- operator and hyperscaler announcements;
- utility filings and service agreements;
- interconnection queues and transmission planning records;
- ISO/RTO records;
- public-service commission dockets;
- county/city planning and zoning portals;
- building, grading, electrical, environmental and other permit portals;
- assessor, recorder and property-transfer records;
- tax-incentive and abatement records;
- economic-development agreements;
- environmental and water permits;
- SEC/company filings;
- state/federal grant and infrastructure records;
- procurement and public bid records.

### Authority lane B: directly involved participants

- developers;
- contractors and EPC firms;
- engineering firms;
- utilities and generation developers;
- equipment suppliers;
- financing partners;
- economic-development organizations;
- technology partners;
- official workforce announcements.

### Discovery lane C: broad signal discovery

Used to find projects, names, locations, documents and candidate claims, but not automatically treated as canonical evidence:

- specialist data-center news;
- local reporting;
- industry RSS feeds;
- business journals;
- company career pages;
- public presentations;
- conference materials;
- public social posts from attributable official accounts;
- search/discovery feeds.

### Source policy

The system may fetch public, permitted material. It must not bypass authentication, paywalls, CAPTCHA, access controls, rate limits, or source restrictions. Per-domain rate controls and source-specific adapters are required. A source may be disabled globally, by domain, or by path.

## 5. Discovery architecture

A static manifest is retained only as a seed and allowlist/bootstrap mechanism. MAX ingestion adds a discovery frontier.

### New source lifecycle

`candidate -> reviewed/auto-qualified -> active -> degraded -> paused -> retired`

Candidate sources include:

- newly linked official pages found in monitored content;
- newly published docket/permit URLs;
- sitemap/feed discoveries;
- newly observed company/project domains;
- new local-government records discovered by jurisdiction adapters;
- URLs submitted by staff;
- candidate sources generated by discovery feeds.

Each candidate stores why it was discovered, parent source, discovery timestamp, likely source family, jurisdiction, entity hints, and confidence.

Automatic activation is allowed only for narrowly defined trusted patterns. Everything else enters source review or a low-trust discovery lane.

## 6. Worker and queue architecture

The current single batch runner is not the MAX architecture. It currently selects up to 1,000 due sources and processes at most 20 concurrent requests. MAX ingestion replaces this with a durable queue and independent workers.

### Required queue model

Add `intel_ingest_jobs` with at minimum:

- `id`
- `source_id`
- `job_type`
- `priority`
- `scheduled_for`
- `status`
- `attempt_count`
- `lease_owner`
- `lease_expires_at`
- `started_at`
- `finished_at`
- `last_error_class`
- `last_error_message`
- `created_at`

Workers claim jobs using transactional `FOR UPDATE SKIP LOCKED` semantics so many workers can operate without processing the same job.

### Job types

- discover
- fetch
- extract
- resolve
- claim-build
- verify-auto
- publish-event
- reprocess
- archive/retention

V1 implementation may combine some adjacent stages inside one worker process, but the durable state boundary must exist so failed work can resume without restarting the full source lifecycle.

### Scheduler

The scheduler only creates/refreshes jobs. It does not perform heavy fetch/extraction work itself.

The existing hourly GitHub Actions workflow may remain as a temporary dispatcher during migration, but the architecture must no longer assume one Actions run can clear the due-source backlog.

## 7. Priority and freshness model

Replace four global refresh classes with adaptive scheduling while retaining the current labels for compatibility.

Base classes:

- `rapid`: high-value active project sources;
- `standard`: active utility, operator, planning and permit sources;
- `daily`: slower public records;
- `weekly`: reference and low-change sources.

Adaptive factors:

- recent change frequency;
- project materiality;
- construction stage;
- source authority;
- failure rate;
- source latency;
- cost of fetch/extraction;
- explicit analyst watchlist priority.

A rapidly changing source can be promoted temporarily; a long-stable source can back off. Backoff must never change its authority tier or verification role.

## 8. Fetch adapters

Generic HTML fetching remains the default fallback, but MAX ingestion requires typed adapters.

Adapter classes:

- HTML page
- RSS/Atom
- JSON/API
- CSV/XLSX
- PDF/document
- sitemap/index
- docket/portal
- permit portal
- GIS/property feed
- job/career feed

Every adapter returns a common envelope:

- normalized canonical URL;
- fetched timestamp;
- HTTP/status metadata;
- content type;
- source-native identifiers;
- raw snapshot reference;
- normalized text/records;
- extraction version;
- adapter version;
- warnings/errors.

PDF or spreadsheet extraction is adapter-specific. Raw source material remains private unless the publisher already exposes a public link and DataCenter.forum only links to it.

## 9. Storage and database scaling

The existing `intel_sources`, `intel_source_fetches`, `intel_raw_observations`, `intel_entities`, `intel_entity_aliases`, `intel_observation_links`, `intel_claims`, `intel_claim_evidence`, and `intel_events` tables remain the core model.

MAX ingestion adds or extends:

- `intel_source_candidates`
- `intel_ingest_jobs`
- `intel_source_domains`
- `intel_source_adapter_config`
- `intel_entity_relationships`
- `intel_claim_versions` or immutable claim-history records
- `intel_verification_actions`
- `intel_extraction_runs`
- `intel_ingestion_metrics`

### Write behavior

- observations, aliases and evidence links use batch inserts/upserts;
- queue claiming uses `SKIP LOCKED`;
- mutable canonical records use short transactions;
- every foreign-key lookup used heavily in joins receives an index;
- every public query path is benchmarked with realistic data volume;
- JSONB is for irregular source-specific metadata, not a substitute for frequently queried typed columns.

### Partitioning

Do not prematurely partition small tables. Introduce time-based partitioning when fetches/observations/events approach operational thresholds where maintenance or scans degrade materially; plan for `intel_source_fetches` and `intel_raw_observations` to be the first candidates. Partition keys must align with common time-bounded query patterns.

### Snapshot retention

Raw snapshots are valuable evidence but can become the largest cost center.

Retention policy:

- always retain hashes and fetch metadata;
- retain snapshots that produced material observations, verified claims, conflicts or published events;
- retain the first and latest meaningful snapshot for long-lived sources;
- allow compression/deduplication for identical content;
- allow lifecycle archival for redundant unchanged snapshots;
- never delete evidence referenced by an active verification decision without an explicit retention policy migration.

## 10. Entity resolution

Entity resolution is conservative by design.

Resolution order:

1. explicit source-native IDs;
2. registry/entity hints;
3. exact canonical keys;
4. exact aliases;
5. normalized company + location + project keys;
6. bounded fuzzy match;
7. unresolved candidate.

Fuzzy matching must not merge entities. It may propose a link. Automatic resolution requires a high threshold and no close competing candidate.

Relationships are first-class records with provenance, role, effective dates where known, confidence, and verification state.

## 11. Claims and verification

The verification model remains the trust boundary.

States:

- `unverified`
- `single_source`
- `corroborated`
- `verified`
- `conflicting`
- `stale`
- `rejected`

### Publication rule

Canonical public facts require `verified` unless a surface explicitly presents a non-canonical signal with a visible status label.

The news chyron and material-change feed remain verified-only.

### Three product layers

1. **Canonical facts** — verified public records.
2. **Signals** — source-linked probable developments with explicit confidence/status labeling; never visually confused with canonical facts.
3. **Raw intelligence** — private observations, snapshots, unresolved candidates and operational metadata.

### Conflict handling

Conflicting values coexist until resolved. A later source does not overwrite a verified prior value merely because it is newer. Claim history records what changed, why the canonical value changed, and which evidence supported the decision.

## 12. Public intelligence graph

The public record should eventually answer both entity and relationship questions.

Examples:

- all projects tied to one utility;
- all contractors attached to hyperscaler projects;
- all campuses depending on the same substation/transmission build;
- project capacity by market and construction stage;
- announced versus currently verified capacity;
- projects with permits but no verified construction start;
- projects with land acquisition but no verified power agreement;
- companies repeatedly appearing across the same project stack.

The graph must never imply causation from mere co-occurrence.

## 13. Search and data-product requirements

As record count grows, public database UX must support:

- full-text project/company/location search;
- filters for operator, developer, market, region, stage, capacity range, investment range, verification freshness and source count;
- relationship filters;
- event/change filters;
- sortable last-verified and last-changed dates;
- saved watchlists for paid users;
- CSV/data export from canonical facts;
- clear distinction between unknown, not applicable, estimated and verified fields.

Large result sets use indexed server-side pagination; never load all records into the browser.

## 14. Readability and typography

The October 22 screenshots establish a UI defect: useful metadata is visually too small relative to the editorial headlines. The large headings remain part of the design language; supporting information must become readable without zooming.

### Minimum desktop/tablet targets

- primary navigation: 16px minimum;
- body copy: 18px default, 17px absolute minimum for secondary text;
- card copy: 17px minimum;
- labels/kickers: 13-14px minimum;
- metadata and dates: 14px minimum;
- metric captions: 14-15px;
- metric values: 28-34px;
- buttons/links used as actions: 15-16px minimum;
- news chyron/ticker: 14px minimum;
- form controls: 16px minimum.

### Mobile

Do not shrink critical metadata below 14px to preserve layout. Stack, truncate with disclosure, or reduce columns instead.

### Density rule

Information density should come from hierarchy, grouping, filters and progressive disclosure—not microscopic text.

## 15. Observability

MAX ingestion is only useful if failures are measurable.

Track at minimum:

- active sources by family/authority/jurisdiction;
- candidate sources awaiting review;
- jobs queued/running/failed/dead-lettered;
- source fetch success rate;
- median/p95 fetch latency;
- bytes fetched and snapshot storage growth;
- observations extracted per source family;
- entity-resolution success/unresolved rate;
- claims created/corroborated/verified/conflicting;
- time from first observation to verification;
- stale verified claims;
- per-domain throttling events;
- cost by ingestion stage where measurable.

A failing source never aborts unrelated work.

## 16. Failure handling

- exponential backoff with jitter for retryable network failures;
- bounded retry count;
- dead-letter state for repeatedly failing jobs;
- source-level pause only after policy threshold;
- automatic resume may be allowed for transient domain-wide outages after cooldown;
- parser/extractor failures are distinguished from network failures;
- bad source data cannot mutate canonical facts directly;
- worker crash leaves a lease that expires and can be reclaimed;
- duplicate jobs are safe because fetch/event writes are idempotent.

## 17. Security

Keep the current SSRF defenses and strengthen them as adapters expand.

Requirements:

- HTTPS by default;
- validate every redirect target;
- reject loopback, private, metadata, multicast and unsafe mapped addresses;
- per-request timeout and total streaming deadline;
- response-size caps by adapter class;
- no secrets in repository source manifests;
- raw snapshots remain private;
- service-role credentials remain server/worker only;
- public RLS exposes only approved fields and verified public events;
- ingestion HTML/content is untrusted data and never executed.

## 18. Cost controls without shrinking coverage

MAX ingestion does not mean wasteful ingestion.

Control cost through:

- content hashes and conditional requests;
- change gates before expensive extraction;
- domain-aware backoff;
- cheap deterministic parsing before AI/LLM extraction;
- batching;
- snapshot compression and deduplication;
- adaptive refresh intervals;
- priority queues;
- reprocessing only when extractor versions or source material change.

Cost controls may lower frequency or processing depth. They must not silently remove high-value source families from coverage.

## 19. Migration from current branch

Preserve the existing verification-first tables and source ingestion code as the compatibility base.

Migration sequence:

1. keep current source registry operational;
2. add durable jobs/source-candidate/domain-config schema;
3. change scheduler from direct batch processing to enqueueing;
4. add worker claiming with leases and `SKIP LOCKED`;
5. move current fetch/extract logic behind worker job handlers;
6. add batch observation writes;
7. add adapter registry and generic adapter interface;
8. add source discovery/candidate pipeline;
9. add relationship and claim-history records;
10. add ingestion observability;
11. expand source families in controlled waves;
12. apply readability typography floors to public intelligence/database/pricing surfaces;
13. load-test search, event rendering and public database pagination at projected scale.

No production DNS change is required for this migration.

## 20. Acceptance gates

### Architecture gate

- queue can safely run multiple workers;
- a worker crash cannot permanently strand a job;
- duplicate execution is idempotent;
- direct raw observations still cannot mutate canonical public facts.

### 5k-source gate

- 5,000 registered active sources can be scheduled without backlog growth under normal refresh policy;
- domain rate limits are enforced;
- ingestion failure on one source does not block others;
- operational metrics expose backlog and failure rate.

### 25k-source gate

- scheduling and job claiming remain index-driven;
- public search/database performance remains within agreed budgets;
- storage retention is bounded by policy;
- extraction and entity-resolution queues remain observable and recoverable.

### Trust gate

- every canonical material fact retains provenance;
- conflicts remain visible internally and are not silently overwritten;
- public verified events can be traced to evidence;
- discovery feeds cannot directly publish canonical facts.

### Readability gate

At tablet and desktop widths represented by the October 22 screenshots:

- no important body copy is below 17px;
- navigation is at least 16px;
- metadata/ticker text is at least 14px;
- cards remain readable without browser zoom;
- smaller viewports reflow instead of shrinking critical text.

## 21. Explicit non-goals

- no pay-to-rank factual records;
- no fabricated project facts to increase apparent coverage;
- no automatic fuzzy entity merges;
- no bypassing protected/private sources;
- no replacement of verification with volume;
- no public exposure of raw source snapshots;
- no requirement to ingest every unchanged page at maximum frequency;
- no production release as part of this design document.

## 22. Success definition

The MAX system succeeds when DataCenter.forum stops feeling like a small manually maintained database and starts behaving like a continuously updated infrastructure-intelligence graph: broad enough to discover developments early, structured enough to support serious commercial research, and strict enough that users can inspect why a fact is present and where it came from.

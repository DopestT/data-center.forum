# DataCenter.forum

Source-linked data-center project intelligence database with a practitioner community and B2B marketplace supporting the research layer.

## Current foundation

- Database-first public project intelligence surface with source trails and last-verified dates.
- Next.js 16 App Router.
- Supabase/Postgres forum schema with RLS.
- Verified project-change feed and site-wide verified news chyron.
- Scalable intelligence ingestion path for operator, utility, permitting, public-record, partner, and discovery sources.
- Cold-start policy built around clearly labeled STAFF house accounts only; no fabricated members.
- Vendor marketplace with approval state, verification flags, plan tiers and consent-based lead requests.
- Founding Partner sales page.
- Data-center jobs marketplace and employer/recruiter intake.
- Sponsorship sales page with permanent disclosure principles.
- DCF Opportunities buyer-intent intake and public verified-opportunity surface.
- Protected `/admin/revenue` commercial operations console.
- `/api/health` deployment check.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use Node.js 22 or later. The pinned Supabase JavaScript packages require Node 22+.

## Supabase setup

Run migrations in this order in the Supabase SQL editor:

```text
seed/schema.sql
seed/002_seed-pack.sql
seed/003_monetization.sql
seed/004_commerce_intake.sql
seed/005_revenue_operations.sql
seed/006_intelligence_database.sql
seed/007_expand_launch_database.sql
seed/008_intelligence_graph.sql
seed/009_google_source_date.sql
seed/010_intelligence_ingestion.sql
```

Migration `010_intelligence_ingestion.sql` creates the operational ingestion tables, verified public event surface, required indexes/RLS, and the private `intel-source-snapshots` Storage bucket. The bucket is not public and raw source snapshots are never a public content surface.

Then configure trusted server/runtime environments:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser or committed to Git. The hourly GitHub Actions ingestion job needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured as repository Actions secrets.

## Intelligence ingestion

The pipeline is intentionally verification-first:

1. Due registered sources are fetched with redirect/IP, timeout, body-size, and retry limits.
2. Changed source content is stored privately and converted into immutable raw observations.
3. Raw observations are unverified evidence. They do **not** directly change public project fields and do not enter the news chyron.
4. Claims preserve provenance, conflicts, materiality, and verification status.
5. Only `verified` public events can feed `/changes` and the site-wide news chyron.

The initial source manifest contains the existing reviewed source registry. Validate it without writing:

```bash
npm run intel:sources:import -- --dry-run
```

Import/update the source registry after migration 010 has been applied:

```bash
npm run intel:sources:import
```

Run the focused intelligence test suite:

```bash
npm run intel:test
```

Run one due-source ingestion pass manually:

```bash
npm run intel:ingest
```

The scheduled workflow runs hourly at minute 17. Each source still follows its own refresh class (`rapid`, `standard`, `daily`, or `weekly`) through `next_due_at`; an hourly dispatch does not mean every source is fetched every hour.

The legacy `npm run intel:scan` command remains available for manual migration comparison only. It is not the scheduled production ingestion path and repository JSON is not the new operational queue/snapshot store.

### Failure and rollback behavior

- A failing source does not abort the batch.
- Unchanged source content skips new snapshot/observation creation.
- A source is automatically paused after 10 consecutive scheduled-run failures.
- Raw observations and unverified/conflicting/stale/rejected claims remain non-public.
- If the new public event table is unavailable during migration or an outage, public event rendering falls back to the existing verified project graph/static data rather than raw source-watch detections.
- No DNS change is required for the ingestion migration.

## Seed data

Preview the cold-start schedule:

```bash
node seed/import-seed.mjs --dry
```

Load it after the database migrations exist:

```bash
node seed/import-seed.mjs
```

## Revenue surfaces

- `/vendors` — reviewed vendor marketplace and vendor application intake.
- `/vendors/[slug]` — approved vendor profiles and consent-based buyer introductions.
- `/partners` — Founding Partner offer; launch price is $1,500 for 90 days.
- `/jobs` — specialist job board; $149 standard, $299 featured, $499/month recruiter unlimited.
- `/advertise` — category sponsorships, sponsored briefings and research/data partnerships.
- `/opportunities` — buyer needs and qualified vendor matching.
- `/admin/revenue` — private operating console for applications, verification, leads, jobs, opportunities, sponsorships and paid-content inventory.

The commercial rule is simple: companies may buy visibility, distribution and qualified introductions. They cannot buy favorable discussion, rankings, moderation outcomes, or private member data.

## Admin setup

The revenue console uses Supabase Auth plus the existing `profiles.role` field. An authenticated profile with role `moderator` or `admin` can access the console. RLS keeps application contact details, buyer lead details, verification notes and sponsor pipeline data out of public reads.

Sponsored content is created as `draft`, activated manually from the revenue console, and rendered only through the disclosed sponsored slot. The public component always shows the configured disclosure label and `Paid for by <sponsor>`.

## Vercel

Import the GitHub repository into Vercel and add the public Supabase variables. The public read surfaces work under RLS. Intake forms insert into write-only tables. Keep service-role usage restricted to trusted seed/admin/ingestion operations.

## Billing handoff

Live Stripe account/product setup is intentionally not wired in this branch. The pricing, plan names and approval workflows are already represented in the app and database. When billing is connected, use Stripe Billing + Checkout for recurring vendor/recruiter products and Checkout for one-time packages; do not expose Stripe secrets to the browser.

Before enabling automatic Stripe tax collection, confirm the required tax registrations are active; enabling Stripe Tax alone does not create registrations.

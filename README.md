# DataCenter.forum

Independent practitioner community plus a B2B marketplace for the data-center industry.

## Current foundation

- Next.js 16 App Router.
- Supabase/Postgres forum schema with RLS.
- Cold-start policy built around clearly labeled STAFF house accounts only; no fabricated members.
- 36 practitioner questions scheduled across a four-week private-beta release.
- Vendor marketplace with approval state, verification flags, plan tiers and consent-based lead requests.
- Founding Partner sales page.
- Data-center jobs marketplace and employer/recruiter intake.
- Sponsorship sales page with permanent disclosure principles.
- DCF Opportunities buyer-intent intake and public verified-opportunity surface.
- Protected `/admin/revenue` commercial operations console.
- Vendor verification checks, lead pipeline analytics, job/opportunity publishing and sponsor pipeline controls.
- Sponsored-content inventory with explicit public disclosure labels.
- `/api/health` deployment check.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase setup

Run migrations in this order in the Supabase SQL editor:

```text
seed/schema.sql
seed/002_seed-pack.sql
seed/003_monetization.sql
seed/004_commerce_intake.sql
seed/005_revenue_operations.sql
```

Then configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser or committed to Git.

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

Import the GitHub repository into Vercel and add the public Supabase variables. The public read surfaces work under RLS. Intake forms insert into write-only tables. Keep service-role usage restricted to trusted seed/admin operations.

## Billing handoff

Live Stripe account/product setup is intentionally not wired in this branch. The pricing, plan names and approval workflows are already represented in the app and database. When billing is connected, use Stripe Billing + Checkout for recurring vendor/recruiter products and Checkout for one-time packages; do not expose Stripe secrets to the browser.

Before enabling automatic Stripe tax collection, confirm the required tax registrations are active; enabling Stripe Tax alone does not create registrations.

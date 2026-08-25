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

The commercial rule is simple: companies may buy visibility, distribution and qualified introductions. They cannot buy favorable discussion, rankings, moderation outcomes, or private member data.

## Vercel

Import the GitHub repository into Vercel and add the public Supabase variables. The public read surfaces work under RLS. Intake forms insert into write-only tables. Keep service-role usage restricted to trusted seed/admin operations.

## Next monetization layer

1. Vendor verification/admin workflow.
2. Stripe products, subscriptions and approved-company checkout.
3. Sponsor/admin dashboard.
4. Lead analytics and routing.
5. Sponsored-content disclosure metadata on every paid content object.

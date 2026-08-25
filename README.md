# DataCenter.forum

Independent community and intelligence platform for the data-center industry: power, development, construction, operations, AI infrastructure, finance, policy, jobs and vendors.

## What this foundation includes

- Next.js 16 App Router shell with a launch-ready editorial/forum homepage.
- Supabase/Postgres schema for profiles, categories, threads, posts, reactions and bookmarks.
- Row Level Security for public reading plus authenticated member posting and ownership controls.
- Seed support for house/expert accounts whose `user_id` is intentionally nullable; real members link to Supabase Auth.
- Deterministic seed importer with 36 industry-specific starter threads staggered across working hours.
- `/api/health` endpoint for deployment checks.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run `seed/schema.sql` in the Supabase SQL editor.
3. Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to Git.

Preview the seed schedule without credentials:

```bash
node seed/import-seed.mjs --dry
```

Load the seed data after the schema exists:

```bash
node seed/import-seed.mjs
```

The importer is designed to be rerunnable: house profiles and seed threads are upserted by stable identifiers.

## Vercel

Import this GitHub repository into Vercel, add the two public Supabase variables, and deploy. Add `SUPABASE_SERVICE_ROLE_KEY` only when a server-side operation actually requires it; the public site should not depend on that key.

## Product direction

The forum is the acquisition and trust layer. Monetization should be added around—not inside—the core conversation experience: premium intelligence/research, verified vendor profiles, recruiting, sponsored data products, qualified project leads, and eventually structured facility/project datasets.

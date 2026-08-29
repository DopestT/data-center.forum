-- DataCenter.forum monetization layer
-- Run after seed/schema.sql and seed/002_seed-pack.sql.

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  website text,
  description text not null default '',
  categories text[] not null default '{}'::text[],
  regions text[] not null default '{}'::text[],
  plan text not null default 'vendor' check (plan in ('vendor','featured','founding_partner')),
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  is_verified boolean not null default false,
  is_founding_partner boolean not null default false,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  contact_name text not null,
  contact_email text not null,
  categories text[] not null default '{}'::text[],
  requested_plan text not null default 'vendor',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_leads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_company text,
  need text not null,
  status text not null default 'new' check (status in ('new','accepted','closed','spam')),
  consent_to_intro boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  company_name text not null,
  title text not null,
  location text,
  employer_type text,
  compensation text,
  description text not null,
  apply_url text not null,
  plan text not null default 'standard' check (plan in ('standard','featured','unlimited')),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  category text not null,
  region text,
  timeline text,
  need text not null,
  status text not null default 'open' check (status in ('open','matched','closed')),
  is_verified boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsorship_inquiries (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  package text,
  budget text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists vendors_categories_gin_idx on public.vendors using gin(categories);
create index if not exists vendors_status_plan_idx on public.vendors(status,plan);
create index if not exists jobs_status_published_idx on public.jobs(status,published_at desc);
create index if not exists opportunities_status_created_idx on public.opportunities(status,created_at desc);

alter table public.vendors enable row level security;
alter table public.vendor_applications enable row level security;
alter table public.vendor_leads enable row level security;
alter table public.jobs enable row level security;
alter table public.opportunities enable row level security;
alter table public.sponsorship_inquiries enable row level security;

drop policy if exists "approved vendors public read" on public.vendors;
create policy "approved vendors public read" on public.vendors for select using (status='approved');

drop policy if exists "published jobs public read" on public.jobs;
create policy "published jobs public read" on public.jobs for select using (status='published' and (expires_at is null or expires_at > now()));

drop policy if exists "public opportunities read" on public.opportunities;
create policy "public opportunities read" on public.opportunities for select using (is_public=true and status='open');

-- Public submissions are write-only through RLS. Server-side validation should still
-- rate-limit and validate all forms before inserting.
drop policy if exists "submit vendor application" on public.vendor_applications;
create policy "submit vendor application" on public.vendor_applications for insert to anon, authenticated with check (char_length(contact_email) between 5 and 320);

drop policy if exists "submit vendor lead" on public.vendor_leads;
create policy "submit vendor lead" on public.vendor_leads for insert to anon, authenticated with check (consent_to_intro=true and char_length(requester_email) between 5 and 320 and char_length(need) between 10 and 5000);

drop policy if exists "submit sponsorship inquiry" on public.sponsorship_inquiries;
create policy "submit sponsorship inquiry" on public.sponsorship_inquiries for insert to anon, authenticated with check (char_length(contact_email) between 5 and 320);

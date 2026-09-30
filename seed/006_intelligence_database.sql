-- DataCenter.forum database-first intelligence layer
-- Run after seed/005_revenue_operations.sql.

create table if not exists public.intel_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  company text not null,
  market text not null,
  region text not null,
  country text not null default 'United States',
  stage text not null,
  announced_capacity_mw numeric(10,2),
  investment_label text,
  summary text not null,
  source_name text not null,
  source_url text not null,
  source_published_at date,
  last_verified_at timestamptz not null default now(),
  featured boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intel_projects_company_idx on public.intel_projects(company);
create index if not exists intel_projects_market_idx on public.intel_projects(market);
create index if not exists intel_projects_stage_idx on public.intel_projects(stage);
create index if not exists intel_projects_capacity_idx on public.intel_projects(announced_capacity_mw desc);
create index if not exists intel_projects_verified_idx on public.intel_projects(last_verified_at desc);

alter table public.intel_projects enable row level security;

revoke all on table public.intel_projects from anon, authenticated;
grant select on table public.intel_projects to anon, authenticated;
grant insert, update, delete on table public.intel_projects to authenticated;
grant all on table public.intel_projects to service_role;

drop policy if exists "public intelligence read" on public.intel_projects;
create policy "public intelligence read"
on public.intel_projects
for select
to anon, authenticated
using (is_public = true);

drop policy if exists "dcf admin intelligence insert" on public.intel_projects;
create policy "dcf admin intelligence insert"
on public.intel_projects
for insert
to authenticated
with check (public.is_dcf_admin());

drop policy if exists "dcf admin intelligence update" on public.intel_projects;
create policy "dcf admin intelligence update"
on public.intel_projects
for update
to authenticated
using (public.is_dcf_admin())
with check (public.is_dcf_admin());

drop policy if exists "dcf admin intelligence delete" on public.intel_projects;
create policy "dcf admin intelligence delete"
on public.intel_projects
for delete
to authenticated
using (public.is_dcf_admin());

drop trigger if exists intel_projects_set_updated_at on public.intel_projects;
create trigger intel_projects_set_updated_at
before update on public.intel_projects
for each row execute function public.set_updated_at();

insert into public.intel_projects (
  slug,name,company,market,region,country,stage,announced_capacity_mw,investment_label,
  summary,source_name,source_url,source_published_at,last_verified_at,featured,is_public
) values
(
  'meta-hyperion-richland-parish',
  'Hyperion / Richland Parish Data Center',
  'Meta',
  'Northeast Louisiana',
  'Richland Parish, Louisiana',
  'United States',
  'Under construction',
  5000,
  '$50B+',
  'Meta''s largest announced data-center campus, built to support the Hyperion multi-gigawatt AI training cluster.',
  'Meta Data Centers',
  'https://datacenters.atmeta.com/richland-parish-data-center/',
  '2026-07-13',
  '2026-09-29T00:00:00Z',
  true,
  true
),
(
  'amazon-northern-indiana-2-4gw',
  'Northern Indiana Data Center Campuses',
  'Amazon Web Services',
  'Northern Indiana',
  'Northern Indiana',
  'United States',
  'Announced / development',
  2400,
  '$15B',
  'AWS announced new Northern Indiana campuses supporting AI and cloud workloads with 2.4 GW of planned data-center capacity.',
  'Amazon',
  'https://www.aboutamazon.com/news/company-news/amazon-15-billion-indiana-data-centers',
  null,
  '2026-09-29T00:00:00Z',
  true,
  true
),
(
  'openai-the-barn-saline-michigan',
  'The Barn',
  'OpenAI / Oracle / Related Digital',
  'Southeast Michigan',
  'Saline, Michigan',
  'United States',
  'Under construction',
  1000,
  null,
  'A 1 GW Stargate data-center campus in Saline, Michigan, developed with Oracle, Related Digital, and Walbridge.',
  'OpenAI',
  'https://openai.com/index/stargate-michigan-data-center/',
  '2026-06-01',
  '2026-09-29T00:00:00Z',
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  company = excluded.company,
  market = excluded.market,
  region = excluded.region,
  country = excluded.country,
  stage = excluded.stage,
  announced_capacity_mw = excluded.announced_capacity_mw,
  investment_label = excluded.investment_label,
  summary = excluded.summary,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_published_at = excluded.source_published_at,
  last_verified_at = excluded.last_verified_at,
  featured = excluded.featured,
  is_public = excluded.is_public;

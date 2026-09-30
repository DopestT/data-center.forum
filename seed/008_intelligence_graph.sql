-- DataCenter.forum intelligence graph v1
-- Run after seed/007_expand_launch_database.sql.

create table if not exists public.intel_sources (
  id uuid primary key default gen_random_uuid(),
  publisher text not null,
  title text,
  url text not null unique,
  source_type text not null default 'official_company',
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  content_hash text,
  is_primary boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intel_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  org_type text not null default 'other',
  website text,
  country text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intel_project_participants (
  project_id uuid not null references public.intel_projects(id) on delete cascade,
  organization_id uuid not null references public.intel_organizations(id) on delete cascade,
  role text not null,
  relationship_status text not null default 'current',
  source_id uuid references public.intel_sources(id) on delete set null,
  notes text,
  first_seen_at timestamptz,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (project_id, organization_id, role)
);

create table if not exists public.intel_project_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.intel_projects(id) on delete cascade,
  category text not null,
  fact_key text not null,
  text_value text,
  number_value numeric,
  unit text,
  effective_at timestamptz,
  source_id uuid references public.intel_sources(id) on delete set null,
  confidence numeric(4,3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (text_value is not null or number_value is not null)
);

create table if not exists public.intel_project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.intel_projects(id) on delete cascade,
  event_type text not null,
  event_date date not null,
  headline text not null,
  summary text not null,
  materiality text not null default 'medium' check (materiality in ('low','medium','high')),
  source_id uuid references public.intel_sources(id) on delete set null,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intel_sources_publisher_idx on public.intel_sources(publisher);
create index if not exists intel_sources_published_idx on public.intel_sources(published_at desc);
create index if not exists intel_org_type_idx on public.intel_organizations(org_type);
create index if not exists intel_participants_project_idx on public.intel_project_participants(project_id);
create index if not exists intel_participants_org_idx on public.intel_project_participants(organization_id);
create index if not exists intel_facts_project_idx on public.intel_project_facts(project_id);
create index if not exists intel_facts_category_key_idx on public.intel_project_facts(category,fact_key);
create index if not exists intel_events_project_date_idx on public.intel_project_events(project_id,event_date desc);
create index if not exists intel_events_type_idx on public.intel_project_events(event_type);

alter table public.intel_sources enable row level security;
alter table public.intel_organizations enable row level security;
alter table public.intel_project_participants enable row level security;
alter table public.intel_project_facts enable row level security;
alter table public.intel_project_events enable row level security;

grant select on public.intel_sources, public.intel_organizations, public.intel_project_participants, public.intel_project_facts, public.intel_project_events to anon, authenticated;
grant all on public.intel_sources, public.intel_organizations, public.intel_project_participants, public.intel_project_facts, public.intel_project_events to service_role;

drop policy if exists "public intelligence sources read" on public.intel_sources;
create policy "public intelligence sources read" on public.intel_sources for select to anon, authenticated using (true);

drop policy if exists "public intelligence organizations read" on public.intel_organizations;
create policy "public intelligence organizations read" on public.intel_organizations for select to anon, authenticated using (true);

drop policy if exists "public intelligence participants read" on public.intel_project_participants;
create policy "public intelligence participants read" on public.intel_project_participants for select to anon, authenticated using (true);

drop policy if exists "public intelligence facts read" on public.intel_project_facts;
create policy "public intelligence facts read" on public.intel_project_facts for select to anon, authenticated using (true);

drop policy if exists "public intelligence events read" on public.intel_project_events;
create policy "public intelligence events read" on public.intel_project_events for select to anon, authenticated using (true);

drop policy if exists "dcf admin sources write" on public.intel_sources;
create policy "dcf admin sources write" on public.intel_sources for all to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin());

drop policy if exists "dcf admin organizations write" on public.intel_organizations;
create policy "dcf admin organizations write" on public.intel_organizations for all to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin());

drop policy if exists "dcf admin participants write" on public.intel_project_participants;
create policy "dcf admin participants write" on public.intel_project_participants for all to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin());

drop policy if exists "dcf admin facts write" on public.intel_project_facts;
create policy "dcf admin facts write" on public.intel_project_facts for all to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin());

drop policy if exists "dcf admin events write" on public.intel_project_events;
create policy "dcf admin events write" on public.intel_project_events for all to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin());

drop trigger if exists intel_sources_set_updated_at on public.intel_sources;
create trigger intel_sources_set_updated_at before update on public.intel_sources for each row execute function public.set_updated_at();
drop trigger if exists intel_organizations_set_updated_at on public.intel_organizations;
create trigger intel_organizations_set_updated_at before update on public.intel_organizations for each row execute function public.set_updated_at();
drop trigger if exists intel_facts_set_updated_at on public.intel_project_facts;
create trigger intel_facts_set_updated_at before update on public.intel_project_facts for each row execute function public.set_updated_at();

-- Seed first high-value relationships from official primary sources.
insert into public.intel_sources (publisher,title,url,source_type,published_at,is_primary)
values
('Meta Data Centers','Deepening our investment in Richland Parish, Louisiana','https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/','official_company','2026-07-13',true),
('Meta Data Centers','Big things are happening, El Paso!','https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/','official_company','2026-03-26',true),
('OpenAI','Building the infrastructure for the Intelligence Age in Michigan','https://openai.com/index/stargate-michigan-data-center/','official_company','2026-06-01',true),
('OpenAI','Stargate Community','https://openai.com/index/stargate-community/','official_company','2026-01-20',true),
('OpenAI','OpenAI and SoftBank Group partner with SB Energy','https://openai.com/index/stargate-sb-energy-partnership/','official_company','2026-01-09',true)
on conflict (url) do update set publisher=excluded.publisher,title=excluded.title,published_at=excluded.published_at;

insert into public.intel_organizations (slug,name,org_type,website,is_verified)
values
('meta','Meta','operator','https://www.meta.com/',true),
('entergy-louisiana','Entergy Louisiana','utility','https://www.entergy-louisiana.com/',true),
('turner-construction','Turner Construction','general_contractor','https://www.turnerconstruction.com/',true),
('dpr-construction','DPR Construction','general_contractor','https://www.dpr.com/',true),
('je-dunn','JE Dunn Construction','general_contractor','https://www.jedunn.com/',true),
('hensel-phelps','Hensel Phelps','general_contractor','https://www.henselphelps.com/',true),
('openai','OpenAI','operator','https://openai.com/',true),
('oracle','Oracle','technology_partner','https://www.oracle.com/',true),
('related-digital','Related Digital','developer','https://related.com/',true),
('walbridge','Walbridge','construction_partner','https://www.walbridge.com/',true),
('dte-energy','DTE Energy','utility','https://www.dteenergy.com/',true),
('softbank-group','SoftBank Group','investor','https://group.softbank/en',true),
('sb-energy','SB Energy','developer_operator','https://www.sbenergy.com/',true)
on conflict (slug) do update set name=excluded.name,org_type=excluded.org_type,website=excluded.website,is_verified=excluded.is_verified;

with p as (select id from public.intel_projects where slug='meta-hyperion-richland-parish'),
s as (select id from public.intel_sources where url='https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/')
insert into public.intel_project_participants(project_id,organization_id,role,source_id,notes,last_verified_at)
select p.id,o.id,v.role,s.id,v.notes,'2026-09-30T03:30:00Z' from p,s cross join (values
('entergy-louisiana','utility','Energy partner; Meta says the agreement funds major generation, storage and grid resources.'),
('turner-construction','general_contractor','Named by Meta as a general contracting partner in Richland Parish.'),
('dpr-construction','general_contractor','Named by Meta as a general contracting partner in Richland Parish.')
) as v(slug,role,notes) join public.intel_organizations o on o.slug=v.slug
on conflict (project_id,organization_id,role) do update set source_id=excluded.source_id,notes=excluded.notes,last_verified_at=excluded.last_verified_at;

with p as (select id from public.intel_projects where slug='meta-el-paso-1gw'),
s as (select id from public.intel_sources where url='https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/')
insert into public.intel_project_participants(project_id,organization_id,role,source_id,notes,last_verified_at)
select p.id,o.id,v.role,s.id,v.notes,'2026-09-30T03:30:00Z' from p,s cross join (values
('je-dunn','general_contractor','Meta directs construction opportunities to JE Dunn.'),
('hensel-phelps','general_contractor','Meta directs construction opportunities to Hensel Phelps.')
) as v(slug,role,notes) join public.intel_organizations o on o.slug=v.slug
on conflict (project_id,organization_id,role) do update set source_id=excluded.source_id,notes=excluded.notes,last_verified_at=excluded.last_verified_at;

with p as (select id from public.intel_projects where slug='openai-the-barn-saline-michigan'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-michigan-data-center/')
insert into public.intel_project_participants(project_id,organization_id,role,source_id,notes,last_verified_at)
select p.id,o.id,v.role,s.id,v.notes,'2026-09-30T03:30:00Z' from p,s cross join (values
('oracle','technology_partner','Named by OpenAI as a project partner.'),
('related-digital','developer','Named by OpenAI as a project partner and developer.'),
('walbridge','construction_partner','Named by OpenAI as a project partner at groundbreaking.')
) as v(slug,role,notes) join public.intel_organizations o on o.slug=v.slug
on conflict (project_id,organization_id,role) do update set source_id=excluded.source_id,notes=excluded.notes,last_verified_at=excluded.last_verified_at;

with p as (select id from public.intel_projects where slug='openai-the-barn-saline-michigan'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-community/')
insert into public.intel_project_participants(project_id,organization_id,role,source_id,notes,last_verified_at)
select p.id,o.id,'utility',s.id,'DTE Energy is identified by OpenAI as the power supplier for the Michigan Stargate project.','2026-09-30T03:30:00Z'
from p,s join public.intel_organizations o on o.slug='dte-energy'
on conflict (project_id,organization_id,role) do update set source_id=excluded.source_id,notes=excluded.notes,last_verified_at=excluded.last_verified_at;

with p as (select id from public.intel_projects where slug='openai-stargate-milam-county-1-2gw'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-sb-energy-partnership/')
insert into public.intel_project_participants(project_id,organization_id,role,source_id,notes,last_verified_at)
select p.id,o.id,v.role,s.id,v.notes,'2026-09-30T03:30:00Z' from p,s cross join (values
('sb-energy','developer_operator','Selected by OpenAI to build and operate the 1.2 GW site.'),
('softbank-group','investor','SoftBank Group and OpenAI each announced a $500M investment into SB Energy.')
) as v(slug,role,notes) join public.intel_organizations o on o.slug=v.slug
on conflict (project_id,organization_id,role) do update set source_id=excluded.source_id,notes=excluded.notes,last_verified_at=excluded.last_verified_at;

-- Queryable project facts.
with p as (select id from public.intel_projects where slug='meta-hyperion-richland-parish'),
s as (select id from public.intel_sources where url='https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/')
insert into public.intel_project_facts(project_id,category,fact_key,text_value,number_value,unit,source_id,effective_at)
select p.id,v.category,v.fact_key,v.text_value,v.number_value,v.unit,s.id,'2026-07-13'::timestamptz
from p,s cross join (values
('power','generation_plan','Seven new natural-gas generating plants plus nuclear uprates and purchased power',null,null),
('power','grid_batteries','Three grid-scale batteries',3,'count'),
('power','clean_energy_support','Meta committed to help fund generation of up to 2.5 GW of clean and renewable energy',2500,'MW'),
('commercial','local_contracting','Meta reported more than $1.6B contracted with Louisiana businesses',1600000000,'USD')
) as v(category,fact_key,text_value,number_value,unit);

with p as (select id from public.intel_projects where slug='openai-the-barn-saline-michigan'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-community/')
insert into public.intel_project_facts(project_id,category,fact_key,text_value,number_value,unit,source_id,effective_at)
select p.id,v.category,v.fact_key,v.text_value,v.number_value,v.unit,s.id,'2026-01-20'::timestamptz
from p,s cross join (values
('power','utility','DTE Energy',null,null),
('power','supply_plan','Existing resources augmented by new project-financed battery storage',null,null)
) as v(category,fact_key,text_value,number_value,unit);

with p as (select id from public.intel_projects where slug='openai-the-barn-saline-michigan'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-michigan-data-center/')
insert into public.intel_project_facts(project_id,category,fact_key,text_value,number_value,unit,source_id,effective_at)
select p.id,'cooling','cooling_system','Closed-loop cooling system',null,null,s.id,'2026-06-01'::timestamptz from p,s;

with p as (select id from public.intel_projects where slug='openai-stargate-milam-county-1-2gw'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-community/')
insert into public.intel_project_facts(project_id,category,fact_key,text_value,number_value,unit,source_id,effective_at)
select p.id,'power','supply_plan','SB Energy plans new generation and storage to supply the majority of campus power',null,null,s.id,'2026-01-20'::timestamptz from p,s;

-- First timeline events.
with p as (select id from public.intel_projects where slug='meta-hyperion-richland-parish'),
s as (select id from public.intel_sources where url='https://datacenters.atmeta.com/2026/07/deepening-our-investment-in-richland-parish-louisiana/')
insert into public.intel_project_events(project_id,event_type,event_date,headline,summary,materiality,source_id,new_state)
select p.id,'capacity_expansion','2026-07-13','Meta expands Richland Parish to 5 GW','Meta said the Richland Parish campus will expand to 5 GW of compute capacity with investment exceeding $50B.','high',s.id,'{"announced_capacity_mw":5000,"investment_label":"$50B+"}'::jsonb from p,s;

with p as (select id from public.intel_projects where slug='meta-el-paso-1gw'),
s as (select id from public.intel_sources where url='https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/')
insert into public.intel_project_events(project_id,event_type,event_date,headline,summary,materiality,source_id,new_state)
select p.id,'capacity_expansion','2026-03-26','Meta confirms El Paso will grow to 1 GW','Meta increased planned investment to more than $10B and confirmed a 1 GW buildout.','high',s.id,'{"announced_capacity_mw":1000,"investment_label":"$10B+"}'::jsonb from p,s;

with p as (select id from public.intel_projects where slug='openai-the-barn-saline-michigan'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-michigan-data-center/')
insert into public.intel_project_events(project_id,event_type,event_date,headline,summary,materiality,source_id,new_state)
select p.id,'construction','2026-06-01','The Barn breaks ground','OpenAI and partners broke ground on the 1 GW Saline, Michigan campus.','high',s.id,'{"stage":"Under construction","announced_capacity_mw":1000}'::jsonb from p,s;

with p as (select id from public.intel_projects where slug='openai-stargate-milam-county-1-2gw'),
s as (select id from public.intel_sources where url='https://openai.com/index/stargate-sb-energy-partnership/')
insert into public.intel_project_events(project_id,event_type,event_date,headline,summary,materiality,source_id,new_state)
select p.id,'partner','2026-01-09','SB Energy selected to build and operate Milam County','OpenAI said SB Energy will build and operate the 1.2 GW Milam County Stargate site.','high',s.id,'{"developer_operator":"SB Energy","announced_capacity_mw":1200}'::jsonb from p,s;

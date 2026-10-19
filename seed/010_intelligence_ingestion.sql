-- DataCenter.forum scalable intelligence ingestion v1
-- Run after seed/009_google_source_date.sql.
-- Operational ingestion remains private; only verified public events are readable by public roles.

begin;

alter table public.intel_sources
  add column if not exists authority_tier smallint not null default 1 check (authority_tier between 1 and 4),
  add column if not exists jurisdiction text,
  add column if not exists company_hint text,
  add column if not exists market_hint text,
  add column if not exists project_hint text,
  add column if not exists refresh_class text not null default 'daily' check (refresh_class in ('rapid','standard','daily','weekly')),
  add column if not exists enabled boolean not null default true,
  add column if not exists next_due_at timestamptz not null default now(),
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  add column if not exists pause_reason text;

create index if not exists intel_sources_enabled_next_due_idx
  on public.intel_sources(enabled, next_due_at);
create index if not exists intel_sources_type_authority_idx
  on public.intel_sources(source_type, authority_tier);

-- Keep source provenance readable without exposing operational scheduler/failure columns.
revoke select on table public.intel_sources from anon, authenticated;
grant select (
  id, publisher, title, url, source_type, published_at, is_primary, metadata,
  authority_tier, jurisdiction, company_hint, market_hint, project_hint
) on table public.intel_sources to anon, authenticated;
grant all on table public.intel_sources to service_role;

create table if not exists public.intel_source_fetches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.intel_sources(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  final_url text not null,
  http_status integer,
  content_hash text,
  extraction_version text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  state text not null check (state in ('success','unchanged','fetch_error','extract_error','storage_error','db_error')),
  error_class text,
  error_message text,
  snapshot_object_path text,
  response_byte_size integer check (response_byte_size is null or response_byte_size >= 0),
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists intel_source_fetches_source_time_idx
  on public.intel_source_fetches(source_id, fetched_at desc);
create index if not exists intel_source_fetches_hash_idx
  on public.intel_source_fetches(content_hash) where content_hash is not null;

create table if not exists public.intel_raw_observations (
  id uuid primary key default gen_random_uuid(),
  observation_key text not null unique,
  source_id uuid not null references public.intel_sources(id) on delete cascade,
  fetch_id uuid not null references public.intel_source_fetches(id) on delete cascade,
  observed_at timestamptz not null,
  published_at timestamptz,
  observation_type text not null,
  subject_text text not null,
  predicate text not null,
  value_json jsonb not null default '{}'::jsonb,
  quote_or_excerpt text,
  source_url text not null,
  extraction_confidence numeric(4,3) not null default 1.000 check (extraction_confidence between 0 and 1),
  extractor_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists intel_observations_source_time_idx
  on public.intel_raw_observations(source_id, observed_at desc);
create index if not exists intel_observations_predicate_idx
  on public.intel_raw_observations(predicate);

create table if not exists public.intel_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  canonical_name text not null,
  canonical_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, canonical_key)
);

create index if not exists intel_entities_type_name_idx
  on public.intel_entities(entity_type, canonical_name);

create table if not exists public.intel_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.intel_entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  source_id uuid references public.intel_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(entity_id, normalized_alias)
);

create index if not exists intel_entity_aliases_normalized_idx
  on public.intel_entity_aliases(normalized_alias);

create table if not exists public.intel_observation_links (
  observation_id uuid not null references public.intel_raw_observations(id) on delete cascade,
  entity_id uuid not null references public.intel_entities(id) on delete cascade,
  relation_type text not null default 'subject',
  match_method text not null check (match_method in ('registry_hint','exact_alias','normalized_key','fuzzy','manual')),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (observation_id, entity_id, relation_type)
);

create index if not exists intel_observation_links_entity_idx
  on public.intel_observation_links(entity_id, is_resolved);

create table if not exists public.intel_claims (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references public.intel_entities(id) on delete cascade,
  project_id uuid references public.intel_projects(id) on delete set null,
  claim_type text not null,
  normalized_value jsonb not null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','single_source','corroborated','verified','conflicting','stale','rejected')),
  materiality text not null default 'medium'
    check (materiality in ('critical','high','medium','low')),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  last_verified_at timestamptz,
  is_current boolean not null default true,
  is_conflicting boolean not null default false,
  manual_verified_by uuid references auth.users(id) on delete set null,
  manual_verified_at timestamptz,
  manual_verification_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intel_claims_subject_type_idx
  on public.intel_claims(subject_entity_id, claim_type, is_current);
create index if not exists intel_claims_verification_idx
  on public.intel_claims(verification_status, last_verified_at desc);

create table if not exists public.intel_claim_evidence (
  claim_id uuid not null references public.intel_claims(id) on delete cascade,
  observation_id uuid not null references public.intel_raw_observations(id) on delete cascade,
  relation text not null check (relation in ('supports','contradicts','supersedes')),
  created_at timestamptz not null default now(),
  primary key (claim_id, observation_id)
);

create index if not exists intel_claim_evidence_observation_idx
  on public.intel_claim_evidence(observation_id);

create table if not exists public.intel_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  headline text not null,
  summary text not null,
  materiality text not null default 'medium'
    check (materiality in ('critical','high','medium','low')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','single_source','corroborated','verified','conflicting','stale','rejected')),
  project_id uuid references public.intel_projects(id) on delete set null,
  company_id uuid references public.intel_organizations(id) on delete set null,
  market text,
  region text,
  occurred_at timestamptz,
  published_at timestamptz,
  verified_at timestamptz,
  primary_source_id uuid references public.intel_sources(id) on delete set null,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intel_events_project_verified_idx
  on public.intel_events(project_id, verified_at desc);
create index if not exists intel_events_public_verified_idx
  on public.intel_events(verification_status, is_public, materiality, verified_at desc);
create index if not exists intel_events_type_verified_idx
  on public.intel_events(event_type, verified_at desc);

-- All exposed-schema tables use RLS. Raw operational tables receive no anon/authenticated grants.
alter table public.intel_source_fetches enable row level security;
alter table public.intel_raw_observations enable row level security;
alter table public.intel_entities enable row level security;
alter table public.intel_entity_aliases enable row level security;
alter table public.intel_observation_links enable row level security;
alter table public.intel_claims enable row level security;
alter table public.intel_claim_evidence enable row level security;
alter table public.intel_events enable row level security;

revoke all on table public.intel_source_fetches from anon, authenticated;
revoke all on table public.intel_raw_observations from anon, authenticated;
revoke all on table public.intel_entities from anon, authenticated;
revoke all on table public.intel_entity_aliases from anon, authenticated;
revoke all on table public.intel_observation_links from anon, authenticated;
revoke all on table public.intel_claims from anon, authenticated;
revoke all on table public.intel_claim_evidence from anon, authenticated;
revoke all on table public.intel_events from anon, authenticated;

grant all on table public.intel_source_fetches to service_role;
grant all on table public.intel_raw_observations to service_role;
grant all on table public.intel_entities to service_role;
grant all on table public.intel_entity_aliases to service_role;
grant all on table public.intel_observation_links to service_role;
grant all on table public.intel_claims to service_role;
grant all on table public.intel_claim_evidence to service_role;
grant all on table public.intel_events to service_role;

grant select on table public.intel_events to anon, authenticated;

drop policy if exists "verified public intelligence events read" on public.intel_events;
create policy "verified public intelligence events read"
on public.intel_events
for select
to anon, authenticated
using (verification_status = 'verified' and is_public = true);

-- Private raw snapshot storage. Service-role requests bypass Storage RLS;
-- no anon/authenticated storage.objects policy is created for this bucket.
insert into storage.buckets (id, name, public, file_size_limit)
values ('intel-source-snapshots', 'intel-source-snapshots', false, 5242880)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

-- Maintain updated_at on mutable intelligence records.
drop trigger if exists intel_entities_set_updated_at on public.intel_entities;
create trigger intel_entities_set_updated_at
before update on public.intel_entities
for each row execute function public.set_updated_at();

drop trigger if exists intel_claims_set_updated_at on public.intel_claims;
create trigger intel_claims_set_updated_at
before update on public.intel_claims
for each row execute function public.set_updated_at();

drop trigger if exists intel_events_set_updated_at on public.intel_events;
create trigger intel_events_set_updated_at
before update on public.intel_events
for each row execute function public.set_updated_at();

commit;

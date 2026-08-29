-- Commercial intake tables kept separate from public listings.

create table if not exists public.job_posting_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  title text not null,
  location text,
  employer_type text,
  compensation text,
  apply_url text,
  description text not null,
  requested_plan text not null default 'standard' check (requested_plan in ('standard','featured','unlimited')),
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_submissions (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  buyer_email text not null,
  buyer_company text,
  title text not null,
  category text not null,
  region text,
  timeline text,
  need text not null,
  consent_to_matching boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.job_posting_requests enable row level security;
alter table public.opportunity_submissions enable row level security;

drop policy if exists "submit job posting request" on public.job_posting_requests;
create policy "submit job posting request" on public.job_posting_requests for insert to anon, authenticated with check (char_length(contact_email) between 5 and 320 and char_length(description) between 20 and 10000);

drop policy if exists "submit opportunity" on public.opportunity_submissions;
create policy "submit opportunity" on public.opportunity_submissions for insert to anon, authenticated with check (consent_to_matching=true and char_length(buyer_email) between 5 and 320 and char_length(need) between 20 and 10000);

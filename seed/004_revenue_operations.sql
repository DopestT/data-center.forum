-- DataCenter.forum revenue operations layer
-- Run after seed/003_monetization.sql.

create or replace function public.is_dcf_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role in ('moderator','admin')
  );
$$;

alter table public.vendor_applications
  add column if not exists status text not null default 'new',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

do $$ begin
  alter table public.vendor_applications
    add constraint vendor_applications_status_check
    check (status in ('new','contacted','approved','rejected','closed'));
exception when duplicate_object then null; end $$;

alter table public.sponsorship_inquiries
  add column if not exists status text not null default 'new',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

do $$ begin
  alter table public.sponsorship_inquiries
    add constraint sponsorship_inquiries_status_check
    check (status in ('new','contacted','proposal','won','lost','closed'));
exception when duplicate_object then null; end $$;

create table if not exists public.job_posting_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  title text not null,
  location text,
  compensation text,
  apply_url text,
  description text not null,
  requested_plan text not null default 'standard' check (requested_plan in ('standard','featured','unlimited')),
  status text not null default 'new' check (status in ('new','contacted','approved','rejected','published','closed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
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
  status text not null default 'new' check (status in ('new','qualified','matched','rejected','closed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.vendor_verifications (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  check_type text not null check (check_type in ('website','domain_email','business_record','reference','manual')),
  status text not null default 'pending' check (status in ('pending','passed','failed')),
  notes text,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsored_content (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null,
  placement text not null,
  headline text not null,
  body text,
  target_url text,
  disclosure_label text not null default 'Sponsored',
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_posting_requests_status_idx on public.job_posting_requests(status,created_at desc);
create index if not exists opportunity_submissions_status_idx on public.opportunity_submissions(status,created_at desc);
create index if not exists vendor_verifications_vendor_idx on public.vendor_verifications(vendor_id,created_at desc);
create index if not exists sponsored_content_status_dates_idx on public.sponsored_content(status,starts_at,ends_at);

alter table public.job_posting_requests enable row level security;
alter table public.opportunity_submissions enable row level security;
alter table public.vendor_verifications enable row level security;
alter table public.sponsored_content enable row level security;

drop policy if exists "submit job request" on public.job_posting_requests;
create policy "submit job request" on public.job_posting_requests
for insert to anon, authenticated
with check (
  char_length(contact_email) between 5 and 320
  and char_length(title) between 3 and 180
  and char_length(description) between 20 and 10000
);

drop policy if exists "submit opportunity" on public.opportunity_submissions;
create policy "submit opportunity" on public.opportunity_submissions
for insert to anon, authenticated
with check (
  consent_to_matching = true
  and char_length(buyer_email) between 5 and 320
  and char_length(need) between 20 and 10000
);

drop policy if exists "active sponsored content public read" on public.sponsored_content;
create policy "active sponsored content public read" on public.sponsored_content
for select
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

-- Admin/private read and write policies. Public users can submit but cannot read
-- application, lead, inquiry, verification or opportunity-contact records back.

do $$
declare t text;
begin
  foreach t in array array[
    'vendors','vendor_applications','vendor_leads','jobs','opportunities',
    'sponsorship_inquiries','job_posting_requests','opportunity_submissions',
    'vendor_verifications','sponsored_content'
  ] loop
    execute format('drop policy if exists "dcf admin read" on public.%I', t);
    execute format('create policy "dcf admin read" on public.%I for select to authenticated using (public.is_dcf_admin())', t);
    execute format('drop policy if exists "dcf admin insert" on public.%I', t);
    execute format('create policy "dcf admin insert" on public.%I for insert to authenticated with check (public.is_dcf_admin())', t);
    execute format('drop policy if exists "dcf admin update" on public.%I', t);
    execute format('create policy "dcf admin update" on public.%I for update to authenticated using (public.is_dcf_admin()) with check (public.is_dcf_admin())', t);
    execute format('drop policy if exists "dcf admin delete" on public.%I', t);
    execute format('create policy "dcf admin delete" on public.%I for delete to authenticated using (public.is_dcf_admin())', t);
  end loop;
end $$;

-- Keep sponsored content timestamps current.
drop trigger if exists sponsored_content_set_updated_at on public.sponsored_content;
create trigger sponsored_content_set_updated_at
before update on public.sponsored_content
for each row execute function public.set_updated_at();

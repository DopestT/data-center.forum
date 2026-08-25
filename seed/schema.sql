-- DataCenter.forum MVP schema
-- Run in the Supabase SQL editor on a new project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.forum_role as enum ('member','expert','moderator','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.thread_status as enum ('open','locked','hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reaction_kind as enum ('useful','agree','insightful');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  username text,
  display_name text not null,
  bio text,
  avatar_url text,
  company text,
  job_title text,
  location text,
  role public.forum_role not null default 'member',
  reputation integer not null default 0,
  is_verified boolean not null default false,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$')
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  author_profile_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 8 and 180),
  slug text not null unique,
  body text not null check (char_length(body) between 1 and 40000),
  status public.thread_status not null default 'open',
  is_seed boolean not null default false,
  is_pinned boolean not null default false,
  is_featured boolean not null default false,
  view_count integer not null default 0,
  reply_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_category_activity_idx on public.threads(category_id,last_activity_at desc);
create index if not exists threads_activity_idx on public.threads(last_activity_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 20000),
  is_solution boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_thread_created_idx on public.posts(thread_id,created_at);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  unique(post_id,profile_id,kind)
);

create table if not exists public.bookmarks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(profile_id,thread_id)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists threads_set_updated_at on public.threads;
create trigger threads_set_updated_at before update on public.threads for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();

create or replace function public.refresh_thread_after_post() returns trigger language plpgsql security definer set search_path=public as $$
declare target_thread uuid;
begin
  target_thread := coalesce(new.thread_id, old.thread_id);
  update public.threads t set
    reply_count = (select count(*) from public.posts p where p.thread_id = target_thread),
    last_activity_at = greatest(t.created_at, coalesce((select max(created_at) from public.posts p where p.thread_id = target_thread), t.created_at))
  where t.id = target_thread;
  return coalesce(new,old);
end $$;

drop trigger if exists posts_refresh_thread on public.posts;
create trigger posts_refresh_thread after insert or update or delete on public.posts for each row execute function public.refresh_thread_after_post();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "public profiles read" on public.profiles;
create policy "public profiles read" on public.profiles for select using (true);
drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "active categories read" on public.categories;
create policy "active categories read" on public.categories for select using (is_active = true);

drop policy if exists "public threads read" on public.threads;
create policy "public threads read" on public.threads for select using (status in ('open','locked'));
drop policy if exists "members create threads" on public.threads;
create policy "members create threads" on public.threads for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=author_profile_id and p.user_id=auth.uid()));
drop policy if exists "authors update threads" on public.threads;
create policy "authors update threads" on public.threads for update to authenticated using (exists(select 1 from public.profiles p where p.id=author_profile_id and p.user_id=auth.uid()) or exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('moderator','admin')));

drop policy if exists "public posts read" on public.posts;
create policy "public posts read" on public.posts for select using (exists(select 1 from public.threads t where t.id=thread_id and t.status in ('open','locked')));
drop policy if exists "members create posts" on public.posts;
create policy "members create posts" on public.posts for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=author_profile_id and p.user_id=auth.uid()) and exists(select 1 from public.threads t where t.id=thread_id and t.status='open'));
drop policy if exists "authors update posts" on public.posts;
create policy "authors update posts" on public.posts for update to authenticated using (exists(select 1 from public.profiles p where p.id=author_profile_id and p.user_id=auth.uid()) or exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role in ('moderator','admin')));

drop policy if exists "public reactions read" on public.reactions;
create policy "public reactions read" on public.reactions for select using (true);
drop policy if exists "members react" on public.reactions;
create policy "members react" on public.reactions for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));
drop policy if exists "members remove reaction" on public.reactions;
create policy "members remove reaction" on public.reactions for delete to authenticated using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));

drop policy if exists "members manage bookmarks" on public.bookmarks;
create policy "members manage bookmarks" on public.bookmarks for all to authenticated using (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists(select 1 from public.profiles p where p.id=profile_id and p.user_id=auth.uid()));

insert into public.categories(slug,name,description,sort_order) values
('power-grid','Power & Grid','Interconnection, utilities, generation, storage and PPAs.',10),
('development','Development','Sites, land, zoning, incentives, permits and project pipelines.',20),
('construction','Construction','EPC, equipment, commissioning, cooling and delivery.',30),
('operations','Operations','Reliability, staffing, maintenance, efficiency and incidents.',40),
('ai-infrastructure','AI Infrastructure','GPU clusters, high density, liquid cooling and next-gen capacity.',50),
('deals-finance','Deals & Finance','M&A, capital markets, leases, valuations and economics.',60),
('policy-communities','Policy & Communities','Regulation, taxes, water, politics and community impact.',70),
('jobs-vendors','Jobs & Vendors','Careers, hiring, contractors, suppliers and services.',80)
on conflict(slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order;

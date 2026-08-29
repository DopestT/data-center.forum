-- DataCenter.forum seed-pack alignment
-- Run after seed/schema.sql.

alter table public.threads
  add column if not exists tags text[] not null default '{}'::text[];

-- Supabase upsert(onConflict: 'username') requires an actual unique constraint,
-- not only the case-normalizing partial index created in schema.sql.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_unique'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_unique unique (username);
  end if;
end $$;

create index if not exists threads_tags_gin_idx
  on public.threads using gin(tags);

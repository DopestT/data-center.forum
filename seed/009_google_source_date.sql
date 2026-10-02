-- Narrow correction only. Do not imply a new construction-status verification.
begin;
update public.intel_projects
set source_published_at = '2024-04-26'
where slug = 'google-fort-wayne-indiana'
  and source_url = 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/google-data-centers-ai-skills-investments/'
  and source_published_at is null;
commit;

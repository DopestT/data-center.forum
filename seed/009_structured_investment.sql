-- Structured investment fields for analytics and exports.
-- Apply after seed/008_intelligence_graph.sql.

alter table public.intel_projects
  add column if not exists investment_usd numeric(18,2),
  add column if not exists investment_basis text,
  add column if not exists investment_scope text;

update public.intel_projects set investment_usd=50000000000, investment_basis='minimum', investment_scope='project' where slug='meta-hyperion-richland-parish';
update public.intel_projects set investment_usd=15000000000, investment_basis='stated', investment_scope='multi_site_program' where slug='amazon-northern-indiana-2-4gw';
update public.intel_projects set investment_usd=10000000000, investment_basis='minimum', investment_scope='project' where slug='meta-el-paso-1gw';
update public.intel_projects set investment_usd=1000000000, investment_basis='minimum', investment_scope='project' where slug='meta-beaver-dam-wisconsin';
update public.intel_projects set investment_usd=4700000000, investment_basis='local_spend_estimate', investment_scope='regional_program' where slug='microsoft-fairwater-mount-pleasant';
update public.intel_projects set investment_usd=10000000000, investment_basis='stated', investment_scope='multi_site_program' where slug='aws-madison-county-mississippi';
update public.intel_projects set investment_usd=20000000000, investment_basis='minimum', investment_scope='state_program' where slug='aws-pennsylvania-ai-campuses';
update public.intel_projects set investment_usd=11000000000, investment_basis='estimated', investment_scope='multi_site_program' where slug='aws-butts-douglas-georgia';
update public.intel_projects set investment_usd=10000000000, investment_basis='stated', investment_scope='county_program' where slug='aws-richmond-county-north-carolina';
update public.intel_projects set investment_usd=2000000000, investment_basis='stated', investment_scope='project' where slug='google-fort-wayne-indiana';
update public.intel_projects set investment_usd=1200000000, investment_basis='minimum', investment_scope='project' where slug='meta-temple-texas';
update public.intel_projects set investment_usd=3000000000, investment_basis='minimum', investment_scope='cumulative_site_investment' where slug='meta-eagle-mountain-utah';
update public.intel_projects set investment_usd=5000000000, investment_basis='estimated', investment_scope='county_program' where slug='aws-fayette-county-ohio';

create index if not exists intel_projects_investment_idx on public.intel_projects(investment_usd desc);

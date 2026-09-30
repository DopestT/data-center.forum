-- Expand DataCenter.forum launch intelligence records.
-- Run after seed/006_intelligence_database.sql.

insert into public.intel_projects (
  slug,name,company,market,region,country,stage,announced_capacity_mw,investment_label,
  summary,source_name,source_url,source_published_at,last_verified_at,featured,is_public
) values
(
  'meta-el-paso-1gw','El Paso Data Center','Meta','El Paso','El Paso, Texas','United States',
  'Under construction',1000,'$10B+',
  'Meta confirmed its El Paso data center will grow to 1 GW, with total planned investment increased to more than $10 billion.',
  'Meta Data Centers','https://datacenters.atmeta.com/2026/03/big-things-are-happening-el-paso/','2026-03-26','2026-09-30T03:28:00Z',true,true
),
(
  'meta-beaver-dam-wisconsin','Beaver Dam Data Center','Meta','Wisconsin','Beaver Dam, Wisconsin','United States',
  'Under construction',null,'$1B+',
  'Meta''s AI-optimized Beaver Dam campus spans more than 700,000 square feet and represents an investment of more than $1 billion.',
  'Meta Data Centers','https://datacenters.atmeta.com/2025/11/hello-beaver-dam/','2025-11-12','2026-09-30T03:28:00Z',false,true
),
(
  'microsoft-fairwater-mount-pleasant','Fairwater / Mount Pleasant Datacenter Campus','Microsoft','Southeast Wisconsin','Mount Pleasant, Wisconsin','United States',
  'Operational / expanding',null,'$4.7B local spend est. 2024–2028',
  'Microsoft''s first Mount Pleasant facility is fully operational, with the company continuing a multi-year hyperscale construction program in Southeast Wisconsin.',
  'Microsoft','https://news.microsoft.com/source/2026/06/23/microsoft-completes-construction-on-first-datacenter-facility-in-mount-pleasant-wisconsin/','2026-06-23','2026-09-30T03:28:00Z',true,true
),
(
  'aws-madison-county-mississippi','Madison County Data Center Complexes','Amazon Web Services','Central Mississippi','Madison County, Mississippi','United States',
  'Announced / development',null,'$10B',
  'AWS plans two data center complexes in Madison County industrial parks as part of a $10 billion Mississippi investment.',
  'Amazon Web Services','https://www.aboutamazon.com/news/aws/aws-10-billion-investment-mississippi',null,'2026-09-30T03:28:00Z',false,true
),
(
  'aws-pennsylvania-ai-campuses','Pennsylvania AI Infrastructure Campuses','Amazon Web Services','Pennsylvania','Salem Township & Falls Township, Pennsylvania','United States',
  'Announced / development',null,'$20B+',
  'AWS identified Salem Township and Falls Township as the first sites in an investment of at least $20 billion in Pennsylvania data center infrastructure.',
  'Amazon Web Services','https://www.aboutamazon.com/news/aws/amazon-pennsylvania-investment-cloud-infrastructure-ai-innovation','2025-06-09','2026-09-30T03:28:00Z',true,true
),
(
  'aws-butts-douglas-georgia','Georgia AI & Cloud Data Center Expansion','Amazon Web Services','Metro Atlanta / Central Georgia','Butts & Douglas Counties, Georgia','United States',
  'Announced / development',null,'$11B',
  'AWS plans an estimated $11 billion infrastructure expansion across Butts and Douglas counties to support AI and cloud computing.',
  'Amazon Web Services','https://www.aboutamazon.com/news/aws/aws-investment-georgia-ai-cloud-infrastructure',null,'2026-09-30T03:28:00Z',false,true
),
(
  'aws-richmond-county-north-carolina','Richmond County Data Center Infrastructure','Amazon Web Services','North Carolina','Richmond County, North Carolina','United States',
  'Announced / development',null,'$10B',
  'AWS announced a $10 billion investment in Richmond County data center infrastructure to support AI and cloud computing.',
  'Amazon Web Services','https://www.aboutamazon.com/news/aws/aws-investment-north-carolina-ai-cloud-infrastructure','2025-06-04','2026-09-30T03:28:00Z',false,true
),
(
  'google-fort-wayne-indiana','Fort Wayne Data Center Campus','Google','Northeast Indiana','Fort Wayne, Indiana','United States',
  'Announced / development',null,'$2B',
  'Google announced a $2 billion investment in a new Fort Wayne data center campus as part of expanded U.S. cloud and AI infrastructure.',
  'Google','https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/google-data-centers-ai-skills-investments/',null,'2026-09-30T03:28:00Z',false,true
),
(
  'openai-stargate-milam-county-1-2gw','Stargate Milam County','OpenAI / SoftBank / SB Energy','Central Texas','Milam County, Texas','United States',
  'Under construction',1200,null,
  'OpenAI selected SB Energy to build and operate the previously announced 1.2 GW Stargate data center site in Milam County.',
  'OpenAI','https://openai.com/index/stargate-sb-energy-partnership/','2026-01-09','2026-09-30T03:28:00Z',true,true
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

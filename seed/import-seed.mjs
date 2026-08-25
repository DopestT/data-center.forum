import { createClient } from '@supabase/supabase-js';

const dry = process.argv.includes('--dry');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dry && (!url || !serviceKey)) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const categories = ['power-grid','development','construction','operations','ai-infrastructure','deals-finance','policy-communities','jobs-vendors'];
const authors = [
  ['GridWatcher','Grid Watcher','Power markets and interconnection'],
  ['SiteStack','Site Stack','Development and site selection'],
  ['BuildCritical','Build Critical','Construction and commissioning'],
  ['ThermalOps','Thermal Ops','Cooling and operations'],
  ['CapRateDC','Cap Rate DC','Infrastructure finance'],
  ['CivicInfra','Civic Infra','Policy and communities']
];
const titles = [
  'What is actually moving interconnection timelines in 2026?',
  'Transformer lead times: what are buyers seeing this quarter?',
  'Behind-the-meter generation: bridge strategy or permanent architecture?',
  'Which utilities are handling large-load requests best right now?',
  'How are developers pricing grid-upgrade uncertainty into land?',
  'Virginia, Texas, Ohio: where are land assumptions breaking first?',
  'What belongs in a serious powered-land diligence checklist?',
  'Are local incentive packages becoming less important than power certainty?',
  'How early are communities asking for water and tax-impact models?',
  'What is the cleanest way to compare two competing hyperscale sites?',
  'Commissioning bottlenecks nobody budgets enough time for',
  'Generator procurement: what has improved and what has not?',
  'Are EPC contracts shifting more schedule risk back to owners?',
  'Busway versus cable at higher rack densities: where are teams landing?',
  'What equipment should owners dual-source before design is fully frozen?',
  'How are operators staffing campuses faster than the local talent pool grows?',
  'Which reliability metrics belong on an operator scorecard?',
  'What usually causes the first six months of operational pain?',
  'Is PUE still useful when water and compute density change this fast?',
  'What maintenance work is most often deferred until it becomes expensive?',
  '120 kW racks: what is ready today versus still a roadmap?',
  'Liquid cooling retrofits: where do brownfield economics stop working?',
  'What does a credible 250 kW rack roadmap require upstream?',
  'How much mechanical redundancy is changing for AI halls?',
  'Are GPU cluster requirements shortening useful building life?',
  'Are powered-shell valuations still disconnected from delivery risk?',
  'What are lenders demanding before they underwrite speculative capacity?',
  'How should buyers discount projects with uncertain energization dates?',
  'Are lease structures changing because compute hardware cycles are shorter?',
  'Which operating metrics matter most during data-center diligence?',
  "How should developers answer the 'who pays for the grid' question?",
  'What community-benefit commitments are actually improving approvals?',
  'Water disclosure: what should become standard before regulators require it?',
  'Which policy changes would materially improve project transparency?',
  'What data-center jobs are hardest to fill in secondary markets?',
  'Vendor thread: who is genuinely delivering on promised lead times?'
];

function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110); }
function categoryFor(i) { return categories[Math.floor(i / Math.ceil(titles.length/categories.length)) % categories.length]; }
function timestampFor(i) {
  const day = Math.floor(i/8);
  const slot = i%8;
  const base = new Date('2026-08-17T13:15:00.000Z');
  base.setUTCDate(base.getUTCDate()+day);
  base.setUTCMinutes(base.getUTCMinutes()+slot*55);
  return base.toISOString();
}

const preview = titles.map((title,i)=>({category:categoryFor(i),author:authors[i%authors.length][0],title,created_at:timestampFor(i)}));
if (dry) { console.table(preview); process.exit(0); }

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: categoryRows, error: categoryError } = await supabase.from('categories').select('id,slug');
if (categoryError) throw categoryError;
const categoryMap = new Map(categoryRows.map(row=>[row.slug,row.id]));

const profileRows = authors.map(([username,display_name,bio])=>({ username,display_name,bio,is_staff:true,is_verified:true,role:'expert' }));
for (const profile of profileRows) {
  const { error } = await supabase.from('profiles').upsert(profile,{onConflict:'username',ignoreDuplicates:false});
  if (error) throw error;
}
const { data: savedProfiles, error: profileError } = await supabase.from('profiles').select('id,username').in('username',authors.map(a=>a[0]));
if (profileError) throw profileError;
const profileMap = new Map(savedProfiles.map(row=>[row.username,row.id]));

for (let i=0;i<titles.length;i++) {
  const title=titles[i];
  const created_at=timestampFor(i);
  const category=categoryFor(i);
  const username=authors[i%authors.length][0];
  const row={
    category_id:categoryMap.get(category),
    author_profile_id:profileMap.get(username),
    title,
    slug:`seed-${String(i+1).padStart(2,'0')}-${slugify(title)}`,
    body:`Industry starter discussion: ${title} Share current numbers, named constraints, source links and firsthand experience where possible.`,
    status:'open',is_seed:true,is_featured:i<6,created_at,updated_at:created_at,last_activity_at:created_at
  };
  const { error } = await supabase.from('threads').upsert(row,{onConflict:'slug'});
  if (error) throw error;
}
console.log(`Seed complete: ${authors.length} house profiles and ${titles.length} threads.`);

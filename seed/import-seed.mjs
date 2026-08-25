import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const dry = process.argv.includes('--dry');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const packUrl = new URL('./seed-pack.json', import.meta.url);
const pack = JSON.parse(await fs.readFile(packUrl, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(`Seed validation failed: ${message}`);
}

assert(pack?.meta?.site === 'datacenter.forum', 'wrong site');
assert(pack?.meta?.thread_count === pack.threads.length, 'thread_count does not match threads array');
assert(pack.house_accounts.length === 3, 'expected exactly 3 STAFF house accounts');
assert(pack.house_accounts.every((a) => a.is_staff === true), 'all house accounts must be labeled STAFF');
assert(pack.categories.length === 9, 'expected 9 categories');
assert(new Set(pack.categories.map((c) => c.slug)).size === pack.categories.length, 'duplicate category slug');
assert(new Set(pack.threads.map((t) => t.id)).size === pack.threads.length, 'duplicate thread id');
assert(pack.threads.every((t) => [1, 2, 3, 4].includes(t.release_week)), 'release_week must be 1-4');

const authorNames = new Set(pack.house_accounts.map((a) => a.username));
assert(pack.threads.every((t) => authorNames.has(t.author)), 'thread author must be a declared STAFF account');

if (!dry && (!url || !serviceKey)) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Private-beta release starts Monday 2026-08-31. Each release_week maps to one
// calendar week. Within a week, threads are staggered across weekdays and hours.
const releaseStart = new Date('2026-08-31T13:15:00.000Z');
const weekdayOffsets = [0, 1, 2, 3, 4];
const minuteOffsets = [0, 110, 265, 410];
const seenByWeek = new Map();

function timestampFor(thread) {
  const n = seenByWeek.get(thread.release_week) ?? 0;
  seenByWeek.set(thread.release_week, n + 1);

  const d = new Date(releaseStart);
  d.setUTCDate(d.getUTCDate() + ((thread.release_week - 1) * 7) + weekdayOffsets[n % weekdayOffsets.length]);
  d.setUTCMinutes(d.getUTCMinutes() + minuteOffsets[Math.floor(n / weekdayOffsets.length) % minuteOffsets.length]);
  return d.toISOString();
}

const schedule = pack.threads.map((thread) => ({
  ...thread,
  created_at: timestampFor(thread),
}));

if (dry) {
  console.table(schedule.map(({ id, category, author, release_week, created_at, title }) => ({
    id, category, author, release_week, created_at, title,
  })));
  console.log(`Validated ${pack.house_accounts.length} STAFF accounts, ${pack.categories.length} categories, and ${pack.threads.length} threads.`);
  process.exit(0);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Retire legacy foundation categories, then activate exactly the nine categories in the supplied pack.
const { error: deactivateError } = await supabase.from('categories').update({ is_active: false }).neq('slug', '__never__');
if (deactivateError) throw deactivateError;

for (const category of pack.categories) {
  const { error } = await supabase.from('categories').upsert({
    ...category,
    is_active: true,
  }, { onConflict: 'slug' });
  if (error) throw error;
}

const { data: categoryRows, error: categoryError } = await supabase
  .from('categories')
  .select('id,slug')
  .in('slug', pack.categories.map((c) => c.slug));
if (categoryError) throw categoryError;
const categoryMap = new Map(categoryRows.map((row) => [row.slug, row.id]));

for (const account of pack.house_accounts) {
  const role = account.username === 'dcf-mod' ? 'moderator' : 'member';
  const { error } = await supabase.from('profiles').upsert({
    username: account.username,
    display_name: account.display_name,
    bio: account.bio,
    job_title: account.role_label,
    role,
    is_staff: true,
    is_verified: true,
    user_id: null,
  }, { onConflict: 'username' });
  if (error) throw error;
}

const { data: savedProfiles, error: profileError } = await supabase
  .from('profiles')
  .select('id,username')
  .in('username', pack.house_accounts.map((a) => a.username));
if (profileError) throw profileError;
const profileMap = new Map(savedProfiles.map((row) => [row.username, row.id]));

for (const thread of schedule) {
  const row = {
    category_id: categoryMap.get(thread.category),
    author_profile_id: profileMap.get(thread.author),
    title: thread.title,
    slug: thread.id,
    body: thread.body,
    tags: thread.tags ?? [],
    status: 'open',
    is_seed: true,
    is_pinned: Boolean(thread.pinned),
    is_featured: Boolean(thread.pinned),
    created_at: thread.created_at,
    updated_at: thread.created_at,
    last_activity_at: thread.created_at,
  };

  const { error } = await supabase.from('threads').upsert(row, { onConflict: 'slug' });
  if (error) throw error;
}

console.log(`Seed complete: ${pack.house_accounts.length} labeled STAFF accounts, ${pack.categories.length} categories, ${pack.threads.length} threads.`);
console.log('Policy reminder: DCF Desk opens questions but must not answer its own threads. Unanswered threads are routed to qualified real members after 24 hours.');

/**
 * test-supabase-connection.mjs
 *
 * Run with: node scripts/test-supabase-connection.mjs
 *
 * Tests:
 * 1. Can we reach the Supabase project?
 * 2. Does the 'events' table exist?
 * 3. Are there any rows in it?
 * 4. Does the schema match what our app expects?
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── Load .env manually (no dotenv dependency) ──
const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '❌ EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing from .env',
  );
  process.exit(1);
}

console.log(`\n🔌 Supabase URL: ${url}`);
console.log(`🔑 Anon key:     ${key.slice(0, 20)}...${key.slice(-10)}\n`);

const supabase = createClient(url, key);

// ── Test 1: Can we reach Supabase? ──
async function testConnection() {
  console.log('── Test 1: Supabase reachability ──');
  try {
    const { error } = await supabase.from('events').select('id').limit(1);
    if (error) {
      // error.code '42P01' means the table doesn't exist
      if (error.code === '42P01') {
        console.log(
          '✅ Supabase reachable, but the "events" table does NOT exist yet.',
        );
        console.log(
          '   → You need to run the migration SQL in your Supabase SQL Editor.',
        );
        return 'NO_TABLE';
      }
      console.log(
        `⚠️  Supabase returned error: ${error.message} (code: ${error.code})`,
      );
      return 'ERROR';
    }
    console.log('✅ Supabase connected successfully. "events" table exists.');
    return 'OK';
  } catch (e) {
    console.error(`❌ Could not reach Supabase: ${e.message}`);
    return 'UNREACHABLE';
  }
}

// ── Test 2: Check row count ──
async function testRowCount() {
  console.log('\n── Test 2: Row count in events table ──');
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`⚠️  Could not count rows: ${error.message}`);
    return 0;
  }
  console.log(`📊 Total rows in events table: ${count}`);
  if (count === 0) {
    console.log(
      '   → Table exists but is empty. You need to run seed.sql or add real events.',
    );
  }
  return count;
}

// ── Test 3: Check schema columns ──
async function testSchema() {
  console.log('\n── Test 3: Schema validation ──');
  const { data, error } = await supabase.from('events').select('*').limit(1);

  if (error) {
    console.log(`⚠️  Cannot read schema: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log('   → Table empty, cannot validate column names from data.');
    console.log(
      '   → Expected columns: id, title, description, format, category,',
    );
    console.log(
      '     start_at, end_at, city, venue_name, address, latitude, longitude,',
    );
    console.log(
      '     organizer_name, source_url, last_checked_at, is_verified, created_at',
    );
    return;
  }

  const columns = Object.keys(data[0]);
  console.log(`📋 Columns found: ${columns.join(', ')}`);

  const required = [
    'id',
    'title',
    'description',
    'format',
    'category',
    'start_at',
    'city',
    'organizer_name',
    'source_url',
  ];
  const missing = required.filter((col) => !columns.includes(col));
  if (missing.length > 0) {
    console.log(`⚠️  Missing required columns: ${missing.join(', ')}`);
  } else {
    console.log('✅ All required columns present.');
  }
}

// ── Test 4: Fetch and display sample data ──
async function testSampleData() {
  console.log('\n── Test 4: Sample event data ──');
  const { data, error } = await supabase
    .from('events')
    .select('id, title, format, city, organizer_name, start_at, source_url')
    .order('start_at', { ascending: true })
    .limit(5);

  if (error) {
    console.log(`⚠️  Cannot fetch sample: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log('   → No events to display.');
    return;
  }

  console.log('\n   Event inventory sample:');
  for (const row of data) {
    console.log(`   • [${row.format}] ${row.title}`);
    console.log(`     City: ${row.city} | Organizer: ${row.organizer_name}`);
    console.log(`     Starts: ${row.start_at}`);
    console.log(`     Source: ${row.source_url}\n`);
  }
}

// ── Run all tests ──
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   MEYALO SUPABASE CONNECTION TEST');
  console.log('═══════════════════════════════════════════════');

  const status = await testConnection();

  if (status === 'NO_TABLE') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ACTION REQUIRED:');
    console.log('  1. Open Supabase Dashboard → SQL Editor');
    console.log(
      '  2. Copy contents of supabase/migrations/001_initial_schema.sql',
    );
    console.log('  3. Paste and run it');
    console.log('  4. Then copy contents of supabase/seed.sql');
    console.log('  5. Paste and run it');
    console.log('  6. Re-run this test script');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  }

  if (status === 'UNREACHABLE' || status === 'ERROR') {
    console.log('\n❌ Cannot proceed. Fix Supabase connection first.');
    process.exit(1);
  }

  await testRowCount();
  await testSchema();
  await testSampleData();

  console.log('\n═══════════════════════════════════════════════');
  console.log('   TEST COMPLETE');
  console.log('═══════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

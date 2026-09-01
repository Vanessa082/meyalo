/**
 * deduplicate-events.mjs
 *
 * Removes duplicate seed rows from the events table.
 * Keeps the earliest created_at row for each unique title.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

async function main() {
  // Fetch all events ordered by title and created_at
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, created_at')
    .order('title')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Fetch error:', error.message);
    process.exit(1);
  }

  // Group by title, mark duplicates (keep first)
  const seen = new Map();
  const duplicateIds = [];

  for (const event of events) {
    if (seen.has(event.title)) {
      duplicateIds.push(event.id);
    } else {
      seen.set(event.title, event.id);
    }
  }

  if (duplicateIds.length === 0) {
    console.log('✅ No duplicates found. Table is clean.');
    return;
  }

  console.log(`🗑️  Found ${duplicateIds.length} duplicate(s). Deleting...`);

  // Note: RLS only allows SELECT for anon key. Deletes need service_role or SQL editor.
  // Try the delete — if it fails due to RLS, give instructions.
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .in('id', duplicateIds);

  if (deleteError) {
    console.log(
      `⚠️  Cannot delete via anon key (RLS blocks writes). Run this SQL in Supabase SQL Editor:\n`,
    );
    console.log(`DELETE FROM public.events WHERE id IN (`);
    console.log(duplicateIds.map((id) => `  '${id}'`).join(',\n'));
    console.log(`);\n`);
    return;
  }

  console.log(
    `✅ Deleted ${duplicateIds.length} duplicate(s). Remaining unique events: ${seen.size}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

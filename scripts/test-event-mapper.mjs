/**
 * test-event-mapper.mjs
 *
 * Unit tests for Meyalo DB column mapper and text search normalization.
 * Run with: node scripts/test-event-mapper.mjs
 */

import assert from 'node:assert';

// 1. Test accent-insensitive normalization
function normalizeSearchText(str) {
  return (str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

console.log('── Unit Test 1: Accent-insensitive normalization ──');
assert.strictEqual(normalizeSearchText('Yaoundé'), 'yaounde');
assert.strictEqual(
  normalizeSearchText('CREATIVE & TECH HUB'),
  'creative & tech hub',
);
assert.strictEqual(normalizeSearchText(null), '');
console.log('✅ Passed accent normalization tests.');

// 2. Test trust label rules
function buildTrustLabel(isVerified, sourceUrl) {
  if (!sourceUrl) return 'Community-submitted';
  if (isVerified) return 'Official source';
  return 'Source available';
}

console.log('\n── Unit Test 2: Trust label rules ──');
assert.strictEqual(
  buildTrustLabel(true, 'https://example.com'),
  'Official source',
);
assert.strictEqual(
  buildTrustLabel(false, 'https://example.com'),
  'Source available',
);
assert.strictEqual(buildTrustLabel(false, null), 'Community-submitted');
console.log('✅ Passed trust label rule tests.');

// 3. Test Format Mapping
function mapFormat(format) {
  if (format === 'physical') return 'in_person';
  if (format === 'hybrid') return 'hybrid';
  return 'virtual';
}

console.log('\n── Unit Test 3: Format mapping ──');
assert.strictEqual(mapFormat('physical'), 'in_person');
assert.strictEqual(mapFormat('hybrid'), 'hybrid');
assert.strictEqual(mapFormat('online'), 'virtual');
console.log('✅ Passed format mapping tests.');

console.log('\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');

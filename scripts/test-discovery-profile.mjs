import assert from 'node:assert/strict';
import {
  rankEventForUser,
  rankEventsList,
} from '../src/services/ranking.service.ts';

console.log(
  '🧪 Running Meyalo Discovery Profile & Personalization Unit Tests...\n',
);

// 1. Mock Event Data
const mockEvents = [
  {
    id: 'evt-1',
    slug: 'silicon-mountain-ai',
    title: 'Silicon Mountain AI Summit',
    organizerName: 'Tech Hub Buea',
    eventType: 'Technology',
    primaryCategory: 'Technology & Software',
    startsAt: '2026-10-15T09:00:00Z',
    timezone: 'WAT',
    format: 'in_person',
    city: 'Buea',
    isVerified: true,
    lastCheckedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'evt-2',
    slug: 'douala-sme-finance',
    title: 'Central Africa SME Finance Forum',
    organizerName: 'Douala Commerce Guild',
    eventType: 'Finance',
    primaryCategory: 'Finance & Business',
    startsAt: '2026-11-05T10:00:00Z',
    timezone: 'WAT',
    format: 'in_person',
    city: 'Douala',
    isVerified: true,
    lastCheckedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'evt-3',
    slug: 'global-dev-webinar',
    title: 'Global React Native & Expo Masterclass',
    organizerName: 'Global Dev Community',
    eventType: 'Technology',
    primaryCategory: 'Technology & Software',
    startsAt: '2026-09-20T17:00:00Z',
    timezone: 'WAT',
    format: 'virtual',
    city: undefined,
    isVerified: false,
    lastCheckedAt: '2026-09-01T08:00:00Z',
  },
];

// 2. Test Profile 1: Douala Business User wanting Physical & Online events
const profileDouala = {
  schemaVersion: 1,
  onboardingCompletedAt: '2026-09-01T10:00:00Z',
  location: {
    cityId: 'douala',
    cityName: 'Douala',
    mode: 'manual',
  },
  formats: ['in_person', 'virtual'],
  interestIds: ['finance', 'business'],
  goalIds: ['grow_business'],
  locale: 'en',
};

// 3. Test Profile 2: Buea Tech User wanting Physical Only
const profileBueaPhysical = {
  schemaVersion: 1,
  onboardingCompletedAt: '2026-09-01T10:00:00Z',
  location: {
    cityId: 'buea',
    cityName: 'Buea',
    mode: 'manual',
  },
  formats: ['in_person'],
  interestIds: ['technology'],
  goalIds: ['learn_skills'],
  locale: 'en',
};

// Test 1: Douala SME Finance Forum should rank #1 for profileDouala
const rankedDouala = rankEventsList(mockEvents, profileDouala);
assert.equal(
  rankedDouala[0].id,
  'evt-2',
  'Douala SME Finance should rank top for Douala finance profile',
);
assert.ok(
  rankedDouala[0].relevanceReasons[0].includes('Why this fits:'),
  'Must produce explainable fit reason badge',
);
console.log(
  '✅ PASS: Douala finance event correctly ranked #1 with explainable fit badge.',
);

// Test 2: Virtual filter exclusion test (profileBueaPhysical has format = ['in_person'] only)
const rankedBueaPhysical = rankEventsList(mockEvents, profileBueaPhysical);
assert.equal(
  rankedBueaPhysical.length,
  2,
  'Virtual events must be filtered out leaving only 2 physical events',
);
assert.equal(
  rankedBueaPhysical[0].id,
  'evt-1',
  'Silicon Mountain AI Summit should be ranked #1 for Buea physical tech',
);
assert.ok(
  !rankedBueaPhysical.some((e) => e.format === 'virtual'),
  'No virtual event present in physical-only feed',
);
console.log(
  '✅ PASS: Format preference exclusion correctly filters out virtual events when physical only is requested.',
);

// Test 3: Virtual global accessibility
const singleVirtualTest = rankEventForUser(mockEvents[2], profileDouala);
assert.ok(
  singleVirtualTest.score > 0,
  'Virtual events must not be excluded by city mismatches',
);
console.log(
  '✅ PASS: Virtual global event scores positively across any city anchor.',
);

console.log(
  '\n🎉 ALL DISCOVERY PROFILE & PERSONALIZATION TESTS PASSED PERFECTLY!\n',
);

/**
 * Persona tests: "is For You intelligent?" as checks that run on every change
 * (docs/product-decisions.md, what "intelligent" means). Each persona says
 * what a sensible person would expect; every feed must also pass the rules
 * in `assertSensible`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GoalId } from '../config/discovery/goals.ts';
import type { TopicId } from '../config/discovery/topics.ts';
import { PERSONA_EVENTS, PERSONA_NOW } from '../test-support/persona-events.ts';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import { type AffinitySignals, buildAffinity } from './affinity.ts';
import { buildForYouFeed, type ForYouFeed } from './ranking.service.ts';

function person(
  city: { id: string; name: string } | 'online_only' | null,
  interestIds: TopicId[],
  goalIds: GoalId[] = [],
): LocalDiscoveryProfile {
  return {
    schemaVersion: 2,
    onboardingCompletedAt: '2026-10-01T10:00:00Z',
    area:
      city === 'online_only'
        ? { kind: 'online_only' }
        : city
          ? { kind: 'city', city }
          : null,
    format: null,
    interestIds,
    goalIds,
    updatedAt: '2026-10-01T10:00:00Z',
  };
}

const BUEA = { id: 'buea', name: 'Buea' };
const BAMENDA = { id: 'bamenda', name: 'Bamenda' };
const DOUALA = { id: 'douala', name: 'Douala' };

const feedFor = (
  profile: LocalDiscoveryProfile | null,
  signals?: AffinitySignals,
) =>
  buildForYouFeed(PERSONA_EVENTS, profile, PERSONA_NOW, {
    affinity: signals ? buildAffinity(signals) : undefined,
  });

const picks = (feed: ForYouFeed) => feed.topPicks.map((p) => p.event.id);
const main = (feed: ForYouFeed) => [
  ...feed.topPicks.map((p) => p.event),
  ...feed.moreUpcoming,
];

/** Rules every persona's feed must follow, whatever their profile. */
function assertSensible(
  feed: ForYouFeed,
  profile: LocalDiscoveryProfile | null,
) {
  const everything = [...main(feed), ...feed.beyondCity];
  assert.ok(
    everything.every(
      (e) =>
        e.status !== 'cancelled' &&
        Date.parse(e.startsAt) >= PERSONA_NOW.getTime(),
    ),
    'never past or cancelled',
  );
  if (profile?.area?.kind === 'city') {
    const city = profile.area.city.name;
    assert.ok(
      main(feed).every(
        (e) => e.format === 'virtual' || !e.city || e.city === city,
      ),
      'in-person and hybrid events from other cities stay out of the main list',
    );
  }
  assert.ok(feed.topPicks.length <= 5, 'at most five top picks');
  assert.ok(
    feed.topPicks.every((p) => p.reasons.length > 0),
    'every top pick says why',
  );
  const organizers = feed.topPicks.map((p) => p.event.organizerName);
  assert.equal(
    new Set(organizers).size,
    organizers.length,
    'one per organiser',
  );
}

describe('persona: Amina, student in Buea, into technology, wants skills', () => {
  const profile = person(BUEA, ['technology'], ['learn_skills']);
  const feed = feedFor(profile);

  it('follows the rules', () => assertSensible(feed, profile));

  it('leads with the soonest well-matched tech learning, here or online', () => {
    assert.deepEqual(picks(feed).slice(0, 2).sort(), [
      'buea-ai',
      'online-data',
    ]);
  });

  it('mixes: no more than two tech picks, then something else that teaches', () => {
    const tech = feed.topPicks.filter((p) =>
      p.event.topics.includes('technology'),
    );
    assert.ok(tech.length <= 2);
    assert.ok(picks(feed).includes('buea-church-biz'));
  });

  it('shows the Yaoundé summit only beyond her city', () => {
    assert.ok(!main(feed).some((e) => e.id === 'yaounde-ai'));
    assert.ok(feed.beyondCity.some((e) => e.id === 'yaounde-ai'));
  });
});

describe('persona: Jean, farmer in Bamenda, looking for funding', () => {
  const profile = person(BAMENDA, ['agriculture'], ['find_funding']);
  const feed = feedFor(profile);

  it('follows the rules', () => assertSensible(feed, profile));

  it('puts the grant session whose registration closes in two days first, saying so', () => {
    assert.equal(picks(feed)[0], 'online-agri-grant');
    assert.deepEqual(feed.topPicks[0].reasons[0], { kind: 'deadline' });
  });

  it('includes the local cocoa training', () => {
    assert.ok(picks(feed).includes('bamenda-cocoa'));
  });
});

describe('persona: Grace, online only, into finance and business', () => {
  const profile = person('online_only', ['finance', 'business']);
  const feed = feedFor(profile);

  it('follows the rules', () => assertSensible(feed, profile));

  it('never shows an in-person-only event', () => {
    assert.ok(main(feed).every((e) => e.format !== 'in_person'));
    assert.ok(picks(feed).includes('online-agri-grant'));
  });
});

describe('persona: Paul in Douala, goes to business mornings', () => {
  const profile = person(DOUALA, ['business', 'finance']);
  const habits: AffinitySignals = {
    now: PERSONA_NOW,
    hidden: [],
    saved: [
      {
        topics: ['business'],
        organizerName: 'Chamber of Commerce',
        plan: 'going',
        savedAt: '2026-10-12T09:00:00Z',
        startsAt: '2026-10-14T09:00:00Z', // a Wednesday morning
        timezone: 'Africa/Douala',
      },
      {
        topics: ['business'],
        organizerName: 'GICAM',
        plan: 'going',
        savedAt: '2026-10-10T09:00:00Z',
        startsAt: '2026-10-09T08:00:00Z', // a Friday morning
        timezone: 'Africa/Douala',
      },
    ],
  };

  it('follows the rules, with and without habits', () => {
    assertSensible(feedFor(profile), profile);
    assertSensible(feedFor(profile, habits), profile);
  });

  it('without history: a matching grant closing in two days leads, then the finance evening', () => {
    const ids = picks(feedFor(profile));
    assert.equal(ids[0], 'online-agri-grant');
    assert.ok(ids.slice(0, 3).includes('douala-finance'));
  });

  it('prefers a fresh check: the stale accounting evening ranks below', () => {
    const ids = main(feedFor(profile)).map((e) => e.id);
    assert.ok(ids.indexOf('douala-finance') < ids.indexOf('douala-stale'));
  });

  it('with his habits: a weekday-morning business event moves up, and says why', () => {
    const wider = person(DOUALA, ['business', 'finance', 'creative_media']);
    const rank = (feed: ForYouFeed) =>
      main(feed).findIndex((e) => e.id === 'douala-hybrid-marketing');
    const before = rank(feedFor(wider));
    const withHabits = feedFor(wider, habits);
    assert.ok(rank(withHabits) < before, `${rank(withHabits)} < ${before}`);
    const pick = withHabits.topPicks.find(
      (p) => p.event.id === 'douala-hybrid-marketing',
    );
    assert.ok(pick?.reasons.some((r) => r.kind === 'habit'));
  });
});

describe('persona: someone who skipped every question', () => {
  const feed = feedFor(null);

  it('follows the rules', () => assertSensible(feed, null));

  it('gets everything upcoming by date, with no invented reasons', () => {
    assert.deepEqual(feed.topPicks, []);
    const starts = feed.moreUpcoming.map((e) => Date.parse(e.startsAt));
    assert.deepEqual(
      starts,
      [...starts].sort((a, b) => a - b),
    );
  });
});

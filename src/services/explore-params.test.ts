import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activeFilterCount,
  dateWindow,
  EMPTY_EXPLORE,
  type ExploreState,
  moreLikeThis,
  parseExploreParams,
  toExploreParams,
  topicsMatching,
  toSearchInput,
} from './explore-params.ts';

// Monday 19 October 2026, 10:00 in Douala (UTC+1).
const MONDAY = new Date('2026-10-19T09:00:00Z');
const ZONE = 'Africa/Douala';

const FULL: ExploreState = {
  q: 'pitch night',
  when: 'weekend',
  cities: ['douala', 'buea'],
  formats: ['in_person', 'hybrid'],
  prices: ['free'],
  topics: ['technology'],
  offers: ['funding'],
  languages: ['fr'],
  open: true,
  sort: 'recent',
};

describe('parseExploreParams', () => {
  it('gives the empty state for no parameters', () => {
    assert.deepEqual(parseExploreParams({}), EMPTY_EXPLORE);
  });

  it('reads every parameter, in canonical order', () => {
    const state = parseExploreParams({
      q: '  pitch night ',
      when: 'weekend',
      city: 'buea,douala',
      format: 'hybrid,in_person',
      price: 'free',
      topic: 'technology',
      offer: 'funding',
      lang: 'fr',
      open: '1',
      sort: 'recent',
    });
    assert.deepEqual(state, FULL);
  });

  it('accepts repeated parameters as well as commas', () => {
    const state = parseExploreParams({ city: ['buea', 'douala,yaounde'] });
    assert.deepEqual(state.cities, ['yaounde', 'douala', 'buea']);
  });

  it('drops unknown values instead of guessing', () => {
    const state = parseExploreParams({
      when: 'tomorrow',
      city: 'paris,buea',
      format: 'party',
      price: 'cheap',
      topic: 'astrology,health',
      offer: 'free_food',
      lang: 'de',
      open: 'true',
      sort: 'best',
    });
    assert.deepEqual(state, {
      ...EMPTY_EXPLORE,
      cities: ['buea'],
      topics: ['health'],
    });
  });

  it('removes duplicates and caps the query at 100 characters', () => {
    const state = parseExploreParams({ q: 'a'.repeat(300), lang: 'fr,fr' });
    assert.equal(state.q.length, 100);
    assert.deepEqual(state.languages, ['fr']);
  });
});

describe('price filter', () => {
  it('takes free, paid or both, in a fixed order', () => {
    assert.deepEqual(parseExploreParams({ price: 'paid,free' }).prices, [
      'free',
      'paid',
    ]);
    assert.deepEqual(toExploreParams({ ...EMPTY_EXPLORE, prices: ['paid'] }), {
      price: 'paid',
    });
  });
});

describe('toExploreParams', () => {
  it('leaves defaults out of the address', () => {
    assert.deepEqual(toExploreParams(EMPTY_EXPLORE), {});
  });

  it('round trips through the address', () => {
    assert.deepEqual(parseExploreParams(toExploreParams(FULL)), FULL);
    assert.deepEqual(toExploreParams(FULL), {
      q: 'pitch night',
      when: 'weekend',
      city: 'douala,buea',
      format: 'in_person,hybrid',
      price: 'free',
      topic: 'technology',
      offer: 'funding',
      lang: 'fr',
      open: '1',
      sort: 'recent',
    });
  });
});

describe('activeFilterCount', () => {
  it('counts filter groups, not the query or the sort', () => {
    assert.equal(activeFilterCount(EMPTY_EXPLORE), 0);
    assert.equal(
      activeFilterCount({ ...EMPTY_EXPLORE, q: 'x', sort: 'recent' }),
      0,
    );
    assert.equal(activeFilterCount(FULL), 8);
  });
});

describe('dateWindow', () => {
  it('today runs from local midnight to the next one', () => {
    assert.deepEqual(dateWindow('today', MONDAY, ZONE), {
      from: '2026-10-18T23:00:00.000Z',
      before: '2026-10-19T23:00:00.000Z',
    });
  });

  it('this weekend is the coming Saturday and Sunday', () => {
    assert.deepEqual(dateWindow('weekend', MONDAY, ZONE), {
      from: '2026-10-23T23:00:00.000Z',
      before: '2026-10-25T23:00:00.000Z',
    });
  });

  it('this week runs from today to the end of Sunday', () => {
    assert.deepEqual(dateWindow('week', MONDAY, ZONE), {
      from: '2026-10-18T23:00:00.000Z',
      before: '2026-10-25T23:00:00.000Z',
    });
  });

  it('on a weekend day, the weekend and the week start today', () => {
    const saturday = new Date('2026-10-24T10:00:00Z');
    assert.deepEqual(dateWindow('weekend', saturday, ZONE), {
      from: '2026-10-23T23:00:00.000Z',
      before: '2026-10-25T23:00:00.000Z',
    });
    const sunday = new Date('2026-10-25T10:00:00Z');
    assert.deepEqual(dateWindow('week', sunday, ZONE), {
      from: '2026-10-24T23:00:00.000Z',
      before: '2026-10-25T23:00:00.000Z',
    });
  });
});

describe('topicsMatching', () => {
  const labels = (id: string) =>
    ({
      technology: ['Technology', 'Technologie'],
      agriculture: ['Agriculture', 'Agriculture'],
      creative_media: ['Creative & media', 'Création et médias'],
    })[id] ?? [];

  it('matches topic names in either language, ignoring accents', () => {
    assert.deepEqual(topicsMatching('technolog', labels), ['technology']);
    assert.deepEqual(topicsMatching('MEDIAS', labels), ['creative_media']);
  });

  it('needs at least 3 characters', () => {
    assert.deepEqual(topicsMatching('ag', labels), []);
  });
});

describe('toSearchInput', () => {
  it('turns the state into server filters, with city names and dates', () => {
    assert.deepEqual(toSearchInput(FULL, MONDAY, ZONE, ['business']), {
      query: 'pitch night',
      queryTopics: ['business'],
      cities: ['Douala', 'Buea'],
      formats: ['in_person', 'hybrid'],
      prices: ['free'],
      topics: ['technology'],
      offers: ['funding'],
      languages: ['fr'],
      registrationOpen: true,
      startsFrom: '2026-10-23T23:00:00.000Z',
      startsBefore: '2026-10-25T23:00:00.000Z',
    });
  });

  it('sends nothing for empty filters', () => {
    assert.deepEqual(toSearchInput(EMPTY_EXPLORE, MONDAY, ZONE, []), {
      registrationOpen: false,
    });
  });
});

describe('more like this', () => {
  it("filters by all the event's topics and the city of an in-person event", () => {
    // Topics have no order of importance (they are sorted by id), and
    // Explore matches any of them.
    const params = moreLikeThis({
      topics: ['technology', 'careers'],
      format: 'in_person',
      city: 'Yaoundé',
    });
    assert.equal(params.city, 'yaounde');
    assert.deepEqual(params.topic?.split(',').sort(), [
      'careers',
      'technology',
    ]);
  });

  it('leaves out an unknown topic or city, and the city of online events', () => {
    assert.deepEqual(
      moreLikeThis({ topics: ['nope'], format: 'in_person', city: 'Atlantis' }),
      {},
    );
    assert.deepEqual(
      moreLikeThis({ topics: ['health'], format: 'virtual', city: 'Douala' }),
      { topic: 'health' },
    );
  });
});

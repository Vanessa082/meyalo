import type { LocalDiscoveryProfile } from '@/types/discovery-profile';
import type { EventCardData } from '@/types/event.type';

export interface UserPreferences {
  city: string;
  formatPreference: 'both' | 'physical' | 'virtual';
  interests: string[];
  goals: string[];
}

export interface RankedEvent {
  event: EventCardData;
  score: number;
  relevanceReason: string;
}

/**
 * Normalizes input from either UserPreferences or LocalDiscoveryProfile
 */
function normalizeProfile(
  input?: UserPreferences | LocalDiscoveryProfile | null,
): UserPreferences {
  if (!input) {
    return {
      city: 'yaounde',
      formatPreference: 'both',
      interests: [],
      goals: [],
    };
  }

  // Handle LocalDiscoveryProfile
  if ('schemaVersion' in input && input.schemaVersion === 1) {
    const profile = input as LocalDiscoveryProfile;
    let formatPref: 'both' | 'physical' | 'virtual' = 'both';
    if (
      profile.formats.includes('in_person') &&
      !profile.formats.includes('virtual')
    ) {
      formatPref = 'physical';
    } else if (
      profile.formats.includes('virtual') &&
      !profile.formats.includes('in_person')
    ) {
      formatPref = 'virtual';
    }

    return {
      city: profile.location.cityName || profile.location.cityId || 'yaounde',
      formatPreference: formatPref,
      interests: profile.interestIds || [],
      goals: profile.goalIds || [],
    };
  }

  // Handle legacy UserPreferences
  return input as UserPreferences;
}

/**
 * Calculates a deterministic relevance score and human-readable explanation for an event.
 * Adheres strictly to Meyalo Blueprint Section 5.1 & Privacy Profile guidelines.
 */
export function rankEventForUser(
  event: EventCardData,
  prefsInput?: UserPreferences | LocalDiscoveryProfile | null,
): RankedEvent {
  if (!event) {
    return {
      event,
      score: 0,
      relevanceReason: 'Growth opportunity',
    };
  }

  const prefs = normalizeProfile(prefsInput);
  let score = 10; // Baseline score for active growth event
  const matchedReasons: string[] = [];

  // 1. Format Exclusion Guard Clauses
  if (prefs.formatPreference === 'physical' && event.format === 'virtual') {
    return {
      event,
      score: -100,
      relevanceReason: 'Filtered by virtual preference',
    };
  }
  if (prefs.formatPreference === 'virtual' && event.format === 'in_person') {
    return {
      event,
      score: -100,
      relevanceReason: 'Filtered by physical preference',
    };
  }

  // 2. Interest Match (+30 pts per match)
  const categoryStr = (
    event.primaryCategory ??
    event.eventType ??
    ''
  ).toLowerCase();
  const userInterests = prefs.interests ?? [];

  for (const interest of userInterests) {
    if (categoryStr.includes(interest.toLowerCase())) {
      score += 30;
      matchedReasons.push(formatInterestLabel(interest));
    }
  }

  // 3. Goal Match (+25 pts)
  const userGoals = prefs.goals ?? [];
  if (
    userGoals.some((g) => g.includes('business') || g.includes('funding')) &&
    (categoryStr.includes('business') || categoryStr.includes('finance'))
  ) {
    score += 25;
    matchedReasons.push('Grow business');
  }
  if (
    userGoals.some((g) => g.includes('career') || g.includes('job')) &&
    (categoryStr.includes('career') || categoryStr.includes('job'))
  ) {
    score += 25;
    matchedReasons.push('Career goal');
  }
  if (
    userGoals.some((g) => g.includes('skills') || g.includes('learn')) &&
    (categoryStr.includes('tech') ||
      categoryStr.includes('masterclass') ||
      categoryStr.includes('software'))
  ) {
    score += 25;
    matchedReasons.push('Learn skills');
  }

  // 4. Physical City Match (+20 pts)
  if (event.format !== 'virtual' && event.city && prefs.city) {
    if (
      event.city.toLowerCase().includes(prefs.city.toLowerCase()) ||
      prefs.city.toLowerCase().includes(event.city.toLowerCase())
    ) {
      score += 20;
      matchedReasons.push(event.city);
    }
  }

  // 5. Freshness Trust Boost (+10 pts)
  if (event.lastCheckedAt) {
    score += 10;
  }

  // Deduplicate and format reason string
  const uniqueReasons = Array.from(new Set(matchedReasons));
  const reasonText =
    uniqueReasons.length > 0
      ? `Why this fits: ${uniqueReasons.slice(0, 3).join(' · ')}`
      : 'Growth opportunity around you';

  return {
    event: {
      ...event,
      relevanceReasons: [reasonText],
    },
    score,
    relevanceReason: reasonText,
  };
}

/**
 * Ranks an array of events descending by score. Filters out hard exclusions (score < 0).
 */
export function rankEventsList(
  events: EventCardData[],
  prefsInput?: UserPreferences | LocalDiscoveryProfile | null,
): EventCardData[] {
  if (!events || events.length === 0) return [];

  return events
    .map((e) => rankEventForUser(e, prefsInput))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.event);
}

function formatInterestLabel(interest: string): string {
  const map: Record<string, string> = {
    business: 'Business',
    technology: 'Technology',
    career: 'Career',
    finance: 'Finance',
    agriculture: 'Agriculture',
    healthcare: 'Healthcare',
    education: 'Education',
    creative_media: 'Creative & Media',
    engineering: 'Engineering',
    climate_energy: 'Climate & Energy',
    masterclass: 'Masterclass',
  };
  return map[interest.toLowerCase()] ?? interest;
}

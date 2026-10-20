/**
 * Discovery profile rules that do not depend on storage.
 */
import { findCity } from '../config/discovery/cities.ts';
import { type GoalId, isGoalId } from '../config/discovery/goals.ts';
import { isTopicId, type TopicId } from '../config/discovery/topics.ts';
import type {
  DiscoveryArea,
  DiscoveryProfilePatch,
  FormatPreference,
  LocalDiscoveryProfile,
} from '../types/discovery-profile.ts';

export function emptyProfile(now: Date): LocalDiscoveryProfile {
  return {
    schemaVersion: 2,
    area: null,
    format: null,
    interestIds: [],
    goalIds: [],
    onboardingCompletedAt: null,
    updatedAt: now.toISOString(),
  };
}

/** Merges a step's answers. Never marks onboarding complete. */
export function applyProfilePatch(
  profile: LocalDiscoveryProfile,
  patch: DiscoveryProfilePatch,
  now: Date,
): LocalDiscoveryProfile {
  return {
    ...profile,
    ...patch,
    interestIds: dedupe(patch.interestIds ?? profile.interestIds),
    goalIds: dedupe(patch.goalIds ?? profile.goalIds),
    updatedAt: now.toISOString(),
  };
}

export function completeOnboarding(
  profile: LocalDiscoveryProfile,
  now: Date,
): LocalDiscoveryProfile {
  return {
    ...profile,
    onboardingCompletedAt: profile.onboardingCompletedAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** True when the user has told us anything ranking can use. */
export function hasDiscoverySignals(
  profile: LocalDiscoveryProfile | null,
): boolean {
  if (!profile) return false;
  return (
    profile.area !== null ||
    profile.format !== null ||
    profile.interestIds.length > 0 ||
    profile.goalIds.length > 0
  );
}

/** Choosing "Online events only" as the area implies the online format. */
export function effectiveFormat(
  profile: LocalDiscoveryProfile,
): FormatPreference | null {
  if (profile.area?.kind === 'online_only') return 'online';
  return profile.format;
}

const V1_TOPICS: Record<string, TopicId> = {
  healthcare: 'health',
  education: 'learning',
  climate_energy: 'climate',
};

const V1_GOALS: Record<string, GoalId> = {
  advance_career: 'find_work',
};

/**
 * Reads whatever is in storage. Version 1 profiles are migrated; anything
 * unreadable is treated as no profile rather than guessed at.
 */
export function parseStoredProfile(
  raw: unknown,
  now: Date,
): LocalDiscoveryProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion === 2) return parseV2(value);
  if (value.schemaVersion === 1) return migrateV1(value, now);
  return null;
}

function parseV2(value: Record<string, unknown>): LocalDiscoveryProfile | null {
  const area = parseArea(value.area);
  if (area === undefined) return null;
  return {
    schemaVersion: 2,
    area,
    format: parseFormat(value.format),
    interestIds: listOf(value.interestIds, isTopicId),
    goalIds: listOf(value.goalIds, isGoalId),
    onboardingCompletedAt: isoOrNull(value.onboardingCompletedAt),
    updatedAt: isoOrNull(value.updatedAt) ?? new Date(0).toISOString(),
  };
}

function migrateV1(
  value: Record<string, unknown>,
  now: Date,
): LocalDiscoveryProfile {
  const location = value.location as { cityId?: unknown } | undefined;
  const city =
    typeof location?.cityId === 'string' ? findCity(location.cityId) : null;

  const formats = Array.isArray(value.formats) ? value.formats : [];
  const inPerson = formats.includes('in_person');
  const online = formats.includes('virtual');
  const format: FormatPreference | null =
    inPerson && online
      ? 'both'
      : inPerson
        ? 'in_person'
        : online
          ? 'online'
          : null;

  const mapIds = <T>(
    ids: unknown,
    renames: Record<string, T>,
    guard: (v: unknown) => v is T,
  ) =>
    listOf(
      (Array.isArray(ids) ? ids : []).map((id) =>
        typeof id === 'string' && id in renames ? renames[id] : id,
      ),
      guard,
    );

  return {
    schemaVersion: 2,
    area: city ? { kind: 'city', city } : null,
    format,
    interestIds: mapIds(value.interestIds, V1_TOPICS, isTopicId),
    goalIds: mapIds(value.goalIds, V1_GOALS, isGoalId),
    onboardingCompletedAt: isoOrNull(value.onboardingCompletedAt),
    updatedAt: now.toISOString(),
  };
}

/** Returns undefined when the stored area is malformed. */
function parseArea(raw: unknown): DiscoveryArea | null | undefined {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') return undefined;
  const area = raw as { kind?: unknown; city?: { id?: unknown } };
  if (area.kind === 'online_only') return { kind: 'online_only' };
  if (area.kind === 'city' && typeof area.city?.id === 'string') {
    const city = findCity(area.city.id);
    return city ? { kind: 'city', city } : null;
  }
  return undefined;
}

function parseFormat(raw: unknown): FormatPreference | null {
  return raw === 'in_person' || raw === 'online' || raw === 'both' ? raw : null;
}

function listOf<T>(raw: unknown, guard: (v: unknown) => v is T): T[] {
  return Array.isArray(raw) ? dedupe(raw.filter(guard)) : [];
}

function isoOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && Number.isFinite(Date.parse(raw))
    ? raw
    : null;
}

function dedupe<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

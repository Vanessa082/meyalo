import type { City } from '../config/discovery/cities.ts';
import type { GoalId } from '../config/discovery/goals.ts';
import type { TopicId } from '../config/discovery/topics.ts';

export type FormatPreference = 'in_person' | 'online' | 'both';

/** Where the user discovers in-person events. Null means "not stated". */
export type DiscoveryArea =
  | { kind: 'city'; city: City }
  | { kind: 'online_only' };

/**
 * The on-device discovery profile. Every signal is optional: an empty list or
 * null means the user skipped it, and ranking ignores it.
 */
export interface LocalDiscoveryProfile {
  schemaVersion: 2;
  area: DiscoveryArea | null;
  /** Ignored when `area` is online only. */
  format: FormatPreference | null;
  interestIds: TopicId[];
  goalIds: GoalId[];
  /** Set only when onboarding is finished or skipped to the end. */
  onboardingCompletedAt: string | null;
  updatedAt: string;
}

export type DiscoveryProfilePatch = Partial<
  Pick<LocalDiscoveryProfile, 'area' | 'format' | 'interestIds' | 'goalIds'>
>;

/**
 * What a user wants from events. Labels live in the i18n catalogs under
 * `goals.<id>`. Each goal maps to the event "offers" it is matched against.
 */
export const GOAL_IDS = [
  'learn_skills',
  'find_work',
  'grow_business',
  'meet_people',
  'find_funding',
  'share_expertise',
  'stay_informed',
] as const;

export type GoalId = (typeof GOAL_IDS)[number];

export function isGoalId(value: unknown): value is GoalId {
  return (GOAL_IDS as readonly unknown[]).includes(value);
}

/**
 * Event "offers" (ids in `public.offers`) that satisfy each goal. A goal with
 * no offers is never used as a match reason: "stay informed" has no offer that
 * represents it yet, so it does not move ranking.
 */
export const GOAL_OFFERS: Readonly<Record<GoalId, readonly string[]>> = {
  learn_skills: ['learning'],
  find_work: ['hiring'],
  grow_business: ['networking', 'funding', 'pitching'],
  meet_people: ['networking'],
  find_funding: ['funding', 'pitching'],
  share_expertise: ['speaking'],
  stay_informed: [],
};

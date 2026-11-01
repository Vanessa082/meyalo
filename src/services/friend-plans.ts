import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { consentColumns, consentProblem } from './consent.ts';

/**
 * Plans with friends (Feature 13; docs/product-decisions.md, updated
 * 2026-10-20). Rules live in 015_friend_plans.sql; this checks the same
 * limits first for clear messages.
 */

export type FriendAnswer = 'in' | 'maybe' | 'cant';

export type FriendPlanErrorKind =
  | 'not_signed_in'
  | 'exists'
  | 'rate_limited'
  | 'invalid'
  | 'unavailable';

export class FriendPlanError extends Error {
  readonly kind: FriendPlanErrorKind;

  constructor(kind: FriendPlanErrorKind, message: string) {
    super(message);
    this.name = 'FriendPlanError';
    this.kind = kind;
  }
}

export function isFriendPlanError(error: unknown): error is FriendPlanError {
  return error instanceof FriendPlanError;
}

/** What a friend with the link sees (get_friend_plan). */
export interface PublicFriendPlan {
  title: string;
  start_at: string;
  end_at: string | null;
  timezone: string | null;
  format: 'in_person' | 'virtual' | 'hybrid';
  city: string | null;
  venue_name: string | null;
  event_id: string;
  owner_name: string | null;
  show_names: boolean;
  status: 'open' | 'closed';
  counts: Record<FriendAnswer, number>;
  /** Only when the owner shows names. */
  names?: { name: string; answer: FriendAnswer }[];
}

/** The owner's view of their plan for one event. */
export interface OwnFriendPlan {
  id: string;
  token: string;
  owner_name: string | null;
  show_names: boolean;
  closed: boolean;
  expires_at: string | null;
  responses: {
    id: string;
    first_name: string;
    answer: FriendAnswer;
    name_visible: boolean;
  }[];
}

export interface FriendResponseInput {
  firstName: string;
  answer: FriendAnswer;
  consent: Consent;
  /** The token from an earlier answer on this phone or browser, to change it. */
  responseToken: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_MAX = 40;
const ANSWERS: readonly FriendAnswer[] = ['in', 'maybe', 'cant'];

function fail(error: { code?: string; message?: string }): FriendPlanError {
  if (error.code === 'PT429') {
    return new FriendPlanError('rate_limited', 'Too many, try again later.');
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return new FriendPlanError('not_signed_in', 'Sign in to invite friends.');
  }
  if (error.code === '23505') {
    return new FriendPlanError(
      'exists',
      'There is already a plan for this event.',
    );
  }
  if (error.code?.startsWith('22') || error.code?.startsWith('23')) {
    return new FriendPlanError('invalid', error.message ?? 'Not accepted.');
  }
  return new FriendPlanError('unavailable', error.message ?? 'Request failed.');
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isFriendPlanError(error)) throw error;
    throw new FriendPlanError(
      'unavailable',
      error instanceof Error ? error.message : 'Request failed.',
    );
  }
}

function cleanName(name: string): string | null {
  const value = name.trim();
  return value.length >= 1 && value.length <= NAME_MAX ? value : null;
}

export function createFriendPlans(client: SupabaseClient) {
  return {
    /** Owner: a new plan for an event they are going to. */
    async create(
      eventId: string,
      ownerName: string,
      showNames: boolean,
    ): Promise<{ id: string; token: string; expiresAt: string }> {
      const name = ownerName.trim();
      if (!UUID.test(eventId) || name.length > NAME_MAX) {
        throw new FriendPlanError('invalid', 'Check the name.');
      }
      return run(async () => {
        const { data, error } = await client.rpc('create_friend_plan', {
          p_event_id: eventId,
          p_owner_name: name === '' ? null : name,
          p_show_names: showNames,
        });
        if (error) throw fail(error);
        const row = Array.isArray(data) ? data[0] : null;
        if (!row?.token) {
          throw new FriendPlanError('unavailable', 'No plan was returned.');
        }
        return { id: row.id, token: row.token, expiresAt: row.expires_at };
      });
    },

    /** Owner: their open or closed plan for an event, with the answers. */
    async listForEvent(eventId: string): Promise<OwnFriendPlan | null> {
      if (!UUID.test(eventId)) return null;
      return run(async () => {
        const { data, error } = await client
          .from('friend_plans')
          .select(
            'id, token, owner_name, show_names, closed, expires_at, responses:friend_plan_responses(id, first_name, answer, name_visible, created_at)',
          )
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw fail(error);
        const plan = (data?.[0] ?? null) as OwnFriendPlan | null;
        return plan;
      });
    },

    /** Owner: close answers, or show or hide names. */
    async update(
      planId: string,
      change: { closed?: boolean; show_names?: boolean },
    ): Promise<void> {
      return run(async () => {
        const { error } = await client
          .from('friend_plans')
          .update(change)
          .eq('id', planId);
        if (error) throw fail(error);
      });
    },

    /** Owner: delete the plan and every answer. */
    async remove(planId: string): Promise<void> {
      return run(async () => {
        const { error } = await client
          .from('friend_plans')
          .delete()
          .eq('id', planId);
        if (error) throw fail(error);
      });
    },

    /** Anyone with the link. Null for an unknown or expired link. */
    async getPublic(token: string): Promise<PublicFriendPlan | null> {
      if (!UUID.test(token)) return null;
      return run(async () => {
        const { data, error } = await client.rpc('get_friend_plan', {
          p_token: token,
        });
        if (error) throw fail(error);
        return (data as PublicFriendPlan | null) ?? null;
      });
    },

    /** A friend answers, or changes their answer. Returns its token. */
    async respond(token: string, input: FriendResponseInput): Promise<string> {
      const name = cleanName(input.firstName);
      if (
        !UUID.test(token) ||
        !name ||
        !ANSWERS.includes(input.answer) ||
        consentProblem(input.consent) !== null ||
        (input.responseToken !== null && !UUID.test(input.responseToken))
      ) {
        throw new FriendPlanError('invalid', 'Check your name and answer.');
      }
      const consent = consentColumns(input.consent);
      return run(async () => {
        const { data, error } = await client.rpc('respond_to_friend_plan', {
          p_token: token,
          p_first_name: name,
          p_answer: input.answer,
          p_consent_version: consent.consent_version,
          p_consent_language: consent.consent_language,
          p_age_group: consent.age_group,
          p_guardian_consent: consent.guardian_consent,
          p_response_token: input.responseToken,
        });
        if (error) throw fail(error);
        if (typeof data !== 'string') {
          throw new FriendPlanError('unavailable', 'No answer was returned.');
        }
        return data;
      });
    },

    /** A friend removes their own answer. False when nothing matched. */
    async withdraw(token: string, responseToken: string): Promise<boolean> {
      if (!UUID.test(token) || !UUID.test(responseToken)) return false;
      return run(async () => {
        const { data, error } = await client.rpc(
          'remove_friend_plan_response',
          {
            p_token: token,
            p_response_token: responseToken,
          },
        );
        if (error) throw fail(error);
        return data === true;
      });
    },
  };
}

export type FriendPlans = ReturnType<typeof createFriendPlans>;

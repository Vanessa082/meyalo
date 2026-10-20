import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { consentColumns, consentProblem } from './consent.ts';

/**
 * Event supply: public suggestions (no account) and the curator side of them,
 * plus coverage of upcoming events by city and topic. Database rules live in
 * 009_supply.sql; this checks the same limits first for clear messages.
 */

export type SupplyErrorKind =
  | 'invalid_input'
  | 'rate_limited'
  | 'unauthorized'
  | 'unavailable';

export class SupplyError extends Error {
  readonly kind: SupplyErrorKind;

  constructor(kind: SupplyErrorKind, message: string) {
    super(message);
    this.name = 'SupplyError';
    this.kind = kind;
  }
}

export function isSupplyError(error: unknown): error is SupplyError {
  return error instanceof SupplyError;
}

/** Mirrors submissions_status_check (003). */
export type SubmissionStatus = 'under_review' | 'published' | 'not_added';

export interface SubmissionInput {
  sourceUrl: string;
  description: string;
  note: string;
  consent: Consent;
}

export interface Submission {
  id: string;
  sourceUrl: string | null;
  description: string | null;
  note: string | null;
  status: SubmissionStatus;
  decisionReason: string | null;
  publishedEventId: string | null;
  createdAt: string;
}

export interface CoverageGrid {
  cities: string[];
  topics: string[];
  /** counts[city][topic]: upcoming published events; 0 is a gap. */
  counts: Record<string, Record<string, number>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DESCRIPTION_MAX = 5000;
const NOTE_MAX = 1000;
const REASON_MAX = 500;

function fail(error: { code?: string; message?: string }): SupplyError {
  if (error.code === 'PT429') {
    return new SupplyError('rate_limited', 'Too many suggestions right now.');
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return new SupplyError('unauthorized', 'Not allowed.');
  }
  if (error.code?.startsWith('22') || error.code?.startsWith('23')) {
    return new SupplyError('invalid_input', error.message ?? 'Invalid input.');
  }
  return new SupplyError('unavailable', error.message ?? 'Request failed.');
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function createSupplyService(client: SupabaseClient) {
  async function call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isSupplyError(error)) throw error;
      throw new SupplyError(
        'unavailable',
        error instanceof Error ? error.message : 'Request failed.',
      );
    }
  }

  return {
    /** Anyone: suggest an event. Returns what the status link needs. */
    async submit(
      input: SubmissionInput,
    ): Promise<{ id: string; token: string }> {
      const sourceUrl = blank(input.sourceUrl);
      const description = blank(input.description);
      const note = blank(input.note);
      if (!sourceUrl && !description) {
        throw new SupplyError(
          'invalid_input',
          'Add a link to the event or describe it.',
        );
      }
      if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) {
        throw new SupplyError(
          'invalid_input',
          'Links must start with https://',
        );
      }
      if ((description?.length ?? 0) > DESCRIPTION_MAX) {
        throw new SupplyError('invalid_input', 'The description is too long.');
      }
      if ((note?.length ?? 0) > NOTE_MAX) {
        throw new SupplyError('invalid_input', 'The note is too long.');
      }
      const problem = consentProblem(input.consent);
      if (problem) {
        throw new SupplyError(
          'invalid_input',
          problem === 'guardian'
            ? 'Under 18, a parent or guardian must agree.'
            : 'Consent is required to send a suggestion.',
        );
      }
      const consent = consentColumns(input.consent);
      return call(async () => {
        const { data, error } = await client.rpc('submit_event', {
          p_source_url: sourceUrl,
          p_raw_text: description,
          p_note: note,
          p_consent_version: consent.consent_version,
          p_consent_language: consent.consent_language,
          p_age_group: consent.age_group,
          p_guardian_consent: consent.guardian_consent,
        });
        if (error) throw fail(error);
        const row = Array.isArray(data) ? data[0] : null;
        if (!row?.id || !row?.access_token) {
          throw new SupplyError('unavailable', 'No submission was returned.');
        }
        return { id: row.id as string, token: row.access_token as string };
      });
    },

    /** Anyone with the link: the outcome of a suggestion, or null. */
    async status(
      id: string,
      token: string,
    ): Promise<{ status: SubmissionStatus; reason: string | null } | null> {
      if (!UUID.test(id) || !UUID.test(token)) {
        throw new SupplyError(
          'invalid_input',
          'This status link is not valid.',
        );
      }
      return call(async () => {
        const { data, error } = await client.rpc('get_submission_status', {
          submission_id: id,
          submission_token: token,
        });
        if (error) throw fail(error);
        const row = Array.isArray(data) ? data[0] : null;
        return row
          ? {
              status: row.status as SubmissionStatus,
              reason: (row.decision_reason as string | null) ?? null,
            }
          : null;
      });
    },

    /** Curators: suggestions waiting for a decision, oldest first. */
    async listSubmissions(status: SubmissionStatus): Promise<Submission[]> {
      return call(async () => {
        const { data, error } = await client
          .from('submissions')
          .select(
            'id, source_url, raw_text, note, status, decision_reason, published_event_id, created_at',
          )
          .eq('status', status)
          .order('created_at', { ascending: status === 'under_review' })
          .limit(100);
        if (error) throw fail(error);
        return (data ?? []).map((row) => ({
          id: row.id,
          sourceUrl: row.source_url,
          description: row.raw_text,
          note: row.note,
          status: row.status,
          decisionReason: row.decision_reason,
          publishedEventId: row.published_event_id,
          createdAt: row.created_at,
        }));
      });
    },

    /**
     * Curators: decide. "Added" needs the event it became; "not added" needs
     * a reason, which the submitter sees on their status page.
     */
    async decide(
      id: string,
      decision:
        | { status: 'published'; eventId: string }
        | { status: 'not_added'; reason: string },
    ): Promise<void> {
      if (!UUID.test(id)) {
        throw new SupplyError('invalid_input', 'Submission id is not valid.');
      }
      if (
        decision.status === 'published' &&
        !UUID.test(decision.eventId.trim())
      ) {
        throw new SupplyError(
          'invalid_input',
          'Paste the id of the event it became.',
        );
      }
      const reason =
        decision.status === 'not_added' ? blank(decision.reason) : null;
      if (decision.status === 'not_added' && !reason) {
        throw new SupplyError(
          'invalid_input',
          'Give a short reason; the person who suggested it will see it.',
        );
      }
      if ((reason?.length ?? 0) > REASON_MAX) {
        throw new SupplyError('invalid_input', 'The reason is too long.');
      }
      return call(async () => {
        const { data, error } = await client
          .from('submissions')
          .update({
            status: decision.status,
            decision_reason: reason,
            published_event_id:
              decision.status === 'published' ? decision.eventId.trim() : null,
          })
          .eq('id', id)
          .select('id');
        if (error) throw fail(error);
        if (data?.length !== 1) {
          throw new SupplyError(
            'unauthorized',
            'The submission was not updated.',
          );
        }
      });
    },

    /** Curators: upcoming published events per city and topic. */
    async coverage(
      cities: readonly string[],
      topics: readonly string[],
    ): Promise<CoverageGrid> {
      return call(async () => {
        const { data, error } = await client.rpc('curation_coverage');
        if (error) throw fail(error);
        const rows = (Array.isArray(data) ? data : []) as {
          city: string;
          topic_id: string;
          upcoming: number;
        }[];
        const counts: CoverageGrid['counts'] = {};
        for (const city of cities) {
          counts[city] = Object.fromEntries(topics.map((topic) => [topic, 0]));
        }
        for (const row of rows) {
          if (counts[row.city] && row.topic_id in counts[row.city]) {
            counts[row.city][row.topic_id] = row.upcoming;
          }
        }
        return { cities: [...cities], topics: [...topics], counts };
      });
    },
  };
}

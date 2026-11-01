/**
 * Curation use cases. The console calls these; they validate input, apply the
 * event rules, and write through the repository. The database re-checks
 * permissions, transitions and constraints on every write.
 */
import type {
  CheckResult,
  Event,
  EventCheck,
  EventCheckInput,
  EventFormValues,
  EventListQuery,
  EventPage,
  EventReport,
  EventTaxonomy,
  PublicationStatus,
} from '../types/event.type.ts';
import { type CoverImageInput, coverImageInputProblem } from './cover-image.ts';
import { publicationChangeBlocker } from './event-domain.ts';
import type { EventRepository } from './event-repository.ts';
import {
  type EventFieldErrors,
  validateEventInput,
} from './event-validation.ts';

/** Input failed boundary validation. Nothing was written. */
export class EventValidationError extends Error {
  readonly fieldErrors: EventFieldErrors;

  constructor(fieldErrors: EventFieldErrors) {
    super('Some fields need attention.');
    this.name = 'EventValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/** The requested change breaks an event rule. Nothing was written. */
export class EventRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventRuleError';
  }
}

export interface EventCuration {
  list(query?: EventListQuery): Promise<EventPage>;
  get(id: string): Promise<Event>;
  taxonomy(): Promise<EventTaxonomy>;
  create(values: EventFormValues): Promise<Event>;
  /** Saves against the version the curator loaded (`event.updatedAt`). */
  update(event: Event, values: EventFormValues): Promise<Event>;
  changePublication(event: Event, to: PublicationStatus): Promise<Event>;
  /** Records a check with its evidence, then returns the event as saved. */
  recordCheck(
    event: Event,
    check: Omit<EventCheckInput, 'eventId'>,
  ): Promise<{ result: CheckResult; event: Event }>;
  /** Validates the rights and alt text, then uploads (web console). */
  setCoverImage(
    event: Event,
    uploadId: string,
    images: { small: Blob; large: Blob },
    input: CoverImageInput,
  ): Promise<Event>;
  removeCoverImage(event: Event): Promise<Event>;
  checks(eventId: string): Promise<EventCheck[]>;
  reports(eventId: string): Promise<EventReport[]>;
}

export function createEventCuration(
  repository: EventRepository,
  now: () => Date = () => new Date(),
): EventCuration {
  async function validated(values: EventFormValues) {
    const taxonomy = await repository.listTaxonomy();
    const result = validateEventInput(values, taxonomy);
    if (!result.ok) throw new EventValidationError(result.errors);
    return result.value;
  }

  return {
    list: (query) => repository.list(query),
    get: (id) => repository.getById(id),
    taxonomy: () => repository.listTaxonomy(),

    create: async (values) => repository.create(await validated(values)),

    update: async (event, values) =>
      repository.update(event.id, event.updatedAt, await validated(values)),

    changePublication: async (event, to) => {
      const blocker = publicationChangeBlocker(event, to, now());
      if (blocker) throw new EventRuleError(blocker);
      return repository.changePublication(
        event.id,
        event.publicationStatus,
        to,
      );
    },

    recordCheck: async (event, check) => {
      const result = await repository.recordCheck({
        ...check,
        eventId: event.id,
      });
      return { result, event: await repository.getById(event.id) };
    },

    setCoverImage: async (event, uploadId, images, input) => {
      const problem = coverImageInputProblem(input);
      if (problem || !input.rights) {
        throw new EventRuleError(problem ?? 'Say how we may use this image.');
      }
      return repository.setCoverImage(event.id, uploadId, images, {
        rights: input.rights,
        alt: input.alt,
        credit: input.credit,
      });
    },

    removeCoverImage: (event) => repository.removeCoverImage(event.id),

    checks: (eventId) => repository.listChecks(eventId),
    reports: (eventId) => repository.listReports(eventId),
  };
}

/**
 * Curation use cases. The console calls these; they validate input, apply the
 * event rules, and write through the repository. The database re-checks
 * permissions, transitions and constraints on every write.
 */
import type {
  Event,
  EventFormValues,
  EventListQuery,
  EventPage,
  EventTaxonomy,
  PublicationStatus,
  VerificationState,
} from '../types/event.type.ts';
import {
  publicationChangeBlocker,
  verificationChangeBlocker,
} from './event-domain.ts';
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
  recordVerification(event: Event, to: VerificationState): Promise<Event>;
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

    recordVerification: async (event, to) => {
      const blocker = verificationChangeBlocker(event, to);
      if (blocker) throw new EventRuleError(blocker);
      return repository.recordVerification(event.id, to);
    },
  };
}

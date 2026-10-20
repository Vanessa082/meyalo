import type { FriendAnswer } from './friend-plans.ts';
import type { KeyValueStore } from './key-value-store.ts';

/**
 * A friend's own answers, kept in their browser or phone so they can change
 * or remove them: the answer token, their first name and answer, per plan.
 */
export const FRIEND_ANSWERS_KEY = 'meyalo.friendAnswers.v1';

export interface MyFriendAnswer {
  responseToken: string;
  firstName: string;
  answer: FriendAnswer;
}

type Stored = Record<string, MyFriendAnswer>;

function isAnswer(value: unknown): value is MyFriendAnswer {
  const item = value as Partial<MyFriendAnswer> | null;
  return (
    !!item &&
    typeof item.responseToken === 'string' &&
    typeof item.firstName === 'string' &&
    (item.answer === 'in' || item.answer === 'maybe' || item.answer === 'cant')
  );
}

export function createFriendAnswersStore(store: KeyValueStore) {
  async function read(): Promise<Stored> {
    const raw = await store.getItem(FRIEND_ANSWERS_KEY);
    if (!raw) return {};
    try {
      const value = JSON.parse(raw) as unknown;
      return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Stored)
        : {};
    } catch {
      return {};
    }
  }
  return {
    async get(planToken: string): Promise<MyFriendAnswer | null> {
      const item = (await read())[planToken];
      return isAnswer(item) ? item : null;
    },
    async set(planToken: string, answer: MyFriendAnswer): Promise<void> {
      const all = await read();
      await store.setItem(
        FRIEND_ANSWERS_KEY,
        JSON.stringify({ ...all, [planToken]: answer }),
      );
    },
    async remove(planToken: string): Promise<void> {
      const { [planToken]: _gone, ...rest } = await read();
      await store.setItem(FRIEND_ANSWERS_KEY, JSON.stringify(rest));
    },
  };
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { memoryStore } from './key-value-store.ts';
import {
  createReminderSetting,
  REMINDER_SETTING_KEY,
} from './reminder-setting.ts';

const NOW = new Date('2026-10-19T08:00:00Z');

describe('reminders setting on this phone', () => {
  it('is unanswered until the person chooses, then keeps the time', async () => {
    const setting = createReminderSetting(memoryStore(), () => NOW);
    assert.equal(await setting.get(), null);
    await setting.set(false);
    assert.deepEqual(await setting.get(), {
      on: false,
      changedAt: NOW.toISOString(),
    });
  });

  it('reads an unreadable value as off, never as on', async () => {
    for (const bad of ['{nope', '{"on":"yes"}', 'true']) {
      const store = memoryStore({ [REMINDER_SETTING_KEY]: bad });
      assert.deepEqual(
        await createReminderSetting(store, () => NOW).get(),
        { on: false, changedAt: null },
        bad,
      );
    }
  });
});

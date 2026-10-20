import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decorativeVideoAllowed } from './decorative-video.ts';

describe('decorativeVideoAllowed', () => {
  it('plays on 3G: the clip is about 110 KB', () => {
    assert.equal(
      decorativeVideoAllowed({ reduceMotion: false, effectiveType: '3g' }),
      true,
    );
  });

  it('plays on a normal connection with motion allowed', () => {
    assert.equal(decorativeVideoAllowed({ reduceMotion: false }), true);
    assert.equal(
      decorativeVideoAllowed({ reduceMotion: false, effectiveType: '4g' }),
      true,
    );
  });

  it('never plays when the person asked for less motion', () => {
    assert.equal(decorativeVideoAllowed({ reduceMotion: true }), false);
  });

  it('never plays in data-saving mode or on slow connections', () => {
    assert.equal(
      decorativeVideoAllowed({ reduceMotion: false, saveData: true }),
      false,
    );
    for (const effectiveType of ['slow-2g', '2g']) {
      assert.equal(
        decorativeVideoAllowed({ reduceMotion: false, effectiveType }),
        false,
        effectiveType,
      );
    }
  });
});

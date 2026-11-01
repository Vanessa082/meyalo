import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { coverImageFiles, coverImageInputProblem } from './cover-image.ts';

describe('coverImageInputProblem', () => {
  const valid = {
    rights: 'organizer_provided' as const,
    alt: 'A speaker on stage with a microphone',
    credit: null,
  };

  it('accepts rights and alt text, with or without a credit', () => {
    assert.equal(coverImageInputProblem(valid), null);
    assert.equal(
      coverImageInputProblem({ ...valid, credit: 'Photo: GDG Douala' }),
      null,
    );
  });

  it('requires the right to use the image', () => {
    assert.match(
      coverImageInputProblem({ ...valid, rights: null }) ?? '',
      /right to use/i,
    );
  });

  it('requires alt text of 3 to 200 characters', () => {
    assert.match(
      coverImageInputProblem({ ...valid, alt: '  ' }) ?? '',
      /describe/i,
    );
    assert.match(
      coverImageInputProblem({ ...valid, alt: 'x'.repeat(201) }) ?? '',
      /200/,
    );
  });

  it('keeps the credit short', () => {
    assert.match(
      coverImageInputProblem({ ...valid, credit: 'x'.repeat(121) }) ?? '',
      /120/,
    );
  });
});

describe('coverImageFiles', () => {
  it('stores both sizes under the event, with a fresh name each time', () => {
    assert.deepEqual(coverImageFiles('evt-1', 'abc'), {
      path: 'evt-1/abc',
      small: 'evt-1/abc-640.webp',
      large: 'evt-1/abc-1600.webp',
    });
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Consent } from '../types/consent.type.ts';
import { consentColumns, consentProblem } from './consent.ts';

const adult: Consent = {
  version: '2026-10-19',
  language: 'fr',
  ageGroup: '18_plus',
  guardianConsent: false,
};

describe('consent record', () => {
  it('accepts an adult and a minor with a guardian', () => {
    assert.equal(consentProblem(adult), null);
    assert.equal(
      consentProblem({ ...adult, ageGroup: 'under_18', guardianConsent: true }),
      null,
    );
  });

  it('refuses a minor without a guardian, and incomplete records', () => {
    assert.equal(
      consentProblem({ ...adult, ageGroup: 'under_18' }),
      'guardian',
    );
    assert.equal(consentProblem({ ...adult, version: '' }), 'invalid');
    assert.equal(
      consentProblem({ ...adult, version: 'x'.repeat(41) }),
      'invalid',
    );
    assert.equal(
      consentProblem({ ...adult, language: 'de' as never }),
      'invalid',
    );
    assert.equal(
      consentProblem({ ...adult, ageGroup: 'adult' as never }),
      'invalid',
    );
    assert.equal(consentProblem(undefined as never), 'invalid');
  });

  it('maps to the database columns, guardian only for minors', () => {
    assert.deepEqual(consentColumns(adult), {
      consent_version: '2026-10-19',
      consent_language: 'fr',
      age_group: '18_plus',
      guardian_consent: null,
    });
    assert.equal(
      consentColumns({ ...adult, ageGroup: 'under_18', guardianConsent: true })
        .guardian_consent,
      true,
    );
  });
});

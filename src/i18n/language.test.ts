import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolveAppLanguage } from './language.ts';
import {
  readExplicitLanguage,
  writeExplicitLanguage,
} from './language-store.ts';
import { catalogKeyPaths, lookupTranslation } from './translate.ts';

describe('resolveAppLanguage', () => {
  it('uses English for an English device when nothing is saved', () => {
    assert.equal(resolveAppLanguage('en', null), 'en');
    assert.equal(resolveAppLanguage('en-US', null), 'en');
  });

  it('uses French for a French device', () => {
    assert.equal(resolveAppLanguage('fr', null), 'fr');
    assert.equal(resolveAppLanguage('fr-CM', null), 'fr');
  });

  it('uses French for any other device language', () => {
    assert.equal(resolveAppLanguage('de', null), 'fr');
    assert.equal(resolveAppLanguage('ar', null), 'fr');
    assert.equal(resolveAppLanguage(null, null), 'fr');
    assert.equal(resolveAppLanguage('', undefined), 'fr');
  });

  it('lets an explicit choice override the device language', () => {
    assert.equal(resolveAppLanguage('en', 'fr'), 'fr');
    assert.equal(resolveAppLanguage('fr', 'en'), 'en');
    assert.equal(resolveAppLanguage('de', 'en'), 'en');
  });

  it('ignores an invalid stored value and falls back to device rules', () => {
    assert.equal(resolveAppLanguage('en', 'es'), 'en');
    assert.equal(resolveAppLanguage('de', 'yes'), 'fr');
  });
});

describe('explicit language persistence', () => {
  it('round-trips a saved choice and ignores corrupt storage', async () => {
    const memory = new Map<string, string>();
    const store = {
      getItem: async (key: string) => memory.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        memory.set(key, value);
      },
    };

    assert.equal(await readExplicitLanguage(store), null);
    await writeExplicitLanguage(store, 'en');
    assert.equal(await readExplicitLanguage(store), 'en');

    memory.set('meyalo.locale.v1', 'nope');
    assert.equal(await readExplicitLanguage(store), null);
  });
});

describe('translations', () => {
  const catalogs = {
    en: { tabs: { forYou: 'For You' } },
    fr: { tabs: {} },
  };

  it('returns the string for the requested language', () => {
    assert.equal(
      lookupTranslation(
        { en: catalogs.en, fr: { tabs: { forYou: 'Pour Vous' } } },
        'tabs.forYou',
        'fr',
      ),
      'Pour Vous',
    );
  });

  it('falls back to English when the French string is missing', () => {
    assert.equal(lookupTranslation(catalogs, 'tabs.forYou', 'fr'), 'For You');
  });

  it('returns the key when neither catalog has it', () => {
    assert.equal(
      lookupTranslation(catalogs, 'missing.key', 'en'),
      'missing.key',
    );
  });

  it('keeps French and English catalogs on the same keys', () => {
    const en = JSON.parse(
      readFileSync(new URL('./messages/en.json', import.meta.url), 'utf8'),
    );
    const fr = JSON.parse(
      readFileSync(new URL('./messages/fr.json', import.meta.url), 'utf8'),
    );
    assert.deepEqual(catalogKeyPaths(en).sort(), catalogKeyPaths(fr).sort());
    assert.equal(en.tabs.forYou, 'For You');
    assert.equal(fr.tabs.forYou, 'Pour Vous');
  });
});

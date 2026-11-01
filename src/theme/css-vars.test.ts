import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Colors } from './colors.ts';
import { cssVar, themeStylesheet, webColors } from './css-vars.ts';

describe('web theme variables', () => {
  it('names one variable per colour role', () => {
    assert.equal(cssVar('textMuted'), '--meyalo-text-muted');
    for (const key of Object.keys(Colors.light)) {
      assert.equal(
        webColors[key as keyof typeof webColors],
        `var(${cssVar(key)})`,
      );
    }
  });

  it('defines every role for light, and for dark inside the media query', () => {
    const css = themeStylesheet();
    const [light, dark] = css.split('@media (prefers-color-scheme: dark)');
    assert.ok(dark, 'has a dark block');
    for (const [key, value] of Object.entries(Colors.light)) {
      assert.ok(light.includes(`${cssVar(key)}:${value};`), key);
    }
    for (const [key, value] of Object.entries(Colors.dark)) {
      assert.ok(dark.includes(`${cssVar(key)}:${value};`), key);
    }
  });

  it('lets one part of the page force the dark palette', () => {
    const css = themeStylesheet();
    const forced = css.split('[data-theme="dark"]')[1];
    assert.ok(forced, 'has a forced-dark rule');
    for (const [key, value] of Object.entries(Colors.dark)) {
      assert.ok(forced.includes(`${cssVar(key)}:${value};`), key);
    }
    // After the media query, so it wins for people in light mode too.
    assert.ok(
      css.indexOf('[data-theme="dark"]') >
        css.indexOf('@media (prefers-color-scheme: dark)'),
    );
  });

  it('paints the page background before any script runs', () => {
    const css = themeStylesheet();
    assert.match(css, /color-scheme:light dark/);
    assert.match(css, /html,body\{background-color:var\(--meyalo-background\)/);
  });
});

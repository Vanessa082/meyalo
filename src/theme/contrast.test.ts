import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Colors } from './colors.ts';
import { contrastRatio } from './contrast.ts';

type Role = keyof typeof Colors.light;

/** [text, background] pairs that appear in the interface. */
const TEXT_PAIRS: [Role, Role][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'primarySoft'],
  ['text', 'surfaceSunken'],
  ['textSecondary', 'background'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceSunken'],
  ['textLink', 'background'],
  ['textLink', 'surface'],
  ['onPrimary', 'actionPrimary'],
  ['onPrimary', 'actionPrimaryPressed'],
  ['warningText', 'background'],
  ['warningText', 'warningSoft'],
  ['error', 'background'],
  ['error', 'errorSoft'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['success', 'surface'],
  ['textInverse', 'text'],
  ['onSelected', 'selected'],
  ['textMuted', 'surfaceSecondary'],
  ['highlight', 'background'],
  ['highlight', 'surface'],
  ['highlight', 'highlightSoft'],
  ['onHighlight', 'highlight'],
  ['text', 'highlightSoft'],
  // The brand gradient behind button and chip text: both ends must pass.
  ['onPrimary', 'gradientStart'],
  ['onPrimary', 'gradientEnd'],
  ['onSelected', 'gradientStart'],
  ['onSelected', 'gradientEnd'],
];

describe('colour contrast', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [fg, bg] of TEXT_PAIRS) {
      it(`${scheme}: ${fg} on ${bg} meets 4.5:1`, () => {
        const ratio = contrastRatio(Colors[scheme][fg], Colors[scheme][bg]);
        assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
      });
    }
  }

  it('computes known ratios', () => {
    assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0');
    assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  });
});

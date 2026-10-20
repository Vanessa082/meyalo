import { Colors, type ThemeColors } from './colors.ts';

/**
 * The web theme as CSS custom properties. The static HTML is rendered before
 * any script knows the visitor's colour scheme; with colours as `var()`
 * references and both palettes defined in the page head, the browser picks
 * light or dark itself, so a refresh never flashes the wrong theme.
 * Native apps keep plain colour values (hooks/use-theme.ts).
 */

type Role = keyof ThemeColors;

/** `textMuted` -> `--meyalo-text-muted` */
export function cssVar(role: string): string {
  return `--meyalo-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Every role as a `var()` reference; the value follows the scheme. */
export const webColors = Object.fromEntries(
  Object.keys(Colors.light).map((role) => [role, `var(${cssVar(role)})`]),
) as ThemeColors;

function declarations(colors: ThemeColors): string {
  return (Object.keys(colors) as Role[])
    .map((role) => `${cssVar(role)}:${colors[role]};`)
    .join('');
}

/** For the page head: both palettes, the dark one under the media query. */
export function themeStylesheet(): string {
  return [
    `:root{color-scheme:light dark;${declarations(Colors.light)}}`,
    `@media (prefers-color-scheme: dark){:root{${declarations(Colors.dark)}}}`,
    // ForceDark (components/ui/force-dark) marks a subtree that must stay
    // dark, e.g. text over the welcome video.
    `[data-theme="dark"]{color-scheme:dark;${declarations(Colors.dark)}}`,
    `html,body{background-color:var(${cssVar('background')});}`,
  ].join('');
}

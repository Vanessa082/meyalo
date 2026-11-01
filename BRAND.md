# Meyalo Design System & Brand Guidelines

This document contains the guidelines and technical documentation for the reconstructed **Meyalo** brand asset system.

---

## 1. Visual Identity & Brand Assets

All branding assets are generated and stored in `assets/brand/`. For a comprehensive file manifest, usage guide, and platform integration instructions, see [assets/README.md](assets/README.md).

### Directory Layout
```plaintext
assets/brand/
├── master/                      # Source SVG templates (high-res vector)
│   ├── meyalo-mark.svg          # Canonical symbol
│   ├── meyalo-wordmark.svg      # proprietary vector lettering
│   ├── meyalo-horizontal.svg    # Primary logo lockup
│   └── meyalo-stacked.svg       # Stacked logo lockup
├── mark/                        # Monochromatic Symbol SVG + PNG variants
│   ├── meyalo-mark-brand.svg    # Brand blue (#075EEB), on light backgrounds
│   ├── meyalo-mark-brand-bright.svg # Brand bright (#5B9BFF), on dark backgrounds
│   ├── meyalo-mark-ink.svg      # Ink (#111312)
│   ├── meyalo-mark-white.svg    # White (#FFFFFF)
│   ├── meyalo-mark-black.svg    # Black (#000000)
│   ├── meyalo-mark-brand-*.png  # Downscaled PNGs (16px to 1024px)
│   └── meyalo-mark-brand-bright-*.png # Downscaled PNGs (16px to 1024px)
├── logo/                        # Lockup SVG + PNG variants
│   ├── horizontal/              # Horizontal lockup (green mark + ink text; all-white for dark)
│   └── stacked/                 # Stacked lockup (Light & Dark variants)
├── app-icon/                    # App Store / Google Play and Adaptive icons
│   ├── app-icon-*.png           # App icon variations (16px to 1024px)
│   ├── ios-icon-1024.png        # iOS App Store master (no transparency)
│   ├── adaptive-icon-foreground.png # Android adaptive foreground (safe zone padded)
│   └── monochrome-icon.png      # Android themed icon (monochrome)
├── favicon/                     # Web browser favicon files
│   ├── favicon.ico              # Combined multi-size ICO
│   ├── favicon-*.png            # Standalone PNGs
│   └── apple-touch-icon.png     # Apple touch icon (180x180)
├── social/                      # Social avatars
│   └── avatar-*.png             # Rounded avatars (400, 512, 1024px)
└── splash/                      # Native splash screens
    ├── splash-light.png         # Light mode splash (canvas bg + green mark)
    └── splash-dark.png          # Dark mode splash (ink bg + brand-bright mark)
```

---

## 2. Colour, type and shape (rebrand 2026-10-18)

Inspired by learning.md: palette, type and shape only. No third-party logos or imagery.
Source of truth: `src/theme/colors.ts` (semantic roles), checked by `src/theme/contrast.test.ts`.
Ratios below are computed with `src/theme/contrast.ts`.

Black, white and one brand colour, blue (owner's decision, 2026-10-19, after
trying lime, green and a violet third colour). Like Meta's apps: neutral
everywhere, one colour for brand, action and selection. The brand colour is set
once in `src/theme/colors.ts` (`Palette.brand*`); names never say the hue.

| Name | Hex | Role | Contrast |
| :--- | :--- | :--- | :--- |
| **Brand blue** | `#075EEB` (gradient `#0866FF` to `#0055D4` on filled surfaces) | Primary buttons and selected chips (white text), links, the date on cards, the organiser-confirmed seal, on light | white on blue 5.8:1 |
| **Brand bright** | `#5B9BFF` | The same roles on dark (ink text on its fills) | 6.7:1 on ink |
| **Ink** | `#111312` | Text on light, background on dark | 18.6:1 on white |
| **White** | `#FFFFFF` | Background on light | n/a |
| **Greys** | `#F0F0F0`, `#E4E4E4`, `#D9D9D9`, `#3A3B3B`, `#5E6160` | Surfaces, borders, secondary and muted text; the source-confirmed seal | checked in contrast.test.ts |
| **Dark surfaces** | `#1B1D1C` / `#242625` | Cards, chips and inputs on dark | n/a |
| **Signal amber** | `#C76A10` | Warning only (text uses `#9A4F08`) | 3.5:1 on white |
| **Critical** | `#B42318` | Errors and cancellations only | 6.1:1 on white |

Rules:
- One colour: blue. Amber and red mean warning and error, never decoration.
- On dark, brand bright takes every brand role.
- Selected state is the same everywhere: a blue pill.
- Event cards without a photo are white (dark grey on dark) with the date as the picture: a big blue day number, month and weekday under it. No coloured tiles, no decorative icons. A real photo replaces it.
- Verified seal: blue when the organiser confirmed, grey when confirmed at the official source, always with its words.
- Status is never carried by colour alone (icons, shapes and words too).

**Type:** Manrope (`@expo-google-fonts/manrope`). Display and title1 use ExtraBold 800 with tight negative tracking; body is Regular. Scale in `src/theme/typography.ts`; 12px is the floor.

**Shape:** buttons are pills (`Radius.button`), cards and inputs 12px, sheets 20px top corners.

**App icon, avatar:** brand-bright mark on ink. Favicon: brand mark. Light splash: brand mark on white. Dark splash: brand-bright mark on ink.

**Icons in the UI:** lucide line icons, 24px, stroke 1.8, tinted by theme roles (tab bar: House, Compass, MapPin, Calendar, User; `primary` active, `textMuted` inactive).

**Regenerating assets:** `python3 scripts/generate-assets.py` renders every PNG from the SVG masters with cairosvg and Pillow (`pip install cairosvg pillow`).

---

## 3. Layout and spacing rules

- **Box model: a component owns its inside, the parent owns the outside.** Components set padding and border, never an outer margin. Space between siblings comes from the parent's `gap` (use `Stack`).
- **Only the 4px scale** below, through `Spacing.*`. No raw numbers for padding, margin or gap.
- **Every screen uses `Page`** (`src/components/ui/page.tsx`): safe area, the gutter from `useGutter` (16, 20 on wider phones), a centred maximum width (`readable` 560 for text and forms, `wide` 800 for lists), 16 top and 32 bottom padding, and 24 between page sections. Full-width images go in its `hero` slot.
- **Tab screens start with `PageHeader`** (title, optional one-line purpose).
- **Inside a section:** 12 between items, 4 between a title and its supporting line.
- **Touch targets are at least 44** (`TouchTargets.minimum`), including chips, icon buttons and the city selector.
- **Type comes from the scale only** (12px floor). The one exception is text inputs at 16px, which stops iOS zooming into the field.

## 4. Spacing Scale (4px Grid)

All component padding, margin, and gap properties must align to the following scale:

```typescript
export const Spacing = {
  none: 0,
  xxs: 2,   // Micro alignment
  xs: 4,    // Borders, badges
  sm: 8,    // Inner item spacing
  md: 12,   // Cards, form inputs
  lg: 16,   // Grid gap, page margin
  xl: 20,   // Section gap
  xxl: 24,  // Header spacing
  xxxl: 32, // Large blocks
  xxxxl: 40,
  xxxxxl: 48,
};
```

---

## 5. Map markers

Defined in `src/theme/markers.ts` and derived from the semantic colours, so they follow the theme. Each state differs by shape and icon as well as colour.

---

## 6. Components

- `BrandLogo` (`src/components/ui/brand-logo.tsx`): `variant="horizontal" | "mark"`, `size="sm" | "md" | "lg"`. Drawn as vector from the masters (`brand-paths.ts`): mark in `brandMark` (brand on light, brand bright on dark), lettering in `text`. Never use the PNG lockups inside the app; they are for stores, web and print.
- `Text` (`src/components/ui/text.tsx`): the typography component for new code (`variant`, `tone`). The older `ThemeText` reads the same tokens and is being retired.

## Welcome video

`public/media/welcome-loop.webm` (107 KB) and `.mp4` (121 KB), with the still
`assets/brand/motion/welcome-still.webp`. Source: "Woman Talking While Holding
a Microphone" by Pavel Danilyuk on Pexels
(https://www.pexels.com/video/woman-talking-while-holding-a-microphone-8716788/),
Pexels licence (free, no attribution required; credited here anyway). Licence
limits: never suggest the person endorses Meyalo, never show her in a bad light,
so no quotes or claims over the video.

Where it plays: on the web from `public/media` (gated: Reduce Motion, data
saver, 2G; loaded after the page). On phones from
`assets/brand/motion/welcome-loop.mp4`, bundled in the app with `expo-video`
(muted, mixes with other audio, no picture-in-picture); only Reduce Motion
stops it there, because playing it downloads nothing. Cut: 0.3 s to 6.1 s, blended into the
first 0.3 s for the loop, 640x360, VP9 crf 40 and H.264 crf 28, no audio.

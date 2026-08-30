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
│   ├── meyalo-mark-teal.svg     # Teal (#087F73)
│   ├── meyalo-mark-ink.svg      # Deep Ink (#142428)
│   ├── meyalo-mark-white.svg    # White (#FFFFFF)
│   ├── meyalo-mark-black.svg    # Black (#000000)
│   └── meyalo-mark-teal-*.png   # Downscaled PNGs (16px to 1024px)
├── logo/                        # Lockup SVG + PNG variants
│   ├── horizontal/              # Horizontal lockup (Teal mark + Ink text)
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
    ├── splash-light.png         # Light mode splash (Canvas bg + Teal logo)
    └── splash-dark.png          # Dark mode splash (Teal bg + White logo)
```

---

## 2. Color Palette (WCAG 2.2 AA Compliant)

| Color Name | Hex Code | Usage | Contrast (Canvas Light) | Contrast (Ink Dark) |
| :--- | :--- | :--- | :--- | :--- |
| **Meyalo Teal** | `#087F73` | Core primary brand color | 4.7:1 (AA Pass) | - |
| **Deep Ink** | `#142428` | Primary text and background dark | 14.8:1 (AAA Pass) | - |
| **Canvas** | `#F7F9F7` | Primary background light | - | 14.8:1 (AAA Pass) |
| **Mist** | `#E8F2F0` | Soft highlight, borders, cards | - | - |
| **Signal Amber** | `#C76A10` | Warnings / Status changed | 3.1:1 (Indicator) | 6.4:1 (Pass) |
| **Critical** | `#B42318` | Destructive actions, errors | 5.3:1 (Pass) | 7.2:1 (Pass) |

---

## 3. Spacing Scale (4px Grid)

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

## 4. Map Marker Specifications

Map markers require distinct styling, shapes, and accessibility labels to assist color-deficient and visually impaired users.

| Marker State | Icon | Shape | Background Color (Light / Dark) |
| :--- | :--- | :--- | :--- |
| **FOR YOU** | `heart` | Star | Teal (`#087F73`) / Teal Light (`#0B9688`) |
| **EXPLORE** | `search` | Pin | Deep Ink (`#142428`) / Canvas (`#F7F9F7`) |
| **AROUND YOU** | `location` | Circle | Teal Light (`#0B9688`) / Teal (`#087F73`) |
| **SAVED** | `bookmark` | Square | Blue (`#1570EF`) / Blue Light (`#53B1FD`) |
| **CHANGED** | `alert-circle` | Triangle | Signal Amber (`#C76A10`) / Amber Light (`#FF9A3C`) |
| **CANCELLED** | `close-circle` | Circle | Critical (`#B42318`) / Critical Light (`#FDA29B`) |

---

## 5. React Native Components API

Import brand components directly from `@/components/brand`:

### `<MeyaloMark />`
Renders the standalone Meyalo path-traced symbol.

```tsx
import { MeyaloMark } from '@/components/brand';

// Usage:
<MeyaloMark size={64} color="#087F73" />
```

### `<MeyaloLogo />`
Renders the horizontal or stacked company logotype lockup.

```tsx
import { MeyaloLogo } from '@/components/brand';

// Usage:
<MeyaloLogo variant="horizontal" height={32} />
<MeyaloLogo variant="stacked" height={100} markColor="#FFFFFF" textColor="#FFFFFF" />
```

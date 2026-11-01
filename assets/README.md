# Meyalo Asset System Guide & Documentation

This directory contains the full visual asset suite for the **Meyalo** application across mobile (iOS & Android), Web, and native app store platforms.

---

## Table of Contents
1. [Overview & Strategy](#1-overview--strategy)
2. [Asset Directory Architecture](#2-asset-directory-architecture)
3. [Detailed File Manifest & Usage](#3-detailed-file-manifest--usage)
   - [Root Assets (`assets/`)](#a-root-assets-assets)
   - [Production Brand Suite (`assets/brand/`)](#b-production-brand-suite-assetsbrand)
   - [App Images & Micro-Icons (`assets/images/`)](#c-app-images--micro-icons-assetsimages)
   - [Xcode Asset Catalog (`assets/expo.icon/`)](#d-xcode-asset-catalog-assetsexpoicon)
4. [How & When to Use Each Asset in Code](#4-how--when-to-use-each-asset-in-code)
   - [React Native / Expo UI Components](#react-native--expo-ui-components)
   - [App Manifest Configuration (`app.json`)](#app-manifest-configuration-appjson)
   - [Web / HTML Head Integration](#web--html-head-integration)
5. [Best Practices & SVG vs PNG Guidelines](#5-best-practices--svg-vs-png-guidelines)

---

## 1. Overview & Strategy

Meyalo uses a **dual asset system**:
1. **Vector Components (SVGs & React Native SVG)**: Used inside active UI components (`MeyaloMark`, `MeyaloLogo`) for infinite scaling, resolution independence, and dynamic light/dark mode color shifting.
2. **Raster Bundles (PNGs & ICOs)**: Pre-rendered at exact pixel sizes for native OS integration (iOS App Store, Android Adaptive Icons, Web Favicons, and Native Splash Screens).

---

## 2. Asset Directory Architecture

```plaintext
assets/
├── icon.png                         # Master App Icon (1024x1024)
├── adaptive-icon.png                # Android Adaptive Foreground (432x432, transparent bg)
├── splash-icon.png                  # Splash Screen Mark (512x512)
├── favicon.png                      # Web Favicon (48x48)
│
├── brand/                           # Production Brand Master System
│   ├── master/                      # Master SVG source files
│   │   ├── meyalo-mark.svg          # Canonical symbol (512x512)
│   │   ├── meyalo-wordmark.svg      # Proprietary vector lettering (400x100)
│   │   ├── meyalo-horizontal.svg    # Combined horizontal lockup (520x100)
│   │   └── meyalo-stacked.svg       # Combined stacked lockup (400x320)
│   ├── mark/                        # Standalone Symbol variants
│   │   ├── meyalo-mark-green.svg     # Forest green (#1C6B4A)
│   │   ├── meyalo-mark-white.svg    # White (#FFFFFF) for dark backgrounds
│   │   ├── meyalo-mark-ink.svg      # Deep Ink (#111312) for light backgrounds
│   │   ├── meyalo-mark-black.svg    # Monochrome Black (#000000)
│   │   └── meyalo-mark-*-*.png      # PNG steps (16px to 1024px)
│   ├── logo/                        # Full Brand Lockup variants
│   │   ├── horizontal/              # Horizontal (green mark + ink text)
│   │   └── stacked/                 # Stacked (Light and Dark mode)
│   ├── app-icon/                    # Platform App Icons
│   │   ├── app-icon-*.png           # Multi-resolution square app icons
│   │   ├── ios-icon-1024.png        # Apple App Store submission master
│   │   ├── adaptive-icon-foreground.png # Android adaptive layer (transparent bg)
│   │   └── monochrome-icon.png      # Android 13+ themed icon mask
│   ├── favicon/                     # Web browser icons
│   │   ├── favicon.ico              # Combined multi-size browser favicon
│   │   ├── favicon-16x16.png        # Standard web tab icon
│   │   ├── favicon-32x32.png        # High-DPI browser tab icon
│   │   ├── favicon-48x48.png        # Desktop web shortcut icon
│   │   ├── icon-192.png & icon-512.png # PWA web app manifest icons
│   │   └── apple-touch-icon.png     # iOS Safari bookmark icon (180x180)
│   ├── social/                      # Social media profiles & avatars
│   │   └── avatar-*.png             # Profile pictures (400, 512, 1024px)
│   └── splash/                      # Native mobile splash screens
│       ├── splash-light.png         # Light mode splash (canvas bg + green mark)
│       └── splash-dark.png          # Dark mode splash (ink bg + lime mark)
│
├── images/                          # Native build fallback references
│   ├── android-icon-background.png  # Android background fill (#1C6B4A)
│   ├── android-icon-foreground.png  # Android foreground symbol
│   ├── android-icon-monochrome.png  # Android monochrome mask
│   └── tabIcons/                    # Navigation bar tab bar icons
│
└── expo.icon/                       # Xcode 15+ App Icon Composer Catalog
    ├── icon.json                    # Apple Asset catalog specification
    └── Assets/
        ├── expo-symbol 2.svg        # Apple App Store vector symbol
        └── grid.png                 # Developer alignment layout grid
```

---

## 3. Detailed File Manifest & Usage

### A. Root Assets (`assets/`)

| File Name | Dimensions | Purpose & Usage |
| :--- | :--- | :--- |
| `assets/icon.png` | 1024×1024 | Default app icon fallback for general build tooling. |
| `assets/adaptive-icon.png` | 432×432 | Android adaptive icon foreground layer (transparent background). |
| `assets/splash-icon.png` | 512×512 | Centered mark used during app initialization. |
| `assets/favicon.png` | 48×48 | Web browser tab icon. |

---

### B. Production Brand Suite (`assets/brand/`)

#### 1. `assets/brand/master/`
* **`meyalo-mark.svg`**: Pure vector definition of the Meyalo M symbol. Use as master source for vector editors or SVG converters.
* **`meyalo-wordmark.svg`**: Proprietary vector lettering of the "meyalo" brand logotype.
* **`meyalo-horizontal.svg`**: Full horizontal lockup (Symbol on left, lettering on right).
* **`meyalo-stacked.svg`**: Stacked lockup (Symbol centered above lettering).

#### 2. `assets/brand/mark/`
* **`meyalo-mark-green.svg` / `.png`**: Primary brand mark (`#1C6B4A`). Best used on light backgrounds (`#F5F7F1`, `#FFFFFF`).
* **`meyalo-mark-white.svg` / `.png`**: White mark (`#FFFFFF`). Best used on dark backgrounds (`#111312`, `#1C6B4A`).
* **`meyalo-mark-lime.svg` / `.png`**: Lime mark (`#E8FF52`). The default mark on dark backgrounds (`#111312`).
* **`meyalo-mark-ink.svg` / `black.svg`**: Deep Ink and Black monochromatic marks for print or high-contrast UI modes.

#### 3. `assets/brand/app-icon/`
* **`ios-icon-1024.png`**: Master 1024×1024 PNG with pre-baked `#1C6B4A` forest-green background and lime mark. Required by Apple App Store Connect.
* **`adaptive-icon-foreground.png`**: 432×432 PNG with **100% transparent background**. Android places this over `backgroundColor: "#1C6B4A"` and clips it to the system squircle/circle.
* **`monochrome-icon.png`**: Android 13+ Material You themed app icon mask.
* **`app-icon-*.png`**: Downscaled steps (16px to 512px) for custom app launcher stores.

#### 4. `assets/brand/favicon/`
* **`favicon.ico`**: Combined binary icon for legacy desktop browsers (`IE`, `Old Edge`, `Safari`).
* **`apple-touch-icon.png`**: 180×180 PNG formatted for iOS Safari "Add to Home Screen".
* **`icon-192.png` & `icon-512.png`**: Web App Manifest icons for Progressive Web App (PWA) installation.

#### 5. `assets/brand/splash/`
* **`splash-light.png`**: Light mode native splash screen (`#F5F7F1` background with centered green mark).
* **`splash-dark.png`**: Dark mode native splash screen (`#111312` background with centered lime mark).

---

## 4. How & When to Use Each Asset in Code

### React Native / Expo UI Components

Do **NOT** load raster images (`.png`) inside React Native screens if a vector component exists! Use the built-in React Native SVG components for maximum sharpness:

```tsx
import { MeyaloMark, MeyaloLogo } from '@/components/brand';

// 1. Header or Navigation Bar (Horizontal Logo)
export function Header() {
  return <MeyaloLogo variant="horizontal" height={32} />;
}

// 2. Profile Avatar / Splash Overlay (Standalone Mark)
export function ProfileBadge() {
  return <MeyaloMark size={48} color="#1C6B4A" />;
}

// 3. Footer or Welcome Hero (Stacked Logo)
export function HeroBanner() {
  return (
    <MeyaloLogo
      variant="stacked"
      height={120}
      markColor="#FFFFFF"
      textColor="#FFFFFF"
    />
  );
}
```

---

### App Manifest Configuration (`app.json`)

Expo automatically reads the raster assets from `assets/brand/` to configure native builds for iOS and Android:

```json
{
  "expo": {
    "name": "meyalo",
    "slug": "meyalo",
    "icon": "./assets/brand/app-icon/app-icon-1024.png",
    "ios": {
      "icon": "./assets/brand/app-icon/ios-icon-1024.png"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#1C6B4A",
        "foregroundImage": "./assets/brand/app-icon/adaptive-icon-foreground.png",
        "monochromeImage": "./assets/brand/app-icon/monochrome-icon.png"
      }
    },
    "web": {
      "favicon": "./assets/brand/favicon/favicon-32x32.png"
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#F5F7F1",
          "image": "./assets/brand/mark/meyalo-mark-green-512.png",
          "imageWidth": 120,
          "dark": {
            "backgroundColor": "#111312",
            "image": "./assets/brand/mark/meyalo-mark-white-512.png"
          }
        }
      ]
    ]
  }
}
```

---

### Web / HTML Head Integration

For Next.js / Web deployments, reference the favicons in `assets/brand/favicon/`:

```html
<!-- Standard Favicon -->
<link rel="icon" type="image/x-icon" href="/assets/brand/favicon/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon/favicon-32x32.png" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/favicon/apple-touch-icon.png" />

<!-- PWA Web App Manifest -->
<link rel="manifest" href="/manifest.json" />
```

---

## 5. Best Practices & SVG vs PNG Guidelines

| Use Case | Recommended Format | Recommended File | Reason |
| :--- | :--- | :--- | :--- |
| **In-App UI Screens** | **React Component (`.tsx`)** | `<MeyaloMark />` / `<MeyaloLogo />` | Vector crispness, dynamic theme colors, zero pixelation on Retina screens. |
| **App Store Build** | **1024px PNG** | `assets/brand/app-icon/ios-icon-1024.png` | Apple App Store requirements (must be opaque PNG). |
| **Android Launcher Icon** | **432px Transparent PNG** | `assets/brand/app-icon/adaptive-icon-foreground.png` | Allows Android OS to apply adaptive squircle masks cleanly. |
| **Web Browser Tab** | **32px PNG / ICO** | `assets/brand/favicon/favicon-32x32.png` | Lightweight, fast loading, supported by all browsers. |
| **Social Media Profile** | **512px / 1024px PNG** | `assets/brand/social/avatar-512.png` | Perfectly centered mark with high contrast for profile circles. |
| **Native Splash Screen** | **512px PNG + Theme BG** | `assets/brand/mark/meyalo-mark-green-512.png` | Fast initial load before JS engine boots up. |

---
name: drip-mobile
description: Use when building or reviewing anything that runs on a phone or tablet: mobile web, responsive layouts at 390 and below, PWAs, bottom sheets, tab bars, carousels, swipe gestures, full-screen app shells, touch interactions, or native apps (iOS, Android, React Native, Expo, Flutter). Also when something "works in Chrome but feels wrong on my phone" (sticky hover, tap flash, input zoom, 100vh bugs, content under the notch). Part of Drip.
---

# Mobile (Drip)

**Before you do anything: call `drip_guide` with topic `mobile`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Touch targets: 44x44pt on iOS, 48x48dp on Android, 44x44 CSS px on mobile web, with 8px between neighbours. Expand small icons' hit area, not their look.
2. Never disable zoom (`user-scalable=no`, `maximum-scale=1`). Inputs use 16px text so iOS doesn't zoom into them.
3. `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on every fixed or edge-to-edge element: headers, tab bars, sheets, toasts.
4. No `100vh` for full-height layouts: `100dvh` for app shells and sheets, `100svh` for marketing heroes.
5. Every `:hover` rule lives inside `@media (hover: hover) and (pointer: fine)`. Touch gets press feedback through `:active` within 100ms.
6. Remove the tap highlight (`-webkit-tap-highlight-color: transparent`) only after every tappable element has its own pressed state.
7. Primary actions sit in the bottom third, within thumb reach; destructive actions are never the easiest tap.
8. Gestures always have a visible alternative (a button, a menu item). Never block the system back swipe or pull to refresh where the page is a document.
9. Bottom navigation holds 3 to 5 top-level destinations, each a section, never an action. Deeper levels push; self-contained tasks open in a sheet.
10. Body text at least 16px on web (17pt iOS Body, 16sp Android); native type follows Dynamic Type / font scale.
11. Native apps use the platform's controls, navigation and icons (SF Symbols on iOS, Material Symbols on Android); no web-shaped buttons in a native shell.
12. Test on a real phone before calling it done. Emulation misses sticky hover, tap delay, safe areas, the keyboard and scroll physics; say what you could not verify.

## Tools
- `refs_search`, `refs_tag`, `refs_view` — study mobile screens of real apps in the category ("mobile checkout", "ios settings", "bottom sheet").
- `components_find`, `components_get` — sheets/drawers, tab bars, swipe rows and carousels from proven libraries; restyle.
- `fitcheck_shot` — phone and desktop screenshots via Chrome (layout only; it cannot prove touch feel).
- `fitcheck_lint`, `fitcheck_done` — slop checks and the final verdict.
- `icons_search`, `icons_get` — one family; platform icons on native.
- `palette_check` — contrast for both light and dark schemes, and for text over photos on small screens.

## Read deeper when
| Situation | Call |
|---|---|
| The web-on-a-phone layer: viewport, safe areas, hover, tap, inputs, keyboard, scrolling, PWA, testing | `drip_guide mobile/native-feel` |
| Navigation, sheets, gestures, lists, forms, thumb zones and native platform patterns | `drip_guide mobile/patterns` |
| Motion for sheets, swipes and transitions | `drip_guide motion` |
| Phone frames and mockups in marketing images | `drip_guide productshots/frames` |
| Tables, forms and states that also have to work on a phone | `drip_guide app/tables-forms` |
| Focus, screen readers, Dynamic Type and reduced motion | `drip_guide a11y` |

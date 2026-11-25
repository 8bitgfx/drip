---
name: drip-mobile
description: Mobile rules - mobile web, responsive layouts at 390px and below, PWAs, bottom sheets, tab bars, carousels, gestures and native apps (iOS, Android, React Native, Expo, Flutter). Use when something works in Chrome but feels wrong on a phone (sticky hover, tap flash, input zoom, 100vh, notch).
user-invocable: false
---

# Mobile (Drip)

Applies to anything that runs on a phone or tablet. Call `drip_guide mobile` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Touch targets 44x44pt on iOS, 48x48dp on Android, 44x44 CSS px on mobile web, 8px apart.
- Never disable zoom; inputs use 16px text; `viewport-fit=cover` plus `env(safe-area-inset-*)` on fixed elements.
- `100dvh` for app shells, `100svh` for marketing heroes; every `:hover` inside `@media (hover: hover) and (pointer: fine)`.
- Primary actions in the bottom third; gestures always have a visible alternative; test on a real phone.

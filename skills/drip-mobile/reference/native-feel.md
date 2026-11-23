# Mobile: native feel on the web

The platform layer: viewport, touch, scroll, safe areas, keyboard, browser chrome. Each item below is a symptom, its cause, and the smallest fix. Apply a fix where its cause applies, not everywhere out of habit. Prefer CSS and meta tags over JavaScript, and capabilities over device detection.

## Symptom table

| You see | Cause | Fix |
|---|---|---|
| A tapped button stays "hovered" | Touch browsers apply `:hover` on tap and keep it until the next tap elsewhere | Hover rules inside `@media (hover: hover) and (pointer: fine)` |
| Grey/blue flash over tapped elements | Browser tap highlight | `-webkit-tap-highlight-color: transparent` on `html`, plus your own `:active` |
| Bottom button hidden under the toolbar on load | `100vh` equals the height with browser chrome hidden | `100dvh` (shell) or `100svh` (hero) |
| Page zooms into a focused input and stays zoomed | iOS zooms inputs with text under 16px | `font-size: 16px` on inputs |
| Taps feel late | Double-tap-to-zoom delay and feedback on release | `touch-action: manipulation`; style `:active`; act on `pointerdown` for feedback |
| Pulling down in an app reloads the page | Pull to refresh / rubber band on the root | `overscroll-behavior: none` on `html` (app screens only) |
| Scrolling a sheet scrolls the page behind | Scroll chaining | `overscroll-behavior: contain` on the inner scroller |
| Content stops short of the notch with white bars | Default letterboxing | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| Long-press selects a button's label | Text selection on controls | `user-select: none` on controls only |
| Horizontal carousel jitters the page vertically | Browser can't tell which axis you mean | Native scroll-snap, or `touch-action: pan-y` on the swipe surface |
| Status bar colour wrong in dark mode | One `theme-color` for both schemes | One `theme-color` per `prefers-color-scheme` |
| Text grows in landscape | iOS text inflation | `-webkit-text-size-adjust: 100%` |
| Fine in Chrome device mode, wrong on the phone | Emulation doesn't reproduce any of the above | A real device |

## Hover and press

- Gate every hover style by capability: `(hover: hover)` means the main pointer can hover; `(pointer: fine)` means it is precise. Both together exclude touchscreens that claim hover.
- Touch and mouse coexist (iPad with trackpad, touchscreen laptops). Write both states; don't pick one by device.
- Press state on every tappable thing, because removing the tap highlight removed the browser's own feedback:

```css
.btn { transition: transform 120ms cubic-bezier(.2,.8,.2,1), background-color 120ms; }
.btn:active { transform: scale(.97); background: var(--btn-pressed); }
.row:active { background: var(--row-pressed); }          /* lists: fill, no scale */
@media (hover: hover) and (pointer: fine) {
  .btn:hover { background: var(--btn-hover); }
}
@media (prefers-reduced-motion: reduce) { .btn:active { transform: none; } }
```

- iOS Safari has a long history of skipping `:active` on elements with no touch listener; an empty `ontouchstart=""` on `body` (or any `touchstart` listener) restores it. Check the pressed state on a device.

## Height and the browser chrome

- `svh` small, `lvh` large, `dvh` dynamic. Heroes on `svh` (stable, never cut), app shells on `dvh` (tracks the visible area).
- For a chat or composer pinned to the bottom, combine `100dvh` with `interactive-widget=resizes-content` (Chrome Android) and, for iOS, the `visualViewport` API: listen to its `resize` and set a CSS variable for the keyboard offset.
- Don't set heights from `window.innerHeight` on load; it changes as chrome moves.

## Safe areas

```css
.app-header { padding-top: env(safe-area-inset-top); }
.tab-bar   { padding-bottom: max(8px, env(safe-area-inset-bottom)); }
.sheet     { padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
.page      { padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right)); }
```

- Paint backgrounds edge to edge; pad content. Fixed headers, tab bars, toasts, FABs and sheets are the usual suspects.
- Give `env()` a fallback inside `calc()`.
- Landscape on a notched phone adds left and right insets; check once.

## Inputs and the keyboard

| Field | Attributes |
|---|---|
| Email | `type="email" autocomplete="email" autocapitalize="none" autocorrect="off"` |
| Phone | `type="tel" autocomplete="tel"` |
| One-time code | `inputmode="numeric" autocomplete="one-time-code" pattern="\d*"` |
| Amount | `inputmode="decimal"` |
| Search | `type="search" enterkeyhint="search"` |
| Chat composer | `enterkeyhint="send"` |
| Username | `autocapitalize="none" autocorrect="off" spellcheck="false"` |

- 16px minimum text in every input, select and textarea. If desktop wants smaller, apply 16px under `(pointer: coarse)` only.
- The return key says what it does (`enterkeyhint`) and moves to the next field in multi-field forms.
- After focusing, scroll the field into view with room for its label and error; don't fight the browser's own scrolling.
- Date and time: native pickers are good on phones; use `type="date"` unless the design truly needs a custom calendar.

## Scroll

- Root: `overscroll-behavior: none` for app-like screens; leave it for documents where pull to refresh is welcome.
- Inner scrollers: `overscroll-behavior: contain` keeps their own bounce but stops the page moving.
- Momentum scrolling is default on modern iOS; don't add old `-webkit-overflow-scrolling` hacks.
- Scroll-snap for carousels and paged content; `scroll-snap-align: start`, `scroll-padding` for sticky headers.
- Hide horizontal scrollbars only when another affordance (a peeking next card, arrows) shows there is more.

## Gestures and `touch-action`

`touch-action` names what the browser may still do:

| Value | Meaning | Use on |
|---|---|---|
| `manipulation` | Pan and pinch, no double-tap zoom | Buttons, links, everything tappable |
| `pan-y` | Browser keeps vertical scroll; you handle horizontal | Horizontal carousels, swipeable rows |
| `pan-x` | Browser keeps horizontal; you handle vertical | Drag-down sheet handles |
| `none` | You handle everything | Drawing canvases, sliders, map surfaces, a sheet's drag surface |

Use pointer events (`pointerdown/move/up` with `setPointerCapture`), passive listeners where you don't call `preventDefault`, and transform-only movement during drags.

## Status bar, theme and colour scheme

- `theme-color` per scheme, matching the top of the page. Update it from JS if the app toggles theme with a class.
- `color-scheme: light dark` so form controls, scrollbars and the keyboard match.
- For installed PWAs on iOS, `apple-mobile-web-app-status-bar-style` chooses `default`, `black` or `black-translucent` (content under the status bar; pad with the top inset).

## PWA basics

- **Manifest:** `name`, `short_name` (≤ 12 chars), `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color` (the splash), icons at 192 and 512 plus a `maskable` icon with its content inside the central 80%.
- **iOS:** `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` at 180x180; iOS ignores manifest icons for the home screen.
- **Service worker:** cache the app shell for instant start and an offline page; network-first for data with a clear offline state (`drip_guide app/states`). Version caches and clean old ones.
- **Standalone mode** changes things: no browser back button (your UI must provide back), safe areas apply to the top too, links to other origins open in the browser. Detect with `@media (display-mode: standalone)`.
- **Install prompt:** offer it after the user has gotten value, from your own button; never a modal on first load.
- **Push on iOS** works only for installed web apps (iOS 16.4+) and needs a user gesture to request permission.
- **Haptics:** the Vibration API is not supported in iOS Safari; never make it the only feedback.

## Testing on real hardware

1. Run the dev server on all interfaces (`--host 0.0.0.0`), open `http://<laptop-LAN-IP>:<port>` on the phone (same network).
2. iOS: enable Web Inspector in Settings > Safari > Advanced; on the Mac, Safari > Develop > the device. Android: USB debugging on, `chrome://inspect` on the desktop.
3. Test on an older, mid-range phone, not only the newest.
4. Check with the keyboard open, in landscape, with large text, in dark mode, and as an installed PWA if that is a target.
5. Try every gesture twice: the intended one, and a scroll across the control (it must scroll, not trigger).
6. Report which of these you verified on hardware and which only in code or emulation.

## Never ship

| Never | Instead |
|---|---|
| `user-scalable=no`, `maximum-scale=1` | 16px inputs |
| Ungated `:hover` | Capability media query |
| `100vh` app shells | `100dvh` |
| `dvh` on a marketing hero | `svh` |
| Feedback only on click | `:active` / `pointerdown` |
| `touchmove` + `preventDefault` to stop overscroll | `overscroll-behavior` |
| `user-select: none` on `body` | On controls only |
| `touch-action: none` on something people scroll past | `pan-x` / `pan-y` |
| `env()` insets without `viewport-fit=cover` | Add the meta tag |
| User-agent sniffing for touch | `(hover)` and `(pointer)` queries |
| "Works in device mode" as proof | A real phone |

## Sources

Paraphrased from mobile-native (Emil Kowalski's design-engineering notes; licence unknown, no text or code copied), with platform facts from MDN, WebKit and web.dev. Impeccable (Apache-2.0) adapt guidance on testing gestures and naming evidence.

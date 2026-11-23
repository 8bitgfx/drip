# Mobile

A good mobile experience feels installed, not embedded. Taps answer the instant a finger lands; nothing flashes grey; hover effects don't stick; the layout fits the visible screen as the browser chrome comes and goes; content clears the notch and the home indicator while backgrounds run edge to edge; inputs bring up the right keyboard without zooming the page; and the things you do most sit where your thumb already is. On native, the app speaks the platform's language: its navigation, its controls, its type, its gestures. Most "it feels janky on my phone" reports are not animation problems; they are a handful of platform details, each one line of code, that only show on real hardware.

## The procedure

1. **Name the context.** Mobile web, PWA, or native (which platforms)? One-handed on the go or two-handed at rest? Phone only, or tablet and foldable too? If there is no Drip task, call `drip_start`.
2. **Ship the baseline first** (below): viewport meta, theme colours, tap highlight, input size, hover gating, overscroll. Before the first component.
3. **References.** `refs_search` "mobile" + the screen ("mobile checkout", "bottom sheet filters", "ios onboarding"); `refs_view` 6 to 10 shots from real apps. Note navigation model, thumb placement, sheet use.
4. **Restructure, don't shrink.** Rethink the desktop layout for the phone: one column, priority order, navigation in reach, tables restacked, secondary content behind disclosure. Read `mobile/patterns`.
5. **Build with capability queries,** never device sniffing: `(hover)`, `(pointer)`, `env()`, `dvh`, `display-mode`.
6. **Screenshot** with `fitcheck_shot` at 390x844, 360x780 and 320 wide, keyboard closed and (where you can) open. Landscape once.
7. **Test on hardware.** Dev server on `0.0.0.0`, open the LAN IP on a phone; Safari Web Inspector (Develop menu) for iOS, `chrome://inspect` for Android. Use a phone a few years old. Native: simulator for breadth, a device for gestures and performance.
8. **Report** what you verified on a device and what you could only check in code. `fitcheck_lint`, then `fitcheck_done`.

## The baseline

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fbfbfa">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0c">
<meta name="color-scheme" content="light dark">
```

```css
html {
  -webkit-text-size-adjust: 100%;          /* no font boost in landscape */
  -webkit-tap-highlight-color: transparent; /* we draw our own pressed states */
}
input, select, textarea { font-size: max(16px, 1rem); }
:where(button, a, [role="button"], label, summary) { touch-action: manipulation; }
:where(button, [role="button"], [role="tab"]) { -webkit-user-select: none; user-select: none; }
@media (hover: hover) and (pointer: fine) { /* every :hover rule lives here */ }
```

- `interactive-widget=resizes-content` makes the on-screen keyboard shrink the layout on Chrome for Android so bottom-pinned inputs move up with it.
- Set `theme-color` to the colour at the very top of your page (the header), not the brand colour. In Next.js use the `viewport` export's `themeColor` array.
- In Tailwind v4 the `hover:` variant is already wrapped in `@media (hover: hover)`; plain CSS hover rules are not.
- Add `overscroll-behavior: none` on `html` only for app-like screens; leave pull to refresh on documents.

## The craft

### Touch targets and spacing

| Platform | Minimum target | Spacing |
|---|---|---|
| iOS | 44 x 44 pt | 8pt+ between targets |
| Android | 48 x 48 dp | 8dp+ |
| Mobile web | 44 x 44 CSS px (WCAG 2.2 AA floor is 24px; aim for 44) | 8px+ |

Grow the hit area without growing the icon:

```css
.icon-btn { position: relative; }
.icon-btn::after { content: ""; position: absolute; inset: -10px; } /* 24px icon -> 44px target */
```

Do: a 20px icon in a 44px button with a pressed fill. Don't: three 24px icons 4px apart in a toolbar.

### Thumb zones

- On a 6 to 7 inch phone held in one hand, the bottom third and centre are easy, the top corners are a stretch.
- **Bottom:** primary actions, tab bar, the composer, the Continue button of a flow, sheet actions.
- **Middle:** content and frequent secondary actions.
- **Top:** titles, back, search entry, rarely used or destructive actions (Delete lives in a menu, not next to Save).
- On tablets and landscape, actions move to the sides and the top again; restructure there (`mobile/patterns`).

### Press feedback

- Feedback starts on press, not release: style `:active`, or listen to `pointerdown` if you need JavaScript.
- 80 to 150ms `ease-out`; scale 0.97 to 0.98 or a one-step darker fill. Keep it subtle on lists (a fill, no scale).
- Release triggers the action; a press that slides off cancels it (native buttons do this; custom ones must too).

### Viewport units

| Unit | Height used | Use for |
|---|---|---|
| `100svh` | Smallest (browser chrome shown) | Marketing heroes, first screens; never overflows, never shifts |
| `100dvh` | Current, updates as chrome moves | App shells, full-height sheets, chat layouts |
| `100lvh` / `100vh` | Largest (chrome hidden) | Almost never; overflows on load |

### Safe areas

- `viewport-fit=cover` lets the page paint under the notch, island and home indicator; without it, every `env(safe-area-inset-*)` is 0.
- Pad content, not backgrounds: headers get `padding-top: env(safe-area-inset-top)`, tab bars and sheets `padding-bottom: max(12px, env(safe-area-inset-bottom))`, landscape sides `env(safe-area-inset-left/right)`.
- Fixed bars sit above the home indicator; nothing tappable in the bottom 34pt on Face ID iPhones except the bar's own padding.

### Text and inputs

- Body 16px minimum on web; iOS Body is 17pt, Android Body 16sp. Respect the user's text size: rem on web, Dynamic Type on iOS, sp on Android. Test at 130% and largest sizes.
- Line length on phones is the column; keep line-height 1.4 to 1.6.
- Every field: the right `type`, `inputmode` (`numeric`, `decimal`, `tel`, `email`, `search`), `autocomplete` (`one-time-code` for OTP, `street-address`, `cc-number`), `autocapitalize="none"` and `autocorrect="off"` on usernames and codes, `enterkeyhint` (`next`, `send`, `search`, `done`).
- The focused field stays visible above the keyboard; the primary button follows the keyboard or sits right under the last field.

### Scrolling and gestures

- Inner scroll areas (sheet content, chat, side panels) use `overscroll-behavior: contain` so the page behind doesn't move.
- Horizontal carousels use native scroll with `scroll-snap-type: x mandatory`; give custom gesture surfaces `touch-action: pan-y` (they own horizontal) and use `touch-action: none` only on surfaces that own every direction.
- Never use a non-passive `touchmove` + `preventDefault` to stop scrolling.
- Leave the left-edge back swipe on iOS alone; don't put horizontal swipe gestures within ~20px of the screen edge.
- Every swipe action (archive, delete, dismiss) also exists as a visible button or menu item.

### Long-press and selection

- Controls (buttons, tabs, chips, drag handles) are not selectable and don't show the iOS callout: `user-select: none; -webkit-touch-callout: none` on those only.
- Content (addresses, order numbers, messages, error text) stays selectable. Never `user-select: none` on `body`.
- A long-press that opens a context menu also has a visible `⋯` button.

### Performance on phones

- Phones are slower than your laptop: test with 4x CPU throttling; animate only `transform` and `opacity`; keep JS on interaction under 100ms.
- Images: `srcset`/`sizes`, AVIF/WebP, width and height set, lazy below the fold; the hero image preloaded.
- Fonts: 2 files ideally, `font-display: swap`, subset.

### Native platforms (summary; depth in `mobile/patterns`)

| | iOS | Android |
|---|---|---|
| Top level nav | Tab bar, 2 to 5 sections | Navigation bar 3 to 5; rail or drawer on wide screens |
| Hierarchy | Push navigation, large title collapsing to inline | Top app bar, predictive Back |
| Focused task | Sheet with detents, Cancel/Done | Bottom sheet or full-screen dialog |
| Feedback | Haptics on confirm and selection | Snackbar (with action) for transient feedback |
| Type | SF Pro via Dynamic Type styles | Roboto/brand via Material type roles, sp units |
| Icons | SF Symbols | Material Symbols |
| Colour | Semantic system colours, one tint | Material colour roles, Dynamic Color where it fits |

Translate idioms between platforms; never transplant one onto the other.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Button stays highlighted after a tap | Gate hover in `(hover: hover) and (pointer: fine)`; give `:active` feedback |
| Grey or blue flash on every tap | Transparent tap highlight plus designed pressed states |
| Page zooms when an input is focused, then stays zoomed | 16px inputs; never `maximum-scale=1` |
| Bottom button hidden under the Safari toolbar on load | `100dvh` shell, safe-area padding |
| Header text under the notch, or white bars around a landscape page | `viewport-fit=cover` + safe-area insets |
| A desktop dropdown menu on a phone | A bottom sheet or full-screen picker |
| Hamburger hiding the 3 most-used destinations | A bottom tab bar |
| Primary action at the top-right corner of a long form | Bottom, full width, sticky above the keyboard |
| Swipe-only delete | Swipe plus a visible action |
| Tiny 12px text and 28px buttons copied from desktop | 16px text, 44px targets, fewer items |
| Carousel that scrolls the page vertically while you swipe it | Native scroll-snap or `touch-action: pan-y` |
| Custom iOS-looking switch on Android (or Material ripple on iOS) | The platform's own controls |
| "Tested in Chrome device mode" | Test on a real phone and say what was verified |

## Done when

- [ ] Baseline meta and CSS are in; no `user-scalable=no` or `maximum-scale`.
- [ ] Every tappable element is 44px (48dp Android) with 8px spacing and a visible pressed state.
- [ ] No hover rule outside a hover-capable media query.
- [ ] Full-height layouts use `dvh`/`svh`; fixed bars and sheets clear the safe areas in portrait and landscape.
- [ ] Every input brings the right keyboard and doesn't zoom; the focused field stays visible above the keyboard.
- [ ] Primary actions sit in thumb reach; gestures have visible alternatives; system back works.
- [ ] Screenshots at 390, 360 and 320 show no sideways scroll and no clipped controls.
- [ ] A real-device check is reported, or the gaps are named.
- [ ] `fitcheck_lint` is clean and `fitcheck_done` returns its verdict.

## Reference guides

- `mobile/native-feel` — the platform layer on the web, in depth: each fix, why it works, PWA, testing.
- `mobile/patterns` — navigation, sheets, gestures, lists, forms and the native iOS and Android conventions.

## Sources

Adapted and rewritten from: mobile-native (Emil Kowalski's design-engineering notes; licence unknown, paraphrased only, no copied text or code). Impeccable (Apache-2.0): iOS and Android platform references, native adaptation, the "ported from a website" slop test. UI UX Pro Max (MIT): touch, safe-area, navigation and form guideline data. Taste Skill (MIT): phone widths and tap-size checks.

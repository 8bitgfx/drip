# Mobile: patterns

The structures that make a phone screen work: how people move between places, how focused tasks open and close, how lists, forms and gestures behave, and how to adapt for tablets and each native platform. The rule underneath all of them: restructure for the context, don't scale the desktop down.

## Navigation

| Pattern | Use when | Rules |
|---|---|---|
| **Bottom tab bar** | 3 to 5 top-level sections used often | Icon + short label on every tab; the current tab filled and in the tint; tabs are places, never actions ("New post" is a button, not a tab); each tab keeps its own stack and scroll; tapping the current tab scrolls to top |
| **Push / stack** | Drilling into hierarchy (list → detail → sub-detail) | Back in the top-left with the previous title or a chevron; edge swipe back stays alive; title of the new screen matches what was tapped |
| **Top tabs / segmented control** | 2 to 4 sibling views of the same content | Swipeable on Android, tap-only segmented control on iOS; never more than 4 visible on a phone |
| **Drawer / hamburger** | Many infrequent destinations, settings, account | Never for the 3 most used destinations; those go in the tab bar |
| **Search-first** | Content apps, marketplaces | A search field at the top of the home tab; recent and suggested queries on focus |
| **Mobile web header** | Websites | Logo left, menu button right (44px), full-screen menu with large links and the main action; a bottom action bar for the primary action on long pages |

- Never two bottom bars (a tab bar and a cookie banner and an action bar). Collapse or sequence them.
- Large titles on top-level screens collapse into an inline title as you scroll (iOS); deeper screens start inline.
- Keep the nav model the same across the app; no mixing tab bar on some screens and drawer on others for the same level.

## Sheets and dialogs

| Surface | Use for | Dismiss |
|---|---|---|
| **Bottom sheet (partial)** | Options, filters, pickers, quick actions, a preview | Swipe down, tap the scrim, a Close or Done button |
| **Bottom sheet (detents)** | A map + list, a player, anything with a peek, half and full state | Drag between detents; swipe down from the lowest closes |
| **Full-screen sheet / modal** | A self-contained task: compose, new item, checkout step | Cancel (top-left) and the action (top-right) on iOS; a close X and the action on Android |
| **Action sheet / menu** | 2 to 6 actions on one object | Tap outside, Cancel |
| **Alert dialog** | A decision that must interrupt: destructive confirm, lost data | Explicit buttons only |

Sheet details that make it feel right:
- **Grabber** 36 x 5px, centred, 6 to 8px from the top; top corners 12 to 16px (match the device's corner feel).
- **Height:** content-sized up to ~90dvh; scrim behind at 30 to 50% black; the page behind is `inert`.
- **Drag to dismiss** follows the finger 1:1; release with velocity carries on and closes, release slowly below ~30% of its height snaps back. Content inside scrolls first; dragging only starts when the inner scroll is at its top.
- **Motion:** opens over 300 to 450ms on a decelerating curve (e.g. `cubic-bezier(.32,.72,0,1)`), closes faster (200 to 300ms). Spring-like is fine; no bounce past the top.
- **Safe area:** bottom padding includes `env(safe-area-inset-bottom)`; nothing under the Dynamic Island when full height; the sheet starts below the status bar.
- **Focus and keyboard:** focus moves into the sheet; Esc and Back close it; Android hardware/gesture Back closes the sheet before leaving the screen.
- **Unsaved input:** swiping a compose sheet with content asks to discard or save.
- On desktop the same component becomes a centred dialog or a popover; don't ship a phone sheet sliding up a 1440 screen.

Use a proven drawer component (`components_find` "drawer" or "sheet"; Vaul is the common React choice) and restyle it.

## Lists

- Row height 44 to 56pt for single-line, 64 to 80 for two-line with an avatar; text 16 to 17 primary, 13 to 15 secondary.
- The whole row is the tap target; a chevron only when it pushes a screen.
- **Swipe actions:** reveal the action behind the row as it slides (the row's own background, full height, edge to edge), not a separate floating button. A full swipe commits the primary action (archive); Undo follows. Every swipe action also lives in a long-press menu or the detail screen.
- **Pull to refresh** on feeds and inboxes; never on forms or editors.
- **Infinite feeds** keep scroll position on Back; show a "New posts" pill rather than jumping the list.
- **Section headers** stick while their section scrolls; an index scrubber for long alphabetical lists.
- **Reorder** with a drag handle and a long press; offer Move up/down for accessibility.

## Forms on phones

- One column, one field per row, labels above; the keyboard type and return key set for every field (`mobile/native-feel`).
- Split long flows into short steps with a visible step count; each step's Continue sits at the bottom, full width, above the keyboard.
- Use native pickers for dates, times and short option lists; a searchable full-screen list for long ones (countries).
- Prefer toggles, steppers and segmented controls over typing when the set of values is small.
- Autofill everything you can (addresses, one-time codes, passwords, passkeys). Never block paste.
- Errors appear under the field and the field scrolls into view with its label.

## Gestures

| Gesture | Expectation | Always also |
|---|---|---|
| Tap | Primary action | — |
| Long press | Context menu, preview, reorder start | A visible `⋯` button |
| Swipe on row | Quick actions | Actions in a menu or detail |
| Swipe between tabs / pages | Sibling views (Android), carousels | Tabs or dots that can be tapped |
| Pull down | Refresh, or dismiss a sheet | A Refresh or Close control on non-obvious screens |
| Edge swipe from left | Back (iOS, system) | Never block it |
| Pinch | Zoom images and maps | Zoom buttons on maps |

- A gesture's motion follows the finger exactly, then hands its velocity to the release animation; no pause at the hand-off.
- Haptic ticks (native) on snap points, toggles and confirmed destructive actions; never on every scroll.

## Thumb-first layout

- Primary action at the bottom: full-width button with 16px side margins, or a FAB (Android, one per screen, for the single main action).
- Destructive actions out of the natural tap path: in a menu or behind a confirmation, styled as danger.
- Reachability for top controls: a pull-down search, a bottom search bar (iOS Safari style), or duplicating key actions at the bottom on tall screens.
- Fixed bottom bars no taller than ~88px including the safe area; they hide on scroll down and return on scroll up only on content screens, never on forms.

## Tablets, foldables and landscape

- **Restructure at size classes:** compact width (phones) one column; regular/expanded width (tablets, unfolded) list + detail side by side, a sidebar or navigation rail instead of a bottom bar, popovers instead of full-width sheets.
- Never ship a stretched phone layout on a tablet; never lock orientation to dodge a layout bug.
- Multitasking can give you a phone-width window on a tablet: drive layout by window size, not device model.
- Landscape phones: side-by-side panes where useful, controls in reach of both thumbs, safe-area side insets.

## Native platform conventions

### iOS
- Tab bar for 2 to 5 sections, navigation stack for hierarchy, sheets with detents for focused tasks; large titles on top-level screens.
- System controls: switches, segmented controls, steppers, pickers, context menus, swipe actions. SF Symbols for icons; SF Pro via Dynamic Type text styles (Body 17pt, nothing under 11pt).
- Semantic system colours (label, secondaryLabel, systemBackground, separator) and one tint; system materials for blur behind bars and sheets, not hand-made glass.
- Grouped inset lists for settings.
- Honour Reduce Motion (crossfade instead of slides and parallax), Dark Mode and increased contrast.

### Android
- Navigation bar (3 to 5) on compact width; navigation rail or drawer on medium and expanded.
- Predictive Back always works; top app bar for context; one FAB for one primary action.
- Material 3 components and colour roles (primary, on-primary, surface, surface-variant, outline, error); Dynamic Color where the brand allows, with a static fallback; tonal elevation.
- Material type roles in sp; Roboto or a brand face themed through the type scale; Material Symbols.
- Snackbars for transient feedback with an optional action; dialogs only for decisions that must interrupt.
- Edge-to-edge with window insets (status bar, navigation bar, cutout, IME).

### Cross-platform (React Native, Flutter)
- Translate per platform: tab bar vs navigation bar, action sheet vs bottom sheet, back chevron vs predictive Back, SF Symbols vs Material Symbols.
- Keep the brand in palette, type accents and motion personality, carried through each platform's theming.
- Test on both a simulator/emulator and a device per platform; capture screenshots from the simulator, never from a browser.

## Pattern slop tells

| Tell | Fix |
|---|---|
| A desktop top nav squeezed into a hamburger on a phone app | Tab bar for the top destinations |
| "New post" as the middle tab | A button (or FAB) in the relevant screen |
| A centred desktop modal on a phone | A sheet from the bottom, or a pushed screen |
| A sheet with no grabber, no swipe dismiss, no Close | All three |
| A floating "Delete" pill next to a swiped row with a gap | The action as the row's own background |
| Phone layout stretched to 1024 wide on iPad | List + detail, rail navigation |
| iOS-style switches and back chevrons on Android | Material components and predictive Back |
| Web icon set inside a native iOS app | SF Symbols |

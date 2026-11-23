# Interaction: overlays

Tooltips, popovers, menus, selects, dialogs, sheets and toasts are where interfaces most often feel cheap: they grow from nowhere, trap you, steal focus, or vanish while your pointer is on the way to them. Use a primitive for the behaviour (Radix via shadcn, Base UI, React Aria; `components_find`), then tune the feel with the values here.

## Choose the right overlay

| Need | Use | Not |
|---|---|---|
| Name an icon button, show a shortcut | Tooltip (text only, no interactive content) | Popover |
| Short interactive content tied to a control (filters, colour picker, mini form) | Popover | Modal |
| A list of actions | Menu (dropdown / context) | Popover with buttons |
| Choose one value from a list | Select (or combobox if more than ~10 options or searchable) | Menu |
| Preview linked content on hover | Hover card (desktop only, with a click path too) | Tooltip |
| A task that blocks the page until done or cancelled | Dialog (modal) | Full-page route |
| Side task with context visible, or mobile actions | Sheet / drawer (Vaul on mobile) | Modal |
| Result of an action, off-screen or async | Toast (Sonner) | Alert dialog |
| Irreversible confirmation | Alert dialog | Toast |
| Frequent global actions | Command palette (cmdk), opened by shortcut, no animation | Mega-menu |

## Origin and motion

- Anchored overlays scale from the trigger. Library variables: Radix `var(--radix-popover-content-transform-origin)` (and `-dropdown-menu-`, `-tooltip-`, `-select-`, `-hover-card-` variants), Base UI `var(--transform-origin)`. Tailwind v4: `origin-(--radix-popover-content-transform-origin)`.
- Modals scale from centre (they are not anchored).
- Enter: `opacity 0 -> 1` + `scale 0.96-0.97 -> 1` (+ optional 4px slide away from the trigger). Never `scale(0)`.

| Overlay | Enter | Exit | Curve |
|---|---|---|---|
| Tooltip | 125-150ms | 100ms | `--ease-out` |
| Popover, menu, select | 150-200ms | 120-150ms | `--ease-out` |
| Hover card | 150-200ms after the open delay | 120ms | `--ease-out` |
| Dialog + backdrop | 200-250ms | 150-200ms | `--ease-out` |
| Sheet | 300-500ms | 250-350ms | `--ease-drawer` |
| Toast | ~400ms | 200-300ms | `ease` |
| Command palette | 0ms | 0ms | none |

## Placement

- Offset 4-8px from the trigger (`sideOffset={6}`); tooltips 6-8px.
- Let the library flip and shift on collision; keep 8px from the viewport edge (`collisionPadding={8}`).
- Menus at least as wide as their trigger for selects (`w-(--radix-select-trigger-width)` / `min-w-(--anchor-width)`), otherwise sized to content with a sensible max (320-360px).
- Max height to the available space with internal scroll (`max-h-(--radix-dropdown-menu-content-available-height)`).
- Arrows are optional; if used, 8-10px, same fill and border as the panel.

## Tooltips

- Open delay ~400-600ms on first hover so they don't fire while the pointer passes over. Once one is open, neighbours open **instantly with no animation** for ~300ms after the last closes (Radix `skipDelayDuration`, Base UI tooltip group).
- Open on keyboard focus immediately; close on Escape, blur and pointer leave.
- Text only, one line ideally, max ~240px wide; include the shortcut (`Copy link  ⌘C`).
- Never the only place important information lives; never on disabled native buttons (they get no pointer events) - use `aria-disabled` or explain inline.
- Touch has no hover: icon buttons still need `aria-label`; information tooltips become tap-to-open popovers.

## Popovers and menus

- Focus moves into the panel on open (first item for menus, first field for popovers); returns to the trigger on close.
- Close on Escape, outside pointer-down, selecting a menu item, and trigger click. Popovers with unsaved input don't close on outside click; ask or keep.
- Menus: arrow keys move, Home/End jump, type-ahead selects, Enter/Space activates; items 32-36px tall on desktop, 44px on touch; destructive items last, in the danger colour, separated.
- Submenus open on hover after ~100ms and on Right arrow; keep a safe triangle so diagonal movement toward the submenu doesn't close it; close after ~200-300ms of leaving.
- One menu open at a time; opening another closes the first without animation.

## Dialogs

- Use for focused tasks and irreversible confirmations, not for content people want to compare with the page.
- Focus: into the dialog on open (the first field, or the least destructive button for alerts); trapped while open; back to the opener on close.
- Close on Escape and on a visible close button; backdrop click closes only when nothing would be lost.
- Unsaved changes: confirm before discarding ("Discard changes?" with "Discard" / "Keep editing").
- Scroll lock on the page behind; the dialog body scrolls internally, header and actions stay visible. Prevent layout shift from the disappearing scrollbar (`scrollbar-gutter: stable` on the root).
- Width by content: 400-480px for confirmations, 560-640px for forms, up to 800-960px for complex editors. On phones, full width with 16px margins or a bottom sheet.
- Backdrop: ink at 40-60% in light mode, darker in dark mode; optional 2-4px blur. Never a coloured or gradient backdrop.
- Primary action on the right (or full-width bottom on mobile); button names the result ("Delete project"), not "OK".

## Sheets and drawers

- Side sheets for secondary tasks with the page still in view; bottom sheets on mobile.
- Draggable sheets use Vaul (snap points, velocity dismissal, scroll-inside handled).
- Include a visible handle (36-40px x 4-5px, centred, 8px from the top) on draggable bottom sheets.
- Same focus rules as dialogs when modal.

## Toasts

- Sonner by default. Bottom-right on desktop (or bottom-centre), top or bottom-centre on mobile; one position per app.
- Auto-dismiss in 4-6s for confirmations; pause on hover, focus and when the tab is hidden. Errors and anything with an action (Undo, Retry) stay longer (8s+) or until dismissed.
- Max three visible; stack older ones behind with a 6-8% scale step.
- `aria-live="polite"`; never move focus to a toast. Actions in toasts must also be reachable some other way (or via a shortcut announced in the toast).
- Swipe to dismiss on touch; direction matches where it came from.

## Layers and z-index

Define a small scale once and never use ad-hoc 9999s:

```css
:root { --z-sticky: 10; --z-dropdown: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50; --z-tooltip: 60; }
```

Render overlays in a portal so `overflow: hidden` and transforms on ancestors don't clip them. Tooltips sit above everything, including modals.

## Slop tells

| Tell | Fix |
|---|---|
| Modal for a three-field filter | Popover anchored to the Filter button |
| Dropdown fades from the centre of itself | Trigger-based origin variable |
| Tooltip with a link inside | Popover, or put the link in the page |
| Every confirmation is a modal with "OK / Cancel" | Undo toast; named buttons for the irreversible ones |
| Toast stack of 6 for one bulk action | One toast: "6 files moved. Undo" |
| Popover that closes while moving the pointer to it | Close delay 150-300ms + gap-bridging (no gap, or a pseudo-element bridge) |
| Backdrop blur of 20px over a busy page | 0-4px or none, darker scrim |

## Sources

Emil Kowalski, *emil-design-eng* (MIT): origin-aware popovers, tooltip skip-delay, modals centred, toast design principles. Impeccable (Apache-2.0): overlay states and polish checks. UI UX Pro Max (MIT): dialog focus, toast accessibility and timing, sheet dismissal with unsaved changes, modal escape. Taste Skill (MIT): menu open intent and swap without animation. Vercel Web Interface Guidelines (paraphrased): scroll-lock and scrollbar gutter, focus return, named confirmation buttons. Radix, Base UI and Sonner documentation for props and variables.

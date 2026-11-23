# Interaction

Good interaction feels like the interface is listening. A press answers in the same frame, focus is always findable, overlays come out of the thing you touched and go back to it, nothing makes you wait without telling you why, and mistakes are cheap because they can be undone. None of it calls attention to itself: people only notice interaction craft when it is missing. The bar is that a keyboard user, a touch user and a mouse user each get a complete, fast path, and that the 50th use of the day feels as good as the first.

## The procedure

1. **Inventory the controls.** List every interactive element in scope: buttons, links, inputs, toggles, tabs, rows, cards that link, icon buttons, drag handles. For each, note what it does and how often a person will hit it.
2. **Use a primitive for anything with behaviour.** Dialogs, popovers, menus, selects, comboboxes, tabs, tooltips, toasts, drawers, date pickers: `components_find`, then `components_get` to read the code. Radix, Base UI and React Aria handle focus, keyboard, ARIA and dismissal; your job is the feel. See `drip_guide components`.
3. **Write the state table** for each control type (see `interaction/states`): default, hover, active, focus-visible, disabled, and where relevant loading, selected, invalid, read-only. Use the project's tokens; if a state colour is missing, add a token, don't hard-code.
4. **Set feedback and timing**: press within 100ms; hover colour 100-150ms; overlays per `interaction/overlays`; anything over 300ms gets a loading state; over 1s gets progress or a skeleton.
5. **Walk every path three ways.** Mouse, keyboard only (Tab, Shift+Tab, Enter, Space, Escape, arrow keys) and touch (DevTools device mode at minimum). Every action reachable, every focus visible, nothing hover-only.
6. **Break it on purpose.** Double-click submit, press Escape mid-open, hover in and out fast, drag off the element and release, go offline, paste 200 characters. See `interaction/forms` and `drip_guide polish` for edge states.
7. **Capture states.** `fitcheck_shot` the rest, hover, focus and pressed states of the key controls; `fitcheck_lint`; then `fitcheck_done`.

## The craft

### Response time

| Delay after input | What the person feels | What to show |
|---|---|---|
| under 100ms | Instant, caused by me | The result, or the press state |
| 100ms-1s | Slight lag, still connected | Press state at once; spinner only if it passes ~300ms |
| 1-10s | Waiting | Skeleton or progress in place; keep the rest of the UI usable |
| over 10s | Lost | Determinate progress, what is happening, and a way to leave or cancel |

- **Do:** update the UI first (optimistic), reconcile with the server after, roll back with a message on failure.
- **Don't:** block the whole screen with a spinner for a request that touches one row.

### Press

Press feedback confirms the interface heard the person.

- `:active` scale 0.96-0.98 on buttons and pressable chips, 140ms `--ease-out`; 0.98-0.99 on large cards. Or a one-step darker fill when movement would distract.
- Press on `pointerdown`, act on `click` (release). Exceptions that act on press: drag starts, hold-to-confirm, game-like controls.
- Add `touch-action: manipulation` to controls so double-tap-zoom doesn't delay taps, and `-webkit-tap-highlight-color: transparent` once you provide your own press state.
- **Do:** `active:not-disabled:scale-[0.97]`. **Don't:** `active:scale-90`, or a press that only changes the cursor.

### Hover

Hover is a hint, never the only path.

- Gate with `@media (hover: hover) and (pointer: fine)` (Tailwind v4's `hover:` already does this).
- Change colour or background one step (about 4-8% lightness in OKLCH), 100-150ms `ease`. Links: underline appears or thickens.
- Cards that link: lift 1-2px on an inner layer or darken the border one step. The hit area must not move.
- Hover-to-open (menus, previews) waits for intent: ~100-150ms before opening, close delay ~150-300ms so the pointer can travel to the panel. Submenus need a safe path (a triangle from pointer to submenu) so diagonal moves don't close them.
- **Do:** reveal row actions on hover and also on focus-within, and always on touch. **Don't:** hide the only delete button behind hover.

### Focus

- `:focus-visible`, not `:focus`, for the ring: keyboard users see it, mouse clicks don't flash it. Inputs show focus on any focus (people need to know where they are typing).
- Ring: 2px solid, 2px offset, a colour with 3:1 contrast against both the control and the page. Same ring everywhere. Appears in full at once, no transition.
- Use `outline` (follows `border-radius` in modern browsers, survives forced-colours mode) rather than `box-shadow` rings, or add a transparent outline next to the shadow so Windows High Contrast still shows it.
- Focus order follows reading order. Never positive `tabindex`. Overlays trap focus while open and give it back on close. After a route change, move focus to the main heading or `main`.
- Sticky headers and cookie bars must not cover the focused element (`scroll-padding-top` = header height).

```css
:where(a, button, [role="button"], input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### Disabled, read-only, loading

- Disabled: 0.45-0.5 opacity or a muted token, no hover or press change, `cursor: not-allowed` or default (pick one, use it everywhere). Native `disabled` removes it from tab order; when people need to learn *why* it's disabled, use `aria-disabled="true"` instead, keep it focusable and explain in a tooltip or helper text.
- Read-only is not disabled: full-contrast text, no input chrome, still selectable and copyable.
- Loading: keep the label's width (render the label invisible and overlay the spinner), set `aria-busy`, ignore repeat clicks. Delay the spinner ~150-300ms; once visible keep it ~300-500ms so it doesn't flicker.

### Selection and toggles

- Selected must differ from hover by more than colour alone: fill, weight, a check, an indicator bar. A selected item that is also hovered still reads selected.
- Toggles (`aria-pressed`, switches) change instantly; a switch knob may slide 120-160ms. Settings that save on toggle show a quiet "Saved", not a toast per click.
- Outline icon at rest, filled icon when active (`drip_guide icons`).

### Feedback, errors and undo

- Success for routine actions is the result itself (the row appears). Add a toast only when the result is off-screen or delayed.
- Destructive actions: do it, show "Deleted. Undo" for 5-8s, actually delete after. Confirm dialogs only for irreversible, high-cost actions; the confirm button names the action and the count.
- Errors say what happened and what to do, next to where it happened; they stay until fixed or dismissed. Toasts that auto-dismiss carry nothing the person must read.
- Live regions: status updates via `aria-live="polite"`, errors that block via `role="alert"`; toasts never steal focus.

### Perceived performance

How fast it feels matters as much as how fast it is.

- **Respond before the server does.** Optimistic updates for likes, toggles, renames, reorders, deletes; reconcile after.
- **Start work on intent.** Prefetch a route or data on `pointerenter`/`focus` of a link (most clicks follow a hover by 100-300ms); start uploads as soon as a file is chosen, not on Submit.
- **Show structure first.** Render the page frame and skeletons immediately, stream content into them; never a blank screen with a centred spinner.
- **Keep the old content while refreshing**, with a small indicator; don't flash to empty.
- **Make waits feel shorter**: a faster spinner (600-800ms per turn) reads as quicker work; determinate progress beats indeterminate past ~2s; say what is happening.
- **Remove animation from frequent paths.** A 200ms open on something used 100 times a day costs 20 seconds a day and feels slow every time.
- **After the first tooltip, the rest are instant.** Skipping both delay and animation for neighbours makes the whole toolbar feel faster.

### Overlays

Origin at the trigger, 150-200ms in, faster out, Escape closes, focus in and back, outside click closes non-modal ones, one overlay level at a time where possible. Full rules and timing: `interaction/overlays`.

### Forms

Labels always, Enter submits, validate on blur and submit, errors inline plus focus the first one, never pre-disable submit, never block paste, correct `type`, `inputmode` and `autocomplete`, 16px inputs on mobile. Full guide: `interaction/forms`.

### Drag and gestures

Pointer capture, multi-touch guard, velocity-based dismissal, rubber-band damping past edges, `pointercancel` cleanup, a non-drag alternative. Full guide: `interaction/gestures`.

### Keyboard and frequency

- Anything done 100+ times a day gets a shortcut and no animation. Show shortcuts in menus and tooltips (`⌘K`, `Ctrl K` on Windows).
- Lists and menus support arrow keys, Home/End, type-ahead. Escape walks back one level, never two.
- Don't hijack browser shortcuts (Ctrl/Cmd+F, Cmd+L, Backspace navigation) without a strong reason.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| `outline: none` / `focus:outline-none` with nothing in its place | `focus-visible` ring: 2px, 2px offset, 3:1 colour |
| Buttons with hover but no press state | Add `:active` scale 0.97 or a deeper tone |
| `hover:scale-105` on everything, including on touch | Gate hover; colour step instead of scale; cards lift 2px max |
| Icon buttons 24px with 16px icons and no padding | 36-40px box (44 on touch); extend the hit area |
| Disabled submit until the form is "valid" | Keep it enabled; on submit show what to fix |
| Spinner replaces button text and the button shrinks | Keep width, overlay spinner, delay it 150-300ms |
| "Are you sure?" for every delete | Do it, offer Undo; confirm only the irreversible |
| Tooltip on a disabled button that never shows | Use `aria-disabled` so it can be hovered/focused, or explain inline |
| Dropdown that grows from its centre | Use the library's transform-origin variable |
| Toast for every save | Inline "Saved" or nothing; toast only for off-screen results |
| Custom `<div onClick>` buttons | `<button type="button">`; links for navigation |
| Placeholder used as the label | Visible label; placeholder only for an example value |

## Done when

- [ ] Every control shows distinct hover (pointer devices), active, focus-visible and disabled states; async ones show loading without layout shift.
- [ ] Keyboard-only walk completes every task; focus is always visible and never hidden under sticky UI.
- [ ] Nothing is reachable only by hover; touch has a path to every action.
- [ ] Hit areas are at least 24px everywhere, 44px on touch layouts, with no overlaps.
- [ ] Overlays open from their trigger, close on Escape, trap and return focus.
- [ ] Destructive actions are undoable or confirmed with a named button.
- [ ] Forms pass the `interaction/forms` checklist (labels, Enter, inline errors, focus first error, input kept).
- [ ] Double-submit, mid-animation Escape, offline and long-input cases behave.
- [ ] `fitcheck_shot` captured hover/focus/pressed states; `fitcheck_done` has run.

## Reference files

- `drip_guide interaction/states` — the state table per control type with values and code.
- `drip_guide interaction/overlays` — tooltip, popover, menu, dialog, sheet and toast behaviour.
- `drip_guide interaction/forms` — forms that feel good, from labels to submit.
- `drip_guide interaction/gestures` — drag, swipe, sliders and sheets.

Related: `drip_guide motion`, `drip_guide polish`, `drip_guide a11y`, `drip_guide mobile`.

## Sources

- Emil Kowalski, *emil-design-eng* (MIT): press scale, tooltip skip-delay, popover origin, drag velocity, damping, pointer capture, multi-touch guard, keyboard actions without animation.
- *Make Interfaces Feel Better* (MIT): hit areas via pseudo-elements, icon states via `currentColor`, motion restraint.
- Impeccable (Apache-2.0), *harden* and *polish*: the full state set, interrupted gestures, error and permission states, double-submit.
- UI UX Pro Max (MIT): feedback timings, inline validation, undo, toast accessibility, disabled opacity.
- Taste Skill (MIT): hover distances, focus ring drawn in full with no transition.
- Vercel Web Interface Guidelines (no reuse licence; inspiration only, paraphrased): loading delays and minimums, keep submit enabled, allow paste, focus management, scroll padding for sticky headers.

---
name: drip-interaction
description: Use when building or reviewing how UI responds to people - hover, press/active, focus-visible, disabled, loading, selected states; tooltips, popovers, menus, dialogs; drag, swipe and gestures; feedback, optimistic updates, undo; forms, validation and submit; "feels unresponsive", "feels laggy", "button does nothing". Part of Drip; covers the states every control needs, overlay origin and timing, perceived performance, and forms that feel good.
user-invocable: false
---

# Interaction (Drip)

**Before you do anything: call `drip_guide` with topic `interaction`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.

## Rules you must not break
1. Every interactive element has default, hover, active (pressed), focus-visible and disabled states; async controls add loading; toggles add selected. Write them all in the same change.
2. Visible feedback within 100ms of every press. Pressables get a subtle press (`scale(0.97)` or a deeper tone), never a delay before reacting.
3. Focus is visible on keyboard focus: a 2px ring with 2px offset in a colour at 3:1 against its surroundings, via `:focus-visible`. Never `outline: none` without a replacement; never animate the ring.
4. Hover effects only under `(hover: hover) and (pointer: fine)`, and nothing is reachable only by hover. Hover never moves the target out from under the pointer.
5. Hit areas at least 24x24px (WCAG floor), 40px in dense desktop UI, 44px on touch; extend small controls with a pseudo-element; hit areas never overlap.
6. Popovers, menus and tooltips scale from their trigger (library `transform-origin` variable); modals stay centred. Tooltips wait ~500ms the first time, then open instantly for neighbours.
7. Escape closes the topmost overlay, focus moves into it on open and returns to the trigger on close; clicks outside close non-modal popovers.
8. Loading never shifts layout: the button keeps its width, the spinner appears only after ~150-300ms and, once shown, stays at least ~300-500ms.
9. Prefer optimistic updates with undo over confirmation dialogs; confirm only what cannot be undone, and name the action on the button ("Delete 3 files", not "OK").
10. Forms: every input has a label, Enter submits, submit stays enabled until the request is in flight, validate on blur and on submit, focus the first error, never clear what the user typed.
11. Drag uses pointer capture, ignores extra pointers, dismisses on velocity (~0.11 px/ms) as well as distance, and has a keyboard or button alternative.
12. Never hand-roll a dialog, menu, combobox or date picker: use a primitive (`drip_guide components`).

## Numbers at a glance
| What | Value |
|---|---|
| Response | under 100ms feels instant; over 1s needs a skeleton or progress; over 10s needs progress + cancel |
| Press | `scale(0.96-0.98)`, 100-160ms; hover colour step 100-150ms |
| Focus ring | `outline: 2px solid var(--ring); outline-offset: 2px`, 3:1 contrast |
| Tooltip | open delay ~500ms, neighbours instant within ~300ms; 6-8px offset |
| Hit area | 24px floor, 40px dense desktop, 44px touch |
| Disabled | opacity 0.45-0.5, no hover or press |

## Tools
- `components_find` — get an accessible primitive (dialog, popover, menu, combobox, toast, drawer) instead of building one.
- `components_get` — read its code; check it exposes state attributes (`data-state`, `data-disabled`) and the transform-origin variable.
- `fitcheck_shot` — capture hover, focus and pressed states, not only rest.
- `fitcheck_lint` — catches missing focus styles, `outline: none`, tiny hit areas, ungated hover.
- `fitcheck_done` — required before ending a turn that changed UI.

## Read deeper when
| Situation | Call |
|---|---|
| Writing the state set for a control (values, CSS, Tailwind v4) | `drip_guide interaction/states` |
| Tooltips, popovers, menus, dialogs, sheets, toasts: timing, origin, focus | `drip_guide interaction/overlays` |
| Any form: labels, validation, errors, submit, autofill, mobile keyboards | `drip_guide interaction/forms` |
| Drag, swipe, sliders, reorder, sheets you can fling | `drip_guide interaction/gestures` |
| Choosing curves and durations | `drip_guide motion` |

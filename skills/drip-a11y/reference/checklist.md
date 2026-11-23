# Accessibility: checklist and patterns

Run this on every screen you build or change. Each line is a check you can do with the code, the browser or a `fitcheck_shot` screenshot. Levels follow WCAG 2.2: everything here is A or AA unless marked.

## 1. Perceivable

**Text and colour**
- [ ] Body text and labels at 4.5:1 against their background (`palette_check`).
- [ ] Large text (24px+, or 18.66px+ bold) at 3:1 or better.
- [ ] Input borders, meaningful icons, focus rings, chart marks at 3:1 against neighbours.
- [ ] Text over images measured against the real pixels at phone and desktop crops.
- [ ] Both light and dark themes checked.
- [ ] Nothing is conveyed by colour alone (status, errors, required, chart series, links in prose).

**Images and media**
- [ ] Every `<img>` has an `alt`; meaningful ones describe what they tell, decorative ones are `alt=""`.
- [ ] Inline SVG icons beside text have `aria-hidden="true"`; standalone meaningful SVGs have `role="img"` and a name.
- [ ] Charts have a text summary or a data table.
- [ ] Videos with speech have captions; no autoplay with sound.
- [ ] No text inside images (logos excepted, with alt).

**Structure**
- [ ] `<html lang>` matches the content language; `dir="rtl"` where needed.
- [ ] One `<h1>`; heading levels step down without skips.
- [ ] Landmarks: `header`, `nav` (labelled if more than one), one `main`, `footer`.
- [ ] Lists are `<ul>`/`<ol>`; tables have `<th>` with `scope`; related fields sit in `<fieldset>` with `<legend>`.
- [ ] Unique, descriptive `<title>` per page.

**Reflow and zoom**
- [ ] At 320px wide: no horizontal scroll (data tables and code blocks may scroll inside their own container).
- [ ] At 200% browser zoom: nothing cut off or overlapping, all actions reachable.
- [ ] Text containers have no fixed heights; line-height is unitless.
- [ ] Viewport meta allows zoom (no `user-scalable=no`, no `maximum-scale=1`).
- [ ] Essential text (headings, actions, errors) is never truncated without a way to read it in full.

## 2. Operable

**Keyboard**
- [ ] Every interactive element is reachable with Tab, in visual reading order.
- [ ] Every action can be done with the keyboard alone (including drag alternatives).
- [ ] No keyboard trap outside an open modal; Escape closes overlays.
- [ ] No positive `tabindex`.
- [ ] Skip link is the first focusable element and becomes visible on focus.
- [ ] Hover-revealed controls also appear on `:focus-within`.

**Focus**
- [ ] Every focusable element shows a `:focus-visible` indicator: at least 2px, 3:1 contrast, instant.
- [ ] Focused elements are never fully hidden under sticky headers, cookie bars or chat widgets (`scroll-padding-top`).
- [ ] Opening a dialog moves focus into it; closing returns focus to the opener.
- [ ] After a route change, focus moves to the new content and the title updates.
- [ ] After deleting an item, focus moves to a sensible neighbour, not to `<body>`.

**Pointer and touch**
- [ ] Targets at least 24x24 CSS px (AA); 44x44 on touch layouts; 8px between neighbours.
- [ ] Actions fire on pointer up (click), not pointer down, so a slip can be cancelled.
- [ ] Every drag operation has a single-pointer alternative (buttons, a menu, arrow keys).
- [ ] No functionality needs a multi-finger gesture or a path gesture without an alternative.

**Time and motion**
- [ ] `prefers-reduced-motion: reduce` removes parallax, large movement and scroll-linked effects.
- [ ] Content is visible with motion off and with JavaScript off (no opacity-0 waiting for a reveal).
- [ ] Anything moving, blinking or auto-updating longer than 5 seconds can be paused.
- [ ] Nothing flashes more than 3 times per second.
- [ ] Session timeouts warn before expiry and allow extending; work is saved.

## 3. Understandable

**Forms**
- [ ] Every field has a visible label tied with `for`/`id` (or wrapping `<label>`).
- [ ] The accessible name contains the visible label text.
- [ ] `type`, `inputmode` and `autocomplete` set correctly.
- [ ] Required fields marked in text or with a mark explained once; `required` or `aria-required`.
- [ ] Format constraints shown before submit ("At least 12 characters").
- [ ] Errors: text beside the field, `aria-invalid="true"`, linked with `aria-describedby`, plus an icon and colour.
- [ ] On failed submit, focus moves to the first invalid field or an error summary linking to each.
- [ ] Input is kept after a failed submit; paste is never blocked.
- [ ] Information entered earlier in a flow is not asked for again (or is prefilled).
- [ ] Sign-in works with password managers and paste; no puzzle as the only path.

**Consistency and language**
- [ ] Navigation and help links sit in the same place on every page.
- [ ] Same controls have the same names everywhere.
- [ ] Link text makes sense out of context.
- [ ] Error messages say what happened and how to fix it (`drip_guide copy/microcopy`).

## 4. Robust

- [ ] Native elements used for buttons, links, inputs, dialogs.
- [ ] Custom widgets expose role, name and state (`aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`).
- [ ] Status messages use `role="status"` (polite) or `role="alert"` (urgent), in a region present before the update.
- [ ] No duplicate `id`s; every `aria-describedby`/`aria-labelledby` target exists.
- [ ] Nothing focusable sits inside an `aria-hidden="true"` subtree.

## 5. Test steps (15 minutes per screen)

1. **Keyboard (5 min).** Click the address bar, then Tab through the page. Write down any stop with no visible ring, any stop out of order, any action you cannot complete, any place you get stuck. Open and close every menu and dialog with Enter and Escape.
2. **Zoom and reflow (2 min).** Zoom to 200%; then set the window to 320px wide. Look for cut-off text, overlaps, sideways scroll.
3. **Contrast (2 min).** `palette_check` on the tokens; in devtools, inspect the lightest text and the input borders.
4. **Reduced motion (1 min).** Devtools > Rendering > emulate `prefers-reduced-motion: reduce`; reload; scroll the page.
5. **Names and structure (3 min).** Devtools Accessibility pane: check names of icon buttons, the headings list, landmarks. Or run axe.
6. **Forms (2 min).** Submit empty, then with one wrong value. Check messages, focus movement, kept input.

### Screen reader spot check

| Reader | Start | Next item | Headings list | Activate |
|---|---|---|---|---|
| VoiceOver (macOS) | Cmd+F5 | VO (Ctrl+Option) + Right | VO+U, then arrows to Headings | VO+Space |
| NVDA (Windows) | Ctrl+Alt+N | Down arrow | Insert+F7 | Enter |
| TalkBack (Android) | Volume keys both, 3 s | Swipe right | Reading controls: headings | Double tap |
| VoiceOver (iOS) | Settings or triple-click side button | Swipe right | Rotor: headings | Double tap |

Listen for: every control announced with a role and a useful name, state changes announced (expanded, selected, error), no "button button", no "image image-1234.png", no silent updates after an action.

## 6. Component patterns

Prefer a tested primitive (Radix, React Aria, Base UI, Headless UI, Ark UI) over hand-rolling these. If you build one, match this table.

| Component | Element / role | Name | Keys | Focus |
|---|---|---|---|---|
| Dialog (modal) | `<dialog>` via `showModal()`, or `role="dialog"` + `aria-modal="true"` | `aria-labelledby` = its title | Escape closes; Tab cycles inside | Into the dialog on open (first field or the title); back to the opener on close; page behind is `inert` |
| Disclosure / accordion | `<button aria-expanded aria-controls>`, or `<details><summary>` | Button text | Enter/Space toggles | Stays on the button |
| Tabs | `role="tablist"`, `tab` with `aria-selected`, `tabpanel` with `aria-labelledby` | Tab text | Left/Right move between tabs; Home/End; Tab moves into the panel | Only the selected tab is in the Tab order (roving tabindex) |
| Menu (actions) | Button with `aria-haspopup="menu"` `aria-expanded`; `role="menu"` with `menuitem` | Button text | Enter/Space/Down opens; arrows move; Escape closes; type-ahead | First item on open; back to the button on close |
| Navigation menu (links) | `<nav>` with a list of links; disclosure buttons for sub-lists | Link text | Tab through links; Enter/Space toggles sub-lists | Normal Tab order (do not use `role="menu"` for site nav) |
| Combobox / autocomplete | `<input role="combobox" aria-expanded aria-controls aria-activedescendant>` + `role="listbox"` with `option` | Visible label | Down opens/moves; Enter selects; Escape closes then clears | Stays in the input; active option via `aria-activedescendant` |
| Select | Native `<select>` first; custom only with listbox semantics | Visible label | Native behaviour | Native |
| Switch | `<button role="switch" aria-checked>` or checkbox | Visible label | Space toggles | Stays |
| Radio group | `<fieldset>` + native radios, or `role="radiogroup"` | `<legend>` | Arrows move and select | One stop for the group |
| Tooltip | `role="tooltip"`, trigger has `aria-describedby` | - | Escape hides; shows on focus at once, on hover after 500-800ms | Never holds focus; never holds essential info or controls |
| Toast | Container with `role="status"` (or `alert` for errors) | Message text | Action reachable by keyboard; Escape or a close button | Does not steal focus |
| Popover (non-modal) | Popover API or `role="dialog"` without `aria-modal` | Trigger text | Escape closes | Into the popover if it has controls; back on close |
| Data table | `<table>`, `<caption>`, `<th scope>` | Caption | Sortable headers are buttons with `aria-sort` on the `th` | Normal |
| Carousel | Region with `aria-roledescription="carousel"` and a label; slides as groups | Label | Previous/next buttons; pause control if it auto-plays | Normal; autoplay stops on focus and hover |
| Icon button | `<button type="button" aria-label>` | Action + object | Enter/Space | Visible ring; 24x24 minimum, 44x44 on touch |

## 7. Quick fixes in React + Tailwind

```tsx
// Visually hidden text (name for an icon button or extra context)
<span className="sr-only">Delete invoice INV-204</span>

// Skip link
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50
  focus:rounded-md focus:bg-background focus:px-4 focus:py-2">Skip to content</a>
<main id="main" tabIndex={-1}>…</main>

// Live status region, rendered once, filled later
<p role="status" aria-live="polite" className="sr-only">{statusMessage}</p>

// Bigger hit area without changing the look
<button aria-label="Close" className="relative size-8 before:absolute before:-inset-2">…</button>

// Reduced motion in Tailwind
<div className="transition-transform motion-reduce:transition-none motion-reduce:transform-none">…</div>
```

## Sources

Checklist structure follows WCAG 2.2 (W3C) principles. Items adapted and rewritten from Impeccable (Apache-2.0) audit and harden references, Hallmark (MIT) gates and interaction-and-states reference, and UI UX Pro Max (MIT) UX guidelines (WCAG 2.2 rows: target size, focus not obscured, dragging, redundant entry, accessible authentication, error summary, modal focus). Component keyboard patterns summarised from the WAI-ARIA Authoring Practices. Inspired by Vercel's Web Interface Guidelines (paraphrased, no text reused).

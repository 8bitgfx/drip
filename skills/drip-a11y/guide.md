# Accessibility

An accessible interface works for someone who cannot see the screen, cannot use a mouse, zooms to 200%, turns motion off, uses a phone with one thumb, or is colour-blind, and nobody else notices anything special was done. Text is readable against its background, every control can be reached and operated by keyboard with a ring you can see, every element says what it is to a screen reader, forms explain themselves and their errors, and nothing depends on colour or motion alone. Accessibility is not a later pass: most of it is choosing the right element and the right number the first time.

## The procedure

1. **Before building: check the palette.** Run `palette_check` on the system's colours. Note which ink steps pass 4.5:1 on which surfaces, which pass only 3:1 (large text, borders, icons). Fix ramps with `palette_generate` before any component uses them. See `drip_guide color`.
2. **Pick native elements and proven primitives.** Buttons are `<button>`, links are `<a href>`, modals are `<dialog>` or a Radix/React Aria/Base UI primitive. Do not hand-roll menus, comboboxes, tabs or dialogs when the component library has an accessible one (`drip_guide components`).
3. **Build with the rules on the first screen of this skill.** Labels, names, focus rings and target sizes go in as you write the component, not after.
4. **Lint:** `fitcheck_lint` catches removed outlines and low-contrast grey utilities.
5. **Test by keyboard:** unplug the mouse in your head. Tab from the address bar through the whole page. Every stop visible, in reading order, every action possible, Escape closes, nothing trapped.
6. **Test structure:** read the headings outline (h1 to h6) and the landmarks. Read the accessible name of every button and link (browser devtools Accessibility pane).
7. **Test the states:** submit a form empty and wrong; check errors are text, linked and announced; check loading and success are announced.
8. **Test zoom and motion:** zoom to 200% and resize to 320px; turn on reduced motion in the OS or devtools rendering panel.
9. **Look:** `fitcheck_shot` at phone and desktop. Check target sizes and that the focus ring shows on a focused element in the screenshot.
10. **Automated pass if available:** axe (via browser extension or `@axe-core/playwright`) finds about a third of issues. It never replaces steps 5 to 8.

Full step-by-step test list and component patterns: `a11y/checklist`.

## The craft

### 1. Contrast

| Element | Minimum (AA) | Target |
|---|---|---|
| Body text, labels, placeholders you rely on | 4.5:1 | 7:1 for long reading |
| Large text: 24px+ regular, or 18.66px+ bold | 3:1 | 4.5:1 |
| Icons that carry meaning, input borders, focus rings, chart lines and bars | 3:1 against adjacent colours | |
| Disabled controls | No requirement, but must still look disabled, not invisible | |
| Text over images | 4.5:1 against the actual pixels behind it | Scrim or calm area (`drip_guide imagery`) |

- **Do:** body text in the ink's darkest steps; secondary text one step lighter that still passes 4.5:1.
- **Don't:** `text-gray-400` on white (about 2.9:1), grey text on a coloured surface, placeholder text as the only hint.
- Check both themes. Dark mode fails differently: pure white on near-black glares, and mid greys collapse.
- On coloured surfaces, tint secondary text from the surface's hue or use the paired foreground token; never generic grey.

### 2. Focus

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
input:focus-visible, textarea:focus-visible, select:focus-visible { outline-offset: -1px; } /* inset on fields */
```

Tailwind: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--focus]`.

- Use `:focus-visible` so mouse clicks do not show the ring and keyboard focus always does.
- The ring is 3:1 against both the element and the page. A two-tone ring (outline plus a `box-shadow` of the page colour) survives on any background.
- Rings never animate in or out. Transitions on `outline` make keyboard use feel laggy.
- Never let focus hide behind sticky headers or footers: `scroll-padding-top: var(--header-height)` on `html`.
- **Don't:** `outline: none` or Tailwind `outline-none` without a `focus-visible` replacement. `fitcheck_lint` flags it as an error.

### 3. Keyboard

| Key | Must do |
|---|---|
| Tab / Shift+Tab | Move through every interactive element in visual reading order |
| Enter | Activate links and buttons, submit forms |
| Space | Activate buttons, toggle checkboxes and switches |
| Escape | Close the open dialog, menu, popover or tooltip; return focus to the opener |
| Arrow keys | Move within composite widgets: menus, tabs, radio groups, listboxes, sliders |
| Home / End | First and last item in lists, menus and sliders |

- Visual order and DOM order match. Do not reorder with CSS `order` or absolute positioning in a way that breaks Tab order.
- `tabindex="0"` only to make a custom widget focusable; `tabindex="-1"` for programmatic focus targets; never positive values.
- Add a "Skip to content" link as the first focusable element on pages with a nav: visible when focused.
- Dragging (reorder, resize) has a single-pointer and keyboard alternative: move up/down buttons, or arrow keys on a focused handle.
- Hover-only actions (row actions that appear on hover) must also appear on focus-within, and be reachable on touch.

### 4. Semantics and ARIA basics

The first rule of ARIA: if a native element does it, use the native element.

| Need | Use | Not |
|---|---|---|
| An action | `<button type="button">` | `<div onClick>`, `<a>` without `href` |
| Go somewhere | `<a href="/pricing">` | `<button onClick={() => router.push()}>` (breaks open-in-new-tab) |
| Toggle | `<button aria-pressed>` or a checkbox `role="switch"` | A div that changes colour |
| Expand/collapse | `<button aria-expanded aria-controls>`, or `<details><summary>` | Click handler on a heading |
| Modal | `<dialog>` with `showModal()`, or a library dialog | A fixed div with no focus management |
| Group of fields | `<fieldset>` + `<legend>` | A div with a bold line |
| Navigation | `<nav aria-label="Main">` | A div of links |
| List of items | `<ul>`/`<ol>` | Stacked divs |
| Data | `<table>` with `<th scope>` | A grid of divs for tabular data |
| Live update | `role="status"` (polite) or `role="alert"` (urgent) | Silent DOM changes |

- Every interactive element has an accessible name: its visible text, a `<label>`, `aria-label` or `aria-labelledby`. The name contains the visible label text. Icon-only controls say the action and the object ("Close dialog", "Delete invoice").
- State is exposed: `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-current="page"` on the active nav link, `aria-invalid` on bad fields, `aria-busy` while loading.
- `aria-hidden="true"` on decorative icons and duplicated visuals; never on anything focusable.

### 5. Forms and errors

```tsx
<div>
  <label htmlFor="email" className="text-sm font-medium">Work email</label>
  <input id="email" name="email" type="email" autoComplete="email" required
         aria-invalid={!!error} aria-describedby={error ? "email-error" : "email-hint"}
         className="mt-1 h-10 w-full rounded-md border px-3 text-base" />
  <p id="email-hint" className="mt-1 min-h-[1lh] text-sm text-muted-foreground">
    {error ? null : "We send receipts here."}
  </p>
  {error && <p id="email-error" className="mt-1 text-sm text-destructive">{error}</p>}
</div>
```

- Visible label above every field, tied by `for`/`id` or wrapping. Placeholders are format hints, never labels.
- Correct `type`, `inputMode` and `autoComplete` (email, tel, one-time-code, street-address) so phones show the right keyboard and password managers fill.
- Inputs at 16px or larger on mobile (smaller makes iOS zoom the page).
- Required fields: `required` plus a visible word or mark explained once; never colour alone.
- Errors: text near the field, linked by `aria-describedby`, `aria-invalid="true"`, with an icon and colour as extra cues. On submit, move focus to the first invalid field (or to an error summary at the top that links to each field).
- Validate on blur after typing, not on every keystroke while the user is still typing; clear errors the moment they are fixed.
- Keep the submit button enabled; disable it only while the request is in flight. Never block paste.
- Keep user input after a failed submit.

### 6. Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

The blanket reset above is a safety net, not the design. Better: for each animation, decide its reduced version.

| Motion | Reduced version |
|---|---|
| Slide, scale or parallax entrance | Opacity fade of 150ms, or none |
| Scroll-linked effects, scroll-jacking | Off; show the end state |
| Auto-playing carousel or marquee | Stopped, with controls |
| Background video | Poster frame, play button |
| Loading spinner, progress | Keep (it is information) |
| Hover lift | Colour change only |

- Content must be visible with motion off and with JavaScript off: never ship a section at `opacity: 0` waiting for a scroll trigger.
- Anything that moves, blinks or auto-updates for more than 5 seconds has a pause, stop or hide control.
- Nothing flashes more than 3 times a second.
- Details: `drip_guide motion`.

### 7. Touch targets

| Platform | Target |
|---|---|
| Web, WCAG 2.2 AA minimum | 24x24 CSS px (or enough spacing around a smaller target) |
| Web, recommended on touch | 44x44 CSS px |
| iOS | 44x44 pt |
| Android | 48x48 dp |

- Expand a small visual without changing its look: `position: relative` plus a `::before` with negative inset.
- At least 8px between adjacent targets.
- Inline text links are exempt from size rules but need clear underline or contrast.
- Primary actions on phones sit within thumb reach (bottom half) where the pattern allows.

### 8. Images and media

- Alt text says what the image tells in context, under about 125 characters. "Chart: revenue up 12% since March" beats "chart".
- Decorative: `alt=""` (empty, not missing). Icons beside text: `aria-hidden="true"`.
- Complex images (charts, diagrams): a short alt plus the data in text or a table nearby.
- Video: captions for speech, `muted` for autoplay, a pause control, no autoplay with sound.
- No text inside images. If unavoidable (a logo), the alt repeats it.

### 9. Never colour alone

- Errors: red border plus an icon plus the message text.
- Status badges: colour plus a word ("Paid", "Overdue").
- Links in running text: underline (or 3:1 contrast with surrounding text plus underline on hover and focus).
- Charts: direct labels, patterns or shapes per series, not only hue.
- Required fields: a word or mark, not a red label.

### 10. Structure and reflow

- `<html lang="en">` (the real language), a unique `<title>` per page, one `<h1>`, headings that step down one level at a time.
- Landmarks: `header`, `nav`, `main` (one), `footer`; `aside` for complementary content.
- At 200% zoom and 320px width: no content cut off, no horizontal scroll (except data tables and code inside their own scroll container), no text overlapping.
- Line height and spacing survive user overrides: use unitless line-height, no fixed heights on text boxes.
- Truncation never hides essential text (headings, actions, errors). Wrap, or give a path to the full text.

### 11. Dynamic content

- Status messages (saved, 3 results, uploading) go in a `role="status"` region that exists before the message arrives.
- Urgent errors use `role="alert"`; use it sparingly, it interrupts.
- When a dialog opens, focus moves into it; when it closes, focus returns to the control that opened it.
- After navigation in a single-page app, move focus to the new page's `h1` or main region and update the title.
- Toasts that matter do not vanish in under 5 seconds and are reachable; errors stay until dismissed.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| `outline-none` with no `focus-visible` style | Add a 2px `focus-visible` ring at 3:1 |
| `<div onClick>` as a button | `<button type="button">` |
| Placeholder as the only label | Visible `<label>` above the field |
| Icon button with no name | `aria-label` naming the action and object |
| `text-gray-400` body or helper text on white | A darker step that passes 4.5:1 (`palette_check`) |
| Red border as the only error signal | Message text, icon, `aria-invalid`, `aria-describedby` |
| Toast-only form errors that auto-dismiss | Inline errors that stay until fixed |
| Disabled submit until the form is valid | Enabled submit that reveals what is missing |
| Content hidden at `opacity: 0` until a scroll animation | Visible by default; animate only when motion is allowed and JS ran |
| Parallax and scroll-jacking with no reduced-motion path | Static end state under `prefers-reduced-motion` |
| 32px icon buttons tightly packed on mobile | 44x44 hit areas, 8px gaps |
| `h1` then `h4` for style | Correct levels, styled with classes |
| Modal built from divs, focus left on the page behind | `<dialog>` or a library dialog: focus in, trap, Escape, focus back |
| `alt="image"` or file names as alt | Describe what it tells, or `alt=""` |
| Hover-only row actions | Also on `:focus-within`, always visible on touch |
| Auto-rotating carousel with no pause | Stop autoplay, add controls |
| Sticky header covers the focused field | `scroll-padding-top` equal to header height |
| `user-scalable=no` in the viewport meta | Remove it; never block zoom |

## Done when

- [ ] `palette_check` shows every text pair at 4.5:1 (3:1 for large text, borders, icons, rings) in every theme.
- [ ] Tabbing through the page reaches every control in reading order with a visible ring; Escape closes every overlay.
- [ ] No `outline-none` without a `focus-visible` replacement (`fitcheck_lint` has no `outline-none` error).
- [ ] Every button, link and input has an accessible name; every field has a visible label.
- [ ] Errors are text, linked to their fields, announced, and not colour-only; focus moves to the first error on submit.
- [ ] Touch targets are 44x44 on phone screenshots (never under 24x24).
- [ ] Reduced motion leaves no parallax, no large movement, no hidden content.
- [ ] Every image has fitting alt text or `alt=""`.
- [ ] One `h1`, headings in order, landmarks present, `lang` and `<title>` set.
- [ ] At 320px and 200% zoom, nothing is cut off and nothing scrolls sideways.

## Reference files

- `drip_guide a11y/checklist`: the full test checklist by area, keyboard and screen-reader test steps, and patterns for dialogs, menus, tabs, comboboxes, accordions, tooltips and toasts.

Related guides: `drip_guide color` (contrast-safe palettes), `drip_guide motion` (reduced motion), `drip_guide copy/microcopy` (error and label words), `drip_guide components` (accessible primitives), `drip_guide fitcheck` (the polish score includes these checks).

## Sources

Ideas adapted and rewritten from: Impeccable (Apache-2.0) audit, harden and critique-rubric references (accessibility scoring, keyboard and screen-reader resilience, the accessibility persona); Hallmark (MIT) gates and interaction-and-states reference (instant focus rings at 3:1, hit-target expansion, field states, content hidden at rest, tooltip focus timing, pause controls); UI UX Pro Max (MIT) UX guidelines data (WCAG 2.2 target size, focus not obscured, dragging alternatives, error summary, validation timing, never block paste); Taste Skill (MIT) finish checklist (Tab walk, skip link, tap size). Inspired by Vercel's Web Interface Guidelines (paraphrased, no text reused). WCAG 2.2 criteria summarised from the W3C recommendation.

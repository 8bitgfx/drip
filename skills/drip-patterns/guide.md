# Patterns: learn from a reference, build your own

What good looks like: the finished component behaves like the reference (same states, the same timing feel,
the same keyboard contract, the same responsive logic) and looks like it belongs to this project, in this
project's tokens and code. A reader of the diff can see it was written fresh. The spec, the evidence and the
source are saved so the next task reuses it.

## Procedure

1. **Look for what exists.** `pattern_list` (saved patterns), components_local_find (the project's own components, when that tool exists), then `components_find` (libraries). Reuse an approved pattern. Build only when nothing fits.
2. **Study.** `pattern_study({ name, url | file, selector, states })`.
   - `url` can be a live page, a localhost dev server, or a Storybook / Ladle story URL (`/iframe.html?id=...`). `file` can be a local .html or a screenshot.
   - Give a `selector` for the component (the demo's wrapper). Without one Drip measures the page's main content.
   - Give `states` as real input steps, in order: `hover`, `press` (mouse held: the :active state), `focus`, `click`, `key` (Tab, Enter, Space, Escape, ArrowDown...), `type`, `drag`. Label each ("open", "second item focused"). Steps run cumulatively; end with the Escape or close step so you see the way back.
   - Put the source in the record: `title`, `author` when known.
3. **Read the spec** (`.drip/patterns/<id>/spec.md`, or the tool output). Look for:
   - Structure and geometry relative to the root: what sits where, the layout mode, the gaps.
   - Type: sizes with weights and line heights, letter spacing, casing.
   - Colour roles: background, surface, text, muted, border, accent. Take the role, not necessarily the hex: map it to your token.
   - Spacing on a 4 or 8 grid, radii, shadows.
   - State changes: exactly which properties change on hover, press, focus, open.
   - Motion: duration, easing, delay per property, what actually moved (the traces), whether there is a `prefers-reduced-motion` rule.
   - Keyboard: tab stops, visible focus, whether Enter / ArrowDown opens, whether Escape closes and returns focus.
   - ARIA: roles and attributes the reference sets.
   - Screenshot-only specs have colours and layout bands only. Everything else is unknown: ask for the live page or measure your own build instead of guessing.
4. **Decide what you keep and what you change on purpose.** Write it down: `pattern_spec({ id, notes })`. Behaviour and principle carry over. Distinctive artwork, copy, brand and exact expression do not (unless the user owns or has licensed the reference and asks for fidelity).
5. **Implement independently.**
   - Behaviour from a primitive matched to the project's stack: Radix Primitives, React Aria Components or Base UI for React; the platform's own `<dialog>`, `popover` and `<details>` for plain HTML. Motion (or CSS) for animation, using the project's motion library if it has one.
   - Look from the project's tokens and the approved board.
   - Plain HTML, CSS and JS is fine for a plain site: no framework needed.
6. **Render.** `pattern_preview({ id, url | file | html + css + js, selector })`. For React, point `url` at the user's dev server, Storybook or Ladle story; Drip does not run your build. Look at the sheet: three sizes, then each state.
7. **Compare.** `pattern_compare({ id, url | file | html..., selector })`.
   - Sheet: reference | yours | diff heatmap per size and state, with the share of pixels that differ.
   - Deltas ranked high / medium / low: geometry, type, colour roles, radii, spacing, motion duration and easing, states that change nothing, keyboard, ARIA.
   - axe-core on your build. It is fetched once from a pinned jsDelivr version; set `DRIP_AXE_PATH` for a local file. If it cannot run, the output says so: do not claim an accessibility pass.
8. **Refine** and compare again until no high deltas remain. For third-party inspiration, small pixel differences are expected and fine; a missing state, a missing Escape, a wrong easing family are not.
9. **Save.** `pattern_save({ id, files: [your component files], tags, status: "proposed" })`. Show the user; when they accept it, save again with `status: "approved"`.

## What a pass looks like

| Area | Pass |
|---|---|
| Pixels (own or licensed design) | under 2% per size and state, differences explained |
| Pixels (inspiration) | same composition and weight; not identical on purpose |
| States | every reference state changes something in yours |
| Motion | longest duration within 20% (or 30 ms), same easing family, reduced-motion handled |
| Keyboard | tab stops equal or better, focus ring on every stop, opens and closes from the keyboard, focus returns on close |
| ARIA | every reference role and the key `aria-*` attributes present |
| axe | no violations, or each one explained |
| Responsive | no horizontal overflow at 375; targets 24px or more (44px for touch primary actions) |

## Slop tells in this workflow

- A static screenshot imitation: `<img>` of the demo, or a div that looks like a menu with no keyboard. Fix: real primitive, real states.
- Matching the hex and size values but dropping the motion. Fix: copy the timings and easing from the spec.
- Re-skinning the reference's copy and brand. Fix: your own content and tokens.
- Declaring done because the pixel diff is small, with high keyboard or ARIA deltas. Fix: the deltas are the review.
- Saving as `approved` before the user looked. Fix: `proposed`, then ask.

## Done when

- [ ] `pattern_compare` shows no `[high]` deltas (or each is explained in the spec notes)
- [ ] axe ran and is clean, or its absence is stated
- [ ] Keyboard and ARIA at least as good as the reference
- [ ] The component uses the project's tokens and primitives, and no reference markup, text or assets
- [ ] `pattern_save` done with the source recorded; status approved only after the user's yes
- [ ] The page it lives in passed its own fit check and critic review

## Sources

Workflow and measurements are Drip's own. Primitive choices follow the Radix Primitives, React Aria and Base UI docs; the pixel metric is the YIQ perceptual difference used by pixelmatch (ISC); accessibility checks are axe-core (MPL-2.0), loaded at run time and not bundled.

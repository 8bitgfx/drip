# Patterns: study, extract, implement, render, compare, save

Module: `mcp/src/modules/patterns/`. Skill: `skills/drip-patterns/`. Everything runs in the user's own Chrome/Edge through the shared browser (`core/browser.mjs`); no hosted service.

## Tools

| Tool | What it does |
|---|---|
| `refs_extract({ url \| file, selector?, states?, sizes? })` | Measures a live page, a local .html or a screenshot. Returns a readable spec plus a contact sheet and writes the full JSON to `.drip/cache/extract-<time>.json`. Saves nothing else. |
| `pattern_study({ name, url \| file, selector?, kind?, states?, sizes?, tags?, title?, author?, notes? })` | Extract plus evidence: `.drip/patterns/<id>/spec.json`, `spec.md`, `reference/base-<w>.png` and `reference/state-<n>-<w>.png`, and an index entry with status `proposed`. |
| `pattern_spec({ id, notes?, patch?, url? \| file? })` | Adds notes, sets fields by dotted path, or re-measures. Rewrites spec.json and spec.md. |
| `pattern_preview({ id?, url \| file \| html+css+js, selector?, states?, sizes? })` | Renders an implementation at sizes and states. Plain HTML/CSS/JS gets a generated neutral test page. React: pass the user's dev server, Storybook or Ladle URL. Saves shots and `impl-spec.json` in `.drip/patterns/<id>/preview/`. |
| `pattern_compare({ id, url \| file \| html..., selector?, threshold?, axe? })` | Reference \| implementation \| diff heatmap per size and state, pixel-difference percentages, measured spec deltas, axe-core, keyboard checks. |
| `pattern_save`, `pattern_list`, `pattern_get` | The project's pattern library (`.drip/patterns/index.json`). |

Without `states`, `pattern_preview` and `pattern_compare` reuse the reference's own steps, so every state is compared.

## What the spec holds

`schema: 1`, `kind` (`live`, `local`, `screenshot`), `inferred`, `source { url, file, selector, title, author, capturedAt }`, then:

- `root`, `structure` (up to 40 nodes: geometry relative to the root, layout mode, type, colours, radius, border, shadow, padding)
- `type { families, scale }`, `hierarchy`, `colors { roles, palette }` (roles: background, surface, text, muted, border, accent), `spacing { unit, padding, gaps }`, `radii`, `shadows`
- `states[]`: per step, which tracked elements changed which properties (computed style, size, position, `aria-*`, `data-state`), what appeared or disappeared. Popups rendered in portals (`role=menu`, `listbox`, `dialog`, `tooltip`, Radix poppers) are tracked too.
- `motion { declared, keyframes, reducedMotionRules, observed }`: declared transitions and animations (duration, easing, delay) and, for every step, the animations running right after the input (`getAnimations()` plus transition and animation events), with sampled opacity, transform and size over time and the time it took to settle.
- `responsive { 375, 768, 1440 }`: root size, layout mode, visible and hidden children, text size range, horizontal overflow, smallest interactive target.
- `keyboard`: tab order with focus visibility, and for the first popup trigger whether Enter or ArrowDown opens it, ArrowDown moves focus, Escape closes it and where focus goes.
- `aria`: roles, `aria-*` attributes, interactive and tabbable counts, issues (unnamed controls, dangling `aria-controls`, small targets).

A screenshot has no DOM: its spec has `inferred: true`, colours (quantised palette), size, layout bands and content column, and says everything else is unknown.

## Compare

- Pixel metric: pixelmatch's YIQ perceptual delta (threshold 0.1 by default), computed in the browser. Images are aligned at the top-left on the larger canvas; a size difference is reported as such.
- Deltas (`compareSpecs` in `spec.mjs`), each `high`, `medium` or `low`: root size per breakpoint, layout mode, overflow, type sizes, main font, colour roles (RGB distance), radii, shadows, padding values, longest transition or animation duration and easing, states that change nothing, popup trigger, tab stops, focus ring, opens from the keyboard, Escape closes, ARIA roles and attributes.
- axe-core 4.10.2: read from `DRIP_AXE_PATH` if set; otherwise downloaded once from jsDelivr (pinned) into `~/.drip/vendor/` and injected through CDP. If neither works, the output says "axe: not run" and why. axe is not bundled.

## Index schema (read by the components module)

`.drip/patterns/index.json`, written through `core/jsonstore.mjs` (lock, atomic write, revision):

```json
{ "revision": 7, "patterns": [{
  "id": "actions-menu", "name": "Actions menu",
  "kind": "component | section | page | motion | style",
  "files": ["src/components/actions-menu.tsx"],
  "spec": ".drip/patterns/actions-menu/spec.json",
  "previews": [".drip/patterns/actions-menu/reference/base-1440.png"],
  "source": { "url": "https://...", "file": "...", "title": "...", "author": "...", "capturedAt": "..." },
  "status": "proposed | approved", "tags": ["menu"], "notes": "...", "updatedAt": "..." }] }
```

All paths are project-relative. `store.mjs` exports `listPatterns({ status, kind, tag })`, `getPattern(id)` and `upsertPattern(entry)` for other modules.

## Additions to shared code

- `core/cdp.mjs`: `runStep(s, step)` (one real-input step; adds `press`, `release` and `focus` to the kinds `captureStates` knows) and `STEP_KINDS`. `captureStates` itself is unchanged and could call `runStep` later.
- `core/browser.mjs`: `evalJson(s, expression)`.

## Limits

- Hover, focus, active and open states are measured by real input. A permanently `disabled` element only shows up in `structure` and ARIA, not as a state step.
- Closed Shadow DOM and cross-origin iframes are not measured. Cross-origin stylesheets cannot be read for `@keyframes` (the running animation is still observed).
- Pixel comparison is only meaningful when both renders share fonts; with different fonts read the deltas.
- Verified here on Windows with Edge. Not run on macOS or Linux.

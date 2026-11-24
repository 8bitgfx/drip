---
name: drip-patterns
description: Use when the user wants a component, section, page, motion or style built like a reference (a premium demo on 21st.dev, a site's menu, a Dribbble shot's live page, a screenshot, their own existing component), or asks to reverse-engineer, match, recreate or learn from how something looks and behaves. Part of Drip; covers study, extract, independent implementation, render, compare and save.
user-invocable: false
---

# Patterns (Drip)

**Before you do anything: call `drip_guide` with topic `patterns`.** It returns the full procedure and records the read.
No Drip task yet? Call `drip_start` first.

The loop: **study -> extract -> implement your own -> render -> compare -> refine -> save.** You learn what a thing
does and how it is measured, then you write your own code for it. You never copy the reference's markup, text or assets.

## Rules you must not break
1. Measure, don't eyeball: `refs_extract` or `pattern_study` first. A screenshot-only reference is labelled inferred; say so and don't invent timings or keyboard behaviour for it.
2. Study only what is publicly visible in the browser. Never log in to, or work around, a paywall or access control.
3. Build your own version: your tokens, your framework, an accessible primitive for behaviour (Radix, React Aria, Base UI; Motion for motion when the project already uses a motion library). Don't paste the reference's markup, copy, images or brand.
4. Check `pattern_list` and components_local_find (from the components workstream, once merged) before building: an approved pattern is reused, not rebuilt.
5. Real behaviour, not a picture of it: states by real input (hover, focus, open, Escape, arrows), timings and easing from the spec, keyboard and ARIA at least as good as the reference.
6. Render at 375, 768 and 1440 (`pattern_preview`), then `pattern_compare`. Fix every `[high]` delta before saying it is done; explain any you chose to keep (`pattern_spec` notes).
7. A close pixel match is the goal only for the user's own or already-licensed designs. For third-party inspiration, match behaviour and principle and make the expression your own.
8. `pattern_save` records provenance (source URL, author). Status stays `proposed` until the user accepts it; only then `approved`.
9. A passing compare does not pass the task's own gates (fit check, critic). Run those on the page the component sits in.

## Tools
- `refs_extract` — measure a URL, local .html or screenshot (spec only, nothing saved)
- `pattern_study` — extract + evidence into `.drip/patterns/<id>/`
- `pattern_spec` — add intent notes, correct fields, re-measure
- `pattern_preview` — render your implementation (URL, local .html, or html + css + js) at sizes and states
- `pattern_compare` — reference | yours | diff, measured deltas, axe, keyboard
- `pattern_save`, `pattern_list`, `pattern_get` — the project's pattern library

## Read deeper when
| Situation | Call |
|---|---|
| Writing the implementation | `drip_guide components` |
| Motion timing and easing choices | `drip_guide motion` |
| States, focus, keyboard | `drip_guide interaction` |

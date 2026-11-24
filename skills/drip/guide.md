# The Drip loop

AI-made UI looks AI-made because it skips straight to code with the defaults it has seen most often, sets them small, then grades itself kindly. Drip makes you decide with evidence, compose the first viewport before the CSS, build at real scale, and put an independent critic between your work and the user. The craft lives in the **playbook** (`drip_guide playbook`); this page is the map.

## Modes

| The request | Mode | Loop |
|---|---|---|
| New page, site, portfolio, landing; "redesign", "make it less AI" | `design` | full, by the playbook |
| App screen, dashboard, component | `design` | full: hard rules + the surface guide (`app`, `mobile`, `components`) |
| Logo, wordmark, mark, identity | `logo` | full (`drip_guide logo`) |
| "Find me references for…" | `refs` | stops after the study summary |
| "Make me a moodboard / some directions" | `board` | stops after the user picks |
| A spacing, colour, hover state, one section, a label | `polish` | quick: change → lint → `fitcheck_done` |

When in doubt between polish and design on something the user sees first (a hero, a landing page, an onboarding screen), choose **design**. `/drip:critic` reviews any URL, file or image on its own; `/drip:adapt` builds a niche pack; `/drip:settings` holds status, keys, skip and stop.

## Project memory

A project keeps its design memory in `.drip/` (master board, approved direction, rules, measured tokens, a generated project skill). `drip_start` loads it for design tasks and says what is inherited and what the task still has to do; `project_context` shows it any time. Evidence is bound to what it reviewed: a fit check, shot or critic verdict goes stale when the UI files, DESIGN.md or direction change, and `drip_end` (and the Stop hook) also catch UI edits Drip never saw. See `drip_guide moodboard` (master board, fidelity vs redesign, feedback) and docs/PROJECT_MEMORY.md.

## How lazy agents fail, and Drip's answer

| Shortcut | What it produces | Drip's answer |
|---|---|---|
| Guesses the brief, never asks about material | Pages with nothing to show | Intake asks about material first; `drip_brief` is required |
| Studies only one kind of reference | Docs and repo pages give no ambition; concept shots alone give 13px labels and 89px heroes | Taste pass from galleries and Dribbble for the idea, reality pass with `refs_site` for the sizes; never docs or GitHub pages |
| Same faces and colours every project | Bricolage, Fraunces, Instrument Serif, a yellow or cream ground, again | `fonts_search` / `fonts_compare` for THIS subject; `board_directions` refuses what Drip used in other projects |
| Directions as palettes and adjectives | A choice that never shows a page | `board_directions` renders each as a first-viewport comp at real size |
| Writes a free-form type scale | 12-13 sizes, body at 15px, mono labels | `kit/base.css`: seven roles and no eighth; the page gate counts sizes |
| Builds the whole page, then measures | Fixing scale means rebuilding | The hero gate runs after nav + hero, before any section |
| Pads sections to fill the screen | Screens of ground with a heading on them | Height follows content; the gate fails a screen more than half empty |
| No pictures | A wall of type on a flat ground | Every section shows something; two picture-less sections can't touch |
| Grades its own build kindly | A sloppy page shipped with a "pass" | The critic must pass the build (one round plus one confirming round) |
| Tasteful-safe output nobody asked for | Cream, terracotta, a polite serif | Bold by default; the mirror test; the critic caps Idea |

## Ambition by mode
- **Persuade / Experience** (landing, portfolio, showcase): full commitment. The work or the offer is big from the first screen, colour commits at page scale, and there is one signature moment. The critic expects *Convicted*.
- **Operate** (apps, dashboards): ambition shows as precision: density, alignment, speed, states, keyboard paths. Familiar patterns win.
- **Read** (docs, articles): typography and rhythm first.

## Done when
- [ ] The brief holds the user's answers, with material first.
- [ ] 4+ studies, most of them shipped examples of the surface, carry measured values.
- [ ] 2 directions that differ in idea were shown as comps, ranked by the critic before the user saw them; the choice is locked.
- [ ] `kit/base.css` and DESIGN.md (with the FIRST VIEWPORT in numbers) exist.
- [ ] The hero gate passed before the sections, and the page gate passed after them.
- [ ] The critic passed the build (or its rounds ran out and what's left is listed).
- [ ] The hand-off quotes the critic, lists every assumption and every slot.

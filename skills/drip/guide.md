# The Drip map

AI-made UI looks AI-made because it skips straight to code with the defaults it has seen most often, sets them small, then grades itself kindly. Drip makes you look at proven work first, build from finished pieces at real scale, and measure the result. What good looks like: `taste.md`. In what order: `fast.md` (pages, default) or `playbook.md` (the full loop).

## Modes

| The request | Mode | Loop |
|---|---|---|
| New page, site, landing, app screen, dashboard; "redesign", "make it less AI" | `design` | **fast** (`fast.md`): look, deal, pieces, builders, one check per pass |
| Big brand work, or the user asks for the full process / directions / a moodboard | `design`, `loop: "full"` | full (`playbook.md`): intake, references by role, comps, a system, a plan |
| Logo, wordmark, mark, identity | `logo` | `drip_guide logo` |
| "Find me references for…" | `refs` | stops after the study summary |
| A spacing, colour, hover state, one section, a label | `polish` | quick: change, lint, check |

When in doubt between polish and design on something the user sees first (a hero, a landing page), choose design. `/drip:critic` reviews any URL, file or image on its own; `/drip:adapt` builds a niche pack; `/drip:settings` holds status, keys, skip and stop.

## Project memory
A project keeps its design memory in `.drip/` (master board, approved direction, rules, a generated project skill). `drip_start` loads it and says what is inherited. Evidence is bound to what it reviewed: a fit check or critic verdict goes stale when the UI files change, and `drip_end` and the Stop hook catch UI edits Drip never saw. Niche packs (`/drip:adapt`) switch on by their keywords and learn from the user's reactions.

## How lazy agents fail, and Drip's answer

| Shortcut | What it produces | Drip's answer |
|---|---|---|
| Skips looking | The default page every model makes | No builder starts before 4 references and a look at the pieces (`build_prepare` refuses) |
| Hand-rolls every part | Flat, untuned components | Finished pieces from proven libraries, used as they are |
| Freestyles sizes | 12 sizes, 15px body | The system's type roles and the page gate's count |
| Builds the whole page, then measures | Fixing scale means rebuilding | The hero check runs before any section |
| No pictures | A wall of type on a flat ground | Every screen shows something real |
| Invents facts | "10,000+ teams", "ready in 38s" | Unknowns are `[brackets]` |
| Grades its own build kindly | A sloppy page shipped as "done" | The measured fit check, and the critic at the final version |

## Ambition by surface
- **Persuade / Experience** (landing, portfolio, showcase): beautiful and polished, one rich picture per screen, one eye-candy moment.
- **Operate** (apps, dashboards): precision: density, alignment, states, keyboard paths. Familiar patterns win.
- **Read** (docs, articles): typography and rhythm first.

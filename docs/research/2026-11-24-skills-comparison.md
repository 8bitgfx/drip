# Drip against ten design skills (2026-11-24)

Method: read each skill's SKILL.md and its main reference files from the source repos (`gh api`), measured Drip's own output by running the CLI (`drip_start`, `tools list`, `tools schema`, hook scripts). Sizes are characters (1 token is about 4 characters). Two limits: Anti UI Slop's site page is thin, so I read its published skill copy in `uizze/uizze` (`integrations/nextjs-starter/.agents/skills/anti-ui-slop`); the Impeccable rule counts come from its site and tree, not from running it.

One finding frames everything else. Drip's rules are already mostly borrowed from these skills (CREDITS.md and `rules/ambition.md` say so): the refuse list and "no eyebrows, no middle dots, no arrows" come from Frontend Design, Hallmark and Impeccable, the Persuade/Experience/Operate/Read modes from Impeccable, "hero first" and the 80-words-per-screen cap from Hallmark, and tabular-nums, text-wrap and `transition: all` from Vercel and Make Interfaces Feel Better. So the gap is not missing rules. It is how much is pushed in, how it is delivered (prose vs. dealt choices vs. pictures), and how much of the run is spent on process.

## 1. Drip, measured

| Item | Size | When it loads |
|---|---|---|
| `drip_start` output (task "design a landing page for a toddler walker") | **15,550 chars (about 3.9k tokens)**, of which the playbook is about 13.1k | once, at start |
| `skills/drip/SKILL.md` | 4,423 | on trigger |
| `drip_guide landing` | 16,764 | on demand, but `drip_start` lists required guides |
| the other 25 guides | 345,554 total, 4.7k to 17.2k each (average 13.5k) | on demand |
| Server `INSTRUCTIONS` | 1,940 | every session with the plugin |
| MCP tool descriptions | **108 tools, 53,459 chars** | listed deferred; loaded by ToolSearch |
| MCP tool JSON schemas | **108 tools, about 152k chars** (whitespace collapsed) | only the ones loaded, a few hundred to several thousand chars each |
| Hook: prompt nudge / session-start | 1,027 / 1,057 | every prompt / session |
| Hook: pre-write denial | about 1,500 per denied write | repeats until the gates clear |
| `agents/critic.md` | 10,597 | in the critic's own context (not the builder's) |
| `rules/*.md` | 20.4k (hard-rules 2.9k, slop-tells 5.4k, ambition 3.9k) | by `drip_guide rules/<x>` |
| `data/slop.json` | 5,122; 18 rules | lint after every UI write |

Realistic load before the first line of CSS: SKILL (4.4k) + `drip_start` (15.5k) + one or two guides (13 to 30k) + the schemas of the roughly 15 tools the loop uses + the denial message(s) + each `refs_site` / `refs_study` result with measured values and images. That is 40 to 70k chars of text (10 to 18k tokens) plus images, before building. The loop is "about 25 calls" (SKILL.md) before the hero exists.

What the playbook is: 40 numbered rules plus sub-rules (13.1k). It fixes the type scale (7 roles, Display about 127px at 1440, 48px on a phone), the container (1312px, 12 columns, 32px gap), the spacing scale, section mass, words per screen, picture priority order, motion budget, and about 25 bans. `kit/base.css` (6.4k) makes the scale real. `examples/` holds 9.7k of text only (a portfolio walk-through, a logo and a lazy-run); there is no image or gold HTML anywhere in the repo.

## 2. The ten, one by one

### 2.1 Anti UI Slop (UIZZE)

- **What:** a free skill (v1.3.1, Apache-2.0) plus an optional paid remote MCP and a GitHub Action. The skill is a derivative of Impeccable (same `reference/{new-work,operate,polish,distill,audit,craft,overdrive}.md` names, a `MODIFICATIONS.md`).
- **Size:** SKILL.md 5,184; new-work 4,941; craft 3,276; the rest 1 to 6k each. A new-work run reads about 13k chars.
- **How it steers:** a router in SKILL.md ("Load only relevant files"), a read-the-project-first rule ("Read the brief, existing UI, components, tokens... before designing"), "ask only about missing choices that would materially change the work... do not turn a small fix into a discovery workshop", a finish gate ("Render and inspect the real result at representative desktop/mobile sizes... Fix material problems in a batch, then render and inspect again. Stop once the requested result is verified"). The site's checklist counts things: one accent, zero radii outside the scale, zero emoji in nav and buttons, zero unexplained gradients, zero duplicate labels. The state test covers loading, empty, error, retry, phone.
- **The MCP:** two tools, `find_ui_references` (up to three captured screens per page, with screenshots and text/layout) and `find_ui_materials` (fonts, icons, animations, "signed receipt" scope). Library claimed: 800,000+ web and iOS screens. References are "evidence, not templates".
- **Better than Drip:** it is small and asks little; its stop rule ("stop once verified; do not keep inventing work") prevents the endless loops Drip's stop hook can create; reference retrieval is a single question-driven call returning screenshots, where Drip needs refs_site + refs_study across four roles.
- **Drip does that it does not:** enforced gates, a measured audit, an independent critic, comps and moodboards, a project memory.

### 2.2 Impeccable (pbakaus/impeccable)

- **What:** a skill plus a CLI/detector plus hooks plus a Chrome extension plus a live variant mode. About 115k stars per its site.
- **Size:** `SKILL.src.md` 13,745; `new-work.md` 35,896; `new-work-world.md` 20,201; `new-work-comp.md` 14,617; `craft-floor.md` 7,365; `critique.md` 30,454; `critique-rubric.md` 19,937; `impeccable-finish-reviewer.md` 16,666. A new surface loads about 77k chars (SKILL + new-work + world + floor). The detector's browser bundle is 3.2MB but runs outside context.
- **How it steers:**
  - A launcher (`impeccable context`) injects PRODUCT.md and DESIGN.md once per session.
  - Modes: Persuade, Operate, Read, Experience.
  - A command table of 23 verbs (`shape`, `critique`, `polish`, `bolder`, `quieter`, `distill`, `typeset`, `layout`, `colorize`, `animate`...), so a user can say "bolder" and the agent loads 9k of focused guidance rather than the whole system.
  - `craft-floor.md` is read "immediately before any UI edit", and has Verify (checks on the rendered result, batched into one `impeccable shot`) and Refuse (defaults the brief can earn back; eyebrow and numbered markers are flat bans).
  - **A code detector with 62 checks** that runs "without an AI model or API key" as an edit hook, plus a PR CLI.
  - "The brief wins": "Redirecting a clear brief toward your taste is failure."
  - Light/dark "picked from the use scene: who, where, under what ambient light, not by category" (Drip copied this).
- **Better than Drip:** command verbs for narrow jobs (Drip has `drip-polish` but the whole gate loop is on for every task); 62 detector checks vs. Drip's 18 regex rules, and a detector that also runs in CI and in DevTools; a `live` mode that lets the user pick an element and get variants in the running app; it never makes the user wait through a reference study to change one thing; "brief wins" is explicit.
- **Drip does that it does not:** gates that block writes until a brief, references and a direction exist; two-comp direction ranking before any code; a critic with weighted scores; moodboards and refs from shipped sites with measured values.

### 2.3 Taste Skill (Leonxlnx/taste-skill, "tasteskill 2.5.1")

- **What:** a skill with a 6.9MB kit (CSS system, JS motion layer, starter HTML, objects, shader effects, scenes, photo library scripts) and a Stop-hook finish gate.
- **Size:** SKILL.md 30,970; it orders "Read `copy.md`, `copy-voice.md`, `system.md`, `layout-v4.md` and `sections.md` in full before the first page": 14.7 + 11.9 + 16.1 + 23.6 + 53.9 = 120k more. About 150k chars of required reading, the biggest of the ten.
- **How it steers:**
  - **Dealing, "never choose by taste".** `start.mjs deal --page <kind> --trade <trade> --history .taste-skill/history.json` prints three palettes made for the trade and three type pairings; the instruction is "take the first". `layout/deal.mjs` deals the hero; `moments.mjs pick` deals the signature moments. A history file makes consecutive pages differ.
  - **Business kind decides everything**: a table maps place / product / service / software / gaming / hardware to different page plans. A cafe gets photographs and no shader effects; software gets its own UI as live HTML.
  - House rules, nine of them, that "win over everything else", including "No caption under any image", "one section per screen", "equal left and right content edges", specific hover numbers (lift 2px, photo zoom 1.02-1.03).
  - `gate.mjs` runs on Stop in a real browser, plus `copy-lint.mjs`, `consistency.mjs`, `perf.mjs`.
  - Real photos by script (`photos.mjs search`), real product icons (`icons.mjs`).
- **Better than Drip:** it takes the free taste decision (palette, pairing, hero, moments) away from the model and deals it from curated lists, and it ships working assets and components rather than telling the agent to find some. Page kind drives the plan, so a cafe page is not built like a SaaS page.
- **Drip does that it does not:** references from real galleries, independent critic, direction comps the user picks, cross-session project memory. Its weakness is the one Drip shares: huge context and rule collisions (e.g. "no caption under any image" vs. Drip-style credits).

### 2.4 Emil Design Engineering (emilkowalski/skills)

- **What:** a family of 20 narrow skills (animate, choreograph, animation-performance, review-animations, improve-animations, break-ui, learn-taste, gestures, mobile-native, pick-ui-library, apple-design, write-swift...) plus two cheatsheets.
- **Size:** `emil-design-eng/SKILL.md` 28,257 alone; the others 5 to 43k. Each is loaded alone.
- **How it steers:** a decision framework in order ("1. Should this animate at all?" with a frequency table: 100+ times a day = never; "2. What is the purpose?"; "3. What easing?" as a small decision tree), concrete values (custom curves, `scale(0.97)` on `:active`, `transform-origin` from the trigger, "never animate keyboard-initiated actions", "Raycast has no open/close animation"), and a required output format: a Before / After / Why table, one row per issue. It also tells the model to answer with a single sentence when first invoked.
- **Better than Drip:** it decides whether to do something before how; Drip's motion guide (13k) mostly states limits. Tiny specific numbers beat paragraphs. The review table is directly actionable.
- **Drip does that it does not:** all page-level work. This is interaction polish only; it has no brief, no direction and no layout.

### 2.5 Vercel Web Design Guidelines (vercel-labs/agent-skills)

- **What:** a review skill. SKILL.md 2,077 + `references/command.md` 8,055 (pinned to an upstream commit with a SHA-256). About 10k chars.
- **How it steers:** one flat list of terse rules by category (accessibility, focus, forms, animation, typography, content handling, images, performance, navigation, touch, safe areas, dark mode, i18n, hydration, hover, copy), each a single imperative line: "Icon-only buttons need `aria-label`", "Never `outline-none` without focus replacement", "Placeholders end with `…` and show example pattern", "Large lists (>50 items): virtualize". Output is `file:line` findings, "sacrifice grammar for brevity".
- **Better than Drip:** the densest rule-per-character of the ten, and it covers code-level craft Drip skips: curly quotes, non-breaking spaces, `touch-action: manipulation`, `overscroll-behavior: contain`, `min-w-0` for truncation, URL reflects state, explicit img width/height, preconnect/preload, destructive action confirmation. Drip's lint has `transition-all`, `100vh`, `outline-none` and little else of this.
- **Drip does that it does not:** everything about design (it is purely a compliance checklist). It checks code, not pixels.

### 2.6 Frontend Design (Anthropic, `skills/frontend-design`)

- **What:** one file, 9,390 chars. The smallest and most widely used.
- **How it steers:** a persona ("design lead at a design studio... This client has already rejected proposals that felt cliché or templated"), a requirement to ground in the subject ("a toy for girls aged 8-11 will be very aesthetically different from a dashboard for financial analysts"), a calibration list of five named AI clusters with hex codes (cream near `#F4F1EA` + serif + terracotta near `#D97757`; near-black plus acid-green or vermilion; broadsheet hairlines; the SaaS-card kit; template chrome such as tracked-caps eyebrows, middle-dot meta strings and a `→` on links), then "The brief's own words always win". Process is two passes: write a compact token plan (4-6 named hex values, type roles, a one-sentence layout concept with an ASCII wireframe, principles), **review that plan against the brief and revise any part that reads like the default**, then build. Ends with "Spend your boldness in one place... remove one accessory" and a short writing section (CTA says what happens, same name through the flow, errors don't apologize).
- **Better than Drip:** the plan-then-self-review loop costs one message and happens before code, where Drip needs 2 rendered comps, a critic call and a user round. "The brief wins" is stated; Drip's playbook rule 11 forces "Committed or Drenched" colour on every Persuade page unless the brief asks for quiet. The prompt is written as a persuasive paragraph, so the model absorbs the stance instead of obeying a checklist.
- **Drip does that it does not:** everything verified, and everything that needs a process.

### 2.7 Hallmark (Nutlope/hallmark, Together AI)

- **What:** a skill (v2.0.0) with a themes library, scripts (`theme.mjs`, `sloplint.mjs --render`, `capture.mjs`, `photos`, `imagegen`, an edit-time hook), an `eval/` folder and a site. Drip's closest relative.
- **Size:** SKILL.md 18,239. A page build loads exactly layout 16.3k, anatomy, imagery 14.3k, craft 19.3k, one genre, one theme md (about 8k) and `gates.md` 39k sections 1-4: roughly 100k chars. The skill itself says "loading more is the largest avoidable cost."
- **How it steers:**
  - **The Floor:** 16 numbered, unwaivable rules, each tagged with a gate number (e.g. "Never `transition: all`. Never animate `width`... (10a)"; "About 80 words on any one screen (58)"). Above it, Reflex gates are waivable on the record with a real reason, and Finish checks are "answered, never blocking".
  - **The deal:** `theme.mjs deal --genre <genre> --prompt "<prompt>"` deals three themes that fit the prompt and clear the log; the agent looks at **each theme's picture (`<slug>.jpg`)**, picks one and says why. About 49 themes (Almanac, Arcade, Bloom, Cobalt, Coral, Dusk, Refract, Furrow, Dose, Ribbon, Atelier, Grid, Studio, Vellum...), each a roughly 8k file with palette balance, type voice, controls and motion. Then `theme.mjs draw` deals a page shape, hero posture, nav, footer, first section and two compositions to leave out, from 21 macrostructures.
  - **A one-block "Picks" recital** (shape, theme, chrome, hero, signature, sections, material) as the user's single redirect window, instead of a conversation.
  - **A stamp** on line 1 of the CSS plus a critique line, so decisions live in the code.
  - `sloplint.mjs --render` (static plus rendered) with FAIL / REFLEX / WARN tiers; a fresh-context finish review whose first word is `recapture`, `rebuild`, `fix` or `ship`; "Verification is budgeted: one batched inspection, one fix batch, at most one confirming round."
  - A **fast mode** (`--fast`, or "quick, rough, prototype") and a component scope ("just the X").
- **Better than Drip:** themes shown as pictures and dealt with a log (so output varies and has a designer's look), the Floor tiered by waivability, the budgeted verification, fast mode, and the screenshots driven by the script ("never drive a browser by hand").
- **Drip does that it does not:** references studied from real shipped sites and galleries, board with user choice, project memory, hard gating of writes.

### 2.8 Make Interfaces Feel Better (jakubkrehel)

- **What:** one skill, SKILL.md 11,818, plus animations 12.7k, surfaces 7.2k, typography 4.7k, performance 3k, icons 2.3k. Quick and full review modes.
- **How it steers:** 19 numbered principles with exact numbers ("Outer radius = inner radius + padding"; "Use exactly these values: scale from 0.25 to 1, opacity 0 to 1, blur 4px to 0px"; "Always use 0.96. Never a value smaller than 0.95"; image outline `oklch(0 0 0 / 0.1)` pure black light / pure white dark, "never a near-black"; icon stroke 1.5px beside regular text, 2px beside semibold; hit area 44px mobile, 40px dense desktop). A Common Mistakes table. Review output is a table with Severity, Location, Before, After, Why, a finding cap (5 quick / 15 full) and a coverage table naming what was and was not inspected. "Replay motion at 10% speed."
- **Better than Drip:** detail craft Drip only gestures at (concentric radii appear as one line in hard-rules). A built-in cap on findings and an honest coverage table. It adapts to the project's styling system before suggesting code.
- **Drip does that it does not:** it has no design process at all; it improves already-built UI.

### 2.9 UI UX Pro Max (nextlevelbuilder)

- **What:** a dataset plus a Python search tool, wrapped in a skill. Data is about 3.1MB (styles.csv 153k, ui-reasoning.csv 79k, products.csv 78k, icons.csv 58k, typography.csv 50k, google-fonts.csv 747k, 22 stack files). SKILL.md is 18,640 (its own description claims 80 styles, 194 product palettes, 74 font pairings, 141 UX guidelines, 25 chart types, 22 stacks).
- **How it steers:** the model calls `search.py "<product_type> <industry> <keywords>" --design-system` and gets back pattern, style, colours, typography, effects and anti-patterns selected by `ui-reasoning.csv` rules. `--persist` writes `design-system/<slug>/MASTER.md` and per-page overrides; `--tokens dtcg|css` prints tokens so hex values are not retyped; `--preview` renders a static page; `--stack` returns stack-specific guidance. A priority table ranks 10 categories (accessibility critical, touch critical, performance, style selection...). Query contract: "one dominant intent, 2-5 meaningful terms", retry once.
- **Better than Drip:** curated data in a structured form, queried so the context cost is only the answer (a few hundred to a few thousand chars) and the choice is explicit in a CSV row ("beauty spa wellness" returns an actual palette and pairing). It is the same idea as Taste's deal, with a much bigger catalogue and a persistent MASTER file.
- **Drip does that it does not:** actual visual work (refs, comps, screenshots, critic). The dataset is the product; the weakness is the output feels like a lookup (many palettes by category, which is the "same page per category" Drip tries to avoid).

### 2.10 Stageshow (Benji Taylor)

- **What:** a skill plus a kit (React/CSS parts, `Act` choreography API, `film.mjs` to render stills and loops with `--gate`) for faux product UI. About 2.25MB.
- **Size:** SKILL.md 19,469; references kit 31k, motion 24k, craft 18.6k, framing 14k, teaching 13k, rehearse 12.8k, annotations 11k, bento 11k. Loaded per need.
- **How it steers:** one idea ("It reads as a real product, simplified to what the viewer needs, framed with intent, and every motion has a cause"), five named failures (Too much, Wireframe, Boxed, Flat, Bland), a workflow with the plan before any code, and **a Gold table of about 25 working examples** (`static-card`, `dark-bento`, `hero-demo`, `payout-flow`, `ai-chat`, `form-error`, `reorder`, `chart-scrub`...) each with a "what to learn" line. "Start from an example: film the closest one... copy its folder into your project as the starting point; don't rewrite it from a glance." A `teaching/` folder of bad/good pairs. Rehearse: set the `poster` frame first, then `film` with `--gate`. A word budget ("count the real strings, usually 3 to 7"). Specific faults list with a rule per fault.
- **Better than Drip:** it ships the answer as examples to copy and it measures with a script. Taste lives in the gold files, not in prose. Drip has a "Never: three equal icon cards" rule but no good one to start from.
- **Drip does that it does not:** page-level strategy. It only makes product illustrations, and nothing in the repo is about copy, brief or direction.

## 3. Summary table

| Skill | Kind | Required reading for a build | Steering mechanism | Enforcement |
|---|---|---|---|---|
| Anti UI Slop | skill + paid MCP + CI action | about 13k | router, project-first, counted checklist | render-and-inspect, CI action |
| Impeccable | skill + CLI + hook + extension | about 77k (selective) | 23 verbs, modes, floor/refuse, PRODUCT/DESIGN.md | 62-check detector, hook, finish reviewer |
| Taste Skill | skill + 6.9MB kit | about 150k | dealt palettes/heroes/moments, kind table | Stop-hook gate in browser |
| Emil | 20 narrow skills | 5-28k each | decision frameworks, numbers, Before/After table | none |
| Vercel | review checklist | about 10k | flat imperative rules | none (human-run review) |
| Frontend Design | one file | 9.4k | persona, named AI clusters, plan then self-review | none |
| Hallmark | skill + themes + scripts | about 100k | Floor tiers, dealt theme with pictures, Picks block | sloplint --render, fresh reviewer, hook |
| Make Interfaces Feel Better | skill | 12k (+30k on demand) | 19 numbered principles with numbers | none |
| UI UX Pro Max | skill + 3.1MB data | 18.6k + query results | CSV search, reasoning rules, MASTER.md | none |
| Stageshow | skill + kit | 19.5k + refs | 25 gold examples, copy a folder | `film --gate` |
| **Drip** | MCP + plugin + hooks | **40-70k+, plus images** | gates, refs, comps, critic | write gate, lint, stop hook, measured audit, critic |

## 4. Why an agent with a simpler skill can build a better-looking page than Drip

These are hypotheses grounded in what I read and measured; no side-by-side build was run, so treat them as strong leads, not proven causes.

1. **Attention is spent on process, not design.** The first useful design decision is the comp pair, after about 12 to 15 calls (intake, brief, refs_site x4 roles, refs_study, board_create, board_directions, critic, user pick, choose). Frontend Design reaches a tokens-and-wireframe plan in one message, then builds. The model's best work happens while it is reasoning about this brief; Drip spends that on gate compliance (reference counts per role, designers count, `drip_mark`). The pre-write denial lists seven unmet requirements at once and repeats.
2. **Context load and instruction competition.** Playbook (13k) + start text (2.4k of intake/reference plan) + guides (13k each) + tool schemas. A 40-rule playbook with about 25 bans and many numbers means the model is satisfying constraints, which tends to produce compliant, uniform output. The simple skills tell the model one stance and a few named failures.
3. **Conflicts inside Drip's own text.** Found by reading:
   - Questions: the playbook and `drip_start` say "AT MOST 2 (often 0-2, never padded to 4)"; `rules/hard-rules.md` and the pre-write denial still say "up to 4 clickable questions"; the README says it "asks four questions first".
   - References: SKILL.md says 3-4 sites; hard-rules says 4+; the live gate demands 3 real + 2 style + 2 competitor + 2 page + 4 from 3+ designers (a model reads that as 11 studies).
   - Type: "7 roles, no eighth size" (playbook) vs. "app UI at most 5" (hard-rules) vs. a fixed Display of about 127px at 1440 for every brand.
   - Colour: "Committed or Drenched" is mandatory on Persuade unless the brief asks for quiet, while the ambition file says to scale ambition to the surface and "brief wins" is absent. Frontend Design and Impeccable both say the brief wins.
   - Fonts: the playbook bans Inter, Geist and Space Grotesk as a voice, but the kit ships `ui-serif, Georgia` and `ui-sans-serif` fallbacks and no named face, so unfilled slots read as the default the playbook refuses.
   - Ceiling: the critic's "Convicted" ceiling for all Persuade pages means a kids' product page is pushed to the same boldness as an agency site.
4. **Prose where others use examples.** Drip has 40 rules in text and no picture. Hallmark's dealt theme comes with a `.jpg`; Stageshow's folder is copied; Taste ships `starter.html`, `system.css` and photos; Impeccable's detector fires on rendered output. The model can follow "Display about 127px" but it cannot see what a good page looks like, so it implements the measurements on top of its own default layout. Drip's `kit/base.css` and `examples/*.md` are the only concrete artefacts, and the 7-role scale in them is the same for every project, which converges pages.
5. **Taste is left to the model at the moments it is weakest.** Palette, font pairing and hero composition are "choose a direction" tasks. Taste and Hallmark deal these from curated lists with a history so successive pages differ; UI UX Pro Max selects them from a reasoning CSV. Drip asks the model to invent two directions and has a critic rank them, which only ranks what the same model came up with. Two comps by one model from one prompt are usually the same layout twice (the ambition file says directions "must differ in idea", i.e. the failure is known).
6. **Verification is mostly numeric.** The fit check measures type sizes, columns, emptiness and mono share. These ensure the hero is big and the spacing is on scale; they do not tell the agent whether the first screen is beautiful. The critic does, but only once on the full page plus one confirming round, with no pictures of what good looks like to compare against (only the brief and the images).
7. **Subject fit.** A toddler walker brief wants warmth, soft shapes and real product photography. Drip's playbook forces a hero of "about 127px, 8 words or fewer, picture 6+ columns and 60% of the screen", plus "no eyebrows, no cards, no rounded mix". Taste's page kinds and Frontend Design's "a toy for girls 8-11 vs a dashboard for analysts" route a children's product to a different look; Drip's single page template does not.

None of that argues for removing gates. The gates catch the cases where simple skills fail (a page with no brief, fake stats, emoji icons, no mobile). It argues for making the front of the process lighter and the taste input richer and less uniform.

## 5. Ten changes for Drip, ranked

1. **Add a plan-and-self-review pass before any research gate, and let simple tasks stop there** (source: Frontend Design; also Anti UI Slop's "do not turn a small fix into a discovery workshop"). One message: 4-6 named hex colours, type roles, one-sentence layout plus an ASCII wireframe, principles; then "if any part reads like the default you'd write for any similar page, revise it and say why". Gate: record it with `drip_brief` before `refs_site`. Make the reference quota scale with the task (page: 3 studied, redesign: 4, tweak: 0). Files: `skills/drip/playbook.md` (rules 9-14), `mcp/src/core/state.mjs` (`missingBeforeUi`), `skills/drip-direction/guide.md`, `rules/hard-rules.md`, `hooks/pre-write.mjs` (collapse the 7-line denial into the first missing step only).

2. **Cut what `drip_start` sends to under 6k chars and make the playbook two-tier** (source: Hallmark's Floor + load list; Impeccable's "load the playbook for this request"). Tier 1 (about 2.5k): the 16-ish unwaivable Floor, the process in six lines, the intake. Tier 2: type/layout/motion numbers fetched with `drip_guide` at the step that needs them. Today 13.1k of 15.5k is the playbook. Files: `skills/drip/playbook.md` (split into `playbook-floor.md` and `playbook-build.md`), `mcp/src/modules/workflow.mjs`, `skills/drip/SKILL.md` (trim the 20-line "tools that save time" block to five lines), `docs/SKILL_FORMAT.md`.

3. **Ship picture-backed dealt themes and a history log** (source: Hallmark `theme.mjs deal`/`draw` and the per-theme `.jpg`; Taste `start.mjs deal --history`). Make `data/themes/` with about 12 entries, each: palette roles, face pairing, radius, shape of hero, one `.jpg` first-viewport comp, and a 600-char note. `board_directions` deals three that fit the brief and clear `.drip/history.json`; the agent looks at the three pictures and picks two, then must write its own variation. The critic then ranks pictures that look designed, not model first guesses. Files: new `data/themes/`, `mcp/src/modules/board/index.mjs`, `mcp/src/core/memory.mjs` (history), `skills/drip-direction/guide.md`, `data/font-pairs.json`.

4. **Add gold examples: three or four working HTML pages with screenshots and a "what to learn" line, plus "start from the closest one"** (source: Stageshow gold table and "copy its folder"; Taste `starter.html`). Cover kinds Drip fails at (a consumer physical product, a local business, a SaaS, a portfolio). Reference them from `drip_guide examples/<kind>`. Files: new `examples/gold/*`, `skills/drip/playbook.md` (rule 27), `skills/drip-landing/guide.md`, `kit/`.

5. **Page kind decides the plan; drop one-size scale** (source: Taste section 1 table; Impeccable modes). Add a 6-row kind table (consumer product, place, service, software, game/hardware, portfolio) with section plan, picture source, which bans relax (e.g. consumer products allow rounded shapes, bigger body, illustration), and a Display token range instead of a fixed 127px. Make `kit/base.css` take `--t-display` from the chosen direction. Files: `skills/drip-landing/guide.md`, `skills/drip/playbook.md` (rules 16, 23), `kit/base.css`, `mcp/src/modules/fitcheck/lint.mjs` and the hero gate thresholds.

6. **Resolve the contradictions and add "the brief wins"** (source: Impeccable `rule:skill-brief-wins`; Frontend Design). One question count (0-2); one reference quota; type scale stated once in `kit/base.css` and referenced; Committed/Drenched colour becomes "unless the brief or the kind says otherwise". Add a test in `mcp/test` that greps for "up to 4" and fixed counts in `rules/`, `README.md` and the denial text so they cannot drift again. Files: `rules/hard-rules.md`, `README.md`, `skills/drip/SKILL.md`, `skills/drip-brief/guide.md`, `hooks/pre-write.mjs`, `mcp/src/core/state.mjs`, `rules/ambition.md`.

7. **Tier the rules by waivability and enforce them with one detector that reads rendered output** (source: Hallmark FAIL / REFLEX / WARN with `waive` lines; Impeccable 62-check detector that runs as a hook and in CI). Grow `data/slop.json` from 18 to about 50 rules using Impeccable's list (side-stripe borders, nested cards, icon-tile stacks, hard offset shadows, ghost cards, glass default, mono as costume, geometric masks) and Vercel's code rules (below). Add `severity: fail|reflex|warn` and a `waive` comment convention. Run the same engine from `drip check` in CI. Files: `data/slop.json`, `mcp/src/modules/fitcheck/lint.mjs`, `hooks/post-write.mjs`, `mcp/src/core/check.mjs`.

8. **Fold in Vercel's code-level rules and the Make Interfaces Feel Better numbers as lint rules and a polish checklist** (source: Vercel `command.md`; Make Interfaces Feel Better). New lint rules: img without width/height, `touch-action: manipulation` missing, `autoComplete` missing on inputs, `...` instead of `…`, straight quotes in copy, `<div onClick>`, paste blocked, `overscroll-behavior` in modals, concentric radius, `scale(0.96)` press and `< 0.95` flagged, image outline colour, icon stroke vs text weight. Short numeric lines go in `skills/drip-polish/guide.md` instead of prose. Files: `data/slop.json`, `skills/drip-polish/guide.md`, `skills/drip-interaction/guide.md`, `skills/drip-icons/guide.md`, `skills/drip-a11y/guide.md`.

9. **Budget the verification, and add fast and component modes** (source: Hallmark "one batched inspection, one fix batch, at most one confirming round", fast mode, component scope; Anti UI Slop "stop once verified"; Impeccable verbs). Today the stop hook allows 3 blocks and the critic runs once plus a confirming round; make this one rule with a token budget, and add `drip_start({ scope: "component" | "tweak" | "fast" })` that skips refs and comps and keeps only the Floor lint, one fit check and no critic unless asked. Add verbs `bolder`, `quieter`, `polish` mapped to existing guides. Files: `mcp/src/modules/workflow.mjs`, `mcp/src/core/state.mjs`, `hooks/stop.mjs`, `commands/`, `skills/drip/SKILL.md`.

10. **Make the critic and the builder see pictures of good work and review in a Before/After/Why table with a finding cap** (source: Emil review format; Make Interfaces Feel Better caps and coverage table; Hallmark's first-word verdict `recapture/rebuild/fix/ship`; Impeccable's finish reviewer). Add to `critic_prepare` one or two gold screenshots as a "bar" (from change 4) and require: a verdict word first, at most 5 findings (quick) or 15 (full), each as Severity / Location / Before / After / Why, and a coverage line saying which axes were not seen. Files: `agents/critic.md` (trim from 10.6k to about 6k), `mcp/src/modules/fitcheck/index.mjs` (`critic_prepare`, `critic_record`), `skills/drip-fitcheck/guide.md`.

Not in the top ten but worth tracking: a structured reasoning dataset queried instead of read (UI UX Pro Max `ui-reasoning.csv`; Drip's `drip_search` already fits this) for fonts, palettes and product-type patterns; and a persistent PRODUCT.md / DESIGN.md pair that other agents read (Impeccable) beside Drip's `.drip` memory.

## 6. How to check these claims

The cheapest experiment: build the same brief ("landing page for a toddler walker") four ways, with Drip as is, with Drip after changes 1 and 2 only, with Frontend Design alone and with Hallmark, then have Drip's own critic (blind, images only) score them. If Frontend Design alone scores within a point of full Drip, the process is the cost; if the dealt-theme version beats both, changes 3 and 4 matter most.

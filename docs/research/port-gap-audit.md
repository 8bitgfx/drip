# Port gap audit: what Drip lost from the skills it adapted

Date: 2026-11-23. Scope: visual execution on landing and portfolio pages (Persuade and Experience).

**The problem.** Drip runs come up with good ideas and then build them small, plain and badly. The latest portfolio for Claude had 12-13 text sizes, 76% of its text in monospace, 15px body text on desktop and 12px on phone, long empty stretches, no imagery, the idea only in the hero, and an 89px headline. The original skills, run on the same models, produce better pages. A full Drip run also reads about 37k tokens of guides.

**Sources compared**

- Originals:
  - Taste Skill: `Cubism-Node-Editor/.claude/skills/design-taste-frontend/` (SKILL.md, references/layout-v4.md)
  - Impeccable: `.../impeccable/` (SKILL.md, reference/new-work.md, new-work-comp.md, new-work-world.md, craft-floor.md, typeset.md, layout.md, bolder.md, mode-persuade.md, visualize.md)
  - frontend-design: `.../frontend-design/SKILL.md`
  - make-interfaces-feel-better and emil-design-eng (skimmed: they cover motion and polish, not composition)
  - Hallmark, written below as `<hallmark>/` = `C:\Users\User\AppData\Local\Temp\claude\a8fd5d5dc29d84a4\66340870-84a6-425e-bf46-340006e17cf6\scratchpad\sources\hallmark\skills\hallmark\` (SKILL.md, references/craft.md, layout.md, imagery.md, comp.md, gates.md)
- Drip: `skills/drip/`, `skills/drip-{refs,moodboard,direction,landing,system,type,color,layout,copy,fitcheck}/guide.md`, `rules/*.md`, `examples/portfolio.md`
- Run evidence: `.drip/state.json`, `.drip/boards/claude-portfolio/board.json`, `portfolio-claude/`

## 0. Findings in one screen

1. **Drip kept the ideas and dropped the numbers.** Each original pins its visual output with fixed numbers:
   - Hallmark gives a seven-role type scale with px values, a definition of section "mass", and gates 77-79 for "a page of small things".
   - Taste gives fixed hero, h1 and h2 sizes and a list of dealt hero compositions with px values.
   - Impeccable makes a measured first-viewport comp before any code.

   Drip turned these into ranges that disagree with each other: three different h1 ranges, four different "how many sizes" rules, and three body sizes. For portfolios it adds "free" for type sizes, body size and density (`rules/per-surface.md`). The 12-13 sizes and the 15px body follow directly from that.
2. **Drip turned the originals' kits into prose.**
   - Taste and Hallmark don't just describe a scale. They write `tokens.css` / `base.css` / `starter.html` for the model and deal the palette, type and hero by script.
   - Drip asks the model to write tokens from scratch on every run, after about 37k tokens of guides. The model then falls back to its defaults: the cream, rust and serif palette, mono labels, and small type.
3. **Drip's examples steer the model toward the failures it bans.**
   - The direction-contract example, the moodboard example and the refs-study example all put mono on numbers or labels.
   - `examples/portfolio.md` is literally "a portfolio for Claude", with neon-on-black and cream palettes. SKILL.md tells the model to read it before starting.
   - All three directions on the recorded board use a rust accent: `#B2471F`, `#E2774B`, `#9E3F1C`.
4. **Drip spends its budget on process instead of craft.**
   - About 38% of the 143 KB of guides is procedure, slop tables, done-when lists and sources.
   - About 52 KB goes to brief, refs, moodboard, direction and the loop before the model has made a single pixel.
   - Guides are read at `drip_start`, far from the moment of building. Impeccable instead reads its 4.5 KB craft floor "immediately before any UI edit".
5. **Drip has no hero gate and no comp.** The originals win or lose the page at the first viewport:
   - Impeccable's comp-led hero phase.
   - Hallmark's "hero first … nothing below them yet", followed by a hero review.

   Drip's style tiles show components, not a composition, so the composition gets invented in CSS at build time.

---

## 1. Lost directives, top 25, ranked by visual impact

Status uses these words:

- **missing**: Drip doesn't have it.
- **diluted**: Drip has a weaker version.
- **contradicted**: another Drip rule overrides it.
- **not loaded**: it exists only in a guide the run didn't read. The run in `.drip/state.json` read loop, hard-rules, slop-tells, brief, refs, moodboard, direction, landing, system, copy and fitcheck. It did **not** read type, color, layout, imagery or the landing/heroes reference.

| # | Directive (original, ≤20 words) | Source | Drip today | Fix |
|---|---|---|---|---|
| 1 | "The failure these catch is the opposite of clutter: a page of small things on a wide canvas." | `<hallmark>/references/gates.md` §5 (gates 77-79), line 227 | **Missing as a principle.** `drip-layout` §Whitespace says "bigger content… not smaller gaps", but layout was not loaded. Every Drip guide warns against excess (loud, slop, too many effects); none warns against small and sparse. | Make this the second line of the playbook (P2). When unsure, go bigger. |
| 2 | Poster scale "sizes with the screen, `clamp(4rem, 10vw, 9rem)`". Taste `editorial` hero: "156px on three lines across the wrap". | `<hallmark>/references/craft.md` §1 "Display size"; Taste `references/layout-v4.md` §3, the hero table | **Contradicted.** Landing: "h1 56-80px". Type: "cap display text: about 72-96px". The critic target in `drip-fitcheck/guide.md` is "120-160px". The run's tokens cap h1 at `5rem` (`portfolio-claude/tokens.css`). The measured build was 89px. | Turn the cap into a floor: on Persuade and Experience, hero h1 is at least 96px at 1440 and defaults to `clamp(4.5rem, 9vw, 9rem)` (P17). Delete every other h1 range. |
| 3 | "The hero head is about one and a half times the section head, the section head about twice the item title." | `<hallmark>/references/layout.md` §2 (table 84/60/52/25/21/16/14). Taste: "h1 72/38 … h2 48/30, h3 28/24, lead 20/18, body 16/26". | **Diluted to ranges.** `drip-type`: ratio 1.25-1.333 with 9 steps, "pick 6-7". `hard-rules` #8: "Max 4 sizes on a screen". `slop-tells` #16: "4-5 sizes". `per-surface`: portfolio "free". The build had 12-13 sizes. | Ship seven fixed role tokens and say: "No eighth size" (P17). |
| 4 | "Body: 16px minimum, line-height 1.5 to 1.65, measure 45 to 75ch." | `<hallmark>/references/craft.md` §1. Taste: "nothing under 13px". Impeccable `typeset.md`: "1rem / 16px as the ordinary web body floor". | **Contradicted.** `per-surface.md` says portfolio body size is "free". The landing guide says 16-18, per-surface says 17-20 for landing, and the type guide only says 16px+ in done-when. The build had 15px desktop and 12px phone. | Body 18px desktop, 17px phone, never under 16. Small text 14px; nothing under 14 except the legal line (P17, P39). Delete "free". |
| 5 | "Mono only for code, a figure or a measurement, or when mono is the theme's material." | `<hallmark>/references/craft.md` §1 (gate 64). Impeccable `craft-floor.md`: "Monospace as a costume for 'technical'". frontend-design calibration: "a monospace face for small data labels". | **Contradicted by examples.** It is banned in one slop row (`drip-type`) and fitcheck item 28. But `hard-rules` #8 says "(optional mono)". The direction example says "Atkinson Hyperlegible Mono for every number", the moodboard example "the number at ~30vw in mono", the refs-study example "nav items numbered 01-04 in mono", and type pairing "a grotesk with a mono for data". The build had 76% of its text in mono. | Make it a floor rule: mono under 10% of text, and only inside code or measurements (P11, P39). Remove mono from every example. |
| 6 | "Says plainly what is sold, shows the real thing on every screen." | Taste `SKILL.md` lines 24-25. `<hallmark>/references/imagery.md`: "a page looks made when it shows the real thing". | **Diluted.** It appears in the landing intro and as `hard-rules` #15. Nothing makes the plan name a picture for each section, and imagery was not loaded. The repo build has 0 `<img>` and no product shown. | Every plan line names its picture and where it comes from (P24, P28). The gate counts pictures per section (P39). |
| 7 | "The product built at full fidelity only when it cannot [be captured]". Impeccable: "every blank… is yours to author at production fidelity". | `<hallmark>/SKILL.md` §6 "Show, do not describe". Impeccable `new-work.md` §6 "Author the assets". | **Diluted.** `drip-direction` §2 has "Author the material". Nothing says that for software, AI or a portfolio the work itself gets built in HTML (Claude's actual outputs, set as real artifacts). | P28: for software, AI and portfolios, build the work and the interface at full fidelity as live HTML, label it as synthetic, and show it big. |
| 8 | "A world reduced to an accent on a neutral template is the category default with a sticker on it." | Impeccable `reference/mode-persuade.md` §Comps. `new-work.md` §6: "Pace the scroll like a studio". | **Diluted to one table cell** ("a template with a sticker", `drip-direction` §1). No rule says the idea must reach every section, and the build carried its idea only in the hero. | P12 and P24: each plan line states how the thesis appears in that section, in a different form each time. |
| 9 | "Height follows content… never pad toward a height." | `<hallmark>/references/layout.md` §3 | **Contradicted.** The landing guide ported Taste's "each section… fills one viewport" without Taste's kit: the section box, the content-window table, and `check.mjs` `sparse`. If the section heights are fixed but the content is not, you get empty dark stretches. | Drop "fills one viewport". Height follows content, there are no empty screens, and a short section merges or gains its picture (P26). |
| 10 | "More than 160px of nothing between the hero's lowest content and the fold" fails. "Spend spare height on a larger visual or larger type." | `<hallmark>/references/gates.md` gate 79. `layout.md` §6. | **Missing before the build.** 0.3.2 measures "empty stretches" only after the build (`fitcheck_shot`). | Put it in the hero gate (P31) and the page gate (P39). |
| 11 | "The visual is big: six or seven columns wide and 60% of the screen tall or more (520px at 1440 x 900)." | `<hallmark>/references/layout.md` §6 | **Diluted and not loaded.** `landing/heroes.md` Split says "picture on 6 [columns]" with no height. | P31: the hero picture is at least 6 columns wide and at least 60% of the screen tall. |
| 12 | "No visual: the head grows to `--text-display` at its cap across eight to twelve columns." | `<hallmark>/references/layout.md` §6 | **Missing.** The build had no picture and an 89px head in half the width. | P31: with no picture, the h1 spans 8-12 columns at display size. |
| 13 | "A section head under 40px at 1440 is the most common reason a page looks unfinished." | `<hallmark>/references/layout.md` §2 (gate 78) | **Diluted.** Landing has an h2 cell of 40-48 with no reason given. The run's tokens let h2 drop to 32px (`--text-h2: clamp(2rem…3rem)`). | h2 is 52-64px at 1440. The median h2 must be at least 40px (P17, P39). |
| 14 | "A head and a paragraph are a head block, never a section." Mass is "a visual 360px tall or more; a set of three or four…" | `<hallmark>/references/layout.md` §4 | **Diluted and not loaded.** `drip-layout` §Rhythm says this without the numbers. | P25, with the numeric definition of mass. |
| 15 | Comp before build: "This step is proven to produce the most compositional and ambitious work." | Impeccable `new-work.md` §5. `<hallmark>/references/comp.md`: "reproducing an approved image is easier than inventing a composition from a paragraph". | **Diluted to style tiles.** `board_tile` renders nav, headline, body, buttons and a card: a specimen, not a first viewport. | P14-P16: a 1440×900 first-viewport comp (gen_image, or an HTML hero sketch at real sizes) before the page is written. Directions are shown as comps. |
| 16 | "Hero first. Write the nav and the hero, nothing below them yet." Then the hero review. | `<hallmark>/SKILL.md` §6. Impeccable `new-work-comp.md` hero phase: "This is where the run's ambition is won or lost". | **Diluted.** Landing step 9 gives the order ("Hero first, then sections") but there is no check before sections are built. | P31: a hero gate with measured checks before any section exists. |
| 17 | The scaffold "writes `tokens.css`… and `base.css` (what the Floor already decided)… Write only the page." | `<hallmark>/SKILL.md` §6. Taste: "Keep the `:root` block as start.mjs prints it." | **Missing.** The model writes every token and the whole type scale from scratch on every run. | Ship `assets/base.css` with the role scale, container, grid, label style and floor CSS. Have `drip_mark system` copy it (Section 3). |
| 18 | "Deal, never choose by taste." Impeccable: "the roll is what keeps every run from converging on the category default". | Taste `SKILL.md` §4 step 4. Impeccable `new-work-world.md` step 4. | **Missing.** The model writes its own directions. On the recorded board, all three used the rust accent, and two of the three used Claude's own cream/rust palette. | Deal the genre, posture and type voice from `data/` with a history file (Drip already has `direction/reference/genres.md`). The model fits the content to the deal. |
| 19 | "Color commits at page scale: fields that own whole regions, not accents scattered over a neutral ground." | Impeccable `new-work.md` §4 | **Contradicted.** `drip-direction` §3 says this too, but `hard-rules` #7 says "Neutrals carry ~90% of the UI", which forces Restrained on every bold brief. | Hard rule 7 becomes: "one accent as a signal; on Persuade and Experience, a committed or drenched field may carry 30-100%" (P10). |
| 20 | "Use the type treatment itself as an active part of the design, not a neutral delivery vehicle." | `frontend-design/SKILL.md` §Design principles. `<hallmark>/references/imagery.md` §1 item 6: "Type at full scale, when the prompt is about words." | **Missing.** For a subject made of words (Claude), type at full scale is the imagery, and the build set it at reading size. | P23 and P28: when the material is words, set the words as the picture (statement sections at display size). |
| 21 | Labels, captions, tags and nav are "the body face…, a step smaller, sentence or lower case, untracked." | `<hallmark>/SKILL.md` Floor 9 | **Diluted.** `drip-type` allows caps "if you use it at all" and doesn't name a face for labels. Nothing says labels are not mono. | P19. |
| 22 | "Scroll the page at 1440 x 900 one screen at a time: is something on each screen big enough to be its reason?" | `<hallmark>/references/layout.md` (closing check) | **Missing.** The fitcheck asks for a five-second read per screenshot, not a reason for each screen. | P38. |
| 23 | "figma.com and x.ai are the bar." Impeccable QUALITY BAR boards "set the craft level the build must reach". | Taste `SKILL.md` line 26. Impeccable `new-work-world.md` §6. | **Diluted.** The landing intro names Linear and Stripe, but the refs tools feed Dribbble: the run viewed 9/9 Dribbble shots. Drip's own refs guide says Dribbble has "11px grey labels". | P1: the bar is shipped sites. Refs come mostly from live pages (Section 3). |
| 24 | Eyebrow: "This one is a ban, not a default: no brief earns it back." | Impeccable `reference/craft-floor.md` §Refuse | **Diluted.** Landing: "No eyebrows by default… Use one only where it carries information." | P34: always banned. |
| 25 | Read the craft floor "immediately before any UI edit"; Hallmark: "loading more is the largest avoidable cost." | Impeccable `SKILL.md` Setup 3. `<hallmark>/SKILL.md` §4. | **Missing.** `drip_start` makes the model read 8-12 guides up front. By build time the numbers are 30-60k tokens back, behind refs output, studies and the board. | The playbook is re-sent by the build gate (a `drip_mark system` response, or a hook on the first UI write), right before code is written. |

Also missing, but with less effect on visual quality:

- Hallmark "six to nine sections, hero and footer included".
- Taste "lines at most 62 characters".
- Hallmark weights "picked as extremes: 300 beside 800, or 400 beside 700". Drip says "400 / 500 / 600", which flattens the hierarchy.
- Taste "Display text of 40px or more outside a grid item counts as a heading".

### Drip's numbers disagree with each other

| Value | What Drip says, by file |
|---|---|
| Hero h1 | `drip-landing` 56-80px · `drip-type` "about 72-96px" cap · `landing/heroes.md` Statement 56-72, Editorial 120-160 · `drip-fitcheck` critic target "120-160px" |
| Sizes per page | `hard-rules` #8 "Max 4 sizes on a screen" · `slop-tells` #16 "4-5" · `drip-type` "pick 6-7" and "5-7" · `per-surface` portfolio "free" |
| Body | `per-surface` landing 17-20, portfolio "free" · `drip-landing` 16-18 · `drip-type` "16px+" |
| Section spacing | `hard-rules` #10: scale stops at 128, "No off-scale values" · `drip-landing` section padding 120-160 · `drip-layout` "144px" |
| Accent coverage | `hard-rules` #7 neutrals ~90% · `drip-direction` §3 Committed 30-60%, Drenched |
| Mono | `drip-type` slop ban · `hard-rules` #8 "(optional mono)" · three examples that use mono |
| References | `SKILL.md` rule 3 "most studies must BE what you are building" · `ambition.md` "Steal from outside the category" · moodboard "at least one is an unexpected pairing" · the example query "exhibition poster typography" |

When the rules disagree, the model picks the lowest-effort reading: the smallest h1, the most sizes, and the safe colour coverage.

---

## 2. How the originals stay fast and effective

| | Core file | First screen | How decisions get made | What loads later |
|---|---|---|---|---|
| frontend-design | 9.4 KB (~2.3k tokens), one file, no references | A designer persona, "ground your designs in the subject", the hero rule, type rules | The model's own plan, reviewed against "what you would make for any similar brief" before any code | Nothing |
| Impeccable | 12.6 KB router + **4.5 KB craft floor** | 3 core principles ("Finish the job", "Scale ambition to the surface's mode", "Verify by looking") | Scripts: `concept-seed` deals the direction; comps get generated and then measured by `comp-spec` / `comp-diff` | `new-work.md` for a new surface; world/comp parts only on that path; the craft floor right before editing |
| Hallmark | 18 KB | **The Floor**: 16 numbered, unwaivable lines, "even when nothing else is read" | `theme.mjs deal/draw/scaffold/photos`: the scaffold writes `tokens.css` + `base.css` | layout, craft, imagery, genre, theme, gates §1-4 at Step 4; gates §5 only at the sweep |
| Taste | 31 KB + a kit | **Nine house rules** that "win over everything else" | `deal.mjs`, `start.mjs deal/css` print the palette, the pairing and the `:root` block; `starter.html` holds the markup | 5 references before the first page; a checker with named finding ids |
| **Drip** | 12.7 KB SKILL+loop, then **143 KB of required and craft guides** (~36k tokens) | Load tools, call `drip_start`, a table of tool calls. **SKILL.md and the loop guide contain no px value at all.** | The model, guided by prose (`fonts_pair` and `palette_generate` return candidates, not a scale or a layout) | Everything at `drip_start` |

What makes the originals effective:

1. **The first screen is a floor of output constraints, not a process.** Hallmark's Floor and Taste's house rules are things you can measure on the page: tokens at `:root`, the hero visible at 1280×800, 80 words a screen, never an eyebrow. Drip's first screen is the order of tool calls, and its "Rules you must not break" are mostly process (read the guides, study refs, options differ in idea).
2. **Numbers, not adjectives.** Hallmark's craft.md opens: "as numbers wherever a number exists." Its layout table pins every role in px. Drip's guides open with an essay paragraph ("Good typography is invisible where people read…") followed by ranges.
3. **Decisions come from code.** Taste and Hallmark print the `:root` block, the hero markup and the photo picks. The model then fills in content instead of designing a type system under a heavy context load. That is both faster and more consistent from run to run.
4. **Things are loaded when they're needed.** Impeccable reads the craft floor immediately before edits. Hallmark holds back gates §5 until the sweep and says "loading more is the largest avoidable cost". Drip reads everything up front, and by build time the 22 hard rules are buried.
5. **One source per number.** Each original states each value once: Hallmark's craft.md defers sizes to layout.md, which owns them. Drip restates the same value in hard-rules, slop-tells, per-surface, type, landing and heroes, and the copies disagree (see the table above).
6. **Process is light where it doesn't change pixels.**
   - frontend-design: plan, review the plan, build, critique.
   - Hallmark: one ask, a dealt theme, one Picks block, then the build.
   - Impeccable's heavy machinery (the roll, comps, measured gates) is all about the composition of the first viewport.

   Drip's heavy machinery is about research: 6+ studied refs from 3+ designers, scanning 100-150 thumbnails, choice criteria, 2-3 movements with manifestos, tiles, the critic ranking the tiles, and a user pick. Then it builds with nothing that measures the composition until the end.

**Drip's guide template costs tokens and adds no directives.** Every guide has an essay intro, Procedure, The craft, Slop tells, Done when, Reference files and Sources. Across the 12 guides a run reads:

- procedure 12%
- slop tables 11%
- sources 6%
- done-when 5%
- reference lists 4%

That is about 38%, or ~14k tokens, of scaffolding. The slop tables also repeat across guides: eyebrows show up in slop-tells, landing, type, the direction tells and fitcheck; gradient text in four places.

---

## 3. Proposed restructure

### Shape

```
skills/drip/SKILL.md          ~1k tokens: what Drip is, load tools, drip_start, the 5-step path below, "read playbook.md"
skills/drip/playbook.md       ≤4k tokens: THE craft core (section 4 below), re-sent at the build gate
assets/base.css               role scale, container + grid, label style, floor CSS (focus, reduced motion, overflow-x: clip, text-wrap)
rules/hard-rules.md           folded into playbook P33-P37; keep file as a pointer
everything else               on-demand references, never required by drip_start
```

### The default path (full loop), with the target token load

1. **Intake.** One AskUserQuestion round with material first. Reads SKILL.md + playbook (~5k).
2. **Look** (optional, default on for Persuade and Experience). 3-5 **shipped** sites in the category, one line each about scale and composition (type px, picture share, section count). Dribbble only on request.
3. **Deal + comps.** `drip_direction_deal` (new) deals 2 directions (genre + posture + type voice) with a history file. The model writes each thesis and renders a **first-viewport comp** for each (gen_image, or an HTML hero at real sizes on `base.css`). The critic ranks the comps, not tiles, and the user picks one.
4. **System + hero.** Copy `base.css`, fill in faces and colours, write a 150-word DESIGN.md contract. Build nav + hero. **The hero gate** (`fitcheck_shot --hero`) runs P31's checks.
5. **Page + finish.** Plan lines (P24), build the sections, then the page gate (P39). The critic runs once on the full page, then one confirming round.

Load per run: ~5k tokens of required guidance, plus on-demand references, against ~37k today.

### Guides that become on-demand references

| Guide | When to load |
|---|---|
| refs, moodboard | `refs` or `board` mode, or when the user asks for a moodboard |
| direction (+ genres) | When the deal needs explaining, or for a custom direction the user asked for |
| system, color, type, layout | When extending an existing system, an app or Operate surface, or a disputed value; never required for a landing page (the playbook and `base.css` hold the numbers) |
| landing (+ heroes, sections, pricing) | Section recipes when the plan needs one (pricing, FAQ, forms) |
| imagery, productshots, icons | When producing those assets |
| copy | Long-form copy, or a copy-lint failure |
| fitcheck (rubric) | The critic and self-review only |
| per-surface, slop-tells, ambition | Fold into the playbook; delete the duplicates |

### Fix before or alongside the restructure

- Delete "free" from `rules/per-surface.md`. Experience gets *bigger* floors, not none.
- Make every number single-source: the playbook and `base.css` own them, and other guides link to them.
- Rewrite `examples/portfolio.md` with a non-Claude subject and no hex values or mono. Stop telling the model to read a matching example "before you start".
- Remove mono from the direction, moodboard and refs examples.
- Hard rule 7: allow committed and drenched colour on Persuade and Experience.
- Make the fitcheck blockers that already exist in 0.3.2 (sizes, mono share, tiny text, empty stretches, imagery) **visible as targets before the build** (P17, P39) and run the subset that applies at the hero gate.

---

## 4. Draft playbook (`skills/drip/playbook.md`, ~2.6k tokens)

> Drip playbook: build from this. Persuade (landing) and Experience (portfolio, showcase). Numbers are at 1440×900 and 390×844.

### The bar
1. Build the page a strong studio would ship this year for this subject. It says plainly what it is, shows the real thing on every screen, and sets it big. Judge against shipped sites (linear.app, stripe.com, figma.com, a good museum, label or studio site), never against Dribbble shots.
2. The failure to fear is not clutter. It is a page of small things on a wide canvas. When torn, go bigger: bigger type, a bigger picture, fewer words.
3. Finish the job: every section built and every state styled. Only material the user must supply is left as a labelled slot.

### Material and job
4. Read the project first: package.json, tokens, fonts, DESIGN.md, nearby pages. Never ask what you can look up.
5. Ask one round of at most 4 questions. The first is always material: what can the page show (screens, photos, the work, real numbers, a named quote)?
6. Write four lines: what it is, who it's for, the one action, and the material (real / pictures / absent). Never invent a number, quote, logo or customer. Anything absent is left out or becomes a labelled slot.
7. Name the mode. Persuade means the offer and the action are clear in the first viewport. Experience means the work itself leads from the first viewport and the interface recedes.

### Direction
8. Write the thesis: one sentence naming the idea this page owns and the category default it refuses. Write one sentence of physical scene (who, where, what light) and let it decide light or dark.
9. Take the dealt direction (genre, colour posture, type voice) and fit the content to it. Re-deal only on factual grounds, never on taste. If the brief didn't pin one of these, refuse it: a cream ground with a serif and a terracotta or rust accent; near-black with one neon; purple or blue gradients and glass; Inter, Geist or Space Grotesk as the voice; hero plus three cards. Mirror test: would a neighbouring brief get this exact combination? If so, change one major decision.
10. Colour commits at page scale. On Persuade and Experience use Committed (one colour on 30-60% of the surface) or Drenched (the ground is the colour) unless the brief asks for quiet. The accent is a signal on the action. A grey page with one coloured button is not restraint, it is the default.
11. Pick two faces like objects from the subject's world: a display face with a point of view and a text face. Use one family when its range is wide. Mono is allowed only inside code, a measurement or a tabular figure: never labels, nav, buttons, body or headings, and never more than 10% of the page's text.
12. Name the signature: the subject's strongest real thing, shown at its best on the first screen. Then name how the thesis appears in each section below, in a different form each time. An idea that lives only in the hero is a sticker.

### Compose in pixels before CSS
13. Show directions as first-viewport comps, never as palette tiles. Make two, or three only when the brief truly forks.
14. Before writing the page, comp the first viewport at 1440×900 with the real headline, sentence, action and picture at real sizes. Use gen_image when there's a key, or else an HTML hero on base.css.
15. Write FIRST VIEWPORT in DESIGN.md with numbers: the h1's px size and column span, the picture's columns and px height, and where the action sits.
16. Look at the comp. Redo it before building if any of these is true: it could be any brand's hero, the h1 is under the display token, or the picture is under the size in P31.

### System (base.css holds these; never add a role)
17. Use exactly seven type roles, desktop / phone:

| Role | 1440 | 390 | Line height | Tracking |
|---|---|---|---|---|
| Display (hero h1) | `clamp(4.5rem, 9vw, 9rem)`, about 130px | 48-64px | 0.95-1.05 | -0.03 to -0.045em |
| Statement | 72px | 40px | 1.05 | -0.03em |
| Section (h2) | 56px | 34px | 1.1 | -0.02em |
| Item (h3) | 26px | 22px | 1.25 | -0.01em |
| Lead | 21px | 19px | 1.45 | 0 |
| Body | 18px | 17px | 1.6 | 0 |
| Small | 14px | 14px | 1.45 | 0 |

    No eighth size. Nothing under 14px except the legal line. The hero is about 2× the section head, and the section head about 2× the item title.
18. Display text is one weight, one style and one colour, with no accented word. It gets its weight from size and tracking, not from 800. Use three weights at most, picked as extremes (400 with 700, or 300 with 800).
19. Labels, nav, captions, meta and tags use the text face at Small or Body size, in sentence case and untracked. No eyebrows.
20. Container: `min(100% - 2*gutter, 1312px)`, gutter 64 / 48 / 24. Use 12 columns with a 32px gap. Every block starts on a column line. The left text edge is the same from the nav to the footer.
21. Spacing follows the scale 4 8 12 16 24 32 48 64 96 128 144 176. Section gaps are 96-176, mixed, and earned by mass. A heading sits 16-24px above its line, and the head block sits 48-64px above its content.
22. Measure: 45-70ch on paragraphs, and `max-width` in ch on each heading. `text-wrap: balance` on heads, `pretty` on body. `tabular-nums` on figures that compare.
23. Write tokens.css from base.css and a DESIGN.md contract (~150 words: THESIS, WORLD, STORY, FIRST VIEWPORT, SIGNATURE, REFUSES).

### Plan the page
24. Plan 6-9 sections, hero and footer included. Write one line per section: its id, its one idea, its picture (what kind and where it comes from), its mass, and how the thesis shows up there.
25. Every section has mass: a visual 360px or taller, a set of 3-4 across the width, a list or table of 3+ rows across 10+ columns, a working control, or a statement at Section size or larger. A heading plus a paragraph is not a section: merge it or give it its picture.
26. Height follows content. Never pad a section toward 100vh. No screen holds more than ~160px of nothing. When a page looks empty, make the content bigger, never the gaps.
27. About 80 words per screen. The hero holds a headline of 8 words or fewer, one sentence and one or two actions. Fullness comes from scale and pictures, never from more words.
28. Fill the pictures in this order:
    1. The user's material.
    2. Screenshots of the real product.
    3. The product or the work built in HTML at full fidelity, with realistic content labelled as synthetic. For software, AI and portfolios this is the default: the work, big.
    4. Licensed photographs from `images_search`, credited in one footer line.
    5. Type at full scale, when the subject is words.

    Every section below the hero shows something, and no two picture-less sections touch.
29. Rhythm: alternate dense and calm sections. Put one contrasting band (a ground change) in the second half, holding the strongest picture. Calm the last third and end on a real close that repeats the action.
30. Motion: one entrance on load (400-800ms, staggered 60-80ms, from visible) and one signature moment in its own section (two on 8+ sections). Nothing else moves because the page scrolled. Every moving thing has a reduced-motion final state.

### Build: hero first
31. Build the nav and hero only, then shoot 1440×900 and 390×844. Every one of these must pass before any section is written:
    - The h1 is at the Display token.
    - The picture is at least 6 columns wide and at least 60% of the screen tall. With no picture, the h1 spans 8-12 columns.
    - The headline, sentence and action are visible at 1280×800.
    - Nothing of the next section shows.
    - There is no more than 160px of nothing under the content.
32. Then build the sections in plan order. Commit every atom: buttons, links, inputs, nav and footer all speak the direction's language. Restyle library components to the tokens.
33. Floor:
    - Every colour and font comes from a token.
    - Every control has `:focus-visible`, plus hover, press and disabled states.
    - Reduced motion is handled.
    - Touch targets are 44px.
    - Body text meets 4.5:1 contrast.
    - Nothing scrolls sideways at 320px; use `overflow-x: clip` on html and body.
    - Never `transition: all`.

### Never
34. Eyebrows or kickers; tracked-caps labels; 01/02/03 numbering unless it's a real sequence; middle-dot meta strings; arrows glued to link text; decorative status dots.
35. Gradient text; an accented word in a head; glass or glow as decoration; purple-blue gradients; a card inside a card; three equal icon cards; the big-number-small-label hero; emoji or unicode as icons.
36. Invented stats, logos, testimonials or user counts; "Unlock / Elevate / Seamless"; "Learn more" or "Get started" as the only label.
37. Fade-up on every section; parallax on text; scroll-jacking; a marquee by reflex.

### Finish
38. Shoot the full page at 1440 and 390 and read it one screen at a time. Ask of each screen whether something on it is big enough to be its reason. Then squint: does each section have a shape, and does the page have a rhythm of heavy and light?
39. The page gate (`fitcheck_shot`) needs all of these:
    - At most 7 distinct font sizes and at most 2 families.
    - Mono under 10% of text.
    - Body at least 17px on desktop and at least 16px on phone.
    - The h1 at the Display token.
    - A median h2 of at least 40px.
    - No screen more than ~40% empty.
    - At least one picture or built visual per section below the hero.
    - No horizontal scroll at 320px.

    Fix every miss before calling the critic.
40. Run the critic once on the full page in fresh context. Fix every S0 and S1, then do one confirming round.
41. Hand off:
    - Desktop and phone screenshots.
    - The critic's verdict in its own words.
    - What's left.
    - Every assumed fact.
    - Every slot, with what the user's own material should show.

*(About 1,800 words, or ~2.6k tokens, leaving room under the 4k cap for a short worked plan line or two. Everything else in Drip is a reference loaded on demand.)*

---

## 5. What Drip does that actively hurts output

1. **"free" for portfolios** (`rules/per-surface.md`). Type sizes, body size and density are all "free" under Portfolio. This is the most direct cause of the 12-13 sizes and the 15px / 12px body. The run's task matched both `landing` and `portfolio`, so it got the landing guide plus this loophole.
2. **A cap on display type, plus conflicting h1 ranges.** "Cap display text: about 72-96px" (`drip-type`) and "h1 56-80px" (`drip-landing`) win over the critic's "120-160px", because the builder reads them first and treats them as limits. The build landed in between, at 89px.
3. **Examples that encode the defaults.**
   - `examples/portfolio.md` is a worked run of *the same prompt* ("a portfolio for Claude"). Its palettes are `#0E0E0E`/`#D4FF3A` (neon on near-black, the frontend-design calibration's trait 2), `#F7F3EA` (cream) and `#FF3D00`, plus "Claude's words assemble as you scroll". The run's chosen direction, "Transcript", is that idea.
   - `skills/drip/SKILL.md` says "read the one that matches before you start".
   - The board then produced three rust/terracotta directions. The winner is cream `#F1EEE7` + rust `#B2471F` + grotesk/serif, which is Drip's own named anti-genre in `drip-direction` ("cream or beige ground, terracotta accent, a polite serif"). It's arguably justified by Claude's brand, but it was never flagged.
4. **Mono, taught by example.** The direction contract ("Mono for every number"), the moodboard manifesto ("the number at ~30vw in mono"), the refs-study example ("nav items numbered 01-04 in mono") and `hard-rules` #8 ("optional mono") all add weight to mono. One slop row says no. The "Work index" direction on the board took "Martian Mono (labels, years)". Concrete examples beat abstract bans.
5. **Pushing references and pairings from outside the category.**
   - `ambition.md` says "Steal from outside the category: … exhibition posters, record sleeves, field guides, signage".
   - The moodboard guide requires an "unexpected pairing".
   - The example query is "exhibition poster typography".

   This works against SKILL.md rule 3 ("most studies must BE what you are building"). It also invites the failure Impeccable names: "a viewport painted whole as a facade, a book cover or a travel poster… is a picture of the world, not its website" (`mode-persuade.md`). Impeccable only lets challengers donate "ambition and system discipline…, never the challenger's clothes", and its challengers are working web worlds with QUALITY BAR boards, not posters.
6. **Dribbble as the reference source.** The run viewed 9 shots, all on Dribbble. Drip's own refs guide says shots carry "11px grey labels, charts with no axes". Studying type "values" from 1600px concept images of whole pages anchors small type. The originals' bar is shipped sites: figma.com and x.ai, or Impeccable's rendered QUALITY BAR.
7. **"One section per screen" without its machinery.** Taste's rule works because `system.css` gives sections a fixed height and a content-window table tells the model to merge or add a picture under 495px, and `check.mjs` fails `sparse`. Drip copied the rule ("fills one viewport") but not the fill logic or the check. Combined with no imagery, that produces screens of dark ground with a heading on them. Hallmark's answer is the opposite rule: "never pad toward a height".
8. **Hard rule 7 ("Neutrals carry ~90% of the UI").** It quietly turns every direction into Restrained, which on a dark or cream ground with no pictures *is* the empty stretch.
9. **Process that eats the budget craft needs.** Before any pixel exists, a full loop requires:
   - a brief round,
   - scanning 100-150 thumbnails and picking, viewing and studying 6-12 with structured fields,
   - choice criteria,
   - 2-3 named movements with manifestos,
   - `breaks_if` lists,
   - tiles for every direction,
   - a critic round on the tiles,
   - the user's pick,
   - a system step.

   That is ~13k tokens of process guides plus large tool outputs. By the build, the model is working from memory of a 37k-token reading list, and the composition still hasn't been decided. Impeccable spends its machinery on the first viewport, and Hallmark gets through its process in one ask and one Picks block.
10. **Style tiles at "equal fidelity".** Three component specimens (nav, headline, body, buttons, card) get the effort, and the critic ranks ideas on images that never show a page. Neither the user nor the critic ever sees the composition before it is coded, which is the step the originals treat as decisive.
11. **Measuring only at the end.** 0.3.2's `fitcheck_shot` blockers (sizes, mono share, tiny text, empty stretches, imagery) are the right checks, but the builder never sees their thresholds as targets. It meets them only as failures after the whole page exists, when fixing scale means rebuilding.
12. **Repetition that dilutes.** The same warnings (eyebrows, gradient text, three cards, fade-ups) appear in 4-6 guides. Each extra copy costs tokens and teaches nothing new, and each copy's numbers drift (see the contradiction table in §1). The originals state each rule once in its owning file.

---

## 6. What 0.3.3 shipped from this audit

- `skills/drip/playbook.md` (~2.5k tokens) is the one required read for pages. `drip_start` returns it inline (zero extra `drip_guide` calls), and `board_choose` re-sends its build half. Required reading on a page loop went from ~37k tokens to ~3k.
- `kit/base.css` and `drip_kit`: seven type roles (Display `clamp(3rem, 1.2rem + 7.5vw, 9rem)`, ~127px at 1440), the grid, the spacing scale, buttons with every state, and the floor.
- `refs_site` studies shipped sites with measured sizes. The reference gate dropped to 4 studies (3 on-surface), and the outside-category push is gone.
- `board_directions` renders first-viewport comps at 1440x900 (headline, picture slot, layout) instead of style tiles.
- The hero gate (`fitcheck_shot hero: true`) and the page gate: 7 sizes, 2 families, mono at most 10%, body 17px or more, h1 at Display, h2 median 40px or more, no screen more than half empty, no two picture-less sections touching. Lighter rules apply on app surfaces.
- Contradictions fixed:
  - "free" for portfolios;
  - the 72-96 and 56-80 h1 caps;
  - hard rule 7 (90% neutral) now applies to apps only;
  - mono in the examples;
  - the critic's caps aligned with the kit;
  - `examples/portfolio` rewritten with no palette or faces to copy.
- The critic gets 2 build rounds (one review plus one confirming round), down from 3.

# Public design skills Drip hasn't fused yet (research, November 2026)

Date: 2026-11-23. Scope: public agent skills, plugins and prompts for design work, beyond the sources already in
`CREDITS.md` (Impeccable, Taste Skill, Emil Kowalski, Make Interfaces Feel Better, UI UX Pro Max, Hallmark, unslop-ui,
Stageshow, Anthropic frontend-design, Vercel Web Interface Guidelines). Measured against the 0.3 plan (`docs/PLAN-0.3.md`, now only in git history), the current
`agents/critic.md` and `skills/drip-direction`.

## How this was gathered

- **skills.sh** all-time leaderboard (fetched 2026-11-23). Its install figures came back through a page summariser,
  so treat them as approximate.
- **GitHub** searches through `gh` for logo, brand, critique, moodboard, taste, anti-slop, dashboard, game-UI and
  frontend-design skills. Stars, licence and last push come from `gh repo view` on 2026-11-23.
- Web searches for critique and brand skills listed on skills.sh, claudemarketplaces.com and other directories.
- Every repo below was shallow-cloned and its SKILL.md and key references read. Nothing in this report is based on a
  README alone.

**Licence rule used here:** MIT, Apache-2.0 and CC-BY-4.0 count as permissive: adapt with credit, and keep the notice.
A repo with **no licence** is marked **paraphrase only**: take ideas, never text or code.

**Popularity caveat:** skills.sh numbers are installs, which are not the same as uses, and the board is dominated by
packs that install many skills at once. No logo-specific or critique-specific skill appears in the visible top ~280.
The most-installed design skills not yet in Drip are `grill-me` (an intake method, not a design skill), Sleek's
`design-mobile-apps` (a paid SaaS client) and uizze's `ui-taste` (mostly an Impeccable derivative). For logo and
critique work, the best sources are smaller repos, ranked here by quality of content rather than by install count.

---

## Candidates

### 1. logo-design (Kaan Kiziltug): the strongest logo skill found

- **URL:** https://github.com/kaankiziltug/logo-design-skill
- **Popularity:** 7,573 stars; skills.sh installs unknown.
- **Licence:** MIT. Its `TRADEMARKS.md` says the bundled library of 1,400+ real SVG logos is trademarked material
  meant for study only. Drip must not copy the library.
- **What it does:** a full senior-identity-designer workflow from brief to delivery. Its five modes are Design,
  Critique, Redesign, System and Assets. It ships dependency-free Python scripts:
  - `concept_sheet.py`: concept overview at true 64/32/16 px;
  - `svg_audit.py`: flags near-miss angles, tiny details, live text, filters and complexity;
  - `preview_sheet.py`: size ladder, one-colour, squint blur, mirror/rotate, favicon and app-icon contexts, and a
    "shelf test" against competitors;
  - `presentation_board.py`: industry-specific mockups;
  - `export_variants.py`.

**Take for Drip** (maps onto PLAN-0.3 §6):
1. **"Identify, don't explain"** as the logo's first principle. Concepts are **one-sentence ideas**: "a sentence that
   could describe a competitor's logo is not a concept."
2. **Cheap divergence, expensive builds.** Write 8-12 one-line concepts spread across mark types (wordmark, monogram,
   letterform, pictorial, abstract, emblem, mascot, combination) and explore at least 2 types. Score them on idea,
   distinction, simplicity, relevance and small-size strength. Build only the 3 strongest *and most different*.
3. **Black first.** Build every concept in solid black on a 256-unit viewBox. Exact angles only (0/15/30/45/60/90°),
   arcs for circles, real holes with `evenodd`, few anchors, no live `<text>` in finals. Save every iteration as
   `-v1`, `-v2` instead of overwriting.
4. **Craft-pass tests** that target where AI-drawn marks fail:
   - *letter test*: does each modified letter still read as itself?
   - *junction check*: no notches, slivers or lumps where strokes meet;
   - *peer test*: put the mark next to 3-4 exemplary marks at the same size;
   - *literalness*: a cup for coffee gets pushed further or dropped;
   - optical overshoot of 1-3 %, the bone effect, a thinned reversed version (irradiation), and checks for unintended
     readings when mirrored or rotated 180°.
5. **Concept checkpoint, in greyscale.** Show the concept sheet in greyscale first ("colour triggers taste debates"),
   with one line per concept and one honest risk each. Build the full kit (lockups, favicon set, mockups, guidelines)
   only after the user picks.
   - Red flags to lint: details under ~1/48 of the mark; more than 3 colours without a reason; a gradient rescuing a
     weak form; an unmodified stock font for initials.
   - Critique scorecard: 10 dimensions scored 1-5, where "one fatal flaw outweighs a high total".

### 2. logo-designer (neonwatty)

- **URL:** https://github.com/neonwatty/logo-designer-skill
- **Popularity:** 212 stars.
- **Licence:** MIT.
- **What it does:** interview with `AskUserQuestion`, then 3-5 SVG concepts generated in parallel, a preview HTML
  page with a light/dark toggle, iteration rounds, and PNG export at 16-2048 px.

**Take:**
1. **One subagent per concept, all dispatched in one message**, each given the full brief plus *one assigned creative
   direction*. This forces real divergence, because agents that share no context can't converge on one idea. It is
   also faster.
2. **Gather context before asking:** read the README, package.json and CSS first, summarise what was found, then ask
   only what is still missing. If the user says "just make something", use the defaults and go.
3. Wrap SVG parts in named groups (`id="icon"`, `id="wordmark"`) so "make the icon bigger" edits are precise.
4. Use a stroke width of at least 6 (on a 512 canvas) for any outline that must survive at 32 px.

### 3. rampstackco/claude-skills: logo-design, creative-direction and brand-identity

- **URL:** https://github.com/rampstackco/claude-skills
- **Popularity:** 1,113 stars.
- **Licence:** MIT.
- **What it does:** a large pack of 100+ skills. The design-relevant ones are `logo-design` (6-12 variants across
  architectures, with application specs), `creative-direction` (4 directional axes), `brand-identity`,
  `art-direction` and `brand-archetype-system`.

**Take:**
1. **Category conventions file.** For each of 10 categories it lists the defaults that work, the conventions worth
   honouring, the conventions worth *breaking for positioning*, and the clichés to avoid. Legal firms: no pillars,
   scales, gavel or Lady Justice. Drip's `/drip:adapt` packs and logo skill should carry the same four lists per
   niche.
2. **Typographic registers with their risks:** geometric sans, humanist sans, neo-grotesque, transitional serif,
   old-style serif, slab serif and display custom. Each comes with the categories that default to it and its
   pitfalls, for example "Cabinet Grotesk codes as 2022-23 startup." Rule: **pick within the category default only
   on purpose; otherwise choose by what the brand rejects.**
3. **Production mark set:** a primary lockup, a monogram for square contexts, and a letterform-as-symbol for favicon
   and embroidery, all from the same wordmark DNA.
4. **Four creative-direction axes**, a ready intake structure for PLAN-0.3 §2 "Feel":
   - Tone: professional, conversational, playful or provocative.
   - Aesthetic: editorial-restrained, polished-standard, controlled-maximalist or expressive-maximalist.
   - Audience relationship: authority, peer, companion or coach.
   - Sensory ambition.
   - The choosing rule is "what does the audience already get too much of?"
5. Ask for **liked and disliked reference logos with one sentence each**: "negative space sharpens positive
   selection."

### 4. brand-design-skill (ziguishian): **paraphrase only**

- **URL:** https://github.com/ziguishian/brand-design-skill
- **Popularity:** 203 stars.
- **Licence:** none.
- **What it does:** a Chinese, image-first brand and visual-identity flow driven as a strict conversation with
  approval gates. The steps are Socratic brief → design routes → generated logo images → selection → final assets →
  VI plan → HTML brand manual.

**Take (ideas only):**
1. **"No simulated consent."** "Do the whole thing" or "you decide" is not approval to skip a gate. Each stage needs
   its own explicit yes, and permission to assume is not permission to generate. This maps onto Drip's gatekeeper
   critic and keeps the user in control of the expensive steps.
2. **The selected candidate becomes the locked source of truth.** Never "cosmetically improve" the chosen mark
   without asking. This prevents the common AI failure of silently redrawing the logo during the kit stage.
3. Every response ends with **one clear next user action**.

### 5. design-review (vip999611-ai): best critique methodology found

- **URL:** https://github.com/vip999611-ai/Design-review-skill
- **Popularity:** 0 stars, so unknown. It's included on quality alone.
- **Licence:** Apache-2.0.
- **What it does:** a read-only, evidence-graded expert review of posters, brand visuals, character/IP art, slides,
  data viz and UI. It covers a design contract, three passes, an independent panel, severity levels and weighted
  scoring with caps.

**Take** (directly upgrades `agents/critic.md`):
1. **Three-pass inspection:**
   - (A) a **3-second communication** pass: first focal point, message, entry and tone;
   - (B) **system and craft**;
   - (C) **delivery and risk**: legibility at the real viewing size, accessibility, production.
2. **An independent panel with bias controls.** Five lenses (creative director, art director, typography and systems,
   brand and content, accessibility and delivery) each record, *before seeing the others*:
   - the one strength to preserve;
   - at most 3 root problems;
   - the highest severity their evidence supports;
   - what they cannot know.

   The panel then synthesises one verdict and keeps real disagreements as named trade-offs. Named biases to guard
   against: authority, groupthink, first-idea anchoring, **minimalism bias** ("density is not a defect"),
   trend/familiarity bias, style cloning, halo effect and precision bias.
3. **Severity S0-S3 plus an evidence level for each finding.** The evidence types are direct observation,
   guideline-backed, professional inference and needs verification. Source levels run A (official), B
   (institutional) and C (practitioner). **Never create an S0/S1 from C-level advice alone.** Never invent exact px
   or hex values, or contrast ratios, from a compressed screenshot: say "appears" or "verify in source".
4. **Route-weighted 100-point score with caps.** Different artifact types get different weights; for example, brand
   work puts 25 points on concept fit. An unresolved S0 caps the score at 59, and a wrong or unreadable core message
   caps it at 49. Unseen dimensions are N/A and the weights are renormalised. If fewer than 50 weight points are
   supported, give no score at all. **Differences under 3 points count as a tie.**
5. **Annotated output.** Numbered markers on a copy of the image, with marker P1 matching written finding P1, plus a
   low-fidelity "suggested structure" diagram. Each finding states: location, symptom, why it matters, a concrete
   action with a testable target, evidence type and confidence. Stop at 10 findings, and stress the top 5.

### 6. Tastemaker (thecsiz): the conviction rubric

- **URL:** https://github.com/Thecsiz/tastemaker
- **Popularity:** 9 stars.
- **Licence:** MIT for SKILL.md, references and scripts; **CC-BY-4.0 for the knowledge base**. Adapting the KB is
  allowed with attribution.
- **What it does:** a critique built as a ladder:
  1. **Correct**, which it assumes is already met;
  2. **Coherent**;
  3. **Characterful**;
  4. **Convicted**.

  Three knowledge bases back it: craft rules (CR), taste principles (TS) and ranked trade-offs (TR, phrased "X over
  Y, even when Y wins locally"). It also has Scope mode ("what should I cut") and System mode.

**Take:**
1. **"Taste is the act of deciding … its opposite is design with no decisions in it."** Grade down *undecided* work
   with full confidence. Never grade down work for being expressive.
   - **The dogma test:** "could a maximalist design score Tasteful? Yes, if it committed." This is the guard Drip's
     critic needs against becoming a minimalism cop.
2. **Contextual ceiling.** The grade measures how close the work gets to the ceiling its context calls for, not its
   absolute rung. A checkout should stop at Coherent, and reaching for conviction there is itself a lapse. A hero
   or landing page must reach Convicted. This matches Drip's surface modes (Persuade, Operate, Read).
3. **The inevitability test:**
   - list the 5 most prominent decisions and count how many feel *locked* rather than arbitrary;
   - check whether the product can be identified from a cropped, logo-free screenshot;
   - look for "the choice a more cautious designer would not have made".

   An "~80% proven pattern / ~20% ownable" calibration avoids novelty for its own sake.
4. **Ranked trade-offs as a project file** (`tastemaker-house.md`) plus a **cut log**. When two good principles
   collide, the ranking decides instead of the critic's mood. Drip could store these in `DESIGN.md`.
5. **"Don't reward confident bad work":** conviction is necessary but not sufficient. The eye, meaning craft, still
   gates it.

### 7. critique-design (guoyuhan1220): **paraphrase only**

- **URL:** https://github.com/guoyuhan1220/critique-design
- **Popularity:** 2 stars.
- **Licence:** none.
- **What it does:** three personas review a design: a VP with 6 other reviews today, an engineer who has to maintain
  it, and an impatient user with 12 minutes. A 10-dimension evaluation follows. Where all three agree, that is the
  top fix.

**Take (ideas only):** the personas declare their **blind spots** ("the VP doesn't see implementation or a11y"), and
"where they agree" becomes the priority signal. Other rules: "Specificity or silence", 3-5 observations per persona,
no softening. Drip could use the persona trio as a cheap pre-critic self-check, separate from the real critic.

### 8. Anthropic `knowledge-work-plugins/design` (design-critique, design-system, ux-copy and others)

- **URL:** https://github.com/anthropics/knowledge-work-plugins/tree/main/design
- **Popularity:** the repo has 36,736 stars; installs for this plugin are unknown.
- **Licence:** Apache-2.0.
- **What it does:** a generic critique covering first impression (2 s), usability, hierarchy, consistency and
  accessibility.

**Take:** one idea, **"match the stage"**: exploration gets different feedback from final polish. Drip's critic
should be told the stage (direction tile, concept sheet or finished build) and judge accordingly. Otherwise it is
weaker than Drip's own critic.

### 9. Anthropic `skills`: canvas-design, theme-factory and algorithmic-art

- **URL:** https://github.com/anthropics/skills
- **Popularity:** 199,384 stars.
- **Licence:** Apache-2.0, in a `LICENSE.txt` inside each skill.
- **What it does:**
  - `canvas-design` writes a named "visual philosophy" (an art-movement manifesto of 4-6 paragraphs), then expresses
    it on a canvas that is 90 % visual and 10 % text.
  - `theme-factory` shows a showcase PDF of 10 named themes, asks the user to choose, waits, then applies.

**Take:**
1. **Name the movement before designing.** Give each direction a 1-2 word name and a short manifesto that covers
   space, colour, scale, rhythm and hierarchy. Drip's directions are "a name + palette" (PLAN-0.3 problem list);
   this makes each one a world with a thesis.
2. **"The subtle reference":** the subject appears as a quiet, niche reference inside the work, "like a jazz musician
   quoting another song", rather than a literal illustration. This is a strong creative-ambition prompt for heroes,
   posters and logos.
3. Frame craft as labour: the work should look like it "took countless hours". It is a crude but effective push
   away from first-draft output.
4. theme-factory: **show the options visually, ask, wait for an explicit pick.** This is the same contract as Drip's
   board.

### 10. frontend-design "eight anchors" (Ilm-Alan)

- **URL:** https://github.com/Ilm-Alan/frontend-design
- **Popularity:** 186 stars.
- **Licence:** MIT.
- **What it does:** 8 aesthetic anchors, each locked to concrete tokens and each with a **"Breaks if"** line:
  Swiss, Industrial, Brutalist, Aurora Maximalism, Chaotic Maximalism, Retro-Futuristic, Organic and Lo-Fi.
  - Organic, for example: earth tones, "never cream #F0-F8", and Fraunces allowed only in this anchor.
  - Agents are told to "lean unexpected": "a Swiss punk record label, an Industrial florist, a Brutalist luxury
    watchmaker…"

**Take:**
1. **Unexpected pairing as a creative-ambition move:** cross the subject with an anchor from a *different* world,
   and state "why this pairing over the safe one".
2. **"Breaks if" lines per genre:** machine-checkable token fences, for example "if this genre is chosen, no warm
   paper, no grain, no centred type". Drip's `direction/genres` could add a `breaks_if` list per genre and lint
   against it in fitcheck (**token fidelity**).
3. **Hybrid resistance:** "Swiss with Brutalist edge" is a category error. Commit to one.
4. **Content is not design.** Forbidden content: fabricated telemetry and personas, mono-caps filler subtitles,
   `//`-prefixed kickers, themed replacements of standard UI copy ("Authenticate Session" instead of "Next"), and
   unicode glyphs used as icons.

### 11. visual-direction-moodboard (buttonsprite)

- **URL:** https://github.com/buttonsprite/visual-direction-moodboard
- **Popularity:** 0 stars, so unknown. It's included on quality alone.
- **Licence:** MIT.
- **What it does:** acts as an art director co-creating a direction. The loop is real references → a single-file
  gallery the user rates → critique → synthesis into a moodboard → controlled trials on demand.

**Take** (maps onto PLAN-0.3 §3 and §5):
1. **Separate attribution:** every item is labelled `Candidate`, `Agent Pick` or `User Selected`. Delegated picks
   ("just pick for me") are **never recorded as user taste**.
2. **Comparison space before convergence:**
   - 15-30 distinct real works in round 1;
   - at least 2 contrasting interpretations per keyword;
   - "never wrap 3-4 images as a complete direction".
3. **Critique concrete craft, not adjectives.** Ground the discussion in type-to-image hierarchy, whitespace and
   cropping, colour balance, material or print craft, and series scalability. Never settle for "clean", "modern" or
   "premium".
4. **Gallery mechanics:** stable IDs (`I001`…), images cached locally against broken links, keyword filters, a
   lightbox, quick rating buttons and **one-click "copy my feedback"**. Open with **2-3 high-contrast pairs** to
   start the discussion.
5. **Hand-off boundary:** until the user reacts, everything stays a candidate. Never declare a direction final on
   the user's behalf.

### 12. taste (senlindesign): reverse-engineer a site's design DNA. **Paraphrase only**

- **URL:** https://github.com/senlindesign/taste-skill
- **Popularity:** 514 stars.
- **Licence:** none.
- **What it does:** takes a URL, captures the DOM and a screenshot through Playwright, then runs 4 steps:
  measure → pattern → taste → observer. The output is a token map plus 3-4 "Taste DNA" trade-offs in the form
  Trigger → Decision → Reason → Evidence.

**Take (ideas only)** for Drip's `refs_study`:
1. Its **observer step** kills weak findings. It deletes any principle that:
   - would apply to any modern site;
   - cites no px, hex or ratio;
   - contradicts the measurements;
   - gives a cliché as the reason ("for better UX").

   **Craft-data cross-checks** catch unearned praise:
   - "refined typography" on Inter with no modular scale;
   - "sophisticated depth" from single-layer black shadows;
   - "restrained colour" with the accent on over 20 % of the surface;
   - "polished interactions" with no `:focus-visible`.
2. **At least one restraint principle**: something the design chose *not* to do.
3. Every "chose A over B" needs a **real, defensible B**, never a strawman.
4. Converge on 3-4 surviving principles. "Accurate-and-few beats polished-and-fake."

### 13. taste (jaytel0): reference images → a generated SKILL.md. **Paraphrase only**

- **URL:** https://github.com/jaytel0/taste
- **Popularity:** 314 stars.
- **Licence:** none.
- **What it does:** a pipeline that turns a folder of reference images into a reusable taste SKILL.md with numbered,
  concrete defaults. The example output has 20+ non-negotiables, such as "keep 80-95 % of the interface neutral" and
  "one saturated accent max", plus a forbidden-shortcuts list and a generation checklist.

**Take (ideas only):** this is the shape `/drip:adapt` should output. Studied refs become **numbered, testable
defaults** (percentages, counts, radii) plus a forbidden list. One test is worth stealing: **"the design must still
work if every string is replaced with Title/Label/Detail"**, so content can't carry the look.

### 14. grilling / grill-me (Matt Pocock): intake method

- **URL:** https://github.com/mattpocock/skills (`skills/productivity/grilling`)
- **Popularity:** 331,245 stars; skills.sh lists `grill-me` at ~1.6M installs (#5 all-time).
- **Licence:** MIT.
- **What it does:** a relentless interview organised as a **design tree**.

**Take** for PLAN-0.3 §2:
1. **Ask the frontier.** Each round, ask every question whose prerequisites are settled, number them, and **give a
   recommended answer for each**. Word each question so "yes" accepts the recommendation.
2. **Facts are the agent's job; decisions are the user's.** Never ask what you could look up: send a subagent and
   don't block on it.
3. **Disagreement worth knowing about:** the author deliberately rejects `AskUserQuestion` pickers. He argues they
   push towards pre-baked multiple-choice answers. Drip's plan uses buttons. A good compromise is buttons whose
   first option is Drip's recommendation, plus "Other" always on, plus at least one open question ("Anything you
   love or hate?").
4. julianoczkowski/designer-skills (Apache-2.0, 615 stars) puts this into practice for design. Its `design-brief`
   scans the codebase first (tokens, Tailwind config, shadcn, fonts, Storybook), then grills. The brief has **max 3
   experience principles, each resolving a tension**, plus **reference points and anti-references**.

### 15. dashboard-design (abdiraimov-otabek): a model for niche specialisation

- **URL:** https://github.com/abdiraimov-otabek/dashboard-design-skill
- **Popularity:** 1,144 stars.
- **Licence:** MIT.
- **What it does:** a dashboard skill distilled from 127 shipped screens, Few, Tufte, Knaflic and Cleveland &
  McGill, and two teardowns. Its "leading words" are First glance, Monitor, Quiet, Wordless, Honest and Goal beside
  the number.

**Take** (a template for how a niche pack should be structured):
1. **Leading words instead of a rulebook:** 5-6 named qualities that every rule ties back to.
2. **Each build step has a "Done when"**, for example "every number has a form and a one-line reason". Before any UI
   exists:
   - write a **fixture that triggers every problem state**;
   - write its **expected answers**;
   - QA then checks the rendered numbers against them.
3. **Critique order ranked by harm:** honesty → salience (does the eye land on the problem?) → hierarchy → text →
   component smells → polish. "A pretty screen with two answers to one question is not good."
4. **Numbers you can lint:**
   - zero sentences outside tooltips and empty states;
   - show `—` for no data, never a fake 0;
   - a base under ~5 reads "was 1" in grey, never a red −100 %;
   - deltas on lower-is-better metrics flip their colours.
5. Sources and case studies sit in `references/`, which is the pattern `/drip:adapt` packs should follow.

### 16. Owl-Listener/designer-skills: broad method library

- **URL:** https://github.com/Owl-Listener/designer-skills
- **Popularity:** 3,477 stars.
- **Licence:** MIT.
- **What it does:** 100+ short skills, including visual-critique per dimension, UX laws, research and strategy. Most
  are shallow, but two are excellent: `parallel-concepts` and `concept-selection`.

**Take:**
1. **Distinct concepts must differ on the decision axis.** "Two concepts with the same steps in the same order and
   different visual treatment are one concept rendered twice." For visual directions, read this as: the options
   must differ in *idea*, not only in palette.
2. **Comparable fidelity:** never compare a polished option against a rough one, because the polish decides.
   It cites the Stanford parallel-prototyping study (Dow et al., 2010). **No strawmen:** don't present an option
   you'd refuse to build.
3. **Criteria before comparison.** Write the winning criteria *before* looking at the options, and make each one
   able to fail a concept. Mark each as a **threshold** or a **trade-off**.
4. **Never graft the losers onto the winner.** For each rejected option, record what it tested, what it lost on and
   what would bring it back.
5. `critique-brand-consistency` checks a screen against `mood.md`, `voice.md` and `tokens.md`, listing each
   non-compliant value with its token equivalent. This is a model for the critic's "matches the direction contract"
   axis.

### Also checked, lower value (one line each)

- **design-critic** (curiositech/some_claude_skills): MIT, 276 stars. A 6-dimension 0-100 score that includes a
  15 % "Modernity: current trend alignment" axis. This is **the anti-pattern to avoid**: it rewards trend-following.
- **iOS Design Agent Skill** (vermont42): MIT, 28 stars. Good niche example: SF Pro's four designs (default, serif,
  rounded, mono) as free typographic contrast, `.monospacedDigit()` on changing numbers, and "default List
  styling = the iOS Tailwind template".
- **design-mobile-apps** (designed-by-ai/Sleek): MIT, 41 stars, ~1.6M installs on skills.sh. A paid API client. One
  idea: a **user shot** (phone-height, shown to the user) versus a **review shot** (full height, used to judge your
  own work, because the fold hides problems).
- **uizze anti-ui-slop / ui-taste**: Apache-2.0 and MIT, 133 stars, ~1.1M installs for `ui-taste`. Mostly an
  Impeccable adaptation, which Drip has already fused. Overdrive's "two or three concrete directions, each with the
  visible result, fit, support, performance cost and complexity" is a decent options format.
- **atypica-ai/logo-design-skill** (MIT, 3 stars) and **shadowtor/BrandDesign** (MIT, 3 stars): smaller versions of
  #1.
- **Game UI skills** (maitrithanh, 888wing, inkloom): all under 5 stars. There is no mature public game-UI skill, so
  Drip's `/drip:adapt` would fill an empty niche.

---

## Top 15 improvements for Drip (ranked)

1. **Upgrade the critic to evidence-graded, three-pass reviews.**
   - Run the 3-second / craft / delivery passes, give each finding a severity S0-S3 plus an evidence type and a
     confidence, and never put invented px or hex values on screenshots.
   - Caps: an S0 caps the score at 59, a broken core message at 49.
   - Score differences under 3 points count as ties.
   - *Source: vip999611-ai/Design-review (Apache-2.0).*
2. **Add a contextual ceiling and the dogma test to the critic.**
   - The verdict measures how close the work gets to the ceiling its surface mode allows. Operate and Read surfaces
     can PASS at "Coherent"; Persuade and Experience surfaces must be "Convicted".
   - Add an explicit rule: grade down *undecided* work, never *expressive* work. A committed maximalist page can
     pass.
   - *Source: Tastemaker (MIT and CC-BY-4.0).*
3. **Run the critic as an independent panel.** Use 5 lenses that each record one strength to keep, at most 3 root
   problems and what they can't know, *before* synthesis. Keep named disagreements visible to the user instead of
   averaging them away, and list the bias checks (minimalism, trend, halo, first-idea) in the prompt.
   *Source: Design-review; Owl-Listener concept-selection.*
4. **Build the `drip-logo` skill on Kiziltug's process:**
   - 8-12 one-sentence concepts across at least 2 mark types;
   - score them, build the 3 strongest *and most different* in black first on a 256-unit viewBox with exact angles;
   - save every version;
   - checkpoint in greyscale before any kit.
   *Source: kaankiziltug/logo-design-skill (MIT).*
5. **Make `logo_test` and the SVG lint cover the AI-failure checks:**
   - near-miss angles, details under 1/48, live text or filters, node count;
   - letter test, junction check, peer test against 3-4 exemplary marks;
   - mirror and 180° readings, irradiation-thinned reversed version, the 16 px squint;
   - "one fatal flaw outweighs a high total".
   This directly targets the "drip that looked like blood" failure. *Source: kaankiziltug (MIT).*
6. **Generate logo concepts and directions in parallel subagents**, each given the full brief and *one assigned
   direction*. Agents that share no context produce real divergence. *Source: neonwatty/logo-designer (MIT).*
7. **Require options to differ in idea, not only in style.** Board directions and logo concepts must differ on the
   decision axis: what the work leads with, the concept and the metaphor. A palette swap does not count. Render them
   at **equal fidelity**, and add no strawman options.
   - The critic gets a new check, "two of these are the same idea rendered twice → cut one".
   *Source: Owl-Listener parallel-concepts (MIT).*
8. **Write the choice criteria before showing the options.** The brief yields 3-5 criteria, each a threshold or a
   trade-off, written before the tiles render. The board shows how each direction scores against them. When one is
   chosen, record why the others lost and what would bring them back.
   - Never graft losers onto the winner.
   *Source: Owl-Listener concept-selection (MIT).*
9. **Name each direction as a movement with a short manifesto, and allow an "unexpected pairing" option.**
   - The style tile carries a 1-2 word movement name, a 3-sentence thesis and a "subtle reference" to the subject.
   - At least one of the 2-3 directions crosses the subject with a genre from another world, with "why this over the
     safe one" stated.
   *Source: Anthropic canvas-design (Apache-2.0); Ilm-Alan frontend-design (MIT).*
10. **Give each genre a `breaks_if` list and lint token fidelity.** Each genre in `direction/genres` gets forbidden
    tokens, for example "Swiss breaks if: warm paper, serif display, grain, centred type". Fitcheck lints the built
    CSS against the chosen genre, and also flags hybrids. *Source: Ilm-Alan frontend-design (MIT).*
11. **Run intake as the design-tree frontier, with a recommended answer for each question.**
    - Read the project first (tokens, Tailwind, fonts) and never ask what can be looked up.
    - Each button question makes Drip's recommendation option 1, keeps "Other" open, and has at least one free-text
      question about loves and hates.
    - Use rampstack's 4 axes (tone, aesthetic density, audience relationship, sensory ambition) to build the "Feel"
      pairs.
    *Source: mattpocock grilling (MIT); julianoczkowski design-brief (Apache-2.0); rampstack creative-direction (MIT).*
12. **Track attribution and keep the comparison space wide on moodboards.**
    - Label every ref `Candidate`, `Agent Pick` or `User Selected`, and never store delegated picks as user taste.
    - Round 1 holds 15-30 distinct works with at least 2 contrasting readings per keyword.
    - Open with 2-3 high-contrast pairs, and add one-click "copy my feedback" in the board artifact.
    - Ban adjectives like "clean", "modern" and "premium" in study notes.
    *Source: buttonsprite visual-direction-moodboard (MIT).*
13. **Make `refs_study` reject unearned praise.** Every finding cites a px, hex or ratio. Generic findings are
    deleted, as are claims the data contradicts (for example "refined type" on Inter with no scale). At least one
    finding records what the reference *chose not to do*, and every "A over B" needs a real B.
    *Source: senlindesign taste (paraphrase only).*
14. **Give niche packs (`/drip:adapt`) a fixed skeleton:**
    - 5-6 **leading words**;
    - a **category-conventions** file with four lists: defaults that work, conventions to honour, conventions to
      break for positioning, and clichés;
    - **"Done when"** for each step and a critique order ranked by harm;
    - a state fixture with expected answers;
    - numbered, testable defaults, ending in a forbidden list.
    *Sources: dashboard-design (MIT); rampstack category-conventions (MIT); jaytel0 taste (paraphrase only).*
15. **Add no-simulated-consent gates and lock the chosen source of truth.**
    - "Do everything" never counts as approval for an expensive stage.
    - Once a direction, logo or tile is chosen, it is locked: later stages may not "improve" it without asking.
    - Every message ends with one clear next action.
    *Source: ziguishian brand-design (paraphrase only); Kiziltug's concept checkpoint (MIT).*

Honourable mentions:
- **Stage-aware critique:** tell the critic whether it is judging a direction, a concept sheet or a build.
  *Source: Anthropic knowledge-work design-critique.*
- **User shot versus review shot**: judge on full-height captures. *Source: Sleek.*
- **Content-neutral test**: does the look survive with every string replaced by "Label"? *Source: jaytel0.*

---

## Critic rubric (draft, synthesised)

For `agents/critic.md`. It keeps the current voice ("specific beats harsh; harsh beats vague") and the PASS / REVISE /
REJECT verdict.

### 0. Contract (one line, before judging)
Write one line with:
- the artifact;
- the stage (direction tile, logo concept sheet or build);
- the surface mode (Persuade, Experience, Operate or Read);
- the audience;
- the viewing size;
- the brief's ambition;
- **the ceiling**: *Coherent* for Operate and Read, *Convicted* for Persuade, Experience and identity work.

If an essential field is missing, mark the review **provisional**.

### 1. Three passes
- **A. 3 seconds.** Name the first focal point. Is it the right one? Say what a stranger would call this. Could you
  name the product from a cropped, logo-free crop?
- **B. System and craft.** Check hierarchy, grid and edges, optical alignment, spacing rhythm, type roles, palette
  roles, image treatment and radius and shape grammar.
  - For logos, also check curve quality, junctions, letter legibility, overshoot and stroke consistency.
- **C. Delivery.** Check legibility at the real size (logos at 16 px, one colour and reversed; pages on a phone),
  likely contrast risks, states and honest content.

### 2. Panel (silent, independent, then merged)
The lenses are creative director, art director, type and systems, brand and content, and delivery and access. Each
records one strength to keep, at most 3 root problems, its maximum severity and what it can't know. Merge root causes.
Keep real trade-offs as **DISAGREEMENT** lines.

### 3. Axes (1-10; 5 = competent and forgettable, 7 = good studio work, 9+ = name exactly why)

| Axis | Question | Weight: page | Weight: logo/brand | Weight: direction tile |
|---|---|---:|---:|---:|
| Idea | One sentence, impossible to attribute to a competitor? | 20 | 25 | 25 |
| Conviction | How many of the 5 biggest decisions feel locked rather than arbitrary? Is there a choice a cautious designer wouldn't make? | 15 | 15 | 20 |
| Fit | Matches the brief, the direction contract, and the client's loves and hates? | 15 | 15 | 15 |
| Hierarchy & composition | One obvious path; the right thing first | 15 | 5 | 10 |
| Craft | Curves, junctions, edges, spacing, type detail | 15 | 25 | 10 |
| System | Tokens and radii agree; one world top to bottom; no hybrid genre | 10 | 5 | 10 |
| Delivery | Small sizes, mono or reversed, phone, contrast, real content | 10 | 10 | 10 |

Mark unseen axes N/A and renormalise the weights.

### 4. Findings (at most 10, stress the top 5)
Each finding gives:
- `P#`;
- the location;
- what is seen;
- why it matters *here*;
- a fix with a testable target ("headline 120-160px", "redraw with 3 nodes");
- severity: **S0** blocker, **S1** high, **S2** medium or **S3** polish;
- evidence: observed, guideline, inference or verify;
- confidence: high, medium or low.

Never raise an S0 or S1 on practitioner taste alone. Never invent hex, px or contrast ratios from a screenshot.

### 5. Caps and rules
- An unresolved S0 means the verdict can't be PASS (the score is capped at 59 out of 100). A wrong or unreadable core
  message caps the score at 49.
- One fatal flaw outweighs a high total. For logos the fatal flaws are: illegible at 16 px, looks like an existing
  mark, or an unfortunate reading.
- **Dogma test:** never grade down density, maximalism or loudness when it is committed and still usable. Grade down
  *undecided* work, defaults and hedges.
- **Bias checks:** minimalism, trend and familiarity, halo (pretty imagery doesn't excuse fake numbers), first-idea
  anchoring, and polish deciding between options of unequal fidelity.
- **Ties:** options within 3 points out of 100 are tied unless a goal-specific issue separates them. Flag "same idea
  rendered twice → cut one".
- **PASS:** every axis is at least 7, there is no S0 or S1, and the work reaches its ceiling. Conservative or
  Operate briefs may pass with Conviction at 6.

### 6. Output (keeps the current shape, adds three lines)
```
CONTRACT: … (provisional: yes/no)
VERDICT: PASS | REVISE | REJECT
SCORES: idea 6/10 · conviction 4/10 · …  (weighted 58/100)
RANKING (if several): 1. Name (71) — why · 2. Name (69, tie) — why · 3. Name (40) — cut: same idea as 1
WORST PROBLEM: …
WHAT'S GENERIC: …
FINDINGS: P1 [S1 · observed · high] location — symptom — why — fix …
DISAGREEMENT: art director vs delivery: … (which wins if …)
FIXES (by impact): 1. … 2. … 3. …
WHAT WORKS: one strength to keep (max two lines)
ONE-LINE SUMMARY: …
```

---

## Credits to add if these are adopted

| Source | Licence | Notice needed |
|---|---|---|
| kaankiziltug/logo-design-skill | MIT | Yes; do not copy the logo library (trademarks) |
| neonwatty/logo-designer-skill | MIT | Yes |
| rampstackco/claude-skills | MIT | Yes |
| vip999611-ai/Design-review-skill | Apache-2.0 | Apache notice, mark as modified |
| Thecsiz/tastemaker | MIT + CC-BY-4.0 (KB) | MIT notice; CC-BY attribution for KB-derived text |
| Owl-Listener/designer-skills | MIT | Yes |
| anthropics/skills (canvas-design, theme-factory) | Apache-2.0 | Apache notice |
| anthropics/knowledge-work-plugins (design) | Apache-2.0 | Apache notice |
| Ilm-Alan/frontend-design | MIT | Yes |
| buttonsprite/visual-direction-moodboard | MIT | Yes |
| mattpocock/skills (grilling) | MIT | Yes |
| julianoczkowski/designer-skills | Apache-2.0 | Apache notice |
| abdiraimov-otabek/dashboard-design-skill | MIT | Yes |
| ziguishian/brand-design-skill, senlindesign/taste-skill, jaytel0/taste, guoyuhan1220/critique-design | none | Paraphrase only: ideas, no text or code |

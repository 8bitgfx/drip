# Drip quality plan (from the 2026-11-24 test run)

Evidence used:
- **The Steppy test run.**
  - A real `/drip:design` in Claude Code with Drip 0.6.2, "decide for me", run in a separate session.
  - Its log, debrief and screenshots are in `C:\Dev\drip-test-steppy\`.
  - Result: 6/10 by its own rating; the critic's last verdict was REVISE at about 72/100.
- **The user's Steppy page from a real session:**
  - an over-tight condensed headline;
  - a spec table jammed over the product;
  - debug-looking dimension lines;
  - a wireframe grid;
  - a primitive-built 3D walker.
- **Two vizzbees redesign sessions:**
  - a bot-check page and a cookie wall studied as references;
  - a burger page picked for a Roblox AI tool;
  - a fake-bold, unreadable comp.
- **The skills comparison:** `docs/research/2026-11-24-skills-comparison.md` covers ten other design skills and measures Drip's context use.

## Why Drip's output is weak (ranked)

1. **No route to a good picture when the product has no photos.**
   - Drip's imagery assumes software screenshots, stock photos or generation keys.
   - For a physical product without material the agent hand-draws SVG (a clip-art result) or builds primitives (the user's Steppy).
   - Nothing tells it how to draw a product properly, and nothing asks for the CAD and sketches the user certainly has.
2. **Directions are one idea in two colourways.**
   - The `board_directions` schema (palette, two faces, layout enum) invites variations, not different ideas.
   - The critic ranks the agent's first guess against its own variation.
   - In the test run the critic said so itself: "same drawing with a recoloured ground".
3. **The agent spends its budget on process, not design.**
   - About 60% of the test run's context was Drip output: fit-check screenshots are about 25-30% on their own, and the playbook came in twice.
   - `drip_start` is 15.5k characters, the guides average 13.5k, and the agent carries 40-70k before its first line of CSS.
   - The simpler skills cost 9-13k in total and leave the model room to think.
4. **The rules contradict each other, and the agent obeys whichever it read last.**
   - The landing guide and the playbook disagree on display weight (400-600 vs 300/800 extremes), h2 size (40-48 vs 56) and gutter (24 vs 32).
   - `fonts_pair` ranks Geist first while rule 10 bans it.
   - The `comp` template and the board page ship Fraunces on cream, the default rule 10 refuses.
   - "Committed or Drenched" colour is forced on every brief.
   - The fixed 127 px display scale gives every page the same shout.
5. **No pictures of good work anywhere.** Every rule is prose; the model's taste comes from whatever it invents. Hallmark, Taste and Stageshow ship examples.
6. **References are still noisy.**
   - The 0.6.2 overlay clearing missed Bugaboo's cookie wall and the geo banners on Nuna and VanMoof.
   - VanMoof's "screen 2" was its footer.
   - One Page Love errors on every call (`too_big, maximum 10`).
   - The competitor role accepts any brand site, even when none is the same product type.
   - Search results mix in AI-SaaS shots for any query with "landing page".
7. **The gates are blind or wrong in places.**
   - The hero gate passes an h1 half out of the first viewport and a CTA clipped at the edge.
   - Size counts read SVG `font-size` attributes, not rendered sizes.
   - The critic and fit-check sampling skips sections (desktop jumps from y 1800 to 3600).
   - Steps have no press-and-hold.
   - The Stop hook raises false "changed" alarms for files written by scripts, including while a background critic runs.
   - `drip_status` ticks "critic ranked" on a REVISE.
   - The round limit has no way out when the user said "decide for me".
8. **`fitcheck_compare` answers the wrong question.** It sets the build beside the references, not beside the chosen comp.
9. **Setup is incomplete.**
   - Nothing installs or checks Chrome/Edge (every visual step needs it), MockStudio or Blender at install time.
   - Other hosts check only Node, the bundle and the hook files.

## The plan

### Phase 1: make the agent design, not comply (biggest effect)
- **Two-tier playbook.**
  - `drip_start` returns a floor of at most 5k characters: the bar, the order, 12 non-negotiables.
  - The rest loads per step (`drip_guide` sections).
  - `board_choose` no longer repeats the build half.
  - Files: `skills/drip/playbook.md`, `mcp/src/modules/workflow.mjs`, `board/index.mjs`.
- **One source of truth for numbers.**
  - The landing, layout and type guides reference the playbook's roles and never restate different values.
  - A test fails when two guides state different values for the same token.
  - Files: `skills/*/guide.md`, `mcp/test/skills.test.mjs`.
- **"The brief wins"** over colour strategy, scale and density. The display scale follows the page's job: persuade, experience or document.
  - Files: `playbook.md`, `kit/base.css` (a clamp per mode), `cdp.mjs` judge.
- **Directions differ in idea, not paint.**
  - `board_directions` requires per direction: the idea in one line, what it refuses that the other one keeps, and the references it builds on (at least one style and one page reference).
  - The critic ranks "different idea?" first and rejects a recoloured twin.
  - The agent writes three ideas; the critic picks two.
  - Files: `board/index.mjs` schema, `agents/critic.md`, `critic/index.mjs`.
- **Fix the defaults that break rule 10:** the `comp` template, the board page style, the `fonts_pair` ranking.

### Phase 2: pictures
- **Material first.**
  - Intake always asks one question about material (photos, CAD, sketches, screens), even on "decide for me" when the brief names a product without material.
  - Otherwise the hand-off lists the exact files to send.
  - Files: `workflow.mjs` `intakePlan`.
- **`draw_object`, a technical drawing kit.**
  - A tube and plate spec becomes orthographic or isometric SVG with constant line weights, fillets, hidden and phantom lines, leaders and a title block.
  - A guide `imagery/constructed-drawing` covers the rules and the failure modes: doodle, clip art, box-built.
  - Files: new `mcp/src/modules/studio/drawing.mjs`, `skills/drip-imagery/`.
- **`scene_render` primitives:** a swept tube along a path, a torus wheel and a bent plate, for a credible 3D render of simple products without a glTF.
- **Gold examples.**
  - `examples/gold/`: four to six finished pages (product, SaaS, portfolio, hardware, app), each with screenshots and a one-paragraph "why it works".
  - The critic gets the relevant one as a bar; the agent reads one before its comps.

### Phase 3: references that are worth studying
- **Overlay clearing v2:**
  - geo/country pickers ("Choose your region", "Ship to");
  - full-screen cookie walls by role or text, not only by container name;
  - scroll-lock removal.
  - A screenshot test on Bugaboo, Nuna, VanMoof, Mailchimp and Supercell.
  - "Screen 2" picks the second viewport, never the footer.
- **Bugs:** fix One Page Love's limit (at most 10); `fonts_search` returning 5 of 30.
- **Competitor role:** at least one same-product-type reference. The plan names three real rivals plus the best-designed similar product, using web search when the agent doesn't know.
- **Mix guard:** `refs_search` warns when a style word is in a subject query. "Landing page" searches pull liked shots that match the subject in the title, before generic AI-SaaS.

### Phase 4: gates you can trust, at a lower cost
- **Hero gate:** the h1 and the primary action are both inside the first viewport, and nothing is clipped at the edges.
- **Rendered sizes:** size counts use rendered text, not SVG attributes.
- **Full coverage:** slices cover every section once; the critic gets one shot per section.
- **Cheaper re-checks:**
  - `fitcheck_shot({ numbersOnly: true })` returns blockers and numbers without images;
  - `section: "#id"` shoots one section.
- **Hold step:** steps gain `hold: { selector, ms }`.
- **Changes by file hash:** UI changes are detected by hash, not by writes the hooks saw, so builds made with scripts are fine. The Stop hook passes while a critic subagent is running.
- **The REVISE tick:** `drip_status` and the hooks show REVISE as not passed.
- **"Decide for me" covers one more round:** it authorises one extra critic round and a close with the open points listed.
- **`fitcheck_compare`:** shows the build beside the chosen comp.

### Phase 5: Swarm Mode
The director keeps the decisions and a small context; cheap agents do the reading, shooting and typing.

| Role | Model | Does | Returns to the director |
|---|---|---|---|
| Director | Opus or Fable | brief, thesis, picks references, writes the direction specs, chooses, triages critic fixes, final look | - |
| Scouts (one per role, in parallel) | Haiku | run refs_site / refs_search / refs_gallery for its role, drop bad pages, study the best | top 3 per role: one contact sheet plus a five-line study each |
| Comp makers (one per idea, in parallel) | Sonnet | build each direction's comp from the director's spec | the comp file plus a screenshot |
| Builder | Sonnet | sections from the plan and the system, one at a time | the changed files plus a one-section screenshot |
| Checker | Haiku | fit-check loops in numbersOnly mode, overlay and readability checks | blockers and numbers only; images on request |
| Critic | Sonnet (as now) | independent review | verdict, scores, fixes |

Implementation:
- **Agent definitions:** `agents/scout.md`, `agents/builder.md` and `agents/checker.md`, with model in the frontmatter (as `critic.md` has).
- **Brief tools:**
  - `scout_prepare({ role })` returns the exact prompt, the way `critic_prepare` does.
  - `build_prepare({ section })` hands the builder the plan, DESIGN.md and the section spec.
- **Mode:** `drip_start({ mode: "swarm" })`, or a config default, switches the instructions.
- **Other hosts:** hosts without subagents fall back to the current single-agent loop (documented in HOSTS.md).
- **Gates stay the same:** studies still go through `refs_study` (the scouts call it), so state and roles are recorded as today.

### Phase 6: setup on every host
- **Chrome/Edge check:** `drip install --agent X` and the Claude Code plugin's first `drip_start` check for Chrome or Edge, and say exactly what to install when it's missing, before the first visual step.
- **First-use doctor:** `drip doctor --fix` installs optional pieces with consent: MockStudio, axe-core, svgo. `drip_start` mentions what's missing once per machine.
- **Doctor in the host check:** host `doctor` runs the full `drip doctor` checks, not just Node and the bundle.

## How to test (before and after every phase)
- **Three fixed briefs, each run as a separate session with "decide for me":**
  - a hardware product with no photos (Steppy);
  - an AI tool redesign (vizzbees);
  - a SaaS landing page.
- **What to record:**
  - context characters before the first CSS;
  - number of tool calls;
  - minutes;
  - the critic's last score;
  - the agent's own score;
  - a blind A/B against the previous version by a fresh Sonnet judge looking only at the screenshots.
- **Pass bar:** better or equal on all three briefs, and fewer characters before the first CSS.

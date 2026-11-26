# Adapt: turning Drip into a niche specialist

A good niche pack makes Drip design like someone who has shipped in that niche for years. It knows the hard
constraints before the taste (Roblox's top-bar inset and thumbstick zones, Apple's 44pt targets, a checkout's
trust signals), it can name the 10-20 people and studios whose work defines the top end and say what each does
that others don't, it holds numbered defaults you could check on a screenshot, and it knows which conventions to
honour and which to break. Its critic rubric would fail a generic design that would pass anywhere else. The test
of a pack: run the same brief with and without it, and the pack's version should be obviously from the niche,
and better.

A pack is not a list of adjectives, a style preset, or the first page of search results rewritten. If a rule
would be equally true for any niche, it doesn't belong.

## Where packs live and how they're used

- `pack_create` writes `~/.drip/packs/<id>/` (personal) or, with `shared: true`, `<project>/.drip/packs/<id>/`
  (committed and shared with the team; it wins over a personal one).
- Files: `guide.md`, `genres.md`, `artists.md`, `queries.md`, `critic.md`, `sources.md`, `refs.json`,
  `slop.json`, `catalogue.json`. `guide.md` and `critic.md` are required.
- `drip_start` activates a pack when one of its `keywords` appears in a task, makes its guides required reading
  (`drip_guide` with topics "pack:<id>", "pack:<id>/genres" …), adds its slop rules to `fitcheck_lint`, and the critic judges
  with its rubric. So **keywords matter**: include the niche's own words, abbreviations and product names
  ("roblox", "rbx", "obby", "simulator ui"), not generic ones ("game" would hijack every game task).

### Project style packs and workflows

`pack_create({ type: "project" })` makes this project's own pack (`.drip/packs/project-style`, committed with the project, applies to every design task here with no keywords). `style_update` fills its `guide.md` and `critic.md` from the approved decisions; a file you edited by hand is left alone. `workflow: { stages: [{ id, title, requires, gate, criteria }], criteria }` adds declarative stages (a `gate` names an existing Drip gate: brief, references, direction, critic, system, hero, fitcheck, user). It is versioned (a change bumps `workflowVersion`, the old one is kept) and data only: `command`, `script` and the like are rejected. Existing packs are unchanged.

## The procedure

1. **Check what exists.** `pack_list`. If the niche has a pack, `pack_show` it and switch to refresh (step 12).
   Read the project too: if it's a product in the niche, its code and assets are evidence.
2. **Intake** (AskUserQuestion, one round, ≤ 4 questions, recommendation first, "Other" open):
   - **Which part of the niche?** Options built from the niche: for Roblox, "In-game HUD", "Shops and menus",
     "Lobby and onboarding", "Thumbnails and icons". A pack for one part beats a vague pack for all of it.
   - **Whose work do you admire?** Products, studios, people; links welcome. And anything they dislike.
   - **Platforms and constraints**: devices, engines, frameworks, markets, accessibility needs.
   - **Sources you can open for me**: "Pinterest boards", "an X list", "a Discord", "Figma files", "none, use
     public sources". This decides the access step.
   Record the answers at the top of `sources.md`.
3. **Hard constraints and official standards.** Platform guidelines, engine limits, legal and store rules,
   accessibility. These become defaults first, because taste can't break them. (`drip_guide adapt/research`.)
4. **References.** Map the niche with the refs tools: 3+ keyword angles, tag paging, related tags, popular
   feeds, 3+ designers. Pick 12-20, study 8-12 closely with `refs_study`. Collect the queries that returned good
   work for `queries.md`.
5. **Shipped products.** Galleries and Dribbble show the ideas and the ambition; shipped work shows the real sizes. Open 8-15 real products in the browser,
   screenshot their key screens, and note what ships versus what only exists in shots.
6. **Artists and studios.** Find the 10-20 that define the top end. For each: what they do that others don't, in
   one concrete line, plus 1-3 links.
7. **Public skills to fuse.** Search skills.sh and GitHub for the niche. Read the ones with substance, check each
   licence, and take ideas (permissive: adapt with credit; none: ideas only).
8. **Access** for sources behind logins, if the user offered any (`drip_guide adapt/access`). Never passwords or codes, never scraping, follow site terms.
9. **Write the pack** with `pack_create` and `pack_write`, file by file, using the fixed skeleton
   (`drip_guide adapt/pack-skeleton`). Run the swap test on every rule as you write it.
10. **Critic review.** `critic_prepare({ kind: "pack", targets: ["<id>"] })` → Agent `drip:critic` with the
    prompt unchanged → `critic_record`. Rework what it calls generic, wrong or unsourced. Up to 3 rounds; stop
    when it no longer calls the pack generic.
11. **Test on a sample brief.** Write a realistic brief in the niche (using a keyword), `drip_start` it, confirm
    the pack is active (`drip_status`), and run through directions or a small build. Have the critic compare it
    blind with the same brief done by plain Drip. Fix what the test exposes.
12. **Report, and refresh later.** Hand-off in a few lines: what the pack covers, the leading words, 3 defaults
    that will change Drip's output most, the critic's last verdict, what's marked "verify". Refresh with
    `/drip:adapt <niche> --refresh`.

## The craft

### Research depth, in numbers

| Step | Minimum | Good |
|---|---|---|
| Official sources | 2 (platform + accessibility) | 4-6, each linked with date checked |
| Studied refs (`refs_study`) | 8 from 3+ designers | 12-20 from 6+ designers |
| Shipped products seen in the browser | 6 | 10-15, with screenshots of the key screens |
| Artists and studios | 10 | 15-20 |
| Public skills read | 3 searched | every relevant one, licence checked |
| Numbered defaults | 15 | 20-30 |

- **Do** prefer the official source over a blog's summary of it. A rule from a guideline is evidence; a rule from
  a Medium post is opinion.
- **Don't** let one source define the niche. Dribbble over-represents concepts that never shipped: take their ideas,
  and note in the study when a size or density only works in a shot.

### The fixed skeleton

| File | Holds |
|---|---|
| `guide.md` | Leading words · what good looks like · hard constraints · category conventions (4 lists) · numbered defaults · forbidden list · critique order · Done when |
| `genres.md` | 3-6 directions native to the niche, each with tokens and "breaks if" lines |
| `artists.md` | 10-20 people and studios, what each does that others don't, links |
| `queries.md` | Search terms that worked, per tool, plus ones that returned junk |
| `critic.md` | Extra rubric: niche axes, fatal flaws, caps, the questions a niche expert asks |
| `slop.json` | Regex rules for the niche's amateur tells in code, in Drip's slop format |
| `refs.json` | 10-30 curated references with study notes |
| `catalogue.json` | Niche kits, libraries, fonts, icon sets, with licences |
| `sources.md` | Intake answers, every source with licence and date, credits, what's "verify" |

Full skeleton and a worked Roblox UI example: `drip_guide adapt/pack-skeleton`.

### Leading words

5-6 named qualities that every rule ties back to, each with one line of meaning in this niche. They replace a
rulebook as the pack's memory. "Readable at thumb distance" ties to a text-size default; "Juicy" ties to a
feedback-animation default.
- **Do** make them specific enough to rule things out: "Chunky" rules out hairlines.
- **Don't** use words that fit everything: "clean", "modern", "intuitive", "premium".

### Category conventions in four lists

1. **Defaults that work**: the proven patterns people expect (a bottom tab bar in a mobile shop; a currency
   counter top-right in a game HUD).
2. **Conventions to honour**: what tells people "this is X" and builds trust (prices next to buy buttons;
   legal disclosures in fintech).
3. **Conventions to break** for positioning: the ones that make everyone look alike, each with why breaking it
   helps here.
4. **Clichés**: the niche's visual tropes that make work invisible.

### Numbered, testable defaults and the forbidden list

Write 15-30 defaults, numbered, each checkable on a screenshot or in code: a size, a ratio, a count, a position,
a timing. Group them (layout, type, colour, components, motion, content). End with a **forbidden list** of 8-15
items. Each default either comes from a hard constraint (cite it) or from the studied best work (cite the refs).

| Generic (cut) | Testable (keep) |
|---|---|
| "Use clear typography" | "HUD numbers ≥ 24px at 1080p, bold, with a 2-3px dark stroke or shadow plate" |
| "Make buttons easy to tap" | "Primary buttons ≥ 64px tall on phones; nothing interactive in the bottom-left 35% × 40% (thumbstick)" |
| "Keep it premium" | "Product photos fill ≥ 60% of the card; prices in the text face, never bold red" |

### The critic rubric

`critic.md` adds to Drip's critic: 2-4 niche axes with weights, the niche's fatal flaws (what makes an expert
reject work on sight), score caps, and the questions an expert asks in the first 3 seconds. Fatal flaws cap the
score just like the base rubric's S0.

### Critique order ranked by harm

Every pack states the order in which problems hurt in this niche. For a dashboard: honesty → salience →
hierarchy → text → component smells → polish. For game UI: readability in play → input fit → feedback → style.
The critic follows it.

## Slop tells for packs (and the fix)

| Tell | Fix |
|---|---|
| Rules that pass the swap test ("use whitespace", "be consistent") | Cut, or make it niche-specific with a number |
| Adjective leading words ("clean, modern, sleek") | Words that rule things out, each tied to defaults |
| Artists listed with no "what they do that others don't" | One concrete line each, or drop them |
| Standards paraphrased from memory, no link | Official source linked, date checked, or marked "verify" |
| References all from one source | Mix galleries and Dribbble (ideas) with shipped products (sizes) |
| Copied text from a public skill or guideline | Rewrite in Drip's voice; credit; no-licence sources as ideas only |
| A style preset ("use these 3 colours") | Defaults about roles and ratios; palettes belong to genres |
| Keywords that hijack other tasks ("app", "game", "shop") | Niche-specific words only |
| Private material in a shared pack | Personal pack, or summarise without identifying details |

## Done when
- [ ] `pack_list` checked; intake answered in one round and recorded in `sources.md`.
- [ ] Hard constraints researched from official sources, each linked or marked "verify".
- [ ] 8+ refs studied, 6+ shipped products seen, 10+ artists with one concrete line each.
- [ ] Public skills searched; licences checked; credits in `sources.md`.
- [ ] All nine files written in the skeleton; `slop.json`, `refs.json` and `catalogue.json` valid JSON.
- [ ] Every default is testable; ≥ 70% of rules fail the swap test; a forbidden list exists.
- [ ] The critic no longer calls the pack generic (≤ 3 rounds), its verdict recorded.
- [ ] A sample brief activated the pack and beat plain Drip in a blind critic comparison.
- [ ] Reported to the user in a few lines, with what's marked "verify".

## Reference files
- `drip_guide adapt/research` — research order, what to look for in each step, search recipes, licence checks, refresh
- `drip_guide adapt/pack-skeleton` — every pack file's skeleton, with a full worked example for Roblox UI
- `drip_guide adapt/access` — sources behind logins, Claude in Chrome, pasted links, site terms, privacy

## Sources
- dashboard-design skill by abdiraimov-otabek (MIT): the shape of a niche skill (leading words instead of a
  rulebook, "Done when" per step, critique order ranked by harm, numbers you can lint, sources in references).
- rampstackco/claude-skills (MIT): category conventions in four lists (defaults that work, conventions to honour,
  conventions to break for positioning, clichés).
- jaytel0/taste (no licence, ideas only): studied references distilled into numbered, testable defaults plus a
  forbidden list.
- mattpocock/skills grilling (MIT): ask only what can't be looked up; recommended answers first.
- Drip's research notes (`docs/research/public-skills-2026-11.md`, item 14).

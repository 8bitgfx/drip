# Drip: plan

> **Drip** gives Claude drip: taste, references and a designer's process, so its UI stops looking AI-made.
> It does that for coding agents: before Claude writes UI, it studies references, builds a moodboard, picks a direction and a system, and only then designs, the way a real designer works.

Status: plan only, nothing built. Things marked **(verified)** were tested from this machine on 2026-11-23; **(to check)** means not tested yet.

---

## 1. What it is

One **Claude Code plugin** containing four parts that work together:

| Part | Job |
|---|---|
| **21 skills** (`drip` + `drip-*`) | The designer's brain: a director skill that runs the process, plus one skill per craft (colour, type, layout, motion, imagery, copy, fit check…), each with deep guides. Plus shared rules and data. |
| **MCP servers** | The designer's hands: our own `drip` server (references, moodboards, assets, image generation, fit check) plus the best existing MCPs wired in (shadcn, 21st.dev, Playwright, Context7, Figma). |
| **Hooks** | The discipline: makes sure the process actually happens (no UI written before references and a direction exist). |
| **Commands** | Shortcuts: `/drip`, `/drip refs`, `/drip board`, `/drip critique`, `/drip keys`… |

Why a plugin: one install gives all four, it works in every project, and a skill alone can't search the web or force anything; an MCP alone has no taste. Together: tools for the work, a skill for the judgement, hooks for the discipline.

The moodboard skill (`drip-moodboard`) is one of the 21 and can also be used on its own.

---

## 2. How Claude works with Drip: the designer loop

The skill teaches this exact order. Each step says **what to do, which tools, what to read**.

| # | Step | What happens | Tools | Reads |
|---|---|---|---|---|
| 1 | **Brief** | Who is it for, what must it make them feel/do, what mode is the surface (sell / operate / read / play), constraints, existing brand. Ask the user at most 3 questions; otherwise infer and state assumptions. | — | `process/brief.md` |
| 2 | **Look around** | Read the project: existing tokens, components, fonts, stack. Never redesign what already has a system without saying so. | `project.scan` | — |
| 3 | **References (forced)** | Search 3+ queries across 2+ sources, scan contact sheets of 50–150 shots, pick 8–15 to study, open them full size, write *what* each one does well (layout, type, colour, density, motion), never "nice". | `refs.search`, `refs.tag`, `refs.sheet`, `refs.shot`, `refs.view` | `process/references.md` |
| 4 | **Moodboard** | Put the picks on a board with notes, cluster them into 2–3 **directions**, each with a name, palette, type pairing, and 3 adjectives. | `board.*` | `drip-moodboard` skill |
| 5 | **Pick a direction** | Present the directions (board link + one line each). User picks, or Claude picks with a reason if told to proceed alone. | `board.share` | — |
| 6 | **System** | Turn the direction into tokens: OKLCH palette with contrast checked, type scale, spacing, radius, shadow, motion curves. Write `DESIGN.md` in the project. | `palette.*`, `fonts.*`, `tokens.write` | `system/*.md` |
| 7 | **Assets** | Icons (one family only), hero imagery (search, generate, or ask the user), gradients/textures, illustrations or product shots. | `icons.*`, `images.*`, `gen.*`, `gradient.*` | `assets/*.md` |
| 8 | **Build** | Prefer a proven component (shadcn registry or the catalogue) over hand-rolled; restyle it to the system. | `components.*`, shadcn MCP | `build/components.md`, `build/motion.md` |
| 9 | **Critique** | Screenshot at real sizes, place it next to the board, score against the rubric (hierarchy, rhythm, contrast, slop tells, polish details), fix, repeat until it passes. | `critique.shot`, `critique.compare`, `critique.lint` | `critique/rubric.md`, `critique/slop.md` |
| 10 | **Polish** | The invisible details: press states, focus, easing, optical alignment, tabular numbers, empty/loading/error states. | — | `polish/*.md` |

Small tasks get a **short loop**: a button tweak skips 3–6 but still follows the project's `DESIGN.md`. The skill decides the size: *new page / new component / redesign* = full loop; *tweak* = short loop.

---

## 3. The megaskill: what goes in and from where

Pick the best ideas from each source, rewritten in our own words, organised by **when Claude needs them** (not by source). Upstream skills that have unclear licences are **not copied**: we either write our own version or list them as optional companions the installer can add.

| Source | What we take | Licence |
|---|---|---|
| **Impeccable** | The spine: design-director stance, surface modes (persuade/operate/read/experience), critique rubric, `DESIGN.md` convention, sub-commands (polish, quieter, bolder, typeset…) | Apache 2.0, can adapt with attribution |
| **Taste Skill** | Anti-slop rules, "one system / one section per screen", real photos and real product UI, the finish gate in a real browser | none in the installed copy (to check upstream) |
| **Emil Design Eng** | Interaction polish: press/hover, popover origin, tooltip timing, transitions vs keyframes, drag details | none in installed copy (to check) |
| **Make Interfaces Feel Better** | Detail checklist: shadows, borders, radius nesting, optical alignment, icon weight, tabular numbers, font smoothing | none in installed copy (to check) |
| **Stageshow** | Faux product UI for heroes and feature cards: browser/app frames, cursor walkthroughs, bento grids. Becomes the `assets/product-shots.md` step | has LICENSE + NOTICE (to read) |
| **UI UX Pro Max** | Its **data**, not its prose: 194 palettes, 74 font pairings, 141 UX guidelines, styles, chart choices. Served through MCP search instead of loaded into context | none in installed copy (to check) |
| **Vercel Web Design Guidelines** | The audit checklist (a11y, forms, focus, motion-reduce) for the critique step | to check |
| **Animate / Choreograph** | Motion decisions in order (should it move, purpose, property, curve, duration, interruption) and group motion | to check |
| **Anthropic frontend-design** | Aesthetic direction and "don't look templated" typography guidance | LICENSE.txt (to read) |
| **unslop-ui** (felipebasurto) | Copy de-slop: eyebrows, fake numbering, decorative icons, status dots, botsplaining | to check |

**Skill suite: 21 skills, not one file**

Each is its own skill with its own trigger (so Claude loads the right one by itself, even outside the loop), its own `SKILL.md` and a `reference/` folder with the deep guides. `drip` is the director that runs the loop and calls the others.

| Skill | Triggers on | Main guides inside | Built from |
|---|---|---|---|
| `drip` (director) | any new page, screen, component, redesign | the loop, size rule, which skill when, hard rules | Impeccable |
| `drip-brief` | start of any design task | questions to ask, surface modes, audience, assumptions | Impeccable |
| `drip-refs` | "references", "inspiration", step 3 | search strategy, fan-out by tags, how to study a shot, what to write down | ours |
| `drip-moodboard` | "moodboard", step 4 | collect, cluster, name directions, present, read feedback | ours |
| `drip-direction` | choosing a look | visual worlds, style catalogue (from UI UX Pro Max styles), how to make 3 real alternatives | Impeccable, frontend-design, UI UX Pro Max |
| `drip-system` | tokens, DESIGN.md, design system | token structure, naming, DESIGN.md template, theming | Impeccable |
| `drip-color` | palette, colour, dark mode, gradient | OKLCH ramps, contrast, accent discipline, dark mode, mesh gradients, grain | UI UX Pro Max data, ours |
| `drip-type` | fonts, typography, hierarchy | pairing, scales, measure, numerals, variable fonts, loading | Taste, MIFB, UI UX Pro Max pairings |
| `drip-layout` | layout, grid, spacing, responsive | grids, spacing scale, density, composition, breakpoints, above the fold | Taste, Impeccable |
| `drip-landing` | landing / marketing / company site | section anatomy, hero patterns, social proof, pricing, CTA, one section per screen | Taste, Stageshow |
| `drip-app` | dashboards, admin, app UI, tables, charts | density, navigation, data tables, chart choice, empty/loading/error | UI UX Pro Max, Impeccable |
| `drip-mobile` | phone, PWA, native feel | touch targets, safe areas, sheets, gestures, 100vh, tap highlight | mobile-native |
| `drip-components` | building any component | pick a library first, restyle to tokens, the catalogue, registries | ours + catalogue |
| `drip-interaction` | hover, press, focus, popovers, drag | states, origins, timing, feedback | Emil |
| `drip-motion` | animate, transition, stagger | should it move, curves, durations, choreography, performance, reduced motion | animate, choreograph, animation-performance |
| `drip-imagery` | hero image, photos, illustration, 3D | find vs generate vs ask, art-directing prompts, licences, treatment | ours |
| `drip-productshots` | faux UI, product demo, bento, cursor walkthrough | frames, masks, crops, animated demos | Stageshow |
| `drip-icons` | icons | one family, sizes, stroke weight, optical alignment, when not to use icons | MIFB, ours |
| `drip-copy` | UI text, headlines, microcopy | voice, de-slop (eyebrows, fake numbers, botsplaining), labels, errors | unslop-ui, Taste |
| `drip-a11y` | accessibility | contrast, focus, keyboard, ARIA, forms, motion-reduce | Vercel guidelines |
| `drip-fitcheck` | critique, review, "does this look good" | rubric, screenshot routine, compare with board, scoring, fix list | Impeccable, Taste finish gate, Vercel guidelines |
| `drip-polish` | final pass | the details checklist: shadows, borders, radius nesting, tabular numbers, states | MIFB, Emil |

**Rules (one folder, read by every skill and enforced by tools/hooks where possible)**

```
rules/
  hard-rules.md      the 6 non-negotiables (refs before UI, one icon family, contrast, fit check…)
  slop-tells.md      50+ AI-UI tells with a fix for each (purple gradients, emoji icons, glass everywhere,
                     fake stats, "Trusted by" logos with no logos, three equal feature cards, eyebrow overuse…)
  per-surface.md     what changes for landing vs app vs mobile vs docs
  licences.md        what may ship: fonts, images, icons, components
```

**Data (served through the MCP, never loaded whole into context)**

```
data/
  catalogue.json     every library from your posts + the must-haves (~50 entries), with use-when / avoid-when
  palettes.json      UI UX Pro Max palettes + ours
  font-pairs.json    pairings with roles and licences
  styles.json        visual styles with examples and when to use
  patterns.json      section and screen patterns (hero types, pricing, settings, tables…)
  slop.json          machine-readable slop tells for the lint
```

**Hard rules** (in SKILL.md, enforced by tools where possible):
1. No new page or component without references on a board.
2. One icon family, one type pairing, one accent colour unless the direction says otherwise.
3. Prefer a real component library over hand-rolled; prefer real imagery over placeholder boxes.
4. Every colour pair checked for contrast; every interactive element has hover, press, focus, disabled.
5. Never ship before a critique pass on a real screenshot.
6. References are for studying, never copying a design one-to-one.

---

## 4. MCP servers and tools

### The MCP set

| Server | Ours / existing | What for | Needs |
|---|---|---|---|
| **`drip`** | ours | references, moodboards, assets, image generation, fit check (tools below) | nothing; keys optional |
| **shadcn MCP** | existing (official) | browse and install from shadcn and any shadcn-style registry (Magic UI, Kibo, React Bits, Animate UI…) | nothing (to check setup) |
| **21st.dev MCP** | existing | component search and references from 21st.dev | free key; search free, code retrieval metered on free tier |
| **Playwright MCP** | existing (Microsoft) | drive a browser for sites with no endpoints, and for fit-check interactions | nothing |
| **Context7** | existing | up-to-date docs for the libraries Claude installs (Motion, Radix, Tailwind…) | nothing (to check limits) |
| **Figma MCP** | existing (optional) | read your Figma files when a design already exists | Figma account |

Drip's installer sets up the ones you choose. The skills tell Claude which server to use for what, so they never fight over the same job.

### Our `drip` server: modules

One server split into modules you can switch on and off (`refs`, `board`, `components`, `assets`, `gen`, `fitcheck`), so a project that only wants references doesn't load 40 tools.

### References
| Tool | What | Source |
|---|---|---|
| `refs.search(query, sort, category, page)` | Shots for a keyword | Dribbble search **(verified: logged-out gives 84 per query, then repeats)** |
| `refs.tag(tag, page)` | Deep browsing by tag | Dribbble `/tags/{tag}` **(verified: new shots through page 20)** |
| `refs.feed(popular\|recent, category, page)` | Browse by category | **(verified deep paging)** |
| `refs.designer(username, page)` | Everything by a designer Claude liked | **(verified)** |
| `refs.shot(id)` | Title, designer, description, palette, every image/video, views | Embedded JSON on the shot page **(verified)** |
| `refs.view(id, which, size)` | Returns the actual images (resized) so Claude sees them | Dribbble CDN |
| `refs.sheet(ids or query)` | **Contact sheet**: one image of 24–48 numbered thumbnails, so Claude scans a page of results in one look and picks by number | generated locally |
| `refs.related(query)` | Related tags Dribbble shows, to fan a search out | search page |
| later | Godly, Land-book, Siteinspire, Awwwards, Lapa (site references); 21st.dev (component references, needs key) | **(sites live, endpoints to check)**; Mobbin needs login, skipped |

How Dribbble works without an account **(verified)**: the infinite-scroll requests (`X-Requested-With: XMLHttpRequest`) return HTML/JSON to plain HTTP; normal page loads return an empty 202. Keyword search is capped at 84, so the tool fans out through related tags. Polite: ~1 request/second, everything cached locally, no account, never redistribute images.

### Moodboard
| Tool | What |
|---|---|
| `board.create(name, brief)` | New board |
| `board.add(items, note, cluster)` | Add shots/images/colours/fonts with a note on *why* |
| `board.cluster(directions)` | Group items into named directions with palette, type and adjectives |
| `board.share()` | Publish / open the board |
| `board.read()` | What the user moved, starred, deleted or commented on |
| `board.export(png\|md)` | Snapshot for the repo or a PR |

Where the board lives (you prefer artifact or whiteboard):
1. **Claude artifact (default when available):** a published board page with shared state (the artifact database), so you can drag, star and comment and Claude reads it back. Works in the desktop app and claude.ai.
2. **Local board (fallback, always works):** the MCP serves a board page at `localhost:4567` (masonry + clusters + notes), state in `~/.drip/boards/`. Same data, so a board can move between the two.
3. Later: export to tldraw / Excalidraw / FigJam (to check).

### Components
| Tool | What |
|---|---|
| `components.find(need)` | "pricing table with toggle", "animated hero text" → ranked picks from the catalogue with why, licence, free/paid, install command |
| `components.get(library, item)` | Fetches the source from a shadcn-style registry so Claude can install and restyle it |
| `components.catalogue()` | The curated list (below), with what each library is for |

Registries **(verified `/r/registry.json` answers)**: Magic UI, Kibo UI, React Bits, Animate UI. shadcn itself, Aceternity and Motion Primitives use other paths (to check). Also recommend the official **shadcn MCP** alongside.

### Assets
| Tool | What | Source |
|---|---|---|
| `icons.search / icons.get` | 200k+ icons, one family per project, SVG out | Iconify API **(verified, no key)** |
| `fonts.search / fonts.pair` | Fonts with weights/variable/subsets, pairings from the data | Fontsource API **(verified, no key)** + UI UX Pro Max pairings |
| `palette.generate / palette.check` | OKLCH ramps from a seed or a reference image, contrast matrix, dark mode | local code + UI UX Pro Max palettes |
| `palette.from_image(url)` | Extract a palette from a reference shot | local |
| `gradient.mesh / gradient.grain` | Mesh gradients, grain, noise, blobs → CSS, SVG or PNG | local generator |
| `images.search(query, orientation, licence)` | Hero-worthy photos, licence tracked per image | Wikimedia Commons **(verified, no key)**; Unsplash / Pexels / Pixabay (free keys); Openverse (anonymous call returned 403, needs registration) |
| `images.from_web(query)` | Google-style search via the browser, marked "licence unknown, ask before shipping" | Claude in Chrome / built-in browser |
| `images.ask_user()` | Asks for their own photos/brand assets first when the brief has a brand | — |

### Image generation (bring your own provider)
| Tool | What |
|---|---|
| `gen.image(prompt, size, style_ref?)` | Hero art, illustrations, textures, product renders |
| `gen.edit(image, instruction)` | Edit/extend an image |
| `gen.providers()` / `keys.add(provider)` | Which providers are set up; add a key |

- **Defaults:** OpenAI (GPT image) and Google (Gemini image). Adapter interface so any provider is one small file; Claude can write a new adapter when you ask ("add Replicate", "add fal", "add Ideogram").
- **No-key route:** if `codex` or `gemini` CLI is installed and logged in with your subscription, Drip can drive it instead of an API key **(to check what each CLI can generate headless; neither is installed on this machine now)**.
- **Keys:** `/drip keys` opens a small local page to paste a key; stored in the OS keychain (Windows Credential Manager / macOS Keychain), never in the repo or a config file, never printed.
- Every generated image is logged with its prompt and cost.

### Critique
| Tool | What |
|---|---|
| `critique.shot(url, sizes)` | Screenshots at phone/tablet/desktop, light and dark |
| `critique.compare(shot, board)` | Puts the screenshot beside the chosen direction for Claude to judge |
| `critique.lint(files)` | Static slop and polish checks: contrast, off-scale spacing, too many fonts/colours, emoji-as-icons, purple-gradient defaults, fake stats, missing focus/hover states |

---

## 5. Hooks

| Hook | When | Does |
|---|---|---|
| `UserPromptSubmit` | Prompt mentions a page, screen, component, landing, redesign… | Adds a short note: "Design task: follow the drip loop, start with references." |
| `PreToolUse` on Write/Edit | Creating a new UI file (`.tsx/.jsx/.vue/.svelte/.html/.css`) and there's no board for this task | **Blocks** with a message telling Claude to run `refs.search` + `board.create` first. Tweaks to existing files pass. Escape hatch: `/drip skip` or `DRIP_SKIP=1`. |
| `PostToolUse` on Write/Edit | After UI files change | Runs `critique.lint` fast, returns problems as feedback |
| `Stop` | Claude is about to finish and UI files changed this turn | If no critique screenshot was taken, asks for one before ending |

The hooks read a small state file (`.drip/session.json`: board id, direction, critique done) that the MCP writes, so the gate is real and not just a prompt.

---

## 6. Component and asset catalogue (curated, ships as data)

**Foundations:** shadcn/ui, Radix Primitives, Base UI, React Aria, Ark UI, Headless UI, coss ui (Cal.com).
**Motion and effects:** Motion (Framer), Motion Primitives, Animate UI, React Bits, Magic UI, Aceternity UI, Cult UI, GSAP, Lenis.
**Complex parts:** Kibo UI (tables, dropzones, AI inputs), cmdk, Vaul, Sonner, TanStack Table, Tremor / Recharts.
**Micro-interactions and feel:** Bencho, Tactile UI.
**Blocks and sections:** Preline, 21st.dev, Libraries.dev (directory), Arc UI, BeUI Pro, Board UI, Affect UI, Kobra Systems, UI Watermelon, Clover UI, spell.sh, ui-sdk, HorizonX.
**Texture and gradients:** Grainient, mesh gradient generator (ours), ShaderGradient (to check).
**AI design helpers:** uberdesigner (to check what it is).
**Icons (through Iconify):** Lucide, Phosphor, Tabler, Heroicons, Radix Icons, Iconoir, Hugeicons, Remix, Material Symbols.
**Fonts:** Fontsource (all Google + open fonts).
**Photos:** Unsplash, Pexels, Pixabay, Wikimedia Commons, Openverse.

All the sites from your posts answered HTTP 200 **(verified)**; whether each is free, paid or has a registry is **(to check)** and goes in the catalogue entry. Each entry: name, URL, what it's for, free/paid, licence, install method, "use when", "avoid when".

---

## 7. Architecture

```
drip/                         (one GitHub repo, MIT)
  .claude-plugin/plugin.json   plugin manifest: skills, MCP server, hooks, commands
  skills/drip/ + skills/drip-*/   the 21 skills (section 3), each SKILL.md + reference/
  rules/                          shared rules

  commands/                    /drip, /drip refs, /drip board, /drip critique, /drip keys
  hooks/                       hooks.json + small node scripts
  mcp/                         TypeScript MCP server (stdio)
    sources/   dribbble.ts  godly.ts  landbook.ts ...    one file per reference source
    assets/    iconify.ts  fontsource.ts  images/*.ts  palette.ts  gradient.ts
    gen/       openai.ts  gemini.ts  cli-codex.ts  cli-gemini.ts   (provider adapters)
    board/     store.ts  artifact.ts  local-server.ts
    critique/  screenshot.ts (Playwright)  lint.ts
    sheet.ts   contact sheets (sharp)
    cache.ts   SQLite cache + polite rate limiter
  data/        catalogue.json, palettes, font pairings, guidelines (from UI UX Pro Max, licence permitting)
  site/        the GitHub page
~/.drip/      local: cache, boards, generated images, cost log (keys in OS keychain)
```

- Node 22+, TypeScript, official MCP SDK, `sharp` for images, Playwright for screenshots, built-in SQLite for the cache.
- Every source is a small adapter with the same shape (`search`, `page`, `detail`, `images`), so adding Behance or Pinterest later is one file.
- Images reach Claude as MCP image content, downscaled, so studying 15 shots doesn't blow the context.

---

## 8. Build order

| Phase | Ships | Done when |
|---|---|---|
| **P0: References** | MCP with Dribbble (search, tag, feed, designer, shot, view, contact sheet), cache, rate limit | Claude finds and studies 15 refs for "fintech dashboard" in one go |
| **P1: Board + core skills** | Local board + artifact board; `drip`, `drip-brief`, `drip-refs`, `drip-moodboard`, `drip-direction`, `rules/` | A new landing page goes brief → refs → board with 3 directions → user picks |
| **P2: Discipline + craft skills** | Hooks, `/drip` commands, `critique.shot` + `lint`; the remaining 16 craft skills, written and tested one family at a time (system/colour/type/layout → landing/app/mobile → components/interaction/motion → imagery/productshots/icons/copy → a11y/fitcheck/polish) | Claude can't write a new page without a board, and ends with a screenshot critique |
| **P3: Assets** | Icons, fonts, palettes, gradients, photo search | A page ships with real icons, a checked palette, a proper font pairing and a real hero image |
| **P4: Generation** | OpenAI + Gemini adapters, keys page, CLI route, cost log | "Make a hero illustration in the board's style" works with your key |
| **P5: Components** | Catalogue, registries, `components.find/get`, 21st.dev optional | Claude installs a Kibo table and restyles it to the tokens |
| **P6: More sources + launch** | Godly, Land-book, Siteinspire; GitHub page; README; demo video | Public repo with a page people want to star |

Test each phase on 3 real briefs (a SaaS landing page, a dashboard, a mobile app screen) and keep the before/after screenshots in the repo.

---

## 9. Name and look (for the GitHub page)

**Name: Drip.** Slang for style ("he's got drip"), one syllable, funny, easy to remember. Commands read well: `/drip refs`, `/drip board`, and the critique step is a **fit check** (`/drip fitcheck`). Runners-up: **Rizz** (UI rizz), **Glowup** (before/after built into the name). Check npm, GitHub and domain availability before publishing (not done).

**Tagline:** *Give Claude drip.* Alt: *Your UI is mid. Fix it.*

**Look of the page**
- **Surface:** warm chalk white (`#F4F1EA`), ink near-black (`#16140F`), one accent: cadmium vermilion (`#E8452C`) that drips from the logo down the page as you scroll. Dark mode is charcoal with the same vermilion.
- **Type:** a sharp display serif for headlines (e.g. Instrument Serif or PP Editorial) against a clean grotesk for text (Geist / Inter Display) and a mono for tool names.
- **Hero:** a live moodboard assembling itself: Dribbble-style shots fly in, cluster into three directions, then one direction turns into a real UI on screen. That is the product in one animation (built with Stageshow-style faux UI).
- **Sections:** The loop (10 steps as a horizontal strip) · Before/after (same prompt, plain Claude vs Drip) · The tools (grid of tool cards, each with a tiny live demo) · The catalogue · Install in one line.
- **Logo:** the word "drip" in the display serif with a single vermilion paint drip running off the "p".

---

## 10. Risks and rules

- **Dribbble terms:** automated access is likely against them. Personal reference use, slow requests, cache, never redistribute images, credit designers on the board. If Dribbble blocks plain HTTP, fall back to the browser route.
- **Licences:** only copy skill text with a permissive licence (Impeccable is Apache 2.0); everything else is rewritten or listed as an optional companion.
- **Images:** every image on a board carries its source and licence; "unknown" ones are flagged before anything ships.
- **Keys:** OS keychain only, never logged, never in the repo.
- **Context cost:** contact sheets and downscaled images, and reference files loaded only on demand.

---

## 11. Decisions for you

1. Name: Drip (runners-up Rizz, Glowup)?
2. Its own repo (e.g. `C:\Dev\drip`, public on GitHub) and installed for all your projects?
3. Start with P0 (Dribbble MCP) now, or P0 + P1 together?
4. Which image providers first: OpenAI + Gemini via keys, or try the Codex/Gemini CLI route first?

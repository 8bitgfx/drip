<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.png">
    <img alt="drip" src="assets/brand/wordmark-light.png" width="300">
  </picture>
</p>

<p align="center"><b>Give Claude drip.</b><br>A design director for Claude Code: real references, moodboards, design systems and fit checks, so your UI stops looking AI-made.</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-16140F?style=flat-square"></a>
  <img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude_Code-plugin-E8452C?style=flat-square">
  <img alt="No API key needed" src="https://img.shields.io/badge/API_key-not_needed-16140F?style=flat-square">
  <img alt="Version" src="https://img.shields.io/badge/version-0.2.0-16140F?style=flat-square">
</p>

---

## Quickstart

```text
/plugin marketplace add 8bitgfx/drip
/plugin install drip@drip-design
```

Restart Claude Code (or run `/reload-plugins`), then:

```text
/drip:start a pricing page for our dev-tools SaaS
```

That's it. Claude researches references on Dribbble, builds a moodboard with 2–3 directions for you to pick from, writes a design system, builds with real components and checks its own work on screenshots before it hands back.

## Why

Ask an agent for a landing page and you get the same page everyone gets: a purple gradient, a centred headline, three icon cards, "Unlock seamless growth". Not because the model can't design, but because it skips everything a designer does before touching code.

Drip makes it do those steps, and gives it the tools to do them well.

| A designer… | Drip gives Claude |
|---|---|
| looks at what good work in the space looks like | **Dribbble search without an account**: keywords, tags, feeds, designers, contact sheets of 48 shots, full-size study |
| collects references and picks a direction with the client | **Moodboards** you can open, star and annotate, with 2–3 genuinely different directions |
| writes the system down before building | **Palettes** (OKLCH, contrast-checked), **font pairings** with specimens, a `DESIGN.md` |
| uses proven parts | **3,700+ components** from shadcn, coss ui, Kibo UI, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI, Cult UI, plus 500+ registries |
| sources real assets | **200k icons**, every open font, **photos with licences**, **mesh gradients** and grain, **image generation** with your own OpenAI or Gemini key |
| checks the work with fresh eyes | **Fit checks**: phone and desktop screenshots, side by side with the chosen direction, a slop lint and an honest 8-axis score |

Behind it are 22 skills fusing the best design guidance out there (Impeccable, Taste Skill, Emil Kowalski, Make Interfaces Feel Better, UI UX Pro Max, Hallmark, unslop-ui, Stageshow and more), rewritten into one voice and organised by craft. See [CREDITS.md](CREDITS.md).

## Commands

| | |
|---|---|
| `/drip:start <what>` | Design something: a new page, a component, a redesign, or a polish pass |
| `/drip:refs <subject>` | Find and study references |
| `/drip:board <what>` | Build a moodboard with directions |
| `/drip:fitcheck <url>` | Screenshot, compare, score and fix a page |
| `/drip:status` | Where the current task stands |
| `/drip:keys` | Add optional API keys (in a local page, never in chat) |
| `/drip:skip` | Turn the checks off for the current task |

The craft skills (colour, type, layout, motion, copy, accessibility and the rest) don't clutter the menu. Claude loads them on its own when the work needs them.

## How it stays honest

Agents skim instructions. Drip doesn't rely on them reading:

- **Guides arrive through a tool.** The detailed guides come from `drip_guide`, which records the read. "I read the skill" becomes checkable.
- **Gates.** During a Drip task, writing a UI file is blocked until the required guides are read, references are studied and a direction is chosen. The block message names the exact next call.
- **Lint on every edit.** Each UI edit is scanned for slop tells (AI gradients, emoji icons, filler copy, removed focus rings, `transition: all`…) and the problems go straight back to Claude.
- **No finishing blind.** After changing UI, Claude can't end its turn until it has screenshotted and scored the result. It gives up after three tries, so you never get stuck.

**Opt-in by default.** All of this applies only while a Drip task is running (`/drip:start`). The rest of the time Drip stays out of your way: no blocking, no nudges. Teams that want it on every UI change can set `"gates": { "mode": "always" }` in `.drip/config.json`.

## Requirements

- Claude Code with plugin support
- Node.js 20+
- Chrome or Edge, for screenshots and previews (optional but strongly recommended)
- No API keys for the core. Optional keys: OpenAI or Gemini (image generation), Unsplash or Pexels (better photo search)

## Configuration

Everything is plain files: gates and thresholds, which files count as UI, your own slop rules, your own component registries, custom image providers. See [docs/CUSTOMISE.md](docs/CUSTOMISE.md).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Claude says the Drip tools aren't available | Run `/mcp` and check `plugin:drip:drip` is connected; reconnect it if not. Claude Code loads plugin tools lazily, so Drip's skills tell Claude the exact names to load. |
| Dribbble results stop or `refs_view` shows only the cover image | Dribbble rate-limits shot pages. Drip backs off and falls back to the image; wait a minute between heavy research runs. |
| No screenshots or previews | Install Chrome or Edge, or set `fitcheck.chromePath` in `.drip/config.json`. |
| Drip blocked a write you wanted | `/drip:status` shows what's missing. `/drip:skip` turns the checks off for the current task. |

## Under the hood

`skills/` holds the guides (Markdown). `rules/` holds the shared rules. `data/` has the catalogue, font pairings and slop rules. `mcp/` is the server, bundled into one file so it runs with plain `node`, with no install step. `hooks/` has small Node scripts. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

References are for studying, never copying: Drip keeps credits on every board, logs licences for every asset it saves, and keeps its Dribbble traffic slow and cached.

## Licence

MIT. Drip's guides adapt MIT and Apache-2.0 sources with credit; see [CREDITS.md](CREDITS.md).

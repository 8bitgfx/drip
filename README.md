# Drip

**Give Claude drip.** A Claude Code plugin that makes coding agents design like a real product designer instead of shipping the same AI-looking template every time.

Drip fuses the best design skills out there (Impeccable, Taste Skill, Emil Kowalski's design engineering, Make Interfaces Feel Better, UI UX Pro Max, Hallmark, unslop-ui and more) into **one suite of 22 skills**, adds an **MCP server** with the tools a designer actually uses (Dribbble references, moodboards, palettes, fonts, icons, photos, image generation, component registries, screenshot critiques), and **hooks that enforce the process**, because agents skim instructions and skip steps.

> Status: early (0.1). Works end to end; expect rough edges.

## What happens when you ask for UI

```
you: "build a pricing page for our dev-tools SaaS"

Claude → drip_start                      full loop, reads the guides it must read
       → refs_search / refs_tag / refs_view   scans ~150 Dribbble shots, studies 10 full size
       → board_create / board_add / board_directions
       → board_open                     a moodboard with 3 directions, for you to pick
you:   "Terminal Calm"
Claude → board_choose → palette_generate → fonts_pair → DESIGN.md + tokens
       → components_find (Kibo / shadcn / Magic UI…) → builds, restyled to the tokens
       → fitcheck_shot (phone + desktop) → fitcheck_compare → fixes → fitcheck_done
```

Try to skip a step and the hooks say no:

- **Writing a new UI file** before the guides are read, references studied and a direction chosen → blocked, with the exact next call.
- **A visual edit** with no Drip task → blocked until `drip_start`.
- **Ending the turn** after UI changes without a fit check → blocked (gives up after 3 tries so you never get stuck).
- **Every UI edit** is scanned for slop tells (purple gradients, emoji icons, filler copy, removed focus rings…) and the problems go straight back to Claude.

## Install

In Claude Code:

```
/plugin marketplace add 8bitgfx/drip
/plugin install drip@drip-design
```

Requirements: Node 20+. Chrome or Edge (for screenshots and previews; optional but strongly recommended). No API keys needed for the core.

Optional keys (pasted into a local page with `/drip:keys`, never into chat): OpenAI or Gemini for image generation, Unsplash or Pexels for better photo search.

## Commands

| Command | Does |
|---|---|
| `/drip:start <what>` | Start a design task |
| `/drip:refs <subject>` | Gather and study references |
| `/drip:board <what>` | Build a moodboard with directions |
| `/drip:fitcheck <url>` | Screenshot, compare, score, fix |
| `/drip:polish <target>` | Quick polish pass |
| `/drip:status` | Where the task stands |
| `/drip:keys` | Add API keys (local page) |
| `/drip:skip [reason]` | Skip the process for this task |

## The skills

`drip` (the director) · `drip-brief` · `drip-refs` · `drip-moodboard` · `drip-direction` · `drip-system` · `drip-color` · `drip-type` · `drip-layout` · `drip-landing` · `drip-app` · `drip-mobile` · `drip-components` · `drip-interaction` · `drip-motion` · `drip-imagery` · `drip-productshots` · `drip-icons` · `drip-copy` · `drip-a11y` · `drip-fitcheck` · `drip-polish`

Each skill's first screen holds its rules; the deep guide comes through the `drip_guide` tool, which records the read. That is how Drip knows the guide was read and not just skimmed.

## The tools (MCP)

| Group | Tools |
|---|---|
| Process | `drip_start` `drip_guide` `drip_status` `drip_mark` `drip_skip` `drip_end` |
| References | `refs_search` `refs_tag` `refs_feed` `refs_designer` `refs_related` `refs_sheet` `refs_view` |
| Moodboard | `board_create` `board_add` `board_directions` `board_open` `board_read` `board_choose` `board_list` |
| Components | `components_find` `components_get` `components_registries` `components_catalogue` |
| Assets | `palette_generate` `palette_check` `palette_from_image` `fonts_search` `fonts_pair` `fonts_preview` `icons_search` `icons_get` `gradient_mesh` `images_search` `images_save` |
| Generation | `gen_image` `gen_providers` `keys_status` `keys_open` |
| Fit check | `fitcheck_shot` `fitcheck_compare` `fitcheck_lint` `fitcheck_done` |

**References without an account.** Drip reads Dribbble the way its own web client does (the infinite-scroll requests), politely spaced and cached. Logged out, keyword search stops after about two pages, so Drip fans out through tags, feeds and designers, which page deeply. References are for studying; never copy a shot.

**Components from 3,000+ registry items.** `components_find` searches shadcn, coss ui, Kibo UI, Magic UI, Aceternity, React Bits, Motion Primitives, Animate UI and Cult UI live, and `components_registries` searches the 500+ registries in shadcn's directory.

**Moodboards you can react to.** `board_open` serves a live board where you star, remove and annotate references (Claude reads it back), plus a self-contained file it can publish as an artifact.

## Customise

Everything is plain files. See [docs/CUSTOMISE.md](docs/CUSTOMISE.md): gates and thresholds, which files count as UI, your own slop rules, your own catalogue entries, custom image providers, turning modules off.

## How it is built

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Short version: `skills/` (Markdown), `rules/` (shared rules), `data/` (catalogue, font pairings, slop rules), `mcp/` (the server, bundled to one file so the plugin runs with plain `node`), `hooks/` (small Node scripts sharing the server's state code).

## Credits

Drip stands on the shoulders of the skills it fuses. See [CREDITS.md](CREDITS.md).

## Licence

MIT. See [LICENSE](LICENSE).

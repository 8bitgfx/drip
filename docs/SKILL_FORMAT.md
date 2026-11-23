# How a Drip skill is written

Agents are lazy: they read the first screen of a skill and act. So every Drip skill is built so that
(1) the first screen already holds the rules that matter, (2) the deep knowledge is delivered by a TOOL
CALL (`drip_guide`), which the plugin records, and (3) hooks block UI writes until the required guides
were actually fetched. Prose never carries enforcement alone.

## Folder

```
skills/drip-<topic>/
  SKILL.md            the trigger + first screen (40-70 lines)
  guide.md            the full craft guide, served by drip_guide("<topic>")      (150-350 lines)
  reference/<x>.md    deeper sub-guides, served by drip_guide("<topic>/<x>")      (80-250 lines each)
```

## SKILL.md template

```markdown
---
name: drip-<topic>
description: <one or two sentences that TRIGGER: the situations, words and file types where this applies. Start with "Use when…". Mention it is part of Drip.>
---

# <Topic> (Drip)

**Before you do anything: call `drip_guide` with topic `<topic>`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. … (8-12 rules, each one line, concrete and checkable: numbers, names, "never X, do Y")

## Tools
- `tool_name` — when to call it (only Drip MCP tools that exist, see the list below)

## Read deeper when
| Situation | Call |
|---|---|
| … | `drip_guide <topic>/<x>` |
```

## guide.md rules

- Open with **one paragraph: what good looks like** for this craft.
- Then **the procedure**: numbered steps in the order a senior designer does them, each naming the Drip tool to call where one exists.
- Then **the craft**: principles with concrete values (sizes, ratios, durations, counts), each with a short **Do / Don't** pair.
- Then **slop tells for this craft** (what AI-made UI does wrong here) and the fix for each.
- End with **Done when** (a checklist Claude can verify by looking at a screenshot or the code) and **Sources** (which upstream skills the ideas came from).
- Write in plain, direct English. Short sentences. No filler, no hype. Use tables for values.
- Reference files go deeper on one sub-topic each (e.g. `color/dark-mode`, `motion/easing`). Every reference file must be listed in SKILL.md's "Read deeper when" table AND at the end of guide.md.
- Point to other Drip guides by topic name (`drip_guide type`), never by file path.
- Stack-neutral first, then concrete code for the common stack (React + Tailwind v4 + CSS variables) where it helps.

## Licences (the repo is public)

- MIT sources (Taste Skill, Emil Kowalski's skills, Make Interfaces Feel Better, UI UX Pro Max, unslop-ui, Hallmark, Stageshow) and Apache-2.0 sources (Impeccable, Anthropic frontend-design): adapt freely, keep the substance, rewrite in Drip's voice, credit in **Sources**. Never paste long passages verbatim.
- Vercel web-design-guidelines and the animate / choreograph / animation-performance / mobile-native skills: no clear licence for reuse. Learn from them, **paraphrase only**, no copied text or code. Credit as inspiration.

## Drip MCP tools that exist (use these names exactly)

Process: `drip_start`, `drip_guide`, `drip_status`, `drip_mark` (step "system"), `drip_skip` (only when the user asks), `drip_end`.
References: `refs_search` (keywords, ~2 pages logged out), `refs_tag` (deep paging), `refs_feed` (popular/recent by category), `refs_designer`, `refs_related` (tags around a query), `refs_sheet` (contact sheet of chosen shots), `refs_view` (study one shot full size; counts toward the gate).
Moodboard: `board_create`, `board_add` (needs a specific note per item), `board_directions` (2-4 directions), `board_open` (live link + shareable file + preview), `board_read` (user reactions), `board_choose`, `board_list`.
Components: `components_find` (curated libraries + live shadcn-style registries), `components_get` (read a component's code + install command), `components_registries` (500+ registries), `components_catalogue`.
Assets: `palette_generate` (OKLCH ramps + tokens + contrast), `palette_check`, `palette_from_image`, `fonts_search`, `fonts_pair` (mood -> pairing + specimen), `fonts_preview`, `icons_search`, `icons_get`, `gradient_mesh` (CSS/SVG + grain + preview), `images_search` (Wikimedia/Unsplash/Pexels/Openverse with licences), `images_save` (download + licence log).
Generation: `gen_image` (OpenAI / Gemini / custom providers), `gen_providers`, `keys_status`, `keys_open` (local page to paste a key).
Fit check: `fitcheck_shot` (phone + desktop screenshots via Chrome), `fitcheck_compare` (build next to the chosen direction), `fitcheck_lint` (static slop checks), `fitcheck_done` (scores + verdict; required before the turn can end after UI changes).

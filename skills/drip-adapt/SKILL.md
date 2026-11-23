---
name: drip-adapt
description: Use when the user runs /drip:adapt <niche> or asks Drip to specialise in a niche ("make Drip good at Roblox UI", "learn fintech dashboards", "become an album-art designer", "luxury e-commerce pack", "refresh my game UI pack"). Researches the niche's standards, references, shipped products, top artists and public skills, then writes a niche pack that later Drip tasks load automatically. Part of Drip.
user-invocable: false
---

# Adapt: Drip as a niche specialist (Drip)

**Before you do anything: call `drip_guide` with topic `adapt`.** It returns the full guide and records the read.
If the Drip tools aren't callable, load them: ToolSearch `select:mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__pack_create,mcp__plugin_drip_drip__pack_write,mcp__plugin_drip_drip__pack_list,mcp__plugin_drip_drip__pack_show`.

## Rules you must not break
1. `pack_list` first. If a pack for this niche exists, this is a refresh, not a new pack.
2. Intake is ONE round of ≤ 4 button questions (AskUserQuestion): which part of the niche, admired work and people, platforms, sources they can open for you. Your recommendation first, "Other" open.
3. Research in this order: hard constraints and official standards → references (refs tools) → shipped products (browser) → the 10-20 artists and studios at the top end → public skills to fuse. Never write rules before step 1 is done.
4. Every claim in the pack has a source in `sources.md`. A standard you couldn't confirm is marked "verify".
5. Licences: MIT/Apache-2.0/CC-BY adapt with credit; no licence, GPL or NC = ideas only, no text or code copied.
6. Sources behind a login (X, Pinterest, Behance, Discord, Figma community): ask; the user signs in themselves in Claude in Chrome, or pastes links. Never passwords or codes, never scraping, follow site terms.
7. The pack uses the fixed skeleton: 5-6 leading words, four convention lists, numbered testable defaults, a forbidden list, genres, artists, queries, critic rubric, slop rules, refs, sources.
8. Defaults are testable: a number, a count, a named element. "Clean and modern" is not a default.
9. The swap test: replace the niche's name with another niche. A rule still true there is generic; cut or sharpen it. ≥ 70% of rules must fail the swap.
10. The critic reviews the pack (`critic_prepare` kind `pack`) until it stops calling it generic, max 3 rounds.
11. Test the pack on a sample brief before calling it done; report what changed versus plain Drip.
12. Never put the user's private material (DMs, private boards, client work) into a pack marked `shared`.

## Tools
- AskUserQuestion — intake and access requests
- `refs_search` / `refs_tag` / `refs_related` / `refs_feed` / `refs_designer` — map the niche on Dribbble
- `refs_pick` / `refs_view` / `refs_zoom` / `refs_study` — study the best shots closely (feeds `refs.json`)
- `images_search` — openly licensed images of real products when screenshots aren't possible
- `pack_create` / `pack_write` / `pack_list` / `pack_show` — write the pack (files: guide, genres, artists, queries, critic, sources, refs, slop, catalogue)
- `critic_prepare` (kind `pack`, targets [id]) → Agent `drip:critic` with that prompt unchanged → `critic_record`
- `drip_start` with a sample brief — confirms the pack activates; `drip_guide` with topic "pack:<id>" to reread it

## Read deeper when
| Situation | Call |
|---|---|
| Planning and running the research: order, counts, standards, skills search, licences | `drip_guide adapt/research` |
| Writing the pack files: the skeleton with a full worked example (Roblox UI) | `drip_guide adapt/pack-skeleton` |
| A source needs the user's login or is behind terms | `drip_guide adapt/access` |
| Studying references properly | `drip_guide refs` |
| The niche is logos or identity | `drip_guide logo` |

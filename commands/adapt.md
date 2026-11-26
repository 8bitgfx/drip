---
description: Make Drip a specialist in any niche, style or workflow — game UI, fintech, album art, risograph, your team's Figma flow… — by researching it into a pack that changes how Drip works
argument-hint: <niche, style or workflow, e.g. "roblox ui", "luxury fashion e-commerce", "swiss editorial motion", "we hand off in Figma and build in Svelte">
---
Adapt Drip to: $ARGUMENTS

1. If the Drip tools aren't callable, run ToolSearch `select:mcp__plugin_drip_drip__pack_create,mcp__plugin_drip_drip__pack_write,mcp__plugin_drip_drip__pack_list,mcp__plugin_drip_drip__drip_guide`.
2. Load the `drip-adapt` skill and follow it exactly: intake with buttons (what in this niche, style or workflow, whose work I admire, platforms, sources I can give access to), research (standards, references, shipped products, artists and studios, public skills to fuse, licence-checked), then write the pack with `pack_create` / `pack_write`, get it reviewed by the drip:critic subagent until it stops being generic, and report back in a few lines.
3. **A style** (risograph, Swiss, Y2K chrome, a studio's motion language…) becomes a pack too: its palette, type, texture, motion behaviour, clichés to avoid and the references that define it. It applies to UI, logos and films alike.
4. **A workflow** (how my team hands off, the stack we build in, our review steps, our design system) becomes a pack whose guide changes Drip's steps: what to read first, where files go, which components to build on, what to check before hand-off. Read my repo and ask only what you can't find.
5. Ask me for access when a source needs my login (X/Twitter, Pinterest, Behance, Discord…): offer Claude in Chrome with my own sign-in, or links I paste. Never ask for passwords.
6. **It stays and keeps learning.** A pack is saved on this machine (or in the project with `shared: true`) and switches on by itself whenever a task mentions its keywords, in any project and any conversation, including `/drip:ui`, `/drip:logo` and `/drip:motion`. The user's reactions and the critic's findings on those tasks go into its `learned.md`.
7. **Sharing without a fork:** `pack_export({ id })` writes one `<id>.drip-pack.json` to send however I like (it lists anything that looks private first; `redact: true` strips it). Whoever gets it runs `pack_import({ file })` or `pack_import({ url })` with a raw link, and their Drip knows the niche without running adapt. Nothing is ever published by Drip.

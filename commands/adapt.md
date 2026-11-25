---
description: Make Drip a specialist in any niche — game UI, fintech, album art, e-commerce… — by researching it into a niche pack
argument-hint: <niche, e.g. "roblox ui", "luxury fashion e-commerce", "indie game menus", "b2b fintech dashboards">
---
Adapt Drip to: $ARGUMENTS

1. If the Drip tools aren't callable, run ToolSearch `select:mcp__plugin_drip_drip__pack_create,mcp__plugin_drip_drip__pack_write,mcp__plugin_drip_drip__pack_list,mcp__plugin_drip_drip__drip_guide`.
2. Load the `drip-adapt` skill and follow it exactly: intake with buttons (what in this niche, whose work I admire, platforms, sources I can give access to), research (standards, references, shipped products, artists and studios, public skills to fuse, licence-checked), then write the pack with `pack_create` / `pack_write`, get it reviewed by the drip:critic subagent until it stops being generic, and report back in a few lines.
3. Ask me for access when a source needs my login (X/Twitter, Pinterest, Behance, Discord…): offer Claude in Chrome with my own sign-in, or links I paste. Never ask for passwords.
4. **It stays and keeps learning.** A pack is saved on this machine (or in the project with `shared: true`) and switches on by itself whenever a task mentions its keywords, in any project and any conversation. The user's reactions and the critic's findings on those tasks go into its `learned.md`.
5. **Sharing without a fork:** `pack_export({ id })` writes one `<id>.drip-pack.json` to send however I like (it lists anything that looks private first; `redact: true` strips it). Whoever gets it runs `pack_import({ file })` or `pack_import({ url })` with a raw link, and their Drip knows the niche without running adapt. Nothing is ever published by Drip.

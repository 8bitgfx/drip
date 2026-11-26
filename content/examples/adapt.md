# Worked run: "/drip:adapt roblox ui"

Any niche works the same way: "luxury fashion e-commerce", "indie game menus", "b2b fintech dashboards", "album art".

1. **Intake** (AskUserQuestion, one round): which part (shop & inventory menus · HUD · lobby & onboarding · all (Recommended)); whose work you admire (names/links, Other); platforms (phone-first + PC + console (Recommended)); sources you can open for me (X/Twitter · Discord servers · DevForum · none).
2. `drip_guide("adapt")`, then research in this order:
   - **Standards:** the platform's official UI rules (safe areas, scaling, input types, text size limits), store/policy rules.
   - **References:** `refs_tag({ tag: "game ui" })`, `refs_search({ query: "roblox ui" })`, `refs_designer` on the best, studied with `refs_pick` → `refs_view` → `refs_zoom` → `refs_study`.
   - **Shipped products:** the top experiences' real screens via the browser (screenshots, not concept art).
   - **People:** the 10-20 UI artists and studios whose work defines the top end: what each does that others don't.
   - **Public skills:** search skills.sh / GitHub for the niche; check licences (MIT/Apache: adapt with credit; none: ideas only).
   - **Access:** for X/Discord, ask the user to sign in through Claude in Chrome or paste links. Never passwords.
3. **Write the pack:**
```
pack_create({ id: "roblox-ui", name: "Roblox UI", niche: "in-experience UI for Roblox games", keywords: ["roblox", "rbx", "obby", "simulator"], summary: "Chunky, touch-first, readable at a glance…" })
pack_write({ id: "roblox-ui", file: "guide.md", content: "…leading words, numbered testable defaults, conventions to honour/break, clichés, forbidden list…" })
pack_write({ id: "roblox-ui", file: "artists.md", content: "…" })   pack_write({ … "genres.md" … })   pack_write({ … "critic.md" … })
pack_write({ id: "roblox-ui", file: "slop.json", content: "{ \"rules\": [ … ] }" })   pack_write({ … "refs.json" … })   pack_write({ … "sources.md" … })
```
4. **Critic review of the pack** until it stops being generic:
```
critic_prepare({ kind: "pack", targets: ["roblox-ui"] }) → Agent drip:critic → critic_record
```
5. **Test** it on a sample brief (`drip_start({ task: "shop menu for my roblox simulator" })` activates the pack automatically) and report back:
```
Drip now speaks Roblox UI: 14 standards, 18 artists, 6 genres, 22 niche slop checks, 40 studied refs.
Critic on the pack: PASS 78. "Specific and usable; the console-controller section is thin."
It switches on whenever a task mentions roblox / rbx / obby / simulator. Edit or share: /drip:settings.
```

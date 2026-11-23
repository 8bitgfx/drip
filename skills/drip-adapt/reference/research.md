# Researching a niche

Research in a fixed order: what can't be broken, then what the best work looks like, then who makes it, then what
others have already written down. Taste built on a wrong constraint is wasted, so constraints come first.
Run independent steps in parallel where you can (for example a subagent reading platform docs while you page
references), but write nothing into the pack until step 1 is done.

## 1. Hard constraints and official standards

Find the rules the niche can't break: platform guidelines, engine limits, store and legal rules, accessibility.
Read the official source, link it, note the date you checked. If you can't confirm a number, write it with
"verify" rather than dropping or inventing it.

Examples of what to look for:

| Niche | Official sources | Constraints that become defaults |
|---|---|---|
| Roblox game UI | Roblox Creator Docs (UI, GUI on all devices, input, text, publishing), Community Standards | Read the top-bar inset with `GuiService:GetGuiInset()` and respect `ScreenGui.ScreenInsets` instead of hard-coding; keep the default thumbstick (bottom-left) and jump button (bottom-right) zones free on touch; size with Scale plus `UIAspectRatioConstraint`, not raw Offset; gamepad navigation via selectable objects; filter all player text through `TextService`; uploaded images max 1024×1024 (verify); most players on phones |
| iOS apps | Apple Human Interface Guidelines, App Store Review Guidelines | 44×44pt minimum targets; Dynamic Type; safe areas; system navigation patterns; Kids category rules |
| Android apps | Material Design 3, Google Play policies | 48×48dp targets; 4dp spacing grid; edge-to-edge with insets; predictive back |
| Any web UI | WCAG 2.2 | Text contrast 4.5:1 (large 3:1); UI parts and graphics 3:1; target size ≥ 24×24 CSS px (2.5.8); focus visible; reduced motion |
| Console / TV games | Xbox Accessibility Guidelines, platform certification docs | TV-safe margins; text readable at 3m; full gamepad navigation; remappable input |
| E-commerce | Baymard Institute research, consumer-law rules for prices and returns, payment provider rules | Total price before the last step; guest checkout; delivery and returns info near the buy button; trust marks only real ones |
| Fintech dashboards | Regulator disclosure rules for the market, accessibility law (e.g. EAA in the EU) | Numbers with units and periods; no misleading charts; risk disclosures visible; locale number formats |
| Album art | Distributor and streaming specs | Square, high resolution (3000×3000 is the common target, verify per distributor); legible at 64px in a list; no URLs or prices on covers |
| Kids' apps | COPPA (US), GDPR-K, store kids-category rules | No third-party ads or tracking; parental gates before links and purchases; large targets; reading-level copy |
| Editorial / print | Printer specs, the publication's style guide | Bleed (often 3mm), safe margins, CMYK and image resolution (300ppi at size) |

Write these into the pack's guide as **hard constraints**, each with its source. They are never "conventions to
break".

## 2. References (the refs tools)

Map the niche on Dribbble, then go deep:
1. `refs_search` with 3+ angles: the niche name, its screens ("roblox shop ui", "game inventory ui"), its
   genres ("cartoon game ui", "cozy game hud"), and adjacent words players or buyers use.
2. `refs_related` around the best query to find the niche's real tags; `refs_tag` to page deep into the 2-3
   tags that return quality. Tag paging beats keyword search for quality; keyword search shows the category's
   averages, which you also need, to write the clichés list.
3. `refs_feed` for the category's popular work; `refs_designer` for the 3-6 designers who keep appearing.
4. `refs_pick` 12-20 with a reason each; `refs_view`, `refs_zoom` on details (buttons, numbers, frames), and
   `refs_study` 8-12 with values: sizes, counts, colours, what it chose not to do, what is "shot fiction".
5. Log every query with a verdict (good, average, junk) for `queries.md`.

## 3. Shipped products (the browser)

Shots show taste; shipped products show what survives real users, devices and engines.
- Open 8-15 real products in the browser (Claude in Chrome or the built-in browser pane). For apps and games,
  use store pages, official sites, press kits, trailers, and the user's own screenshots.
- Screenshot the 3-5 key screens of each. For games: HUD in play, shop, inventory, results, onboarding.
- Measure what you can: target sizes relative to the screen, text sizes, how many elements are on screen, where
  the primary action sits, how long feedback animations last.
- Note the gap between shipped and Dribbble: usually more text, more states, less whitespace, louder feedback.
- Keep screenshots in the user's project or a working folder, not in a shared pack (see `adapt/access`).
- `images_search` can find openly licensed screenshots when you can't open the product.

## 4. Artists and studios (the top end)

Find the 10-20 people and studios whose work defines the best end of the niche:
- Sources: who made the shipped products you admired (credits, studio sites, case studies, talks), designers who
  recur in `refs_designer`, award lists in the field, the people the user named.
- For each, write **what they do that others don't**, in one concrete line ("menus that tilt and slice on every
  transition; red/black/white only"), plus 1-3 links to their best work.
- Mix scales: 3-5 big studios, 5-10 individual designers, 2-5 from outside the niche whose ideas transfer.
- Never write about someone you only know by name. No line, no entry.

## 5. Public skills to fuse

Others may already have written down part of this niche.
- **skills.sh**: search the niche and its synonyms; open each candidate's repo.
- **GitHub**: `gh search repos "<niche> skill" --sort stars --limit 30`, `gh search repos "<niche> claude" ...`,
  and code search for SKILL.md files mentioning the niche. Then
  `gh repo view <owner>/<repo> --json licenseInfo,stargazerCount,pushedAt,description`.
- Read the SKILL.md and its references, not the README. Judge by substance, not stars.

### Licences

| Licence | What you may do |
|---|---|
| MIT, Apache-2.0, BSD, ISC | Adapt with credit; rewrite in Drip's voice; keep the notice in `sources.md` (Apache: mark as modified) |
| CC-BY-4.0 | Adapt with attribution |
| CC-BY-SA, GPL, AGPL | Ideas only (share-alike would bind the pack) |
| CC-BY-NC, "personal use", custom terms | Ideas only |
| No licence | Ideas only: no text, no code, no data |
| Bundled third-party content (logo libraries, screenshots, fonts) | Never copy, even inside an MIT repo |

"Ideas only" means you may say "the idea of X came from Y" and write the rule yourself from scratch.

## 6. From research to rules

For each finding, ask: is it a hard constraint (cite it), a pattern the best work shares (cite 2+ refs or
products), or one artist's signature (goes in `artists.md` or a genre, not in the defaults)? Then:
- turn it into a number or a count wherever the evidence allows;
- run the swap test (replace the niche name with another; still true? sharpen or cut);
- check it doesn't contradict a hard constraint.

## Refreshing a pack

`/drip:adapt <niche> --refresh`, every 3-6 months or when the platform changes:
1. `pack_show`, then read every file.
2. Recheck each hard constraint at its source; update numbers and dates; clear "verify" marks you can confirm.
3. Check `refs.json` and `artists.md` links; replace dead ones.
4. Run the queries in `queries.md` again; study 4-6 new shots; add newly shipped products.
5. Search for new public skills; check licences again (they change).
6. Rerun the critic (`critic_prepare` kind `pack`) and the sample brief.
7. Add a dated "Refreshed" entry in `sources.md` listing what changed.

## Done when
- [ ] Hard constraints from official sources, linked and dated, or marked "verify".
- [ ] Query log with verdicts; 8+ studied refs from 3+ designers.
- [ ] 6+ shipped products seen, key screens captured, the shot-vs-shipped gap noted.
- [ ] 10-20 artists and studios, each with a concrete line and links.
- [ ] Public skills searched and read; every licence recorded; no-licence ideas paraphrased only.

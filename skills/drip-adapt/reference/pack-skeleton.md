# The pack skeleton (worked example: Roblox UI)

Every pack has the same nine files, so Drip, the critic and the user always know where to look. Below: the
skeleton for each file, filled in for an example niche, **Roblox in-experience UI** (HUDs, shops, menus). The
example shows shape and specificity; numbers marked "verify" must be confirmed at their source in a real pack,
and every link in a real pack is a real URL.

## 0. pack_create

```
pack_create({
  id: "roblox-ui",
  name: "Roblox UI",
  niche: "in-experience game UI for Roblox: HUD, shops, inventories, menus, onboarding",
  keywords: ["roblox", "rbx", "obby", "simulator ui", "tycoon ui", "luau gui", "screengui"],
  summary: "Touch-first, chunky, instantly readable game UI that survives phones, consoles and the engine's insets.",
  shared: false
})
```
Keywords: the niche's own words only. "game" or "shop" alone would hijack unrelated tasks.

## 1. guide.md

```markdown
# Roblox UI

## Leading words
- **Thumb-first**: designed for a phone held sideways; desktop and console adapt from it.
- **Chunky**: thick outlines, big targets, no hairlines; readable over any 3D scene.
- **Instant**: a player understands any screen in under 2 seconds, mid-play, aged 9-16.
- **Juicy**: every action answers with motion and sound within 100ms.
- **Out of the way**: the world is the game; UI stays at the edges until called.

## What good looks like
<one paragraph: the best shipped Roblox UIs, what they share, in this niche's words>

## Hard constraints (never broken)
1. Read the top-bar inset with GuiService:GetGuiInset() and respect ScreenGui.ScreenInsets; never hard-code it. [Creator Docs]
2. On touch, keep the thumbstick zone (bottom-left) and jump zone (bottom-right) free of controls. [Creator Docs]
3. Size with Scale + UIAspectRatioConstraint (+ UIScale for density); Offset only for strokes and padding. [Creator Docs]
4. Every interactive element reachable with a gamepad (Selectable, NextSelection*). [Creator Docs]
5. All player-entered text filtered through TextService before others see it. [Community Standards]
6. Images uploaded at ≤ 1024×1024 (verify); use 9-slice (SliceCenter) for frames.

## Category conventions
### Defaults that work
- Currency counters top-left or top-right, icon + number, with a "+" button to the shop.
- Left-edge vertical stack of round menu buttons (shop, inventory, pets, settings) on HUDs.
- Modal shop with tabs across the top and a big close X in the top-right corner.
### Conventions to honour
- Close X top-right, always; players reach for it there.
- Robux prices shown with the Robux icon, on the buy button itself.
- Rarity colours in the common order (grey, green, blue, purple, gold/orange, red/rainbow).
### Conventions to break (for positioning)
- Every simulator's identical cartoon bevel: a flat, graphic style with one signature shape stands out in thumbnails.
- Pop-ups on join (daily reward, starter pack, update log stacked): one, and only after the first 30s of play.
### Clichés
- Glossy gradient buttons with a white top highlight; Fredoka/Luckiest Guy-style bubbly type everywhere;
  rainbow "SALE!" bursts; ten notification badges at once.

## Defaults (numbered, testable)
Layout
1. HUD elements live in the outer 15% of the screen; the centre 50% stays clear in play.
2. Primary buttons ≥ 10% of screen height on phones (verify against a 360dp-tall landscape phone).
3. One primary action per modal, bottom-centre, the largest button on screen.
Type
4. HUD numbers bold, ≥ 4.5% of screen height, with a 2-3px dark UIStroke.
5. Two faces max: one display for titles, one readable sans for everything else; no text under 14px at 720p.
6. TextScaled only with a UITextSizeConstraint (MaxTextSize set).
Colour
7. Panels mid-dark (not pure black) at 85-95% opacity so the world reads through faintly.
8. Accent colour used on ≤ 3 elements per screen: the primary action, currency, the newest item.
Components
9. Every button has hover (desktop), press (scale 0.95 + darker) and selected (gamepad) states.
10. Outline weight is one value across the whole UI (e.g. 3px UIStroke), corners one radius family.
Motion and feedback
11. Button press feedback ≤ 100ms; panel open 150-250ms with a slight overshoot; nothing over 400ms blocks input.
12. Rewards: number count-up + icon fly to the counter + sound; never a silent number change.
Content
13. Labels are 1-2 words; numbers abbreviated (1.2K, 3.4M) with tabular figures.
<…to 20-30 defaults>

## Forbidden
- Hard-coded top inset or safe-area offsets.
- Controls inside the thumbstick or jump zones.
- Text that only fits on desktop (clipped or overflowing on a phone).
- More than one pop-up on join.
- Fake timers ("ENDS IN 00:59" that resets) and dark-pattern Robux prompts.
<8-15 items>

## Critique order (by harm)
Readable in play → fits the input (touch, gamepad, mouse) → feedback → hierarchy → style → polish.

## Done when
- [ ] Screenshots at a phone, a tablet, 1080p desktop and a console-like 1080p TV layout, all with insets.
- [ ] Every control reachable with a gamepad; thumbstick and jump zones clear.
- [ ] All defaults checked; nothing on the forbidden list.
```

## 2. genres.md

Per genre: name, one-line thesis, tokens (palette roles, type, outline, radius, motion), references, **breaks if**.

```markdown
## Toybox (cartoon simulator, done properly)
Thesis: plastic-toy UI with real weight; every button feels pressable.
Tokens: saturated mid-tones, 3px dark outline, radius 12-16, bold rounded display face, bouncy 200ms motion.
Refs: <3-4 refs.json titles>. Breaks if: gloss highlights, more than 4 hues on one screen, thin outlines.

## Signal (competitive / shooter)
Thesis: information at a glance, nothing decorative; angular and fast.
Tokens: near-black panels, one hot accent, condensed sans, 0-4 radius, 120ms linear-out motion.
Breaks if: bounce easing, rounded bubbly type, panels covering the crosshair area.

## Diegetic (horror / immersive)
Thesis: UI lives in the world: notes, screens, objects; HUD nearly gone.
Breaks if: persistent currency counters, bright UI colours, modal shops mid-play.
<3-6 genres>
```

## 3. artists.md

```markdown
| Who | What they do that others don't | Links |
|---|---|---|
| Uplift Games (Adopt Me!) | Soft, rounded, low-contrast UI that stays friendly for young players without looking cheap | <links> |
| BIG Games (Pet Simulator 99) | Loud reward feedback: hatches and level-ups land with layered motion, sound and number bursts | <links> |
| LSPLASH (Doors) | Near-zero HUD; the UI that exists is diegetic and paced with the horror | <links> |
| Supercell (Clash Royale), outside Roblox | Chunky, outlined, thumb-sized mobile UI: the source of the simulator look, done with discipline | <links> |
| Atlus (Persona 5), outside Roblox | Menus as graphic design: diagonal cuts, a strict 3-colour system, motion on every transition | <links> |
| <individual Roblox UI designers found with refs_designer, X, portfolios: handle + one concrete line + links> | | |
```
10-20 rows. No entry without the concrete line.

## 4. queries.md

```markdown
## Dribbble (refs_search / refs_tag)
Good: "game ui mobile", tag "game-ui" (deep pages 3-8), "roblox ui", "casual game shop", designer <name>.
Average (use for clichés): "game menu", "cartoon button".
Junk: "roblox" alone (avatars and thumbnails), "gaming dashboard" (web esports dashboards).
## Browser
Roblox Discover charts; game pages' screenshots; developer showcase threads; YouTube UI walkthroughs.
## GitHub / skills
gh search repos "roblox ui" --sort stars; "game ui skill"; nothing mature found on <date>.
```

## 5. critic.md

```markdown
Extra axes (add to the base rubric): Readability in play (20), Input fit (15), Feedback (10).
Ceiling: Convicted for menus and shops; Coherent for HUDs (they must disappear).
Fatal flaws (cap 49): text unreadable on a phone; a control under the thumbstick or jump zone;
UI covering the play area centre; ignores the top-bar inset.
First 3 seconds: Where is the primary action? What is my currency? How do I close this?
Generic tells to name: glossy gradient buttons, bubbly font everywhere, rainbow SALE bursts, stacked pop-ups.
```

## 6. slop.json

Drip's format: `{ "rules": [{ id, pattern, flags, message, fix, severity, min?, unless? }] }`, JavaScript regex,
run on code files. Lint what shows up in code (Luau, `.rbxmx`/`.rbxm` XML, or a web mockup).

```json
{
  "rules": [
    { "id": "text-scaled-unbounded", "pattern": "TextScaled\\s*=\\s*true", "unless": "UITextSizeConstraint|MaxTextSize", "severity": "warn",
      "message": "TextScaled without a size constraint: text balloons on tablets and TVs.", "fix": "Add a UITextSizeConstraint with MaxTextSize." },
    { "id": "hardcoded-inset", "pattern": "UDim2\\.new\\([^)]*,\\s*0\\s*,\\s*(36|58)\\s*\\)", "severity": "warn",
      "message": "Looks like a hard-coded top-bar inset.", "fix": "Use GuiService:GetGuiInset() or ScreenGui.ScreenInsets." },
    { "id": "offset-layout", "pattern": "UDim2\\.fromOffset\\(\\s*\\d{3,}", "min": 4, "severity": "info",
      "message": "Large Offset sizes: the layout won't adapt to phones.", "fix": "Scale + UIAspectRatioConstraint; Offset for strokes and padding." },
    { "id": "unfiltered-text", "pattern": "\\.Text\\s*=\\s*\\w*(message|msg|input|chat)", "flags": "i", "unless": "FilterStringAsync", "severity": "error",
      "message": "Player text shown without filtering.", "fix": "Filter through TextService before display." }
  ]
}
```
Test every regex on a real snippet before writing it; a rule that fires on everything gets ignored.

## 7. refs.json

```json
[
  { "title": "Pet shop, mobile", "url": "<shot url>", "designer": "<name>",
    "note": "Take: 3px outline on every element, one gold accent on the buy button only. Leave: the 9px item labels (shot fiction, unreadable on a phone)." }
]
```
10-30 entries, each note with one **take** and one **leave**, values where possible.

## 8. catalogue.json

Drip's catalogue shape: `{ "entries": [{ id, name, url, category, what, useWhen, avoidWhen, price, license, stack }] }`.
```json
{ "entries": [
  { "id": "react-lua", "name": "React Lua", "url": "https://github.com/jsdotlua/react-lua", "category": "framework",
    "what": "React's model ported to Luau for Roblox UI.", "useWhen": "Large, stateful UI with many screens.",
    "avoidWhen": "A few static panels.", "price": "free", "license": "MIT", "stack": ["roblox", "luau"] },
  { "id": "fusion", "name": "Fusion", "url": "https://github.com/dphfox/Fusion", "category": "framework",
    "what": "Reactive state and UI library for Luau.", "useWhen": "Animated, state-driven UI.", "avoidWhen": "Teams already on React Lua.",
    "price": "free", "license": "MIT (check)", "stack": ["roblox", "luau"] }
] }
```

## 9. sources.md

```markdown
## Intake (<date>)
Part: shops and HUD · Admired: <names, links> · Disliked: <…> · Platforms: phone first, PC, console · Access: public only.
## Standards (checked <date>)
- Roblox Creator Docs: <page> <url> · <page> <url>
- WCAG 2.2: contrast and target size, used as a floor
## Products seen
<game, screens captured, date>
## Skills and credits
- dashboard-design (abdiraimov-otabek, MIT): pack structure. <notice>
- <repo> (no licence): ideas only, <which idea>
## Verify
- Image upload limit 1024×1024; button height in % of screen height.
## Refreshed
- <date>: <what changed>
```

## Checklist before `critic_prepare` kind `pack`
- [ ] All nine files written; JSON validated by `pack_write`.
- [ ] 5-6 leading words, each tied to at least two defaults.
- [ ] Four convention lists; 15-30 numbered defaults; forbidden list; critique order.
- [ ] Every hard constraint and number sourced or marked "verify".
- [ ] Swap test: ≥ 70% of rules false for a different niche.

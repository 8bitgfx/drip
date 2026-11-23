# Worked run: "/drip:design a portfolio for Claude"

> Font names, colours and copy below are placeholders. Never reuse them because they appear here: choose for the brief with `fonts_pair` and `fonts_preview`.

What a good Drip run looks like, call by call, with the messages the user sees. Copy the shape, not the content.

## 1. Start + intake (≈1 minute)
```
drip_start({ task: "portfolio site for Claude" })            → mode design, full loop, INTAKE block, loop guide
```
Read the project first (empty folder? note "new project, no tokens"). Then ONE AskUserQuestion round:

| Question | Options (recommendation first) |
|---|---|
| Who is this for? | "People meeting Claude for the first time (Recommended)" · "Developers deciding whether to build with Claude" · "Press and partners" |
| Which feel? | "Loud & playful: huge kinetic type, saturated colour, motion (Recommended)" · "Editorial & crafted: a magazine about one mind" · "Raw & experimental: unusual layouts, exposed process" · "Surprise me (bold)" |
| Anything you love or hate? | "Hate the corporate SaaS look (Recommended)" · "Love brutalist sites" · "No preference" (+ Other) |

```
drip_brief({ what: "portfolio site for Claude", audience: "people meeting Claude for the first time", job: "see what Claude makes and feel what working with it is like",
             feel: ["loud & playful"], hates: ["corporate SaaS look"], ambition: "bold" })
```
User sees: just the three questions. No narration.

## 2. References (≈5 minutes)
```
drip_guide("refs")
refs_search({ query: "portfolio website", category: "web-design" })   ← real examples first: most studies must BE portfolio sites
refs_tag({ tag: "portfolio website" }) · refs_tag({ tag: "hero section" })
refs_related({ query: "portfolio kinetic typography" })     → tags: "type", "motion design", "creative portfolio", "editorial"
refs_tag({ tag: "creative portfolio", page: 2 })
refs_search({ query: "exhibition poster typography", category: "typography" })   ← outside the category on purpose
refs_pick({ picks: [
  { shot: "4", why: "type IS the layout; 200px words cropped by the viewport" },
  { shot: "11", why: "the only one using a live cursor as a design element" },
  { shot: "17", why: "index of works as a giant numbered list, no cards" } ] })
refs_view({ shot: "L3-4" }) → (whole page, every section) → refs_study({ shot: "L3-4",
  layout: "no grid visible; words placed edge to edge, 3 per screen-height",
  type: "condensed grotesk ~220px, tight -4% tracking, body 18px, ratio ~12:1",
  color: "#F2F0EA ground, #111 ink, one #FF3D00 accent only on hover states",
  density: "~12 words per screen", detail: "words are clipped by the viewport edge on purpose",
  take: "type at poster scale as the whole composition", leave: "the illegible 11px captions" })
… repeat for 6-12 picks from 3+ designers
```

## 3. Directions + tiles + critic (≈4 minutes)
```
drip_guide("moodboard"); drip_guide("direction")
board_create({ name: "Claude portfolio" })                 → studies imported automatically
board_add({ items: [{ ref: "#FF3D00", note: "accent for one moving thing per screen" }, { ref: "<display face chosen with fonts_pair>", note: "display at 160px+; the face that fits THIS brief, previewed with the real headline" }] })
board_directions({ directions: [
  { name: "Live Wire", summary: "Claude's words assemble themselves as you scroll; the page is a conversation happening in type.",
    adjectives: ["loud", "kinetic", "playful"], palette: ["#0E0E0E", "#F3EFE6", "#D4FF3A"], type: "<display> + <text> (from fonts_pair)", items: ["1","2","5"] },
  { name: "Margin Notes", summary: "A manuscript of finished work with Claude's reasoning written in the margins beside it.",
    adjectives: ["editorial", "witty", "intimate"], palette: ["#F7F3EA", "#141414", "#2340FF"], type: "<a different pairing>", items: ["3","4"] },
  { name: "Signal Fire", summary: "An exhibition poster wall: each project a giant numbered poster, colour fields that own the screen.",
    adjectives: ["graphic", "saturated", "confident"], palette: ["#FF3D00", "#111111", "#FFE9DC"], type: "<a third pairing>", items: ["6","7"] } ] })
board_tile({ copy: { brand: "Claude", headline: "I think in drafts. Here are the good ones.", cta: "See the work" } })
critic_prepare({ kind: "directions" })
Agent({ subagent_type: "drip:critic", description: "Critic review directions", prompt: <exactly the prompt returned> })
critic_record({ kind: "directions", verdict: "revise", scores: { idea: 7, conviction: 6 }, worst: "Margin Notes is the cream-and-serif default with a gimmick",
  fixes: ["replace Margin Notes or push it far from paper+serif"], summary: "Live Wire and Signal Fire have ideas; Margin Notes is the tasteful-AI default.",
  perDirection: [{ name: "Live Wire", score: 8, verdict: "keep", note: "the only one that feels like Claude" }, { name: "Signal Fire", score: 7, verdict: "keep", note: "bold but generic poster tropes" }, { name: "Margin Notes", score: 4, verdict: "cut", note: "the default" }] })
```
Margin Notes is reworked (or replaced), tiles re-rendered, critic run again, until no REJECT and the weakest option is still a real option.

## 4. The user chooses (one message)
```
board_open()
```
User sees:
```
Moodboard: <link>
1. Live Wire: Claude's words assemble as you scroll. Critic 8/10, "the only one that feels like Claude".
2. Signal Fire: an exhibition poster wall. Critic 7/10, "bold, a bit generic".
I'd build Live Wire. Risk: motion-heavy, needs a calm reduced-motion version.
```
plus one AskUserQuestion: "Which direction?" (Live Wire (Recommended) · Signal Fire · Mix: ask me). Then `board_choose`.

## 5. System, build, check
```
drip_guide("system"); palette_generate({ accent: "#D4FF3A" }); fonts_pair({ mood: "<the direction adjectives>" }); fonts_preview({ display: "<chosen>", text: "<chosen>", sample: "<the real headline>" })
→ DESIGN.md + tokens → drip_mark({ step: "system" })
… build with components_find / icons_search / real copy …
fitcheck_shot({ url: "http://localhost:3000" }) → self-critique, fix
critic_prepare({ kind: "build", targets: ["http://localhost:3000"] }) → Agent drip:critic → critic_record (until PASS, max 3)
fitcheck_done({ scores: {...}, verdict: "pass", fixes: [...] })
```

## 6. Hand-off (one message)
```
Done: Claude's portfolio in the Live Wire direction.
<desktop + phone screenshots>
Critic: PASS 76/100. "Loud and finished. The case-study pages are still the weakest part."
Left: case-study pages use placeholder project text; reduced-motion checked in Chrome only.
Files: DESIGN.md · .drip/boards/claude-portfolio · app/page.tsx
```
```
drip_end({ summary: "Live Wire portfolio, critic PASS 76" })
```

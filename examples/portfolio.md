# Worked run: "/drip:design a portfolio for a ceramics studio"

The shape of a good run, call by call. Copy the shape, never the content: the subject, faces and colours here are deliberately absent. About 25 tool calls and 10-12 minutes, most of it spent building.

## 1. Start and intake (1 call + 1 question round)
```
drip_start({ task: "portfolio site for a two-person ceramics studio" })   → design, full loop, the playbook inline
```
Read the project first. Then ask one AskUserQuestion round, with material first:

| Question | Options (recommendation first) |
|---|---|
| What can the page show? | "Photos of the pieces I'll give you (Recommended)" · "Generate pictures of pieces in our style" · "Nothing yet: leave labelled slots" |
| What should a visitor do? | "Commission a piece (Recommended)" · "Buy from the current batch" · "Book a studio visit" |
| Which first screen? | "One piece, huge, filling the screen: the work leads" · "The studio's name set enormous over the kiln room" · "Surprise me (bold)" |

```
drip_brief({ what: "...", audience: "...", job: "commission a piece", feel: ["the work leads"], ambition: "bold" })
```

## 2. Look (2 calls)
```
refs_site({ urls: ["<3-4 strong studio / maker / gallery sites you know>"] })   → first screens + measured h1/h2/body px
refs_study({ studies: [ { shot: "<url>", layout: "picture spans cols 1-12, 92% of the first screen", type: "h1 ~140px, one line", ... }, ... ] })
```
The measured sizes are the point: shipped sites set things much bigger than you would dare.

## 3. Two directions as comps (4 calls + the user's pick)
```
board_create({ name: "Studio" })
board_directions({ directions: [
  { name: "...", manifesto: "<the idea this page owns> / <the default it refuses> / <who, where, what light>",
    palette: ["<ground>", "<ink>", "<accent>", "<support>"], type: "<display face> + <text face>",
    headline: "<8 words or fewer>", picture: "one bowl at 1:1, filling 7 columns", layout: "split", items: ["1", "2"] },
  { ... a different idea, not the same look in other colours ... } ], copy: { brand: "...", body: "<the one sentence>", cta: "Commission a piece" } })
critic_prepare({ kind: "directions" }) → Agent drip:critic → critic_record(...)
board_open() → AskUserQuestion: one line per comp with the critic's score, your pick first → board_choose(...)
```

## 4. System, then the hero first (4 calls)
```
drip_kit()                       → styles/drip-base.css: fill in the faces and colour roles, nothing else
(write DESIGN.md: THESIS, WORLD, STORY, FIRST VIEWPORT with numbers, SIGNATURE, REFUSES) → drip_mark({ step: "system" })
(build nav + hero only)
fitcheck_shot({ url, hero: true })  → h1 at the Display role? picture ≥ 6 cols and ≥ 60% tall? ≤ 160px empty?
```

## 5. Sections, gate, critic, hand-off (5-7 calls)
Plan 6-9 sections, one line each (idea, picture, mass, how the thesis shows). Build them. Then:
```
fitcheck_shot({ url })           → the page gate: fix every blocker
critic_prepare({ kind: "build", targets: [url] }) → Agent drip:critic → critic_record   (fix S0/S1, one confirming round)
fitcheck_done(...) → drip_end(...)
```
The user sees desktop and phone shots, the critic's words, what's left, and every slot with what their photos should show.

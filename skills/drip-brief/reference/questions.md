# Brief questions: one round, four buttons, your answer first

You get one round of at most four questions, asked with AskUserQuestion. Spend them on the unknowns that change the build the most; infer, state and let the user correct everything else. Each question arrives with Drip's recommended answer as option 1, so a user who agrees with you finishes the intake in four clicks, and a user who doesn't can say so in "Other". A questionnaire before anything is shown loses people; a confident reading they can fix in one click keeps them.

## The rules

1. **Scan first.** Never ask what the repo, the prompt or an earlier message answers. Open the round with one line on what you found.
2. **One round, four at most, then wait.** A second round only for a material gap an answer exposed (a new audience, a missing constraint), never to confirm what you could assume.
3. **Recommendation first.** Option 1 is your pick, labelled "(Recommended)" with a reason of a few words. Word it so accepting it is the natural click.
4. **Options specific to this request.** "Indie bike shops booking repairs" beats "Small businesses". Generic options are a sign you didn't read the request.
5. **"Other" always open.** Never trap the user in your options.
6. **Loves and hates, always.** It is the one place free text matters most: links, brands, "no dark mode".
7. **Product and feel questions only.** Never ask for colours, fonts or CSS values in words; show them on the board.
8. **Facts are never inferred.** You may assume an audience or a tone; you may not assume a price, a customer count, a quote or a logo. Those go to "absent".
9. **No one to answer** (headless, batch, "just go ahead"): ask nothing; write the assumptions block and pass it to `drip_brief` as `assumptions`.

## Choosing the four

Score each candidate: would two different answers produce two different builds? Ask the top four.

| Question | Ask when | Skip when |
|---|---|---|
| What is it? | the request could mean two different surfaces | it's clear |
| Who is it for, and what should they do? | the audience or the action could go two ways | `PRODUCT.md`, README or the prompt says |
| Which feel? | almost always on a full loop | the brand or the user pinned the look |
| Anything you love or hate? | always | never skip |
| What real material can it show? | Persuade with no photos, numbers or quotes in the repo | the repo has them; Operate screens with their own data |
| What must not change? | redesign of an existing look | greenfield |

When "material" or "what must not change" matters more than "what is it", swap it in. Four is the ceiling.

## Building the feel options

Pick 3 options that sit at opposed poles of the four axes (tone, aesthetic density, audience relationship, sensory ambition), then add "Surprise me (bold)". Each option says what it looks like in one line.

| Surface | Option 1 (example recommendation) | Option 2 | Option 3 |
|---|---|---|---|
| Developer tool landing | "Editorial & exact: big type, a real diff as the hero, strict grid, no terminal costume (Recommended: devs get too much dark mono)" | "Loud & playful: saturated colour, kinetic type, one interactive demo" | "Quiet authority: paper-white, one accent, dense docs-like facts" |
| Bakery site | "Warm & tactile: today's bake list set large like the chalkboard, daylight photos (Recommended: the bake list is the reason to visit)" | "Retro print: two-ink poster look, wood-type caps" | "Quiet luxury: photography-led, very few words" |
| Analytics dashboard | "Precise instrument: dense, tabular, one signature chart (Recommended: it's used daily)" | "Calm companion: airy, guided, plain-language insights" | "Bold shell: a coloured rail, big headline numbers" |
| Personal portfolio | "Loud & playful: huge kinetic type, saturated colour, one motion moment (Recommended: nobody screenshots a quiet portfolio)" | "Catalogue: the work as an index, big numbers, strict grid" | "Conversational: hand-made details, a voice like a letter" |

The recommendation leans away from what the audience already gets too much of.

## Example round (AskUserQuestion)

Opening line: *"Next.js + Tailwind v4; your green `#0F7B5F` and the logo in `/public` stay. Four quick ones:"*

```
1. Who is this for, and what should they do?
   - Existing customers booking a repair slot on their phone (Recommended: your nav already says "Book")
   - New customers comparing shops nearby
   - Both, booking first
2. Which feel?
   - Workshop-honest: the repair board as the hero, real prices, big condensed type (Recommended)
   - Friendly local: warm photos of the team, conversational copy
   - Precise service: clean, fast, a booking widget and nothing else
   - Surprise me (bold)
3. What can the page show?
   - Photos of the workshop I'll send (Recommended)
   - Nothing yet: use labelled stand-ins
   - Real prices from prices.json
4. Anything you love or hate?
   - Hate: stock photos of smiling mechanics
   - Love: sites that show prices up front
   - No preference
```

"Other" is always there; the user can type a link or a sentence on any of them.

## The assumptions block

When you don't ask (or the user says "go ahead"), put this in your next message and pass it as `assumptions` to `drip_brief`. One line per inference, each correctable.

```
Assumed (say the word and I'll change any of these):
- Audience: the shop's existing customers, on phones, booking between rides.
- Job: book a repair slot online; success = a confirmed slot.
- Feel: workshop-honest, bold. Mode: Persuade. Loop: full.
- Keep: Tailwind tokens in app/globals.css, the logo, the nav.
- Absent: prices, reviews, opening hours (slots left for them, nothing invented).
```

"Go ahead" covers the brief. It is not approval for paid generation, replacing a brand, or anything irreversible later; ask once when you get there.

## Worked examples

**Sparse: "make a landing page for my app".** Scan: an Expo habit tracker with a Next.js marketing folder. Ask: (1) who and the moment they open it, with your inferred reading first, (2) feel, (3) what you can show (App Store screenshots, a rating with a source), (4) loves/hates. Assume the job is "download on iOS".

**Precise: "pricing page for Ledgerly, three tiers, monthly/annual toggle, our green in globals.css, for 5-50 person accounting firms".** Audience, job, brand and structure are given. Ask two: feel (with a recommendation that fits the existing brand) and loves/hates. Record the rest.

**Operate: "design the orders table for our admin".** Scan: shadcn, Tailwind, an existing `DataTable`. Ask: (1) typical and worst-case order count, (2) the three most frequent actions, (3) loves/hates (other admin tools they like). Skip feel: the admin's system decides it.

**Redesign: "our site looks generic, redesign it".** Ask: (1) depth (polish / restyle / full redesign, with your recommendation first), (2) what must stay, (3) feel, (4) what feels wrong now and what they love elsewhere.

## After the answers

- Call `drip_brief` immediately. Quote the user's own words in `feel`, `loves` and `hates`.
- An answer that pins a look ("it must feel like a 1970s railway timetable") is a constraint: it wins over Drip's taste and the slop list.
- A product cited as an example ("like Linear") sets the **craft bar**, not the look. Study it as a reference; don't copy it.
- If the user clicked your recommendation without reading, that's still their answer. If they typed "you pick" in Other, record it under `assumptions`, never as their taste.
- Answers that contradict the repo: name the conflict, say which side you will follow, ask once.

## Sources

Rewritten from **Impeccable** (Apache-2.0: assert-and-correct, never ask for CSS or aesthetic lanes, the reference product sets the craft bar) and **Hallmark** (MIT: material first, "go ahead" as the opt-out, facts never inferred, the redesign ask). New in 0.3: **mattpocock/skills grilling** (MIT: ask the frontier, a recommended answer for every question, never ask what you can look up), **rampstackco/claude-skills creative-direction** (MIT: the four feel axes and the "too much of" rule), **julianoczkowski/designer-skills** (Apache-2.0: scan first, then ask), **buttonsprite/visual-direction-moodboard** (MIT: delegated picks are never recorded as the user's taste). Ideas only: **ziguishian/brand-design-skill** (no simulated consent).

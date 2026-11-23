# Alternatives that differ for real

Most "three options" are one option painted three ways: the same split hero, the same three cards, the same footer, in blue, green and black. The user cannot choose between them because there is nothing to choose. Real alternatives come from different ideas about what the surface leads with and what world it lives in. This file is the method for generating them, the skeletons to refuse, and how to commit once one is chosen.

## 1. Derive candidates from the subject's world

Before sketching, write four things:

1. **Mechanism:** what the product does, in one sentence with a verb ("chases late invoices so freelancers don't have to").
2. **Scene:** who, where, device, light, frequency (from the brief).
3. **Cultural home:** the world the audience lives in: its trade, its places, its printed matter, its rituals.
4. **The rut and its opposite:** the page the category always ships, and the obvious reaction against it. Both are out unless pinned.

Then list **seven concrete candidates**: artifacts, places, systems or rituals the audience knows by heart. For each, one line on why it can carry the mechanism, one on how it looks (ground, main colours, type voice, the signature that makes it recognisable).

Rules for the list:
- **Spread across at least 3 material families** (paper and print, signage and places, objects and packaging, screens and notation, nature and materials, performance and ritual). Four candidates from one family means you stopped at the first idea.
- **Graphic traditions count**: a school of poster, a timetable, a scientific plate, a newspaper's wayfinding, a brand identity programme.
- **On Persuade and Experience**, the tools the audience operates (a terminal, a cockpit, a mixing desk) count toward the rut: at most one candidate from them.
- **On Operate and Read**, never take the world from a tool the audience operates; it comes back as a costume on a working screen. Take graphic traditions and places instead.
- Ask two more questions: what would this product be as a physical object? What did its world look like before the web?
- A brief that paints its own picture (the product's name is a metaphor) gets one candidate for the literal reading, at most.

## 2. Go wide, then choose

Turn the strongest three candidates into directions, each in two lines:
- **Idea and structure:** what leads and how the page or screen is built.
- **Look:** ground, ink, accent, type voice, shape, signature.

Then choose the one a design lead would fight for, not the safest. Before presenting, raise it: name the one discipline each other candidate has that it lacks (a palette's total commitment, a grid's density, a structural honesty) and add it, in one line each. A raise transfers discipline, never clothes: borrowing a button style or a display face from a losing direction is costume, not discipline.

On a Drip board these become the 2-4 directions (`drip_guide moodboard/directions`).

## 3. Axes: what to vary, and when

| Level | Vary | Hold fixed | Rule |
|---|---|---|---|
| **Directions** (the board) | world, ground, type voice, colour posture, density, shape, energy, what leads | the brief, the content, the job | each pair differs on 3+ axes |
| **Variants of one direction** (layout options, comps) | composition: what leads, symmetric vs. asymmetric, type-led vs. image-led, density, navigation model, where the signature sits | the world: palette, type, shape, motion | vary one axis per variant, so the comparison tells you something |
| **Iterations** (after feedback) | the one thing the user named | everything else | change one thing, show it, ask again |

Two variants that differ in everything are two unrelated designs; comparing them teaches nothing about the decision you are actually making.

## 4. Template skeletons to refuse

These arrangements read as generated whatever world paints them. Two of them in one plan means the plan is the template; start again from the idea.

| Skeleton | Instead |
|---|---|
| Split hero: headline and two buttons left, screenshot right, badge row under it | let the signature lead at its real scale; the action inside it |
| Centred headline over a row of three equal cards | structure from the content's own form: a list, a table, a timeline, a single large object |
| Hero, features, testimonials, pricing, CTA band, footer, in that order | the job's anatomy (`drip_guide brief`: where the action lives, what the category is built around, how it ends) |
| Three numbered steps (01 / 02 / 03) when the content is not a sequence | number only real sequences |
| A stats band of round numbers nobody supplied | proof in the category's form, or nothing |
| Label-and-value rows between hairlines as filler | a real table or a sentence |
| Closing band with an email field on a product that does not recur | repeat the primary action, or end on practical facts |
| Dark footer under a giant wordmark | a footer that carries what visitors look for there |
| Small grey labels above every heading (eyebrows) | the heading says it; a label only where it carries a fact |

## 5. Sketch each alternative's first viewport

Before any code, draw the first viewport of each direction in ASCII. It forces a real composition decision and makes sameness obvious.

Example brief: *invoicing for freelancers; Persuade; uniquely true: it chases late payments in your own voice, by email and SMS; rut: dashboard screenshot on a gradient.*

```
A · "Overdue"  (Editorial, committed red)
+--------------------------------------------------+
| ledgerly                              Start free |
|                                                  |
|  £4,180 is 23 days late.                         |  <- the late sum, set huge
|  ------------------------------------------------|
|  Acme Studio     INV-0142   23 days   Chase now  |  <- real overdue list as the hero
|  Bolt & Co       INV-0139   11 days   Chased 2x  |
|  Field Office    INV-0131    4 days   Reminder   |
|                                                  |
|  Ledgerly chases it in your voice.  [Start free] |
+--------------------------------------------------+

B · "Thread"  (Product-minimal, restrained)
+--------------------------------------------------+
| ledgerly            Product  Pricing  Start free |
|                                                  |
|  Get paid without the awkward email.             |
|                    +---------------------------+ |
|  [Start free]      | Email thread: 3 reminders | |  <- the chase conversation, live,
|  No card needed.   | written in your tone,     | |     each message appearing on a timer
|                    | client replies "paid!"    | |
|                    +---------------------------+ |
+--------------------------------------------------+

C · "Calendar"  (Swiss, full palette)
+--------------------------------------------------+
| ledgerly                              Start free |
| M  T  W  T  F  S  S                              |
| .  .  ■  .  .  .  .   ■ sent   ▲ reminder        |  <- a month grid: each invoice's life
| .  ▲  .  .  ▲  .  .   ● paid                     |     from sent to paid, colour-coded
| .  .  .  ●  .  .  .                              |
| Average time to paid: your number, after month 1 |
+--------------------------------------------------+
```

Three ideas about what leads (the late sum, the chase conversation, the time to paid), three worlds. The thumbnail test passes before a pixel is drawn.

## 6. The tests, applied to alternatives

| Test | Applied to the set |
|---|---|
| Thumbnail | at 200px wide, all directions are distinguishable from each other and from the category's top 3 sites |
| Category guess | none of them could be guessed from the category alone |
| Competitor swap | put the nearest competitor's name on each; any that still works gets reworked |
| Mirror | a neighbouring brief would not get the same set; if it would, change one major decision per direction |
| Memory | for each, write what a visitor describes an hour after one viewport; a mood means no signature yet |

## 7. The familiar option

Sometimes the right answer is the category standard, played straight and executed at the level of the category's best product. That is a legitimate destination, not a failure.

- Offer it honestly as one option when it fits ("the familiar route, done to the standard of the best in the category"), with its risk named: it will look like its neighbours.
- Never recommend it by reflex, and never let its presence soften the other directions.
- When the user takes it, convention becomes the commitment: ask for 2-3 products it should sit beside, make their craft the bar, and build it fully, without smuggled quirks.

## 8. Commit to a point of view

- **Recommend one.** Say which you would build and why, from the brief, with its honest risk in one clause.
- **Build the chosen one fully.** Not a safer version of it. The fit check exists to make it clear, not to dilute it.
- **Re-roll only on facts.** Change direction unasked only when it cannot carry the product's truth or task (it hides the action, it cannot hold the real data). Taste is never the grounds.
- **After two rejected rounds, ask what quality is missing** before generating more options.
- **A pin beats everything.** A look the user or brand pinned in words wins over the roll, the board and this guide. A product the user cites as an example sets the craft bar, not the look.

## Sources

Rewritten from **Impeccable** (Apache-2.0: seven candidates from the audience's cultural world across material families, the rut and its opposite, tools as costumes, the raise that transfers discipline not clothes, the familiar/canon option, re-roll only on factual grounds, pins win), **Hallmark** (MIT: go wide with three directions in two lines each and build the one a lead would fight for; the page you would make anyway; vary comps on one axis; the mirror test) and **Taste Skill** (MIT: one section, one idea; never two sections around one picture). Inspired by Anthropic's **frontend-design** (paraphrased): ideate layouts with short prose and ASCII wireframes, and use numbering only for real sequences.

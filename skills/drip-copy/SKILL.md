---
name: drip-copy
description: Use when writing or fixing any text in a UI (headlines, subheads, buttons, labels, nav, forms, errors, empty states, toasts, pricing, FAQ, microcopy), or when a page reads as AI-written or generic (eyebrow labels, "unlock/seamless/elevate", fake stats, numbered sections, captions that explain the UI, decorative badges and status dots). Part of Drip.
---

# Copy (Drip)

**Before you do anything: call `drip_guide` with topic `copy`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. The headline says what the product is and who it is for, in 8 words or fewer. It must fail the swap test: if a competitor could use it unchanged, rewrite it with a noun only this product has.
2. Buttons are a verb plus an object ("Send invoice", "Book a table"). Never "Submit", "Learn more", "Click here", or a bare "Get started" beside a better option.
3. No eyebrow labels (small uppercase text above a heading) and no 01/02/03 numbering unless the order is real (install steps, checkout).
4. Never invent numbers, customer counts, logos, quotes, ratings or awards. Use the user's real ones, or nothing.
5. Ban list: unlock, unleash, seamless, elevate, empower, supercharge, effortless, revolutionize, cutting-edge, next-gen, game-changing, robust, leverage, "in today's fast-paced world". Replace each with the fact it stands for.
6. No botsplaining: cut any caption or helper text that narrates what the UI visibly does ("This chart shows revenue over time").
7. Errors say what happened and what to do next, in one or two plain sentences. No "Oops", no exclamation marks, no blame, no raw codes as the message.
8. Empty states say what is empty and offer one action ("No invoices yet. Create your first invoice.").
9. Sentence case for every heading, button and label. No em dashes in UI copy; curly quotes and a real ellipsis (…).
10. One name per thing: the nav, the heading, the button and the toast use the same word.
11. Badges ("New", "Beta", "Live") and status dots only when bound to real state in the code.
12. Every visible form field has a visible label; placeholders show a format, never the label.

## Tools
- `fitcheck_lint` — flags slop words, fake stats, generic button labels, eyebrows and placeholder Latin in the code.
- `fitcheck_shot` — read the copy as a visitor sees it: headings and buttons alone should tell the story.

## Read deeper when
| Situation | Call |
|---|---|
| Rewriting AI-sounding copy (before/after for every common tell) | `drip_guide copy/slop-rewrites` |
| Buttons, forms, errors, empty, loading, success, confirmations, toasts, numbers | `drip_guide copy/microcopy` |
| Section order and what each landing section must say | `drip_guide landing` |
| App states (empty, loading, error, permission) in context | `drip_guide app` |
| Heading sizes and line length | `drip_guide type` |
| Labels, names and error announcements for assistive tech | `drip_guide a11y` |

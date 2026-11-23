# Brief questions: what to ask, how to ask, and when to stop asking

You get one message of questions, three at most. Spend them on the unknowns that change the build the most. Everything else you infer, state, and let the user correct. A user who has to answer a questionnaire before seeing anything stops trusting the process; a user who sees a confident reading of their request and can fix one line keeps going.

## The rules

1. **Scan first.** Never ask what the repo, the prompt or an earlier message already answers.
2. **Three questions, one message, then wait.** Use the harness's structured question tool when there is one; otherwise ask in plain text and stop.
3. **Assert, then invite correction.** "I'm reading this as a sign-up page for small accounting firms; correct me if it's for their clients" beats "Who is the audience?".
4. **Product questions only.** Never ask for colours, fonts, CSS values, or "which style do you like?". Taste is decided on the board, against real references.
5. **A second round only for a material gap** the answers exposed (a new audience, a missing constraint). Never a second round to confirm what you could assume.
6. **Facts are never inferred.** You may assume an audience or a tone; you may not assume a price, a customer count, a quote or a logo. Those go to the "absent" list.
7. **No one to answer?** (a headless run, a batch, "just go ahead"): do not ask. Write the assumptions block and continue.

## Pick the three: the question bank

Score each candidate: would two different answers produce two different builds? Ask only the top three.

### Every mode

| Question | Ask when | Skip when |
|---|---|---|
| Who reaches this, in what situation? | the prompt names no audience, or names a category ("businesses") | the repo's `PRODUCT.md` or README says |
| What must they do here, and what counts as success? | the job could be two things (sign up vs. book a demo) | there is one obvious action |
| What is true of this product that a competitor could not say? | the prompt is generic ("a landing page for my app") | the prompt already contains a distinctive fact |
| What real material can the page show: screenshots, photos, numbers, a quote with a name, logos you may use? | always on Persuade, unless already supplied | Operate screens that show the product's own data |
| What must not change? | the project has an existing look or the task is a redesign | greenfield |

### Persuade

- Who must act, and what should they believe first?
- Which proof earns that belief (a demo, a price, a customer, a number someone gave you)?
- Is there a hard launch date, campaign line or brand rule I must use?

### Operate

- What is the task, and how often is it done (once a quarter vs. 50 times a day)?
- What data does the screen hold at minimum, typically, and at worst?
- Which states matter most: first run, empty, error, permissions, bulk actions?

### Read

- What question does the reader arrive with?
- What is the source material and how is it structured today?
- How do readers move: search, a sidebar tree, linear chapters?

### Experience

- What leads: the work, a story, an interaction?
- How should exploration unfold: scroll, a grid, a single object?
- Which one moment must people remember?

## The one-message format

Lead with your reading of the request, then the questions, then the escape hatch.

> I'm reading this as a **Persuade** page for **independent bike shops** whose job is to **book a repair slot**. I'll keep your existing Tailwind tokens and the logo in `/public`.
>
> Three things before I start:
> 1. **Material:** what can the page show? Photos of the workshop, real prices, a review with a name? Without photos I'll use labelled stand-ins you replace later. I never invent numbers or quotes.
> 2. **What's true only of you?** For example same-day turnaround, a specific neighbourhood, a mechanic people ask for by name.
> 3. **The action:** is it booking a slot online, or calling the shop?
>
> Or say **go ahead** and I'll infer these and list what I picked.

- Do: put material first on Persuade. It shapes the page more than any other answer.
- Don't: offer a menu of styles ("minimal, bold or playful?"). That locks the direction before a single reference was studied.

## The assumptions block

When you do not ask (or the user says "go ahead"), put this at the top of your next message and in the brief's `Assumed:` line. One line per inference, each one correctable.

```
Assumed (say the word and I'll change any of these):
- Audience: independent bike shops' existing customers, on phones, booking between rides.
- Job: book a repair slot online; success = a confirmed slot.
- Mode: Persuade. Loop: full. Depth: new page inside the existing site.
- Keep: Tailwind tokens in app/globals.css, the logo, the nav.
- Absent: prices, reviews, opening hours (slots left for them, nothing invented).
```

## Worked examples

**Sparse prompt: "make a landing page for my app".**
Scan the repo: it is a habit tracker built with Expo and a Next.js marketing folder. Ask: (1) who it's for and the moment they open it, (2) what's true only of this tracker, (3) what you can show (App Store screenshots, a rating with a source). Assume the job is "download on iOS".

**Precise prompt: "pricing page for Ledgerly, three tiers, monthly/annual toggle, our brand is the green in globals.css, for accounting firms of 5-50 people".**
Audience, job, brand and structure are given. Ask nothing, or one question at most: "Are the tier prices final? I'll set the ones in `pricing.ts` and leave a slot for anything missing." Write the assumptions block and go.

**Operate prompt: "design the orders table for our admin".**
Scan: shadcn, Tailwind, an existing `DataTable`. Ask: (1) how many orders a typical user sees and the worst case, (2) the three actions done most often on an order, (3) which states matter (refunds pending, failed payments). Never ask about the look: the admin's system already decides it.

**Redesign prompt: "our site looks generic, redesign it".**
Use the redesign ask instead: (1) what must stay (brand, sections, a page, every word?), (2) what feels wrong, in your words, and what you want people to feel instead, (3) anything new to show. Offer depths in one line: polish (fix the tells), restyle (new system, same layout), full (new system and composition, same content and wiring).

## After the answers

- Fold every answer into the brief. Quote the user's own words for the uniquely-true line and any binding phrase.
- A user's answer that pins a look ("it must feel like a 1970s railway timetable") is a brief constraint: it wins over Drip's taste and over the slop list. Record it as a pin.
- A product the user cites as an example ("like Linear") sets the **craft bar**, not the look. Note it as a reference to study, not a style to copy.
- Answers that contradict the repo (they say "no dark mode", the code has a dark theme): name the conflict, say which side you will follow, and ask once.

## Sources

Rewritten from **Impeccable** (Apache-2.0: discovery rounds of 2-3 questions, assert-and-correct, never ask for CSS or aesthetic lanes, the reference product sets the craft bar) and **Hallmark** (MIT: ask once, material first, "go ahead" as the opt-out, facts never inferred, the redesign ask).

---
name: drip-brief
description: Use when any design task starts (a new page, screen, flow, component or redesign) or when a request is vague ("build a landing page", "make it look better", "design a dashboard for X"). Frames the audience, the surface's job and mode, brand truth, material and constraints, and reads the existing project before any visual decision. Part of Drip, step 1 of the designer loop.
---

# Brief (Drip)

**Before you do anything: call `drip_guide` with topic `brief`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

A brief is ten lines that make every later decision checkable. Without one, references, directions and
critique have nothing to be measured against, and the work drifts to the category default.

## Rules you must not break
1. Read the project before asking anything: `package.json`, the global stylesheet and `:root`, Tailwind config or `@theme`, `components.json`, `DESIGN.md`, `PRODUCT.md`, the component folder, font loading. Never ask what the repo already answers.
2. Ask at most 3 questions, in one message, chosen because their answers change the result most. Otherwise state your assumptions in one block and proceed.
3. Name the surface mode from the surface, not the product: Persuade, Operate, Read or Experience. A developer tool's pricing page is Persuade; a fashion house's help centre is Read.
4. Write the job as a verb plus an object the visitor does ("book a table for Friday", "find the failing deploy"). "Showcase the product" is not a job.
5. Write one sentence that is true of this product and false of its nearest competitor. If you cannot, that is your first question.
6. Inventory the material in three lists: real (facts given), pictures (what exists to show), absent (what must not be invented). Never invent a metric, quote, logo, price or customer count.
7. Never take a real brand's colours or fonts from memory. Read them from the project, the user, or the brand's own published CSS (`drip_guide brief/brand-truth`).
8. An established system wins. Existing tokens, components and `DESIGN.md` are extended, not replaced, unless the user asked for a redesign. Say which one you are doing and at what depth.
9. Never ask for CSS values, colours or "what style do you like?". Ask product questions; the look comes from references and the board.
10. Size the loop: new page, screen, flow or redesign = full loop; a tweak = short loop inside the existing `DESIGN.md`.
11. Write the brief (10 lines or fewer, template in the guide) before any search, and pass its first two sentences to `board_create`.

## Tools
- `drip_start` — open the task; it lists the guides this task requires.
- `drip_status` — see which gates are still open (guides, references, board, direction).
- `board_create` — once the brief is written: name plus the two-sentence brief (audience + job + mode + constraint).
- `palette_from_image` — when the brand exists only as a logo or a screenshot; extract instead of guessing.
- `fonts_search` — confirm a brand or project face exists and is licensed for the web before you plan around it.
- `drip_skip` — only when the user explicitly says to skip the design process; quote their words.

## Read deeper when
| Situation | Call |
|---|---|
| Choosing which questions to ask, or writing the assumptions block | `drip_guide brief/questions` |
| The prompt names a real brand, or the project has a logo, brand colours or brand fonts | `drip_guide brief/brand-truth` |
| Working inside an existing codebase, or the request is a redesign / restyle / polish | `drip_guide brief/project-scan` |

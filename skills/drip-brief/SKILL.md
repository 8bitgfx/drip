---
name: drip-brief
description: Use when any design task starts (a new page, screen, flow, component, logo or redesign) or when a request is vague ("build a landing page", "make it look better", "design a dashboard for X"). Reads the project first, then asks one round of at most 4 clickable questions (AskUserQuestion) with Drip's recommendation first, and records the answers with drip_brief; frames audience, job, mode, feel, ambition, material and constraints. Part of Drip, step 1 of the designer loop.
user-invocable: false
---

# Brief (Drip)

**Before you do anything: call `drip_guide` with topic `brief`.** It returns the full guide and records the read;
during a Drip task the hooks block UI writes until it is read. If `drip_guide` is not in your tools, load it: ToolSearch `select:mcp__plugin_drip_drip__drip_guide,mcp__plugin_drip_drip__drip_brief`.

A brief is ten lines that make every later decision checkable. Without one, references, directions and
the critic have nothing to measure against, and the work drifts to the category default. On full loops
`drip_brief` is a gate: research is blocked until it is recorded.

## Rules you must not break
1. Read the project before asking anything: `package.json`, the global stylesheet and `:root`, Tailwind config or `@theme`, `components.json`, `DESIGN.md`, `PRODUCT.md`, the component folder, font loading. Never ask what the repo, the prompt or an earlier message already answers.
2. One round, at most 4 questions, with AskUserQuestion. Never a second round unless an answer exposed a material gap.
3. Every question's options are specific to this request. **Option 1 is your recommendation, marked "(Recommended)"**, worded so one click accepts it. "Other" stays open.
4. The feel question offers opposed one-liners built from four axes: tone, aesthetic density, audience relationship, sensory ambition. Add "Surprise me (bold)".
5. Always ask about loves and hates. It is the one question where free text matters most.
6. Ambition is `bold` unless the user asked for plain, safe, conservative or "match our corporate site". Never infer conservative from the category.
7. Never ask for colours, fonts, CSS values or "which style do you like?" in words. Taste is decided on the board, against real references.
8. "Just do it" / "decide for me" / a headless run: ask nothing, write the assumptions block, and pass it as `assumptions`. That is not approval for paid or irreversible steps later.
9. Name the surface mode from the surface, not the product: Persuade, Operate, Read or Experience.
10. Write the job as a verb plus an object the visitor does. Inventory the material as real / pictures / absent; never invent a metric, quote, logo, price or customer count.
11. Never take a real brand's colours or fonts from memory (`drip_guide brief/brand-truth`). An established system is extended, not replaced, unless the user asked for a redesign.
12. Call `drip_brief` right after the answers, before any search.

## Tools
- `drip_start` — open the task; it picks the mode and lists the guides this task requires.
- `drip_brief` — record what, audience, job, feel[], loves, hates, ambition (bold | balanced | conservative), constraints, assumptions.
- `drip_status` — which gates are still open.
- `board_create` — later, once references are studied; the brief fills its header.
- `palette_from_image` — when the brand exists only as a logo or a screenshot; extract instead of guessing.
- `fonts_search` — confirm a brand or project face exists and is licensed for the web.
- `drip_skip` — only when the user explicitly says to skip the design process; quote their words.

## Read deeper when
| Situation | Call |
|---|---|
| Writing the 4 questions, the feel options, or the assumptions block | `drip_guide brief/questions` |
| The prompt names a real brand, or the project has a logo, brand colours or brand fonts | `drip_guide brief/brand-truth` |
| Working inside an existing codebase, or the request is a redesign / restyle / polish | `drip_guide brief/project-scan` |

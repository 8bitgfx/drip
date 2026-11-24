# Brief: framing the work before designing it

A good brief fits on one screen and settles what a design lead settles before opening a canvas: who arrives, in what situation, to do what; what the surface is for (its mode); how it should feel and how far it should reach (its ambition); what is true of this product and no other; what real material exists and what does not; what must stay untouched. It comes from reading the project first and then asking the user one short round of clickable questions, each with Drip's recommended answer ready to accept, so the person spends ten seconds and every answer changes the work. References are searched from it, directions are judged against it, the critic reads it, and the hand-off asks "did the build do the brief's job?". A brief that could describe any product in the category is not a brief yet.

---

## The procedure

1. **Open the task.** `drip_start` with the user's request in their words. Note the mode and the guides it lists.
2. **Read the project first** (`drip_guide brief/project-scan`). Stack, tokens, fonts, components, icon family, motion library, `DESIGN.md`, `PRODUCT.md`, existing copy, the pages around this one. Decide the project's visual maturity: **established**, **incomplete** or **none**. Write one line on what you found.
3. **Name the mode** from the requested surface (table below) and draft your reading of the brief: scene, job, uniquely-true line, material.
4. **Find the frontier.** List what you still don't know whose answer would change the build. Drop everything the repo or the prompt answers. Keep the top 4 at most.
5. **Ask one round** with AskUserQuestion (`drip_guide brief/questions`): options specific to this request, your recommendation first, "Other" open, loves/hates always included.
6. **Record**: `drip_brief` with the answers. Unanswered or delegated parts go in `assumptions`.
7. **Check brand truth** if a real brand is involved (`drip_guide brief/brand-truth`).
8. **Write the brief** with the template below (under 10 lines) and show it in 3-4 lines, not the whole template. Then move to references (`drip_guide refs`).

---

## The craft

### 1. Never ask what you can look up

Facts are your job; decisions are the user's. Before writing a question, check whether the answer is in the repo, the prompt, an earlier message, or a quick search.

| Don't ask | Look here instead |
|---|---|
| "What stack / framework?" | `package.json`, config files |
| "Do you have brand colours or fonts?" | `:root`, `@theme`, `tailwind.config`, `layout.tsx` font imports, `/public` logos |
| "Do you have a design system?" | `components.json`, `components/ui`, `DESIGN.md`, Storybook |
| "What does the product do?" | `README`, `PRODUCT.md`, the existing pages, the app's own copy |
| "Light or dark?" | the scene sentence decides; ask only if the scene can't |

- Do: open the round with what you found. "Next.js + Tailwind v4, your green `#0F7B5F` and Söhne are in `globals.css`; I'll keep them."
- Don't: make the user retype what's in their own repo.

### 2. The four questions

One round, at most four, each with 2-4 options plus "Other". Skip any the request already answers.

| # | Question | Options are | Ask when |
|---|---|---|---|
| 1 | What is it? | 2-4 concrete readings of the request | only when it's genuinely ambiguous |
| 2 | Who is it for, and what should they do? | 3-4 audience + job pairs you infer from the repo and prompt | the audience or the action could go two ways |
| 3 | Which feel? | 3-4 opposed one-liners from the four axes, plus "Surprise me (bold)" | almost always on a full loop |
| 4 | Anything you love or hate? | common answers for this kind of work + "No preference"; "Other" invites links and names | always |

**Recommendation first.** Option 1 of every question is what you would choose, labelled "(Recommended)" with a reason of a few words. A user who agrees with you clicks four times and is done.

### 3. The four feel axes

Build the feel options by picking opposed poles on these axes. Each option is a vivid one-liner that says what it looks like, not a mood word.

| Axis | Poles |
|---|---|
| **Tone** | professional · conversational · playful · provocative |
| **Aesthetic density** | editorial-restrained · polished-standard · controlled-maximalist · expressive-maximalist |
| **Audience relationship** | authority · peer · companion · coach |
| **Sensory ambition** | still and exact · one orchestrated moment · tactile and responsive · cinematic |

Choose by asking **"what does this audience already get too much of?"** Developers drown in dark, mono, terminal pages; wellness buyers in sage and beige; fintech in navy trust-blue. Recommend away from the surplus.

Example option set for a portfolio for an AI model:
- "Loud & playful: huge kinetic type, saturated colour, one moment of motion (Recommended: nobody screenshots a quiet portfolio)"
- "Editorial & exact: a catalogue of the work, big numbers, strict grid"
- "Warm companion: hand-made details, conversational voice, soft colour"
- "Surprise me (bold)"

### 4. Ambition

| Value | When | What it changes |
|---|---|---|
| `polished` (default) | always, unless the user said otherwise | beautiful, Dribbble-level craft: proven structure, one rich picture, calm type, smooth motion; the critic scores appeal and polish |
| `bold` | the user asked for loud, playful, experimental, brutalist | a signature risk is welcome, still beautifully made |
| `conservative` | the user asked for plain, safe, corporate, or to match an existing site | the category standard done perfectly; ambition shows as precision |

Operate and Read surfaces are still `bold`; on them, bold means precision, density and one signature move, not spectacle (`drip_guide rules/ambition`).

### 5. Modes: what success looks like on this surface

Choose from the surface, not the company.

| Mode | The visitor | Success | Ambition shows as | Typical surfaces |
|---|---|---|---|---|
| **Persuade** | decides and acts | understands the offer in 5 seconds and acts | a bold, specific world | landing, pricing, campaign, launch, store front |
| **Operate** | completes a task, often daily | task done fast, no errors | precision, density, one signature move | dashboard, admin, editor, settings, inbox |
| **Read** | wants to understand something | finds the answer, reads comfortably | a frame the brand owns around a calm column | docs, article, help centre, changelog |
| **Experience** | is inside the work | the work leads from the first viewport | the interface recedes, the artifact performs | portfolio, gallery, showcase, game |

- Do: call a docs index Read, a SaaS homepage Persuade, the app behind login Operate.
- Don't: give an admin table the treatment of a launch page, or a launch page the reticence of an admin table.

### 6. Audience: write the scene, not a persona

One sentence: **who, where, on what device, in what state, how often.**

> "A shift lead at a warehouse, on a 10-inch tablet in a bright loading bay, checking which trucks are late, 30 times a shift."

That sentence decides things: bright bay means light theme and 44px+ targets; 30 times a shift means density over delight. "Users who want to manage logistics" decides nothing.

### 7. The job: one verb, one object

| Job | Where the action lives | What the page is built around |
|---|---|---|
| sign up (software) | nav + hero; install command for dev tools | the product at work, code sample, pricing |
| buy (product, shop) | the product with price and options | range with prices, product in use, delivery facts |
| book (restaurant, clinic) | a picker from nav and hero | the room, the menu or timetable, how to find it |
| attend (event) | tickets in the nav; date and place are the headline | lineup, schedule, venue |
| hire (studio, freelancer) | plain contact in nav and after the work | the work as an index with one case opened |
| operate (any app screen) | the primary action of the task | the object the tool is known by: queue, ledger, timeline |

Proof comes in the category's own form (a menu, a lineup, a changelog, a diff), never a generic band of numbers.

### 8. Uniquely true, and the rut

Write the one fact a neighbour could not claim. Then write **the page this category always ships** and **its predictable opposite**. Both are off the table unless the brief pins them.

| Category | The rut | Its lazy opposite |
|---|---|---|
| AI tool | near-black, glowing orb, centred hero, "Supercharge" | cream paper and a serif "for humans" |
| Fintech | navy and trust-blue, tilted 3D card | neon-on-black crypto |
| Developer tool | dark, mono labels, terminal hero | pastel illustrations |
| Wellness | sage and beige, rounded everything | loud neon "energy" |
| Portfolio | name huge, three project cards, "Let's talk" | the same in cream and a serif |

### 9. Material and constraints

| List | Holds | Rule |
|---|---|---|
| real | name, claims, numbers, prices, places, dates, named quotes, logos the user may use | use verbatim, large |
| pictures | the user's photos, real product screenshots, licensed photos | the page is shaped by what it can show |
| absent | every proof nobody gave: metrics, testimonials, logo walls | never invent; leave a labelled slot or design without it |

Record only binding constraints: platform, stack, accessibility level (AA default), languages, what must stay untouched. For Operate, record content ranges (minimum, typical, maximum) and the states that matter.

### 10. The brief template

```
Brief: <surface name>
Mode: <Persuade | Operate | Read | Experience> · Loop: <full | quick> · Ambition: <bold | balanced | conservative>
Scene: <who, where, device, state, frequency>
Job: <verb + object>; success = <observable outcome>
Feel: <the chosen option(s), in the user's words>
Loves / hates: <names, links, "no dark mode">
Uniquely true: <one sentence a competitor could not claim>
Rut to avoid: <the category default> / <its lazy opposite>
Material: real <…> · pictures <…> · absent <…>
Keep / constraints: <tokens, components, routes that stay; platform, a11y, ranges>
Assumed: <every inference, so the user can correct it>
```

The `drip_brief` call carries the same content: `what`, `audience` (the scene), `job`, `feel`, `loves`, `hates`, `ambition`, `constraints`, `assumptions`.

---

## Slop tells in briefs (and the fix)

| Tell | Fix |
|---|---|
| Asking what the repo already says (stack, colours, fonts) | Read it; open the round with what you found |
| Eight questions, or two rounds | One round, four at most; assume the rest |
| Options like "Modern / Minimal / Bold" | Vivid one-liners from the four axes that say what it looks like |
| No recommendation, or the recommendation buried last | Option 1, labelled "(Recommended)", with a reason |
| No loves/hates question | Always ask it; it's where the user's real taste shows |
| Ambition set to conservative because "it's a bank" | Bold unless the user asked; bold on Operate means precision |
| Audience is "users" or "businesses" | The scene sentence: who, where, device, state, frequency |
| Job is "showcase", "highlight", "present" | A verb the visitor performs |
| Proof planned before anyone supplied it | Move it to absent |
| "Decide for me" treated as approval for paid generation later | Assumptions cover the brief only; ask before paid or irreversible steps |

---

## Done when

- [ ] The project was read and the round opened with what was found.
- [ ] One round of at most 4 AskUserQuestion questions, each with request-specific options, the recommendation first, "Other" open, loves/hates included; or the assumptions block, if the user delegated.
- [ ] `drip_brief` was called with what, audience, job, feel, loves, hates and ambition (bold unless the user asked otherwise).
- [ ] Mode, scene, job, uniquely-true line, rut and material are written; nothing in "absent" appears in the plan.

---

## Reference files

- `brief/questions` — building the 4 questions and their options, feel-axis option sets by surface, the assumptions block, worked examples.
- `brief/brand-truth` — what counts as a brand, how to capture real brand values safely, recording a brand spec.
- `brief/project-scan` — where tokens, fonts and components live per stack, maturity, redesign depths.

## Sources

Adapted and rewritten from: **Impeccable** (Apache-2.0): surface modes, the scene sentence and light/dark from physical context, product truth vs visual decisions, content ranges and states. **Hallmark** (MIT): material first, real/pictures/absent, job anatomy by category, never inventing proof, brand truth. **UI UX Pro Max** (MIT): category must-haves. **Taste Skill** (MIT): the kind of business decides the page. New in 0.3: **mattpocock/skills grilling** (MIT): ask the frontier, a recommended answer for each question, facts are the agent's job and decisions the user's; **julianoczkowski/designer-skills design-brief** (Apache-2.0): scan the codebase before asking; **rampstackco/claude-skills creative-direction** (MIT): the four feel axes and "what does the audience already get too much of?"; **neonwatty/logo-designer-skill** (MIT): summarise what you found, then ask only what's missing. Ideas only (no licence, paraphrased): **ziguishian/brand-design-skill**: "decide for me" is not consent for later gates.

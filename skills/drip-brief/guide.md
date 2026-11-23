# Brief: framing the work before designing it

A good brief fits on one screen and settles the questions a design lead would settle before opening a canvas: who arrives, in what situation, to do what; what the surface is for (its mode); what is true of this product and no other; what real material exists and what does not; what must stay untouched; and how big the job is. Every later step reads it. References are searched from it, directions are judged against it, and the fit check asks "did the build do the brief's job?". A brief that could describe any product in the category is not a brief yet.

---

## The procedure

1. **Open the task.** `drip_start` with the user's request in their words. Note the guides it lists.
2. **Read the project first** (`drip_guide brief/project-scan`). Stack, tokens, fonts, components, icon family, motion library, `DESIGN.md`, `PRODUCT.md`, existing copy. Decide the project's visual maturity: **established**, **incomplete** or **none**.
3. **Size the job.** New page, screen, flow, or a replacement look = full loop. A change inside an existing surface (a button, a spacing fix, one new card) = short loop: skip references and the board, follow `DESIGN.md`, still run the fit check.
4. **Name the mode** from the requested surface (table below).
5. **Inventory the material**: real / pictures / absent.
6. **Ask or assume.** Up to 3 questions in one message (`drip_guide brief/questions`). If the prompt already answers them, or no one can answer (a headless run), write the assumptions block instead and continue.
7. **Check brand truth** if a real brand is involved (`drip_guide brief/brand-truth`).
8. **Write the brief** with the template below. Keep it under 10 lines.
9. **Create the board**: `board_create` with a short name ("Ledger pricing page") and the brief's first two sentences. Then move to references (`drip_guide refs`).

---

## The craft

### 1. Modes: what success looks like on this surface

Choose from the surface, not the company. One product has surfaces in several modes.

| Mode | The visitor | Success | Ambition shows as | Typical surfaces |
|---|---|---|---|---|
| **Persuade** | decides and acts | they understand the offer in 5 seconds and take the action | a bold, specific world; the design is the product | landing, pricing, campaign, launch, waitlist, store front |
| **Operate** | completes a task, often daily | task done fast, no errors, nothing to learn | precision, density, consistency, one signature move | dashboard, admin, editor, settings, tool, inbox |
| **Read** | wants to understand something | finds the answer and reads comfortably | a frame the brand owns around a calm column | docs, article, guide, help centre, changelog |
| **Experience** | is inside the work | the work leads from the first viewport | the interface recedes, the artifact performs | portfolio, gallery, showcase, game, campaign film |

- Do: call a docs index Read, a SaaS homepage Persuade, the SaaS app behind login Operate.
- Don't: give an admin table the expressive treatment of a launch page, or a launch page the reticence of an admin table.

The mode sets how far the world may reach (see `drip_guide direction`): on Persuade it may own the page; on Operate it lends type, palette, density and one signature move; on Read it owns the frame and leaves the column calm.

### 2. Audience: write the scene, not a persona

One sentence: **who, where, on what device, in what state, how often.**

> "A shift lead at a warehouse, on a 10-inch tablet in a bright loading bay, checking which trucks are late, 30 times a shift."

That sentence decides things. Bright loading bay: light theme, high contrast, 44px+ targets. 30 times a shift: density and speed over delight. Compare "users who want to manage logistics", which decides nothing.

- Do: let the scene force light versus dark. Dark is never a default; a physical scene picks it (night use, media, a studio, a terminal habit).
- Don't: let adjectives about the product's behaviour ("calm coaching", "quiet support") set the surface's energy. They describe the product, not the page.

### 3. The job: one verb, one object, one place

| Job | Where the action lives | What the page is built around | How it ends |
|---|---|---|---|
| sign up (software, API) | nav + hero, terms in one line under it; install command for dev tools | the product at work, named moments, code sample, pricing | the action again, or the code sample |
| try (app, game, tool) | store or download buttons under the head | key art or real screens, before/after | download beside one last screen |
| buy (product, shop) | the product with price and options, often the hero | range with prices, product in use, how it is made, delivery facts | the offer again |
| book (restaurant, clinic, class) | a picker (party, date, time) from nav and hero | the room or food, the menu or timetable, how to find it | hours, address, booking |
| visit (venue, shop, gallery) | today's hours and address, high up | what is on now, what is coming, getting there | visit information |
| attend (event, conference) | tickets in the nav; date and place are the headline | lineup, schedule, tiers, venue | tickets again |
| subscribe (newsletter, podcast) | the field is often the hero | a sample issue or the latest episode, the archive | the archive or a second field |
| hire (studio, freelancer) | plain contact in nav and after the work | the work as an index with one case opened | contact details |
| operate (any app screen) | the primary action of the task, top right or inline | the object the tool is known by: the queue, the ledger, the timeline | n/a: states, not an ending |

Proof comes in the category's own form (a menu, a lineup, a changelog, a diff), never a generic band of numbers.

### 4. Uniquely true, and the rut

Write the one fact a neighbour could not claim: a mechanism, a place, a material, a number, a ritual. Then write down **the page this category always ships** and **its predictable opposite**. Both are off the table unless the brief pins them.

| Category | The rut | Its lazy opposite |
|---|---|---|
| AI tool | near-black, glowing gradient orb, centred hero, "Supercharge" | cream paper and a serif "for humans" |
| Fintech | navy and trust-blue, card mockup tilted in 3D | neon-on-black crypto |
| Developer tool | dark, mono labels, terminal in the hero | pastel illustrations |
| Wellness | sage and beige, rounded everything, soft photos | loud neon "energy" |
| Restaurant | full-bleed food photo, script logo, cream | brutalist black boxes |

### 5. Material: real, pictures, absent

| List | Holds | Rule |
|---|---|---|
| real | name, claims given, numbers given, prices, places, dates, quotes with names, logos the user may use | use them verbatim, large |
| pictures | the user's photos, screenshots of the real product, the product running locally, licensed library photos | the page is shaped by what it can show |
| absent | every proof nobody gave: metrics, testimonials, logo walls, customer counts | never invent; leave a labelled slot or design without it |

A page with strong pictures leads with them. A page with no pictures is carried by type, facts and colour, and that is a legitimate design, not a gap.

### 6. Constraints and ranges

Record only the binding ones: platform (web, iOS, Android), stack, accessibility level (AA default; AAA for public services and healthcare), languages and RTL, performance budget, what must remain untouched. For Operate surfaces, record content ranges: **minimum, typical, maximum** (0 rows, 40 rows, 40,000 rows; a 6-character name and a 60-character one) and the states that matter: empty, loading, error, partial, permission denied, overflow.

### 7. What the category cannot ship without

Some categories have must-haves the visitor expects. Missing one reads as broken, however good it looks.

| Category | Must have |
|---|---|
| API / developer portal | findable endpoints, copy-paste code samples, auth flow, version switch |
| Status page | service matrix, incident timeline, maintenance schedule |
| Changelog | dated, chronological entries, version tags, breaking-change warnings |
| Analytics dashboard | filters with visible scope, export, empty and loading states |
| Map tool | legend, attribution, a text alternative, colour-blind-safe ramps |
| Clinic, legal, government | contact and hours above the fold, credentials, AA/AAA contrast |
| E-commerce | price with options, delivery and returns facts, real product photos |
| Open-source project | install command, licence, repo link, contributor proof |
| Event | date, place and tickets in the first viewport |
| Booking (any) | the next available slots as real buttons, not a "Book now" link to elsewhere |

### 8. Brand truth (summary)

A brand is something chosen: a logo file, named tokens, a font the project ships, values the user states. A framework default (shadcn zinc, Tailwind indigo-500, Inter everywhere) is not a brand and may be replaced. Real brand values come from the project, the user or the brand's own CSS, never from memory. Full protocol: `drip_guide brief/brand-truth`.

### 9. The brief template

```
Brief: <surface name>
Mode: <Persuade | Operate | Read | Experience> · Loop: <full | short> · Depth: <new | extend | polish | restyle | full redesign>
Scene: <who, where, device, state, frequency>
Job: <verb + object>; success = <observable outcome>
Uniquely true: <one sentence a competitor could not claim>
Rut to avoid: <the category default> / <its lazy opposite>
Material: real <…> · pictures <…> · absent <…>
Keep: <tokens, components, copy, routes that stay>
Constraints: <platform, stack, a11y level, languages, ranges, states>
Assumed: <every inference, so the user can correct it>
```

- Do: write facts and decisions. "Light theme: used in a lit warehouse."
- Don't: write moods. "Modern, clean, professional" decides nothing and every product claims it.

---

## Slop tells in briefs (and the fix)

| Tell | Fix |
|---|---|
| Audience is "users" or "businesses" | Write the scene sentence: who, where, device, state, frequency |
| Tone is "modern and clean" | Delete it. Tone comes from the board, chosen against references |
| Job is "showcase", "highlight", "present" | Write what the visitor does: a verb they perform |
| Eight questions in a numbered list | Three at most; assert the likely reading of everything else |
| Asking "what colours/fonts do you like?" | Ask about audience, job and material; show options on the board instead |
| Proof planned before anyone supplied it ("stats band", "logo wall") | Move it to absent; design a slot or a proof in the category's own form |
| Skipping the project scan and proposing a new palette | Scan, then state what is preserved and what is introduced |
| Brand blue "from memory" | Read it from a source and record where it came from |
| Mode picked from the company ("it's a SaaS, so modern-minimal") | Pick it from the surface; one company has surfaces in all four modes |

---

## Done when

- [ ] The project was read and the brief states what is preserved and what is introduced.
- [ ] Mode, loop size and depth are named.
- [ ] The scene sentence names who, where, device, state and frequency.
- [ ] The job is a verb plus an object with an observable success.
- [ ] One uniquely-true sentence and one named rut are written.
- [ ] Material is split into real / pictures / absent, and nothing in "absent" appears anywhere in the plan.
- [ ] At most 3 questions were asked, or every assumption is listed.
- [ ] `board_create` was called with the brief.

---

## Reference files

- `brief/questions` — the question bank by mode, the one-message format, the assumptions block, worked examples.
- `brief/brand-truth` — what counts as a brand, how to capture real brand values safely, recording a brand spec.
- `brief/project-scan` — where tokens, fonts and components live per stack, maturity, redesign depths.

## Sources

Adapted and rewritten from: **Impeccable** (Apache-2.0): surface modes, the scene sentence and light/dark from physical context, shaping interviews (2-3 questions per round), product truth vs visual decisions, content ranges and states. **Hallmark** (MIT): ask-once with material first, real/pictures/absent inventory, job anatomy by category, never inventing proof, brand truth. **UI UX Pro Max** (MIT): category must-haves from its product reasoning data. **Taste Skill** (MIT): the kind of business decides the page, one main action. Inspired by Anthropic's **frontend-design** (paraphrased): ground the design in the subject's world and propose subject, audience and job when the brief lacks them.

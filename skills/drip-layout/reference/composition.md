# Composition: pages and sections

Decide what each section must show, then choose the arrangement that shows it best. Composition is content
first: a menu looks like a menu, a comparison like a table, a product like a big picture of the product. The
template look comes from the opposite order (pick "hero, features, testimonials, CTA", then pour content in).

## Plan the page as a list

Before building, write one line per section:

```
1. Hero — Split 5/7: headline + one line + Start free; the editor screenshot, big.
2. Proof — Rows: three customer outcomes with real numbers, logos inline.
3. How it works — Pinned: one screenshot on the right changing through 3 steps.
4. Pricing — Table: 3 tiers, monthly/yearly switch.
5. Close — Band: the hero's action again beside one last screenshot.
```

Check the list: does each section have one idea and real content? Is any composition used twice in a row? Does
it read as a story if you only read the headings? Six to nine sections for a full landing page; fewer is fine
when the content is thin. Never pad.

## Section compositions

| Composition | Shape | Use for | Rules |
|---|---|---|---|
| **Split** | text block beside a visual (5/7, 4/8, 6/6) | a claim and its proof | text and visual centred on each other within ~60px; visual 440px+ tall on desktop; keep the same side throughout, vary the ratio |
| **Showcase** | head block, then one visual across the container (16:9 to 21:9) | the product itself, a hero photo | 560px+ tall; at most two smaller visuals beneath (8+4 or 7+5), never three equal frames |
| **Grid** | 3-4 items across (or 2x2) | products, plans, people, rooms | each item has a real image, a large figure or a strong title; equal heights; 240px+ tall |
| **Bento** | 4-6 tiles in mixed spans (8+4 over 4+4+4, or 7+5 over 5+7) | a product with several distinct capabilities | one lead tile, at least two with real visuals, rows 280-360px; no empty decorative tiles |
| **Rows** | 3-6 full-width rows parted by hairlines | features, FAQ, an index, a timeline | title on the left columns, detail on the right; 72-120px per row |
| **Table** | real table, full width | comparisons, specs, pricing details | horizontal rules only, tabular numbers, the naming column one weight heavier |
| **Figures** | 3-4 numbers across, parted by hairlines | real metrics the user gave | only real numbers; never invented stats |
| **Steps** | 3-4 stages in a real `<ol>` | a process the user actually goes through | only for true sequences; each step with a visual if there is one |
| **Statement** | one sentence set large across 8-10 columns | a mission line, a quote, a pivot | once per page; 2-3 lines |
| **Band** | a full-width change of background holding one thing | a call to action, a booking widget, a store link | the container stays; never an email capture by default |
| **Pinned** | sticky visual on one side, 3-4 short panels scrolling past | explaining a product in steps | unpins under 1024px |
| **Switcher** | one area with 2-5 states behind a segmented control | plans by month/year, menu by lunch/dinner, app on phone/desktop | every state real; the first one visible without script |
| **Rail** | horizontal row past the container edge, scrollable | issues, episodes, products, dates | 5+ items, the next one cut by the edge, keyboard scrollable, scroll snap |
| **Index** | dense list with facts in columns | projects, releases, episodes, documents | 6-20 rows, the lead row larger |

Under 1024px every composition stacks in reading order: head block, then body; a split's visual after its text;
grids go 2-up then 1-up; a rail stays a rail; a pinned pair unpins.

## Heroes

Pick by what the product has to show, not by habit. Text-beside-a-picture is the most generated hero; take it only
when the picture is the strongest thing you have.

| Hero | Layout | Use when |
|---|---|---|
| **Stage** | text on 5 columns, big visual on 7 (60-75% of the screen tall) | a strong product screenshot or object |
| **Showcase** | short headline above, the product across the full container below | a product that looks good wide (an editor, a dashboard, a car) |
| **Poster** | full-bleed photo or art, text on its calm area | places, food, travel, events, film |
| **Statement** | big type alone, maybe one small visual | a service, a manifesto, when no picture beats the words |
| **Counter** | the action is the visual: the signup field with the latest issue, the booking times, the buy box | newsletters, booking, a single product for sale |
| **Index** | the list is the hero: lineup, menu, catalogue | the list is why people come |
| **Banner** | compact (50-60% of the screen), content starts above the fold | docs, utilities, internal tools |

Hero rules:
- Headline 7 words or fewer reads best; one supporting sentence; one or two actions (one filled).
- On desktop the visual is big: 6-7 columns wide and 520px+ tall at 1440x900, or a portrait object at 75% of the height.
- Text-to-visual gap 48-120px; on phones it becomes a 32-40px row gap.
- Space below the hero content 1.0-1.5x the space above it when the hero fills the screen.
- No captions under hero images, no floating stat cards stacked on the screenshot, no "trusted by" strip without real logos.

## Rhythm and variety

- **Never the same composition twice in a row.** Split, split, split reads as a template however good each is.
- **No zigzag.** Alternating image left/right every section is the most recognisable template rhythm. Keep the visual on one side and vary the ratio, or use other compositions.
- **Heavy, then light.** A dense section (grid, table, bento, index) is followed by a calm one (statement, showcase).
- **Pictures share the page.** Photos or screenshots carry roughly a quarter to a third of the page below the hero and do not lead two sections in a row.
- **Each screen has a reason.** Scroll at 1440x900: every screenful should hold something big enough to look at. A screen holding only a heading and a line wants a bigger visual, a statement, or a merge.
- **The close is the job.** End on the thing people came to do (the action again beside a last visual, the booking, the download), not a generic "Ready to get started?" band.

## Anatomy rules that apply everywhere

- **Head block:** heading on the left edge, at most one line under it, 16-24px between, 32-64px to the content. Centred only above a symmetric body.
- **The body fills the width:** its widest row spans most of the container. Short text alone on one half is a hole; pair it with a visual or make it a statement.
- **Lists of things** with fewer than 3 items or more than 8 want a different composition (a statement for 1-2; rows, a table or an index for 9+).
- **Equal things look equal; unequal things look unequal.** Three plans of different importance are not three identical cards: give the recommended one a word and the primary button, not a different colour card.
- **Footer** 200-400px: the real links in columns, the legal line, maybe one closing line. Not a second sitemap of invented pages.
- **Nav** one line, 56-72px tall, sized to the real destinations; the logo links home; one action button at most.

## Product UI composition

App screens compose differently: no heroes, no sections. Layout is regions (navigation, toolbar, content, detail
panel) and the task flows through them. See `drip_guide layout/density`.

## Slop tells

| Tell | Fix |
|---|---|
| Hero, three feature cards with icons, testimonials, CTA band, footer | Plan from content; use Rows, Showcase, Pinned, Table, Index |
| Three identical cards of icon + heading + two lines | Rows with real detail, or a Bento with real visuals |
| Zigzag image/text sections | One side, varied ratios, or other compositions |
| Fake stat strip ("10x faster", "99.9% uptime") | Only real numbers the user gave, or remove |
| "01 / 02 / 03" over non-sequential items | Remove numbers; use a real `<ol>` only for real steps |
| Bento with empty gradient tiles | Every tile carries real content, one lead |
| Everything centred in a narrow column | Left edge, body filling the width |
| Logo cloud with placeholder logos | Real logos with permission, or nothing |
| "Ready to get started?" band at the end of every page | Close with the page's actual job |

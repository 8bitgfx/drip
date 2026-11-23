# Landing: sections

Every section below the hero does one job, shows one real picture, and hands the visitor to the next question they would ask. Tell the page as a story: say what it does, show it, prove it, answer the doubts, ask again.

## The section scaffold

Learn it once and repeat it so the page reads as one system:

- **Head:** the h2 on the left line (one or two lines), optionally one line of 10 to 40 words under it, optionally one text link at the right on the h2's baseline. 48 to 64px to the content.
- **Content:** one composition (below). Pictures take a real share: half the section or more.
- **Padding:** the same top and bottom values on every section (see the grid table in the guide).
- **One action at most** besides the main one. The main action's filled button appears only in the nav, hero, close and phone bar.

## Default orders

| Kind | Order |
|---|---|
| Software | nav, hero (+ docked logos), app frame, 2 or 3 feature sections in different layouts, integrations, proof, pricing, FAQ, close + footer |
| Physical product | nav, hero, the range, 2 or 3 feature sections (one benefit each, each its own composition), specs, proof, FAQ (≤ 5), close + footer |
| Service | nav, hero, services list with prices from, the work, how it goes (steps), people, proof, booking or contact form, close + footer |
| Place | nav, hero, visit (address, hours, directions) as screen two, the offer (menu, rooms, goods), the place, orders or booking, close + footer |
| Game | nav, hero (name + key art), trailer, the world (full bleed), what you do (one verb per card), platforms and editions, FAQ, close + footer |

## Section types, good and bad

### Navigation
- **Good:** one opaque bar, 56 to 80px tall, logo left linking home, 3 to 6 words that go to sections on this page, the main action as the one filled button on the right. Sticky only if it stays short; `scroll-padding-top` set to its height so anchors land correctly. Full-screen menu on phones with the main action inside it.
- **Bad:** a see-through nav over a busy hero, 9 links, "Product ▾ Solutions ▾ Resources ▾" mega menus on a 5-section page, two filled buttons (Sign in and Sign up both loud).
- A mega menu earns its place only with many real destinations; give it one picture card, not a wall of icons.

### Logo row (proof, light)
- **Good:** "Clinics using Ferrow", then up to six real customer logos, 24 to 32px tall, in their own colours, still, evenly split (3+3, never 5+1). Docked in the hero or merged into the section above.
- **Bad:** "Trusted by 10,000+ teams worldwide" over greyed-out logos of companies that never agreed, a marquee, a strip section of its own.

### App frame (software, required once)
- **Good:** one product window across the container: the list on the left (9+ real rows), the open item on the right (a diff with its comment, a thread, an invoice), both panes running past the frame's bottom under a fade. The h2 names what the window shows; one line says the steps in the order the window shows them.
- **Bad:** one small card centred on a pastel panel; two boxes side by side with page ground between them; a pane that ends in empty white; the kit's sample rows.
- See `drip_guide productshots` for crops, fidelity and placeholder rules.

### Features
Pick by how many ideas and how equal they are. Neighbours never share a layout.

| Layout | Use for | Rules |
|---|---|---|
| **Split (text left, picture right)** | One capability with a picture that shows exactly it | Text on 5 columns: h2, 2-3 sentences at 18-20px, up to three short facts, one link. Picture on 6 columns, cut by its frame, never floating. |
| **Bento** | One lead feature and three or four smaller | Lead tile spans 8 of 12 columns (or 2 rows); one loop per bento; copy in the same place in every tile. Plan with `drip_guide productshots/bento`. |
| **2x2** | Four features of equal weight | Each card: title (verb + object), two lines, a panel with one cropped fragment. No buttons in the cards. |
| **Tabs tour** | 3 to 5 views of the same product (software only) | Click to switch, never auto-rotating; the active tab's picture changes; deep-linkable. |
| **Chapters / pinned steps** | A flow told across several screens | Steps listed beside one sticky frame that changes; works without scroll effects too. |
| **Detail strip** | Physical products, crafts | Four 1:1 close-ups from line to line under the text: hands, tools, materials, parts. |

- **Good card:** barely-there container (one step off the page, 1px hairline at 8 to 14% ink), 24 to 32px padding, title one line, body 16px in full ink (not small grey), a panel holding a real fragment cut by its edge, all titles level across a row, every row full.
- **Bad card:** an icon in a tinted circle + title + three lines of grey 14px text, repeated three times; nested card > patterned panel > white card; different card heights in one row; a card that moves on scroll.

### How it works (steps)
- **Good:** only with three or four real steps. The heading holds the count ("Set up in 3 steps"). Each step: a verb-and-object title, one line, a picture of that step's result. No arrows or connecting lines between cards.
- **Bad:** "01 Sign up / 02 Configure / 03 Profit" with icons and no pictures; giant outlined numerals; stair-stepped cards.

### Social proof
| Form | When | Rules |
|---|---|---|
| **Quote + stat** | One named customer the brief gives | Quote at 24-28px, max 40 words, a before and an after, no praise words. A face (real photo) or the company logo, name, role, company. One number beside it with what was counted. |
| **Customer stories row** | Three named customers with results | Logo, a title saying who did what, one line, "Read the story" link, a stat with its unit. |
| **Press lines** | Real coverage | The outlet's name in type or real logo, the line in quotes, linked. |
| **Rating line** | A real aggregate (App Store, G2) | "4.8 on the App Store, 2,140 ratings" with the date if it moves. |

- **Good:** fewer, truer, attributable. Merged into the section it supports.
- **Bad:** three polished testimonials each with a punchline and a number, stock headshots, "Jane D.", a carousel, a wall of tweets, star ratings with no source. If the brief gives no proof, use a strip of plain facts from the brief or nothing.

### Integrations
- **Good:** the real marks of tools the product works with, in their own colours, at one optical size, as a diagram (the product as a hub with branches) or a grid when there are 9+.
- **Bad:** drawn look-alike logos, monochrome marks that lose recognition, a grid of 40 logos when it supports 6.

### Statement / type moment
- **Good:** one sentence of 12 to 40 plain words from the brief, set at h2 size or larger on its own screen; can carry the signature moment (words lighting up as it scrolls).
- **Bad:** a literary quote as a full-screen band; a slogan; outline or rotated display type.

### FAQ
- **Good:** split layout: h2 "Questions" and one line plus a contact link on the left; 5 to 8 questions on the right in the buyer's words (≤ 60 characters), answers under 50 words that start with the answer. Answers open by default, or an accessible disclosure (`<details>`) when there are more than eight.
- **Bad:** questions the company wants asked ("Why is Acme the best?"), answers that dodge, an accordion where every answer is closed and two lines long.

### The close (final CTA)
| Type | Composition |
|---|---|
| **Type close** | The h2 (≤ 8 words), one line (trial terms), the main action as one large button |
| **Photo close** | Head row (h2, one line, button) then a photograph not used above, nothing on it |
| **Word close** | h2 and button on one row, then the brand name set across the container |

- **Good:** the main action again, word for word; it is part of the footer's ground, not a separate coloured band.
- **Bad:** "Ready to get started?" + "Get started" in a purple gradient box with a glow; a second different action; a newsletter as the close on a software page.

### Footer
- **Good:** the close above, then the company block (logo, one plain line), link columns named and ordered like the nav, the newsletter field once if there is one, and the legal row: name, current year, Privacy, Terms, credits line. Address and hours for places.
- **Bad:** links to pages that do not exist, coloured social icons for accounts the brief did not give, a sign-off line or pun, a stale year, a back-to-top square.

## Merging and rhythm checks

- [ ] No section holds less than about 55% of a screen of content; short blocks merged into the section above.
- [ ] A calmer section after at most two visual ones.
- [ ] Each card layout used at most twice; no two neighbours share a layout.
- [ ] One contrasting band at most, in the second half, holding the strongest picture.
- [ ] Every section after the hero has at least one link or linked picture that answers hover.
- [ ] Every fact appears once, in one wording (a stat strip never repeats the spec table).

## Section slop tells

| Tell | Fix |
|---|---|
| Eyebrow + claim heading + short lede + three cards, every section | Shape each section from the visitor's question; vary the composition |
| "Features" as an h2 | Name what the features do: "Runs your practice from one app" |
| Alternating zig-zag splits down the whole page | Text left, picture right, every split; vary with bento, strip, full-bleed |
| A section that only repeats the hero's claim with a different icon | Cut it |
| Logos, stats and testimonials each in their own band | Merge proof into the sections it supports |
| Accordion FAQ where every answer is hidden | Open answers or real disclosures with useful first lines |

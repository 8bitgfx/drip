# Imagery: sourcing photos

A found photo is a stand-in for the user's own picture until proven otherwise. Find the most specific, honest frame you can, log where it came from, and tell the user which slots they should reshoot. Never let a search result pretend to be the client.

## 1. Ask first

When the brief names a real business, person or product, send one message before searching:

> Before I pick pictures: do you have your own photos, logo or product screenshots? Your own material always looks better than stock. If not, I will use licensed photos as stand-ins and list them so you can replace them later.

Ask once. If the user says no or does not answer, carry on with stand-ins and list them in your report.

What to ask for, by kind of business:

| Business | Ask for |
|---|---|
| Place (cafe, studio, shop, clinic) | Shopfront straight on, the room from the door, the counter or bench, three products on one surface, hands at work |
| Physical product | The product on a plain backdrop from three angles, a detail of each part the copy names, the product in use |
| Software | Access to the running product or screenshots of the main screen, one detail, the phone view |
| Service, agency | Real project photos, the team at work (not posed) |
| Any | Logo as SVG, brand colours, any photos they already use |

## 2. Query craft

Search for what is in the frame, not how it should feel. Concrete nouns, the material, the action. Two or three words find more than a sentence.

| Bad query | Good queries (run all three) |
|---|---|
| "productivity" | "notebook pencil desk", "hands writing notebook", "paper planner open" |
| "fresh bakery vibes" | "bread oven bakery", "baker shaping dough", "sourdough loaves rack" |
| "modern office" | "architect drawing table", "workshop bench tools", "desk window daylight" |
| "fitness motivation" | "climbing wall chalk hands", "rowing machine gym", "kettlebell floor" |
| "nature calm" | "fjord village houses", "pine forest path fog", "lake shore boathouse" |
| "technology" | Do not search. Capture the product, or build faux UI (`drip_guide productshots`) |

Search patterns:
- **The thing:** "ceramic mug glaze", "cargo bicycle".
- **The thing in use:** "potter throwing clay wheel".
- **The detail:** "glaze drip close-up", "bicycle chain cassette".
- **The place it lives:** "pottery studio shelves".

Use `images_search` with the orientation the slot needs (landscape for bands, portrait for beside-text). Page further only when the first page has nothing usable; switch words before paging deeper.

## 3. Sources and what they are good for

| Source | Strong at | Weak at | Licence (per result, from `images_search`) |
|---|---|---|---|
| Wikimedia Commons | Real places, landmarks, crafts, tools, documentary, historic | Polished lifestyle, product on white | CC0, public domain, CC BY, CC BY-SA: check each |
| Unsplash | Editorial lifestyle, interiors, food, landscapes, textures | Specific tools and trades, anything not photogenic | Unsplash licence |
| Pexels | Lifestyle, people at work, video | Same as Unsplash; more posed | Pexels licence |
| Openverse | Searches many CC sources at once, illustrations, museum work | Mixed quality | Per result; often CC BY/BY-SA |

## 4. Judging a candidate

Open it full size. Keep it only when every line holds:

- [ ] Shows the slot's subject, sharp where it matters, at the resolution the slot needs (see the scale table in the main guide).
- [ ] No readable brand, shop sign, logo or another business's name.
- [ ] No recognisable face that would be read as the client's staff or customer.
- [ ] No famous landmark that would be read as the client's location (unless it is their location).
- [ ] Same light and grade as the hero, or close enough that one treatment pulls them together.
- [ ] A calm area where the text will sit, if text will sit on it.
- [ ] Not the trade's stock cliche (see below).
- [ ] Licence is known and allows commercial use.
- [ ] It works at the phone crop (the subject survives a 4:5 cut).

### Stock cliches to reject

| Trade | The cliche | Look for instead |
|---|---|---|
| Coffee | Latte art from above, beans filling the frame | The roaster, the grinder, the bar from the customer's side |
| Bakery | Flour thrown on black, croissant and cappuccino still life | Loaves on racks, dough on a bench, the oven door |
| Software | Laptop and coffee on a desk, hands on a keyboard, code on a screen | The real product (capture it) |
| Teams | Diverse group laughing at a whiteboard, high-fives | No people, or hands working on the actual thing |
| Finance | Coins stacking, piggy banks, stock tickers | The product UI, or type |
| Health | Stethoscope on a desk, smiling doctor with arms crossed | The room, the equipment, the waiting area |
| Travel | A person with arms raised on a peak | The specific place, at eye level |
| Hotel | A made bed with a towel swan | A detail of the room: window seat, desk, the view |

## 5. Saving and credits

1. `images_save` every pick. It downloads into the project and writes source, author, licence and the credit line to the licence log. Never paste a remote URL into the page.
2. Name files by subject, not by number: `roaster-drum.avif`, not `photo-7.jpg`.
3. Credits on the page: one quiet line in the footer, "Photographs: Wikimedia Commons and Unsplash" linking to a credits list (page or section) that names each author, licence and source. Never a credit caption under each picture.
4. CC BY and CC BY-SA require the credit; say "adapted" for anything you cropped hard or recoloured. CC BY-SA adaptations carry the same licence.
5. In your report to the user, list every stand-in: slot, what it shows, and what their own photo should show instead.

### Licence red flags

- Result says "unknown", "all rights reserved", or comes from a general web search: do not ship. Ask the owner or drop it.
- NC (non-commercial) on a company site: drop it.
- ND (no derivatives) and you need to crop or recolour: drop it.
- A Commons file that is a photo of an artwork, poster or product packaging: the artwork may carry its own rights. Skip it.
- A model release matters for recognisable people in commercial use: prefer frames without identifiable faces.

## 6. Logos and brand marks

- The user's own logo only, as SVG, from them.
- Third-party logos only for tools or platforms the product really integrates with, in one treatment (all monochrome, or all in brand colour), 24-40px tall in a row. Brand marks come from `icons_search` (Simple Icons set) when a tool needs its mark; see `drip_guide icons`.
- Never a "Trusted by" logo wall of companies the user did not name. That is an invented claim.

## 7. People

- The user's real team, shot candidly, beats any stock person.
- Without real photos: hands, backs, people at a distance doing the actual work. No posed smiles at the camera.
- Never attach a stock face to a name, a quote, a job title or a review.
- Never generate a face for a testimonial or a team page.

## 8. When nothing fits

In this order:
1. Change the words (the place, the material, the action) and search once more.
2. Generate a still with an art-directed prompt (`imagery/prompting`), if a provider is set up.
3. Set the section in type: a large statement, a figure the user gave, a list. A strong type section beats a weak picture.
4. Keep a clearly marked slot only if the user promised the image. Fill it with a neutral surface the size of the final image, list it in your report, and never ship it as a grey box to production.

## Sources

Adapted from Taste Skill (MIT) photos reference (asking for a shot list, stand-ins, live-search judging, stock cliches, credit line) and Hallmark (MIT) imagery reference (source order, library credits, never writing image URLs from memory). Licence summaries are Drip's own reading of each licence; check the source's current terms for edge cases.

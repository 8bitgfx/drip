# Imagery

Good imagery shows the real thing: the place, the food, the object, the hands at work, the product running. Every picture has a job a sentence could not do, sits at a size that lets it do that job, and shares one light, one grade and one treatment with every other picture on the page. Nothing is a placeholder, nothing is a mood standing in for a subject, every file has a known licence, and the page still loads fast on a phone. A visitor who covers the copy should still be able to tell what the business is from the pictures alone.

## The procedure

1. **Write the shot list before touching a tool.** One line per image slot: what it shows, why it is there (the fact it adds), its ratio and its displayed size. A slot you cannot name a subject for is cut, not filled.
   ```
   hero      the roastery floor, drum roaster mid-roast     16:9 full-bleed   proves it is a real roaster
   beans     green and roasted beans side by side           4:5, 6 columns    shows the product before/after
   cafe      the counter from the door, morning             3:2, 8 columns    where to visit
   ```
2. **Ask for the user's own material first** when the brief names a real business, person or product: photos, logo, product screenshots, brand assets. Their images win every slot. One short message, sent once (wording in `imagery/sourcing`).
3. **Capture the product if it exists.** A running app or site beats any picture of one. Point `fitcheck_shot` at its local URL in a state that tells the story (real-looking data, the one screen that does the job). For built mock UI, use `drip_guide productshots`.
4. **Check what generation can do:** `keys_status` and `gen_providers`. If no provider is set, say so and offer `keys_open` (wording below). Do not plan slots around generation you cannot run.
5. **Decide each slot** with the table in "Find, generate, ask or build". Write the decision next to the slot.
6. **Find:** `images_search` with concrete nouns, three phrasings per slot. Open the best 3 to 5 at full size, keep one, `images_save` it. Details in `imagery/sourcing`.
7. **Generate:** `gen_image` with the full prompt anatomy. Two to four variants per slot, one style block shared across the whole set. Details in `imagery/prompting`.
8. **Pull the palette back:** run `palette_from_image` on the hero. If its colours fight the direction's palette, change the treatment or the picture, not the palette.
9. **Treat and place:** one treatment for the set, crops set in CSS with `aspect-ratio` and `object-position`, scrims only where text sits. Recipes in `imagery/treatment`.
10. **Wire for speed and access:** `srcset`, `sizes`, lazy loading, `width`/`height`, alt text, the credit line.
11. **Look:** `fitcheck_shot` at phone and desktop. Check every crop at 390px wide: phones cut the subject out of wide frames more than anything else.

## Find, generate, ask or build

| The slot shows | First choice | Second | Never |
|---|---|---|---|
| A real business (cafe, studio, clinic, shop) | The user's photos | Found photos of the same kind of detail (hands, tools, material), credited, listed as stand-ins to replace | A stock room or storefront passed off as theirs |
| A software product | A capture of the real product | Built faux UI (`drip_guide productshots`) | A laptop-on-desk stock photo, a generic dashboard |
| A physical product with no photos | The user's renders or CAD | Found photos of the same kind of object, no visible brand | A drawing of the product, mood stock |
| A concept, a feeling, an abstract service | Type set large, or a real scene where the service happens | A generated still with one concrete subject | A gradient blob, an isometric scene, a lightbulb |
| Editorial hero, campaign, fictional brand | A generated or found photograph art-directed to the direction | Type at full scale | An image chosen because it is pretty and unrelated |
| People | The user's team photos | Hands, backs, people out of focus doing the work | A stock face labelled as a customer or teammate |
| A texture or ground | `gradient_mesh` or a generated texture | A flat colour from the palette | Animated blobs, aurora glows behind text |
| A diagram of how it works | Built in HTML/SVG from the real steps | Type and a list | A generated "infographic" with fake text |

### When no image provider key is set

Say it once, plainly, then carry on with what you can do:

> I can find licensed photos now. For generated images (hero art, illustration, renders) I need an image provider key. Run `/drip:settings` and pick "Add API keys", or I can open the key page for you. Or send me your own photos and I will use those first.

Then call `keys_open` only if the user says yes. Never block the page on a key: find, ask, or set the slot in type.

## The craft

### 1. Subject beats mood

The deletion test: remove the picture in your head. If the page still says the same thing, the picture is decoration. Replace it with one that adds a fact (what the product looks like, where the place is, who does the work) or cut it.

- **Do:** a bakery hero of loaves coming out of the oven at 6am.
- **Don't:** a sunrise over fields for a bakery, a city at night for a SaaS tool, a handshake for a consultancy.

### 2. Scale

| Placement | Minimum size | Source width needed |
|---|---|---|
| Full-bleed hero | 100% width, 60-100% of the first screen tall | 2400px long side (2880 for 2x at 1440) |
| Hero beside text | 50-60% of the container, 60-75% of the screen tall | 1600-2000px |
| Section image | 6 of 12 columns, 400px tall or more | 1200-1600px |
| Set of 3-4 (true set: three dishes, three rooms) | Equal sizes, one ratio | 800-1200px |
| Card image | Full card width | 2x the card width |

- **Do:** one dominant picture per screen, or a true set in one row.
- **Don't:** five small pictures scattered across a section, each 200px wide.

### 3. Composition and crop

| Ratio | Use |
|---|---|
| 21:9, 16:9 | Full-bleed bands and heroes on desktop |
| 3:2 | Section images, editorial |
| 4:5 | Beside text, phone heroes, portraits of objects |
| 1:1 | Pairs, grids, thumbnails of products |

- One subject per frame, cropped tight, its weight leaning toward the text it sits beside.
- Vary ratios between sections (4:5 beside text, then 16:9 across), never within one row.
- Set the crop in CSS: `aspect-ratio`, `object-fit: cover`, `object-position` on the subject's focal point. Give wide heroes a separate 4:5 phone crop with `<picture>`.
- **Do:** leave the calm side of the frame for the headline.
- **Don't:** centre the subject and then centre white text on top of it.

### 4. One visual world

Every picture on a page shares: one light (soft window light, or hard sun, never both), one colour grade, one treatment, one radius and frame. Mixing a studio product on black with a bright daylight snapshot reads as two websites.

- **Do:** pick the hero first, then judge every other image against it.
- **Don't:** take the best result from five unrelated searches.

### 5. Text over images

- Contrast is measured on the pixels behind the text, not on the token: 4.5:1 for body, 3:1 for 24px+ display.
- Place text on the calmest region; add a scrim from the text's edge (ink at 35-65% fading to 0) only behind the text side.
- On a phone the crop changes: check the text still sits on a calm region at 390px, or move the text below the image.
- **Do:** a left-aligned headline on the dark left third of the frame with a 50% scrim from the left.
- **Don't:** a full-frame black overlay at 60% that turns the photo to mud.

### 6. Illustration and 3D

Illustration earns its place when the brand already owns a style, when the subject cannot be photographed (a process inside a machine, a future product), or when the direction on the board is illustrative. Then it comes from one hand: one style block for every piece (`imagery/prompting`), one line weight, one palette from the system.

3D earns its place when the product is 3D, or the direction is built on material and depth. A render shows a specific object with real materials and one light setup, never a floating abstract shape.

- **Do:** a set of four spot illustrations generated from one style block, palette limited to the system's ink, paper and accent.
- **Don't:** a different stock illustration style per section, characters with purple skin, isometric cities.

### 7. Licences

| Licence | Use commercially | Credit | Modify |
|---|---|---|---|
| CC0, public domain | Yes | Not required (do it anyway in the credits list) | Yes |
| Unsplash licence | Yes | Appreciated, not required | Yes; do not sell unaltered copies or build a competing gallery |
| Pexels licence | Yes | Appreciated, not required | Yes; same limits as Unsplash |
| CC BY | Yes | Required: author, source, licence | Yes; say it was adapted |
| CC BY-SA | Yes | Required | Adaptations carry the same licence |
| CC BY-NC, CC BY-ND | Usually no for a commercial site | Required | NC forbids commercial, ND forbids crops and edits |
| Generated | Check the provider terms; usually yes | Not required | Yes |
| Found on the web, unknown | No | - | Ask the owner or drop it |

`images_save` writes the credit to the licence log. Show credits as one quiet line in the footer linking to a credits list, never a caption under each picture.

### 8. Performance

| Item | Value |
|---|---|
| Format | AVIF first, WebP fallback, JPEG only as last resort; SVG for icons and logos |
| Hero weight | Under 400 KB |
| Other images | Under 250 KB each; whole page images under 2.4 MB at desktop |
| Resolution | At most 2x the displayed CSS width |
| Hero loading | Eager, `fetchpriority="high"`, never `loading="lazy"` (it is the LCP) |
| Below the fold | `loading="lazy"`, `decoding="async"` |
| Layout shift | `width` and `height` attributes, or `aspect-ratio`, on every image |
| Below-fold photos | `<img>`, not CSS `background-image` (a background cannot lazy-load or carry alt) |
| Video | `autoplay muted loop playsinline`, a `poster`, under 2 MB for 10 seconds, a pause control past 5 seconds |

In Next.js use `next/image` with `sizes` set to the real layout width and `priority` on the hero only.

### 9. Alt text

- Say what the picture tells the reader in this context, in under 125 characters: "Head roaster checking a batch at the drum roaster", not "image of coffee".
- No "image of", "photo of", no file names, no keyword stuffing.
- Decorative images (a texture, a repeated mood frame): `alt=""` and nothing else.
- A product screenshot: describe what it shows that matters ("Invoice list with three overdue invoices flagged in red").
- An image that is a link: the alt says where the link goes.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Grey or gradient box where a picture should be | Fill it (user, capture, found, generated) or remove the slot and let type carry the section |
| Purple-to-blue abstract gradient "hero art" | A real subject, or a mesh gradient in the direction's palette behind type, with grain |
| Floating 3D blobs, glass spheres, glowing orbs | Cut them; show the product or set the headline larger |
| Drawn SVG person, plant, mountain or building | A photograph of the real thing, or nothing |
| Illustration pack characters (big heads, purple skin, tiny limbs) | Photograph of real hands at work, or a commissioned style via one style block |
| Laptop on a desk, coffee cup, sticky notes for a software product | A capture of the actual product |
| Diverse team laughing at a whiteboard | The user's team, or no people at all |
| A stock face with a fake name and quote | Remove the testimonial unless the user supplied it |
| Five pictures, five lights, five grades | Re-pick against the hero, apply one treatment |
| Hero photo at thumbnail size beside a large headline | Make the picture the largest thing on the first screen, or drop it |
| Image zooms or rotates on hover everywhere | Only images inside linked cards may zoom, 1.02-1.03 inside their frame |
| Caption under every image ("Our beautiful workspace") | Cut captions; facts that matter go in the copy |
| Text baked into a generated image | Generate without text, set the words in HTML |
| AI-sheen: plastic skin, waxy food, symmetric everything, warped hands | Regenerate with a photographic prompt, or use a found photo |
| Lens flare, bokeh on everything, HDR glow | Prompt for even, natural light; reject the result |
| Logo wall of companies the user never named | Remove it; use the user's real customers or nothing |
| 4 MB hero PNG | AVIF/WebP via `srcset`, under 400 KB |
| Same photo used twice on one page (cropped or mirrored) | One frame, one appearance |

## Done when

- [ ] Every image slot shows a real subject; none is a blank, a gradient stand-in or a drawn scene.
- [ ] Each picture passes the deletion test: removing it would lose a fact.
- [ ] The hero image is the largest visual on the first screen and fits the chosen direction.
- [ ] All images share one light, grade and treatment.
- [ ] Text over images reads at 4.5:1 at both 1440 and 390 widths.
- [ ] Every found image was saved with `images_save`; no licence is unknown; CC BY/BY-SA credits appear.
- [ ] Hero is eager with `fetchpriority="high"`; every other image is lazy with `width`/`height`.
- [ ] Every `<img>` has fitting alt text or `alt=""`.
- [ ] Phone crops keep the subject in frame (checked in the `fitcheck_shot` phone screenshot).
- [ ] Stand-ins are listed for the user to replace with their own photos.

## Reference files

- `drip_guide imagery/prompting`: prompt anatomy for `gen_image`, consistency across a set, reviewing results.
- `drip_guide imagery/sourcing`: asking for assets, search queries, judging candidates, licences, credits.
- `drip_guide imagery/treatment`: crops, scrims, duotone, grain, frames, responsive image code.

Related guides: `drip_guide productshots` (faux UI and screenshots), `drip_guide color` (palette from the hero), `drip_guide a11y` (alt text, contrast).

## Sources

Ideas adapted and rewritten from: Hallmark (MIT) imagery, comp and texture references (source order, scale, the deletion test, photo treatment, the generated-still prompt form, texture budget); Taste Skill (MIT) photos and performance references (stand-ins, one visual world, licences, image weights and the hero/lazy split); Impeccable (Apache-2.0) craft floor (refusing geometric stand-ins and decorative imagery); UI UX Pro Max (MIT) accessibility data (alt text).

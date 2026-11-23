# Imagery: prompting `gen_image`

An image generator draws the average of everything it has seen. Left alone it gives you a centred subject, glowing light, a purple-teal grade and a shallow-focus blur on everything. Every word of a good prompt pushes it off that average toward one specific picture you could describe to a photographer. Write prompts like a shot brief, not like a wish.

## Before you prompt

1. `gen_providers` and `keys_status`: know which provider runs and what sizes it supports. No key: see the "no key" wording in the main imagery guide.
2. Have the chosen direction open: its palette names, its three adjectives, its references. The prompt is built from the direction, not from the product name.
3. Know the slot: ratio, displayed size, where the text will sit.

## Prompt anatomy

Write the parts in this order. Each is one short phrase. Skip none on a hero.

| # | Part | What it fixes | Example |
|---|---|---|---|
| 1 | Medium and format | Photo vs illustration vs render, and the look of the capture | "Editorial photograph, 35mm film look" |
| 2 | Subject | One concrete thing, with its material and state | "a cast-iron drum coffee roaster, beans tumbling in the cooling tray" |
| 3 | Action or moment | What is happening, which makes it feel real | "steam rising, a gloved hand lifting the sample scoop" |
| 4 | Setting | Where, specific | "small roastery with whitewashed brick walls and steel shelving" |
| 5 | Composition and camera | Framing, angle, lens, where the subject sits | "wide shot from waist height, 35mm, subject in the right third" |
| 6 | Light | Source, direction, quality, time | "soft daylight from a high window on the left, morning" |
| 7 | Palette and grade | The direction's colours in plain words | "warm off-white walls, deep brown, one muted orange accent, low contrast, slightly faded" |
| 8 | Negative space | Room for the headline | "large calm empty wall area on the left half for text" |
| 9 | Exclusions | What the generator will add unless told not to | "no text, no logos, no people facing the camera, no lens flare, no bokeh balls" |

### Template

```
<medium and format>. <subject>, <action or moment>, in <setting>.
<composition and camera>. <light>. <palette and grade>.
<negative space>. <exclusions>.
```

## Turning the direction into prompt words

| Direction says | Prompt words |
|---|---|
| Warm, editorial, crafted | "35mm film look, natural window light, warm off-white, slightly faded, fine grain" |
| Precise, technical, calm | "clean studio photograph, even soft light, neutral grey seamless background, sharp focus throughout" |
| Bold, loud, playful | "flat hard flash, saturated primary colours, strong shadows, high contrast, graphic composition" |
| Quiet luxury | "low-key light, deep shadows, single soft key light from above, muted earth tones, lots of dark empty space" |
| Outdoor, honest, rugged | "overcast daylight, desaturated greens and greys, documentary style, handheld feel" |
| Retro print | "risograph print style, two spot colours (deep blue and coral), visible paper texture, slight misregistration" |

Palette: name colours as a painter would ("deep forest green", "chalk white", "rust orange"), never hex codes. Most generators ignore hex.

## Camera and light vocabulary

| You want | Say |
|---|---|
| Everything sharp, honest | "f/8, deep focus" |
| Subject isolated, background soft | "50mm, f/2, shallow depth of field" (use sparingly: blur everywhere is a tell) |
| Intimate detail | "macro close-up, 100mm" |
| Scale and place | "wide shot, 24mm, eye level" |
| Overview of a set of objects | "flat lay, shot from directly above" |
| Calm, premium product | "three-quarter view, eye level, soft box light from the left, white seamless" |
| Morning warmth | "low sun from the side, long soft shadows" |
| Even, shadowless (catalogue) | "diffuse overcast light, no hard shadows" |
| Night, moody | "single practical lamp, deep shadows, warm pool of light" |

## Before and after

**Hero for a bike repair shop.**
- Before: "bike shop hero image, modern, high quality"
- After: "Documentary photograph, 35mm. A mechanic truing a steel bicycle wheel on a repair stand, spoke key in hand, in a narrow workshop with pegboard walls and hanging inner tubes. Medium shot from the side at chest height, subject in the right third. Overcast daylight through a shopfront window on the left. Muted greys, dark green paint, one yellow accent. Calm empty pegboard area on the left for text. No text, no logos, no face toward the camera, no lens flare."

**Spot illustration for an accounting app's empty state.**
- Before: "illustration of empty inbox, cute"
- After: "Flat vector illustration, single line weight, no gradients. An empty paper tray on a desk with one paperclip, seen from slightly above. Centred small object with generous empty space around it. Two colours only: ink navy lines and a pale sand fill on an off-white background. No characters, no faces, no text, no shadows, no 3D."

**Product render for a desk lamp with no photos yet.**
- Before: "3D render of a modern lamp"
- After: "Studio product render. An articulated desk lamp in brushed aluminium with a matte black shade, arm bent at 45 degrees, lamp switched on. Three-quarter view at eye level, lamp in the right half of the frame. One large softbox from the left, subtle floor reflection. Warm grey seamless background. Empty space on the left half. No text, no logos, no props, no floating particles, no glow halo."

## Consistency across a set

A set of images (feature illustrations, team-free section photos, a series of renders) must look like one shoot.

1. **Write a style block once** and paste it verbatim into every prompt of the set: medium, camera, light, palette, grade, exclusions. Only the subject and action change.
   ```
   STYLE: Editorial photograph, 35mm film look, soft window light from the left, warm off-white and deep brown with one muted orange accent, low contrast, fine grain. No text, no logos, no faces toward the camera.
   ```
2. Keep the same ratio and the same camera height within a row.
3. Generate the whole set in one session. If the provider supports a seed or a reference image, reuse it.
4. Lay the results side by side before choosing. Reject the one with different light, even if it is the best picture alone.
5. Apply one CSS treatment to all of them (`imagery/treatment`); it hides small grade drift.

## Sizes by slot

| Slot | Ask for | Notes |
|---|---|---|
| Full-bleed hero | Widest the provider offers (often 1536x1024 or 1792x1024), then crop | Also generate or crop a 4:5 version for phones |
| Hero beside text | Portrait 1024x1536 or square 1024x1024 | Subject toward the text side |
| Section image | Landscape 1536x1024 | |
| Card or spot illustration | Square 1024x1024 | Small subject, lots of space |
| Texture / ground | Square, then tile or stretch | Ask for "seamless, uniform, no focal point" |

## Reviewing results

Look at every result at 100% before using it. Reject on any of these:

- Hands with the wrong number of fingers, merged fingers, tools held impossibly.
- Text, labels or signs: always warped. Prompt "no text" and regenerate, or crop it out.
- Duplicated or melted objects (two handles, a chair with five legs, a shelf that bends).
- Faces that look waxy or uncanny, or that resemble a real person.
- Plastic sheen on food, skin or fabric.
- A logo or a brand shape that looks like a real company's.
- Light that contradicts the rest of the set.
- The subject in the place where the text needs to go.

Two rounds of regeneration per slot. If the third still fails, use a found photo or set the slot in type.

## What generators do by default (and the words that stop it)

| Default | Counter in the prompt |
|---|---|
| Subject dead centre | "subject in the right third", "off-centre" |
| Purple, teal, neon glow | Name the palette in plain colour words; "no neon, no glow" |
| Blurred background everywhere | "deep focus, f/8, background sharp" |
| Dramatic rim light, lens flare | "soft even light, no lens flare, no rim light" |
| Over-saturated HDR | "natural colour, low contrast, slightly faded" |
| Shiny, plastic surfaces | Name the material: "matte ceramic", "raw linen", "brushed steel" |
| Floating particles, sparkles, bokeh dots | "no particles, no sparkles, no bokeh balls" |
| Busy frame full of props | "minimal props, one object", "lots of empty space" |
| People smiling at the camera | "candid, nobody looking at the camera", or "no people" |

## Never

- Text, prices, UI or logos inside a generated image. Set them in HTML.
- A real person's likeness, a celebrity, a trademarked character or a real brand's product.
- A generated photo presented as the user's own place, staff or customers. Label it a stand-in in your report so they replace it.
- A generated "screenshot" of a product. Capture the real one or build it (`drip_guide productshots`).
- Firing generation without the user wanting it: generation costs money. Say what you will generate and how many.

## Sources

Adapted from Hallmark (MIT) comp reference (the generated-still prompt form, one-axis variation, reproduction checks) and Taste Skill (MIT) photos reference (one visual world, rejecting mood frames). Vocabulary tables are Drip's own.

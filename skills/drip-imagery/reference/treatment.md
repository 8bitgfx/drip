# Imagery: treatment and code

Treatment is how a set of pictures becomes part of one design: the same crop logic, the same frame, the same colour handling on every image. Pick one treatment per page, apply it to every photo (the user's own included), and keep it in CSS so a replaced image inherits it.

## 1. Pick one treatment

| Treatment | When | How |
|---|---|---|
| Natural | Most pages. Product, food, places where true colour matters | No filter. Pick frames that already match |
| Warm | Craft, hospitality, editorial warmth | `filter: sepia(0.12) saturate(1.05)` |
| Muted | Calm, premium, text-heavy pages | `filter: saturate(0.7) contrast(0.95)` |
| Mono | Editorial, architecture, serious services | `filter: grayscale(1) contrast(1.05)` |
| Duotone | A bold direction with two strong system colours | Grayscale plus two colour layers (recipe below) |
| Tint | One brand colour washed over every picture | Grayscale plus one colour in `multiply` |

Rules:
- One treatment per page. Never natural photos beside duotone ones.
- Product photos where colour is the point (food, fashion, paint) stay natural.
- Duotone and tint flatten pale subjects (snow, white walls) into empty fields. Choose frames with tonal range and look at each one through the treatment.
- Measure text contrast on the treated result, not on the original.

## 2. Crop in CSS, not in the file

```css
.frame {
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border-radius: var(--radius-image, 8px);
}
.frame > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 60% 40%; /* the subject's focal point */
}
```

Tailwind: `aspect-[4/5] overflow-hidden rounded-[--radius-image]` on the frame, `size-full object-cover object-[60%_40%]` on the image.

Different crop for phones (art direction):

```html
<picture>
  <source media="(max-width: 639px)" srcset="hero-4x5-780.avif 780w, hero-4x5-1170.avif 1170w" sizes="100vw" type="image/avif">
  <source srcset="hero-16x9-1440.avif 1440w, hero-16x9-2880.avif 2880w" sizes="100vw" type="image/avif">
  <img src="hero-16x9-1440.jpg" width="1440" height="810" alt="Head roaster checking a batch at the drum roaster"
       fetchpriority="high" decoding="async">
</picture>
```

## 3. Frames

- One radius for every photo on the page, from the system's radius scale. Images inside a card follow the nested rule: inner radius = outer radius minus padding.
- An inset hairline keeps pale photos from bleeding into a pale page: `outline: 1px solid color-mix(in oklch, var(--ink) 8%, transparent); outline-offset: -1px;`
- Never a border and a wide soft shadow on the same image. One or the other, usually neither.
- No drawn browser bars, phone bezels or traffic lights around photos. For product captures see `drip_guide productshots`.

## 4. Scrims for text over images

Scrim only behind the side the text sits on, from the text's edge fading out:

```css
.hero { position: relative; isolation: isolate; }
.hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
.hero::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(to right,
    color-mix(in oklch, var(--ink) 60%, transparent) 0%,
    color-mix(in oklch, var(--ink) 30%, transparent) 40%,
    transparent 70%);
}
```

| Do | Don't |
|---|---|
| Scrim from the text edge, 35-65% ink at the start | A flat black overlay at 50-70% over the whole photo |
| Scrim colour from the system's ink, tinted | Pure `#000` scrim that greys the photo |
| Text on the calm third of the frame | Centred white text across the subject |
| Move text below the image on phones if the crop puts it on the subject | Keep the same overlay layout at 390px and hope |

Check: sample the brightest pixel behind the text in the phone and desktop screenshots; the text must hold 4.5:1 (3:1 for 24px+).

## 5. Duotone and tint

```css
.duotone { position: relative; isolation: isolate; overflow: hidden; }
.duotone { background: var(--duo-light); }                /* whites become the light colour */
.duotone > img { display: block; filter: grayscale(1) contrast(1.1); mix-blend-mode: multiply; }
.duotone::after {                                         /* blacks lift to the dark colour */
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--duo-dark); mix-blend-mode: lighten;
}
```

Pick `--duo-dark` and `--duo-light` from the system (a deep ink and a light accent tint), never the default violet and pink. For a single-colour tint, keep only the `multiply` layer over a grayscale image.

## 6. Grain and texture

Grain is a treatment with a budget, not ambience.

- One texture family per page: grain, or halftone, or paper. Never two.
- Opacity: 0.08 or less page-wide, up to 0.15 inside one band or card, 0.05 or nothing under body text.
- Never animated. `pointer-events: none` and `aria-hidden="true"` on every overlay.
- Pure CSS or an inline SVG filter; no image request for texture.
- `gradient_mesh` returns a mesh plus grain ready to use as a hero ground behind type.

```css
.grain { position: relative; isolation: isolate; }
.grain::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.07; background-size: 200px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 9 -4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

The colour matrix turns noise into distinct specks so the grain is visible at low opacity. On dark grounds change the first three rows' last value to 1 for white specks.

## 7. Hover

- Only an image inside a linked card responds: scale 1.02-1.03 over 400-600ms ease-out, inside a frame with `overflow: hidden`. The frame never grows.
- Images that are not links do nothing on hover.
- No tilt, no rotate, no Ken Burns drift at rest.
- Wrap hover motion in `@media (hover: hover) and (prefers-reduced-motion: no-preference)`.

## 8. Responsive images in code

Plain HTML:

```html
<img src="beans-1200.jpg"
     srcset="beans-800.avif 800w, beans-1200.avif 1200w, beans-1600.avif 1600w"
     sizes="(min-width: 1024px) 50vw, 100vw"
     width="1200" height="1500" alt="Green and roasted beans side by side"
     loading="lazy" decoding="async">
```

Next.js:

```tsx
import Image from "next/image";

<Image src={hero} alt="Head roaster checking a batch at the drum roaster"
       priority sizes="100vw" className="object-cover" fill />

<Image src={beans} alt="Green and roasted beans side by side"
       sizes="(min-width: 1024px) 50vw, 100vw" />   // lazy by default
```

| Rule | Why |
|---|---|
| `sizes` matches the real layout width | Otherwise phones download the desktop file |
| Largest `srcset` entry at most 2x the shown width | More is wasted bytes |
| `width`/`height` or `aspect-ratio` always | No layout shift |
| Hero: `priority` / `fetchpriority="high"`, no lazy | It is the LCP element |
| A low-quality placeholder colour behind images | The frame never flashes white: `background: var(--surface-2)` on the frame |
| Content images are `<img>`, not CSS backgrounds | Lazy loading, alt text and `srcset` |

## 9. Do / Don't summary

| Do | Don't |
|---|---|
| One treatment, applied in CSS to every photo | A filter on some photos and not others |
| Crop with `object-position` on the focal point | Upload pre-cropped files per breakpoint by hand |
| Scrim only behind text, from its edge | Darken the whole picture to make text fit |
| Grain at 0.05-0.08, static | Moving grain, or grain at 0.3 |
| Same radius on every photo | Rounded heroes beside square section images |
| Natural colour for food and products | Duotone on the product the customer is buying |

## Sources

Adapted from Hallmark (MIT) imagery and texture references (treatment list, scrim placement, the texture budget and speck-grain recipe, inset outline frame) and Taste Skill (MIT) photos and performance references (hover zoom range, hero priority, `srcset` sizing, image weights). Code examples are Drip's own.

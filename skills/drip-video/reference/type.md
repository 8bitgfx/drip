# Type in motion

In a film, type is an object with weight, direction and material, not a caption. It also has to be read, which
limits what it can do. The craft is balancing both.

## Readable time and size

| Rule | Value |
|---|---|
| Reading speed | about 3 words a second, plus about 0.4s to settle |
| One line, 3-6 words | hold 1.0-2.0s after it settles |
| A headline of 2-3 words | hold 0.8-1.2s |
| A number or a name | hold 1.2s+, the eye needs to confirm it |
| Words per beat | 1 idea; a headline or a line, not both competing |
| Text during fast motion | none or 1 word; people cannot read and track at once |
| Minimum body size, 1920x1080 | 40px (anything under 32px is unreadable on a laptop in a corner) |
| Minimum caption, 1920x1080 | 28px |
| Headline, 1920x1080 | 96-180px; a hero word can be 300px+ |
| 9:16 (1080x1920) | body 52px+, headline 110-200px, keep text inside the central 900px and out of the bottom 240px and top 200px (platform UI) |
| 1:1 (1080x1080) | body 44px+, headline 100-180px |
| Phone test | scale the frame to 360px wide: smallest text must still be readable |
| Contrast | 4.5:1 for body text, 3:1 for large; check against the ground at the busiest frame |
| Line length | 14-28 characters per line for headlines; break by meaning, not by width |
| Line height | 0.9-1.05 for display, 1.2-1.3 for text |
| Letter spacing | display -0.02 to -0.04em; small uppercase +0.06 to +0.12em |

Load fonts before frame 0 (the kit waits on `document.fonts.ready`); a font that is not loaded renders a fallback
and ruins every frame. Use `fonts_search` to choose and confirm the licence.

## Type as an object

- Give each text block a role: lead (large, moves first), support (smaller, follows), label (smallest, steady).
- A word can be an object: it falls, lands on a line, gets pushed by another, is covered by the motif.
- Text moves with the scene's camera and layers, not as a flat overlay. If the camera pushes in, the type scales
  with it or sits at a deliberate depth.
- Never animate every word the same way. Pick one verb for the headline (rise), a different one for the keyword
  (scale and colour), a third for the label (fade only).

## Staggers

| Unit | Delay | Total for a line |
|---|---|---|
| Characters | 0.02-0.04s | up to 0.6s |
| Words | 0.06-0.12s | up to 0.8s |
| Lines | 0.1-0.15s | up to 0.6s |

Longer staggers make people wait for the end of the sentence. Split by hand, not with a plugin that needs a licence:

```js
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  return [...text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch === " " ? " " : ch;
    s.style.display = "inline-block";
    el.appendChild(s);
    return s;
  });
}
const chars = splitChars(S("#t1"));
tl.from(chars, { yPercent: 110, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.03 }, "hook+=0.4");
```

Wrap each line in an `overflow: hidden` box and move the inner element up from `yPercent: 110` for a clean masked
rise. It looks sharper than a fade.

## Techniques

| Technique | How | Notes |
|---|---|---|
| Masked rise | line inside `overflow:hidden`, inner `yPercent` 110 to 0 | the default for headlines |
| Per-character stagger | split, `stagger: 0.03` | short words only |
| Scale jump | `scale` 1.0 to 1.18 with `expo.out`, 0.3s | for the key word |
| Tracking animation | `letterSpacing` from `0.3em` to `-0.03em` | shrinks into place; use with opacity |
| Variable font axes | `fontVariationSettings: "'wght' 300"` to `"'wght' 800"` | needs a variable font; check the axis range with the font file; animate with GSAP on a proxy object and set the style in `onUpdate` |
| Weight pulse | wght 400 to 700 on the beat and back | one word, once |
| Glyph morph | SVG paths of two letters interpolated | equal point counts; see `drip_guide video/continuity` |
| Text on a path | SVG `textPath` with `startOffset` animated | the path itself can move or morph |
| Reassembly | text breaks into letters that fly to a new arrangement | each letter gets a fixed destination computed before; seeded jitter on the way |
| Counter | tween a number object, write `Math.round(n)` in `onUpdate` | use tabular numbers; an odometer is a column of digits translating |
| Cut-in | words appear on the beat with no easing | works for aggressive, brutalist films |

Variable font example (axis driven from the clock):

```js
const f = { w: 300 };
tl.to(f, { w: 800, duration: 0.8, ease: "power3.out", onUpdate: () => (S("#t1").style.fontVariationSettings = `'wght' ${f.w.toFixed(0)}`) }, "hook+=0.6");
```

## Type with the motif

- The motif can carry type: a card that morphs into a window and the title lives on it.
- A line can be the baseline for the type (a rule that draws, then the words rise from it).
- The last word can become the logo; the logo's position is where the final line ends.

## Exits

Words leave faster than they entered (65-75% of the length), and shorter in distance. Old text must not overlap new
text. Either clear the old line before the new one arrives, or move the old one under a mask as the new one rises.

## Checks

1. Pause on every beat with text and read it aloud at 3 words a second. If it takes longer than the time on
   screen, cut words.
2. `motion_frames` with `times` at each text beat, viewed small (a sheet at thumbnail size). The headline must
   still read.
3. For 9:16, check the frame against a phone mask (top and bottom UI zones).
4. Find any word that never gets a clear frame (it is always moving). Give it a hold.
5. Look for orphans and bad breaks at the final size, not the editing size.

## Don't

- Don't type-animate with the same fade-up on every line.
- Don't put small body text on moving backgrounds.
- Don't use more than two type families; one is better.
- Don't let kerning pairs collide mid-stagger (spaces need `display: inline-block` or the non-breaking space).
- Don't use live `<text>` with a font that is not loaded.

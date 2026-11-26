# UI in films: the product has to be good UI first

A launch film is often mostly product UI on screen. Everything Drip knows about good interfaces applies inside the
film, then a film's own rules sit on top: bigger, simpler, staged for one viewer who can't click. A beautiful camera
move over a mediocre screen still sells a mediocre product. Build the UI to Drip's UI bar (
`drip_guide components`, `drip_guide type`, `drip_guide color`, `drip_guide polish`), make it move like real UI
(`drip_guide motion`, `drip_guide interaction`), then stage it for the film (`drip_guide video/product`).

## The screen itself (the UI bar, unchanged)

- **Real product, real content.** The user's own screens first. Rebuilt UI is built like a real one: real names,
  plausible data that matches the product, real states. Never a generic dashboard with lorem ipsum or invented
  metrics; illustrative numbers say "Example data".
- **Built from pieces.** Library components (`components_find`, `pieces_preview`) restyled to the brand, not
  hand-drawn boxes. A film is a fine place to use the product's real component library.
- **Hierarchy.** One thing per screen is the point; everything else is quieter (smaller, lower contrast, blurred
  when it isn't the subject).
- **System.** One type family with clear roles, one accent, an 8 px spacing rhythm, consistent radii and borders,
  icons from one set at one stroke weight. The film's palette and the UI's are the same world.
- **States, not stills.** Hover, press, loading, success, empty, filled: a UI beat shows a state changing because of
  something (a click, data arriving), the way the product really behaves.
- **Polish at size.** Optical alignment, tabular figures for numbers that change, no orphan words in labels, crisp
  1 px borders (scale the whole UI as one, never resample text).

## Readable as video

| Thing | At 1080p | 9:16 phone cut |
|---|---|---|
| Smallest label that must be read | 22 px (24+ better) | 28 px |
| Body text in the UI | 28-36 px | 34-40 px |
| A number that is the point | 96-180 px | 120-200 px |
| Hit targets the cursor clicks | 56 px+ | 64 px+ |

Real UI is designed for 1x at arm's length; in a film it plays small and fast. Scale the whole screen up (1.5-2.5x)
and crop to the part that matters, rather than shrinking a full app into the frame. If a label can't be read in the
time it's on screen, cut it or blur it as background.

## UI moves like UI, the film moves like film

Two clocks live in one film:

| What | Timing | Curve |
|---|---|---|
| UI feedback inside the product: press, hover, toggle, a chip appearing | 100-200 ms, exactly like the real product | ease-out (`cubic-bezier(.23,1,.32,1)`); press scales to 0.97, never 0.9 |
| UI changes of state: a dropdown, a modal, a row arriving | 150-300 ms enter, a little faster exit | ease-out; never from `scale(0)` |
| A sheet or drawer | 300-500 ms | drawer curve (`cubic-bezier(.32,.72,0,1)`) |
| The film around the UI: camera, planes, light, morphs between scenes | 0.5-1.2 s per move | ease-in-out for things moving on screen; springs with bounce 0-0.15 |

Don't slow UI feedback down to "film speed": a 600 ms button press reads as a broken product. Let the UI respond as
fast as the real one, and let the film's camera and light carry the cinematic time around it. When a UI beat must
read slower, slow the camera and hold, not the UI.

## Staging UI in a film

- **The cursor causes things.** A believable curved path, a short settle before the click, the UI answers within
  0.1 s (`drip_guide video/product` has the cursor rules). No cursor that wanders without a job.
- **Show the change, then the result.** Click → the state changes → the consequence lands (a number rolls, a
  list fills, a chart grows). That's one beat with three moments.
- **The UI as an object.** Put screens on tilted planes (`plane3d`, 10-18 degrees) with a glow behind and a
  light sweep across (`drip_guide video/visuals`); magnify the part that matters instead of showing the whole app.
- **Continuity.** A UI element can become the next scene (a card grows into a window, a chip becomes a tag on the
  next screen). Don't cut from one full screenshot to another.
- **One focus at a time.** At the busiest moment one region is sharp and lit; the rest is dimmed or blurred.

## Slop tells (UI in films)

| Tell | Fix |
|---|---|
| A generic analytics dashboard that isn't the product | The product's real screen, or a rebuilt one with its real content |
| Lorem ipsum, "Lorem Corp", `$XX`, made-up growth numbers | Real names and data, or labelled example data |
| Every element of the screen flying in at once | The screen arrives as one object; inside it, one thing changes at a time |
| UI feedback at film speed (slow presses, floaty toggles) | Real UI timings (100-300 ms), cinematic time in the camera |
| Tiny unreadable UI in a wide shot | Scale up and crop to the part that matters |
| Five fonts, three accents, mixed radii | The product's own system, one family, one accent |
| Glassmorphism on every panel, glow on every button | One deliberate material; light on the subject only |

## Done when

- [ ] Every screen is the real product, or rebuilt from library pieces with real content and states.
- [ ] Every label that matters is 22 px+ at 1080p and on screen long enough to read.
- [ ] UI feedback runs at real UI timings; the camera and light carry the film's slower time.
- [ ] Each UI beat shows a cause, a state change and a consequence.
- [ ] The critic judged the UI shown in the film by Drip's UI bar (hierarchy, type, system, real content).

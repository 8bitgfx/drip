# House style: calm, continuous product motion

This is Drip Motion's default look and pace for product films, promos, launches and explainers. It comes from a
close study of one motion designer's SaaS promo work, TimeFrame (https://dribbble.com/TimeFrame_motion), chosen
by the user as the bar. Everything below is our own description of what was measured and seen; nothing is copied.
The brief, the brand's own rules (BRAND.md, DESIGN.md: flat paint, no highlights) and the project's `IDENTITY.md`
override any of it: the glows and tilted planes below are this house look, not a requirement. Its product
windows are the real UI frozen with `motion_ui_freeze` and animated part by part, not screenshots.

Studied as video (13 shots, 14 films with one showreel), sampled every 0.75 s and read frame by frame:
[Connected Workspace for Smarter Team Management](https://dribbble.com/shots/27894209),
[Voice-to-Action Workflow Platform Promo](https://dribbble.com/shots/27894206),
[AI-Powered Task Routing and Team Coordination](https://dribbble.com/shots/27894207),
[Training AI Agents with Human Expertise](https://dribbble.com/shots/27894187),
[AI Document Intelligence and Automated Reporting](https://dribbble.com/shots/27894186),
[Automated Insurance Claims Processing Workflow](https://dribbble.com/shots/27894185),
[Streamlining Restaurant Operations with TouchBistro](https://dribbble.com/shots/27892134),
[Restaurant Management Platform Promo Video](https://dribbble.com/shots/27892130),
[Creative Resources Marketplace Promo Video](https://dribbble.com/shots/27892113),
[Making Legislative Intelligence More Accessible](https://dribbble.com/shots/27892092),
[Scalable Infrastructure for AI & Machine Learning](https://dribbble.com/shots/27851294),
[Cloud GPU Infrastructure in Motion](https://dribbble.com/shots/27851288),
[AI Call Intelligence with Motion Graphics](https://dribbble.com/shots/27851260).
Limits: the files carry no audio track, so section 7 is inference, not measurement. Easing and layers are read
from frames; cut counts, lengths and rhythm are measured. The sampler over-counts "cuts" during fast blurs and
morphs, so shot lengths below are judged by eye where it matters.

## 1. What this does that template and AI motion does not

1. **Nothing ever arrives from nowhere.** A new thing grows out of the old thing's position, colour or shape: a
   row of glowing bars becomes the app window, a dot becomes a card, a single branch splits into three. Template
   motion fades in a new slide; this work hands the previous object to the next.
2. **One idea per film, said as one sentence in pieces.** The copy is a single thought broken into 3-6 short
   fragments that appear over the picture, so the words and the visuals tell the same story at the same time.
3. **The UI is the cast.** Product screens are built as objects (cards, rows, panels, chips) that move, tilt and
   take light. They are not pasted screenshots in a laptop. A cursor does visible work: it presses, drags, and the
   interface answers.
4. **Restraint in the frame.** One focal thing at a time, large empty space around it, one saturated accent
   against a near-black or near-white field. There is no confetti of icons, no five things moving at once.
5. **Depth is cheap and consistent.** A soft light behind a dark scene, a faint blur on whatever is not the
   subject, a gentle perspective tilt on panels. The same few tricks carry the whole film, so it feels lit,
   not decorated.
6. **Smooth, never snappy-bouncy.** Moves ease in and out slowly, settle without overshoot, and overlap each
   other. Nothing bounces or whooshes; speed comes from how soon the next move starts, not from fast moves.
7. **Words are typed into place, not slid.** Lines build word by word at one spot, change a word's colour for
   the key term, then dissolve and are replaced at the same spot, so the eye never travels.
8. **Closure.** Most films end where they began (the opening object returns, or the product mark resolves from
   the last scene), so the piece reads as a loop and the logo arrives as a conclusion, not a sticker.

## 2. Continuous motion: transformation patterns to build

Each pattern is a hand-off. Build them as one timeline `tl` of absolute times; each starts before the last ends.

| Pattern | What it looks like | How to build it |
|---|---|---|
| **Bars to window** | A row of 9-13 rounded vertical pills of uneven height pulse like a voice meter; they collapse toward the centre while one pill widens and flattens into the first app window | Pills are divs with a gradient and inner glow; animate `height` pulses with seeded phase offsets, then tween their `x` to the window's column positions while the window scales from 0.9 and fades up. Hold 0.4 s overlap |
| **Orb to card** | A glowing sphere with orbiting avatars drains into a stack of 3 task chips in its centre | Radial-gradient circle, 5 avatars on a rotating parent; at the hand-off scale the orb down while chips scale up from the orb centre, then the orb's colour is reused as the chip border glow |
| **Branch split** | The logo mark sends out a thin line that forks into 3 labelled cards; later the cards collapse back into the mark | SVG paths with `stroke-dashoffset` drawn from the mark; cards enter at path ends with a 0.2 s stagger. Reverse the same tween for the close |
| **Stack cascade** | Five task rows offset diagonally appear in a staircase, the cursor ticks one; the ticked row lights, then the rest slide off one by one | Rows at `x = i*40, y = i*58`, stagger 0.12 s; a cursor path tween; row border colour tweens on tick; exit rows with the same stagger in the same direction |
| **Colour-coded cards in the dark** | Each dialog on its own coloured glow (amber for a question, green for approval, blue for an update, violet for a request); the background light shifts to match | One CSS custom property `--accent` per card; a blurred radial gradient behind the stage changes its colour over 0.8 s as the next card replaces the last |
| **Card to full interface** | A small dialog dissolves into a blur and the whole window fades up where it was | Card `filter: blur(0 -> 12px)` and opacity down while the window scales from 1.08 to 1; match the centre points |
| **Row focus inside a list** | A table shows a handful of rows; the next row pulses and the list height grows as items arrive | Rows enter with a 0.15-0.25 s stagger; a soft outline highlights the active row; the list container eases its height |
| **Window tilt and tour** | The whole product window sits on a tilted plane in 3D; the camera drifts across it while the cursor works, then pushes into one area | Parent with `perspective: 1800px` and `rotateY(-14deg) rotateX(6deg)`; animate `x, y, scale` and rotation 0 to 4 degrees over 3-5 s; the active panel is lifted with `translateZ(40px)` |
| **Device turn** | A device glides from front to a 3/4 view, slows at the end, and a screen on it changes as it turns | three.js or a CSS 3D box; rotate 20-35 degrees over 1.2-1.5 s, easeInOut, and swap the screen texture mid-turn |
| **Icon chain** | Three icons link into one connected line labelled with the steps | Icons enter one at a time with a 0.3 s stagger; connectors draw between them as each lands |
| **Type to object** | The headline words dissolve and a small icon sits where the last word ended; the icon becomes the next scene's subject | Keep the icon at the word's last-letter coordinates, then scale it up to the next layout |
| **Photo plane stack** | Photos stretched into receding strips converge toward the centre, then a ribbon sweeps through and becomes a logo | Images on tilted planes (`rotateX(60deg)`), scroll them toward the vanishing point, then a gradient ribbon (SVG stroke) traces across and morphs into the mark |
| **Loop return** | The last scene returns to the first shape | Make the final 1.2 s a reverse of the opening move, and set the end state equal to frame 0 |

Rules these patterns share:

- The leading and trailing edges are on different timing: the new thing starts to appear while the old one is still
  at about 30 percent opacity, and the old one finishes leaving 0.2-0.4 s later.
- Blur is a connector, not decoration: about 8-14 px, only while something is in transition, back to 0 when it lands.
- Exits mirror entrances and are about 70 percent as long.
- A shape that is the subject keeps its colour identity across the hand-off (the ticked row keeps its violet).

## 3. Hooks (first 1-2 seconds)

Measured and seen: every film opens with a moving object, never with a title card or a fade from black.

| Pattern | Seen | Timing |
|---|---|---|
| Rhythm object | Glowing pills pulsing like a waveform, with a lit button in the centre | Moving at 0.0 s; the first state change at about 0.7 s |
| Product thing already in use | A cursor sliding to a menu item on a half-visible app panel; text already on screen | Frame 0 is mid-action; the first click at about 1.5 s |
| Phone or device with a glow | A phone tilted in 3D, its screen already live | Visible at 0.0 s; first change at about 1 s |
| Single line grows into a diagram | The mark draws out three labelled branches | Mark at 0.0 s; branch draw 0.3-1.0 s |
| Typed question | Large words type in on a blank field with a caret | Letters begin at 0.1 s; whole line by 1 s |
| Floating labels around a window | Pill chips drift around the product frame | Present at 0.0 s; they settle by 1.2 s |
| Receding strips | Image strips racing toward a vanishing point with the first words overlaid | Words in at about 0.5 s |

The recipe: start in motion with one clear shape, add the first word or action by 0.5-1.0 s, and have the first
state change by 1.5 s. Never open on the logo; the logo is the last scene.

## 4. Script and writing

- **A film is one sentence in 3-6 fragments.** Each fragment is 2-6 words (measured examples ran from 2 to 6; the
  longest typed line built up to 8 words over 4 s). Each fragment shows for 1.5-3 s, and a sentence runs 4-6 s.
- **Tone.** Plain, spoken, mildly confident. A problem sentence, then a contrast, then the product. Verbs do the
  work ("route it", "stalls", "spot changes earlier"). No adjectives about the product, no "seamless", no "powerful".
- **Structure by film length.** 15-20 s: problem (0-6 s), the product doing the job (6-14 s), logo resolve
  (last 2-3 s). 25 s adds a second proof moment.
- **The copy sits alone.** When a line appears the screen is mostly empty (centre, one line, mid-grey on the dark
  field or near-black on white), or the line sits low-left under a calm product panel, never over the busy part.
- **One word gets the colour.** The key term of the sentence picks up the accent for the last second. One word
  per line at most.
- **Lines appear by typing or a soft rise and leave by dissolving into blur at the same spot.** The next line
  begins at the same position.
- **No numbers unless real.** Metrics shown in the UI are drawn from the project or labelled as illustrative.

Example lines in this spirit (ours, written for imaginary products):

1. "Forty tabs open." / "One decision waiting." / "Hearth finds it."
2. "Orders pile up." / "Nobody sees the pile." / "Now everyone does."
3. "A shift change used to cost an hour." / "Now it costs a tap."
4. "Ask the question." / "Get the file."
5. "Receipts, in the right folder, before you ask."
6. "Handled quietly." / "Checked twice." / "Yours to review."
7. "Slow handoffs" / "are where the work goes to wait."
8. "Everything you need, one place away."  (the shortest closer; the logo follows after a 0.5 s hold)

## 5. Visualisations: the kinds of cool visuals and how to build each

1. **Glass UI as objects.** Dark scenes: cards with a 1 px translucent border, a 2-4 percent lighter fill than the
   background, a soft inner glow in the card's accent colour, and a large blurred glow behind it (200-400 px blur,
   15-25 percent opacity). Light scenes: white cards, a 1 px pale-indigo border, a very wide shadow
   (`0 24px 60px rgba(60,60,160,.12)`), pastel clouds in the background. Build the real product UI as HTML
   components, not images, so it can be moved, blurred and lit separately.
2. **Voice and pulse bars.** 9-13 pills of different heights, each with a vertical gradient and a lit edge, each
   pulsing on a sine with its own phase; a circular button at the centre with a glass look. Seeded phases only.
3. **Orbits and avatars.** A sphere with a rim light and 4-6 small circular avatars on a slow orbit (20-30 s per
   rotation, not tied to the beat). Avatars are initials or real assets, not stock faces unless licensed.
4. **Charts as shapes.** Donut rings drawn by stroke-dash; smooth area lines drawn left to right; bar columns growing
   with a 0.08 s stagger; numbers counted up. One accent colour with its 50 percent tint as the second series.
5. **Floating labels.** Rounded chips with an icon and 1-2 words arranged loosely around the main panel; they drift
   slowly (about 20 px over 4 s) and one at a time pulses toward the panel when the story touches that feature.
6. **Tilted planes.** The product window rotated 10-18 degrees in Y with perspective; a bright gradient edge (white to
   accent) shows at the window's far side to sell the plane. The camera drifts and does not shake.
7. **A device on a soft studio ground.** A pale teal-to-white gradient, a gentle floor shadow, the device in a
   3/4 view rotating slowly; features appear as small icons around it, each with a tiny glow.
8. **Clocks, rings, connectors.** Simple precise diagrams: a ring of numbered discs and a single sweeping hand; a
   chain of three icon tiles joined by a rounded connector; a branching line. Built in SVG, drawn with dashoffset.
9. **Cursor.** A realistic pointer or a hand cursor at 28-36 px at 1080p, moving on a gently curved path with
   ease-in-out and a 0.1 s dwell before a click. The interface reacts within 0.1 s: the item lights, a check ticks.
10. **Stock footage as a seasoning.** Several films cut to a short real-person clip (about 1.5-3 s) with a rounded
    caption over it, then back to the product. Drip does not ship unlicensed stock: use footage the user supplies,
    or a licensed source recorded in the sound/asset log, or leave this beat out and stay on product.

Light and material, in one paragraph: dark films use a near-black violet field (about #030112) with indigo
(#0F0457-#1E0497) in the glows, a mid violet (#4F0CD4-ish) for accents and a single warm amber for highlight words;
light films use white with faint lavender or teal clouds and a deep indigo, royal blue or teal accent. Never use
more than one accent hue plus one highlight hue.

## 6. Rhythm: how often something happens

Measured on the 13 shots (lengths 14.5-23.1 s, median about 19 s):

- **Something new every 0.8-1.5 s in UI sequences** (a cursor move, a row arriving, a state change, a type
  step). The sampler's rhythm line shows medium-high change in about 40 percent of seconds, with spikes about
  every 3-5 s where a scene hands over to the next.
- **A distinct beat (a new scene, a new idea) every 3-4 s.** Scenes ran 2-6 s, the product-tour scenes the longest (5-8 s).
- **Text holds 1.5-3 s** per fragment; typed lines take 0.3-0.5 s per word.
- **Cuts are rare.** In the dark and light UI films the sampler found 0-2 hard cuts in 15-23 s (average shot
  length 5-23 s); the cut-heavy films (average shot 1.5-2 s) are the ones that mix in footage and photos, where a
  cut is the hand-off between photo and product, and even there the sampler's number is inflated by blurs.
- **Rests.** After each peak the film holds one calm frame for 0.8-2 s: a settled card, a single sentence on an
  empty field, or the finished dashboard. Never two spikes within 1 s of each other. Typically the film is about
  60 percent "busy" and 40 percent "settling".
- **Position of the peak.** The most energetic second is at the start (the hook), at roughly two thirds (the
  turn from problem to product), and in the final transition to the logo.
- **The logo gets 2-4 s** and its own gentle animation (a mark morphing into a wordmark), then silence/hold.

## 7. Sound fit (inferred; the previews are silent)

Restrained but rhythmic: a clean electronic or synth-pop bed with a clear pulse at roughly 100-125 bpm, crisp
percussion and plucky synths so the UI changes land on hits, a tight bass groove, building toward the turn, lifting
at the reveal and thinning for the logo. Not ambient: a drone or solo piano gives the cuts nothing to land on. Sound effects are light and tactile: a muted tick for a
click or check, a glassy tap when a card lands, a low airy swell under a big hand-off. No whooshes, no risers
every scene, no impact hits, no stinger on every title. Silence is allowed during the single-sentence rests (let the
bed carry). Leave 0.3 s between the final accent and the end. Sound is chosen and logged per `video/sound`; never
generated.

## 8. DEFAULTS (applied unless the brief or IDENTITY.md says otherwise)

```
format:        16:9, 1920x1080, 30 fps (60 only when asked). A 9:16 cut is re-laid out, not cropped.
length:        15-25 s; default 20 s. Under 12 s only for a loop or a title sting.
structure:     hook in motion at 0 s -> problem 3-6 s -> product doing the job 8-12 s -> logo resolve 2-4 s
events:        a visible change every ~1.2 s in UI sequences; a new scene every 3-4 s; a 1-2 s rest after each peak
cuts:          0-2 hard cuts in 20 s; every other hand-off is a transformation
copy:          one sentence in 3-6 fragments; 2-6 words per fragment; 1.5-3 s each; one accent word per fragment
type:          one family (Inter/Geist-style grotesque or similar), weights 400-600; body line 48-64 px on 1080;
               display words 140-200 px at most once per film; UI labels never below 22 px at 1080
position:      centred on an empty field, or low-left under a quiet panel; never over a busy region
entrance:      type-on word by word, or a 0.4 s rise (12-20 px) with a blur-in from 10 px; exit by blur-out at the same spot
palette:       one near-black (or near-white) field + one saturated accent + one warm highlight; glows are the accent
               at 15-25 percent; contrast >= 4.5:1 for all words
light/depth:   a large blurred glow behind the focal object; a faint 1 px edge on glass; tilted planes at 10-18 degrees;
               a gentle perspective camera drift of 2-4 degrees over 3-5 s; background blur on non-subjects 8-14 px
easing:        ease in-out for position (cubic-bezier .45,0,.15,1 or similar), ease-out for entrances, springs with
               bounce 0-0.15; no overshoot bounces; durations 0.5-0.9 s per move, 0.25-0.4 s for small UI changes;
               stagger 0.08-0.2 s
cursor:        28-36 px, curved path, 0.1 s dwell before a click, the UI answers within 0.1 s
motif:         one object persists (a mark, an orb, a row of bars) and the end returns to it
logo:          last scene only, 2-4 s, resolves from the previous scene's shape
sound:         rhythmic clean electronic bed ~100-125 bpm (crisp hits to cut on), under the voice; tick/tap UI sounds on clicks and lands, 1-3 per 5 s; no whooshes;
               silence for 1-2 s at the single-sentence rests
no:            fake metrics, stock people without a licence, particles without meaning, a bounce, a whoosh, a title card
               in the first 2 s
```

Check every film against this: say out loud what is handed to what at each transition, count the seconds between
visible changes, and look at the paused frame at every rest: it should read as a designed still.

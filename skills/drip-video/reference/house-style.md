# House style: the launch film

This is Drip Motion's default for product films, launches, promos and explainers. It comes from a real film made with
Drip (a release trailer for a coding-agent plugin) that went through nine cuts with a user who rejected each miss by
name, and from the launch films it was measured against: Google's Gemini 3 launch, TimeFrame's SaaS promos
(https://dribbble.com/TimeFrame_motion), Aikhan Naimanov's Lovable and Notion pieces, Ordinary Folk's Spline film.
`drip_kit({ template: "motion" })` writes this style as a working 20 s film; you re-skin it, you don't start blank.

The brief, the brand's own rules (BRAND.md, DESIGN.md) and the project's `IDENTITY.md` override any of it.

## 1. What the user asked for, in their words, and what it means

| They said | It means | The rule |
|---|---|---|
| "looks boring", "too static", "not enough happening" | one move per beat isn't enough; holds read as dead | something new lands on almost every beat (about 0.5 s); no hold longer than 2 beats except the final lockup |
| "it's like a slideshow, not continuous" | cards replace cards; cuts to empty frames | the world never stops: cards fly through depth, the 3D world turns slowly the whole film, the next thing arrives while the last leaves |
| "dopamine packed, something moving every second" | density, not speed | 2-3 layers moving at once (words, cards, the camera), one of them leads |
| "looks AI generated slop, the gradients" | glow, aurora, blur-ins, glossy liquid, gradient orbs | flat colour fields, crisp type, real product cards. No glows, no gradients except a mocked template |
| "random selection boxes everywhere", "the blue text highlight looks weird" | decoration that looks like UI but does nothing; coloured highlight blocks behind words | no selection boxes snapping around things; key words stay the same colour as the line. The only frames and handles are the motif's |
| "no cursor", "click animations look weird and buggy" | a white cursor on white cards vanished; clicks landed on things already selected; the card jolted | a dark cursor with a white edge (68 px at 1080p) travels in, presses, and the UI CHANGES STATE (a chip becomes selected, a badge appears). Nothing else jumps |
| "moves weird at the end" | a slow scale push with a different origin per element pulled the lockup apart | the lockup lands and holds still; only a small living detail moves (a drip, a dot) |
| "the text is hard to read" | blurred words, cards crossing the text band | text sits in its own band; cards fly outside it |
| "not even correct (brand) styling" | a generic look instead of the brand's own art | build from the brand's README/brand art: its colours, its type, its mark, its real cards |
| "you already had them: Gemini type launch videos" | the reference was given; don't ask for more | study the reference the user names, then build to it |

## 2. The structure (Gemini-style launch)

```
0      hook: something already moving at frame 0; the first word lands on beat 1
0-6    the claim, one word per beat, real product cards flying past in depth
6-12   the problem: the generic thing (the template every competitor ships) bursts past the words
12-20  the motif is drawn live (the brand's box/shape), the headline lands in it, the camera dives into the brand colour
20-28  the product doing the job: a real card, one click, one state change
28-34  proof: a field of real cards around one real number (never invented)
34-40  the motif becomes the logo; wordmark, tagline, where it works; hold
```
In beats at the track's tempo (40 beats is 20 s at 120 BPM, 19.5 s at 123). A 30 s film adds one more product beat.

## 3. The engine (what the kit template does, and why)

- **Beat grid.** `B(n) = n × 60/BPM`; every start is `B(something)`. Analyse the track (`motion_music analyse`), set
  BPM, trim the track to start on a downbeat, and everything lands on the music with no hand-timing.
- **Words.** Each word sits in its own mask and rises in (`yPercent 130 → 0`, 0.38 s, `power4.out`), one per beat or
  half-beat; the line leaves upward (0.24 s). Hidden words are `autoAlpha: 0` until their beat, so nothing peeks under
  the mask. One family (the brand's display face, 800), one colour. Display 124 px, the big word 190 px.
- **Cards in depth.** A CSS 3D world (`perspective 1500px`) inside a rig that turns ±7° over the whole film. Cards fly
  from `z -2400` to `z +700` past the camera, opacity in 0.2 s, out 0.15 s, then `display: none`. They keep out of the
  text band (|y| > 300 or |x| > 700 while words are up). Use the product's real screens.
- **Clicks.** `click(x, y, t)`: the cursor travels in on a 0.5 s ease, presses (scale 0.86, 0.07 s), and stays a beat;
  at the same time the UI changes state. If the card art already shows the chosen state, lay the unselected state over
  it and remove it on the click.
- **The motif.** One shape the brand owns (here a box: frame, eight handles, a fill) is drawn live: frame grows
  (expo.out 0.36 s), handles pop on a spring (bounce 0.25, 0.025 s apart), the fill pours, the headline rises in it.
  The camera dives into it (scale ×10, `power2.in`, 0.62 s) and the brand colour becomes the next scene's field.
  At the end a frame opens around the screen, collapses into the logo's shape and fills: the motif became the mark.
- **Ending.** The logo wipes in (clip mask), the tagline rises, the "works with" pills pop one per half-beat. Then it
  holds. No push, no drift.

## 4. Look

- Ground: the brand's dark (or light) field with a faint dot grid drifting; full-frame brand-colour fields for the
  middle act. One accent colour.
- Type: the brand's display face at 800 for every line; Inter (or the brand's text face) inside UI.
- Cards: the real UI, at real sizes, on the dark ground with one long soft shadow. Depth comes from z, scale,
  overlap and the slow world turn, not from blur or glow.
- Allowed only when the brand has it: glow, gradients, glass, liquid.

## 5. Sound

- Music: clean, light electronic with a steady pulse, 115-130 BPM; bright and uplifting, never intense. A user called
  an action/breakbeat track and a "minimal tech" track tagged *strange, techno* "video game music"; they took
  Kevin MacLeod's "Inspired" (CC BY 4.0) at 123 BPM and 7 dB quieter. Search, analyse 3-4, then
  `motion_music listen`: the user picks by ear on a page with players. A 3-8% tempo change or a few dB down is
  fine to fit the cut.
- Effects: a soft click on each click, a soft pop when the motif's handles appear and when the logo lands. 4-5 in a
  20-30 s film.

## 6. DEFAULTS (applied unless the brief or IDENTITY.md says otherwise)

```
format:     16:9, 1920x1080, 30 fps. 20-30 s. A 9:16 cut is re-laid out, not cropped.
template:   drip_kit({ template: "motion" }): the launch engine; re-skin it
grid:       BPM from the analysed track; every start on B(n); a new event on almost every beat
words:      one sentence in fragments; masked rise per word; one colour; no blur, glow or highlight block
cards:      real product screens in 3D depth, outside the text band; the world turns slowly all film
clicks:     dark cursor 68 px with a white edge; press; the UI changes state; nothing else jumps
motif:      the brand's own shape, drawn live, dived into, becomes the logo
ending:     logo wipe, tagline, pills; hold still
palette:    the brand's ground + one accent; full-frame accent field for the middle act
no:         glows, gradients, aurora, glossy liquid, blur-ins, coloured highlight words, selection boxes that
            select nothing, white cursors on white, cards jolting, scale pushes on the end card, invented numbers,
            game/action music, a track the user didn't hear
```

Check every film against section 1 before showing it.

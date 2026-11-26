# Motion films

A good motion film is one idea that moves. You can say it in a sentence ("forty-seven scattered tabs fold
themselves into one calm window"), and every second of the film serves it. Something worth watching happens in the
first two seconds. One shape or object survives from start to end and changes meaning as it goes, so the film
feels like a single gesture and not a stack of slides. Things have weight and material: glass moves differently
from paper, the headline differs from the cursor. Busy moments alternate with rest, the biggest moment lands on a
beat of the sound, and the last second settles instead of stopping. Every paused frame holds up as a designed
still. The copy is short and specific, and nothing on screen is invented: no fake dashboard, no made-up numbers.
Most AI-made films fail the same way: every element fades in, cards slide in one after another, particles float
for no reason, and a glow tries to hide that nothing was decided. This guide exists to prevent that.

## The procedure

0. **Defaults.** The default look and pacing come from `drip_guide video/house-style` (its DEFAULTS block) unless the brief or the project's `IDENTITY.md` says otherwise.
1. **Open the task.** `drip_start` with the request, mode `motion`. Read the project first (README, brand files,
   logo, tokens, existing screenshots, any recorded UI). Collect the real assets: logo, product screens, copy,
   brand fonts. Ask only what the project does not answer: audience, where it plays (site hero, X, Instagram,
   a stage), length, whether there is a sound track, and the one thing the viewer must remember.
2. **References: four roles.** `motion_refs` with 2-4 queries about the IDEA and the MOVES, not the product
   ("shape morph product launch", "kinetic type minimal", "ui cursor demo"). For a launch: its LAUNCH FILMS lead,
   and WebSearch finds the closest real launches it lacks (the category leader's, the competitors'); `motion_study`
   plays YouTube, X and Vimeo posts. `motion_study` 1-3 films. Give each
   one a role: **moves** (how things enter, transform, connect), **look** (type, colour, composition), **story**
   (structure, hook), **sound** (how audio lands). A moves reference is required before the storyboard.
   `drip_guide video/research` has the ten study questions. Measured (cuts, shot length) is not inferred
   (easing, layers): say which is which.
3. **Concept.** One sentence, a metaphor for what the product does for the viewer (`drip_guide video/direction`).
   Then the hook, the motif, and 5-9 beats. Write each beat as a concrete verb with a cause ("the cursor drags
   the card; the grid closes the gap behind it"), never an adjective ("dynamic, engaging").
4. **Storyboard.** `motion_storyboard` with concept, hook, motif, format, look, moves, sound, beats and the
   references with what you take from each. It checks studied references, slop copy, gaps, a late hook, missing
   rest, all-cut transitions and words per second. Fix its errors and read its warnings: they are judgement calls
   you answer in the plan, not noise. Composition files are held until it exists. Re-record it when the user
   changes the plan.
5. **Kit.** `drip_kit` with `{ template: "motion" }` writes the composition: a stage in film pixels, a seeded
   `rand()`, a closed-form `spring()` ease, one paused timeline `tl`, `window.__drip`, and a preview with play,
   scrub and frame stepping. Set `FORMAT` from the storyboard. Fonts: `fonts_search`; colours:
   `palette_generate`; icons: `icons_search`; stills or textures: `images_search` (licences recorded) or
   `gen_image`.
6. **Style frames.** Before animating, build the key moments as static compositions (the storyboard's beat
   starts, plus the end) and look at them with `motion_frames` and `times: [...]`. Fix type size, hierarchy and
   colour here, where changes are cheap. Check at about 360px wide too. Do not animate a frame you would not
   print. (`drip_guide video/styles`, `video/type`.)
7. **Build the timeline.** Everything on `tl` at absolute times, one label per beat. Write the motif's journey
   first, then the text, then secondary motion. Springs with bounce 0-0.25, per-object easing, overlapped
   action. Put sound accents on labels. Procedural elements are precomputed into arrays at load
   (`drip_guide video/procedural`). Product screens are real (`drip_guide video/product`).
8. **Look at real frames.** `motion_frames` with no times: a 16-frame sweep of the whole film. Then
   `around: [every transition]` (shots at -0.25, -0.1, 0, +0.1, +0.25 s) and `from`/`to`/`step` (about 0.033)
   on the fastest moments and every morph. Judge the whole morph, not its ends. A clean sweep on the current
   files is also what lets the turn end. Then **measure the movement**: `motion_trace` (one still says nothing
   about motion). Its dopesheet shows choreography (who leads, who follows, rests, everything-at-once) and its
   onion skins show spacing and arcs (bunching dots = easing, even dots = linear, a dot past the end = overshoot).
   Fix what it flags (dead stops, linear moves, hitches, one duration for every move) unless it's deliberate.
   Give important elements `data-track="name"` so the lanes read.
   **Sound and voice** run alongside: music found and analysed early when it drives the story (`motion_music`:
   tempo, bars, drops; beats on bar lines, the big moment on the drop), narration cast and recorded with
   `motion_voice` (`drip_guide video/voice`), a few calm UI sounds at most (`motion_sound`).
9. **Draft render, then measure it.** `motion_export` with `draft: true` (half size, 15 fps) to catch errors
   fast. `motion_study` the file: duration, cuts, rhythm and shot lengths must match the storyboard.
10. **Critic once.** `critic_prepare({ kind: "motion", targets: [...] })`, then the Agent `drip:critic` with the prompt
    unchanged, then `critic_record`. It is one review of the near-final cut, not a gate: fix what you agree with, and
    `drip_end` hands what it left open to the user, who decides whether it ships or gets another round. Only a clean
    `motion_frames` sweep on the current files holds a turn open (`drip_guide video/critic`).
11. **Fix.** Fix every S0/S1 finding and the cheap ones. Keep decisions the user approved: do not re-do a
    sequence they liked because you changed another. Re-run the sweep.
12. **Final render.** Local copies of libraries next to the file, fonts loaded, then `motion_export` at full
    size with the audio file if there is one. `motion_study` the final MP4: that is the check on the video
    itself. Render other formats (9:16, 1:1) by changing the format and re-checking the layout, not by cropping.
13. **Identity.** When the user approves, write `.drip/motion/IDENTITY.md`: the motion language (timings,
    springs, materials, transitions, sound) apart from the visual identity, so the next film in this project
    starts from it. `drip_end` closes the task.

## The core numbers

Film timing is slower than UI timing. UI is 100-300ms; a film move is read by someone who is not holding the
mouse, so it needs room.

| Thing | Film value | Why |
|---|---|---|
| Hook | something new by 0:00-0:02 | viewers leave at the first plain frame |
| New thing on screen | every 2-4s | keeps attention without constant noise |
| Small element enters | 0.4-0.7s | UI is 0.15-0.3s; film needs to be seen |
| Hero or big move | 0.8-1.4s | weight needs time to move and to settle |
| Scene transition | 0.6-1.2s | long enough to be read, short enough to stay with the beat |
| Settle after a spring | 0.3-0.6s after the peak | the overshoot must be visible |
| Anticipation | 0.08-0.2s, 10-20% of the move | a tiny pull-back before a big move |
| Overshoot | 0-25% of the distance | 0 for type and UI, 10-25% for playful objects, never on everything |
| Stagger, items in a group | 0.04-0.12s each | tighter than 0.04 looks like one block, more than 0.15 drags |
| Stagger total | under 0.8s for a group, under 1.2s for a long list | the last item must not arrive after the first is forgotten |
| Exit length | 65-75% of the entrance | leaving is faster than arriving |
| Hold on a key frame | 0.6-1.5s for one line, 1.5-2.5s for a hero state | time to read plus a beat |
| Text on screen | about 3 words a second, plus 0.4s to settle | slower for numbers and names |
| One idea per beat | one headline or one line, not both fighting | the eye can follow one thing |
| Rest between peaks | 1 beat of calm after every 2 busy ones | contrast makes the peak |
| Loop | the last frame equals the first, exactly | a loop that jumps is a bug |
| Ending | settle 0.8-1.5s, then hold 1s | abrupt endings feel unfinished |

Read these as defaults for a 15-45s film. A 6s logo sting compresses all of them by a third; a 90s explainer can
double the holds.

## Rules that never bend

1. **Concept before animation.** No timeline until the concept, hook, motif and beats are written and checked.
2. **One clock.** Everything on `tl`. If a library animates by itself, wrap it and drive it from the clock
   (`drip_guide video/render`).
3. **Real material only.** Real logo, real product screens, real copy. Never redraw a product UI from memory,
   never invent numbers, testimonials or capabilities. Illustrative data says "Example data" on screen.
4. **A motif survives.** One object persists and transforms; new objects are introduced from existing ones.
5. **Hierarchy at the busiest moment.** One thing dominates, one supports, the rest recede or hold still.
6. **Destination before trajectory.** Design the frame the move ends on, then the path to it.
7. **Different things move differently.** Per-object easing, weight and timing. Identical springs everywhere read
   as a template.
8. **Every major movement has a consequence.** Something is revealed, displaced, triggered or understood.
9. **Frames either side of every transition are checked**, with `motion_frames around`.
10. **Preserve position and velocity** where one move hands over to the next. A stop between joined moves looks
    like a bug.
11. **Sound and motion are designed together.** Accents land on labels, silence is chosen, nothing is generated in
    code. Every imported sound records source and licence.
12. **Test at real viewing size**, on a phone for 9:16, and with the sound off.
13. **Keep approved decisions between revisions.** Change one sequence at a time and say which.
14. **Separate visual identity from motion identity.** "Less bouncy" changes motion parameters, not the logo.
15. **Never a dead frame, always something to look at.** Every beat names its visual: light (a glow behind the
    subject, a sweep across it), depth (UI on tilted planes, parallax, blur on what isn't the subject), a rich
    object (particles forming a shape, a dot globe, a number rolling, orbiting cards). Layers stay alive behind the
    action (a light field, grain, a slow camera drift). Something new starts about every 0.8-1.5 s; one rest of
    1-2 s after a peak. A brand that is flat colour still gets light, depth and layering: flat fills on an empty
    ground with one move per beat is basic, however clean. The seekable visuals in `drip_kit({ template:
    "motion-visuals" })` are the starting point (`drip_guide video/visuals`). `motion_frames` flags mostly empty
    frames; `motion_trace` flags stretches where nothing new starts.
16. **The product's UI meets Drip's UI bar.** Real screens or rebuilt ones with real content, one system, real
    states, readable at video size (22 px+ at 1080p), and UI feedback at real UI timings (100-300 ms) while the
    camera and light carry the film's slower time (`drip_guide video/ui`).

## Craft in one screen

Detail lives in the reference files. The short version:

- **Easing is a velocity curve.** `power3.out` (fast start, soft landing) for things that arrive; `power2.in`
  (slow start, fast end) for things that leave or fall; `expo.inOut` for a big morph; `spring({ bounce })` for
  objects with weight. Linear only for mechanical loops and scrubbing. Never `ease-in` on an arrival.
- **Leading and trailing edges differ.** On a morphing shape, move the leading edge on a quick spring and the
  trailing edge on a softer one, 0.05-0.12s later. The shape stretches and recovers.
- **Overlap.** Start the next move before the last one finishes (at 60-80% of it), unless you want a beat of
  silence on purpose.
- **Counter-motion.** When the hero moves right, let the background drift left 5-10% as far. Depth appears.
- **Hold with life.** In a 1-2s hold, keep something small moving (a 1-2% scale drift, a cursor blink, a slow
  parallax of 10-20px). A frozen frame looks like a stall.
- **Exits are quieter.** Drop the exit length to 65-75% of the entrance, move less far, no overshoot.

## Copy

Short, human, specific. A viewer gets about 3 words a second, one idea per beat. Text complements the picture,
it does not describe it. Say what changes for the viewer, not what the product is called.

| Weak | Better |
|---|---|
| Unlock the power of seamless AI-driven workflows. | You have 47 tabs open. We can fix that. |
| Revolutionary new platform | Ship on Friday. Sleep on Friday. |
| Powerful analytics at your fingertips | See which button nobody clicks. |

No fabricated stats, testimonials or features. If a number matters, it comes from the user or the product, and
"Example data" labels anything illustrative. `motion_storyboard` rejects stock buzzwords; do not argue with it,
rewrite the line. Details in `drip_guide video/direction`.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Every element fades in with a slide-up | Give each entrance a reason: it comes from somewhere (the motif, an edge, a cursor) |
| Slides that replace each other | One persistent object; the next scene grows out of the last |
| Random floating particles or dust | Particles that carry data, form the shape or react to the motif, or remove them |
| Constant slow zoom | A camera move that starts and ends on designed frames, or no camera |
| Three identical feature cards one after another | A different representation per feature, or one feature at hero size |
| Identical spring on everything | Per-object bounce, duration and delay; type gets bounce 0 |
| Glow and gradient doing the work | One deliberate colour move; remove the glow and see if the film still holds |
| Everything moves at once | Hierarchy: one lead, one follow, the rest hold |
| Constant high energy | Plan an energy curve (build, rest, peak, resolve) in the storyboard |
| Fake dashboard | Real screen capture, or no UI at all |
| Generic stock music | Music chosen for the brand and audience, with accents on real beats |
| Abrupt ending | Settle: the motif comes to rest, hold a second, end on the brand |
| Template composition (centered title on a gradient) | Art-direct the frame: scale contrast, an unexpected crop, a grid |

These are contextual tells, not bans. A fade is right when it is the idea. `drip_guide video/critic` has the full
table and the 12-point checklist.

## Sound (direction, not generation)

Sound is found, chosen and mixed, never composed or synthesised in code. **Find before you make**: music comes
from licensed libraries or the user's files (`motion_music` search); generated music is a fallback only when the
user asks (`motion_music` generate, Eleven Music with a plan timed to the storyboard). Pick music first when it
drives the story, then `motion_music` analyse it: tempo, bars, sections, builds and drops. Scene changes go on bar
lines, the big transformation on the drop, rests in the quiet bars; `from` starts the track so its drop meets your
moment. **Effects are rare and calm**: most beats have none; when used, a smooth UI sound (soft click, glassy tap,
gentle pop) on a meaningful interaction, never whooshes or risers by default (`motion_sound`, placed by sync point).
**Narration** is cast and recorded with `motion_voice` (ElevenLabs, the user's key): script for the ear, voices
chosen by the user by ear from free previews, the animatic timed to free estimates, and the paid recording made
once, after the user approved the cut (a rendered video of the current version): one chained performance, word timings that captions and key visuals lock to
(`drip_guide video/voice`). `motion_export` mixes it all with the music ducked under the voice. Every sound records
its source and licence in `sound/LICENCES.md`. See `drip_guide video/sound`.

## Done when

- [ ] The concept is one sentence, the hook lands by 2s, and a motif survives to the last frame.
- [ ] `motion_storyboard` recorded without errors; its warnings are answered, not ignored.
- [ ] At least one moves reference was studied and the storyboard says what was taken.
- [ ] The composition obeys the contract: one `tl`, seeded `rand()`, no timers, no CSS animations, fonts loaded.
- [ ] Style frames were checked before animating; type is readable at 360px wide and at phone size for 9:16.
- [ ] A clean `motion_frames` sweep on the final files, plus `around` every transition and dense checks on the
      fastest moves; `motion_trace` read for every beat and its flags answered.
- [ ] Every transition carries something across; any hard cut has a reason.
- [ ] There is rest between peaks and a settled ending; loops close on the first frame exactly.
- [ ] No fake UI, invented numbers or buzzword copy; illustrative data is labelled.
- [ ] Sound: every sound has a source and licence recorded; the film works muted and the soundtrack works alone.
- [ ] The critic ran once on the sweep and strips; S0/S1 findings are fixed.
- [ ] Final render made from local libraries; `motion_study` of the file matches the plan (duration, cuts).
- [ ] The user approved and `.drip/motion/IDENTITY.md` is written.

## Reference files

| File | What it holds |
|---|---|
| `drip_guide video/direction` | Concepts and metaphors, hooks, copy rules, motion identity and feedback translation |
| `drip_guide video/craft` | The principles table, easing as velocity, materials, choreography |
| `drip_guide video/continuity` | Motifs, morphs, match cuts, masks, camera transitions, hard cuts |
| `drip_guide video/styles` | A style vocabulary to mix, aesthetic families, brand studies, studios |
| `drip_guide video/type` | Kinetic typography, sizes, readable time |
| `drip_guide video/procedural` | Seeded randomness, noise, simulations as frames, choosing a renderer |
| `drip_guide video/product` | Product demos, cursors, device frames, real screens |
| `drip_guide video/camera` | 2.5D and 3D camera, parallax, pull-backs |
| `drip_guide video/sound` | Music (find, analyse, drops), calm UI sounds, licences, the mix |
| `drip_guide video/ui` | UI in films: Drip's UI rules applied to the product on screen, sizes for video, UI timings vs film timings |
| `drip_guide video/visuals` | The seekable visuals library: light fields, glows, 3D planes, particles to shape, globes, numbers; making each beat rich |
| `drip_guide video/voice` | Narration: script for the ear, casting, ElevenLabs models and settings, timing to picture |
| `drip_guide video/render` | The seek contract, determinism, renderers, formats |
| `drip_guide video/critic` | Anti-slop table, 12-point checklist, self-review |
| `drip_guide video/research` | Studying reference films, the ten questions |
| `drip_guide video/studios` | Studio studies: measured cuts and rests, techniques to take per studio |
| `drip_guide video/components` | SnapCN video pieces by beat, the seek adapter, finding more pieces |
| `drip_guide video/house-style` | The default look and pacing: transformation patterns, hooks, copy, rhythm, DEFAULTS |

## Sources

Ideas adapted in Drip's own words from these MIT-licensed projects:

- manuvegax/motionsmith: the style atlas, action as a verb with a consequence, designing the destination frame
  first, exit length against entrance length, hold checks.
- AbubakrChan/product-launch-motion: one persistent shape that transforms, leading and trailing edges on different
  springs, cursor-driven UI that really changes, soundtrack first, a pull-back to reveal scale, keeping approved
  sequences across revisions.
- charlie947/motion-graphics-skills (motion-brief-writer, motion-effects): moves reference versus look reference,
  loops that close exactly, fonts before frame 0, small motion during holds, labelling invented numbers.
- abdullatif06/claude-motion-director: real assets only, a beat grid (hook within about 2s, something new every
  2-4s), matching the last frame of a scene to the next scene's first, checking frames either side of transitions,
  sound recordings logged with source and licence.
- LottieFiles/motion-design-skill: UI-scale timing tables, used as contrast for film timing; entrance against
  exit; stagger totals.

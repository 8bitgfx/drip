# Critic: anti-slop table, checklist, self-review

The critic reads frame sheets, not playback. It runs once, after a clean `motion_frames` sweep and transition strips,
via `critic_prepare({ kind: "motion" })`, then the Agent `drip:critic`, then `critic_record`. This file is what to
check yourself first, so the critic finds little.

## The anti-slop table

These are contextual tells, not bans. A fade is right when it is the idea; a glow is right when light is the
subject. The question is whether anyone decided it.

| Template tell | What to do instead |
|---|---|
| Every element fades in | Give each entrance a purpose: from the motif, an edge, a cursor, a mask |
| Disconnected slides, each built from nothing | A connected composition: one object persists, each scene grows from the last |
| Random floating particles | Procedural elements with meaning (pieces of the motif, sparks from an impact, a field that reacts) |
| Constant zooming | An intentional camera: a move with a reason and a designed destination |
| Repetitive feature cards | A distinct representation per feature, or one feature at hero size |
| Identical springs on everything | Motion per object: material, weight and bounce differ |
| Excessive gradient and glow | Deliberate colour: a limited palette, one event of colour on the beat |
| Everything moving at once | Hierarchy: one lead, one follow, the rest hold |
| Constant high energy | Rhythm: build, rest, peak, resolve |
| Fake dashboards | Real UI, or a metaphor instead of a screen |
| Generic stock music | Music that fits the brand, with accents on real events |
| Abrupt ending | Settling: the motif comes to rest, a hold, the brand |
| Template compositions (a centered title on a gradient) | Art direction: scale contrast, a crop, a grid, a point of view |
| Blurred, glowing or highlight-boxed words | Words rise out of a mask in one colour |
| Selection boxes or handles that select nothing | Frames and handles only on the motif; a choice is a UI state change |
| A click with no consequence, or a cursor lost against the card | A visible cursor presses and the UI changes state |
| A 3-4 s hold on one card | An event on almost every beat; the world keeps moving |
| A drifting or scaling end card | The lockup lands and holds |

If more than three rows describe the film, it is a template. Return to the concept.

## The 12-point quality checklist

Score each 1-10 for yourself, and fix anything below 7.

| # | Point | Ask |
|---|---|---|
| 1 | Hook and originality | Is something worth watching by 0:02? Could this describe a competitor's film? |
| 2 | Composition and type | Is every pause a designed still? One focal point? Type readable at video size and on a phone? |
| 3 | Brand consistency | Do colours, type and motion character match the brand and the motion identity? |
| 4 | Narrative clarity | Can someone say what it is about after one viewing, with the sound off? |
| 5 | Metaphors | Is there a visual idea (a before and an after), not a list of features? |
| 6 | Animation quality and easing | Different materials move differently? Overshoot controlled? Anticipation and settle present? |
| 7 | Continuity | A shared element across every transition? Position and velocity preserved? |
| 8 | Pacing and rest | Calm between peaks? A breath before the big moment? A settled ending? |
| 9 | Sound sync | Accents on real events, silence chosen, narration clear? (Judged from the cue sheet and plan.) |
| 10 | Product accuracy and readability | Real screens, no invented numbers, readable at size? |
| 11 | Technical quality | No clipped text, collisions, half-drawn frames, banding or flicker; loops close; correct format |
| 12 | No generic AI look | The table above, with fewer than three rows true |

## Self-review from sheets

Do this before calling the critic.

1. **Sweep:** `motion_frames` with no times. Read left to right as time. Note timestamps (0:04.2) for every issue.
2. **Transitions, both sides:** `around: [every transition time]`. Each strip should show something shared across the
   boundary. Frames at -0.1 and +0.1 should look like one picture.
3. **Fast intervals, densely:** `from`, `to`, `step` of about 0.033 across the fastest moves and every morph. Look
   for collisions, half-drawn type, a path crossing itself, a missing frame of anticipation.
4. **Real viewing size:** view sheets small. At 360px wide the hierarchy and the type must still read. For 9:16,
   check on a phone-width view.
5. **Without sound:** does the film still work? Then **the soundtrack alone:** does it have a shape?
6. **Measure the render:** `motion_study` on the draft or final. Duration, cuts and rhythm against the
   storyboard. The sound plan against the music's real structure.
7. Write the three worst problems and fix them before the critic sees it.

Measured facts (cuts, shot lengths) are measured; easing, weight and layers are your reading of stills. The critic
labels the same split (`inference`).

## The new rules

These apply to every film.

1. **Every major movement has a consequence.** Something is revealed, displaced, triggered or understood. A move
   with no consequence is decoration; cut it or give it one.
2. **Destination before trajectory.** The end frame is designed first, then the path.
3. **Hierarchy at the busiest moment.** In the frame with the most going on, one thing still dominates.
4. **Preserve position and velocity** when one move hands over to the next.
5. **Materials differ.** Glass, paper, type, elastic and metal do not share a curve.
6. **Inspect whole morphs**, not their ends, with `around` or a dense `from`/`to`.
7. **Motion blur reinforces, never hides.** Use it to show speed on a fast move; do not use it to cover a weak
   transition or low-resolution art.
8. **Audio and motion are designed together.** Sound is chosen with the picture, not added after.
9. **Keep approved decisions between revisions.** Say which sequences are locked; change one at a time.
10. **Test at real viewing size.** Phone for 9:16, laptop for 16:9.
11. **Separate visual identity from motion identity.** Feedback about motion changes parameters, not the logo or palette.

## Giving the critic a good brief

`critic_prepare` takes the film's sheets. Add context so it judges against the plan:

- The one-sentence concept and the hook.
- The audience and where it plays (a site hero, a feed, a stage).
- What the user already approved (so it does not reopen it).
- That sound is judged from the cue sheet and the music's description, not heard.

Do not tell it the film is good. Do not ask it again before fixing what it said.

## After the critic

- Fix every S0 and S1 finding.
- Fix cheap findings in the same pass.
- For a finding you disagree with, say why in the record rather than ignoring it.
- Re-run the sweep and transition strips, then render.

## Done when

- [ ] The self-review sheets were read at small size, with timestamps for every issue.
- [ ] No row of the anti-slop table is true without a stated reason.
- [ ] Every point of the 12-point checklist is at least 7.
- [ ] The critic ran once; its S0/S1 findings are fixed.

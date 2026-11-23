# Product shots: animated demos

An animated demo is a short film in which one thing happens in a believable product. Every motion has a cause, the viewer can follow it at normal speed, and the payoff is visible at the shown size. Most of the quality is in the plan and the frame; motion only makes a good still better. Frame the still first (`productshots/frames`), then animate.

## Pick the story's shape

| Shape | The story | Cursor | Example |
|---|---|---|---|
| **How it feels to use** | One satisfying gesture; the result appears under the hand | Yes | Cmd+K, type, Enter, the issue is assigned |
| **A flow** | A few screens told as one continuous object, payoff on the last | Yes (or touch on a phone) | Card opens into its screen, a booking is confirmed |
| **What the system does** | A consequence lands somewhere else; the link is visible | Usually none | A payment arrives, the payout row appears, the total rolls |

Pick the shape from what the product is valued for. A demo forced into the wrong shape gets busier, not better. Between a richer story and a calmer frame, choose the frame.

## Beats and timing

- **3 to 5 beats building to one payoff.** One gesture and one response can be enough.
- **Hero loop: 10 to 16 seconds.** A repeat is a short beat, never the whole flow twice.
- **Open on a finished screen that works as a still,** with real content already there.
- **The payoff holds about 2 seconds** before anything resets; nothing on screen sits still for more than ~3 seconds otherwise.
- **No dead air at the seam:** within about a second of the exit, the next action has begun.

Write the beats before code:

```
Poster: inbox with the reply sent and "Resolved" on the thread
1  0.0s  Cursor rests in empty space beside the thread list
2  1.2s  Moves to "Reply", presses, composer opens with its height
3  2.4s  Types 38 characters (~45 ms/char, natural jitter)
4  4.6s  Presses Send; bubble moves from composer into the thread
5  5.8s  Status pill rolls Open → Resolved; count in sidebar rolls 12 → 11
   8.0s  Hold
   10.0s Reset: reply and status leave together in reverse, 60 ms apart
```

## The poster frame

- Most people see one frame: a thumbnail, reduced motion, a screenshot, a slow connection. Choose the beat that tells the story alone (the result on screen, the swipe mid-way with Archive showing).
- Never a frame caught mid-change (a digit mid-roll, a label mid-morph).
- Under `prefers-reduced-motion: reduce`, render the poster still. Before the demo enters the viewport, show the poster.

## Easing and duration

| Motion | Curve | Duration |
|---|---|---|
| Travel (cursor, a card moving across) | `cubic-bezier(0.45, 0, 0.1, 1)` | By distance: 500 to 900ms |
| Arrival from nowhere (a card, a toast) | `cubic-bezier(0.25, 0.8, 0.25, 1)` | 400 to 800ms |
| Thing that grows as it travels (thumbnail into card) | Soft start, long deceleration | 600ms+ |
| UI feedback (press, hover, toggle) | `ease-out` | As fast as the real product: 100 to 200ms |
| Phone in-app transitions | `cubic-bezier(0.3, 0.75, 0.1, 1)` | ~500ms |
| Colour change between distant hues | `ease` | ~200ms (any longer passes through mud) |

- Storytelling motion may be unhurried; product feedback never is. A press responds on press.
- Related responses overlap: a changed setting leads its label, then its dependents, while the frame holds. Causes still precede effects.
- Stagger groups in reading order 40 to 80ms apart; 80 to 120ms between grid tiles.
- No bounce on solid things; a small expressive icon may overshoot while its card settles without one.
- `drip_guide motion` for curves in depth.

## The cursor

- **Rests on empty surface** between beats, near its next move; never parked on an unused control.
- **Never covers the words it clicks:** aim inside the target but off its text (around 85% across, 60% down).
- **Every move goes somewhere for a reason:** to the next action, carrying an object, or out of the way. A cursor wandering for motion's sake is noise.
- **Its kind matches what's under it:** arrow over buttons and app chrome, I-beam over text fields, grab/grabbing for drags, resize arrows on edges. It changes as it crosses the edge, not after arriving.
- **Press is visible:** the cursor dips (scale ~0.9 for 100ms) and the control shows its pressed state before the result.
- **Stays where the press happened** while the result changes size; never glued to a moving button edge.
- **On a phone, use a touch indicator** (a soft circle), never a desktop arrow.
- **No cursor means no stand-in:** don't walk a spotlight or focus ring between controls; let states and timing tell a system story.
- **Keyboard stories show the keys:** a small keycap overlay (⌘ K) appears with the press.

## Text and values that change

- **Every change moves.** A label rolls or crossfades in its slot; a menu replaced by another slides; a number rolls. Nothing jumps in one frame.
- **Change only what changed.** Animate the changed word, and move what follows by its measured width. Never roll unchanged words.
- **A button's new label changes on the same button** (crossfade the label, ease the width so neighbours move with it). Never swap in a second button.
- **Status words** (Queued → Running → Passed) roll vertically in a clipped slot; several rows changing at once cascade ~60ms apart.
- **Numbers roll digit by digit,** last digit first, unchanged digits still, in tabular figures, then hold. A right-aligned value changes against its right edge.
- **Typing:** 35 to 70ms per character with small random variation, a blinking caret (530ms) only while idle, the field's height grows smoothly if it wraps. Typed text that becomes a chip keeps its words while the chip surface grows around them.
- **A draft becomes the posted message in place,** holding its final height from the first keystroke so nothing below jumps on send.
- **Streaming AI answers** grow line by line with the container's height easing; sources and actions arrive last.

## Things that arrive, travel and leave

- **Nothing pops.** Everything has an entrance and stays mounted until its exit finishes.
- **Solid things don't fade through.** Windows, phones and cards arrive by moving, opaque or nearly; a half-transparent card is a ghost. Cards, toasts and pills arrive whole from just above, never revealed by a hard clip.
- **Neighbours make room continuously** as the newcomer arrives: a new row carries the rows below it by animating the container's height, not by shoving them in one frame.
- **Content arrives after its container** and a resizing surface moves size, position and content as one transition, never stretching its text.
- **One object, one trip,** ending exactly in its final place: open the room, measure the slot, then fly. Measure the landing element itself, not its padded wrapper, so there is no jump at hand-off.
- **Landings are soft:** decelerate over the last third, no bounce, no ring pulse.
- **A carried card is held:** scale ~1.03, a deeper shadow, a degree or two of tilt for the whole card, settling flat on drop.
- **Drags start where the thing is** and keep the grab offset all the way; the drop slot appears in place and the others make room.
- **Text selection stays under the I-beam** every frame, left to right from a word boundary.

## Loops and resets

- **A reset removes what the loop added as one thing:** the reply and its reaction leave together, new rows leave in one motion.
- **Every reset has a visible cause or is invisible:** an Undo with its keycaps, a Clear button, a panel closing over the change, or a cut while something covers the screen.
- **Data never rewinds in view.** Snap it back while hidden, or bring the next loop's data in as new (a conveyor).
- **Never play a navigation backwards** (a pushed screen sliding back, an app shrinking into its notification). Undo state in place in a quick reverse stagger, last change first.
- **A second scene earns its length** by adding something new (a different outcome or side); repeating the beat doubles the loop for nothing.

## Camera

- Push in only when the payoff would be too small to read; one push-in per story, in and back out; the cursor holds still while the view moves. Frame the wide shot as a good still first; a zoom never rescues a weak frame.

## Building it

- **Drive from a timeline,** not scattered `setTimeout`s: a list of beats with times that set state (`{ composerOpen: true }`, `{ typed: 38 }`), so a beat can be scrubbed, paused and resumed. Motion (React's Motion library), GSAP timelines, or a small `async` script with `await wait(ms)` all work; keep elements mounted and toggle state so exits animate.
- **Measure targets** (`getBoundingClientRect` on named elements, recomputed on resize) for cursor paths and flights; never hard-code coordinates.
- **Only animate `transform` and `opacity`** for travel; height changes through a measured container or `grid-template-rows: 0fr → 1fr`.
- **Play policy:** a hero loops while in view; a feature card plays once as it enters, or on hover; pause on `visibilitychange` and when out of view; offer a pause button for anything looping longer than 5 seconds.
- **Reduced motion:** the poster frame, still. Optionally step through beats as crossfaded stills on click.
- **Accessibility:** the whole demo is `role="img"` with a label that tells the story ("Replying to a customer and resolving the thread"); everything inside `aria-hidden`; a visible pause control is a real, focusable button outside the image role.

## Review the film

Watch at normal speed, then step through each beat at 40 to 80ms frames:
- [ ] Does the poster tell the story alone, and is it a settled frame?
- [ ] Is every cursor move explained, and does the cursor stay off the words it clicks?
- [ ] Does anything pop in or out, jump at a hand-off, or slice text with a moving edge?
- [ ] Do neighbours move with insertions and removals?
- [ ] Does the payoff read at the shown size and hold ~2s?
- [ ] Does the loop reset with a cause, without rewinding data in view, with no dead air at the seam?
- [ ] Does it pause off screen and stand still under reduced motion?

Say what you watched and what you could not check; a screenshot of one frame proves nothing about the frames between.

## Demo slop tells

| Tell | Fix |
|---|---|
| Cursor wandering in curves between unrelated controls | Every move goes to the next action |
| Typewriter text with a robotic fixed rhythm | Small per-character variation; realistic speed |
| Elements fading in one after another for no reason | Things arrive because something caused them |
| Labels swapped in one frame | Roll or crossfade in a fixed slot |
| A new row snapping in and shoving the list | The container's height carries the rows below |
| Everything resets with a jump cut back to the start | Reverse stagger in place, or a covered cut |
| 30-second loop replaying the whole flow twice | 10 to 16s, one story |
| Sparkle burst when the AI finishes | The answer itself, streamed |

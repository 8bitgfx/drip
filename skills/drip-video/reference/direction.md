# Direction: concepts, hooks, copy, motion identity

The concept is the film. Everything else (style, timing, sound) is how it is carried. A film without a concept is a
list of features set in motion. Spend more time here than anywhere else, and write it down in
`motion_storyboard` before any composition exists.

## From product to concept

Start from what the product does for the viewer, find the generic image, then find the creative one. The generic image
is what everyone else will make. Use it as the thing to move away from, not to ship.

| Product | Generic | Creative direction |
|---|---|---|
| Productivity tool | A checklist ticking | Chaos organising itself: scattered scraps slide into a single calm grid |
| AI assistant | A glowing orb or chat bubbles | An empty cursor becoming a workspace: the blinking caret grows into the screen |
| Cloud storage | A cloud icon with arrows | Fragments forming one system: loose pieces magnetise into one solid block |
| Design tool | A mockup zooming | Raw geometry becoming composition: circles, bars and lines land on a grid and turn into a layout |
| Security | A shield with a tick | A fragile system assembling into a structure: thin lines thicken, lock and carry load |
| Developer platform | A code window scrolling | Lines of code building a world: text rows lift off and extrude into a skyline |
| Analytics | Bars rising | One noisy line being tamed into a clear curve, then a single highlighted point |
| Finance app | Coins and graphs | A messy pile of receipts collapsing into one number |
| Communication | Message bubbles popping | Many threads converging into one thread that stays |
| Hardware | A product spin | Components arriving and assembling around the object, exploded view in reverse |

Test a concept in three questions: Can it be said in one sentence? Could it describe a competitor's film as easily?
Does it have a visible start state and a visible end state (a before and an after)? If it fails the second, it is
generic. If it fails the third, it has nothing to animate.

## The motif

Pick the object that survives. It is usually the first thing the viewer sees. It may be the logo's shape, a
cursor, a card, a line, a dot, a letter. Rules:

- It changes size, shape, colour and role, but it is never replaced by a fresh copy in a different place.
- Each beat gives it a new meaning: dot, then cursor, then card, then window, then logo.
- It is on screen at every transition. If a transition does not involve it, something else must carry across
  (a colour, a position, a line).

## Hooks

The first 2 seconds must give the viewer a reason to stay. Four kinds work, and a hook usually has one clear one.

| Hook | What it does | Example |
|---|---|---|
| Curiosity | Opens a question | A single grey square sits in a dark void, then splits in two |
| Recognition | The viewer sees themselves | 47 browser tabs stacked and shaking |
| Surprise | Breaks an expectation | A calm page suddenly drops through the floor |
| Visual satisfaction | A move that feels good | A perfect elastic snap into a grid |

Do not open with a logo fade, a title on a gradient, or two seconds of black. If the brand must appear early, make
the logo the surprise (it arrives as the result of a move, not as a card).

## Beats and energy

A 30s film has 6-9 beats. Give each beat a number from 1 to 5 for energy and a transition from the last. A useful
shape: hook (4), build (3 then 4), rest (1-2), peak (5), resolve (2), end card (1). If all beats are 4+, nothing is a
peak. If all are the same, nothing builds.

Every beat is one action and a consequence. Write it as a verb: separate, collect, push, reveal, compress, compare,
erase, pass through. "Dynamic transition" and "cinematic feel" are not actions.

## Copywriting rules

- Short, human sentences. Say it as a person would say it to a friend.
- Specific claims. "Cuts review time from two days to two hours" only if that is true and sourced; otherwise "Review
  without the waiting."
- One idea per beat. One line, 3-6 words, held long enough to read at about 3 words a second.
- Text complements the picture; it does not describe it. If the picture shows tabs closing, the text says what that
  means ("One window. Everything in it."), not "Tabs are closing".
- Never fabricate: stats, testimonials, customer logos, features, integrations, prices. If an illustrative number is
  needed, label it "Example data" on screen.
- No buzzwords. `motion_storyboard` refuses the stock ones (unlock the power, seamless, next-gen, game-changing,
  AI-powered, in today's world).

| Weak | Better |
|---|---|
| Unlock the power of seamless AI-driven workflows. | You have 47 tabs open. We can fix that. |
| A revolutionary way to manage your team. | Everyone sees the same thing. At the same time. |
| Supercharge your productivity with AI. | Write the first draft in ten seconds. |
| The future of design is here. | Drag. Drop. Done. |
| Cutting-edge security you can trust. | Your files stay yours. |

Check each line: could it appear in any product's film? If yes, rewrite with something only this product does.

## Project motion identity

A film is one piece of a brand's motion. Record the motion language so the next film starts from it, in
`.drip/motion/IDENTITY.md`, when the user approves the film. Keep it short (one screen):

| Section | Holds |
|---|---|
| Character | Three words ("precise, warm, unhurried") and one word it must not be |
| Motif | The shape or object, and how it changes |
| Timing | Standard durations for small, hero, scene transitions; stagger value; hold length |
| Easing and springs | Named curves per role (arrive, leave, morph, type), bounce per material |
| Materials | How glass, paper, type, metal, elastic things move |
| Transitions | Which ones belong to this brand (morph, push, mask) and which are banned |
| Camera | Static, dolly, orbit; depth of field yes or no |
| Sound | Music feel and tempo range, accent style, silence rules |
| Approved | Decisions the user signed off, so revisions do not undo them |
| Never | A short list of things this brand's motion does not do |

Visual identity (logo, palette, type) lives in the brand files and the project's design guide. Do not mix them in
one file: the same visual identity can move gently or sharply.

## Translating feedback into parameters

Feedback arrives as adjectives. Turn each into a measurable change, apply it everywhere it should apply, and say what
you changed.

| The user says | Change |
|---|---|
| Less bouncy | Spring bounce down by about 0.1 (0.2 to 0.1); remove overshoot on type and UI; lengthen settle slightly |
| More bounce, more playful | Bounce 0.2-0.3 on objects only; add 0.1s anticipation; stagger 0.08 |
| Too corporate | Break the grid once; add one asymmetric crop; add a squash and stretch on the hero; warmer colour; looser stagger |
| More organic | Replace straight paths with arcs; vary durations 10-20% per object (seeded); softer springs; add noise drift on rest |
| Too slow | Cut holds by 25%; shorten entrances to 0.4-0.6s; start the next move at 60% of the last; do not speed up the moves themselves first |
| Too fast, rushed | Lengthen holds by 30%; fewer elements per beat; slow only the hero move |
| Too busy | Move one element at a time; push secondary motion to 30% amplitude; add a rest beat |
| Boring | Add contrast: one fast move after a hold, a scale jump, a colour event on the beat; check the hook |
| More premium | Slower, heavier moves (1.0-1.4s), no overshoot, fewer elements, longer holds, restrained colour |
| More energetic | Shorter holds, tighter stagger (0.04), sharper curves (expo.out), cut on the beat |
| Feels floaty | Add anticipation and a firmer landing; use ease-in on falls; add a small squash on impact |
| Feels mechanical | Offset timings by 0.03-0.08s; different curve per object; add follow-through |

Do not restyle when the feedback is about motion, and do not change motion when it is about the look.

## The one-sentence test

Before building, say the film in two sentences: "This film shows X becoming Y. It lands when Z." If you cannot,
return to the table above.

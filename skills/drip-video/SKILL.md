---
name: drip-video
description: Motion-design films and videos made in code (HTML, GSAP, CSS, canvas, three.js) and rendered frame by frame. Use for a launch film, brand film, explainer, promo, ad, logo animation, kinetic type, a seamless loop, a showreel or a product demo video. Part of Drip.
user-invocable: false
---

# Motion films (Drip)

Film tasks run in `drip_start` mode `motion` (`/drip:motion`). **Call `drip_guide video`** for the full procedure; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- Concept before animation: one visual idea in one sentence (a metaphor, not a feature list), and a hook inside 2 seconds.
- One clock. Every frame is a pure function of time on one paused GSAP timeline `tl`; no timers, no CSS animations, seeded `rand()` only.
- A motif survives: one shape or object persists through the film and changes meaning. No deck of separate slides.
- Transform, don't cut: the end of one move starts the next. A hard cut is a choice, not a default.
- Rest is part of the film: calm between peaks, a held frame before the big moment, a settled ending.
- Look at real frames with `motion_frames` (sweep, around every transition, dense on fast moves) before saying anything about how it moves.
- The critic runs once, on the sheets and strips, after a clean sweep. Fix, then render.
- No AI-slop copy ("unlock the power of seamless..."): short human sentences, specific claims, no invented numbers or UI.
- Sound is direction, not synthesis: choose and mix recordings with a recorded licence; never generate music in code.

## Read deeper when
| Situation | Call |
|---|---|
| Finding the concept, hook, metaphor, copy, motion identity | `drip_guide video/direction` |
| Timing, easing, spring numbers, materials, choreography | `drip_guide video/craft` |
| Morphs, match cuts, masks, a motif that carries between scenes | `drip_guide video/continuity` |
| Choosing a look: style families, brand studies, studios to search | `drip_guide video/styles` |
| Kinetic typography, type sizes at video size | `drip_guide video/type` |
| Generative visuals, particles, noise, simulations that must seek | `drip_guide video/procedural` |
| Product demos, cursors, UI on screen | `drip_guide video/product` |
| 2.5D or 3D camera, parallax, pull-backs, three.js | `drip_guide video/camera` |
| Music (find, analyse, drops), calm UI sounds, licences, the mix | `drip_guide video/sound` |
| Narration: script for the ear, casting a voice, ElevenLabs settings, timing to picture | `drip_guide video/voice` |
| Contract, determinism, renderers, formats, ffmpeg, alpha | `drip_guide video/render` |
| Self-review, the anti-slop table, the 12-point checklist | `drip_guide video/critic` |
| Studying reference films before planning | `drip_guide video/research` |
| What working studios do: measured cuts, rests, signature moves per studio | `drip_guide video/studios` |
| Ready-made video pieces (SnapCN), porting them to a seekable film | `drip_guide video/components` |
| The default look and pacing (calm continuous product motion, copy, rhythm, DEFAULTS block) | `drip_guide video/house-style` |

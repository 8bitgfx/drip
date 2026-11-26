# Video components: SnapCN and friends

Finished pieces save a film from hand-rolling every title, caption and device. SnapCN is the one registry made for
video. Its pieces are **Remotion** components, not DOM components, so they are studied and ported, not dropped in.

## What it is (verified)

- A shadcn-style registry: `https://snapcn.dev/r/registry.json` (147 items), each at `https://snapcn.dev/r/<name>.json`
  with the source inline. Install: `npx shadcn@latest add @snapcn/<name>` (namespace `@snapcn`, one word).
- Runtime: **Remotion**. Components read `useCurrentFrame()` and `useVideoConfig()`; most import the shared
  `snap-cn-ui` item (theme, fonts, timeline helpers; deps `remotion`, `culori`, `@remotion/google-fonts`).
  Lengths are in frames at 30 fps (a few at 24 or 60).
- Licence: the free components are MIT (repo LICENSE, Copyright 2026 Sri Nath). Pro (templates, MCP) is paid and its
  source may not be redistributed. Do not use the MCP. Rendered videos are the maker's. Remotion has its own licence
  terms for companies: check before shipping commercial work with it.
- Its own agent skills (`remotion-launch-video`, `-product-demo`, `-kinetic-typography`...) exist; Drip does not
  install them, this file carries what matters.

## Catalogue by category (item names)

- **Text and titles:** hello-zoom, spec-sweep, drop-line, title-sweep, check-cycle, word-wheel, brand-wheel,
  word-gather, font-shuffle, type-morph, text-reveal, punch-lines, text-swell, text-highlight, text-rewrite,
  text-select, text-swap, text-build, word-flip, word-settle, lcd-type, say-it, sentence-set, trend-type, find-yours,
  echo-stack, version-drop, wall-cut, count-portal, slam-type, spec-wall, ember-reveal, spark-question, word-insert,
  glow-pullback, read-through, channel-thread.
- **Captions:** word-captions, karaoke-captions.
- **Logos:** logo-drift, logo-assemble, logo-flicker, logo-collapse, block-wordmark, lockup-reveal.
- **Screens and devices:** phone-frame, laptop-frame, phone-stack, terminal-simulator, screen-recording, cursor-track,
  capture-reveal.
- **Cursor:** button-press, click-type (plus the helpers caret, input).
- **AI chat input:** answer-highlight, agent-steps, answer-stream, prompt-send, prompt-mark, prompt-zoom,
  search-typing, agent-compose, agent-result, task-stream, glass-prompt, search-retype, prompt-roll.
- **Transitions:** dot-bloom, dot-dissolve, pixel-peak.
- **Social proof:** follower-rush, comment-storm.
- **Scenes** (whole shots): announce-title, count-grid, roster-grant, wordmark-cut, orbit-gallery, hero-launch,
  moodboard-reveal, reel-collage, reel-wall, portal-intro, cut-lockup, bloom-lockup, gather-lockup, sky-lockup,
  status-cycle, orb-swarm, card-rail, picker-commit, manifesto, chat-thread, scatter-bloom, showcase-drift,
  agent-run, hype-reel, depth-swap, column-cut, mood-board, agent-chat, agent-open, phrase-swarm, word-rush,
  app-reveal, build-out, stretch-word, files-drop, focus-pull, gallery-push, agent-tools, phone-pitch,
  thank-you-swarm, hex-tally, brief-send, render-wall, string-hero, proof-line, ticker-climb, tap-through,
  cross-out, screen-wall, laptop-open, tally-rise, word-montage, orbit-flow, checkout-push, metric-morph,
  prompt-dive, vault-count, library-flight, wire-feed, pack-up, glow-frame, metal-chip, pain-point,
  blueprint-collage, mark-grid, lens-wall, flood-outro, prompt-poster, glow-map, glow-type.
- **Misc:** pulsing-border, snap-cn-ui (the shared core, not a visual), template-launch (a Pro block).

## Which piece for which beat

| Beat | Reach for | Why |
|---|---|---|
| Hook (0-2 s) | slam-type, hello-zoom, punch-lines, pain-point, spark-question, hero-launch | One loud line or one startling image |
| Product demo | laptop-frame, phone-frame, cursor-track, click-type, button-press, screen-recording, capture-reveal, terminal-simulator | Cursor-driven UI that really changes |
| AI-product demo | prompt-send, answer-stream, answer-highlight, agent-steps, task-stream, agent-result | Chat and agent flows already timed |
| Kinetic type | text-reveal, word-wheel, word-flip, text-rewrite, type-morph, text-swell, word-gather | Unit (letter, word, line) and effect are props |
| Data | count-grid, tally-rise, ticker-climb, metric-morph, hex-tally, vault-count, follower-rush | Counters and tallies with settle |
| Proof | comment-storm, channel-thread, proof-line | Social proof beats |
| Transition | dot-bloom, dot-dissolve, pixel-peak, focus-pull, column-cut | Use sparingly, one style per film |
| Captions | word-captions, karaoke-captions | Spoken-word films |
| End card | wordmark-cut, bloom-lockup, cut-lockup, logo-assemble, thank-you-swarm, flood-outro | A calm lockup, then silence |

## Seek recipe: making a SnapCN piece obey `__drip.seek(t)`

The source is already seekable in principle: its maths is a pure function of the frame number (the files say
"frame-deterministic and side-effect free"), with `speed` as a time multiplier. No CSS animations, no clocks. Frame
is `round(t * fps)`. What differs from Drip is that Remotion supplies the frame through hooks. Two ways:

1. **Port the maths (preferred for a single piece).** Open the item JSON, take the exported pure helpers (e.g.
   `splitText`, `enterOffset`, `springEase`, `resolveEasing` in text-reveal), and drive plain DOM from the GSAP
   timeline: `tl.to({f:0}, {f: frames, duration: frames/fps, ease: "none", onUpdate: () => paint(f)})`, where `paint`
   sets transform and opacity from the helper. Closed-form, seeks exactly. Replace `useSnapCnTheme` with the film's
   tokens; replace `@remotion/google-fonts` with the film's own font loading (fonts before frame 0).
2. **Run the component as is.** Bundle it with React and an alias that maps `remotion` to a small shim:
   `useCurrentFrame` returns a value from a store, `useVideoConfig` returns `{fps, width, height, durationInFrames}`,
   `AbsoluteFill` is a full-size div, `interpolate`, `Easing`, `spring`, `random` re-exported from the real package,
   `delayRender`/`continueRender` count pending work. `__drip.seek(t)` sets the frame, re-renders synchronously
   (`flushSync`), then awaits the pending count and `document.fonts.ready`. Or mount `@remotion/player` and call
   `seekTo(frame)` on its ref before each frame.

Checks that bite: a piece that measures text (text-reveal calls `delayRender` for line geometry) needs the wait above;
canvas pieces (dot-bloom replays a recorded step table) are fine because they index by frame; anything using `Date`,
`Math.random` or `useEffect` timers is not, so read the source first. Pass `mode="dark"` on a dark ground: pieces
default to shadcn's light palette. Compare `seek(t)` against two orders of visiting the same times; frames must match.

## Its design defaults, in our words

- Ship tokens first: palette, one or two fonts and the canvas size are set once; pieces take them from a theme,
  not per-piece colours.
- Pieces are made to be composed: a title, a device, a cursor and a lockup in one shot beat five unrelated effects.
- Stagger and settle are props (stagger frames, enter duration, spring or snappy easing); tune them, do not stack
  a second effect on top.
- Its skill ships an anti-patterns list and "anti-slop" design tokens, but the text was not readable from the public
  site (not verified). Our own anti-patterns apply: hard-coded sizes that break another format, effects with no
  hold, one easing everywhere, random per-frame motion, text too small for video, a new style every scene
  (see `video/critic`).
- Do not ship a piece's sample copy ("Meet Acme Billing"): the words are yours.

## Finding more pieces

- `components_find` with kind words ("kinetic type", "captions", "device frame", "counter", "logo reveal", "cursor");
  the catalogue entry `snapcn` points at its registry index and `{name}` item URL.
- Time-drivable pieces from other libraries: Magic UI (number-ticker, text-reveal, animated-list, bento), React Bits
  (split-text, count-up, scroll-reveal) and Motion Primitives (text effects) are written for the browser clock
  (springs, `useInView`, rAF). Use only their maths and layout, re-time on `tl`. A piece that needs real time to
  run cannot seek and does not go in a film.
- Never mix more than one registry's look in a film; take the pieces, keep one theme.

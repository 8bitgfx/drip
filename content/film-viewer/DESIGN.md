# Drip Film viewer: design

Direction "README bento" (board drip-film-viewer, the user's pick). System = Drip's README art (brand branch, `assets/brand/src/readme.mjs`, `brand.mjs`): the viewer is a page of that README.

**THESIS.** One question per tile: what is on the page, who is working, when, how long. Refuses the dense observability dashboard every agent tool ships.

**WORLD.** Ink #0D0E12 ground, 12px page padding and gaps. README tiles #17181D r22, inset 1px #24252C, padding 24px 24px 0. Chips 34px r17 #202128 / inset #2E2F37, 13.5px/500. One ultramarine #2340FF tile (the summary). Light: ground #FAF9F6, tiles #F3F2EE / #E7E5DF, chips #FFF / #E2E0DA. Models: Opus #2340FF, Sonnet #F4EFE4 (light #121318), Haiku #C8F031; #FF6A3D only for a failed agent.

**TYPE.** Inter 15/1.4; tile captions 17px, line-height 1.35, -0.01em, ink2 #9A9CA6 with a bold lead-in in ink #EEEEF1 ("**Frame 06.** Features: the first two cards."). Bricolage Grotesque 800, -0.04em, for big numbers only. JetBrains Mono 500 for times and paths. Nothing under 12px.

**FIRST VIEWPORT (1440x900).** Header row 60px: the Drip mark + "Drip Film" only (no title pill), Live/Montage chips right. Grid 2fr / 1fr, rows 1fr / 244px. Stage tile: caption + transport on one line, the frame as a window cut by the tile's bottom edge. Agents tile: caption, a stack of 44px pill rows, the active agent's piece and file under its row. Timeline tile: caption + ruler times, 8px pill bars per lane, playhead with a brand handle. Summary: the ultramarine tile, chips, the Bricolage time.

**SIGNATURE.** The montage ends on the README hero: the stage tile becomes ultramarine paint in a selected frame, dripping off its bottom edge (brand.mjs `paint()`), "Built in 14m 10s." on it, Replay.

**REFUSES.** Title pills, tiny text, orange as decoration, gradients, glow, glass.

# Next session: open problems (updated 2026-11-26, Drip 0.9.3)

What shipped is in [CHANGELOG.md](../CHANGELOG.md). Still to measure from 0.9.0: re-run the anime studio prompt and compare calls, peak context and total with the 0.8.21 run (116 calls, 411k peak, 28.5M).

## Still open
1. **Context bloat is the real cost.** The main session averaged ~245k tokens per call; the fix round alone read 11M cached tokens. Reference sheets, piece previews and fit-check shots stay in the director's context. Ideas: fitcheck_shot returns numbers + one small image by default; refs and previews go through a scout/helper that returns words; `drip_execute` scripts that drop images.
2. **Design and branding were weak.** The dealt palette (olive on bone) was kept though the director thought it "a bit strong"; the brand was an invented text wordmark; stock pictures stood in for the product's own output; bracketed placeholders shipped. The three intake questions were all answered "No preference": a no-preference answer should mean "the director's strongest pick", not the dealt default. Re-run the same prompt on 0.8.22 (now an app surface) and compare with Codex's "Koma Studio" before changing more.
3. **Codex.** The installed copy is the direct installer (`~/.codex/config.toml` → `%LOCALAPPDATA%\Drip`, a clone of GitHub main), not a Codex plugin. Update: `git -C %LOCALAPPDATA%\Drip pull`, then `node mcp/dist/drip-mcp.mjs install --agent codex`, restart Codex. Codex's real shell tool name in hook payloads is unverified (the matcher covers the known names). `claims.mjs`, `agent-start.mjs` and `film.mjs` aren't wired for Codex (no transcript there, so claims pass anyway).


# Working on Drip (for coding agents)

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first, then [docs/SKILL_FORMAT.md](docs/SKILL_FORMAT.md) before touching any skill.

- **Skills**: `skills/drip-<topic>/SKILL.md` stays short (first-screen rules + "call drip_guide"); depth goes in `guide.md` and `reference/*.md`. Every reference file must be listed in its SKILL.md table. Reference other guides by topic name, never by path. Only mention MCP tools that exist (list in SKILL_FORMAT.md).
- **Enforcement lives in tools and hooks, not prose.** If agents keep skipping something, add a gate (`missingBeforeUi` in `mcp/src/core/state.mjs`) or a tool error that names the right call, not another paragraph.
- **Server**: plain ESM JavaScript in `mcp/src`. Files under `mcp/src/core` that hooks import (`paths`, `config`, `state`) and `modules/fitcheck/lint.mjs` must stay dependency-free.
- **Always rebuild and test** after server changes: `cd mcp && npm run build && npm test`. Run `npm run smoke` for network paths (it calls Dribbble, Iconify, Fontsource, registries; it never calls paid APIs).
- **Commit `mcp/dist/drip-mcp.mjs`**: users run the plugin without `npm install`.
- **Licences**: guides adapt MIT/Apache sources in our own words with credit (CREDITS.md); paraphrase-only for sources without a reuse licence. Never commit third-party assets.
- **Be polite to Dribbble**: keep requests throttled and cached (`core/http.mjs`); never add bulk downloading.
- **Data files** (`data/*.json`) are the place for catalogue entries, font pairings and slop rules; keep `price`/`license` as "check" unless verified.

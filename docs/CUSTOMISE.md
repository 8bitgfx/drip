# Customising Drip

Everything is plain files. Project settings go in `<project>/.drip/`, personal settings in `~/.drip/`.
Project wins over personal, personal wins over the defaults (`mcp/src/core/config.mjs`).

## Settings: `.drip/config.json`

```json
{
  "gates": {
    "mode": "task",
    "enforce": true,
    "minRefsStudied": 4,
    "minBoardItems": 8,
    "requireDirection": true,
    "requireFitcheck": true
  },
  "loop": "fast",
  "tools": "core",
  "modules": { "refs": true, "board": true, "components": true, "assets": true, "gen": true, "fitcheck": true, "parts": true, "swarm": true, "codemode": true },
  "uiFiles": "\\.(tsx|jsx|vue|svelte|astro|html|css|scss)$",
  "ignoreFiles": "(node_modules|dist|\\.test\\.|\\.stories\\.)",
  "gen": { "defaultProvider": "gemini" },
  "fitcheck": {
    "sizes": [{ "name": "phone", "width": 390, "height": 844 }, { "name": "desktop", "width": 1440, "height": 900 }],
    "chromePath": ""
  }
}
```

- `gates.mode`: `"task"` (default) means Drip only acts while a Drip task is open (`/drip:design` … `drip_end`); with no task the hooks are silent. `"always"` means every UI write needs a Drip task, and design prompts get a reminder (strict, for teams).
- `gates.enforce: false` makes Drip advisory: no blocking, the guides and tools still work.
- `loop`: "fast" (default: look, deal pieces, builders, check once per pass, the critic only at the final version) or "full" (the old process with intake, references by role, three comps you rank yourself, a plan and one critic at the final version).
- `tools`: "core" (default: the fast loop's tools are listed; every other tool is reached through drip_search and drip_execute) or "all".
- `minRefsStudied` and the role minimums apply to the full loop only.
- `modules` turns tool groups off (fewer tools in Claude's context).

## Your own slop rules: `.drip/slop.json`

Same shape as `content/data/slop.json`. They run in `fitcheck_lint` and after every UI edit.

```json
{ "rules": [
  { "id": "brand-blue", "pattern": "#0057FF", "severity": "warn", "message": "Old brand blue.", "fix": "Use var(--accent)." }
] }
```

## Your own libraries: `.drip/catalogue.json`

Same shape as `content/data/catalogue.json` `entries`. Add an internal component registry and `components_find` searches it:

```json
{ "entries": [
  { "id": "acme-ui", "name": "Acme UI", "url": "https://ui.acme.dev", "category": "foundation",
    "what": "Our design system", "useWhen": "Always, first", "avoidWhen": "", "price": "internal", "license": "internal",
    "registry": { "index": "https://ui.acme.dev/r/registry.json", "item": "https://ui.acme.dev/r/{name}.json" } }
] }
```

## Your own image provider: `~/.drip/providers/<id>.mjs`

Copy `mcp/src/modules/gen/providers/_template.mjs.txt`, fill in `generate()`, add its key with `/drip:settings`.
Or ask Claude: "add a Drip image provider for <service>" and point it at the template.

## Editing the guides

Guides are Markdown in `skills/drip-<topic>/guide.md` and `skills/drip-<topic>/reference/*.md`; shared rules in `content/rules/`.
Format rules: [SKILL_FORMAT.md](SKILL_FORMAT.md). A new reference file becomes `drip_guide <topic>/<file>` automatically.
To make a guide required for a kind of task, edit `requiredGuides()` in `mcp/src/modules/workflow/index.mjs`.

## Changing the server

`mcp/src` is plain JavaScript (ES modules), one folder per module. After changing it:

```
cd mcp
npm install
npm run build      # bundles to mcp/dist/drip-mcp.mjs (committed, so users need no npm install)
npm test           # hook tests
npm run smoke      # end-to-end against the real services
```

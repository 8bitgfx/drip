# Swarm Mode

Swarm Mode is the same design loop with the work split by cost. The director (the session's own model) keeps the decisions and a small
context; cheap subagents do the reading, building and measuring. Gates, state and evidence are unchanged: the crew uses the same tools.

| Agent | File | Model | Does | Returns |
|---|---|---|---|---|
| Scout | `agents/scout.md` | Haiku | `refs_site` / `refs_search` / `refs_gallery` for ONE role, drops cookie and bot pages, calls `refs_study` with the role | top 3, five-line study each |
| Builder | `agents/builder.md` | Sonnet | builds ONE section from the director's spec, DESIGN.md and the kit | changed files, one-section screenshot path |
| Checker | `agents/checker.md` | Haiku | `fitcheck_shot` with `numbersOnly` (or `section`), per section | blockers and numbers only |
| Critic | `agents/critic.md` | Sonnet | independent review (not part of this module) | verdict, scores, fixes |

## Tools (module `mcp/src/modules/swarm`)
- `scout_prepare({ role, subject?, style? })`, `build_prepare({ section, spec, files?, url? })`, `checker_prepare({ url?, sections?, imagesOnRequest? })`
  return the exact prompt and the `Agent({ subagent_type: "drip:<agent>", ... })` call, as `critic_prepare` does. The prompt is passed unchanged.
- `swarmInstructions(task, { env })` is the short block `drip_start` shows in swarm mode. It says so when the host does not launch Drip's named subagents.
- `swarmOn(config, task)`: swarm is on when the config has `swarm: true` (default false) or the task was started with `mode: "swarm"`.
  (Wiring into `drip_start` and the config default belongs to `workflow.mjs` and `core/config.mjs`.)

## Hosts
Claude Code (and the Cowork plugin) load `agents/*.md` from the plugin, model in the frontmatter. Other hosts are not given the swarm agents:
they fall back to the single-agent loop, which the `*_prepare` tools still support (see [HOSTS.md](HOSTS.md)).

The skill and its guide: `skills/drip-swarm/` (`drip_guide swarm`).

# Drip Film: watch the swarm build

A Drip task records who did what and frames of the page as it is built. The user watches it live and gets a montage at the end, in any IDE: the viewer is a static page Drip serves on localhost.

## Pieces

| Part | Where | What |
|---|---|---|
| Events | `hooks/agent-start.mjs`, `agent-stop.mjs`, `post-write.mjs`, `film.mjs` | Append-only lines in `.drip/film/<task>/events.jsonl`: a subagent's start (type, label, section, piece from its brief), its end (SubagentStop), every UI write and every Drip tool call, each with the `agent_id` Claude Code puts on hook input (`main` for the director). Hosts without these hooks: the server logs its own tool calls (`registry.mjs`, `filmed`). |
| Frames | `mcp/src/modules/film/index.mjs` (`tick`, every 5 s in server mode) | When the page changed (a write, stitch or install) and at most every 12 s, a 1440x900 JPEG of `task.filmUrl` (set by `drip_serve` and the first `fitcheck_shot`) into `frames/`, indexed in `frames.json`. |
| film.json | `mcp/src/core/film.mjs` (`buildFilm`) | Agents (a start is matched to the first unseen `agent_id` of its type), events and frames (each frame knows who was working). The one file the viewer reads. Contract: `version`, `task`, `agents[]`, `events[]`, `frames[]`. |
| Viewer | `film/viewer/` (designed with Drip) | Live: agents as cards, the feed, the latest frame. Montage: the frames as a time-lapse with a lane per agent. `drip_film` copies it next to film.json and serves the folder; without it a small built-in viewer is used. |
| Montage | `finishFilm` at `drip_end` | A last frame, `endedAt`, the link in drip_end's reply, and `montage.mp4` when ffmpeg is on PATH. |

Turn it off per task with `task.film = false`.

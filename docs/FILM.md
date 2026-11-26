# Drip Film: what it records

Drip Film records the story of a task: the references looked at, the pictures made and the pieces picked before building, then every agent at work, where on the page each write landed, and frames of the whole page as it grew. The viewer (`content/film-viewer/`) reads one file, `film.json`; this page is its format. How the parts fit: [ARCHITECTURE.md](ARCHITECTURE.md#drip-film-watch-the-swarm-build).

**Changes to the event list agreed with the viewer (film-recording branch):** none removed or renamed in the agreed list. Additions on top of it: `ref`, `piece` and `asset` events carry `from` / `picked` / `studied` / `assetKind` (the agreed `asset {kind}` is `assetKind`, because every event's `kind` is its type); `write.target` also carries `frame` (the frame its box was measured on) and frames carry `scale`; every event keeps `t`, `agent` and `summary`. The agent events are `start` and `stop` (formerly `note` "launched…" and `end`).

## Files

Everything lives in `.drip/film/<task id>/`:

| File | Written by | What |
|---|---|---|
| `events.jsonl` | hooks and the server | One JSON line per event, append-only (no locks) |
| `frames/0001.jpg…` | the recorder (`modules/film/index.mjs`) | The whole page, top to bottom, 720 px wide (half of 1440) |
| `frames.json` | the recorder | The frames' index |
| `targets.json` | the recorder | Where each write landed, keyed `<t>\|<file>` |
| `skipped.json` | the recorder | How many frames were skipped, by reason (`error overlay`, `still loading`, `blank`) |
| `recorder.json` | the recorder | Which server records this task (pid, last renewed) |
| `thumbs/` | `modules/film/record.mjs` | Small pictures (≤ 480 px; WebP/SVG copied as they are when small) for refs, assets and pieces |
| `film.json` | `buildFilm` (`core/film.mjs`) | The one file the viewer reads, rebuilt whenever one of the above changes |
| `index.html`, `viewer.js`… | `drip_film`, `drip_start`, `drip_end` | The viewer, copied next to film.json |

All paths in `film.json` (`image`, `file` of a frame) are relative to that folder, except a reference's `image` when no thumbnail could be made: then it is the remote URL.

## film.json

```jsonc
{
  "version": 2,
  "task": { "id", "title", "startedAt", "endedAt": null | iso, "page": "<page folder>", "url": "<the page's URL>" },
  "agents": [{ "id": "main" | "<agent_id>", "type": "director|builder|helper|scout|checker|critic", "model", "label", "job", "piece"?, "startedAt", "endedAt", "status": "working|done" }],
  "events": [ /* in time order, below */ ],
  "frames": [{ "t", "at", "file", "image", "width", "height", "scale", "pageHeight", "url", "caption", "agents": ["<ids working then>"] }]
}
```

Every event has `t` (ISO time), `agent` (who did it: an agent `id`, `main` for the director), `kind` and `summary` (one line for a feed). By kind:

| kind | Fields | When |
|---|---|---|
| `start` | `id`, `type`, `label` (`agent` is `main`, who launched it) | A subagent starts (Agent tool) |
| `stop` | `id`, `type`, `label` | It finishes (SubagentStop) |
| `ref` | `title`, `url`, `image`, `from` (`refs_site` \| `refs_gallery` \| `refs_study`), `studied`? + `take`? | A reference looked at: each site of `refs_site`, the first six of a `refs_gallery` listing, each reference studied |
| `asset` | `file` (project path), `assetKind` (`photo` \| `generated` \| `art` \| `mockup`), `src` (where it came from: URL, prompt, screen), `image` | A picture saved (`images_save`) or made (`gen_image`, `art_generate`, `mockup_render`) |
| `piece` | `name`, `url`, `image`, `picked`? | A piece previewed (`pieces_preview`, with its own screenshot) or picked (`pieces_install`, `picked: true`, showing the picture it was previewed with) |
| `write` | `file`, `tool`, `target`?: `{ selector, x, y, w, h, frame }` | A UI file written by the director or a builder. `target` is the element it changed, its box in the pixels of `frame` (already scaled), when it could be found |
| `frame` | `at`, `image`, `url`, `width`, `height`, `scale` | A frame was kept (bad frames are never written) |
| `done` | `at` | The task ended |
| `tool`, `stitch`, `install`, `shot`, `note` | `tool` | Any other Drip tool call (the feed) |

`ref`, `asset` and `piece` are logged by the server, which can't tell which agent called; the hook logs the same call with its `agent_id`, and `buildFilm` gives the event to the agent whose call of the same tool is nearest in time (within two minutes). Other hosts (no hooks): `main`.

## Frames

The recorder (`tick`, every 5 s while the MCP server runs) takes a frame of `task.filmUrl` (set by `drip_serve` and the first `fitcheck_shot`) when the page changed (a write or a stitch) since the last frame, at most every 12 s. Each frame:

- opens the page at 1440x900, waits for the network to go quiet, scrolls through once (lazy pictures, scroll reveals), back to the top;
- is **skipped** when the page shows the Vite error overlay (`vite-error-overlay`) or Next's error dialog (inside `nextjs-portal`), is still loading (document not complete, an empty `#root`/`#__next`, a lone "Loading"), or is blank (one colour covers ≥ 98.5 % of it, or no text and no pictures). A skipped frame is tried again 8 s later;
- is **dropped** when it is byte-identical to the last frame;
- is the whole page (up to 14,000 CSS px) at half scale: 720 px wide, so sections appear as builders add them.

Only one server records a task: several Drip servers can run on one project (two sessions, an IDE and the CLI), so the recorder claims the task in `recorder.json` and renews it every tick; another server takes frames only after the claim is 30 s old. (Servers from 0.9.7 and earlier don't know the claim and still shoot their own 1440x900 frames until they are updated.)

## Write targets

The post-write hook gives each write `hints`: the `id` and `data-section` values it writes, its file name (`PricingTable.tsx` → `pricing-table`, `footer-3.tsx` → `footer-3`, `footer`), its landmark tags (`header`, `nav`, `footer`), and for a generic file (`App.tsx`, `index.html`) the sections it renders (`<Pricing />` → `pricing`). At the next frame the recorder looks for each pending write's element (`[data-section]`, `#id`, a landmark, a section whose id or class names it) and stores its selector and box at the frame's scale. A write not found is looked for in up to three frames, then left without a target.

## The live film

`drip_start` (design and board tasks) builds the film, copies the viewer next to it, serves the folder on localhost and opens it in the user's browser once per task (`task.filmOpened`); the reply carries the link. The viewer polls `film.json`, so the Live view follows the task. Never in tests (`NODE_TEST_CONTEXT`) or CI; `DRIP_FILM_OPEN=0` turns it off. `drip_film` gives the link again; `drip_end` takes a last frame, closes the film, opens the montage and writes `montage.mp4` when ffmpeg is on PATH. Turn the film off per task with `task.film = false`.

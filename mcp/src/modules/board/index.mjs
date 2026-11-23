// Moodboard tools: create, add (with a reason), group into directions, open/share, read feedback, choose.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, resolve } from "../../core/seen.mjs";
import { lastCritique, loadState, updateState } from "../../core/state.mjs";
import { renderHtml } from "../../core/render.mjs";
import { tileHtml } from "./tile.mjs";
import { screenshot } from "../fitcheck/chrome.mjs";
import { renderBoard } from "./render.mjs";
import { ensureServer } from "./server.mjs";
import { boardFile, createBoard, listBoards, liveItems, loadBoard, saveBoard } from "./store.mjs";

function activeBoard(id) {
  const bid = id || loadState().task?.board?.id || listBoards()[0]?.id;
  const board = bid && loadBoard(bid);
  if (!board) throw new Error("No moodboard yet. Call board_create first.");
  return board;
}

/** Directions may be shown/chosen only after the critic ranked the current set and didn't reject it. */
function directionsGate(board, config) {
  const task = loadState().task;
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireCritic || !board.directions.length) return null;
  const rec = lastCritique(task, "directions");
  if (!rec || (board.directionsAt && rec.at < board.directionsAt))
    return "The critic hasn't ranked these directions yet. Run board_tile, then critic_prepare({ kind: \"directions\" }), launch the drip:critic subagent with the prompt it returns, and critic_record its verdict.";
  if (rec.verdict === "reject")
    return `The critic rejected this set ("${rec.summary}"). Rework the weak directions (or replace them with bolder ones), board_directions again, re-render tiles and get a new ranking.`;
  return null;
}

function syncTask(board) {
  updateState((st) => {
    if (st.task) st.task.board = { id: board.id, items: liveItems(board).length, directions: board.directions.length, chosen: board.chosen };
  });
}

export function register(server, ctx) {
  server.registerTool(
    "board_create",
    {
      title: "Create a moodboard",
      description:
        "Start the moodboard for the current task. Every reference you studied with refs_study is added automatically (and later studies too). " +
        "Then add colours/fonts/images with board_add, form directions (board_directions), render style tiles (board_tile), get the critic's ranking, board_open, board_choose.",
      inputSchema: { name: z.string().describe("Short name, e.g. 'Claude portfolio'"), brief: z.string().optional().describe("Defaults to the recorded brief") },
    },
    safe(async ({ name, brief }) => {
      const task = loadState().task;
      const b = task?.brief;
      const board = createBoard(name, brief || (b ? `${b.what} — for ${b.audience}. Feel: ${b.feel.join(", ")}. Ambition: ${b.ambition}.` : ""));
      let imported = 0;
      for (const s of task?.refs?.studied || []) {
        const item = lookup(s.key);
        if (!item?.study) continue;
        const n = item.study;
        board.items.push({ ...item, kind: "shot", note: `${n.take} · layout: ${n.layout} · type: ${n.type} · colour: ${n.color} · detail: ${n.detail}`, addedAt: new Date().toISOString() });
        imported++;
      }
      saveBoard(board);
      syncTask(board);
      return text(`Board "${board.name}" created with ${imported} studied references.\nNEXT: add 3-6 colours and 2-4 fonts from what you studied (board_add), then board_directions (2-3 genuinely different, at least one daring).`);
    }),
  );

  server.registerTool(
    "board_tile",
    {
      title: "Render style tiles for the directions",
      description:
        "Renders one style tile per direction: its palette, type pairing, a nav, a headline, body copy, buttons and a card, so the user (and the critic) sees each direction APPLIED, not just references. " +
        "Run after board_directions; tiles are saved as files (for the critic) and shown on the board. Optional per-direction headline/sample copy makes them real.",
      inputSchema: {
        board: z.string().optional(),
        copy: z.object({ brand: z.string().optional(), headline: z.string().optional(), body: z.string().optional(), cta: z.string().optional() }).optional().describe("Real copy for the tiles (defaults from the brief)"),
      },
    },
    safe(async ({ board: bid, copy = {} }) => {
      const board = activeBoard(bid);
      if (!board.directions.length) return text("No directions yet: board_directions first.", true);
      const brief = loadState().task?.brief;
      const dir = path.join(path.dirname(boardFile(board.id)), "tiles");
      fs.mkdirSync(dir, { recursive: true });
      const content = [];
      const files = [];
      for (const d of board.directions) {
        const file = path.join(dir, `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
        const png = await renderHtml(
          tileHtml(d, {
            brand: copy.brand || board.name,
            headline: copy.headline || d.summary,
            body: copy.body || (brief ? `${brief.job[0].toUpperCase()}${brief.job.slice(1)}. Made for ${brief.audience}.` : d.adjectives.join(" · ")),
            cta: copy.cta || "See the work",
          }),
          file,
          { width: 1200, height: 760, config: ctx.config() },
        );
        d.tile = file;
        files.push(file);
        content.push(textBlock(`Tile: ${d.name} — ${d.adjectives.join(", ")} · ${d.type}`), imageBlock(await toJpeg(png, 1200, 760)));
      }
      board.tilesAt = new Date().toISOString();
      saveBoard(board);
      content.unshift(textBlock(`Rendered ${files.length} style tiles:\n${files.join("\n")}\n\nNEXT: have the critic rank the directions: critic_prepare({ kind: "directions" }) -> Agent drip:critic -> critic_record. Rework or replace anything it rejects before board_open.`));
      return blocks(content);
    }),
  );

  server.registerTool(
    "board_add",
    {
      title: "Add to the moodboard",
      description:
        "Add references to the active board. Each item needs a NOTE saying what exactly to take from it ('left nav density + monochrome icons', 'serif display at 96px over photo') — 'nice' or 'clean' is rejected. " +
        "Items can be shots (number from the last listing or id), image URLs, colours (#hex) or fonts (font name).",
      inputSchema: {
        items: z
          .array(
            z.object({
              ref: z.string().describe("Shot number/id, an image URL, a #hex colour or a font name"),
              kind: z.enum(["shot", "image", "color", "font"]).optional().describe("Default: shot, or detected from ref"),
              note: z.string().describe("What to take from it, specifically"),
              title: z.string().optional(),
              source: z.string().optional().describe("For images: where it came from and its licence"),
            }),
          )
          .min(1),
        board: z.string().optional(),
      },
    },
    safe(async ({ items, board: bid }) => {
      const board = activeBoard(bid);
      const rejected = [];
      let added = 0;
      for (const it of items) {
        const note = it.note.trim();
        if (note.length < 15 || /^(nice|clean|cool|good|great|modern|beautiful|pretty|sleek|minimal)\.?$/i.test(note)) {
          rejected.push(`${it.ref}: note too vague ("${note}") — say what to take from it`);
          continue;
        }
        const kind = it.kind || (/^#[0-9a-f]{3,8}$/i.test(it.ref) ? "color" : /^https?:/.test(it.ref) ? "image" : /^[\d#]|^dribbble:/.test(it.ref) ? "shot" : "font");
        let entry;
        if (kind === "shot") {
          const key = resolve(it.ref);
          const known = lookup(key);
          if (!known) {
            rejected.push(`${it.ref}: unknown shot — list it first (refs_search / refs_tag) or pass its id`);
            continue;
          }
          entry = { ...known, kind: key.startsWith("image:") ? "image" : kind, note };
        } else if (kind === "image") entry = { key: `image:${it.ref}`, kind, image: it.ref, url: it.ref, title: it.title || it.ref.split("/").pop(), source: it.source || "unknown licence", note };
        else entry = { key: `${kind}:${it.ref}`, kind, value: it.ref, title: it.title || it.ref, note };
        const existing = board.items.find((x) => x.key === entry.key);
        if (existing) Object.assign(existing, entry, { removed: false });
        else board.items.push({ ...entry, addedAt: new Date().toISOString() });
        added++;
      }
      saveBoard(board);
      syncTask(board);
      const n = liveItems(board).length;
      const min = ctx.config().gates.minBoardItems;
      return text(
        `Added ${added}. Board has ${n} items.` +
          (rejected.length ? `\nRejected:\n- ${rejected.join("\n- ")}` : "") +
          (n < min ? `\nNEXT: keep collecting (${n}/${min} before directions).` : "\nNEXT: group the board into 2-3 directions with board_directions, then board_open to show the user."),
        rejected.length > 0 && added === 0,
      );
    }),
  );

  server.registerTool(
    "board_directions",
    {
      title: "Group the board into directions",
      description:
        "Cluster the board into 2-3 distinct design directions. Each: a memorable name, a one-line summary, 3 adjectives, a palette (hex), a type pairing, and the item numbers/keys that define it. " +
        "Directions must be genuinely different (not the same look in two colours). Replaces previous directions.",
      inputSchema: {
        directions: z
          .array(
            z.object({
              name: z.string(),
              summary: z.string(),
              adjectives: z.array(z.string()).min(2).max(4),
              palette: z.array(z.string()).min(2).max(8).describe("Hex colours"),
              type: z.string().describe("Type pairing, e.g. 'Instrument Serif + Inter'"),
              manifesto: z.string().optional().describe("3 sentences: the idea, what it refuses, why it beats the safe option"),
              pairing: z.string().optional().describe("For the daring option: the unexpected genre it borrows from (e.g. 'exhibition posters')"),
              items: z.array(z.string()).min(1).describe("Board item numbers (as shown on the board, '3') or keys"),
            }),
          )
          .min(2)
          .max(4),
        criteria: z.array(z.string()).optional().describe("3-5 choice criteria from the brief, written BEFORE the tiles (thresholds or trade-offs)"),
        board: z.string().optional(),
      },
    },
    safe(async ({ directions, criteria, board: bid }) => {
      const board = activeBoard(bid);
      const live = liveItems(board);
      const min = ctx.config().gates.minBoardItems;
      if (live.length < min) return text(`The board has ${live.length} items; collect at least ${min} studied references before forming directions.`, true);
      const keyOf = (r) => (/^\d+$/.test(r) && live[+r - 1] ? live[+r - 1].key : r);
      board.directions = directions.map((d) => ({ ...d, items: d.items.map(keyOf).filter((k) => live.some((it) => it.key === k)) }));
      if (criteria) board.criteria = criteria;
      board.chosen = null;
      board.directionsAt = new Date().toISOString();
      saveBoard(board);
      syncTask(board);
      return text(`${board.directions.length} directions saved: ${board.directions.map((d) => `"${d.name}" (${d.items.length} items)`).join(", ")}.\nNEXT: board_tile to render a style tile per direction, then the critic ranks them (critic_prepare kind "directions").`);
    }),
  );

  server.registerTool(
    "board_open",
    {
      title: "Show the moodboard",
      description:
        "Renders the board. Returns (1) a live local link where the user can star, remove and annotate items (read back with board_read), (2) a self-contained HTML file with images inlined — " +
        "if you have an Artifact / publish tool, publish THAT file so the user gets a shareable board — and (3) a preview screenshot when Chrome is available.",
      inputSchema: { board: z.string().optional(), static: z.boolean().optional().describe("Also write the self-contained file (default true)") },
    },
    safe(async ({ board: bid, static: stat = true }) => {
      const board = activeBoard(bid);
      const gate = directionsGate(board, ctx.config());
      if (gate) return text(gate, true);
      const port = await ensureServer(ctx.config().board.port);
      const url = `http://localhost:${port}/b/${board.id}`;
      const dir = path.dirname(boardFile(board.id));
      let file = null;
      if (stat) {
        file = path.join(dir, "board.html");
        fs.writeFileSync(file, await renderBoard(board, { mode: "static", inline: true }));
      }
      const content = [
        textBlock(
          `Live board: ${url}\n` +
            (file ? `Shareable file (images inlined): ${file}\n` : "") +
            `\nShow the user: publish the file as an artifact if you can, otherwise give them the live link. Ask them to star what they like and remove what they don't, or just pick a direction. Then board_read and board_choose.`,
        ),
      ];
      try {
        const png = await screenshot(url, { width: 1440, height: 1100, config: ctx.config() });
        content.push(imageBlock(await toJpeg(png, 1440, 1100)));
      } catch {
        content.push(textBlock("(No preview: Chrome/Edge not found. Set fitcheck.chromePath in .drip/config.json to enable previews.)"));
      }
      return blocks(content);
    }),
  );

  server.registerTool(
    "board_read",
    {
      title: "Read the user's reactions",
      description: "What the user starred, removed or noted on the live board since you last read it, plus the board's current contents. Also accepts pasted feedback from the static board.",
      inputSchema: { board: z.string().optional(), pasted: z.string().optional().describe("Feedback text the user pasted from the shared board") },
    },
    safe(async ({ board: bid, pasted }) => {
      const board = activeBoard(bid);
      if (pasted)
        for (const line of pasted.split("\n")) {
          const m = line.match(/^- (star|remove|note) (\S+)(?:: (.*))?/);
          const item = m && board.items.find((it) => it.key === m[2]);
          if (!item) continue;
          if (m[1] === "star") item.starred = true;
          if (m[1] === "remove") item.removed = true;
          if (m[1] === "note") item.userNote = m[3];
          board.feedback.push({ key: m[2], action: m[1], value: m[3] ?? true, at: new Date().toISOString() });
        }
      const since = board.feedbackReadAt;
      const fresh = board.feedback.filter((f) => !since || f.at > since);
      board.feedbackReadAt = new Date().toISOString();
      saveBoard(board);
      syncTask(board);
      const live = liveItems(board);
      const lines = live.map((it, i) => `${i + 1}. ${it.starred ? "★ " : ""}${it.title || it.value} — ${it.note}${it.userNote ? `  [user: ${it.userNote}]` : ""}`);
      return text(
        `Board "${board.name}": ${live.length} items, ${board.directions.length} directions${board.chosen ? `, chosen: ${board.chosen}` : ""}.\n` +
          `New reactions: ${fresh.length ? fresh.map((f) => `${f.action} ${f.key}${f.action === "note" ? `: ${f.value}` : ""}`).join("; ") : "none"}\n\n${lines.join("\n")}`,
      );
    }),
  );

  server.registerTool(
    "board_choose",
    {
      title: "Choose the direction",
      description: "Lock in the direction the user picked (or the one you pick, with the reason, if they told you to decide). Unlocks building. Next: the system (DESIGN.md + tokens).",
      inputSchema: { direction: z.string(), reason: z.string(), board: z.string().optional() },
    },
    safe(async ({ direction, reason, board: bid }) => {
      const board = activeBoard(bid);
      const gate = directionsGate(board, ctx.config());
      if (gate) return text(gate, true);
      const d = board.directions.find((x) => x.name.toLowerCase() === direction.toLowerCase());
      if (!d) return text(`No direction "${direction}". Directions: ${board.directions.map((x) => x.name).join(", ") || "none yet (board_directions)"}`, true);
      board.chosen = d.name;
      board.chosenReason = reason;
      saveBoard(board);
      syncTask(board);
      return text(
        `Direction locked: "${d.name}" — ${d.summary}\nAdjectives: ${d.adjectives.join(", ")} · Palette: ${d.palette.join(" ")} · Type: ${d.type}\n\n` +
          "NEXT: drip_guide system, then write DESIGN.md + tokens for this direction (palette_generate / palette_check, fonts_search), and drip_mark system.",
      );
    }),
  );

  server.registerTool(
    "board_list",
    { title: "List moodboards", description: "Moodboards in this project, newest first.", inputSchema: {} },
    safe(async () => {
      const boards = listBoards();
      return text(boards.length ? boards.map((b) => `- ${b.id}: "${b.name}" · ${liveItems(b).length} items · ${b.directions.length} directions${b.chosen ? ` · chosen ${b.chosen}` : ""}`).join("\n") : "No boards yet.");
    }),
  );
}

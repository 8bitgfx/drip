// Moodboard tools: create, add (with a reason), group into directions, open/share, read feedback, choose.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, resolve } from "../../core/seen.mjs";
import { loadState, updateState } from "../../core/state.mjs";
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
      description: "Start a moodboard for the current task. Then board_add every reference you studied (with why), group them with board_directions, show it with board_open and let the user react, then board_choose.",
      inputSchema: { name: z.string().describe("Short name, e.g. 'Acme pricing page'"), brief: z.string().describe("One or two sentences: who it is for, what it must feel like, constraints") },
    },
    safe(async ({ name, brief }) => {
      const board = createBoard(name, brief);
      syncTask(board);
      return text(`Board "${board.name}" created (id ${board.id}).\nNEXT: board_add the references you studied, each with a specific note on what to take from it. Read drip_guide moodboard if you have not.`);
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
              items: z.array(z.string()).min(1).describe("Board item numbers (as shown on the board, '3') or keys"),
            }),
          )
          .min(2)
          .max(4),
        board: z.string().optional(),
      },
    },
    safe(async ({ directions, board: bid }) => {
      const board = activeBoard(bid);
      const live = liveItems(board);
      const min = ctx.config().gates.minBoardItems;
      if (live.length < min) return text(`The board has ${live.length} items; collect at least ${min} studied references before forming directions.`, true);
      const keyOf = (r) => (/^\d+$/.test(r) && live[+r - 1] ? live[+r - 1].key : r);
      board.directions = directions.map((d) => ({ ...d, items: d.items.map(keyOf).filter((k) => live.some((it) => it.key === k)) }));
      board.chosen = null;
      saveBoard(board);
      syncTask(board);
      return text(`${board.directions.length} directions saved: ${board.directions.map((d) => `"${d.name}" (${d.items.length} items)`).join(", ")}.\nNEXT: board_open to show the user, ask which direction (or let them react on the board), then board_choose.`);
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

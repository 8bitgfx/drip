// Moodboard tools: create, add (with a reason), group into directions, open/share, read feedback, choose.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, resolve } from "../../core/seen.mjs";
import { lastCritique, loadState, updateState } from "../../core/state.mjs";
import { renderHtml } from "../../core/render.mjs";
import { readGuide } from "../../core/guides.mjs";
import { COMP, tileHtml } from "./tile.mjs";
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
    return "The critic hasn't ranked these directions yet. Render the comps (board_directions does), then critic_prepare({ kind: \"directions\" }), launch the drip:critic subagent with the prompt it returns, and critic_record its verdict.";
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
        "Then add colours/fonts/images with board_add, form directions (board_directions), which renders each as a first-viewport comp, get the critic's ranking, board_open, board_choose.",
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
      return text(`Board "${board.name}" created with ${imported} studied references.\nNEXT: board_directions: 2 directions that differ in idea, each with a thesis (manifesto), palette in role order, two faces, a real headline, a concrete picture and a layout. It renders their first-viewport comps. (board_add colours or fonts only if the board needs them to explain a direction.)`);
    }),
  );

  server.registerTool(
    "board_tile",
    {
      title: "Re-render the direction comps",
      description:
        "Re-renders each direction's first-viewport comp (1440x900 at real sizes: the h1 at the Display token, the picture slot at its real size, plus a spec strip). board_directions already renders them; " +
        "use this to change the copy or to pass your own comp HTML per direction when the template can't show the idea.",
      inputSchema: {
        board: z.string().optional(),
        copy: z.object({ brand: z.string().optional(), headline: z.string().optional(), body: z.string().optional(), cta: z.string().optional() }).optional().describe("Real copy for the tiles (defaults from the brief)"),
        custom: z
          .array(z.object({ direction: z.string(), html: z.string().describe("A full HTML document or fragment for this direction's tile (fonts via Google Fonts links)") }))
          .optional()
          .describe("Your own comp per direction when the template can't show the idea. Rendered at 1440x1000 (900 viewport + 100 spec strip) so options stay at equal fidelity."),
      },
    },
    safe(async ({ board: bid, copy = {}, custom = [] }) => {
      const board = activeBoard(bid);
      if (!board.directions.length) return text("No directions yet: board_directions first.", true);
      return blocks(await renderTiles(board, copy, custom));
    }),
  );

  async function renderTiles(board, copy = {}, custom = []) {
    {
      const brief = loadState().task?.brief;
      const dir = path.join(path.dirname(boardFile(board.id)), "tiles");
      fs.mkdirSync(dir, { recursive: true });
      const content = [];
      const files = [];
      const pngs = await Promise.all(board.directions.map((d) => {
        const file = path.join(dir, `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
        const own = custom.find((c) => c.direction.toLowerCase() === d.name.toLowerCase());
        return renderHtml(
          own
            ? own.html
            : tileHtml(d, {
                brand: copy.brand || board.name,
                headline: copy.headline || d.headline || d.summary,
                body: copy.body || (brief ? `${brief.job[0].toUpperCase()}${brief.job.slice(1)}. Made for ${brief.audience}.` : d.adjectives.join(" · ")),
                cta: copy.cta || "See the work",
              }),
          file,
          { width: COMP.width, height: COMP.height, config: ctx.config() },
        ).then((png) => ({ png, file }));
      }));
      for (const [k, d] of board.directions.entries()) {
        const { png, file } = pngs[k];
        d.tile = file;
        files.push(file);
        content.push(textBlock(`Comp: ${d.name} — ${d.adjectives.join(", ")} · ${d.type}`), imageBlock(await toJpeg(png, 1200, 840)));
      }
      board.tilesAt = new Date().toISOString();
      saveBoard(board);
      content.unshift(textBlock(`Rendered ${files.length} first-viewport comps:\n${files.join("\n")}\n\nLook first: could a comp be any brand's hero? Is the picture the subject's real thing? Then the critic ranks them: critic_prepare({ kind: "directions" }) -> Agent drip:critic -> critic_record. Rework anything it rejects before board_open.`));
      return content;
    }
  }

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
        "Deal 2 (3 only when the brief truly forks) directions that differ in IDEA, each with its thesis, palette in role order (ground, ink, accent, support), two faces, and the hero it implies. " +
        "Renders each as a first-viewport comp at 1440x900 with the real headline, sentence and action (playbook P8-P16). Replaces previous directions.",
      inputSchema: {
        directions: z
          .array(
            z.object({
              name: z.string(),
              summary: z.string(),
              adjectives: z.array(z.string()).min(2).max(4),
              palette: z.array(z.string()).min(2).max(8).describe("Hex colours in role order: ground, ink, accent, support…"),
              type: z.string().describe("Display face + text face, e.g. 'Fraunces + Söhne'. Never mono as a voice"),
              manifesto: z.string().optional().describe("The thesis: the idea this page owns and the category default it refuses, plus the physical scene (who, where, what light)"),
              pairing: z.string().optional().describe("What it borrows ambition or discipline from (a working web world), never a poster's clothes"),
              headline: z.string().optional().describe("The real headline for this direction's comp (8 words or fewer)"),
              picture: z.string().optional().describe("What the first screen shows, concretely: 'the six works as a full-bleed grid', 'the app's timeline view at 1:1'"),
              layout: z.enum(["split", "bleed", "type"]).optional().describe("split: copy 6 cols + picture 6 cols, full height; bleed: picture behind everything; type: the h1 spans the width, picture below"),
              items: z.array(z.string()).min(1).describe("Board item numbers (as shown on the board, '3') or keys"),
            }),
          )
          .min(2)
          .max(4),
        criteria: z.array(z.string()).optional().describe("3-5 choice criteria from the brief, written BEFORE the tiles (thresholds or trade-offs)"),
        copy: z.object({ brand: z.string().optional(), headline: z.string().optional(), body: z.string().optional(), cta: z.string().optional() }).optional().describe("Real copy for the comps: brand, the sentence (body), the action (cta)"),
        custom: z.array(z.object({ direction: z.string(), html: z.string() })).optional().describe("Your own comp HTML per direction (rendered at 1440x1000)"),
        board: z.string().optional(),
      },
    },
    safe(async ({ directions, criteria, board: bid, copy, custom }) => {
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
      // Render the style tiles right away (one round trip less). Custom tiles: board_tile({ custom }).
      const tiles = await renderTiles(board, copy || {}, custom || []).catch((e) => [textBlock(`(Tiles not rendered: ${e.message}. Run board_tile.)`)]);
      syncTask(board);
      return blocks([textBlock(`${board.directions.length} directions saved: ${board.directions.map((d) => `"${d.name}" (${d.items.length} items)`).join(", ")}.`), ...tiles]);
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
        content.push(imageBlock(await screenshot(url, { width: 1440, height: 1100, format: "jpeg", quality: 80, scale: 1200 / 1440, waitMs: 3000, config: ctx.config() })));
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
      // Re-send the build half of the playbook now, when it matters (the numbers are what get lost between intake and build).
      const task = loadState().task;
      const pb = readGuide("playbook") || "";
      const buildHalf = task?.mode === "logo" ? "" : pb.slice(Math.max(0, pb.indexOf("## System")), pb.indexOf("## Talk") > 0 ? pb.indexOf("## Talk") : undefined);
      return text(
        `Direction locked: "${d.name}" — ${d.summary}\nAdjectives: ${d.adjectives.join(", ")} · Palette: ${d.palette.join(" ")} · Type: ${d.type}\n\n` +
          (task?.mode === "logo"
            ? "NEXT: refine the chosen concept in black first, then logo_test, then the critic."
            : "NEXT: drip_kit, then fill in the faces (fonts_pair / fonts_preview with the real headline) and colour roles (palette_check), write DESIGN.md, drip_mark system. " +
              "Then plan the sections and build the hero FIRST (fitcheck_shot hero: true). The build half of the playbook, again, because these numbers are the job:\n\n" +
              buildHalf),
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

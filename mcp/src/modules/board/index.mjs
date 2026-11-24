// Moodboard tools: create, add (with a reason), group into directions, open/share, read feedback, choose.
// Boards are the project's durable design memory (see docs/PROJECT_MEMORY.md and modules/project for the
// project-level tools). Every change goes through updateBoard, so two sessions never overwrite each other.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, resolve } from "../../core/seen.mjs";
import { actor, lastCritique, loadState, updateState } from "../../core/state.mjs";
import { renderHtml, renderUrl } from "../../core/render.mjs";
import { projectDir } from "../../core/paths.mjs";
import { pathToFileURL } from "node:url";
import { readGuide } from "../../core/guides.mjs";
import { approveDirection, recordFeedback, writeProjectSkill } from "../../core/memory.mjs";
import { COMP, tileHtml } from "./tile.mjs";
import { screenshot } from "../fitcheck/chrome.mjs";
import { renderBoard } from "./render.mjs";
import { ensureServer } from "./server.mjs";
import { ITEM_STATUS, addItem, boardFile, createBoard, listBoards, liveItems, loadBoard, makeProvenance, resolveBoard, updateBoard } from "./store.mjs";

const HOW = { master: "the project master board", latest: "the most recently updated board (no task board, no master)" };

/** The board this call means (explicit id, task board, project master, latest) and a note when it fell back. */
function pick(id) {
  const { board, how } = resolveBoard({ id, task: loadState().task });
  if (!board) throw new Error("No moodboard yet. Call board_create first (or board_project to build one from this repo).");
  return { board, note: HOW[how] ? `(Using ${HOW[how]}: "${board.name}", ${board.id}. Pass board: "<id>" for another.)\n` : "" };
}

/** Directions may be shown/chosen only after the critic ranked the current set and didn't reject it. */
function directionsGate(board, config) {
  const task = loadState().task;
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireCritic || !board.directions.length) return null;
  if (task.board?.adopted && task.board.id === board.id) return null; // the approved direction was reviewed when it was approved
  const rec = lastCritique(task, "directions");
  if (!rec || (board.directionsAt && rec.at < board.directionsAt))
    return "The critic hasn't ranked these directions yet. Render the comps (board_directions does), then critic_prepare({ kind: \"directions\" }), launch the drip:critic subagent with the prompt it returns, and critic_record its verdict.";
  if (rec.verdict === "reject")
    return `The critic rejected this set ("${rec.summary}"). Rework the weak directions (or replace them with bolder ones), board_directions again, re-render tiles and get a new ranking.`;
  return null;
}

/** Keep the task's view of its board current (and keep an adopted direction marked). */
export function syncTask(board) {
  updateState((st) => {
    if (!st.task) return;
    const prev = st.task.board;
    st.task.board = { id: board.id, items: liveItems(board).length, directions: board.directions.length, chosen: board.chosen, revision: board.revision, ...(prev?.id === board.id && prev.adopted ? { adopted: prev.adopted } : {}) };
  });
}

/** Board events become feedback evidence (who, when, which task, which board revision). Never throws. */
function remember(board, ev) {
  try {
    recordFeedback({ scope: board.scope === "master" ? "brand" : "feature", board: board.id, ...ev });
  } catch {
    /* evidence is best effort: the board change already happened */
  }
}

export function register(server, ctx) {
  server.registerTool(
    "board_create",
    {
      title: "Create a moodboard",
      description:
        "Start the moodboard for the current task. Every reference you studied with refs_study is added automatically (and later studies too). " +
        "Then add colours/fonts/images with board_add, form directions (board_directions), which renders each as a first-viewport comp, get the critic's ranking, board_open, board_choose. " +
        "The first board of a project becomes its master (the stable board that keeps the approved direction); later ones are feature boards that inherit from it. " +
        "scope \"concept\" makes an alternative to explore. Never replaces an existing board: board_project shows what exists.",
      inputSchema: {
        name: z.string().describe("Short name, e.g. 'Claude portfolio'"),
        brief: z.string().optional().describe("Defaults to the recorded brief"),
        scope: z.enum(["master", "feature", "concept"]).optional().describe("Default: master if the project has none, else feature"),
        parent: z.string().optional().describe("Board this one inherits from (default: the master)"),
      },
    },
    safe(async ({ name, brief, scope, parent }) => {
      const task = loadState().task;
      const b = task?.brief;
      const board0 = createBoard(name, brief || (b ? `${b.what} — for ${b.audience}. Feel: ${b.feel.join(", ")}. Ambition: ${b.ambition}.` : ""), { scope, parent, brand: task?.memory?.brand || null });
      const by = actor();
      let imported = 0;
      const studies = [];
      for (const s of task?.refs?.studied || []) {
        const item = lookup(s.key);
        if (!item?.study) continue;
        studies.push(item);
      }
      const board = updateBoard(
        board0.id,
        (x) => {
          for (const item of studies) {
            const n = item.study;
            addItem(x, { ...item, kind: "shot", note: `${n.take} · layout: ${n.layout} · type: ${n.type} · colour: ${n.color} · detail: ${n.detail}`, study: { ...n, surface: n.surface || task?.surface } }, { provenance: makeProvenance({ source: "reference", label: item.designer || item.title || "", url: item.url || item.image || null, by }), status: "inspiration" });
            imported++;
          }
        },
        { op: "studies", summary: `${imported} studied references from the task`, by },
      );
      syncTask(board);
      const inherit = board.scope === "master" ? "This is the project's master board: it keeps the approved direction across tasks." : `Feature board under the master "${board.parent}": it inherits the brand and never changes it.`;
      return text(`Board "${board.name}" (${board.id}, ${board.scope}) created with ${imported} studied references. ${inherit}\nNEXT: board_directions: 2 directions that differ in idea, each with a thesis (manifesto), palette in role order, two faces, a real headline, a concrete picture and a layout. It renders their first-viewport comps. (board_add colours or fonts only if the board needs them to explain a direction.)`);
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
          .array(z.object({ direction: z.string(), html: z.string().optional().describe("A full HTML document (fonts via Google Fonts links)"), file: z.string().optional().describe("Path to an HTML file, e.g. .drip/comps/live-wire.html (.drip/ is never gated). Relative assets and fonts load from its folder.") }))
          .optional()
          .describe("Your own comp per direction when the template can't show the idea. Rendered at 1440x1000 (900 viewport + 100 spec strip) so options stay at equal fidelity."),
      },
    },
    safe(async ({ board: bid, copy = {}, custom = [] }) => {
      const { board, note } = pick(bid);
      if (!board.directions.length) return text("No directions yet: board_directions first.", true);
      const tiles = await renderTiles(board, copy, custom);
      return blocks(note ? [textBlock(note), ...tiles] : tiles);
    }),
  );

  async function renderTiles(board0, copy = {}, custom = []) {
    const brief = loadState().task?.brief;
    const dir = path.join(path.dirname(boardFile(board0.id)), "tiles");
    fs.mkdirSync(dir, { recursive: true });
    const content = [];
    const files = [];
    const pngs = await Promise.all(
      board0.directions.map((d) => {
        const file = path.join(dir, `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`);
        const own = custom.find((c) => c.direction.toLowerCase() === d.name.toLowerCase());
        if (own?.file) {
          const abs = path.resolve(projectDir(), own.file);
          if (!fs.existsSync(abs)) throw new Error(`Comp file not found: ${own.file}`);
          return renderUrl(pathToFileURL(abs).href, file, { width: COMP.width, height: COMP.height, format: "jpeg", quality: 85, config: ctx.config() }).then((png) => ({ png, file }));
        }
        return renderHtml(
          own
            ? own.html
            : tileHtml(d, {
                brand: copy.brand || board0.name,
                headline: copy.headline || d.headline || d.summary,
                body: copy.body || (brief ? `${brief.job[0].toUpperCase()}${brief.job.slice(1)}. Made for ${brief.audience}.` : d.adjectives.join(" · ")),
                cta: copy.cta || "See the work",
              }),
          file,
          { width: COMP.width, height: COMP.height, format: "jpeg", quality: 85, config: ctx.config() },
        ).then((png) => ({ png, file }));
      }),
    );
    const tiles = new Map();
    for (const [k, d] of board0.directions.entries()) {
      const { png, file } = pngs[k];
      tiles.set(d.name, file);
      files.push(file);
      content.push(textBlock(`Comp: ${d.name} — ${d.adjectives.join(", ")} · ${d.type}`), imageBlock(png));
    }
    const board = updateBoard(
      board0.id,
      (b) => {
        for (const d of b.directions) if (tiles.has(d.name)) d.tile = tiles.get(d.name);
        b.tilesAt = new Date().toISOString();
      },
      { op: "tiles", summary: `${files.length} comps rendered` },
    );
    Object.assign(board0, { directions: board.directions, tilesAt: board.tilesAt, revision: board.revision });
    content.unshift(textBlock(`Rendered ${files.length} first-viewport comps:\n${files.join("\n")}\n\nLook first: could a comp be any brand's hero? Is the picture the subject's real thing? Then the critic ranks them: critic_prepare({ kind: "directions" }) -> Agent drip:critic -> critic_record. Rework anything it rejects before board_open.`));
    return content;
  }

  server.registerTool(
    "board_add",
    {
      title: "Add to the moodboard",
      description:
        "Add references to the active board. Each item needs a NOTE saying what exactly to take from it ('left nav density + monochrome icons', 'serif display at 96px over photo') — 'nice' or 'clean' is rejected. " +
        "Items can be shots (number from the last listing or id), image URLs, colours (#hex) or fonts (font name). Adding the same thing again refreshes it and keeps the user's stars and notes. " +
        "status: inspiration (default for references), proposed (an idea for this project), current (what the project has today), approved, rejected.",
      inputSchema: {
        items: z
          .array(
            z.object({
              ref: z.string().describe("Shot number/id, an image URL, a #hex colour or a font name"),
              kind: z.enum(["shot", "image", "color", "font"]).optional().describe("Default: shot, or detected from ref"),
              note: z.string().describe("What to take from it, specifically"),
              title: z.string().optional(),
              source: z.string().optional().describe("For images: where it came from (site, author, page URL)"),
              status: z.enum(ITEM_STATUS).optional().describe("Default: inspiration for references"),
            }),
          )
          .min(1),
        board: z.string().optional(),
      },
    },
    safe(async ({ items, board: bid }) => {
      const { board: b0, note: how } = pick(bid);
      const rejected = [];
      const by = actor();
      const entries = [];
      for (const it of items) {
        const note = it.note.trim();
        if (note.length < 15 || /^(nice|clean|cool|good|great|modern|beautiful|pretty|sleek|minimal)\.?$/i.test(note)) {
          rejected.push(`${it.ref}: note too vague ("${note}") — say what to take from it`);
          continue;
        }
        const kind = it.kind || (/^#[0-9a-f]{3,8}$/i.test(it.ref) ? "color" : /^https?:/.test(it.ref) ? "image" : /^[\d#]|^dribbble:|^L\d+-\d+$/i.test(it.ref) || lookup(resolve(it.ref)) ? "shot" : "font");
        let entry;
        let prov;
        if (kind === "shot") {
          const key = resolve(it.ref);
          const known = lookup(key);
          if (!known) {
            rejected.push(`${it.ref}: unknown shot — list it first (refs_search / refs_tag) or pass its id`);
            continue;
          }
          entry = { ...known, kind: key.startsWith("image:") ? "image" : kind, note };
          prov = makeProvenance({ source: "reference", label: known.designer || known.title || "", url: known.url || known.image || null, by });
        } else if (kind === "image") {
          entry = { key: `image:${it.ref}`, kind, image: it.ref, url: it.ref, title: it.title || it.ref.split("/").pop(), source: it.source || "unknown source", note };
          prov = makeProvenance({ source: "reference", label: it.source || "", url: it.ref, by });
        } else {
          entry = { key: `${kind}:${it.ref}`, kind, value: it.ref, title: it.title || it.ref, note };
          prov = makeProvenance({ source: "agent", label: "", by });
        }
        entries.push({ entry, prov, status: it.status });
      }
      let added = 0;
      let refreshed = 0;
      const board = updateBoard(
        b0.id,
        (b) => {
          for (const { entry, prov, status } of entries) {
            const r = addItem(b, entry, { provenance: prov, status });
            if (r.action === "added") added++;
            else refreshed++;
          }
        },
        { op: "add", summary: `${entries.length} item(s)`, by },
      );
      syncTask(board);
      const n = liveItems(board).length;
      const min = ctx.config().gates.minBoardItems;
      return text(
        `${how}Added ${added}${refreshed ? `, refreshed ${refreshed}` : ""}. Board has ${n} items.` +
          (rejected.length ? `\nRejected:\n- ${rejected.join("\n- ")}` : "") +
          (n < min ? `\nNEXT: keep collecting (${n}/${min} before directions).` : "\nNEXT: group the board into 2-3 directions with board_directions, then board_open to show the user."),
        rejected.length > 0 && added + refreshed === 0,
      );
    }),
  );

  server.registerTool(
    "board_directions",
    {
      title: "Group the board into directions",
      description:
        "Deal 2 (3 only when the brief truly forks) directions that differ in IDEA, each with its thesis, palette in role order (ground, ink, accent, support), two faces, and the hero it implies. " +
        "Renders each as a first-viewport comp at 1440x900 with the real headline, sentence and action (playbook P8-P16). Replaces previous directions. " +
        "On a master board whose direction is already approved this only proposes: the approved one stays until the user approves a change.",
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
        custom: z.array(z.object({ direction: z.string(), html: z.string().optional().describe("A full HTML document (fonts via Google Fonts links)"), file: z.string().optional().describe("Path to an HTML file, e.g. .drip/comps/live-wire.html (.drip/ is never gated). Relative assets and fonts load from its folder.") })).optional().describe("Your own comp per direction (rendered at 1440x1000 after its web fonts load). Write each to .drip/comps/<name>.html and pass { direction, file }: no HTML inside JSON."),
        board: z.string().optional(),
      },
    },
    safe(async ({ directions, criteria, board: bid, copy, custom }) => {
      const { board: b0, note } = pick(bid);
      const live = liveItems(b0);
      const min = ctx.config().gates.minBoardItems;
      if (live.length < min) return text(`The board has ${live.length} items; collect at least ${min} studied references before forming directions.`, true);
      const keyOf = (r) => (/^\d+$/.test(r) && live[+r - 1] ? live[+r - 1].key : r);
      const board = updateBoard(
        b0.id,
        (b) => {
          const lv = liveItems(b);
          b.directions = directions.map((d) => ({ ...d, items: d.items.map(keyOf).filter((k) => lv.some((it) => it.key === k)) }));
          if (criteria) b.criteria = criteria;
          b.chosen = null; // a new set is chosen again (the approved identity, if any, lives in board.approved)
          b.directionsAt = new Date().toISOString();
        },
        { op: "directions", summary: `${directions.length} directions: ${directions.map((d) => d.name).join(", ")}`, by: actor() },
      );
      syncTask(board);
      // Render the style tiles right away (one round trip less). Custom tiles: board_tile({ custom }).
      const tiles = await renderTiles(board, copy || {}, custom || []).catch((e) => [textBlock(`(Tiles not rendered: ${e.message}. Run board_tile.)`)]);
      syncTask(loadBoard(board.id));
      return blocks([textBlock(`${note}${board.directions.length} directions saved: ${board.directions.map((d) => `"${d.name}" (${d.items.length} items)`).join(", ")}.${board.approved ? ` The approved direction "${board.approved.direction}" stays in force until the user approves a change.` : ""}`), ...tiles]);
    }),
  );

  server.registerTool(
    "board_open",
    {
      title: "Show the moodboard",
      description:
        "Renders the board. Returns (1) a live local link where the user can star, remove and annotate items (read back with board_read), (2) a self-contained HTML file with images inlined — " +
        "if you have an Artifact / publish tool, publish THAT file so the user gets a shareable board — and (3) a preview screenshot when Chrome is available. " +
        "The page shows what is current, inspiration, proposed and approved, the board's revision and its related boards.",
      inputSchema: { board: z.string().optional(), static: z.boolean().optional().describe("Also write the self-contained file (default true)") },
    },
    safe(async ({ board: bid, static: stat = true }) => {
      const { board, note } = pick(bid);
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
          `${note}Live board: ${url}\n` +
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
      description: "What the user starred, removed or noted on the live board since you last read it, plus the board's current contents. Also accepts pasted feedback from the static board. Every reaction is also saved as feedback evidence for the project.",
      inputSchema: { board: z.string().optional(), pasted: z.string().optional().describe("Feedback text the user pasted from the shared board") },
    },
    safe(async ({ board: bid, pasted }) => {
      const { board: b0, note } = pick(bid);
      const events = [];
      const board = updateBoard(
        b0.id,
        (b) => {
          if (pasted)
            for (const line of pasted.split("\n")) {
              const m = line.match(/^- (star|remove|note) (.+?)(?:: (.*))?$/);
              const item = m && b.items.find((it) => it.key === m[2]);
              if (!item) continue;
              if (m[1] === "star") item.starred = true;
              if (m[1] === "remove") item.removed = true;
              if (m[1] === "note") item.userNote = m[3];
              const entry = { key: m[2], action: m[1], value: m[3] ?? true, at: new Date().toISOString() };
              b.feedback.push(entry);
              events.push({ entry, item });
            }
          b.feedbackReadAt = new Date().toISOString();
        },
        { op: "read", summary: pasted ? "pasted feedback" : "read" },
      );
      for (const { entry, item } of events) remember(board, { kind: entry.action, source: entry.action === "note" ? "user-explicit" : "user-selection", target: entry.key, text: `${entry.action} ${item.title || entry.key}${entry.action === "note" ? `: ${entry.value}` : ""}` });
      const since = b0.feedbackReadAt;
      const fresh = board.feedback.filter((f) => !since || f.at > since);
      syncTask(board);
      const live = liveItems(board);
      const lines = live.map((it, i) => `${i + 1}. ${it.starred ? "★ " : ""}${it.status && it.status !== "inspiration" ? `[${it.status}] ` : ""}${it.title || it.value} — ${it.note}${it.userNote ? `  [user: ${it.userNote}]` : ""}`);
      return text(
        `${note}Board "${board.name}" (${board.scope}, r${board.revision}): ${live.length} items, ${board.directions.length} directions${board.chosen ? `, chosen: ${board.chosen}` : ""}${board.approved ? `, approved: ${board.approved.direction}` : ""}.\n` +
          `New reactions: ${fresh.length ? fresh.map((f) => `${f.action} ${f.key}${f.action === "note" ? `: ${f.value}` : ""}`).join("; ") : "none"}\n\n${lines.join("\n")}`,
      );
    }),
  );

  server.registerTool(
    "board_choose",
    {
      title: "Choose the direction",
      description:
        "Lock in the direction the user picked (or the one you pick, with the reason, if they told you to decide). Unlocks building. Next: the system (DESIGN.md + tokens). " +
        "On the project's master board this is also the approval of the project's identity (kept across tasks and sessions); pass approved: false if you chose on the user's behalf and they haven't said yes. " +
        "When the project already has an approved direction, a different one is a redesign: it is stored as a proposal and the approved one stays until the user says yes (then approved: true, or board_update with style.promote).",
      inputSchema: { direction: z.string(), reason: z.string(), board: z.string().optional(), approved: z.boolean().optional().describe("true: the user approved it. Default true, except in redesign mode where a change needs an explicit true") },
    },
    safe(async ({ direction, reason, board: bid, approved }) => {
      const { board: b0, note } = pick(bid);
      const gate = directionsGate(b0, ctx.config());
      if (gate) return text(gate, true);
      const d = b0.directions.find((x) => x.name.toLowerCase() === direction.toLowerCase());
      if (!d) return text(`No direction "${direction}". Directions: ${b0.directions.map((x) => x.name).join(", ") || "none yet (board_directions)"}`, true);
      const task = loadState().task;
      const mode = task?.memory?.mode || "fidelity";
      const yes = approved ?? mode !== "redesign";
      let outcome;
      try {
        outcome = yes || mode === "redesign" ? approveDirection({ boardId: b0.id, direction: d.name, reason, critic: lastCritique(task, "directions") ? (({ verdict, summary, at }) => ({ verdict, summary, at }))(lastCritique(task, "directions")) : null, mode, approved: yes }) : { kind: "chosen-only" };
      } catch (e) {
        return text(e.message, true);
      }
      const proposed = outcome.kind === "proposed";
      const board = updateBoard(
        b0.id,
        (b) => {
          if (!proposed) {
            b.chosen = d.name;
            b.chosenReason = reason;
          }
        },
        { op: "choose", summary: `${proposed ? "proposed" : "chose"} "${d.name}"`, by: actor() },
      );
      if (!proposed) syncTask(board);
      if (outcome.revision) updateState((st) => st.task?.memory && (st.task.memory.styleRevision = outcome.kind === "approved" ? outcome.revision : st.task.memory.styleRevision));
      remember(board, { kind: "choose", source: yes ? "user-selection" : "agent-inference", target: d.name, scope: board.scope === "master" ? "brand" : "feature", text: reason });
      try {
        if (outcome.kind === "approved") writeProjectSkill({});
      } catch {
        /* the skill is regenerated at handoff too */
      }
      // Re-send the build half of the playbook now, when it matters (the numbers are what get lost between intake and build).
      const pb = readGuide("playbook") || "";
      const buildHalf = task?.mode === "logo" ? "" : pb.slice(Math.max(0, pb.indexOf("## System")), pb.indexOf("## Talk") > 0 ? pb.indexOf("## Talk") : undefined);
      const status =
        outcome.kind === "approved"
          ? `Approved as the project's direction (style ${outcome.revision}); it now persists across tasks and sessions.\n`
          : proposed
            ? `The project already has an approved direction, so "${d.name}" is stored as a PROPOSAL (style ${outcome.revision}); the approved one stays in force. When the user says yes: board_choose again with approved: true, or board_update({ style: { promote: "${outcome.revision}" }, approved: true }). To go back later: board_update({ style: { rollback: true }, approved: true }).\n`
            : outcome.kind === "board-only"
              ? `Chosen on this ${board.scope} board only; the project's master direction is unchanged.\n`
              : "";
      return text(
        `${note}${status}Direction locked: "${d.name}" — ${d.summary}\nAdjectives: ${d.adjectives.join(", ")} · Palette: ${d.palette.join(" ")} · Type: ${d.type}\n\n` +
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
    { title: "List moodboards", description: "Moodboards in this project, newest first, with each one's scope (master / feature / concept), status and revision.", inputSchema: {} },
    safe(async () => {
      const boards = listBoards();
      return text(
        boards.length
          ? boards.map((b) => `- ${b.id}: "${b.name}" · ${b.scope || "feature"}${b.status === "archived" ? " (archived)" : ""} r${b.revision} · ${liveItems(b).length} items · ${b.directions.length} directions${b.chosen ? ` · chosen ${b.chosen}` : ""}${b.approved ? ` · approved ${b.approved.direction}` : ""}`).join("\n")
          : "No boards yet.",
      );
    }),
  );
}

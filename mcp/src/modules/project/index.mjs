// Project memory tools: the master board, importing the repo's own design material, feedback and decisions,
// the project skill, measured style, and style packs. See docs/PROJECT_MEMORY.md.
// The same functions are callable without MCP: core/project.mjs (projectContext) and core/memory.mjs.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { capture } from "../../core/cdp.mjs";
import { imageBlock, textBlock } from "../../core/images.mjs";
import { readJson, writeJsonAtomic, RevisionConflict } from "../../core/jsonstore.mjs";
import { addException, decideRule, loadDecisions, promoteRevision, readFeedback, recordFeedback, rejectRevision, rollbackRevision, skillBody, undoProjectSkill, writeProjectSkill } from "../../core/memory.mjs";
import { ensureProjectDrip, projectDir, syncGitignore } from "../../core/paths.mjs";
import { adoptApproved, buildTaskMemory, carryStudies, hasMemory, projectContext } from "../../core/project.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { toUrl } from "../../core/serve.mjs";
import { actor, loadState, missingBeforeUi, updateState } from "../../core/state.mjs";
import { createPack, listPacks, packDir, readPackFile, writePackFile } from "../../core/packs.mjs";
import { ITEM_STATUS, archiveBoard, boardHistory, contentHash, createBoard, dedupeBoard, fileHash, forkBoard, liveItems, listBoards, loadBoard, loadIndex, makeProvenance, masterId, resetBoard, resolveBoard, setMaster, updateBoard } from "../board/store.mjs";
import { syncTask } from "../board/index.mjs";
import { exportStylePack, importStylePack, whyNotShareable } from "./exchange.mjs";
import { SECRET_FILE, applyEntries, boardAssetPath, describeInventory, importInventory, scanRepo } from "./scan.mjs";
import { describeTokens, measureFiles, measurePage, saveStyle } from "./style.mjs";
import { fwd as posix } from "../../core/util.mjs";


/** Turn the share opt-in on or off: writes config.json (keeping the user's other keys) and rewrites .drip/.gitignore's block. */
function setShare(patch) {
  const dir = ensureProjectDrip();
  const file = path.join(dir, "config.json");
  const cfg = readJson(file, {}) || {};
  cfg.share = { ...(cfg.share || {}), ...patch };
  writeJsonAtomic(file, cfg);
  const r = syncGitignore(dir, cfg.share);
  return { share: cfg.share, changed: r.changed };
}

/** Screenshots of the running app (desktop + phone), saved under the board's assets, as items with status current. */
async function shootApp(boardId, url, config, by) {
  const root = projectDir();
  const target = await toUrl(url);
  const entries = [];
  const shots = [];
  for (const width of [1440, 375]) {
    const cap = await capture(target, { width, height: width > 600 ? 900 : 812, maxSlices: 1, quality: 82, idle: true, config });
    const buf = cap.slices[0].buf;
    const hash = contentHash(buf);
    const { abs, rel } = boardAssetPath(boardId, `app-${width}-${hash}.jpg`, root);
    fs.writeFileSync(abs, buf);
    entries.push({ entry: { key: `screenshot:${target}@${width}`, kind: "screenshot", title: `${url} at ${width}px`, path: rel, hash, url: target, note: "the running app as it looks today (current implementation, not an approved look)" }, prov: makeProvenance({ source: "screenshot", label: `${url} @${width}`, path: rel, url: target, by }), status: "current" });
    shots.push(buf);
  }
  return { entries, shots };
}

/** A file the user gave us: copy it into the board's assets when it lives outside the project, else reference it where it is. */
function entryForFile(boardId, input, { by, status }) {
  const root = projectDir();
  const abs = path.resolve(root, input);
  const inside = abs === root || abs.startsWith(root + path.sep);
  const name = path.basename(abs);
  if (SECRET_FILE.test(name)) return { skip: `${input}: looks like a secrets file, never read` };
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return { skip: `${input}: not found` };
  }
  if (!st.isFile()) return { skip: `${input}: not a file` };
  if (st.size > 8 * 1024 * 1024) return { skip: `${input}: larger than 8 MB` };
  const why = whyNotShareable(abs);
  if (why) return { skip: `${input}: ${why}` };
  let rel;
  if (inside) rel = posix(path.relative(root, abs));
  else {
    const a = boardAssetPath(boardId, `${contentHash(fs.readFileSync(abs)).slice(0, 8)}-${name}`, root);
    fs.copyFileSync(abs, a.abs);
    rel = a.rel;
  }
  const hash = fileHash(path.join(root, rel));
  const ext = path.extname(name).toLowerCase();
  const kind = /\.(png|jpe?g|webp|avif|gif|svg)$/.test(ext) ? (/(logo|wordmark|brand|mark)/i.test(name) ? "logo" : "image") : /\.(woff2?|ttf|otf)$/.test(ext) ? "font" : /\.(css|scss|json)$/.test(ext) ? "tokens" : "doc";
  return {
    entry: { key: kind === "font" ? `font:${name.replace(/\.[^.]+$/, "")}` : `file:${rel}`, kind, title: name, path: rel, hash, ...(kind === "doc" ? { excerpt: fs.readFileSync(abs, "utf8").slice(0, 600).replace(/\s+/g, " ") } : {}), note: `a file you were given (${kind}), kept with its source path` },
    prov: makeProvenance({ source: inside ? "repo" : "user-file", label: inside ? "project file" : `given file, copied from ${name}`, path: rel, by }),
    status,
  };
}

const fmtRule = (r) => `${r.id} [${r.status}${r.scope !== "brand" ? ` ${r.scope}${r.target ? ` ${r.target}` : ""}` : ""}] ${r.topic}: ${r.value}${r.avoid?.length ? ` (refuses: ${r.avoid.join("; ")})` : ""} · ${r.source}${r.conflictsWith?.length ? ` · CONTRADICTS ${r.conflictsWith.join(", ")}` : ""}${r.offDirection ? " · off-direction" : ""}`;

export function register(server, ctx) {
  server.registerTool(
    "board_project",
    {
      title: "Discover or bootstrap the project's design memory",
      description:
        "The project's master board: the stable board that keeps what the project already looks like, its approved direction and what it learned. " +
        "action discover (default): read-only inventory of the repo's README, DESIGN.md, tokens, CSS, fonts, logos, imagery, pages and component stack, plus the boards that exist. " +
        "action bootstrap: when the project has no master board, create one from that inventory (items marked current: existing UI is evidence, not an approved look) and, with url, screenshots of the running app; " +
        "when one exists it is kept (refresh: true re-imports changed files; nothing is replaced). Skips node_modules, builds, caches and secret files; never runs a script from the repo. " +
        "share: true turns on Git sharing of boards, decisions, the project skill, patterns metadata and packs (feedback stays personal unless shareFeedback: true). " +
        'Examples: board_project({}) · board_project({ action: "bootstrap", url: "http://localhost:3000" }) · board_project({ share: true })',
      inputSchema: {
        action: z.enum(["discover", "bootstrap", "status"]).optional(),
        brand: z.string().optional().describe("Monorepo: the brand or app this master belongs to (default: the whole project)"),
        name: z.string().optional().describe("Name for a new master board"),
        url: z.string().optional().describe("A running app or local .html to screenshot into the board (desktop + phone)"),
        refresh: z.boolean().optional().describe("With bootstrap on an existing master: import changed files again"),
        share: z.boolean().optional().describe("Turn Git sharing of the design memory on or off (rewrites .drip/.gitignore's Drip block, keeps your lines)"),
        shareFeedback: z.boolean().optional().describe("Also share memory/feedback.jsonl (personal by default)"),
        shareAssets: z.boolean().optional().describe("Also share small images saved under boards/<id>/assets"),
      },
    },
    safe(async ({ action = "discover", brand, name, url, refresh, share, shareFeedback, shareAssets }) => {
      const root = projectDir();
      const out = [];
      if (share !== undefined || shareFeedback !== undefined || shareAssets !== undefined) {
        const patch = {};
        if (share !== undefined) patch.boards = share;
        if (shareFeedback !== undefined) patch.feedback = shareFeedback;
        if (shareAssets !== undefined) patch.assets = shareAssets;
        const r = setShare(patch);
        out.push(`Sharing: boards ${r.share.boards ? "ON" : "off"}, feedback ${r.share.feedback ? "ON" : "off"}, assets ${r.share.assets ? "ON" : "off"} (.drip/config.json; .drip/.gitignore updated, your own lines kept). ${r.share.boards ? "Commit .drip/ to share: board metadata, boards/index.json, memory/decisions.json, the project skill, patterns metadata and packs. Rendered boards, tiles, screenshots, caches and personal feedback stay untracked." : ""}`);
        if (action === "discover" && !url && !name) return text(out.join("\n"));
      }
      const inv = scanRepo(root);
      if (action === "discover" || action === "status") {
        const boards = listBoards();
        const idx = hasMemory() ? loadIndex() : null;
        out.push(`Project ${path.basename(root)}: ${boards.length} board(s).${idx?.masters?.default ? ` Master: ${idx.masters.default}.` : " No master board yet."}`);
        if (boards.length) out.push(boards.slice(0, 8).map((b) => `- ${b.id} (${b.scope}${b.status === "archived" ? ", archived" : ""}) r${b.revision} · ${liveItems(b).length} items${b.chosen ? ` · chose ${b.chosen}` : ""}`).join("\n"));
        out.push(describeInventory(inv));
        out.push(idx?.masters?.default ? "NEXT: board_import refreshes changed repo files; project_context is what a design task starts from." : 'NEXT: board_project({ action: "bootstrap" }) creates the master board from this.');
        return text(out.join("\n"));
      }
      // bootstrap
      const existing = masterId(brand);
      const by = actor();
      let board;
      let counts;
      if (existing && !refresh) {
        out.push(`The project already has a master board ("${existing}"). It is kept as it is. board_project({ action: "bootstrap", refresh: true }) imports changed files into it; board_import adds specific files.`);
        return text(out.join("\n"));
      }
      if (existing) {
        const r = importInventory(existing, inv, { by });
        board = r.board;
        counts = r.counts;
      } else {
        const brief = inv.readme?.summary || `${path.basename(root)}: existing product`;
        const b0 = createBoard(name || `${inv.stack.name || path.basename(root)} design memory`, brief, { scope: "master", brand: brand || null });
        const r = importInventory(b0.id, inv, { by });
        board = r.board;
        counts = r.counts;
      }
      let shotNote = "";
      if (url) {
        try {
          const { entries, shots } = await shootApp(board.id, url, ctx.config(), by);
          const r = applyEntries(board.id, entries, { by, op: "screenshot", summary: url });
          board = r.board;
          shotNote = `Screenshots of ${url} added (desktop 1440, phone 375).`;
          out.push(shotNote);
          return blocks([textBlock(finish()), ...shots.map((b) => imageBlock(b))]);
        } catch (e) {
          shotNote = `(Screenshots of ${url} not taken: ${e.message}. Start the app and board_import({ url }).)`;
        }
      }
      return text(finish());
      function finish() {
        syncMemoryToTask(board);
        try {
          writeProjectSkill({});
        } catch {
          /* the skill follows later */
        }
        return [
          ...out,
          `${existing ? "Refreshed" : "Created"} the master board "${board.name}" (${board.id}, r${board.revision}): ${counts.added} added, ${counts.updated} refreshed, ${counts.duplicate} duplicate(s) skipped. All items are marked current: they show what the project looks like today, not an approved direction.`,
          describeInventory(inv),
          shotNote,
          "NEXT: research only the gaps (refs_site on 2-3 shipped sites in the category, refs_study), propose a direction (board_directions) or have the user approve what exists. Nothing in the repo was changed.",
        ].filter(Boolean).join("\n");
      }
    }),
  );

  /** A task that is open should know the master exists (so board_attach and the gates see it). */
  function syncMemoryToTask() {
    updateState((st) => {
      if (st.task && !st.task.memory) st.task.memory = buildTaskMemory({ taskText: st.task.title });
    });
  }

  server.registerTool(
    "board_import",
    {
      title: "Add the project's own files to the board",
      description:
        "Put existing material on a board as first-class items with project-relative paths and a source label: logos and brand assets, DESIGN.md/README, token and CSS files, fonts, approved images, and screenshots of the running app. " +
        "No paths: scans the repo (same skip rules as board_project). With paths: just those files or folders; a file outside the project is copied into the board's assets. " +
        "The same file again refreshes the item (a changed hash is recorded, the user's stars and notes stay); the same bytes under another name are not added twice. Secret-looking files are never read. " +
        'Examples: board_import({ paths: ["public/brand/logo.svg", "DESIGN.md"] }) · board_import({ url: "http://localhost:3000" }) · board_import({ kinds: ["tokens", "fonts"] })',
      inputSchema: {
        board: z.string().optional().describe("Default: the task's board, else the master"),
        paths: z.array(z.string()).optional().describe("Files or folders (project-relative, or any readable path to copy in)"),
        kinds: z.array(z.enum(["docs", "tokens", "fonts", "logos", "images", "pages", "stack"])).optional().describe("Only these kinds from the scan"),
        url: z.string().optional().describe("Also screenshot this running page or local .html (desktop + phone)"),
        status: z.enum(ITEM_STATUS).optional().describe("Default current: what the project has today. Use inspiration for reference files from elsewhere."),
      },
    },
    safe(async ({ board: bid, paths, kinds, url, status }) => {
      const { board: b0, how } = resolveBoard({ id: bid, task: loadState().task });
      if (!b0) return text("No board to import into. board_project({ action: \"bootstrap\" }) creates the master board, or board_create.", true);
      const by = actor();
      const root = projectDir();
      const lines = [];
      const shots = [];
      const counts = { added: 0, updated: 0, duplicate: 0 };
      const add = (c) => Object.keys(counts).forEach((k) => (counts[k] += c[k]));
      if (paths?.length) {
        const entries = [];
        for (const p of paths) {
          const abs = path.resolve(root, p);
          let list = [p];
          try {
            if (fs.statSync(abs).isDirectory()) {
              const inv = scanRepo(abs);
              list = [...inv.logos, ...inv.images, ...inv.tokens, ...inv.css].map((x) => posix(path.relative(root, path.join(abs, x.rel)))).slice(0, 60);
              for (const d of inv.designDocs) list.push(posix(path.relative(root, path.join(abs, d.rel))));
            }
          } catch {
            /* the entry reports it */
          }
          for (const f of list) {
            const r = entryForFile(b0.id, f, { by, status: status || "current" });
            if (r.skip) lines.push(`skipped ${r.skip}`);
            else entries.push(r);
          }
        }
        add(applyEntries(b0.id, entries, { by, summary: `${entries.length} file(s)` }).counts);
      } else if (!url || kinds) {
        const inv = scanRepo(root);
        const r = importInventory(b0.id, inv, { by, kinds });
        add(r.counts);
        lines.push(describeInventory(inv));
      }
      if (url) {
        try {
          const s = await shootApp(b0.id, url, ctx.config(), by);
          add(applyEntries(b0.id, s.entries, { by, op: "screenshot", summary: url }).counts);
          shots.push(...s.shots);
          lines.push(`Screenshots of ${url} added.`);
        } catch (e) {
          lines.push(`Screenshots not taken: ${e.message}`);
        }
      }
      const after = loadBoard(b0.id);
      syncTask(after);
      const head = `${how === "master" ? `(Using the master board "${after.name}".) ` : ""}Imported into "${after.name}" (r${after.revision}): ${counts.added} added, ${counts.updated} refreshed, ${counts.duplicate} duplicate(s) not added.`;
      const body = [head, ...lines].join("\n");
      return shots.length ? blocks([textBlock(body), ...shots.map((b) => imageBlock(b))]) : text(body);
    }),
  );

  server.registerTool(
    "board_attach",
    {
      title: "Attach this task to a board and its approved direction",
      description:
        "Connect the active design task to the project's boards. Without arguments: use the task's board, else create a feature board under the master (it inherits the brand and never changes the master). board: \"master\" or an id attaches to that board (studies and notes then go there). " +
        "adopt: true counts the project's APPROVED direction as this task's direction, only if its review is on record (the critic passed it); it never passes the task's other gates. " +
        "carry: true counts validated, fresh, relevant studies from the master toward this task's reference gate (research only the gaps). mode: fidelity | redesign | fresh. " +
        'Examples: board_attach({ adopt: true, carry: true }) · board_attach({ board: "master" }) · board_attach({ mode: "redesign" })',
      inputSchema: {
        board: z.string().optional(),
        adopt: z.boolean().optional(),
        acceptUnreviewed: z.boolean().optional().describe("Only when the user accepts an approved direction that has no critic review on record"),
        carry: z.boolean().optional(),
        from: z.string().optional().describe("Board to carry studies from (default: the master)"),
        mode: z.enum(["fidelity", "redesign", "fresh"]).optional(),
      },
    },
    safe(async ({ board: bid, adopt, acceptUnreviewed, carry, from, mode }) => {
      const st0 = loadState();
      const task = st0.task;
      if (!task) return text("No Drip task is active. board_attach connects a task to the project's boards: drip_start first.", true);
      const config = ctx.config();
      const lines = [];
      if (mode || !task.memory) {
        updateState((st) => {
          st.task.memory = { ...(st.task.memory || buildTaskMemory({ taskText: st.task.title }) || { inherited: [], needed: [] }), ...(mode ? { mode } : {}) };
        });
      }
      // 1. which board
      let board;
      if (bid) {
        const r = resolveBoard({ id: bid, task });
        board = r.board;
      } else if (task.board?.id && loadBoard(task.board.id)) board = loadBoard(task.board.id);
      else {
        const m = masterId(task.memory?.brand);
        if (!m) return text("The project has no master board yet. board_project({ action: \"bootstrap\" }) or board_create.", true);
        board = createBoard(task.title.slice(0, 60), task.brief ? `${task.brief.what} — for ${task.brief.audience}` : task.title, { scope: "feature", parent: m, brand: task.memory?.brand || null });
        lines.push(`Created the feature board "${board.name}" (${board.id}) under the master: it inherits the brand and never changes it.`);
      }
      syncTask(board);
      lines.push(`Task attached to board "${board.name}" (${board.scope}, r${board.revision}).`);
      // 2. adopt the approved direction
      if (adopt) {
        const fresh = loadState().task;
        const r = adoptApproved({ task: fresh, acceptUnreviewed });
        if (!r.ok) lines.push(`Not adopted: ${r.why}`);
        else {
          const ap = r.ptr;
          updateBoard(board.id, (b) => {
            if (!b.directions.some((d) => d.name === ap.direction)) b.directions.push({ ...(ap.snapshot || { name: ap.direction, summary: "", adjectives: ["inherited", "approved"], palette: [], type: "" }), items: [], inherited: { from: ap.board, styleRevision: ap.revision } });
            b.chosen = ap.direction;
            b.chosenReason = `the project's approved direction (style ${ap.revision})`;
          }, { op: "adopt", summary: `adopted ${ap.direction} ${ap.revision}`, by: actor() });
          syncTask(loadBoard(board.id));
          updateState((st) => {
            if (!st.task) return;
            st.task.board = { ...st.task.board, adopted: { styleRevision: ap.revision, direction: ap.direction, at: new Date().toISOString(), unreviewed: !!r.unreviewed } };
            st.task.memory = { ...(st.task.memory || {}), styleRevision: ap.revision, approved: ap.direction, ...(st.task.memory?.inherited && !st.task.memory.inherited.includes("direction counted") ? { inherited: [...st.task.memory.inherited, "direction counted"] } : {}) };
          });
          lines.push(`Adopted the approved direction "${ap.direction}" (style ${ap.revision}) as this task's direction${r.unreviewed ? " (no critic review on record; accepted by the user)" : ""}. Rules that apply: project_context.`);
        }
      }
      // 3. carry validated studies
      if (carry) {
        const src = loadBoard(from === "master" || !from ? masterId(task.memory?.brand) : from);
        if (!src) lines.push("Nothing to carry: no source board.");
        else {
          const { carried, skipped } = carryStudies(loadState().task, src, config);
          if (carried.length)
            updateState((st) => {
              st.task.refs.studied = [...(st.task.refs.studied || []), ...carried];
            });
          lines.push(`Carried ${carried.length} study(ies) from "${src.name}" toward the reference gate (complete, fresh, same kind of surface)${skipped.length ? `; not carried: ${skipped.slice(0, 4).map((s) => `${s.key} (${s.why})`).join("; ")}` : ""}. They count as references; you still research what is new.`);
        }
      }
      const cur = loadState().task;
      const left = missingBeforeUi(cur, config);
      lines.push(left.length ? `Still needed before UI: ${left.map((m) => m.need).join(", ")}. (${left[0].need}: ${left[0].how})` : "Nothing left before UI.");
      return text(lines.join("\n"));
    }),
  );

  server.registerTool(
    "board_update",
    {
      title: "Change a board safely",
      description:
        "Patch, tidy or restructure a board with revision checks. expect = the revision you read; if someone else changed the board since, the update is rejected (nothing lost): board_read and apply again. " +
        "patch {name, brief}; items [{ key, status, note, archive, restore, remove }]; dedupe merges items with the same content hash. " +
        "Needs the user's yes (approved: true) and never deletes: archive (hides the board), fork {name, scope} (copy to explore from), reset (clears items and directions; the old content is saved to history/), master (make this the project master), " +
        "style { promote: <revision> } (a proposed redesign becomes the approved direction; the old one is kept), style { rollback: true } (back to the previous approved one), style { reject: <revision> }. " +
        'Examples: board_update({ expect: 7, items: [{ key: "file:public/logo.svg", status: "approved" }] }) · board_update({ style: { promote: "sr3" }, approved: true })',
      inputSchema: {
        board: z.string().optional(),
        expect: z.number().int().optional(),
        patch: z.object({ name: z.string().optional(), brief: z.string().optional() }).optional(),
        items: z.array(z.object({ key: z.string(), status: z.enum(ITEM_STATUS).optional(), note: z.string().optional(), title: z.string().optional(), archive: z.boolean().optional(), restore: z.boolean().optional(), remove: z.boolean().optional() })).optional(),
        dedupe: z.boolean().optional(),
        archive: z.boolean().optional(),
        reason: z.string().optional(),
        fork: z.object({ name: z.string().optional(), scope: z.enum(["feature", "concept"]).optional() }).optional(),
        reset: z.boolean().optional(),
        master: z.boolean().optional(),
        style: z.object({ promote: z.string().optional(), reject: z.string().optional(), rollback: z.boolean().optional() }).optional(),
        approved: z.boolean().optional().describe("true ONLY after the user said yes to archive, fork, reset, master or a style change"),
      },
    },
    safe(async (a) => {
      const { board } = resolveBoard({ id: a.board, task: loadState().task });
      if (!board) return text("No board. board_list shows them.", true);
      const by = actor();
      const done = [];
      try {
        if (a.style) {
          if (a.approved !== true) return text("Changing the project's approved style needs the user's yes first. Ask them, then call again with approved: true.", true);
          if (a.style.promote) {
            promoteRevision(a.style.promote, {});
            done.push(`Style revision ${a.style.promote} is now the approved direction; the previous one is kept (rollback restores it).`);
          }
          if (a.style.reject) {
            rejectRevision(a.style.reject, { reason: a.reason || "" });
            done.push(`Style revision ${a.style.reject} rejected (kept in the history).`);
          }
          if (a.style.rollback) {
            const r = rollbackRevision({});
            done.push(`Rolled back from ${r.from.id} to ${r.to.id}; ${r.from.id} stays in the history.`);
          }
          writeProjectSkill({});
          return text(done.join("\n"));
        }
        if (a.archive) {
          if (a.approved !== true) return text("Archiving a board needs the user's yes. Ask them, then call again with approved: true.", true);
          archiveBoard(board.id, { by, reason: a.reason || "" });
          return text(`Archived "${board.name}" (kept on disk; it no longer counts and is skipped when choosing the latest board).`);
        }
        if (a.fork) {
          const f = forkBoard(board.id, { ...a.fork, approved: a.approved, by });
          return text(`Forked "${board.name}" r${board.revision} into "${f.name}" (${f.id}, ${f.scope}). Explore there; the original is unchanged.`);
        }
        if (a.reset) {
          const r = resetBoard(board.id, { approved: a.approved, by });
          return text(`Reset "${board.name}": items and directions cleared. The previous content is saved at ${posix(path.relative(projectDir(), r.snapshot))}.`);
        }
        if (a.master) {
          if (a.approved !== true) return text("Changing the project master needs the user's yes. Ask them, then call again with approved: true.", true);
          setMaster(board.id, board.brand);
          return text(`"${board.name}" is now the project master board (the previous master stays as a feature board).`);
        }
        let merged = 0;
        const after = updateBoard(
          board.id,
          (b) => {
            if (a.patch?.name) b.name = a.patch.name;
            if (a.patch?.brief !== undefined) b.brief = a.patch.brief;
            for (const op of a.items || []) {
              const it = b.items.find((x) => x.key === op.key);
              if (!it) {
                done.push(`no item ${op.key}`);
                continue;
              }
              if (op.status) it.status = op.status;
              if (op.note) it.note = op.note;
              if (op.title) it.title = op.title;
              if (op.archive) it.status = "archived";
              if (op.restore) {
                it.status = it.status === "archived" ? "current" : it.status;
                it.removed = false;
              }
              if (op.remove) it.removed = true;
            }
            if (a.dedupe) merged = dedupeBoard(b);
          },
          { expect: a.expect, op: "patch", summary: [a.patch ? "patch" : "", a.items?.length ? `${a.items.length} item(s)` : "", a.dedupe ? "dedupe" : ""].filter(Boolean).join(", "), by },
        );
        syncTask(after);
        return text(`Updated "${after.name}" to r${after.revision}.${merged ? ` Merged ${merged} duplicate item(s).` : ""}${done.length ? ` (${done.join("; ")})` : ""}`);
      } catch (e) {
        if (e instanceof RevisionConflict) return text(`${e.message} Nothing was changed. board_read, then apply your change to the current board.`, true);
        throw e;
      }
    }),
  );

  server.registerTool(
    "board_history",
    {
      title: "What changed on a board, and what was decided",
      description: "The board's revision log (who changed what, when), its style revisions (approved, proposed redesigns, rolled back) and the decisions made on it. Read-only.",
      inputSchema: { board: z.string().optional(), limit: z.number().int().min(1).max(100).optional() },
    },
    safe(async ({ board: bid, limit = 25 }) => {
      const { board } = resolveBoard({ id: bid, task: loadState().task });
      if (!board) return text("No board.", true);
      const ev = boardHistory(board.id, limit);
      const d = loadDecisions();
      const L = [`Board "${board.name}" (${board.id}, ${board.scope}, r${board.revision}${board.status === "archived" ? ", archived" : ""}${board.parent ? `, under ${board.parent}` : ""}${board.forkedFrom ? `, forked from ${board.forkedFrom.id} r${board.forkedFrom.revision}` : ""}).`];
      L.push(...ev.map((e) => `r${e.rev} ${String(e.at).slice(0, 16)} ${e.op}${e.summary ? `: ${e.summary}` : ""}${e.by?.task ? ` (task ${e.by.task})` : ""}`));
      if (d.styleRevisions.length) L.push("", "Style revisions:", ...d.styleRevisions.map((r) => `- ${r.id} ${r.status}${r.id === d.activeRevision ? " (in force)" : ""}: ${r.label}${r.direction ? ` — "${r.direction.name}"` : ""}${r.previous ? ` (after ${r.previous})` : ""}`));
      const dec = d.rules.filter((r) => r.status === "approved" || r.status === "superseded").slice(-8);
      if (dec.length) L.push("", "Decisions:", ...dec.map((r) => `- ${r.status === "superseded" ? "(superseded) " : ""}${r.topic}: ${r.value}`));
      return text(L.join("\n"));
    }),
  );

  server.registerTool(
    "project_context",
    {
      title: "What this project already knows about its design",
      description:
        "The compact design memory of this project: the master board (what exists, by status), the approved direction, rules the user approved, what was rejected, sub-boards, DESIGN.md and the project skill, and anything waiting on the user. " +
        "drip_start loads it for design tasks; call it yourself before researching in a new session. Reading it never marks research, a direction review or a fit check as done. " +
        "detail: true also lists the rules and proposals in full. Example: project_context({}) · project_context({ detail: true })",
      inputSchema: { detail: z.boolean().optional(), brand: z.string().optional(), maxChars: z.number().int().min(300).max(8000).optional() },
    },
    safe(async ({ detail, brand, maxChars }) => {
      const task = loadState().task;
      const c = projectContext({ task, brand, maxChars: maxChars || (detail ? 4000 : undefined) });
      let extra = "";
      if (detail && c.hasMemory) {
        const d = loadDecisions();
        extra =
          `\n\nRules:\n${d.rules.map((r) => `- ${fmtRule(r)}`).join("\n") || "- none"}` +
          (d.exceptions.length ? `\nExceptions:\n${d.exceptions.map((e) => `- ${e.for}: rule ${e.rule} (${e.reason})`).join("\n")}` : "") +
          (d.rejected.length ? `\nRejected:\n${d.rejected.map((r) => `- ${r.what}${r.why ? ` (${String(r.why).slice(0, 80)})` : ""}`).join("\n")}` : "") +
          (d.styleRevisions.length ? `\nStyle revisions: ${d.styleRevisions.map((r) => `${r.id} ${r.status}`).join(", ")}` : "");
      }
      const mode = task?.memory?.mode;
      return text(`${c.text}${extra}${mode ? `\n\nThis task: ${mode} mode.` : ""}`);
    }),
  );

  server.registerTool(
    "feedback_record",
    {
      title: "Record what the user said about the design",
      description:
        "Save a piece of feedback, a correction, an approval or a rejection as local evidence (.drip/memory/feedback.jsonl) with its source, scope and the board/artifact revision it was about. " +
        "scope: page (this screen only), feature (this feature's board), brand (the whole project). source: user-explicit (their words), user-selection (they picked or starred), critic, agent-inference. " +
        "With a rule { topic, value, avoid } it becomes a decision: user-explicit brand feedback with no contradiction is approved at once; anything else is a proposal; page/feature feedback is scoped and never changes a brand rule; " +
        "a contradiction with an approved rule is NOT applied: you get the question to ask the user (replace with supersede: true, or make it an exception for one page). Latest explicit user instruction wins over learned defaults. " +
        "rejects lists what they turned down (stored so it is not proposed again). shots {before, after} link screenshots. " +
        'Example: feedback_record({ text: "less rounded, more editorial", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "sharp, 0-2px", avoid: ["rounded cards", "pill buttons"] }, rejects: ["12px rounded cards"] })',
      inputSchema: {
        text: z.string().describe("What they said, in their words"),
        scope: z.enum(["page", "feature", "brand"]).optional().describe("Default page: only the thing they were looking at"),
        source: z.enum(["user-explicit", "user-selection", "critic", "agent-inference"]).optional().describe("Default agent-inference"),
        kind: z.enum(["feedback", "correction", "approve", "reject", "accept"]).optional(),
        target: z.string().optional().describe("What it is about: a page path, item key, direction name"),
        rule: z.object({ topic: z.string(), value: z.string(), avoid: z.array(z.string()).optional() }).optional().describe("The rule it implies, as a measurable statement. Omit when unclear: the event is kept as evidence."),
        rejects: z.array(z.string()).optional(),
        shots: z.object({ before: z.string().optional(), after: z.string().optional() }).optional(),
        supersede: z.boolean().optional().describe("The user said to replace the contradicting approved rule"),
        board: z.string().optional(),
      },
    },
    safe(async (a) => {
      const r = recordFeedback(a);
      const L = [`Recorded ${r.event.id} (${r.event.scope}, ${r.event.source}${r.event.artifact.board ? `, board ${r.event.artifact.board} r${r.event.artifact.boardRevision}` : ""}).`];
      if (r.rule) L.push(`Rule ${r.rule.id}: ${r.rule.topic} = ${r.rule.value} → ${r.status.toUpperCase()}${r.rule.scope !== "brand" ? ` (${r.rule.scope} only: the brand is unchanged)` : ""}${r.rule.exceptionTo ? ` (an exception to ${r.rule.exceptionTo})` : ""}.`);
      if (r.question) L.push(`ASK THE USER: ${r.question}`);
      else if (r.status === "proposed" && r.rule) L.push("It is a proposal: not in force until the user approves it (project_learn).");
      else if (!r.rule) L.push("No rule was stated, so this stays evidence. State one (topic, value, avoid) when the user's intent is clear.");
      if (r.status === "approved" && r.rule?.scope === "brand") {
        try {
          writeProjectSkill({});
          L.push("Project skill updated.");
        } catch {
          /* later */
        }
      }
      return text(L.join("\n"));
    }),
  );

  server.registerTool(
    "project_learn",
    {
      title: "Review, approve or reject what the project has learned",
      description:
        "action list (default): rules (approved, proposed, contradicting), exceptions, rejected items and recent feedback. approve / reject: decide a proposed rule by id AFTER the user said so (approving over a contradiction needs supersede: true). " +
        "exception: let one page or feature differ from a rule (rule, for, reason). Nothing is deleted: superseded and rejected rules stay in decisions.json. " +
        'Examples: project_learn({}) · project_learn({ action: "approve", id: "rule_xyz" }) · project_learn({ action: "exception", id: "rule_xyz", for: "page:/pricing", reason: "user wants rounded cards here" })',
      inputSchema: {
        action: z.enum(["list", "approve", "reject", "exception"]).optional(),
        id: z.string().optional(),
        supersede: z.boolean().optional(),
        reason: z.string().optional(),
        for: z.string().optional(),
        events: z.number().int().min(0).max(30).optional().describe("How many recent feedback events to list (default 6)"),
      },
    },
    safe(async ({ action = "list", id, supersede, reason, for: forTarget, events = 6 }) => {
      if (action === "approve" || action === "reject") {
        if (!id) return text("Pass the rule id (project_learn lists them).", true);
        const r = decideRule(id, action, { supersede, reason });
        if (action === "approve") {
          try {
            writeProjectSkill({});
          } catch {
            /* later */
          }
        }
        return text(`Rule ${r.id} is now ${r.status}: ${r.topic} = ${r.value}.${r.supersedes?.length ? ` It replaced ${r.supersedes.join(", ")} (kept in the history).` : ""}`);
      }
      if (action === "exception") {
        if (!id || !forTarget) return text("Pass the rule id and what it applies to (for: \"page:/pricing\").", true);
        const e = addException({ rule: id, forTarget, reason: reason || "" });
        return text(`Exception ${e.id}: rule ${id} does not apply to ${forTarget}${reason ? ` (${reason})` : ""}. The brand rule is unchanged.`);
      }
      const d = loadDecisions();
      const fb = readFeedback().slice(-events);
      const L = [];
      const by = (s) => d.rules.filter((r) => r.status === s);
      L.push(`Approved (${by("approved").length}):`, ...by("approved").map((r) => `- ${fmtRule(r)}`));
      L.push(`Proposed (${by("proposed").length}):`, ...by("proposed").map((r) => `- ${fmtRule(r)}`));
      if (d.exceptions.length) L.push("Exceptions:", ...d.exceptions.map((e) => `- ${e.id} ${e.for}: rule ${e.rule} (${e.reason})`));
      if (d.rejected.length) L.push("Rejected:", ...d.rejected.slice(-8).map((x) => `- ${x.what}${x.why ? ` (${String(x.why).slice(0, 80)})` : ""}`));
      if (fb.length) L.push("Recent feedback:", ...fb.map((e) => `- ${e.at.slice(0, 16)} ${e.source} ${e.scope} ${e.kind}: ${e.text.slice(0, 100)} → ${e.status}`));
      return text(L.join("\n"));
    }),
  );

  server.registerTool(
    "style_extract",
    {
      title: "Measure the project's real visual language",
      description:
        "Extract the real tokens: from CSS / SCSS / token JSON / Tailwind config files (the declared custom properties and values) AND from rendered pages (what the browser computed): colours with roles, type scale, spacing steps, radii, shadows, motion timings and easing, grid. " +
        "No files and no url: measures the repo's token and CSS files. Saved to .drip/memory/style.json with its sources and used by the project skill (style_update). Numbers, not mood words. " +
        'Examples: style_extract({}) · style_extract({ url: "http://localhost:3000" }) · style_extract({ files: ["src/styles/tokens.css"], url: "index.html" })',
      inputSchema: {
        files: z.array(z.string()).optional().describe("Style or token files (project-relative)"),
        url: z.string().optional().describe("A running page, or a local .html file/folder"),
        phone: z.boolean().optional().describe("Also measure at 375px (default true when url is given)"),
        save: z.boolean().optional().describe("Default true"),
      },
    },
    safe(async ({ files, url, phone, save = true }) => {
      const root = projectDir();
      const sources = [];
      let rels = files;
      if (!rels?.length && !url) {
        const inv = scanRepo(root);
        rels = [...inv.tokens.slice(0, 6).map((t) => t.rel), ...inv.css.slice(0, 10).map((c) => c.rel)];
      }
      if (rels?.length) sources.push(...measureFiles(rels, root));
      if (url) {
        const target = await toUrl(url);
        for (const width of phone === false ? [1440] : [1440, 375]) {
          const t = await measurePage(target, { width, config: ctx.config() });
          sources.push({ kind: "page", ref: `${url}@${width}`, width, tokens: t });
        }
      }
      if (!sources.length) return text("Nothing to measure: no token or CSS files found. Pass files or a url.", true);
      const saved = save ? saveStyle(sources, undefined) : null;
      const view = saved ? saved.tokens : sources[0].tokens;
      if (save) {
        try {
          writeProjectSkill({});
        } catch {
          /* later */
        }
      }
      return text(`Measured ${sources.length} source(s): ${sources.map((s) => s.ref).join(", ")}${save ? " (saved to .drip/memory/style.json)" : ""}.\n${describeTokens(view)}\nNEXT: style_update puts this into the project skill; compare a new page's numbers against it.`);
    }),
  );

  server.registerTool(
    "style_update",
    {
      title: "Update the project skill and style pack from what was approved",
      description:
        "Regenerate the marked block of .drip/skills/project-design/SKILL.md (Agent Skills format) from the approved direction, approved rules, rejected items, measured tokens, the master board and a DESIGN.md pointer. Text outside the markers and DESIGN.md are never touched; the previous version is kept. " +
        "pack: true also keeps a project style pack (.drip/packs/project-style: guide.md and critic.md generated the same way, files you edited by hand are left alone). undo: true restores the previous skill version. dryRun previews. " +
        "Example: style_update({}) · style_update({ undo: true })",
      inputSchema: { dryRun: z.boolean().optional(), undo: z.boolean().optional(), pack: z.boolean().optional().describe("Also update the project style pack (default true)") },
    },
    safe(async ({ dryRun, undo, pack = true }) => {
      if (undo) {
        const r = undoProjectSkill({});
        return text(`Restored the previous project skill (${r.restored}). The version you replaced is in .drip/skills/project-design/.history.`);
      }
      const r = writeProjectSkill({ dryRun });
      const L = [dryRun ? `Preview of the project skill block:\n${r.preview}` : r.changed ? `Project skill updated (v${r.version}): ${path.relative(projectDir(), r.file)}. Previous version kept in .history.` : "Project skill already matches the approved decisions."];
      if (pack && !dryRun) L.push(...syncProjectPack());
      return text(L.join("\n"));
    }),
  );

  /** The project style pack: guide.md and critic.md carry a generated marker; a file without it is hand-written and stays. */
  function syncProjectPack() {
    const id = "project-style";
    const marker = "<!-- drip:generated -->";
    const out = [];
    const skill = skillBody();
    if (!packDir(id)) {
      createPack({ id, name: `${path.basename(projectDir())} style`, niche: "this project's own design language", keywords: [], summary: "Generated from the project's approved decisions and measured tokens.", type: "project" });
      out.push(`Created the project style pack "${id}".`);
    } else {
      const meta = listPacks().find((p) => p.id === id);
      if (meta && meta.type !== "project") return [`Pack "${id}" exists and is not a project pack; left alone.`];
    }
    for (const [file, body] of [["guide.md", `${marker}\n# ${path.basename(projectDir())} design language\n\n${skill}\n`], ["critic.md", `${marker}\n# Judge against this project\n\n${criticRubric()}\n`]]) {
      const cur = readPackFile(id, file);
      if (cur && !cur.includes(marker)) {
        out.push(`${file}: hand-written, left alone.`);
        continue;
      }
      if (cur !== body) {
        writePackFile(id, file, body);
        out.push(`${file}: updated.`);
      }
    }
    return out;
  }

  function criticRubric() {
    const d = loadDecisions();
    const idx = loadIndex();
    const rules = d.rules.filter((r) => r.status === "approved");
    const ap = idx.approved.default;
    return [
      ap ? `The client approved the direction "${ap.direction}" (style ${ap.revision}). Work that does not carry it is off-direction.` : "No direction is approved yet: judge distinctiveness and fit to the brief.",
      ...(rules.length ? ["Rules the user approved (a break of one is a finding, and a suggestion that breaks one is [OFF-DIRECTION]):", ...rules.map((r) => `- ${r.topic}: ${r.value}${r.avoid?.length ? ` · refuses: ${r.avoid.join("; ")}` : ""}`)] : []),
      ...(d.rejected.length ? ["Rejected before (flag any return of these):", ...d.rejected.slice(-8).map((x) => `- ${x.what}`)] : []),
    ].join("\n");
  }

  server.registerTool(
    "style_export",
    {
      title: "Export the project's style as a shareable pack",
      description:
        "Write a self-contained folder another repository can import with style_import: manifest with a hash per file, the guide, approved rules (no personal feedback), measured tokens, the master board with copies of the project's own logos, tokens, fonts and screenshots (references from other sites stay metadata only), and approved patterns' specs. " +
        "Relative paths throughout; secret-looking files are left out and listed. The project is not changed. Only run it when the user wants to share the style. Example: style_export({ out: \"exports/acme-style\" })",
      inputSchema: { out: z.string().optional().describe("Folder (default .drip/exports/style-pack-<project>)"), name: z.string().optional(), board: z.string().optional(), patterns: z.boolean().optional() },
    },
    safe(async ({ out, name, board, patterns }) => {
      const r = exportStylePack({ out, name, board, includePatterns: patterns !== false });
      const kinds = {};
      for (const f of r.manifest.files) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
      return text(
        `Exported "${r.manifest.name}" to ${r.out}\n${r.manifest.files.length} files (${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(", ")}); approved direction: ${r.manifest.approvedDirection || "none"}; fonts: ${r.manifest.fonts.map((f) => f.family).join(", ") || "none"}.` +
          (r.skipped.length ? `\nLeft out: ${r.skipped.slice(0, 8).map((s) => `${s.path} (${s.why})`).join("; ")}.` : "") +
          "\nIncluded only project-owned material; personal feedback and secrets are never exported. Import in another repo: style_import({ from: <folder> }).",
      );
    }),
  );

  server.registerTool(
    "style_import",
    {
      title: "Import a style pack into this project",
      description:
        "Read a folder made by style_export: verify every file's hash, copy its assets into .drip/imports/<name>/ (never overwriting, never leaving the folder), and create an editable board from it. " +
        "A project with no design identity yet gets it as its master board with the pack's approved direction and rules in force; a project that already has one gets a concept board and the pack's rules as proposals the user reviews. Private feedback is never part of a pack. Example: style_import({ from: \"../acme/exports/acme-style\" })",
      inputSchema: { from: z.string().describe("The style pack folder"), name: z.string().optional() },
    },
    safe(async ({ from, name }) => {
      const r = importStylePack({ from, name });
      return text(
        `Imported "${r.packName}": ${r.copied} files into ${r.relDest}/, board "${r.board.name}" (${r.board.id}, ${r.board.scope}, ${r.board.items.length} items), ${r.rules} rule(s) ${r.asMaster ? "in force" : "as proposals (project_learn to review)"}.` +
          (r.approved ? ` Approved direction: ${r.approved.kind === "approved" ? "yes" : r.approved.kind}.` : "") +
          (r.skipped.length ? `\nNot imported: ${r.skipped.slice(0, 6).map((s) => `${s.path} (${s.why})`).join("; ")}.` : "") +
          `\n${r.asMaster ? "This is now the project's design memory: project_context shows it." : "The project's own approved direction is unchanged."} Build new pages with the same language and new content; the usual gates still apply.`,
      );
    }),
  );
}

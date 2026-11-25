// Moodboard tools: create, add (with a reason), group into directions, open/share, read feedback, choose.
// Boards are the project's durable design memory (see docs/PROJECT_MEMORY.md and modules/project for the
// project-level tools). Every change goes through updateBoard, so two sessions never overwrite each other.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock, textBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { lookup, resolve, siteKey } from "../../core/seen.mjs";
import { actor, lastCritique, loadState, missingBeforeUi, updateState } from "../../core/state.mjs";
import { renderHtml, renderUrl } from "../../core/render.mjs";
import { projectDir } from "../../core/paths.mjs";
import { pathToFileURL } from "node:url";
import { readGuide } from "../../core/guides.mjs";
import { approveDirection, recordFeedback, writeProjectSkill } from "../../core/memory.mjs";
import { colourDistance, facesOf, isOverused, recentLooks, recordLook, sameFace, samePalette } from "../../core/looks.mjs";
import { COMP, tileHtml } from "./tile.mjs";
import { screenshot } from "../fitcheck/chrome.mjs";
import { typeIssues } from "../../core/cdp.mjs";
import { toUrl } from "../../core/serve.mjs";
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
  // The director ranks directions; a critic verdict only counts when one was asked for, and only on the current set.
  if (!rec || (board.directionsAt && rec.at < board.directionsAt)) return null;
  if (rec.verdict === "reject")
    return `The critic rejected this set ("${rec.summary}"). Rework the weak directions (or replace them with bolder ones), board_directions again, re-render tiles and get a new ranking.`;
  // Never show the user a direction the critic scored as weak: rework it or replace it first.
  const scored = (rec.perDirection || []).filter((p) => typeof p.score === "number");
  const strong = scored.filter((p) => p.score >= (config.gates.minDirectionScore ?? 6));
  if (scored.length && strong.length < 2)
    return `Not ready to show: only ${strong.length} direction${strong.length === 1 ? "" : "s"} scored ${config.gates.minDirectionScore ?? 6}/10 or more (${scored.map((p) => `"${p.name}" ${p.score}`).join(", ")}). The user chooses between two strong ideas: rework or replace the weak ones, board_directions again, and get a new ranking.`;
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

/**
 * New directions must not quietly repeat what Drip made for OTHER projects (same faces, same ground + accent), must not
 * share a display face with each other, and overused faces need a subject reason. Repeats inside one project are its
 * brand and are fine. Returns an error message or null.
 */
export function freshLooksGate(directions, task, config) {
  if (!task || task.skipped || !config.gates.enforce || config.gates.freshLooks === false || task.size !== "full") return null;
  const problems = [];
  if (!task.fonts?.searched)
    problems.push("No font research yet: fonts_search (by category or a word from the subject), fonts_pair with the direction's mood, or fonts_compare on 3-4 candidates with the real headline. Pick faces from what you find, not from memory.");
  const displays = directions.map((d) => facesOf(d.type)[0]).filter(Boolean);
  for (let i = 0; i < displays.length; i++) for (let j = i + 1; j < displays.length; j++) if (sameFace(displays[i], displays[j])) problems.push(`"${directions[i].name}" and "${directions[j].name}" share the display face ${displays[i]}: directions must differ in voice, not only in colour.`);
  const here = projectDir();
  // Another project, or another task in this folder that is not this brand (several products share one folder), counts as a repeat.
  const brand = !!task.memory?.styleRevision;
  const others = recentLooks(8).filter((l) => l.project !== here || (!brand && l.task && l.task !== task.id));
  // Only the display face is a voice; text faces repeat across good pages all the time. And only the last few looks.
  const lately = others.slice(0, 3);
  for (const d of directions) {
    const faces = facesOf(d.type).slice(0, 1);
    for (const f of faces) {
      const hit = lately.find((l) => (l.faces || [])[0] && sameFace(l.faces[0], f));
      if (hit) problems.push(`"${d.name}": ${f} was the face of "${hit.direction}" in another project (${hit.at.slice(0, 10)}). Drip just used it: find a different one with fonts_search / fonts_compare.`);
      else if (isOverused(f) && (d.typeReason || "").trim().length < 25)
        problems.push(`"${d.name}": ${f} is what every agent reaches for once Inter is banned. Keep it only with typeReason saying why it fits THIS subject (25+ characters), or find another with fonts_search.`);
    }
    const twin = lately.find((l) => samePalette(d.palette, l.palette));
    if (twin) problems.push(`"${d.name}": ground ${d.palette[0]} + accent ${d.palette[2] || "?"} is the palette of "${twin.direction}" in another project. Take the colours from this subject's world instead.`);
  }
  return problems.length ? `Directions not saved. They repeat Drip's defaults:\n- ${problems.join("\n- ")}` : null;
}

/** Each direction builds on what was studied: at least one style reference and one of the same kind of page or a competitor. */
export function groundingGate(directions, task, live, config) {
  if (!task || task.skipped || !config.gates.enforce || task.size !== "full") return null;
  const studied = task.refs?.studied || [];
  if (!studied.some((x) => x.role)) return null; // older tasks without roles
  const roleOf = new Map(studied.map((x) => [x.key, x.role]));
  const keyOf = (r) => {
    const v = String(r).trim();
    if (/^\d+$/.test(v) && live[+v - 1]) return live[+v - 1].key;
    if (/^https?:\/\//i.test(v)) return siteKey(v);
    try {
      return resolve(v);
    } catch {
      return v;
    }
  };
  const problems = [];
  for (const d of directions) {
    const roles = new Set(d.items.map(keyOf).map((k) => roleOf.get(k)).filter(Boolean));
    if (!roles.has("style") || !(roles.has("page") || roles.has("competitor")))
      problems.push(`"${d.name}" needs at least one studied style reference and one studied page or competitor reference in its items (it has: ${[...roles].join(", ") || "none"})`);
  }
  return problems.length ? `Directions not saved: each one builds on what you studied.\n- ${problems.join("\n- ")}\nUse the board numbers of studied references (board_read lists them).` : null;
}

export const PLAN_FORMS = ["hero", "split", "full-bleed", "bento", "gallery", "sticky-demo", "interactive", "statement", "visualisation", "grid", "table", "timeline", "quotes", "footer", "other"];
export const PICTURE_SOURCES = ["images_search", "art_generate", "shader_hero", "mockup_render", "scene_render", "components_find", "code-visual", "product-ui", "user-files", "none"];

/**
 * The section plan: every section borrows a move from a studied reference, names where its picture comes from, and the
 * page varies its forms. This is what stops sections 2-8 coming from habit (one text-beside-picture split, repeated).
 * Returns every problem at once, or [] when the plan holds.
 */
export function planGate(sections, task, live = []) {
  const problems = [];
  const studied = task?.refs?.studied || [];
  const keys = new Set(studied.map((x) => x.key));
  const keyOf = (r) => {
    const v = String(r).trim();
    if (/^\d+$/.test(v) && live[+v - 1]) return live[+v - 1].key;
    if (/^https?:\/\//i.test(v)) return siteKey(v);
    try {
      return resolve(v);
    } catch {
      return v;
    }
  };
  const used = new Set();
  if (keys.size) {
    for (const s of sections) {
      const k = keyOf(s.takes.ref);
      if (!keys.has(k)) problems.push(`"${s.id}" takes from "${s.takes.ref}", which you haven't studied. Use a studied reference (its board number, URL or key), or study it first (refs_site / refs_study)`);
      else used.add(k);
    }
    const want = Math.min(3, keys.size);
    if (used.size && used.size < want) problems.push(`the plan borrows from ${used.size} reference(s); take from at least ${want} different ones, so the page is not one reference re-skinned`);
  }
  const body = sections.filter((s) => s.form !== "hero" && s.form !== "footer");
  const counts = {};
  for (const s of body) counts[s.form] = (counts[s.form] || 0) + 1;
  const cap = Math.max(2, Math.ceil(body.length / 3));
  for (const [f, n] of Object.entries(counts)) {
    const max = f === "split" ? 2 : cap;
    if (n > max) problems.push(`${n} sections are "${f}" (max ${max}): a repeated form is a template. Give some of them another form from the references (bento, full-bleed, gallery, sticky demo, statement, visualisation, interactive)`);
  }
  for (let i = 1; i < sections.length; i++)
    if (sections[i].form === sections[i - 1].form && sections[i].form !== "other") problems.push(`"${sections[i - 1].id}" and "${sections[i].id}" are both "${sections[i].form}" side by side: neighbours need different forms`);
  if (body.length >= 4 && Object.keys(counts).length < 3) problems.push(`only ${Object.keys(counts).length} form(s) across ${body.length} sections; use at least 3`);
  const none = sections.filter((s) => s.picture.source === "none");
  if (none.length > 2) problems.push(`${none.length} sections have no picture (${none.map((s) => `"${s.id}"`).join(", ")}); at most 2, and only a statement, table or timeline goes without one`);
  for (const s of none) if (!["statement", "table", "timeline", "quotes", "footer"].includes(s.form)) problems.push(`"${s.id}" (${s.form}) has no picture: name its source, or make it a statement, table or timeline`);
  const candy = sections.filter((s) => s.candy);
  if (candy.length < 2) problems.push(`${candy.length} eye-candy moment(s); mark two or three sections people will screenshot (candy: true): a fan of real cards, a glowing product mockup, a visualisation built from real data, a bento of live product UI, an interactive demo, a big footer`);
  const still = sections.filter((s) => (s.form === "hero" || s.candy) && !(s.motion && s.motion.trim().length >= 8));
  if (still.length) problems.push(`no motion planned for ${still.map((s) => `"${s.id}"`).join(", ")}: the hero and every eye-candy moment say how they move or respond (an entrance that fans the cards in, the light rising behind the mockup, a hover that lifts a card, a live demo, a scroll reveal), with a reason`);
  if (!sections.some((s) => s.form === "footer" || /footer/i.test(s.id))) problems.push("no footer in the plan: plan it as a section (wordmark, sitemap, a last call to action), not an afterthought");
  return problems;
}

/** Several pages, an app surface, or many components: worth a living design-system page. */
function bigProject() {
  const task = loadState().task;
  if (["app", "mobile"].includes(task?.surface)) return true;
  if ((task?.components?.count || 0) >= 20) return true;
  try {
    const root = projectDir();
    const pages = fs.readdirSync(root).filter((f) => /\.html?$/i.test(f)).length;
    return pages >= 3 || ["app", "pages", path.join("src", "pages")].some((d) => fs.existsSync(path.join(root, d)));
  } catch {
    return false;
  }
}

/** A fresh redesign must not quietly keep the old site's faces or colours (task.before.brand, from refs_site before: true). */
export function oldLookGate(directions, task) {
  if (task?.brief?.redesign !== "fresh" || !task.before?.brand) return null;
  const b = task.before.brand;
  const hexes = [...(b.backgrounds || []), ...(b.textColors || [])].map((x) => (Array.isArray(x) ? x[0] : typeof x === "object" ? x?.hex || x?.color : x)).filter((x) => typeof x === "string" && x.startsWith("#"));
  const oldFaces = (b.fonts || []).map(String);
  const problems = [];
  for (const d of directions) {
    const keptFace = facesOf(d.type).find((f) => oldFaces.some((o) => sameFace(o, f)));
    if (keptFace) problems.push(`"${d.name}" keeps the old site's face ${keptFace}`);
    const ground = d.palette[0];
    const accent = d.palette[2];
    const near = (c) => c && hexes.some((h) => colourDistance(h, c) < 45);
    if (near(ground) && near(accent)) problems.push(`"${d.name}" keeps the old site's ground ${ground} and accent ${accent}`);
  }
  return problems.length ? `The user asked for a completely fresh look, so the old site's look is out (keep only the logo and the real product material):\n- ${problems.join("\n- ")}` : null;
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
    // Read each comp as its designer would before anyone else sees it: fake bolds, missing fonts, letters or lines that
    // touch. Measured problems block the critic until they're fixed.
    const checks = await Promise.all(
      board0.directions.map(async (d) => {
        const own = custom.find((c) => c.direction.toLowerCase() === d.name.toLowerCase());
        const target = own?.file ? path.resolve(projectDir(), own.file) : path.join(dir, `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`);
        if (!own?.file)
          fs.writeFileSync(target, own ? own.html : tileHtml(d, { brand: copy.brand || board0.name, headline: copy.headline || d.headline || d.summary, body: copy.body || d.adjectives.join(" · "), cta: copy.cta || "See the work" }));
        return typeIssues(await toUrl(target), { width: COMP.width, height: 900, config: ctx.config() }).catch(() => []);
      }),
    );
    const tiles = new Map();
    let broken = 0;
    for (const [k, d] of board0.directions.entries()) {
      const { png, file } = pngs[k];
      tiles.set(d.name, { file, typeIssues: checks[k] });
      if (checks[k].length) broken++;
      files.push(file);
      content.push(
        textBlock(`Comp: ${d.name} — ${d.adjectives.join(", ")} · ${d.type}${checks[k].length ? `\nMEASURED PROBLEMS (fix before the critic):\n- ${checks[k].map((t) => `"${t.text}": ${t.detail}`).join("\n- ")}` : ""}`),
        imageBlock(png),
      );
    }
    content.push(
      textBlock(
        `${broken ? `${broken} comp(s) have unreadable type: fix them and board_tile again; the critic won't review this set until they're clean.\n` : ""}` +
          "YOUR OWN PASS FIRST, as the comp's designer: can you read every word at a glance? Does each face look like itself (not smeared, not a fallback)? Is anything cut off by an edge that shouldn't be? Is the picture the real thing? Fix what you find, then the critic.",
      ),
    );
    const board = updateBoard(
      board0.id,
      (b) => {
        for (const d of b.directions) if (tiles.has(d.name)) Object.assign(d, { tile: tiles.get(d.name).file, typeIssues: tiles.get(d.name).typeIssues });
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
        "Deal 3 directions that are different IDEAS, not one idea in different colours: each a different answer to the brief (what the page is about, how the first screen works), with the references it builds on, its palette in role order (ground, ink, accent, support), two faces, and the hero it implies. At least one must break something structural (the page's form, the medium: a scene, a product in its real context, 3D; or, in a redesign, the current brand), not only light vs dark. The critic ranks them; the weak ones are dropped and the user sees the best two. Before writing them, Read the gold page closest to this one (drip_guide examples/gold) and say what your best direction takes from its decisions. " +
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
              type: z.string().describe("Display face + text face, '<display> + <text>', found with fonts_search / fonts_compare for THIS subject. Never mono as a voice"),
              typeReason: z.string().optional().describe("Why these faces fit this subject (required for overused faces such as Fraunces, Instrument Serif, Bricolage Grotesque, Syne, Satoshi)"),
              pattern: z
                .enum(["product-mockup-glow", "card-fan", "bento-live-ui", "render-on-dark", "character-scene", "photo-full-bleed", "other"])
                .optional()
                .describe("The proven hero pattern it builds on (drip_guide examples/gold): product-mockup-glow (the real UI rising out of a soft light), card-fan (real outputs on tilted cards around a calm headline), bento-live-ui, render-on-dark (one product render lit on dark), character-scene (a mascot in a framed scene), photo-full-bleed. 'other' only on a bold brief"),
              idea: z.string().min(12).describe("The idea in one line, as different from the other directions' ideas as possible: 'the product as a technical drawing being annotated live', 'a lab notebook: the research pages are the page', 'a toy catalogue: the walker in play at full bleed'"),
              refuses: z.string().optional().describe("What this direction refuses that another one keeps"),
              takes: z
                .array(z.object({ ref: z.string().describe("A studied reference: its board number, listing number (L3-7) or site URL"), what: z.string().min(12).describe("The decision you take: a composition, a section idea, an interaction, a type move. Never only its colours") }))
                .min(2)
                .describe("What this direction takes from which studied references (at least one style, and one page or competitor). The comp must visibly show each"),
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
      // Every reason at once, not one per attempt.
      const st0 = loadState().task;
      const refusals = [];
      // References come first: a comp written before they're studied ignores them, and a search afterwards only passes a gate.
      if (st0 && st0.size === "full" && !st0.skipped && ctx.config().gates.enforce) {
        const refsLeft = missingBeforeUi(st0, ctx.config()).filter((m) => /references|real examples/.test(m.need));
        if (refsLeft.length) refusals.push(`Study the references before the directions: ${refsLeft.map((m) => m.how).join(" · ")}. Directions are built from what you studied, not justified by it afterwards.`);
      }
      const fresh = freshLooksGate(directions, st0, ctx.config());
      if (fresh) refusals.push(fresh);
      const grounding = groundingGate(directions.map((d) => ({ ...d, items: [...d.items, ...(d.takes || []).map((t) => t.ref)] })), st0, live, ctx.config());
      if (grounding) refusals.push(grounding);
      // Polished briefs build on the patterns that make heroes people save; an abstract idea with nothing real to look at is the failure mode.
      if (st0?.brief?.ambition !== "bold" && directions.filter((d) => d.pattern && d.pattern !== "other").length < Math.min(2, directions.length))
        refusals.push(`At least ${Math.min(2, directions.length)} directions build on a proven hero pattern (pattern: product-mockup-glow, card-fan, bento-live-ui, render-on-dark, character-scene, photo-full-bleed; see drip_guide examples/gold). Abstract heroes (contour lines, a dotted route, a big word alone) read as art pieces, not products: the brief is polished.`);
      const stale = oldLookGate(directions, st0);
      if (stale) refusals.push(stale);
      if (refusals.length) return text(refusals.join("\n\n"), true);
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
        try {
          recordLook({ direction: d.name, type: d.type, palette: d.palette, task: task?.id, board: b0.id });
        } catch {
          /* the history is a nudge, never a reason to fail the choice */
        }
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
            : "NEXT: the DESIGN SYSTEM, now that the direction is approved. drip_kit (tokens), fill in the faces (fonts_compare with the real headline) and colour roles (palette_check), write DESIGN.md, drip_mark system. " +
              (bigProject()
                ? 'This project is big (several pages, an app, or many components): also drip_kit({ template: "system" }) and fill the living system page (type roles, colours, spacing, buttons, inputs, cards, the signature components) so every later page builds from it. '
                : 'When the project grows past one page, offer the user a living system page (drip_kit template "system"). ') +
              "Then board_plan the page by what matters (what will the user be excited to see?): each section's form, the move it takes from a studied reference, its picture source, two or three eye-candy moments; get the parts (components_find, the picture tools); build the hero FIRST (fitcheck_shot hero: true). The build half of the playbook:\n\n" +
              buildHalf),
      );
    }),
  );

  server.registerTool(
    "board_plan",
    {
      title: "Plan the page's sections",
      description:
        "After the direction and the system, before the hero: one line per section, hero and footer included. Each section names its one idea, its form, " +
        "the move it TAKES from a studied reference (a composition, a section idea, an interaction; never only colours), where its picture comes from, whether it is an eye-candy moment, and how it moves (required for the hero and eye-candy sections). " +
        "Refused, with every reason at once, when a reference wasn't studied, the plan leans on fewer than 3 references, forms repeat (max 2 splits, no two neighbours alike, 3+ forms), more than 2 sections have no picture, there are fewer than 2 eye-candy moments, or there is no footer. UI writes wait for it.",
      inputSchema: {
        page: z.string().optional().describe("Which page, e.g. 'landing'"),
        sections: z
          .array(
            z.object({
              id: z.string().min(1),
              idea: z.string().min(8).describe("The one thing this section says or shows, and why the user cares"),
              form: z.enum(PLAN_FORMS),
              takes: z.object({ ref: z.string().describe("A studied reference: board number, URL or key"), what: z.string().min(8).describe("The move borrowed, e.g. 'the sticky product demo that changes with each step'") }),
              picture: z.object({ source: z.enum(PICTURE_SOURCES), what: z.string().optional().describe("What it shows, e.g. 'the real thumbnail wall', 'chart of renders per day'") }),
              candy: z.boolean().optional().describe("An eye-candy moment people will screenshot"),
              motion: z.string().optional().describe("How it moves or responds, and why: 'the cards fan in on load, lift on hover', 'the glow rises behind the mockup', 'the chart draws as it scrolls in'. Required for the hero and eye-candy sections"),
            }),
          )
          .min(4)
          .max(14),
        board: z.string().optional(),
      },
    },
    safe(async ({ page, sections, board: bid }) => {
      let live = [];
      try {
        live = liveItems(pick(bid).board);
      } catch {
        /* no board: references resolve by URL or key */
      }
      const task = loadState().task;
      if (!task) return text("No Drip task is active. Call drip_start first.", true);
      const problems = planGate(sections, task, live);
      if (problems.length) return text(`Plan not saved:\n- ${problems.join("\n- ")}`, true);
      updateState((s) => {
        if (s.task) s.task.plan = { page: page || "page", at: new Date().toISOString(), sections };
      });
      const lines = sections.map((s, i) => `${i + 1}. ${s.id} [${s.form}${s.candy ? ", eye candy" : ""}]: ${s.idea} · takes ${s.takes.what} (from ${s.takes.ref}) · picture: ${s.picture.source}${s.picture.what ? ` (${s.picture.what})` : ""}${s.motion ? ` · motion: ${s.motion}` : ""}`);
      return text(`Plan saved (${sections.length} sections).\n${lines.join("\n")}\n\nNEXT: get the parts (components_find for the interactive and eye-candy pieces, the picture sources above), then build the hero FIRST and fitcheck_shot({ hero: true }). Build each section to its line; the page gate blocks repeated layouts.`);
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

// Per-project task state in <project>/.drip/state.json, and the gates computed from it.
// The MCP writes it as Claude works; the hooks read it to decide what to allow.
// No dependencies: hooks import this file directly.
import fs from "node:fs";
import path from "node:path";
import { ensureProjectDrip, projectDripDir } from "./paths.mjs";
import { loadConfig } from "./config.mjs";
import { artifactRev, refreshSnapshot, workspaceDiff } from "./evidence.mjs";

// Several Claude sessions can work in one folder at once, so the file holds one task PER SESSION:
// { version: 2, tasks: { <id>: task }, sessions: { <session id>: <task id> }, history: [] }.
// A session only ever sees and changes its own task. loadState() still returns { task, history }.
const EMPTY = () => ({ version: 2, tasks: {}, sessions: {}, history: [] });

// Who is asking. The MCP server (one per session) remembers its task in memory and knows its session
// from CLAUDE_CODE_SESSION_ID; hooks pass the session_id Claude Code gives them (setIdentity).
const me = { session: process.env.CLAUDE_CODE_SESSION_ID || null, server: false, taskId: null };
export function setIdentity({ session, server } = {}) {
  if (session) me.session = session;
  else if (session === null) me.session = null; // explicit: no session (tests run inside a Claude session inherit its id)
  if (server !== undefined) me.server = server;
}

/** Who is acting, for provenance on boards, feedback and decisions: this session's task id and session id. */
export function actor(cwd) {
  let task = null;
  try {
    task = loadState(cwd).task?.id || null;
  } catch {
    /* no state yet */
  }
  return { task, session: me.session || null };
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

export function statePath(cwd) {
  return path.join(projectDripDir(cwd), "state.json");
}

function readRaw(cwd) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(statePath(cwd), "utf8"));
  } catch {
    return EMPTY();
  }
  const out = { ...EMPTY(), ...raw, tasks: { ...(raw.tasks || {}) }, sessions: { ...(raw.sessions || {}) }, history: raw.history || [] };
  if (raw.task) out.tasks[raw.task.id] = raw.task; // v1 file: one task for the whole folder
  delete out.task;
  return out;
}

/** Is this task being worked on by another live session? */
function ownedByOther(t, raw) {
  if (me.session && t.ownerSession && t.ownerSession !== me.session && alive(t.ownerPid)) return true;
  const boundTo = Object.entries(raw.sessions).filter(([, id]) => id === t.id).map(([sid]) => sid);
  if (me.session && boundTo.length && !boundTo.includes(me.session) && alive(t.ownerPid)) return true;
  if (me.server && t.ownerPid && t.ownerPid !== process.pid && alive(t.ownerPid)) return true;
  return false;
}

/** The id of this session's task, or null. */
function resolveId(raw) {
  if (me.taskId && raw.tasks[me.taskId]) return me.taskId;
  if (me.session) {
    const id = raw.sessions[me.session];
    if (id && raw.tasks[id]) return id;
    const own = Object.values(raw.tasks).find((t) => t.ownerSession === me.session);
    if (own) return own.id;
  }
  // A known session that never started or bound a task has none: another session's leftover task in the same folder is
  // not its business (its Stop hook must not demand fit checks for edits it never made). A resumed session keeps its
  // own task through ownerSession / the sessions map above.
  // A task with no owner (made by the CLI, a test, or a host without session ids) can still be picked up.
  // The MCP server may resume a task whose session ended (the agent is using Drip's tools); hooks never adopt one.
  const foreign = (t) => !me.server && me.session && ((t.ownerSession && t.ownerSession !== me.session) || Object.entries(raw.sessions).some(([sid, id]) => id === t.id && sid !== me.session));
  // No session id, or an ownerless task: a task nobody live is working on is yours.
  const free = Object.values(raw.tasks).filter((t) => !foreign(t) && !ownedByOther(t, raw));
  return free.length === 1 ? free[0].id : null;
}

function claim(raw, task) {
  if (!me.server) return;
  me.taskId = task.id;
  task.ownerPid = process.pid;
  if (me.session) {
    task.ownerSession = me.session;
    raw.sessions[me.session] = task.id;
  }
}

/** Tasks left open by sessions that have ended (for the session-start pointer; this session doesn't own them). */
export function orphanTasks(cwd) {
  const raw = readRaw(cwd);
  return Object.values(raw.tasks).filter((t) => t.ownerSession && t.ownerSession !== me.session && !alive(t.ownerPid));
}

/** Open tasks in this folder that belong to other live sessions (never touch them). */
export function otherTasks(cwd) {
  const raw = readRaw(cwd);
  const mine = resolveId(raw);
  return Object.values(raw.tasks).filter((t) => t.id !== mine && ownedByOther(t, raw));
}

/** Hooks: remember that `session` works on task `taskId` (after drip_start answered it). */
export function bindSession(session, taskId, cwd) {
  const raw = readRaw(cwd);
  if (!session || !raw.tasks[taskId]) return;
  raw.sessions[session] = taskId;
  if (!raw.tasks[taskId].ownerSession) raw.tasks[taskId].ownerSession = session;
  writeRaw(raw, cwd);
}

export function loadState(cwd) {
  const raw = readRaw(cwd);
  const id = resolveId(raw);
  return { history: raw.history, task: id ? raw.tasks[id] : null };
}

function writeRaw(raw, cwd) {
  ensureProjectDrip(cwd);
  const file = statePath(cwd);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(raw, null, 2));
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows: another process has the file open for a moment.
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    fs.rmSync(tmp, { force: true });
  }
}

/** Write a { task, history } view back: only this session's task changes. */
function merge(raw, id, view) {
  if (id && (!view.task || view.task.id !== id)) {
    delete raw.tasks[id];
    for (const [sid, tid] of Object.entries(raw.sessions)) if (tid === id) delete raw.sessions[sid];
    if (me.taskId === id) me.taskId = null;
  }
  if (view.task) {
    if (view.task.id !== id || me.taskId !== view.task.id) claim(raw, view.task);
    view.task.touchedAt = new Date().toISOString();
    raw.tasks[view.task.id] = view.task;
  }
  // Forget tasks nobody has touched for 14 days (crashed sessions).
  const old = Date.now() - 14 * 864e5;
  for (const t of Object.values(raw.tasks)) if (t.id !== view.task?.id && Date.parse(t.touchedAt || t.startedAt) < old) delete raw.tasks[t.id];
  raw.history = (view.history || raw.history).slice(-30);
  return raw;
}

export function saveState(state, cwd) {
  const raw = readRaw(cwd);
  writeRaw(merge(raw, resolveId(raw), state), cwd);
}

/** Read, change and save in one go. `fn` gets { task, history } (this session's task) and may mutate it. */
export function updateState(fn, cwd) {
  const raw = readRaw(cwd);
  const id = resolveId(raw);
  const view = { history: [...raw.history], task: id ? raw.tasks[id] : null };
  const ret = fn(view);
  const out = ret && typeof ret === "object" && "history" in ret ? ret : view;
  writeRaw(merge(raw, id, out), cwd);
  return out;
}

export function newTask({ title, size, surface, guides, mode = "design", packs = [] }) {
  return {
    id: Date.now().toString(36),
    title,
    size, // "full" | "quick"
    mode, // "design" | "logo" | "refs" | "board" | "polish"
    surface, // "landing" | "app" | "mobile" | "component" | "brand" | "other"
    startedAt: new Date().toISOString(),
    requiredGuides: guides,
    guidesRead: [],
    packs, // niche pack ids in use
    brief: null, // set by drip_brief
    refs: { searches: 0, seen: 0, viewed: [], picked: [], studied: [] }, // studied: [{ key, designer, at }]
    board: null, // { id, items, directions, chosen, critiquedAt, adopted? }
    memory: null, // project memory this task started from: { mode, masterId, masterRevision, styleRevision, approved, inherited, needed }
    system: false,
    uiWrites: [], // [{ file, at }]
    lastUiWriteAt: null,
    critic: { runs: [], records: [] }, // runs: timestamps of drip:critic subagent calls; records: verdicts
    fitcheck: { shots: 0, lastShotAt: null, lintAt: null, doneAt: null, score: null },
    skipped: null, // reason, when the user asked to skip the process
  };
}

/** A landing page, portfolio or showcase: the playbook's page-scale numbers and gates apply. */
export function isPersuade(task) {
  if (!task) return true;
  if (task.surface === "readme") return false; // README art is judged as images in a GitHub column, not as a web page
  return ["landing", "other"].includes(task.surface) && !["logo", "refs", "board"].includes(task.mode);
}

/** Distinct designers among studied references. */
export function studiedDesigners(task) {
  return new Set((task.refs.studied || []).map((s) => s.designer).filter(Boolean)).size;
}

// Words that say what a task or a reference is, not what the product IS.
const NOT_TYPE = new Set("a an and the for with of to in on at by from that which who sells selling my our your their its new modern clean beautiful nice cool bold simple minimal great best design designs designed redesign redesigned make build create improve update refresh rework revamp landing page pages website websites site web homepage home main screen screens view ui ux app hero section sections layout template theme product products brand company startup business online store shop official".split(" "));
const stem = (w) => w.replace(/(ing|ies|es|s)$/, "");
const wordsOf = (text) => [...new Set(String(text || "").toLowerCase().replace(/https?:[^ ]+/g, " ").replace(/[a-z0-9-]+[.][a-z]{2,}[^ ]*/g, " ").split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !NOT_TYPE.has(w)).map(stem).filter((w) => w.length > 2))];

/** What the product IS, as words: from the task title and the brief ("walking trainer", "baby stroller"). */
export function productTypeWords(task) {
  return wordsOf(`${task?.title || ""} ${task?.brief?.what || ""}`).slice(0, 8);
}

/** Does any competitor study share a word with the product type (in its title, address or notes)? Null when the type is unknown. */
export function competitorsShareType(task) {
  const type = productTypeWords(task);
  if (!type.length) return null;
  const comps = (task.refs?.studied || []).filter((x) => x.role === "competitor");
  if (!comps.length) return false;
  return comps.some((x) => wordsOf(x.terms).some((w) => type.includes(w)));
}

/** The directions a directions verdict asked to rework or cut (names), else the lowest scored. */
export function reworkNames(rec) {
  const per = rec?.perDirection || [];
  const named = per.filter((d) => d.verdict === "rework" || d.verdict === "cut").map((d) => `"${d.name}"`);
  if (named.length) return named.join(", ");
  const low = [...per].sort((a, b) => a.score - b.score).slice(0, 1).map((d) => `"${d.name}"`);
  return low.join(", ");
}

const AGENT_TTL_MS = 10 * 60000;

/** Subagents (the critic, a scout, a builder...) launched and not yet finished, newest launch in the last ten minutes. */
export function agentsRunning(task, now = Date.now()) {
  return (task?.agents || []).filter((a) => now - Date.parse(a.at) < AGENT_TTL_MS);
}

/** A hook saw the Agent tool start a subagent of `type`. */
export function agentStarted(type, cwd) {
  updateState((st) => {
    if (!st.task) return;
    st.task.agents = [...agentsRunning(st.task), { type: String(type || "agent"), at: new Date().toISOString() }].slice(-12);
  }, cwd);
}

/** The subagent finished (SubagentStop, or the Agent tool returning for a foreground run). Without a type, the oldest goes. */
export function agentFinished(type, cwd) {
  updateState((st) => {
    if (!st.task?.agents?.length) return;
    const i = type ? st.task.agents.findIndex((a) => a.type === type) : 0;
    st.task.agents = st.task.agents.filter((_, k) => k !== (i < 0 ? 0 : i));
  }, cwd);
}

/** The latest critic verdict of a kind ("directions", "build", "logo", "pack", "any"). */
export function lastCritique(task, kind) {
  return [...(task?.critic?.records || [])].reverse().find((r) => r.kind === kind) || null;
}

/** Everything still missing before UI may be written. Empty list = allowed. */
/** Words that ask for a big change to a page that already exists ("make it 10x better", "it's ugly", "redo it"). */
export const REWORK_WORDS =
  /\b(\d+x|way|much|lot|far|10 ?times)\s+(more|better|nicer|cooler|prettier)\b|\bmore (beautiful|stunning|premium|polished|exciting|alive|cool|interesting|creative|modern)\b|\b(redo|redesign|rework|rethink|start over|from scratch|overhaul|level it up|take it further)\b|\b(ugly|boring|bland|generic|basic|slop|meh|lifeless|dull)\b|\b(wow|blow (me|my mind) away|stunning|eye[- ]candy)\b|\bmake it (pop|cool|beautiful|amazing|better|nicer|sick|insane)\b/i;

/** A new round on a page that's already built: it needs a fresh look and pieces before UI changes (task.rework). */
export function reworkMissing(task) {
  const at = task?.rework?.at;
  if (!at || task.skipped) return [];
  const last = task.toolLast || {};
  const after = (re) => Object.entries(last).some(([k, t]) => re.test(k) && t >= at);
  const missing = [];
  if (!after(/^refs_/))
    missing.push({ need: "a look for this round", how: `the user asked for a big change ("${String(task.rework.prompt || "").slice(0, 80)}"). Look at shipped work that already does what's asked, in ONE message: refs_site on 2-3 sites that are clearly better at it, and refs_gallery for the pattern; name what you take from each` });
  if (!after(/^(components_find|pieces_preview|parts_preview|parts_list)$/))
    missing.push({ need: "pieces for this round", how: "one drip_execute with a components_find per upgrade (the hero effect, the cards, the backdrop...), then ONE pieces_preview; build every upgrade on a piece through build_prepare and drip:builder agents, never hand-written effects" });
  return missing;
}

export function missingBeforeUi(task, config) {
  if (!task) return [{ need: "task", how: "call drip_start with what you are designing" }];
  if (task.skipped || !config.gates.enforce) return [];
  const g = config.gates;
  const missing = [];
  if (task.loop === "fast" && task.size === "full") {
    const looked = (task.refs?.viewed || []).length + (task.refs?.studied || []).length + Object.keys(task.toolUse || {}).filter((k) => /^refs_/.test(k)).length;
    if (!looked) missing.push({ need: "look", how: "one look at proven work first: refs_gallery (the pattern you'll build, e.g. 'saas dashboard hero') or refs_site on 3-4 shipped sites, in ONE call" });
    if (!task.deal && !task.board?.chosen && !task.board?.adopted && !task.memory?.styleRevision)
      missing.push({ need: "deal", how: 'layout_deal({ kind, trade }) for the hero layout, palette, type and sections (or board_choose / an approved direction)' });
    if (task.noAsk === false && task.brief?.assumed)
      missing.push({ need: "the user's answers", how: "one AskUserQuestion round of 2-4 clickable questions (direction options from what you studied, what must stay, the material they have), then drip_brief with the answers. Skip only if the user said not to ask" });
    missing.push(...reworkMissing(task));
    return missing;
  }
  if (task.size === "full" && g.requireBrief && !task.brief)
    missing.push({ need: "brief", how: "ask the user up to 4 clickable questions (AskUserQuestion), then record the answers with drip_brief" });
  const unread = task.requiredGuides.filter((x) => !task.guidesRead.includes(x));
  if (unread.length) missing.push({ need: "guides", how: `call drip_guide for: ${unread.join(", ")}` });
  if (task.size === "full") {
    const studied = (task.refs.studied || []).length;
    const designers = studiedDesigners(task);
    const pageWork = ["landing", "app", "mobile", "component"].includes(task.surface);
    const onSurfaceCount = (task.refs.studied || []).filter((x) => x.onSurface).length;
    if (pageWork && onSurfaceCount < g.minOnSurface) {
      const what = task.surface === "landing" ? "real landing pages, heroes and full-site shots" : task.surface === "component" ? "real components in real products" : "real app screens and flows";
      missing.push({
        need: "real examples",
        how: `study ${g.minOnSurface - onSurfaceCount} more references that ARE what you're building (${what}), not print, posters or objects. Fastest and best: refs_site with 2-4 shipped sites in the category (measured type sizes); or refs_tag "landing page" / "hero section" (now ${onSurfaceCount}/${g.minOnSurface})`,
      });
    }
    // Three roles: STYLE (the look you're aiming for), COMPETITOR (similar products, shipped), PAGE (the same kind of page).
    const roleOf = (x) => x.role || (String(x.key).startsWith("site:") ? "page" : "style");
    const roles = { style: 0, competitor: 0, page: 0 };
    for (const x of task.refs.studied || []) if (roleOf(x) in roles) roles[roleOf(x)]++;
    const one = task.asap ? 1 : 2; // asap: one reference per role is enough
    const need = { style: Math.min(g.minStyle ?? 2, one), competitor: Math.min(g.minCompetitors ?? 2, one), page: Math.min(g.minPage ?? 2, one) };
    if (pageWork || task.surface === "readme") {
      if (roles.style < need.style)
        missing.push({ need: "style references", how: `study ${need.style - roles.style} more for the LOOK you're aiming for (role "style"): refs_search / refs_tag / refs_gallery with style words only ("dark saas glow", "soft 3d", "clean product", "playful illustration"), never mixed with the subject (now ${roles.style}/${need.style})` });
      if (roles.competitor < need.competitor && task.surface !== "readme") {
        const type = productTypeWords(task).slice(0, 3).join(" ");
        const sameType = competitorsShareType(task) === false;
        missing.push({
          need: "competitor references",
          how:
            `study ${need.competitor - roles.competitor} similar product(s) (role "competitor"): name the 3-4 products people compare this with and refs_site their shipped sites (now ${roles.competitor}/${need.competitor})` +
            (sameType
              ? `. None of your competitors is the SAME product type${type ? ` ("${type}")` : ""}: add a same-product-type rival, a shipped site selling the same kind of thing to the same people. Name three real rivals plus the best-designed similar product (search the web if you don't know them), not a famous brand from another category`
              : ""),
        });
      }
      if (roles.page < need.page)
        missing.push({ need: "page references", how: `study ${need.page - roles.page} more of the SAME kind of page you're making (role "page"): refs_search("<subject> ${task.surface === "app" ? "dashboard" : task.surface === "mobile" ? "app" : "landing page"}"), refs_tag "${task.surface === "app" ? "web app" : "landing page"}", or shipped pages of that type (now ${roles.page}/${need.page})` });
    }
    if (studied < g.minRefsStudied || designers < g.minDesigners)
      missing.push({
        need: "references",
        how: `study ${Math.max(0, g.minRefsStudied - studied)} more references from at least ${g.minDesigners} designers or sites (now ${studied} studied, ${designers}): refs_site for shipped sites, or refs_tag -> refs_view -> refs_study; batch them`,
      });
    const adoptedStale = task.board?.adopted && task.board.adopted.styleRevision !== currentStyleRevision(task);
    if (adoptedStale)
      missing.push({ need: "direction", how: `the project's approved direction changed since this task adopted it (${task.board.adopted.direction} -> ${currentStyleRevision(task) || "none"}): board_attach({ adopt: true }) again, or board_choose a direction of this task's own` });
    else if (g.requireDirection && !task.board?.chosen && lastCritique(task, "directions") && lastCritique(task, "directions").verdict !== "pass") {
      const dc = lastCritique(task, "directions");
      const names = reworkNames(dc);
      missing.push({
        need: "direction",
        how: `the critic said ${dc.verdict.toUpperCase()} on the directions (${String(dc.summary || "").slice(0, 160)}). Rework ${names || "the weak directions"}${dc.fixes?.length ? ` (${String(dc.fixes[0]).slice(0, 140)})` : ""}${dc.verdict === "reject" ? " into genuinely different ideas, not recolours" : ""}, then board_directions again with the reworked set, critic review again (critic_prepare kind 'directions' -> Agent drip:critic -> critic_record), show the user the two strongest comps, board_choose`,
      });
    } else if (g.requireDirection && !task.board?.chosen)
      missing.push({ need: "direction", how: task.board ? "board_directions (renders the comps), rank them yourself (fix what you can see), show the user the two strongest comps (the tile images), then board_choose" : "board_create, board_directions (3 ideas, each with what it takes from which reference), rank them yourself, show the user the two strongest comps, board_choose" });
    if (g.requireComponentSearch !== false && pageWork && task.components?.count > 0 && !task.components.search)
      missing.push({ need: "reuse", how: `this project already has ${task.components.count} components: components_local_find for what you're about to build (and components_plan for a page) before writing new ones` });
    // The parts come from somewhere: the project's or the catalogue's components for the interactive pieces, and a real
    // picture source. Hand-drawing every part is why pages come out basic.
    if (g.requireSources !== false && pageWork && task.board?.chosen && !task.board?.adopted) {
      const used = task.toolUse || {};
      const any = (re) => Object.keys(used).some((k) => re.test(k));
      if (!any(/^(components_|catalogue_|parts_)/))
        missing.push({ need: "components", how: "components_find for the page's interactive and eye-candy pieces (a prompt box, a gallery or marquee, a bento, pricing, a footer, a chart): build on the best one found, or say why none fits" });
      // The plan may say every picture is the project's own (real outputs, product UI built in code): that is a source too.
      const ownPictures = task.plan?.sections?.length && task.plan.sections.every((x) => ["user-files", "product-ui", "code-visual", "none"].includes(x.picture?.source));
      if (!ownPictures && !any(/^(images_|art_|shader_|mockup_|scene_|gen_image|assets_3d_|parts_get)/))
        missing.push({ need: "pictures", how: "pick a picture source for each section that needs one: images_search (Imageory first), art_generate, shader_hero, mockup_render for screens, or the user's real files; never fill the product's place with a drawing you improvised" });
    }
    // Sections come from the references too, not only the hero: the plan names each section's borrowed move and picture.
    if (g.requirePlan !== false && ["landing", "app", "mobile"].includes(task.surface) && task.board?.chosen && !task.board?.adopted && !task.plan)
      missing.push({ need: "section plan", how: "board_plan: one line per section (hero and footer included) with its idea, its form, the move it takes from a studied reference, its picture source, and two or three eye-candy moments" });
    // The critic is a reality check on the final build, not on the directions: the director ranks those itself.
  }
  missing.push(...reworkMissing(task));
  return missing;
}

/** How many build critic rounds this task gets: one, at the final version (the critic is slow: a reality check, not a loop). */
export function criticRounds(task, config) {
  return Math.min(1, config.gates.maxCriticRounds ?? 1) || 1;
}

/** True when the build changed after the last passing critic verdict (full loop only). */
export function needsCritic(task, config) {
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireCritic || task.size !== "full" || !task.lastUiWriteAt) return false;
  // Fast loop: the critic is optional, but once it has said REVISE or REJECT on the build, the director can't overrule it
  // alone: the user chooses (ship with the open points) or a new critic round passes.
  if (task.loop === "fast") {
    const rec = lastCritique(task, "build");
    return !!rec && rec.verdict !== "pass" && !(task.critic?.shipAt && task.critic.shipAt >= rec.at);
  }
  const rec = lastCritique(task, "build");
  if (rec?.rev && rec.rev !== artifactRev(task)) return !(isCriticCapped(task, config)); // reviewed something else: stale
  if (isCriticCapped(task, config)) return false; // never loop forever; the hand-off lists what's left
  // A verdict about exactly these files stays good however recently they were written (a script that rewrote the same bytes).
  const sameFiles = !!rec?.rev && rec.rev === artifactRev(task);
  return !rec || (!sameFiles && rec.at < task.lastUiWriteAt) || rec.verdict !== "pass";
}

function isCriticCapped(task, config) {
  const rounds = (task.critic?.records || []).filter((r) => r.kind === "build").length;
  return rounds >= criticRounds(task, config) + (task.critic?.extraRounds || 0);
}

/** The fit check or critic verdict on record reviewed something other than what exists now (UI files, DESIGN.md, direction). */
export function evidenceStale(task) {
  if (!task) return [];
  const now = artifactRev(task);
  const stale = [];
  const fc = task.fitcheck || {};
  if (fc.doneRev && fc.doneRev !== now) stale.push("the fit check passed on an earlier version");
  if (fc.shotRev && fc.shotRev !== now) stale.push("the last fitcheck_shot shows an earlier version");
  const b = lastCritique(task, "build");
  if (b?.rev && b.rev !== now) stale.push("the critic reviewed an earlier version");
  return stale;
}

/** True when UI changed after the last fit check (so Claude must not end its turn yet). */
export function needsFitcheck(task, config) {
  if (!task || task.skipped || !config.gates.enforce || !config.gates.requireFitcheck) return false;
  if (!task.lastUiWriteAt) return false;
  const last = task.size === "full" ? task.fitcheck.doneAt : task.fitcheck.doneAt || task.fitcheck.lintAt;
  if (task.fitcheck.doneRev && task.fitcheck.doneRev !== artifactRev(task)) return true; // checked a different version
  if (task.fitcheck.doneRev) return needsCritic(task, config); // the same files the passing check saw: nothing to redo, whatever their write times
  return !last || last < task.lastUiWriteAt || needsCritic(task, config);
}

export function isUiFile(file, cwd) {
  if (!file) return false;
  const config = loadConfig(cwd);
  const f = file.replace(/\\/g, "/");
  return new RegExp(config.uiFiles, "i").test(f) && !new RegExp(config.ignoreFiles, "i").test(f);
}

/** Human-readable checklist used by drip_status and the hooks. */
export function checklist(task, config) {
  if (!task) return "No Drip task is active. Call drip_start first.";
  const tick = (ok) => (ok ? "[x]" : "[ ]");
  const g = config.gates;
  if (task.loop === "fast" && task.size === "full") {
    const fc = task.fitcheck || {};
    const rec = lastCritique(task, "build");
    return [
      `Task: ${task.title}  (fast loop, ${task.surface})`,
      `${tick((task.refs?.viewed || []).length + (task.refs?.studied || []).length > 0 || Object.keys(task.toolUse || {}).some((k) => /^refs_/.test(k)))} looked at proven work`,
      `${tick(!!task.deal || !!task.board?.chosen)} dealt a set${task.deal ? `: ${task.deal.summary}` : ""}`,
      `${tick(!!fc.heroPassedAt)} hero shot`,
      `${tick(task.uiWrites.length > 0)} built (${task.uiWrites.length} UI writes)`,
      `${tick(!!fc.doneAt && !needsFitcheck(task, config))} page check clean on the current version`,
      `${tick(!!rec)} critic (a polish pass on request)${rec ? `: ${rec.verdict.toUpperCase()} (${rec.summary})` : ""}`,
    ].join("\n");
  }
  const lines = [`Task: ${task.title}  (${task.mode || "design"}, ${task.size} loop, ${task.surface})${task.packs?.length ? `  packs: ${task.packs.join(", ")}` : ""}${task.skipped ? `  SKIPPED: ${task.skipped}` : ""}`];
  const mem = memoryLine(task);
  if (mem) lines.push(mem);
  if (task.size === "full") lines.push(`${tick(!!task.brief)} brief${task.brief ? `: ${task.brief.what} · ambition ${task.brief.ambition}` : " (ask up to 4 clickable questions, then drip_brief)"}`);
  for (const x of task.requiredGuides) lines.push(`${tick(task.guidesRead.includes(x))} guide: ${x}`);
  if (task.size === "full") {
    const st = (task.refs.studied || []).length;
    const rc = { style: 0, competitor: 0, page: 0 };
    for (const x of task.refs.studied || []) { const r = x.role || (String(x.key).startsWith("site:") ? "page" : "style"); if (r in rc) rc[r]++; }
    lines.push(`${tick(rc.style >= (g.minStyle ?? 2) && rc.competitor >= (g.minCompetitors ?? 2) && rc.page >= (g.minPage ?? 2))} references by role: style ${rc.style}/${g.minStyle ?? 2} · competitors ${rc.competitor}/${g.minCompetitors ?? 2} · same page ${rc.page}/${g.minPage ?? 2}${rc.competitor > 0 && competitorsShareType(task) === false && task.surface !== "readme" ? ` · none of the competitors is the same product type as "${productTypeWords(task).slice(0, 3).join(" ")}": add a same-type rival` : ""}`);
    lines.push(`${tick(st >= g.minRefsStudied && studiedDesigners(task) >= g.minDesigners)} references studied: ${st}/${g.minRefsStudied} from ${studiedDesigners(task)}/${g.minDesigners} designers (picked ${(task.refs.picked || []).length}, viewed ${task.refs.viewed.length}, scanned ${task.refs.seen}, searches ${task.refs.searches})`);
    if (task.components?.count) lines.push(`${tick(!!task.components.search)} searched the project's own ${task.components.count} components first (components_local_find)`);
    lines.push(`${tick(!!task.board)} moodboard${task.board ? `: ${task.board.items} items, ${task.board.directions || 0} directions` : ""}`);
    const dc = lastCritique(task, "directions");
    if (dc) lines.push(`${tick(dc.verdict === "pass")} critic on the directions (optional): ${dc.verdict.toUpperCase()} (${dc.summary})${dc.verdict === "pass" ? "" : ` NOT PASSED: rework ${reworkNames(dc) || "the weak directions"}`}`);
    lines.push(`${tick(!!task.board?.chosen)} direction chosen${task.board?.chosen ? `: ${task.board.chosen}` : ""}`);
    lines.push(`${tick(task.system)} system written (kit/base.css + DESIGN.md)`);
    if (["landing", "app", "mobile"].includes(task.surface)) lines.push(`${tick(!!task.plan)} section plan${task.plan ? `: ${task.plan.sections.length} sections, ${new Set(task.plan.sections.map((s) => s.form)).size} forms, ${task.plan.sections.filter((s) => s.candy).length} eye-candy` : " (board_plan)"}`);
    if (isPersuade(task)) lines.push(`${tick(!!task.fitcheck.heroPassedAt)} hero gate passed (fitcheck_shot hero: true, before the sections)`);
  }
  lines.push(`${tick(task.uiWrites.length > 0)} built (${task.uiWrites.length} UI writes)`);
  const fc = task.fitcheck;
  lines.push(`${tick(!!fc.doneAt && !(task.lastUiWriteAt && fc.doneAt < task.lastUiWriteAt))} fit check after the last change (shots ${fc.shots}${fc.score ? `, score ${fc.score}` : ""})`);
  if (task.size === "full") {
    const b = lastCritique(task, "build");
    lines.push(`${tick(!needsCritic(task, config) && b?.verdict === "pass")} critic passed the build${b ? `: ${b.verdict.toUpperCase()} (${b.summary})${b.verdict !== "pass" && !needsCritic(task, config) ? " (round limit reached: the hand-off lists what is left)" : ""}` : ""}`);
  }
  return lines.join("\n");
}

/** The approved style revision in force for this task's brand (read straight from boards/index.json; null when none). */
export function currentStyleRevision(task, cwd) {
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(projectDripDir(cwd), "boards", "index.json"), "utf8"));
    return idx.approved?.[task?.memory?.brand || "default"]?.revision || null;
  } catch {
    return null;
  }
}

/** One line for drip_status and the hooks: what this task inherited from the project and what it still needs. */
export function memoryLine(task) {
  const m = task?.memory;
  if (!m) return "";
  const parts = [`Project memory: ${m.mode || "fidelity"} mode`];
  if (m.masterId) parts.push(`master board ${m.masterId} r${m.masterRevision ?? "?"}`);
  parts.push(m.approved ? `approved direction "${m.approved}"` : "no approved direction yet");
  if (m.inherited?.length) parts.push(`inherited: ${m.inherited.join(", ")}`);
  if (m.needed?.length) parts.push(`still needed: ${m.needed.join(", ")}`);
  return parts.join(" · ");
}

/**
 * Fold UI edits Drip never saw (shell edits, hosts without write hooks) into the task as UI writes, so the existing
 * gates (fit check after the last change, critic on the current build) apply to them. Returns the list folded in.
 */
export function reconcileWorkspace(cwd) {
  const { task } = loadState(cwd);
  if (!task || task.skipped) return [];
  const { unseen } = workspaceDiff(task, cwd);
  const posix = (f) => f.replace(/\\/g, "/"); // hooks record native separators on Windows
  // Another session's edits are not this task's: skip files another open task wrote, and once this task has written
  // UI of its own, files outside its own folders (several sessions often share one project folder).
  const raw = readRaw(cwd);
  const theirs = new Set(Object.values(raw.tasks || {}).filter((t) => t.id !== task.id).flatMap((t) => (t.uiWrites || []).filter((w) => !w.unseen).map((w) => posix(w.file))));
  const top = (f) => (posix(f).includes("/") ? posix(f).split("/")[0] : ".");
  const mine = new Set(task.uiWrites.filter((w) => !w.unseen).map((w) => top(w.file)));
  const fresh = unseen.filter((u) => (u.status !== "deleted" || !task.uiWrites.some((w) => posix(w.file) === u.file)) && !theirs.has(u.file) && (!mine.size || mine.has(top(u.file))));
  if (!fresh.length) return [];
  updateState((st) => {
    if (!st.task) return;
    for (const u of fresh) {
      const at = new Date(u.mtime).toISOString();
      st.task.uiWrites = [...st.task.uiWrites.filter((w) => posix(w.file) !== u.file), { file: u.file, at, unseen: true }].slice(-200);
      if (!st.task.lastUiWriteAt || st.task.lastUiWriteAt < at) st.task.lastUiWriteAt = at;
    }
  }, cwd);
  refreshSnapshot(task, cwd);
  return fresh;
}

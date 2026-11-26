// Drip Film: a record of a task at work (who did what, when, where on the page) and frames of the whole page as it was
// built, so the user can watch the agents live and get a montage at the end, in any IDE (a static viewer on localhost).
// Hooks append events (events.jsonl, append-only, no locks); the MCP server adds the process events (references,
// assets, pieces, with thumbnails), takes the frames and writes film.json, the one file the viewer reads.
// The format is in docs/FILM.md. No dependencies: hooks import this file.
import fs from "node:fs";
import path from "node:path";
import { projectDripDir } from "./paths.mjs";

export const MODEL = { director: "opus", builder: "sonnet", critic: "sonnet", helper: "haiku", scout: "haiku", checker: "haiku" };
const JOB = { director: "plans, picks pieces, writes specs, checks", builder: "writes one section", helper: "small jobs", scout: "finds references", checker: "measures the page", critic: "final reality check" };

/** Events the server records while the task looks around before building: what was looked at, made and picked. */
export const PROCESS_KINDS = ["ref", "asset", "piece"];
/** How many frames a write's place is looked for before it counts as not on the page. */
export const TARGET_TRIES = 3;

export const filmDir = (taskId, dir) => path.join(projectDripDir(dir), "film", String(taskId || "none"));

const typeOf = (t) => String(t || "").replace(/^drip:/, "").toLowerCase() || "agent";

/** Append one event. Never throws: the film must never get in the way of the work. */
export function filmEvent(task, ev, dir) {
  try {
    if (!task?.id || task.film === false) return;
    const d = filmDir(task.id, dir);
    fs.mkdirSync(d, { recursive: true });
    fs.appendFileSync(path.join(d, "events.jsonl"), `${JSON.stringify({ t: new Date().toISOString(), ...ev })}\n`);
  } catch {
    /* a film is a nicety */
  }
}

/** The start event of a subagent, from the Agent tool's input. */
export function startEvent(toolInput = {}) {
  const prompt = String(toolInput.prompt || "");
  const piece = (prompt.match(/THE PIECE: (\S+?)\.?(?:\s|$)/) || [])[1] || null;
  const section = (prompt.match(/DRIP BUILDER · sections?: (.+)/) || [])[1] || null;
  const type = typeOf(toolInput.subagent_type);
  return { kind: "start", type, label: toolInput.description || type, job: section ? `section ${section}${piece ? ` on ${piece.replace(/^https?:\/\/(www\.)?/, "").replace(/\/r\/|\/registry\//, " ").replace(/\.json$/, "")}` : ""}` : prompt.split("\n").find((l) => l.trim())?.slice(0, 120) || JOB[type] || "", piece };
}

// File names that say nothing about where on the page a change lands.
const GENERIC = new Set(["app", "index", "main", "page", "layout", "globals", "global", "styles", "style", "theme", "tokens", "utils", "lib", "types", "data", "content", "copy", "config", "tailwind", "base", "root", "home", "site", "drip-base"]);
const kebab = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

/** Where a write lands on the page, as words the recorder looks for there: the ids and data-section names it writes,
 *  the file's own name (Pricing.tsx, footer-3.tsx), its landmark tags, and for a generic file the sections it renders. */
export function writeHints(file, body = "") {
  const out = [];
  const add = (h) => {
    const k = kebab(h).replace(/^-+|-+$/g, "");
    if (k.length >= 2 && k.length <= 40 && !GENERIC.has(k) && !out.includes(k)) out.push(k);
  };
  const text = String(body || "").slice(0, 20000);
  for (const m of text.matchAll(/data-section=["'{`]*([A-Za-z][\w-]*)/g)) add(m[1]);
  for (const m of text.matchAll(/\bid=["'{`]+([A-Za-z][\w-]*)/g)) add(m[1]);
  const base = path.basename(String(file || "")).replace(/\.[a-z0-9]+$/i, "");
  const generic = GENERIC.has(kebab(base));
  if (!generic) {
    add(base);
    add(base.replace(/[-_]?\d+$/, "")); // footer-3 -> footer
  }
  for (const m of text.matchAll(/<(header|nav|footer)\b/g)) add(m[1]);
  if (generic) for (const m of text.matchAll(/<([A-Z][A-Za-z0-9]{2,})\b/g)) add(m[1]);
  return out.slice(0, 6);
}

function readEvents(d) {
  try {
    return fs
      .readFileSync(path.join(d, "events.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function readJsonIn(d, name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(d, name), "utf8"));
  } catch {
    return fallback;
  }
}

/** The key of a write event in targets.json. */
export const writeKey = (e) => `${e.t}|${e.file || ""}`;

/** The writes whose place on the page is still to be found (newest last), with what to look for. */
export function pendingTargets(task, dir) {
  const d = filmDir(task.id, dir);
  const targets = readJsonIn(d, "targets.json", {});
  return readEvents(d)
    .filter((e) => e.kind === "write" && e.file)
    .map((e) => ({ key: writeKey(e), hints: e.hints?.length ? e.hints : writeHints(e.file, "") }))
    .filter((w) => w.hints.length && (!targets[w.key] || (targets[w.key].miss && targets[w.key].miss < TARGET_TRIES)))
    .slice(-30);
}

/** Record what a frame found: a box for each write it located, a miss for the rest. */
export function saveTargets(task, found, missed, dir) {
  const d = filmDir(task.id, dir);
  const targets = readJsonIn(d, "targets.json", {});
  for (const [key, box] of Object.entries(found)) targets[key] = box;
  for (const key of missed) if (!targets[key]?.selector) targets[key] = { miss: (targets[key]?.miss || 0) + 1 };
  fs.writeFileSync(path.join(d, "targets.json"), JSON.stringify(targets));
}

// A server-side process event has no agent (the server can't tell who called): the hook logs the same call with its
// agent_id a moment later (or earlier). The nearest one of the same tool within two minutes says who it was.
function attributeProcess(raw) {
  const calls = raw.filter((e) => e.tool && e.agent && !PROCESS_KINDS.includes(e.kind) && e.kind !== "write");
  const used = new Set();
  for (const e of raw) {
    if (!PROCESS_KINDS.includes(e.kind) || e.agent || !e.tool) continue;
    const at = Date.parse(e.t);
    let best = null;
    let gap = 120000;
    for (const c of calls) {
      if (c.tool !== e.tool) continue;
      const g = Math.abs(Date.parse(c.t) - at);
      if (g < gap || (g === gap && used.has(best) && !used.has(c))) {
        gap = g;
        best = c;
      }
    }
    if (best) {
      e.agent = best.agent;
      e.type = best.type;
      used.add(best);
    }
  }
}

const slugOf = (s) =>
  String(s || "")
    .replace(/\.json$/i, "")
    .split(/[/\s]+/)
    .filter(Boolean)
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") || "";

/** Build film.json from the events, the frames and the write targets. Agents: "main" is the director; a subagent's start is
 *  matched to the first unseen agent_id of the same type (tool events carry agent_id and agent_type), and ends with SubagentStop. */
export function buildFilm(task, { url = null, dir } = {}) {
  const d = filmDir(task.id, dir);
  fs.mkdirSync(d, { recursive: true });
  const raw = readEvents(d);
  attributeProcess(raw);
  const targets = readJsonIn(d, "targets.json", {});
  const agents = [{ id: "main", type: "director", model: MODEL.director, label: "Director", job: JOB.director, startedAt: task.startedAt || raw[0]?.t || new Date().toISOString(), endedAt: task.endedAt || null, status: task.endedAt ? "done" : "working" }];
  const pending = []; // started, no agent_id yet
  const byId = new Map([["main", agents[0]]]);
  const events = [];
  let n = 0;
  const attach = (id, type, t) => {
    if (!id || byId.has(id)) return byId.get(id) || null;
    const i = pending.findIndex((p) => p.type === typeOf(type));
    const a = i >= 0 ? pending.splice(i, 1)[0] : { id, type: typeOf(type), model: MODEL[typeOf(type)] || "sonnet", label: typeOf(type), job: JOB[typeOf(type)] || "", startedAt: t, endedAt: null, status: "working" };
    a.id = id;
    if (i < 0) agents.push(a);
    byId.set(id, a);
    return a;
  };
  const pieceImages = new Map(); // a picked piece shows the picture it was previewed with
  for (const e of raw) {
    if (e.kind === "start") {
      const a = { id: `pending-${++n}`, type: e.type, model: MODEL[e.type] || "sonnet", label: e.label, job: e.job, ...(e.piece ? { piece: e.piece } : {}), startedAt: e.t, endedAt: null, status: "working" };
      agents.push(a);
      pending.push(a);
      events.push({ t: e.t, agent: "main", kind: "start", ref: a, type: a.type, label: a.label, summary: `launched ${e.type}: ${e.label}` });
      continue;
    }
    if (e.kind === "end") {
      const a = (e.agent && byId.get(e.agent)) || pending.find((p) => p.type === typeOf(e.type)) || agents.find((x) => x.type === typeOf(e.type) && !x.endedAt && x.id !== "main");
      if (a) {
        a.endedAt = e.t;
        a.status = "done";
        const pi = pending.indexOf(a);
        if (pi >= 0) pending.splice(pi, 1);
        if (e.agent && !byId.has(e.agent)) byId.set(e.agent, a);
        events.push({ t: e.t, agent: a.id, kind: "stop", ref: a, type: a.type, label: a.label, summary: `${a.label} finished` });
      }
      continue;
    }
    const a = e.agent && e.agent !== "main" ? attach(e.agent, e.type, e.t) : agents[0];
    const ev = { t: e.t, agent: a?.id || "main", kind: e.kind || "tool", ...(e.tool ? { tool: e.tool } : {}), ...(e.file ? { file: e.file } : {}), summary: e.summary || "" };
    if (e.kind === "write") {
      const tg = targets[writeKey(e)];
      if (tg?.selector) ev.target = { selector: tg.selector, x: tg.x, y: tg.y, w: tg.w, h: tg.h, ...(tg.frame ? { frame: tg.frame } : {}) };
    } else if (e.kind === "ref") {
      Object.assign(ev, { title: e.title || e.url || "reference", url: e.url || null, image: e.image || null, ...(e.from ? { from: e.from } : {}), ...(e.studied ? { studied: true, take: e.take || "" } : {}) });
      ev.summary ||= `${e.studied ? "studied" : "looked at"} ${ev.title}`;
    } else if (e.kind === "asset") {
      Object.assign(ev, { file: e.file || null, assetKind: e.assetKind || "image", src: e.src || null, image: e.image || null });
      ev.summary ||= `${e.assetKind === "photo" ? "saved" : "made"} ${e.file ? path.basename(e.file) : "an image"}`;
    } else if (e.kind === "piece") {
      const key = slugOf(e.url || e.name);
      const image = e.image || pieceImages.get(key) || pieceImages.get(slugOf(e.name)) || null;
      if (e.image) [key, slugOf(e.name)].forEach((k) => k && pieceImages.set(k, e.image));
      Object.assign(ev, { name: e.name || key, url: e.url || null, image, ...(e.picked ? { picked: true } : {}) });
      ev.summary ||= `${e.picked ? "picked" : "previewed"} ${ev.name}`;
    }
    events.push(ev);
  }
  // events carry the agent's id only (the "ref" above is for filling in ids the matching found later)
  for (const ev of events)
    if (ev.ref) {
      ev.id = ev.ref.id;
      if (ev.kind === "stop") ev.agent = ev.ref.id;
      delete ev.ref;
    }
  const frames = readFrames(d);
  // Who was working when each frame was taken.
  for (const f of frames) {
    f.agents = agents.filter((a) => a.startedAt <= f.t && (!a.endedAt || a.endedAt >= f.t)).map((a) => a.id);
    f.at = f.t;
    f.image = f.file;
    f.url ??= url || task.filmUrl || null;
    events.push({ t: f.t, at: f.t, agent: "main", kind: "frame", image: f.file, url: f.url, width: f.width, height: f.height, ...(f.scale ? { scale: f.scale } : {}), summary: "" });
  }
  if (task.endedAt) events.push({ t: task.endedAt, at: task.endedAt, agent: "main", kind: "done", summary: "done" });
  events.sort((p, q) => (p.t < q.t ? -1 : p.t > q.t ? 1 : 0));
  const film = { version: 2, task: { id: task.id, title: task.title, startedAt: agents[0].startedAt, endedAt: task.endedAt || null, page: task.page?.dir || null, url: url || task.filmUrl || null }, agents, events, frames };
  const tmp = path.join(d, "film.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(film, null, 1));
  fs.renameSync(tmp, path.join(d, "film.json"));
  return film;
}

export function readFrames(d) {
  return readJsonIn(d, "frames.json", []);
}

/** Save a frame (a JPEG buffer) and index it. A frame is the whole page, top to bottom, at `scale` of its CSS pixels. */
export function addFrame(task, buf, { caption = "", width = 1440, height = 900, scale, pageHeight, url, dir } = {}) {
  const d = filmDir(task.id, dir);
  fs.mkdirSync(path.join(d, "frames"), { recursive: true });
  const frames = readFrames(d);
  const file = `frames/${String(frames.length + 1).padStart(4, "0")}.jpg`;
  fs.writeFileSync(path.join(d, file), buf);
  frames.push({ t: new Date().toISOString(), file, width, height, caption, ...(scale ? { scale } : {}), ...(pageHeight ? { pageHeight } : {}), ...(url ? { url } : {}) });
  fs.writeFileSync(path.join(d, "frames.json"), JSON.stringify(frames));
  return file;
}

/** The newest write/stitch event time (what a new frame would show), or null before the page has been written to. */
export function lastChangeAt(task, dir) {
  const ev = readEvents(filmDir(task.id, dir));
  // Only writes and stitches change what the page looks like (an install doesn't).
  for (let i = ev.length - 1; i >= 0; i--) if (["write", "stitch"].includes(ev[i].kind)) return ev[i].t;
  return null;
}

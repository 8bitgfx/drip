// Drip Film: a record of the swarm at work (who did what, when) and frames of the page as it was built, so the user can
// watch the agents live and get a montage at the end, in any IDE (a static viewer served on localhost).
// Hooks append events (events.jsonl, append-only, no locks); the MCP server takes the frames and writes film.json,
// the one file the viewer reads. No dependencies: hooks import this file.
import fs from "node:fs";
import path from "node:path";
import { projectDripDir } from "./paths.mjs";

export const MODEL = { director: "opus", builder: "sonnet", critic: "sonnet", helper: "haiku", scout: "haiku", checker: "haiku" };
const JOB = { director: "plans, picks pieces, writes specs, checks", builder: "writes one section", helper: "small jobs", scout: "finds references", checker: "measures the page", critic: "final reality check" };

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
  const section = (prompt.match(/DRIP BUILDER · section: (.+)/) || [])[1] || null;
  const type = typeOf(toolInput.subagent_type);
  return { kind: "start", type, label: toolInput.description || type, job: section ? `section ${section}${piece ? ` on ${piece.replace(/^https?:\/\/(www\.)?/, "").replace(/\/r\/|\/registry\//, " ").replace(/\.json$/, "")}` : ""}` : prompt.split("\n").find((l) => l.trim())?.slice(0, 120) || JOB[type] || "", piece };
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

/** Build film.json from the events and the frames. Agents: "main" is the director; a subagent's start is matched to the
 *  first unseen agent_id of the same type (tool events carry agent_id and agent_type), and ends with SubagentStop. */
export function buildFilm(task, { url = null, dir } = {}) {
  const d = filmDir(task.id, dir);
  fs.mkdirSync(d, { recursive: true });
  const raw = readEvents(d);
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
  for (const e of raw) {
    if (e.kind === "start") {
      const a = { id: `pending-${++n}`, type: e.type, model: MODEL[e.type] || "sonnet", label: e.label, job: e.job, ...(e.piece ? { piece: e.piece } : {}), startedAt: e.t, endedAt: null, status: "working" };
      agents.push(a);
      pending.push(a);
      events.push({ t: e.t, agent: "main", kind: "note", summary: `launched ${e.type}: ${e.label}` });
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
        events.push({ t: e.t, agent: a.id, kind: "end", summary: `${a.label} finished` });
      }
      continue;
    }
    const a = e.agent && e.agent !== "main" ? attach(e.agent, e.type, e.t) : agents[0];
    events.push({ t: e.t, agent: a?.id || "main", kind: e.kind || "tool", ...(e.tool ? { tool: e.tool } : {}), ...(e.file ? { file: e.file } : {}), summary: e.summary || "" });
  }
  const frames = readFrames(d);
  // Who was working when each frame was taken.
  for (const f of frames) f.agents = agents.filter((a) => a.startedAt <= f.t && (!a.endedAt || a.endedAt >= f.t)).map((a) => a.id);
  const film = { version: 1, task: { id: task.id, title: task.title, startedAt: agents[0].startedAt, endedAt: task.endedAt || null, page: task.page?.dir || null, url: url || task.filmUrl || null }, agents, events, frames };
  const tmp = path.join(d, "film.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify(film, null, 1));
  fs.renameSync(tmp, path.join(d, "film.json"));
  return film;
}

export function readFrames(d) {
  try {
    return JSON.parse(fs.readFileSync(path.join(d, "frames.json"), "utf8"));
  } catch {
    return [];
  }
}

/** Save a frame (a JPEG buffer) and index it. */
export function addFrame(task, buf, { caption = "", width = 1440, height = 900, dir } = {}) {
  const d = filmDir(task.id, dir);
  fs.mkdirSync(path.join(d, "frames"), { recursive: true });
  const frames = readFrames(d);
  const file = `frames/${String(frames.length + 1).padStart(4, "0")}.jpg`;
  fs.writeFileSync(path.join(d, file), buf);
  frames.push({ t: new Date().toISOString(), file, width, height, caption });
  fs.writeFileSync(path.join(d, "frames.json"), JSON.stringify(frames));
  return file;
}

/** The newest write/stitch/install event time (what a new frame would show). */
export function lastChangeAt(task, dir) {
  const ev = readEvents(filmDir(task.id, dir));
  for (let i = ev.length - 1; i >= 0; i--) if (["write", "stitch", "install"].includes(ev[i].kind)) return ev[i].t;
  return null;
}

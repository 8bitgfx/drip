// Drip's settings page: one local page instead of a chat menu. Status, the open task, API keys, how Drip works
// (checks, critic, builders, loop), paid kits and niche packs. Served on 127.0.0.1 with a random token in the URL, so
// no other page can post to it; keys go straight to ~/.drip/keys.json and never pass through the model.
// /drip:settings (Claude Code) calls settings_open; `drip settings` (any terminal, Codex) runs the same page.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { homeDripDir, pluginRoot, projectDripDir } from "../../core/paths.mjs";
import { loadConfig } from "../../core/config.mjs";
import { keyStatus, setKey } from "../../core/keys.mjs";
import { listPacks } from "../../core/packs.mjs";
import { checklist, loadState, updateState } from "../../core/state.mjs";
import { ownedKits, saveKits } from "../parts/pieces.mjs";

export const KEYS = [
  ["openai", "Image generation (gpt-image)"],
  ["gemini", "Image generation (Gemini)"],
  ["unsplash", "Photo search"],
  ["pexels", "Photo search"],
  ["pixabay", "Photo search"],
  ["openverse", "Photo search (openly licensed)"],
];
export const KITS = ["Aceternity Pro", "Magic UI Pro", "bencho Pro", "Breeze UI", "Tailark", "efferd Pro", "Skiper UI", "shadcnblocks"];

/** The switches the page offers: [id, label, help, read(config), patch(on)]. */
export const SWITCHES = [
  ["checks", "Checks", "Drip holds UI writes until the work has been looked at, and checks the page before you see it. Off: advice only, nothing is blocked.", (c) => c.gates.enforce !== false, (on) => ({ gates: { enforce: on } })],
  ["critic", "Critic on every page", "An independent Sonnet review before a page is handed over. Off: offered at the end, run when you ask.", (c) => !!c.gates.fastCritic, (on) => ({ gates: { fastCritic: on } })],
  ["builders", "Builders", "The session directs and one or two Sonnet builders write the code. Off: the session builds alone.", (c) => c.swarm !== false, (on) => ({ swarm: on })],
  ["full", "Full process by default", "Moodboard, three directions and a design system before building. Off: the fast loop (a page in about ten minutes).", (c) => c.loop === "full", (on) => ({ loop: on ? "full" : "fast" })],
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function version() {
  try {
    return JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8")).version;
  } catch {
    return "";
  }
}

const globalFile = () => path.join(homeDripDir, "config.json");
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return {};
  }
};
const deepMerge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(a?.[k] || {}, v) : v;
  return out;
};

/** Writes a switch to the machine-wide config (~/.drip/config.json). A project's own .drip/config.json still wins. */
export function writeGlobalConfig(patch) {
  fs.mkdirSync(homeDripDir, { recursive: true });
  fs.writeFileSync(globalFile(), JSON.stringify(deepMerge(readJson(globalFile()), patch), null, 2));
}

/** Switches a project's own config overrides (so the page can say the machine-wide value won't apply here). */
function projectOverrides(cwd) {
  const p = readJson(path.join(projectDripDir(cwd), "config.json"));
  const out = [];
  if (p.gates && "enforce" in p.gates) out.push("checks");
  if (p.gates && "fastCritic" in p.gates) out.push("critic");
  if ("swarm" in p) out.push("builders");
  if ("loop" in p) out.push("full");
  return out;
}

const CSS = `
:root{--bg:#f4f1ea;--card:#fffdf8;--ink:#16140f;--muted:#6b665b;--line:#e2ddd2;--accent:#16140f;--on:#2f6f4f;--warn:#9a4a16;--field:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#14130f;--card:#1d1b16;--ink:#f1ede4;--muted:#a39d90;--line:#322f27;--accent:#f1ede4;--on:#7fc79f;--warn:#e3a06a;--field:#14130f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 16px 64px}
header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:28px}
h1{font:600 34px/1.1 ui-serif,Georgia,serif;margin:0;letter-spacing:-.01em}h2{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
.ver{color:var(--muted);font:13px ui-monospace,Menlo,monospace}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin:0 0 16px}
.row{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid var(--line)}.row:first-of-type{border-top:0;padding-top:0}
.grow{flex:1;min-width:0}.name{font-weight:600}.help{color:var(--muted);font-size:13.5px}
.pill{font-size:12px;padding:2px 9px;border-radius:99px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}.pill.on{color:var(--on);border-color:currentColor}
input[type=password],input[type=text]{font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);width:210px;max-width:100%}
button{font:inherit;font-size:14px;padding:7px 14px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:var(--bg);cursor:pointer}
button.ghost{background:transparent;color:var(--ink);border-color:var(--line)}button.danger{background:transparent;color:var(--warn);border-color:currentColor}
button:hover{opacity:.88}button:focus-visible,input:focus-visible{outline:2px solid var(--on);outline-offset:2px}
.switch{position:relative;width:42px;height:24px;flex:none}.switch input{opacity:0;width:100%;height:100%;margin:0;cursor:pointer;position:absolute;z-index:1}
.switch span{position:absolute;inset:0;border-radius:99px;background:var(--line);transition:background .15s}.switch span:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--card);transition:transform .15s}
.switch input:checked+span{background:var(--on)}.switch input:checked+span:after{transform:translateX(18px)}
.switch input:focus-visible+span{outline:2px solid var(--on);outline-offset:2px}
pre{white-space:pre-wrap;font:12.5px/1.5 ui-monospace,Menlo,monospace;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;margin:12px 0 0;max-height:320px;overflow:auto}
.msg{background:var(--on);color:var(--bg);padding:10px 14px;border-radius:10px;margin:0 0 16px}
.kits{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px 16px;margin:0 0 14px}.kits label{display:flex;gap:8px;align-items:center}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}form.inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
code{font:13px ui-monospace,Menlo,monospace}.foot{color:var(--muted);font-size:13px;margin-top:20px}
@media (max-width:560px){.row{flex-wrap:wrap}input[type=password]{width:100%}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

/** The whole page, as HTML. Exported for tests. */
export function renderSettings({ token, cwd, msg = "", doctor = "" }) {
  const config = loadConfig(cwd);
  const { task } = loadState(cwd);
  const keys = keyStatus(KEYS.map(([k]) => k));
  const owned = ownedKits() || [];
  const packs = listPacks(cwd);
  const over = projectOverrides(cwd);
  const t = (p) => `${p}?t=${token}`;
  const taskCard = task
    ? `<div class="row"><div class="grow"><div class="name">${esc(task.title)}</div><div class="help">${esc(task.loop || task.size)} loop · ${esc(task.surface)}${task.skipped ? " · checks off for this task" : ""}</div></div></div>
<pre>${esc(checklist(task, config))}</pre>
<div class="actions">${task.skipped ? "" : `<form method="post" action="${t("/task/skip")}"><button class="ghost">Turn checks off for this task</button></form>`}
<form method="post" action="${t("/task/end")}" onsubmit="return confirm('End this Drip task? Its page and files stay.')"><button class="danger">End the task</button></form></div>`
    : `<p class="help" style="margin:0">No task open. Start one by asking for a design (/drip:design in Claude Code).</p>`;
  const keyRows = keys
    .map((k, i) => {
      const purpose = KEYS[i][1];
      const fromEnv = k.set && !/keys\.json/.test(k.from || "");
      return `<div class="row"><div class="grow"><div class="name">${esc(k.name)}</div><div class="help">${esc(purpose)}${fromEnv ? ` · from ${esc(k.from)}` : ""}</div></div>
<span class="pill${k.set ? " on" : ""}">${k.set ? "set" : "not set"}</span>
<form class="inline" method="post" action="${t("/key")}"><input type="hidden" name="name" value="${esc(k.name)}"><input type="password" name="value" autocomplete="off" placeholder="${k.set ? "Replace key" : "Paste key"}" aria-label="${esc(k.name)} key"><button>Save</button>${k.set && !fromEnv ? `<button class="ghost" name="remove" value="1" formnovalidate>Remove</button>` : ""}</form></div>`;
    })
    .join("");
  const switches = SWITCHES.map(([id, label, help, read]) => {
    const on = read(config);
    return `<form class="row" method="post" action="${t("/switch")}"><input type="hidden" name="id" value="${id}"><input type="hidden" name="on" value="${on ? "0" : "1"}">
<div class="grow"><div class="name">${esc(label)}</div><div class="help">${esc(help)}${over.includes(id) ? " This project's own .drip/config.json sets it, so the change applies to other projects." : ""}</div></div>
<label class="switch"><input type="checkbox" role="switch" aria-label="${esc(label)}" ${on ? "checked" : ""} onchange="this.form.submit()"><span></span></label><noscript><button>${on ? "Turn off" : "Turn on"}</button></noscript></form>`;
  }).join("");
  const kits = `<form method="post" action="${t("/kits")}"><div class="kits">${KITS.map((k) => `<label><input type="checkbox" name="kit" value="${esc(k)}" ${owned.includes(k) ? "checked" : ""}> ${esc(k)}</label>`).join("")}</div><button>Save kits</button></form>`;
  const packList = packs.length
    ? packs.map((p) => `<div class="row"><div class="grow"><div class="name">${esc(p.name || p.id)}</div><div class="help">${esc(p.niche || p.summary || "")}</div></div><span class="pill">${esc(p.type || "pack")}</span></div>`).join("")
    : `<p class="help" style="margin:0">No niche packs yet. Ask Drip to learn a niche (/drip:adapt in Claude Code) and it becomes a pack used on every matching task.</p>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drip settings</title><style>${CSS}</style>
<main><header><h1>Drip settings</h1><span class="ver">v${esc(version())}</span></header>
${msg ? `<p class="msg" role="status">${esc(msg)}</p>` : ""}
<section><h2>Current task</h2>${taskCard}</section>
<section><h2>How Drip works</h2>${switches}</section>
<section><h2>API keys</h2><p class="help" style="margin:0 0 14px">All optional. Saved on this computer in <code>~/.drip/keys.json</code>; the model never sees them.</p>${keyRows}</section>
<section><h2>Paid UI kits you own</h2><p class="help" style="margin:0 0 14px">Drip offers their pieces too, installed with your own login.</p>${kits}</section>
<section><h2>Niche packs</h2>${packList}</section>
<section><h2>Install</h2><form method="post" action="${t("/doctor")}"><button class="ghost">Check the install</button></form>${doctor ? `<pre>${esc(doctor)}</pre>` : ""}</section>
<p class="foot">Machine-wide settings live in <code>~/.drip/config.json</code>; a project's <code>.drip/config.json</code> overrides them. This page stops when Drip does.</p></main>`;
}

/** Applies one POST from the page. Returns the message to show. Exported for tests. */
export async function applySettings(route, form, { cwd, runDoctor } = {}) {
  if (route === "/key") {
    const name = String(form.get("name") || "").trim().toLowerCase();
    if (!KEYS.some(([k]) => k === name)) return { msg: "Unknown key." };
    if (form.get("remove")) {
      setKey(name, "");
      return { msg: `Removed the ${name} key.` };
    }
    const value = String(form.get("value") || "").trim();
    if (!value) return { msg: "Paste a key first." };
    setKey(name, value);
    return { msg: `Saved the ${name} key.` };
  }
  if (route === "/switch") {
    const sw = SWITCHES.find(([id]) => id === form.get("id"));
    if (!sw) return { msg: "Unknown setting." };
    const on = form.get("on") === "1";
    writeGlobalConfig(sw[4](on));
    return { msg: `${sw[1]}: ${on ? "on" : "off"}.` };
  }
  if (route === "/kits") {
    const owned = form.getAll("kit").filter((k) => KITS.includes(k));
    saveKits(owned);
    return { msg: owned.length ? `Saved: ${owned.join(", ")}.` : "Saved: no paid kits." };
  }
  if (route === "/task/skip") {
    updateState((st) => {
      if (st.task) st.task.skipped = "the user turned checks off on the settings page";
    }, cwd);
    return { msg: "Checks are off for this task." };
  }
  if (route === "/task/end") {
    updateState((st) => {
      if (!st.task) return;
      st.history.push({ ...st.task, endedAt: new Date().toISOString(), endedBy: "settings page", acceptedOpen: "the user ended the task on the settings page" });
      st.task = null;
      st.history = st.history.slice(-30);
    }, cwd);
    return { msg: "The task is ended. Its page and files are untouched." };
  }
  if (route === "/doctor" && runDoctor) return { msg: "Install checked.", doctor: await runDoctor() };
  return { msg: "" };
}

let running = null;

/** Starts the page (once per process) and returns its URL. ttlMs 0 keeps it up until the process ends. */
export async function openSettingsPage({ cwd, runDoctor, ttlMs = 60 * 60 * 1000 } = {}) {
  if (running) return running.url;
  const token = crypto.randomBytes(16).toString("hex");
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("t") !== token) return res.writeHead(403).end("Forbidden");
    const send = (html) => res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY" }).end(html);
    try {
      if (req.method === "POST") {
        let body = "";
        for await (const c of req) body += c;
        const r = await applySettings(u.pathname, new URLSearchParams(body), { cwd, runDoctor });
        return send(renderSettings({ token, cwd, ...r }));
      }
      send(renderSettings({ token, cwd }));
    } catch (e) {
      send(renderSettings({ token, cwd, msg: `Something went wrong: ${e.message}` }));
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  running = { server, url: `http://127.0.0.1:${server.address().port}/?t=${token}` };
  if (ttlMs) {
    setTimeout(() => {
      server.close();
      running = null;
    }, ttlMs).unref();
  }
  return running.url;
}

/** Opens a URL in the user's default browser (not in tests or CI). */
export function openInBrowser(url) {
  if (process.env.DRIP_NO_OPEN || process.env.CI) return false;
  try {
    const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(cmd, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
    return true;
  } catch {
    return false;
  }
}


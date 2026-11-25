// Drip Film, the server half: frames of the page while the swarm builds it, film.json for the viewer, the viewer served
// on localhost (works from any IDE), and a montage at drip_end (an MP4 too when ffmpeg is installed).
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { addFrame, buildFilm, filmDir, lastChangeAt, readFrames } from "../../core/film.mjs";
import { pluginRoot, projectDripDir } from "../../core/paths.mjs";
import { serveDir } from "../../core/serve.mjs";
import { loadState } from "../../core/state.mjs";
import { safe, text } from "../../core/result.mjs";

const TICK_MS = 5000;
const MIN_GAP_MS = 12000; // at most one frame every 12 s, and only after the page changed
let timer = null;
let lastShot = 0;
let lastBuilt = "";
let busy = false;

async function frame(task, config, caption) {
  if (!task.filmUrl) return null;
  // A dev server that is down or restarting gives the browser's error page: never a frame.
  try {
    const r = await fetch(task.filmUrl, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
  } catch {
    return null;
  }
  const { screenshot } = await import("../fitcheck/chrome.mjs");
  const buf = await screenshot(task.filmUrl, { width: 1440, height: 900, format: "jpeg", quality: 72, waitMs: 2500, config });
  lastShot = Date.now();
  return addFrame(task, buf, { caption });
}

/** One tick: a frame when the page changed since the last one, and film.json when anything changed. */
export async function tick(config) {
  if (busy) return;
  busy = true;
  try {
    const task = loadState().task;
    if (!task || task.film === false) return;
    const changed = lastChangeAt(task);
    const frames = readFrames(filmDir(task.id));
    const lastFrameAt = frames.at(-1)?.t || "";
    if (task.filmUrl && changed && changed > lastFrameAt && Date.now() - lastShot > MIN_GAP_MS) await frame(task, config, "").catch(() => {});
    const d = filmDir(task.id);
    const stamp = ["events.jsonl", "frames.json"].map((f) => {
      try {
        return fs.statSync(path.join(d, f)).mtimeMs;
      } catch {
        return 0;
      }
    }).join("/");
    if (stamp !== lastBuilt) {
      buildFilm(task);
      lastBuilt = stamp;
    }
  } catch {
    /* never in the way */
  } finally {
    busy = false;
  }
}

export function startRecorder(config) {
  if (timer) return;
  timer = setInterval(() => tick(config()), TICK_MS);
  timer.unref();
}

/** The viewer next to film.json: Drip's designed viewer when the plugin has it, else a small built-in one. */
function placeViewer(d) {
  const src = path.join(pluginRoot, "film", "viewer");
  if (fs.existsSync(path.join(src, "index.html"))) {
    for (const f of fs.readdirSync(src)) if (/\.(html|css|js|svg|woff2?)$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(d, f));
    return "designed";
  }
  fs.writeFileSync(path.join(d, "index.html"), FALLBACK);
  return "basic";
}

function openInBrowser(url) {
  if (!/^http:\/\/127\.0\.0\.1:\d+\/index\.html$/.test(url)) return; // only our own local viewer
  const [cmd, args] = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    execFile(cmd, args, { windowsHide: true }, () => {});
  } catch {
    /* no browser: the link is in drip_end's reply */
  }
}

function ffmpeg(args, cwd) {
  return new Promise((res) => execFile("ffmpeg", args, { cwd, windowsHide: true, timeout: 120000 }, (e) => res(!e)));
}

/** drip_end: a last frame, the film closed, the montage (MP4 with ffmpeg). Returns one line for the hand-off. */
export async function finishFilm(task, config) {
  if (!task?.id || task.film === false) return "";
  const d = filmDir(task.id);
  if (!fs.existsSync(path.join(d, "events.jsonl")) && !readFrames(d).length) return "";
  await frame(task, config, "done").catch(() => {});
  const film = buildFilm({ ...task, endedAt: new Date().toISOString() });
  placeViewer(d);
  let mp4 = "";
  if (film.frames.length >= 2 && (await ffmpeg(["-y", "-framerate", "3", "-i", "frames/%04d.jpg", "-vf", "scale=1440:-2,format=yuv420p", "montage.mp4"], d))) mp4 = " and montage.mp4";
  const base = await serveDir(d).catch(() => null);
  // Open the montage for the user when the work is done (any IDE: their default browser). DRIP_FILM_OPEN=0 turns it off.
  if (base && film.frames.length && process.env.DRIP_FILM_OPEN !== "0") openInBrowser(`${base}/index.html`);
  const helpers = film.agents.filter((a) => a.id !== "main");
  return `Film: ${helpers.length} agent(s), ${film.frames.length} frame(s), ${film.events.length} events. Watch the montage: ${base ? `${base}/index.html` : path.relative(process.cwd(), path.join(d, "index.html"))}${mp4 ? ` (${path.join(d, "montage.mp4")})` : ""}. Show the user the link.`;
}

export function register(server, ctx) {
  server.registerTool(
    "drip_film",
    {
      title: "Watch the swarm build the page",
      description:
        "Opens the film of a Drip task: every agent (director, builders, helpers) as a lane with its job and piece, the event feed, and frames of the page as it was built. Live while the task runs; a montage (time-lapse with the agents' timeline) once it ends. " +
        "A plain local page, so it works from any IDE. Give the user the URL at the start of a build so they can watch.",
      inputSchema: { task: z.string().optional().describe("A past task id (default: the open task, else the newest film)") },
    },
    safe(async ({ task: id }) => {
      const cur = loadState().task;
      let d;
      if (id || !cur) {
        const root = path.join(projectDripDir(), "film");
        const all = fs.existsSync(root) ? fs.readdirSync(root).map((f) => ({ f, t: fs.statSync(path.join(root, f)).mtimeMs })).sort((a, b) => b.t - a.t) : [];
        const pick = id ? all.find((x) => x.f === id) : all[0];
        if (!pick) return text(id ? `No film for task ${id}.` : "No films yet: one starts with the next Drip task.", true);
        d = path.join(root, pick.f);
      } else {
        d = filmDir(cur.id);
        fs.mkdirSync(d, { recursive: true });
        buildFilm(cur);
      }
      const kind = placeViewer(d);
      const base = await serveDir(d);
      let film = {};
      try {
        film = JSON.parse(fs.readFileSync(path.join(d, "film.json"), "utf8"));
      } catch {
        /* empty film */
      }
      const live = !film.task?.endedAt;
      return text(
        `${live ? "Live" : "Montage"}: ${base}/index.html (${kind} viewer). ${(film.agents || []).length} agent(s), ${(film.frames || []).length} frame(s) so far.${live ? " It updates every few seconds; frames come once the page is served (drip_serve) and changes." : ""} Give the user the link.`,
      );
    }),
  );
}

const FALLBACK = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drip Film</title>
<style>:root{color-scheme:dark}body{margin:0;background:#0c0d10;color:#e8e9ec;font:14px/1.45 system-ui,sans-serif;display:grid;grid-template-columns:320px 1fr;height:100vh}
aside{border-right:1px solid #22252c;overflow:auto;padding:16px}main{display:grid;grid-template-rows:1fr auto;min-width:0}
.a{padding:10px 12px;border:1px solid #22252c;border-radius:10px;margin-bottom:8px}.a b{display:block}.m{color:#8b90a0;font-size:12px}
.working{border-color:#3d6bff}img{max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto}#stage{display:grid;place-items:center;overflow:hidden;padding:16px}
#bar{display:flex;gap:12px;align-items:center;padding:12px 16px;border-top:1px solid #22252c}input[type=range]{flex:1}button{background:#1b1e25;color:inherit;border:1px solid #2b2f38;border-radius:8px;padding:6px 12px}</style></head>
<body><aside><h3 id="title">Drip Film</h3><div id="agents"></div><h4>Events</h4><div id="events" class="m"></div></aside>
<main><div id="stage"><p class="m">Waiting for the first frame…</p></div><div id="bar"><button id="play">Play</button><input id="scrub" type="range" min="0" max="0" value="0"><span id="cap" class="m"></span></div></main>
<script>
const q=new URLSearchParams(location.search).get("film")||"film.json";let film=null,i=0,playing=false;
const $=(s)=>document.querySelector(s);
function show(n){if(!film||!film.frames.length)return;i=Math.max(0,Math.min(n,film.frames.length-1));const f=film.frames[i];$("#stage").innerHTML='<img src="'+f.file+'">';$("#scrub").value=i;$("#cap").textContent=(i+1)+"/"+film.frames.length+" · "+new Date(f.t).toLocaleTimeString()+" · "+(f.agents||[]).length+" working";}
function render(){$("#title").textContent=film.task.title;$("#agents").innerHTML=film.agents.map(a=>'<div class="a '+a.status+'"><b>'+a.label+'</b><span class="m">'+a.type+' · '+a.model+' · '+a.status+'</span><div class="m">'+(a.job||"")+'</div></div>').join("");
$("#events").innerHTML=film.events.slice(-40).reverse().map(e=>'<div>'+new Date(e.t).toLocaleTimeString()+' '+e.summary+'</div>').join("");$("#scrub").max=Math.max(0,film.frames.length-1);if(!playing)show(film.task.endedAt?0:film.frames.length-1);}
async function load(){try{film=await (await fetch(q+"?"+Date.now())).json();render();}catch(e){}if(!film||!film.task.endedAt)setTimeout(load,2000);}
$("#scrub").oninput=(e)=>show(+e.target.value);$("#play").onclick=()=>{playing=!playing;$("#play").textContent=playing?"Pause":"Play";(function step(){if(!playing)return;show(i+1>=film.frames.length?0:i+1);setTimeout(step,350);})();};
load();
</script></body></html>`;

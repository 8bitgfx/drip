// Drip Film, the server half: frames of the page while the swarm builds it, film.json for the viewer, the viewer served
// on localhost (works from any IDE), and a montage at drip_end (an MP4 too when ffmpeg is installed).
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Jimp } from "jimp";
import { z } from "zod";
import { addFrame, buildFilm, filmDir, lastChangeAt, pendingTargets, readFrames, readJsonIn, saveTargets } from "../../core/film.mjs";
import { filmViewerDir, projectDripDir } from "../../core/paths.mjs";
import { openInBrowser } from "../../core/localpage.mjs";
import { openPage, withTab } from "../../core/browser.mjs";
import { serveDir } from "../../core/serve.mjs";
import { filmFlush } from "./record.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { safe, text } from "../../core/result.mjs";

const TICK_MS = 5000;
const MIN_GAP_MS = 12000; // at most one frame every 12 s, and only after the page changed
const RETRY_MS = 8000; // a skipped frame (error overlay, blank, loading) is tried again soon
const VIEW_W = 1440;
const VIEW_H = 900;
const FRAME_W = 720; // frames are the whole page at half scale: sections appear as they are added
const MAX_PAGE_H = 14000; // CSS px; longer pages are cut (the frame stays under ~7000 px tall)
let timer = null;
let lastShot = 0;
let shotFor = ""; // the change the last kept (or unchanged) frame showed: not shot again
let lastBuilt = "";
let busy = false;

// What the page shows right now: a dev server's error overlay (Vite, Next), still loading, or how much content.
const FRAME_PROBE = `(() => {
  const b = document.body;
  const text = b ? (b.innerText || '').trim() : '';
  const portal = document.querySelector('nextjs-portal');
  const pr = portal && portal.shadowRoot;
  const nextErr = !!(pr && pr.querySelector('[data-nextjs-dialog], [data-nextjs-dialog-overlay], [data-nextjs-error-overlay], .nextjs-container-errors-header, .nextjs-container-build-error'));
  const error = !!document.querySelector('vite-error-overlay') || nextErr || /^(Unhandled Runtime Error|Failed to compile|Build Error|Internal Server Error|\\[plugin:vite)/.test(text.slice(0, 200));
  const root = document.querySelector('#root, #__next, #app');
  const media = document.querySelectorAll('img, svg, canvas, video, picture').length;
  const loading = document.readyState !== 'complete' || !!(root && root.children.length === 0) || (text.length < 40 && /loading/i.test(text));
  return { error, loading, text: text.length, media, height: document.documentElement.scrollHeight };
})()`;

// Scroll through once so lazy pictures and scroll-triggered reveals render, then back to the top.
const SCROLL_THROUGH = "(async()=>{const h=document.documentElement.scrollHeight;const step=Math.max(innerHeight*0.8,h/30);for(let y=0;y<h;y+=step){scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}scrollTo(0,0);await new Promise(r=>setTimeout(r,300));})()";

// Where each write landed: for each { key, hints }, the element the hints name (data-section, id, landmark tag, a class
// that says it), its selector and its box in page CSS px.
const BOXES = (items) => `((items) => {
  const H = document.documentElement.scrollHeight;
  const ok = (el) => { const r = el.getBoundingClientRect(); return r.width >= 40 && r.height >= 16 && !(el === document.body || el === document.documentElement || el.matches('#root, #__next, #app, main')) ? r : null; };
  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
  const path = (el) => {
    if (el.id) return '#' + esc(el.id);
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 5; e = e.parentElement) {
      if (e.id) { parts.unshift('#' + esc(e.id)); break; }
      const same = e.parentElement ? [...e.parentElement.children].filter((c) => c.tagName === e.tagName) : [e];
      parts.unshift(e.tagName.toLowerCase() + (same.length > 1 ? ':nth-of-type(' + (same.indexOf(e) + 1) + ')' : ''));
    }
    return parts.join(' > ');
  };
  const find = (h) => {
    const tries = ['[data-section="' + h + '" i]', '#' + esc(h), '[id="' + h + '" i]', '[data-component="' + h + '" i]', '[aria-label="' + h + '" i]'];
    if (['header', 'nav', 'footer', 'main'].includes(h)) tries.push(h);
    for (const s of tries) { let el = null; try { el = document.querySelector(s); } catch (e) { el = null; } if (el && ok(el)) return el; }
    const words = h.split('-').filter((w) => w.length > 2);
    let best = null, area = 0;
    for (const el of document.querySelectorAll('section, header, footer, nav, main > *, body > div > *, [id], [class]')) {
      const name = ((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
      if (!name.includes(h) && !(words.length > 1 && words.every((w) => name.includes(w)))) continue;
      const r = ok(el);
      if (!r || r.width < innerWidth * 0.3 || r.height > H * 0.95) continue; // a wrapper around everything says nothing
      if (r.width * r.height > area) { area = r.width * r.height; best = el; }
    }
    return best;
  };
  const out = {};
  for (const it of items) {
    for (const h of it.hints) {
      const el = find(h);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[it.key] = { selector: path(el), hint: h, x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
      break;
    }
  }
  return out;
})(${JSON.stringify(items)})`;

/** Why a frame must not be kept (null = keep): an error overlay, a page still loading, or a blank (nearly one flat colour). */
export function frameVerdict(probe, flat) {
  if (!probe) return "no page";
  if (probe.error) return "error overlay";
  if (probe.loading) return "still loading";
  if (flat >= 0.985 || (probe.text < 3 && !probe.media)) return "blank";
  return null;
}

/** The share of the picture taken by its most common colour (0..1), on a small copy. 1 = one flat colour. */
export async function flatShare(buf) {
  const img = await Jimp.read(buf);
  img.resize({ w: 48, h: Math.max(1, Math.round((48 * img.height) / img.width)) });
  const counts = new Map();
  const { data, width, height } = img.bitmap;
  for (let i = 0; i < width * height * 4; i += 4) {
    const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return Math.max(...counts.values()) / (width * height);
}

/** The whole page at FRAME_W wide, or { skip } with the reason. boxes: where the pending writes are, in page CSS px. */
export async function shootPage(url, items, config) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    const run = async (expression, awaitPromise = false) => (await s("Runtime.evaluate", { expression, awaitPromise, returnByValue: true })).result?.value;
    await openPage(tab, url, { width: VIEW_W, height: VIEW_H, idle: true, settleMs: 1200 });
    let probe = await run(FRAME_PROBE);
    // A page still compiling or hydrating gets a few seconds.
    for (let i = 0; i < 6 && probe && (probe.loading || probe.error); i++) {
      await new Promise((r) => setTimeout(r, 800));
      probe = await run(FRAME_PROBE);
    }
    if (!probe || probe.error || probe.loading) return { skip: frameVerdict(probe, 0) };
    await run(SCROLL_THROUGH, true);
    probe = (await run(FRAME_PROBE)) || probe;
    if (probe.error) return { skip: "error overlay" };
    const boxes = items.length ? (await run(BOXES(items))) || {} : {};
    const total = Math.max(VIEW_H, Math.min(probe.height || VIEW_H, MAX_PAGE_H));
    const scale = FRAME_W / VIEW_W;
    const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: VIEW_W, height: total, scale } });
    return { buf: Buffer.from(data, "base64"), probe, boxes, scale, width: FRAME_W, height: Math.round(total * scale), pageHeight: probe.height };
  });
}

/** One frame of the page, kept only when it is a real page (not an error overlay, blank or loading) and it changed. */
async function frame(task, config, caption, change = "") {
  if (!task.filmUrl) return null;
  lastShot = Date.now() - MIN_GAP_MS + RETRY_MS; // a failed or skipped attempt tries again in RETRY_MS
  // A dev server that is down or restarting gives the browser's error page: never a frame.
  try {
    const r = await fetch(task.filmUrl, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
  } catch {
    return null;
  }
  const items = pendingTargets(task);
  const shot = await shootPage(task.filmUrl, items, config).catch(() => ({ skip: "browser failed" }));
  const d = filmDir(task.id);
  const why = shot.skip || frameVerdict(shot.probe, await flatShare(shot.buf).catch(() => 0));
  if (why) {
    // never a frame; counted in skipped.json so a film with few frames can say why
    try {
      const skipped = readJsonIn(d, "skipped.json", {});
      skipped[why] = (skipped[why] || 0) + 1;
      fs.writeFileSync(path.join(d, "skipped.json"), JSON.stringify(skipped));
    } catch {
      /* bookkeeping only */
    }
    return null;
  }
  const prev = readFrames(d).at(-1);
  const hash = crypto.createHash("sha1").update(shot.buf).digest("hex").slice(0, 16);
  lastShot = Date.now();
  shotFor = change;
  if (prev?.hash === hash) return null; // the same page as the last frame
  const file = addFrame(task, shot.buf, { caption, width: shot.width, height: shot.height, scale: shot.scale, pageHeight: shot.pageHeight, url: task.filmUrl });
  const frames = readFrames(d);
  frames.at(-1).hash = hash;
  fs.writeFileSync(path.join(d, "frames.json"), JSON.stringify(frames));
  // Boxes at the frame's scale, so the viewer can draw them on the frame as it is.
  const found = {};
  for (const [key, b] of Object.entries(shot.boxes || {})) found[key] = { selector: b.selector, hint: b.hint, x: Math.round(b.x * shot.scale), y: Math.round(b.y * shot.scale), w: Math.round(b.w * shot.scale), h: Math.round(b.h * shot.scale), frame: file };
  saveTargets(task, found, items.map((i) => i.key).filter((k) => !found[k]));
  return file;
}

/** One recorder per task: several Drip servers can run on one project (two sessions, an IDE and a CLI) and each would
 *  shoot the same page. Only the server holding the claim takes frames; a claim not renewed for 30 s is free. */
export function claimRecorder(task, me = String(process.pid)) {
  const f = path.join(filmDir(task.id), "recorder.json");
  try {
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    if (c.pid !== me && Date.now() - c.at < 30000) return false;
  } catch {
    /* free */
  }
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ pid: me, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
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
    if (task.filmUrl && claimRecorder(task) && changed && changed > lastFrameAt && changed !== shotFor && Date.now() - lastShot > MIN_GAP_MS) await frame(task, config, "", changed).catch(() => {});
    const d = filmDir(task.id);
    const stamp = ["events.jsonl", "frames.json", "targets.json"].map((f) => {
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
  const src = filmViewerDir;
  if (fs.existsSync(path.join(src, "index.html"))) {
    for (const f of fs.readdirSync(src)) if (/\.(html|css|js|svg|woff2?)$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(d, f));
    return "designed";
  }
  fs.writeFileSync(path.join(d, "index.html"), FALLBACK);
  return "basic";
}

/** Opens our own local viewer only (no browser: the link is in drip_end's reply). */
const openViewer = (url) => /^http:\/\/127\.0\.0\.1:\d+\/index\.html$/.test(url) && openInBrowser(url);

/** drip_start: the live film, opened in the user's browser once per task (never in tests or CI; DRIP_FILM_OPEN=0 turns it
 *  off). Returns { url, opened } (url "" when there is none). The viewer polls film.json, so it follows the task. */
export async function openLiveFilm(task) {
  if (!task?.id || task.film === false) return { url: "", opened: false };
  const d = filmDir(task.id);
  fs.mkdirSync(d, { recursive: true });
  buildFilm(task);
  placeViewer(d);
  const base = await serveDir(d).catch(() => null);
  if (!base) return { url: "", opened: false };
  const url = `${base}/index.html`;
  const quiet = process.env.DRIP_FILM_OPEN === "0" || process.env.NODE_TEST_CONTEXT || process.env.CI;
  const opened = !task.filmOpened && !quiet && openViewer(url);
  if (opened)
    updateState((st) => {
      if (st.task?.id === task.id) st.task.filmOpened = true;
    });
  return { url, opened };
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
  await filmFlush(); // thumbnails still being made
  const film = buildFilm({ ...task, endedAt: new Date().toISOString() });
  placeViewer(d);
  let mp4 = "";
  if (film.frames.length >= 2 && (await ffmpeg(["-y", "-framerate", "3", "-i", "frames/%04d.jpg", "-vf", "scale=1440:-2,format=yuv420p", "montage.mp4"], d))) mp4 = " and montage.mp4";
  const base = await serveDir(d).catch(() => null);
  // Open the montage for the user when the work is done (any IDE: their default browser). DRIP_FILM_OPEN=0 turns it off.
  if (base && film.frames.length && process.env.DRIP_FILM_OPEN !== "0") openViewer(`${base}/index.html`);
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

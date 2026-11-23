// Full-page capture and a measured page audit through the Chrome DevTools Protocol (no Puppeteer:
// the user's Chrome/Edge + Node's built-in WebSocket). Used by fitcheck_shot and critic_prepare so
// judgements see the WHOLE page and rest on measured facts, not just the first screen.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { browserEnv, findChrome } from "../modules/fitcheck/chrome.mjs";

async function launch(config) {
  const chrome = findChrome(config);
  if (!chrome) throw new Error("Chrome/Edge not found. Install Chrome or set fitcheck.chromePath in .drip/config.json.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cdp-"));
  const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], {
    env: browserEnv(),
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("Browser did not start (no DevTools endpoint).")), 20000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(t);
        resolve(m[1]);
      }
    });
    proc.on("exit", () => reject(new Error("Browser exited early.")));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = () => j(new Error("Couldn't connect to the browser."));
  });
  let id = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else for (const l of listeners) l(msg);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      waiting.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const close = async () => {
    try {
      await send("Browser.close");
    } catch {
      /* already gone */
    }
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    proc.kill();
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        /* locked on Windows for a moment; best-effort */
      }
    }, 500).unref();
  };
  return { send, close, listeners };
}

/** The audit script, run inside the page. Returns plain JSON. */
const AUDIT = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const textEls = [...document.querySelectorAll('body *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && visible(el));
  const sizes = {}, families = {}, weights = {};
  let small = 0, words = 0;
  for (const el of textEls) {
    const cs = getComputedStyle(el); const s = Math.round(parseFloat(cs.fontSize));
    const n = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join(' ').trim().split(/\\s+/).length;
    sizes[s] = (sizes[s] || 0) + n; words += n;
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); families[fam] = (families[fam] || 0) + n;
    weights[cs.fontWeight] = (weights[cs.fontWeight] || 0) + n;
    if (s < 14) small += n;
  }
  const doc = document.documentElement;
  const overflowX = doc.scrollWidth > vw + 1;
  const offenders = overflowX ? [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && visible(el); }).slice(0, 6).map((el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '') + ' ' + Math.round(el.getBoundingClientRect().right) + 'px')) : [];
  // Empty bands: vertical stretches with no visible text, image or control.
  const marks = [...document.querySelectorAll('body *')].filter((el) => visible(el) && (/^(IMG|SVG|CANVAS|VIDEO|PICTURE|BUTTON|INPUT|TEXTAREA|SELECT|IFRAME)$/i.test(el.tagName) || textEls.includes(el))).map((el) => { const r = el.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; }).sort((a, b) => a[0] - b[0]);
  const gaps = []; let end = 0;
  for (const [t, b] of marks) { if (t - end > vh * 0.6) gaps.push([Math.round(end), Math.round(t)]); end = Math.max(end, b); }
  if (doc.scrollHeight - end > vh * 0.6) gaps.push([Math.round(end), doc.scrollHeight]);
  const media = [...document.querySelectorAll('img, picture, video, canvas, svg')].filter((el) => { const r = el.getBoundingClientRect(); return visible(el) && r.width * r.height > 120 * 120; }).length;
  const h1 = document.querySelector('h1'); const h1s = h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null;
  const bodyP = [...document.querySelectorAll('p')].filter(visible).map((p) => Math.round(parseFloat(getComputedStyle(p).fontSize)));
  const medianP = bodyP.length ? bodyP.sort((a, b) => a - b)[Math.floor(bodyP.length / 2)] : null;
  return { width: vw, height: doc.scrollHeight, screens: +(doc.scrollHeight / vh).toFixed(1), overflowX, scrollWidth: doc.scrollWidth, offenders,
    fontSizes: Object.entries(sizes).sort((a, b) => b[1] - a[1]).map(([s, n]) => [+s, n]), families: Object.entries(families).sort((a, b) => b[1] - a[1]), weights: Object.keys(weights).length,
    words, smallShare: words ? +(small / words).toFixed(2) : 0, gaps, media, h1: h1s, bodyText: medianP, title: document.title };
})()`;

/**
 * Open `url` at `width` x `height`, return { audit, slices: [Buffer jpeg…] } where slices cover the whole page,
 * one viewport each (max `maxSlices`, evenly spaced if the page is longer).
 */
export async function capture(url, { width = 1440, height = 900, maxSlices = 6, quality = 78, config } = {}) {
  const b = await launch(config);
  try {
    const { targetId } = await b.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await b.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m, p) => b.send(m, p, sessionId);
    await s("Page.enable");
    await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    if (width < 600) await s("Emulation.setTouchEmulationEnabled", { enabled: true });
    const loaded = new Promise((r) => {
      const l = (msg) => {
        if (msg.method === "Page.loadEventFired" && msg.sessionId === sessionId) {
          b.listeners.delete(l);
          r();
        }
      };
      b.listeners.add(l);
      setTimeout(r, 15000);
    });
    await s("Page.navigate", { url });
    await loaded;
    await new Promise((r) => setTimeout(r, 1200)); // fonts, entrance animations
    // Scroll through once so lazy content and scroll-triggered reveals render, then back to the top.
    await s("Runtime.evaluate", { expression: "(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}scrollTo(0,0);await new Promise(r=>setTimeout(r,300));})()", awaitPromise: true });
    const { result } = await s("Runtime.evaluate", { expression: AUDIT, returnByValue: true });
    const audit = result.value;
    const total = Math.min(audit.height, 30000);
    const count = Math.max(1, Math.ceil(total / height));
    const picks = count <= maxSlices ? [...Array(count).keys()] : [...Array(maxSlices).keys()].map((i) => Math.round((i * (count - 1)) / (maxSlices - 1)));
    const slices = [];
    for (const i of picks) {
      const y = Math.min(i * height, Math.max(0, total - height));
      const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: true, clip: { x: 0, y, width, height: Math.min(height, total - y), scale: 1 } });
      slices.push({ y, buf: Buffer.from(data, "base64") });
    }
    return { audit, slices, sliceCount: count };
  } finally {
    await b.close();
  }
}

/** Hard problems in an audit (block a pass) and softer warnings. */
export function judgeAudit(a, kind = "page") {
  const blockers = [];
  const warnings = [];
  if (a.overflowX) blockers.push(`horizontal overflow at ${a.width}px: page is ${a.scrollWidth}px wide (${a.offenders.join(", ") || "unknown element"})`);
  const sizes = a.fontSizes.filter(([, n]) => n >= 2).length;
  if (sizes > 8) blockers.push(`${sizes} different text sizes; a type scale has 4-6 (drip_guide type)`);
  else if (sizes > 6) warnings.push(`${sizes} text sizes; tighten to 4-6`);
  const fams = a.families.filter(([, n]) => n >= 3);
  if (fams.length > 3) blockers.push(`${fams.length} font families (${fams.map(([f]) => f).join(", ")}); use one pairing`);
  if (a.smallShare > 0.3) blockers.push(`${Math.round(a.smallShare * 100)}% of the words are under 14px; body and UI text is too small`);
  else if (a.smallShare > 0.15) warnings.push(`${Math.round(a.smallShare * 100)}% of words under 14px`);
  if (a.bodyText && a.bodyText < (a.width < 600 ? 16 : 16)) warnings.push(`typical paragraph size ${a.bodyText}px; marketing body text reads best at 17-20px`);
  const monoShare = a.families.filter(([f]) => /mono|courier|code/i.test(f)).reduce((t, [, n]) => t + n, 0) / Math.max(1, a.words);
  if (monoShare > 0.4) warnings.push(`${Math.round(monoShare * 100)}% of the text is monospace; mono for reading text is hard work and a default "developer" look`);
  const bigGaps = a.gaps.filter(([t, b]) => b - t > 900);
  if (bigGaps.length) warnings.push(`${bigGaps.length} empty stretch(es) taller than a screen: ${bigGaps.map(([t, b]) => `${t}-${b}px`).join(", ")}`);
  if (kind === "page" && a.media === 0) warnings.push("no images, video or illustration anywhere on the page");
  return { blockers, warnings };
}

export function formatAudit(a, j) {
  return (
    `${a.width}px: ${a.screens} screens tall · text sizes ${a.fontSizes.slice(0, 8).map(([s, n]) => `${s}px×${n}`).join(" ")} · families ${a.families.map(([f, n]) => `${f}×${n}`).join(", ")} · ` +
    `${Math.round(a.smallShare * 100)}% words <14px · h1 ${a.h1 ?? "-"}px · paragraphs ${a.bodyText ?? "-"}px · media ${a.media}` +
    (j.blockers.length ? `\n  BLOCKERS: ${j.blockers.join(" | ")}` : "") +
    (j.warnings.length ? `\n  warnings: ${j.warnings.join(" | ")}` : "")
  );
}

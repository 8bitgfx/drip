// One headless Chrome/Edge for the whole MCP server, driven over the DevTools Protocol.
// Launching a browser costs 1.5-3 s on Windows; every screenshot used to pay it. Now the first shot
// launches it, later shots open a tab in it (~100 ms), and it closes itself after ten idle minutes.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { browserEnv, findChrome } from "./chrome.mjs";

const IDLE_MS = 10 * 60000; // a design loop pauses for the user often; relaunching costs 1.5-3 s
const SEND_TIMEOUT_MS = 45000;

let shared = null; // Promise<browser>
let idleTimer = null;
let busy = 0;

async function launch(config) {
  const chrome = findChrome(config);
  if (!chrome) throw new Error("Chrome/Edge not found. Install Chrome or set fitcheck.chromePath in .drip/config.json.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "drip-cdp-"));
  const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking", "--disable-sync", "--mute-audio", ...(process.platform === "linux" && (process.env.CI || process.getuid?.() === 0) ? ["--no-sandbox"] : []), `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], {
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
  let dead = false;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject, timer } = waiting.get(msg.id);
      clearTimeout(timer);
      waiting.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else for (const l of listeners) l(msg);
  };
  const die = () => {
    if (dead) return;
    dead = true;
    for (const { reject, timer } of waiting.values()) {
      clearTimeout(timer);
      reject(new Error("The browser closed."));
    }
    waiting.clear();
    try {
      proc.kill();
    } catch {
      /* gone */
    }
    setTimeout(() => {
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch {
        /* locked on Windows for a moment; best-effort */
      }
    }, 500).unref();
  };
  ws.onclose = die;
  proc.on("exit", die);
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      if (dead) return reject(new Error("The browser closed."));
      const mid = ++id;
      const timer = setTimeout(() => {
        waiting.delete(mid);
        reject(new Error(`Browser timed out on ${method}.`));
      }, SEND_TIMEOUT_MS);
      waiting.set(mid, { resolve, reject, timer });
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
    die();
  };
  return { send, close, listeners, isDead: () => dead };
}

async function getBrowser(config) {
  if (shared) {
    const b = await shared.catch(() => null);
    if (b && !b.isDead()) return b;
    shared = null;
  }
  shared = launch(config);
  shared.catch(() => (shared = null));
  return shared;
}

/** Start the browser in the background (drip_start does this: the first shot then costs ~100 ms). */
export function warmBrowser(config) {
  getBrowser(config)
    .then(() => {
      if (!busy) {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(closeBrowser, IDLE_MS);
        idleTimer.unref();
      }
    })
    .catch(() => {});
}

export async function closeBrowser() {
  clearTimeout(idleTimer);
  const p = shared;
  shared = null;
  if (p) (await p.catch(() => null))?.close();
}
process.once("exit", () => {
  if (shared) shared.then((b) => b.close()).catch(() => {});
});
// The MCP client closing stdin ends the server; take the browser with it.
process.stdin.once("end", () => closeBrowser());

/**
 * Run `fn` with a fresh tab in the shared browser. `fn` gets { s, sessionId, listeners }:
 * s(method, params) sends a command to the tab. The tab closes afterwards.
 */
export async function withTab(config, fn) {
  busy++;
  clearTimeout(idleTimer);
  try {
    let b = await getBrowser(config);
    let targetId;
    try {
      ({ targetId } = await b.send("Target.createTarget", { url: "about:blank" }));
    } catch {
      // A browser that died between calls: start a new one once.
      await closeBrowser();
      b = await getBrowser(config);
      ({ targetId } = await b.send("Target.createTarget", { url: "about:blank" }));
    }
    try {
      const { sessionId } = await b.send("Target.attachToTarget", { targetId, flatten: true });
      return await fn({ s: (m, p) => b.send(m, p, sessionId), sessionId, listeners: b.listeners });
    } finally {
      b.send("Target.closeTarget", { targetId }).catch(() => {});
    }
  } finally {
    busy--;
    if (!busy) {
      idleTimer = setTimeout(closeBrowser, IDLE_MS);
      idleTimer.unref();
    }
  }
}

/**
 * Size the tab, load `url`, and wait until it is ready to look at: the load event (max `timeout`),
 * web fonts, then running entrance animations (max `settleMs`), instead of a fixed sleep.
 */
export async function openPage({ s, sessionId, listeners }, url, { width = 1440, height = 900, dark = false, timeout = 12000, settleMs = 1500, idle = false } = {}) {
  await s("Page.enable");
  await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  if (width < 600) await s("Emulation.setTouchEmulationEnabled", { enabled: true });
  // Pin the media features so a page renders the same on every machine: Windows Server (CI) and machines with
  // animations turned off report prefers-reduced-motion: reduce, which hides the motion we measure and judge.
  await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }, { name: "prefers-reduced-motion", value: "no-preference" }] });
  let onLoad;
  let timer;
  const loaded = new Promise((r) => {
    onLoad = (msg) => {
      if (msg.method === "Page.loadEventFired" && msg.sessionId === sessionId) r();
    };
    listeners.add(onLoad);
    timer = setTimeout(r, timeout);
  });
  // Apps fetch their content after the load event: with `idle`, also wait for the network to go quiet.
  let inflight = 0;
  let lastNet = Date.now();
  const onNet = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Network.requestWillBeSent") inflight++;
    else if (msg.method === "Network.loadingFinished" || msg.method === "Network.loadingFailed") inflight = Math.max(0, inflight - 1);
    else return;
    lastNet = Date.now();
  };
  if (idle) {
    listeners.add(onNet);
    await s("Network.enable");
  }
  // What went wrong in the page (uncaught errors, console.error): a page that renders blank says why.
  const errors = [];
  const onErr = (msg) => {
    if (msg.sessionId !== sessionId || errors.length >= 8) return;
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params?.exceptionDetails || {};
      errors.push(String(d.exception?.description || d.text || "uncaught error").split("\n")[0].slice(0, 220));
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      errors.push(String((msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ")).split("\n")[0].slice(0, 220));
    }
  };
  listeners.add(onErr);
  await s("Runtime.enable").catch(() => {});
  // Smooth scrolling animates every scrollTo: the audit would measure the page mid-scroll (a nav "over" the hero, an h1 at a
  // negative top). Scrolling jumps for as long as the tab is open, on every page it loads.
  await s("Page.addScriptToEvaluateOnNewDocument", { source: NO_SMOOTH }).catch(() => {});
  try {
    await s("Page.navigate", { url });
    await loaded;
    await s("Runtime.evaluate", { expression: NO_SMOOTH }).catch(() => {});
    if (idle) {
      const end = Date.now() + 8000;
      while (Date.now() < end && !(inflight <= 1 && Date.now() - lastNet > 600)) await new Promise((r) => setTimeout(r, 100));
    }
  } finally {
    listeners.delete(onLoad);
    listeners.delete(onNet);
    clearTimeout(timer);
  }
  await settle(s, settleMs);
  listeners.delete(onErr);
  return { errors };
}

/** Run in the page: scrolling jumps instead of gliding (CSS scroll-behavior, Lenis), so measurements are taken at rest. */
export const NO_SMOOTH = `(() => {
  const put = () => {
    if (!document.documentElement || document.getElementById('drip-no-smooth')) return;
    const st = document.createElement('style'); st.id = 'drip-no-smooth';
    st.textContent = 'html, body, * { scroll-behavior: auto !important; }';
    (document.head || document.documentElement).appendChild(st);
  };
  put(); document.addEventListener('DOMContentLoaded', put);
  try { if (window.lenis && window.lenis.destroy) window.lenis.destroy(); } catch (e) {}
  try { if (window.locomotiveScroll && window.locomotiveScroll.destroy) window.locomotiveScroll.destroy(); } catch (e) {}
})()`;

/** Wait for web fonts and finite running animations, capped at `ms`. */
export async function settle(s, ms = 1500) {
  await s("Runtime.evaluate", {
    expression: `(async () => {
      const cap = new Promise((r) => setTimeout(r, ${ms}));
      // fonts.ready resolves early if layout has not asked for the web fonts yet: lay out first, then wait
      // for every face that is loading (Google Fonts' swap would otherwise be caught on the fallback).
      document.body && document.body.offsetHeight;
      await new Promise((r) => requestAnimationFrame(r));
      const fontsDone = (async () => {
        for (let i = 0; i < 3 && document.fonts; i++) {
          await document.fonts.ready;
          const pending = [...document.fonts].filter((f) => f.status === 'loading');
          if (!pending.length) break;
          await Promise.all(pending.map((f) => f.loaded.catch(() => {})));
        }
      })();
      await Promise.race([fontsDone, new Promise((r) => setTimeout(r, Math.max(${ms}, 2500)))]);
      const running = (document.getAnimations ? document.getAnimations() : []).filter((a) => { const t = a.effect && a.effect.getComputedTiming(); return t && t.iterations !== Infinity && a.playState === 'running'; });
      await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => {}))), cap]);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`,
    awaitPromise: true,
  });
}
export { findChrome } from "./chrome.mjs";

/** Evaluate `expression` in the tab (awaiting promises) and return its JSON value; page exceptions become Errors. */
export async function evalJson(s, expression) {
  const { result, exceptionDetails } = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split("\n")[0] || exceptionDetails.text || "page script failed");
  return result.value;
}

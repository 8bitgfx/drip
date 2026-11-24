// Drives a page for the patterns tools: load at a size, install the measuring library, run interaction
// steps with real input, and after each step take a cropped screenshot plus a snapshot of what changed.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { evalJson, openPage, settle, withTab } from "../../core/browser.mjs";
import { STEP_KINDS, runStep } from "../../core/cdp.mjs";
import { ensureProjectDrip, projectDir } from "../../core/paths.mjs";
import { serveDir, toUrl } from "../../core/serve.mjs";
import { runAxe } from "./diff.mjs";
import { installLib } from "./pagelib.mjs";

export const SIZES = [375, 768, 1440];

/** An interaction step: the same shape as fitcheck_shot's steps, plus press / release / focus. */
export const PSTEP = z.object({
  do: z.enum(STEP_KINDS),
  selector: z.string().optional().describe("CSS selector of the element to act on"),
  to: z.union([z.string(), z.object({ x: z.number(), y: z.number() })]).optional(),
  text: z.string().optional().describe("type: the text; key: Enter, Escape, Tab, ArrowDown, ArrowUp, Space, Home, End"),
  y: z.number().optional(),
  ms: z.number().optional(),
  label: z.string().optional().describe("What this state shows, e.g. 'open', 'hover on item 2'"),
});

const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;
export const isImagePath = (p) => IMAGE.test(p || "");

/** Resolve what the user pointed at to a URL the browser can open. Local .html is served; images are screenshots. */
export async function resolveTarget({ url, file, html, css, js, dir }) {
  if (html !== undefined) {
    const base = dir || path.join(ensureProjectDrip(), "cache", `harness-${Date.now().toString(36)}`);
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(path.join(base, "index.html"), harness({ html, css, js }));
    return { url: `${await serveDir(base)}/index.html`, kind: "local", file: path.join(base, "index.html") };
  }
  const t = url || file;
  if (!t) throw new Error("Give url, file or html.");
  if (!/^https?:/i.test(t) && isImagePath(t)) return { kind: "screenshot", file: path.resolve(projectDir(), t) };
  return { url: await toUrl(t), kind: /^https?:/i.test(t) ? "live" : "local", file: /^https?:/i.test(t) ? undefined : path.resolve(projectDir(), t) };
}

/** A minimal page for plain HTML/CSS/JS: neutral reset, nothing that would change the component's own look. */
export function harness({ html, css = "", js = "" }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drip pattern preview</title><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:24px;font-family:system-ui,sans-serif}${css}</style></head><body>${html}${js ? `<script>${js}</script>` : ""}</body></html>`;
}

const diffSnap = (a, b) => {
  const changes = [];
  const appeared = [];
  const disappeared = [];
  for (const [k, n] of Object.entries(b.nodes)) {
    const o = a.nodes[k];
    if (!o) {
      if (n.v) appeared.push({ target: n.d, rect: n.r });
      continue;
    }
    if (!o.v && n.v) appeared.push({ target: n.d, rect: n.r });
    else if (o.v && !n.v) disappeared.push({ target: n.d });
    if (!o.v && !n.v) continue;
    const props = {};
    for (const p of new Set([...Object.keys(o.p), ...Object.keys(n.p)])) if (o.p[p] !== n.p[p]) props[p] = [o.p[p] ?? "none", n.p[p] ?? "none"];
    for (const f of ["w", "h"]) if (Math.abs(o.r[f] - n.r[f]) >= 1) props[f === "w" ? "width" : "height"] = [`${o.r[f]}px`, `${n.r[f]}px`];
    if (o.v && n.v && (Math.abs(o.r.x - n.r.x) >= 1 || Math.abs(o.r.y - n.r.y) >= 1)) props.position = [`${o.r.x},${o.r.y}`, `${n.r.x},${n.r.y}`];
    for (const f of Object.keys(n.a)) if (n.a[f] !== o.a[f]) props[`aria/${f}`] = [String(o.a[f] ?? "none"), String(n.a[f] ?? "none")];
    if (Object.keys(props).length) changes.push({ target: n.d, props });
  }
  return { changes: changes.slice(0, 14), appeared: appeared.slice(0, 8), disappeared: disappeared.slice(0, 6) };
};

async function shot(s, bounds, fallback) {
  const b = bounds || fallback;
  const w = Math.min(1600, Math.max(1, b.w));
  const h = Math.min(2000, Math.max(1, b.h));
  const { data } = await s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: b.x, y: b.y, width: w, height: h, scale: 1 } });
  return Buffer.from(data, "base64");
}

/**
 * Load `url` at `width` and capture the component: a base shot, optional measured spec, then each state step
 * (cumulative, like fitcheck_shot) with a cropped shot, what changed against the base, and the animations seen.
 * Returns { width, spec?, responsive, base: {png, snap}, states: [{ label, step, png, changes, appeared, disappeared, motion, error? }] }.
 */
export async function captureAt(url, { width, height = 900, selector, states = [], withSpec = false, keyboard = false, axe = false, config }) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    await openPage(tab, url, { width, height });
    await s("Runtime.evaluate", { expression: `(${installLib.toString()})()` });
    const arg = JSON.stringify({ selector });
    const call = (fn, extra = {}) => evalJson(s, `window.__drip.${fn}(${JSON.stringify({ selector, ...extra })})`);
    const spec = withSpec ? await call("spec") : undefined;
    const responsive = await call("responsive");
    const baseSnap = await call("snap");
    const rootRect = spec?.root?.rect || (await evalJson(s, `(() => { const n = window.__drip.snap(${arg}).nodes; return n.root.r; })()`));
    const base = { snap: baseSnap, png: await shot(s, baseSnap.bounds, { x: rootRect.x, y: rootRect.y, w: rootRect.w + 24, h: rootRect.h + 24 }) };
    const out = [];
    for (const [i, st] of states.slice(0, 12).entries()) {
      let error = null;
      let motion = null;
      try {
        await runStep(s, st);
        if (st.do !== "wait" && st.do !== "scroll") motion = await evalJson(s, `window.__drip.motion({ms:1200})`);
      } catch (e) {
        error = e.message;
      }
      await settle(s, 900);
      const snap = await call("snap");
      const d = diffSnap(baseSnap, snap);
      out.push({ label: st.label || `${i + 1}. ${st.do}${st.selector ? ` ${st.selector}` : ""}${st.text ? ` ${st.text}` : ""}`, step: st, png: await shot(s, snap.bounds, base.snap.bounds || rootRect), ...d, motion, active: snap.active, error });
    }
    let kb;
    if (keyboard) kb = await keyboardProbe(s, selector);
    const a11y = axe ? await runAxe(s, selector) : undefined;
    return { width, spec, responsive, base, states: out, keyboard: kb, a11y };
  });
}

/** Tab order, focus visibility, and the open / arrow / Escape contract of the first popup trigger. */
export async function keyboardProbe(s, selector) {
  const call = (fn, extra = {}) => evalJson(s, `window.__drip.${fn}(${JSON.stringify({ selector, ...extra })})`);
  const order = [];
  await call("sentinel", { where: "before" });
  let entered = false;
  for (let i = 0; i < 16; i++) {
    await runStep(s, { do: "key", text: "Tab" });
    const a = await call("active");
    if (a.inside) {
      entered = true;
      order.push({ element: a.d, focusVisible: !!(a.focusVisible && a.ring) });
    } else if (entered) break;
  }
  await call("dropSentinel");
  const probe = { tabOrder: order, tabStops: order.length, allFocusVisible: order.length > 0 && order.every((o) => o.focusVisible) };
  const trig = (await call("triggers"))[0];
  if (trig) {
    const popup = { trigger: trig.d, ariaExpandedBefore: trig.expanded };
    await runStep(s, { do: "focus", selector: trig.sel });
    await runStep(s, { do: "key", text: "Enter" });
    await settle(s, 500);
    let a = await call("active");
    popup.ariaExpandedAfterEnter = (await evalJson(s, `document.querySelector(${JSON.stringify(trig.sel)})?.getAttribute('aria-expanded')`)) ?? undefined;
    if (popup.ariaExpandedAfterEnter !== "true") {
      await runStep(s, { do: "key", text: "ArrowDown" }); // menu buttons often open on ArrowDown
      await settle(s, 500);
      popup.ariaExpandedAfterArrowDown = (await evalJson(s, `document.querySelector(${JSON.stringify(trig.sel)})?.getAttribute('aria-expanded')`)) ?? undefined;
    }
    await runStep(s, { do: "key", text: "ArrowDown" });
    a = await call("active");
    popup.focusAfterArrow = a.d;
    await runStep(s, { do: "key", text: "Escape" });
    await settle(s, 500);
    popup.ariaExpandedAfterEscape = (await evalJson(s, `document.querySelector(${JSON.stringify(trig.sel)})?.getAttribute('aria-expanded')`)) ?? undefined;
    popup.focusAfterEscape = (await call("active")).d;
    popup.opensWithKeyboard = popup.ariaExpandedAfterEnter === "true" || popup.ariaExpandedAfterArrowDown === "true";
    popup.closesWithEscape = popup.ariaExpandedAfterEscape !== "true";
    probe.popup = popup;
  }
  return probe;
}

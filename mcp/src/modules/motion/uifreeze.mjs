// motion_ui_freeze: the real UI in a film, not a screenshot of it. A live page is opened, scrolled through (lazy images
// and scroll reveals fire), and frozen: animations baked at their current state then stopped, scripts and event
// handlers removed, lazy loading removed, canvases kept as pictures, every stylesheet inlined, fonts and images saved
// next to it. The result is a static page in <film>/ui/<name>/ whose elements are named (data-ui) so the film's
// timeline animates them: DripVisuals.uiFrame mounts it and ui.$("hero-title") is the real heading.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { evalJson, openPage, withTab } from "../../core/browser.mjs";
import { get } from "../../core/http.mjs";

// Runs in the page: scroll through it so lazy content and reveals load, then back to the top.
const SCROLL = `(async () => {
  const H = () => Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight);
  const step = Math.max(300, innerHeight * 0.8);
  for (let y = 0; y < H() && y < 40000; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 220)); }
  scrollTo(0, H()); await new Promise((r) => setTimeout(r, 400));
  scrollTo(0, 0); await new Promise((r) => setTimeout(r, 700));
  if (document.fonts) await document.fonts.ready;
  return H();
})()`;

// Runs in the page: freeze it and name its elements. Returns { html, sheets: [{ href, text, base }], elements, height }.
const FREEZE = `(() => {
  const abs = (u) => { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } };
  // 1. Bake whatever is animating at its current look, then stop every animation and transition.
  const baked = new Set();
  for (const a of document.getAnimations ? document.getAnimations() : []) {
    const el = a.effect && a.effect.target;
    if (!el || baked.has(el) || !el.style) continue;
    baked.add(el);
    const cs = getComputedStyle(el);
    for (const p of ["opacity", "transform", "translate", "scale", "rotate", "filter", "clip-path", "visibility", "color", "background-color", "width", "height", "stroke-dashoffset"]) {
      const v = cs.getPropertyValue(p);
      if (v) el.style.setProperty(p, v, "important");
    }
  }
  // 2. Pictures as they are now: the image actually shown, canvases and videos as stills.
  for (const img of [...document.images]) {
    if (img.currentSrc) img.setAttribute("src", img.currentSrc);
    img.removeAttribute("srcset"); img.removeAttribute("sizes"); img.removeAttribute("loading"); img.removeAttribute("decoding");
  }
  for (const s of [...document.querySelectorAll("picture source")]) s.remove();
  for (const c of [...document.querySelectorAll("canvas")]) {
    try { const img = document.createElement("img"); img.src = c.toDataURL("image/png"); img.className = c.className; img.style.cssText = c.style.cssText; const r = c.getBoundingClientRect(); img.style.width = r.width + "px"; img.style.height = r.height + "px"; c.replaceWith(img); } catch (e) {}
  }
  for (const v of [...document.querySelectorAll("video")]) {
    try { const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); const img = document.createElement("img"); img.src = c.toDataURL("image/jpeg", 0.85); img.className = v.className; img.style.cssText = v.style.cssText; img.style.objectFit = getComputedStyle(v).objectFit; const r = v.getBoundingClientRect(); img.style.width = r.width + "px"; img.style.height = r.height + "px"; v.replaceWith(img); }
    catch (e) { if (v.poster) { const img = document.createElement("img"); img.src = abs(v.poster); img.className = v.className; v.replaceWith(img); } }
  }
  for (const e of [...document.querySelectorAll("[style*='url(']")]) e.setAttribute("style", e.getAttribute("style").replace(/url\\((['"]?)([^'")]+)\\1\\)/g, (m, q, u) => /^data:/.test(u) ? m : 'url("' + abs(u) + '")'));
  // 3. Name what a film would animate: headings, copy, buttons, links, pictures, inputs, cards, nav.
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 4).join("-");
  const used = new Map();
  const elements = [];
  const pick = "h1,h2,h3,h4,h5,p,a,button,img,svg,input,textarea,select,label,li,nav,header,footer,section,article,form,[role=button],[role=tab],[class*=card],[class*=Card],[class*=badge],[class*=chip],[class*=pill]";
  for (const el of document.querySelectorAll(pick)) {
    if (elements.length >= 400) break;
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const tag = el.tagName.toLowerCase();
    const words = (el.getAttribute("aria-label") || el.getAttribute("alt") || el.getAttribute("placeholder") || el.textContent || "").trim().replace(/\\s+/g, " ");
    const kind = /card/i.test(el.className && el.className.baseVal == null ? el.className : "") ? "card" : tag;
    let base = kind + (slug(words) ? "-" + slug(words) : "");
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    const name = n > 1 ? base + "-" + n : base;
    el.setAttribute("data-ui", name);
    elements.push({ name, tag, text: words.slice(0, 60), x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  }
  // 4. Stylesheets in cascade order: readable ones as text, the rest by URL (fetched outside the page).
  const sheets = [];
  for (const node of [...document.querySelectorAll("link[rel~=stylesheet], style")]) {
    const sh = node.sheet;
    let text = null;
    try { text = sh ? [...sh.cssRules].map((r) => r.cssText).join("\\n") : node.textContent; } catch (e) { text = null; }
    const href = node.tagName === "LINK" ? abs(node.getAttribute("href")) : null;
    if (node.media && node.media !== "all" && text) text = "@media " + node.media + " {\\n" + text + "\\n}";
    const ph = document.createElement("style");
    ph.setAttribute("data-drip-sheet", String(sheets.length));
    node.replaceWith(ph);
    sheets.push({ href, text, base: href || document.baseURI });
  }
  // 5. Nothing runs any more: no scripts, no handlers, no frames, no preloads.
  for (const e of [...document.querySelectorAll("script, noscript, iframe, link[rel=preload], link[rel=modulepreload], link[rel=prefetch], base")]) e.remove();
  for (const e of document.querySelectorAll("*")) for (const a of [...e.attributes]) if (/^on/i.test(a.name)) e.removeAttribute(a.name);
  return { html: "<!doctype html>\\n" + document.documentElement.outerHTML, sheets, elements, height: document.documentElement.scrollHeight, base: document.baseURI };
})()`;

const FROZEN_CSS =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}::-webkit-scrollbar{display:none}html,body{overflow:hidden!important}";

const ASSET = /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|svg|ico)(\?|#|$)/i;

/** Rewrite url(...) in CSS to local files under assets/ (downloaded once each). Pure apart from `save`. */
export async function localiseCss(css, base, save) {
  const found = [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)];
  let out = css;
  for (const m of found) {
    const u = m[2].trim();
    if (/^(data:|#|about:)/i.test(u)) continue;
    let href;
    try {
      href = new URL(u, base).href;
    } catch {
      continue;
    }
    const local = await save(href).catch(() => null);
    if (local) out = out.split(m[0]).join(`url("${local}")`);
  }
  return out;
}

/** The frozen page: each stylesheet back in its place in the cascade, then the rule that keeps everything still. Pure. */
export function frozenHtml(html, sheetsCss) {
  let out = html.replace(/<style data-drip-sheet="(\d+)"><\/style>/g, (m, i) => `<style data-drip-sheet="${i}">\n${sheetsCss[+i] || ""}\n</style>`);
  out = out.replace(/<\/head>/i, `<style data-drip-frozen>${FROZEN_CSS}</style>\n</head>`);
  return out;
}

/**
 * Freeze a page into dir: index.html (self-contained apart from assets/), assets/, elements.json.
 * Returns { file, elements, height, assets, missing }.
 */
export async function freezeUi(url, { dir, width = 1440, height = 900, config } = {}) {
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  const got = await withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, idle: true, settleMs: 1200, timeout: 20000 });
    await evalJson(tab.s, SCROLL);
    return evalJson(tab.s, FREEZE);
  });
  const saved = new Map();
  const missing = [];
  const save = async (href) => {
    if (saved.has(href)) return saved.get(href);
    const p = (async () => {
      const ext = (href.match(ASSET)?.[1] || "bin").toLowerCase();
      const name = `${crypto.createHash("sha1").update(href).digest("hex").slice(0, 12)}.${ext}`;
      const file = path.join(dir, "assets", name);
      if (!fs.existsSync(file)) {
        const r = await get(href, { as: "buffer", ttlMs: 7 * 24 * 3600e3, timeoutMs: 30000, retries: 1 });
        fs.writeFileSync(file, r.body);
      }
      return `assets/${name}`;
    })().catch((e) => {
      missing.push(href);
      throw e;
    });
    saved.set(href, p);
    return p;
  };
  const css = [];
  for (const sh of got.sheets) {
    let text = sh.text;
    if (text == null && sh.href) text = await get(sh.href, { ttlMs: 7 * 24 * 3600e3, timeoutMs: 30000 }).then((r) => String(r.body)).catch(() => (missing.push(sh.href), ""));
    // One level of @import, inlined.
    for (const m of [...String(text || "").matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/g)]) {
      const href = new URL(m[1], sh.base).href;
      const inner = await get(href, { ttlMs: 7 * 24 * 3600e3 }).then((r) => String(r.body)).catch(() => "");
      text = text.replace(m[0], await localiseCss(inner, href, save));
    }
    css.push(await localiseCss(String(text || ""), sh.base, save));
  }
  // Pictures in the markup: <img src>, poster, inline style url()s (made absolute in the page).
  let html = got.html;
  for (const m of [...html.matchAll(/\s(src|poster)="(https?:\/\/[^"]+)"/g)]) {
    const local = await save(m[2].replace(/&amp;/g, "&")).catch(() => null);
    if (local) html = html.split(m[0]).join(` ${m[1]}="${local}"`);
  }
  for (const m of [...html.matchAll(/url\((?:&quot;|")(https?:\/\/[^")&]+)(?:&quot;|")\)/g)]) {
    const local = await save(m[1]).catch(() => null);
    if (local) html = html.split(m[0]).join(`url(${local})`);
  }
  const file = path.join(dir, "index.html");
  fs.writeFileSync(file, frozenHtml(html, css));
  fs.writeFileSync(path.join(dir, "elements.json"), JSON.stringify({ url, width, height: got.height, frozenAt: new Date().toISOString(), elements: got.elements }, null, 2));
  return { file, elements: got.elements, height: got.height, assets: saved.size, missing: [...new Set(missing)] };
}

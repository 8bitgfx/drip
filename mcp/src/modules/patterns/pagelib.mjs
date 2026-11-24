// Page-side measuring library for the patterns tools. installLib() is plain JS that is stringified and
// evaluated inside the page (the shared headless Chrome), where it defines window.__drip. Nothing here
// may reference Node or module scope: everything it needs is declared inside it.

/* eslint-disable no-undef */
export function installLib() {
  if (window.__drip) return "already";
  const MAX_NODES = 80;
  const PORTAL = '[role="menu"],[role="listbox"],[role="dialog"],[role="tooltip"],[role="alertdialog"],[data-radix-popper-content-wrapper],[popover]';
  const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "BR", "PATH", "CIRCLE", "RECT", "G", "LINE", "POLYLINE", "POLYGON", "DEFS", "USE", "SYMBOL"]);
  const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  // Any CSS colour (rgb, hsl, oklch, color-mix...) -> [r, g, b, a].
  const rgba = (str) => {
    if (!str || str === "transparent") return [0, 0, 0, 0];
    if (colorCache.has(str)) return colorCache.get(str);
    const m = str.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.%]+))?\s*\)$/);
    let out;
    if (m) out = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]];
    else {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = str;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      out = [d[0], d[1], d[2], d[3] / 255];
    }
    colorCache.set(str, out);
    return out;
  };
  const hex = (c) => "#" + [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round(c[i]))).toString(16).padStart(2, "0")).join("");
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return round((x + 0.05) / (y + 0.05), 2);
  };
  const sat = (c) => {
    const mx = Math.max(c[0], c[1], c[2]);
    const mn = Math.min(c[0], c[1], c[2]);
    return mx === 0 ? 0 : (mx - mn) / mx;
  };
  const effectiveBg = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0.5) return c;
    }
    return [255, 255, 255, 1];
  };

  const describe = (el) => {
    if (!el || el.nodeType !== 1) return "?";
    let s = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    if (role) s += `[role=${role}]`;
    if (el.id) s += `#${el.id}`;
    else if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/)[0].slice(0, 28);
    const label = el.getAttribute("aria-label") || (el.children.length === 0 ? (el.textContent || "").trim().slice(0, 18) : "");
    if (label) s += ` "${label}"`;
    return s;
  };
  const pickRoot = (selector) => {
    if (selector) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`no element matches ${selector}`);
      return el;
    }
    // No selector: the main content when there is one, else the body.
    let el = document.querySelector("main, [role=main]") || document.body;
    // Walk down single-child wrappers so a lone component is the root.
    for (let i = 0; i < 6 && el.children.length === 1 && !SKIP.has(el.children[0].tagName) && el !== document.body; i++) el = el.children[0];
    if (el === document.body) {
      const kids = [...document.body.children].filter((k) => !SKIP.has(k.tagName) && k.getBoundingClientRect().height > 0);
      if (kids.length === 1) el = kids[0];
    }
    return el;
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: round(r.left + scrollX), y: round(r.top + scrollY), w: round(r.width), h: round(r.height) };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.01;
  };
  const extraRoots = (root) => [...document.querySelectorAll(PORTAL)].filter((e) => !root.contains(e) && !e.contains(root));

  // Elements to track: BFS from the root (and from portaled popups), capped.
  const tracked = (root) => {
    const out = [];
    const seen = new Set();
    const walk = (start, prefix) => {
      const queue = [[start, ""]];
      while (queue.length && out.length < MAX_NODES) {
        const [el, p] = queue.shift();
        if (seen.has(el) || SKIP.has(el.tagName)) continue;
        seen.add(el);
        out.push({ el, key: prefix + (p || "root"), depth: p ? p.split(".").length : 0 });
        if (el.tagName === "svg" || el.tagName === "SVG") continue;
        [...el.children].forEach((c, i) => queue.push([c, p ? `${p}.${i}` : String(i)]));
      }
    };
    walk(root, "");
    extraRoots(root).slice(0, 4).forEach((e, i) => walk(e, `portal${i}:`));
    return out;
  };

  const textOf = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  const lines = (s) => (s === "normal" ? "normal" : round(parseFloat(s), 1) + "px");
  const px = (v) => round(parseFloat(v) || 0, 1);
  const boxSides = (cs, prop) => [cs[`${prop}Top`], cs[`${prop}Right`], cs[`${prop}Bottom`], cs[`${prop}Left`]].map(px);
  const layoutOf = (cs) => {
    if (cs.display.includes("grid")) return `grid ${cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length}col gap ${px(cs.rowGap)}/${px(cs.columnGap)}`;
    if (cs.display.includes("flex")) return `flex ${cs.flexDirection}${cs.flexWrap !== "nowrap" ? " wrap" : ""} gap ${px(cs.rowGap)}/${px(cs.columnGap)} ${cs.justifyContent !== "normal" ? cs.justifyContent : ""} ${cs.alignItems !== "normal" ? cs.alignItems : ""}`.trim();
    return cs.display;
  };
  const styleOf = (el, cs) => {
    const out = { layout: layoutOf(cs) };
    const t = textOf(el);
    if (t) out.type = `${cs.fontFamily.split(",")[0].replace(/["']/g, "").trim()} ${round(parseFloat(cs.fontSize))}px/${lines(cs.lineHeight)} w${cs.fontWeight}${cs.letterSpacing !== "normal" && parseFloat(cs.letterSpacing) ? ` ls ${round(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize), 3)}em` : ""}${cs.textTransform !== "none" ? ` ${cs.textTransform}` : ""}`;
    if (t) out.color = hex(rgba(cs.color));
    const bg = rgba(cs.backgroundColor);
    if (bg[3] > 0.02) out.bg = bg[3] < 0.99 ? `${hex(bg)}@${round(bg[3], 2)}` : hex(bg);
    const bi = cs.backgroundImage;
    if (bi && bi !== "none") out.bgImage = bi.length > 80 ? bi.slice(0, 77) + "..." : bi;
    const bw = px(cs.borderTopWidth);
    if (bw > 0 && cs.borderTopStyle !== "none") out.border = `${bw}px ${cs.borderTopStyle} ${hex(rgba(cs.borderTopColor))}`;
    const rad = cs.borderTopLeftRadius;
    if (px(rad) > 0 || rad.includes("%")) out.radius = rad;
    if (cs.boxShadow !== "none") out.shadow = cs.boxShadow;
    const pad = boxSides(cs, "padding");
    if (pad.some(Boolean)) out.padding = pad;
    if (cs.position !== "static") out.position = cs.position;
    return out;
  };

  const hist = (list, top = 8) => {
    const m = new Map();
    for (const v of list) m.set(v, (m.get(v) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).map(([value, count]) => ({ value, count }));
  };

  const hasReduced = () => {
    try {
      return [...document.styleSheets].some((ss) => {
        try {
          return [...ss.cssRules].some((r) => r.media && /prefers-reduced-motion/.test(r.conditionText || r.media.mediaText));
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };
  const keyframesNamed = (names) => {
    const out = {};
    const walkRules = (rules) => {
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE && names.has(r.name)) out[r.name] = [...r.cssRules].map((k) => k.cssText.replace(/\s+/g, " ")).join(" ").slice(0, 400);
        else if (r.cssRules && r.type !== CSSRule.KEYFRAMES_RULE) walkRules(r.cssRules);
      }
    };
    for (const ss of document.styleSheets) {
      try {
        walkRules(ss.cssRules);
      } catch {
        /* cross-origin sheet */
      }
    }
    return out;
  };
  const splitList = (s) => s.split(/,(?![^(]*\))/).map((x) => x.trim());
  const secs = (s) => (s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000);

  // ---- spec: everything measurable from the current page state -------------------------------------
  const spec = ({ selector, maxNodes = 40 } = {}) => {
    const root = pickRoot(selector);
    const rr = rectOf(root);
    const nodes = tracked(root);
    const structure = [];
    const typeMap = new Map();
    const colorUse = new Map();
    const addColor = (c, role, weight) => {
      if (c[3] < 0.05) return;
      const h = hex(c);
      const e = colorUse.get(h) || { hex: h, uses: 0, roles: {}, c };
      e.uses += weight;
      e.roles[role] = (e.roles[role] || 0) + weight;
      colorUse.set(h, e);
    };
    const paddings = [];
    const gaps = [];
    const radii = [];
    const shadows = [];
    const motion = [];
    const names = new Set();
    const heads = [];
    const rootBg = effectiveBg(root);
    for (const { el, key, depth } of nodes) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const vis = visible(el);
      const t = textOf(el);
      if (structure.length < maxNodes && (vis || key === "root")) {
        structure.push({ path: key, tag: describe(el), depth, text: t.slice(0, 60) || undefined, rect: { x: round(r.left + scrollX - rr.x), y: round(r.top + scrollY - rr.y), w: round(r.width), h: round(r.height) }, ...styleOf(el, cs) });
      }
      // transitions and animations declared on this element
      const tr = splitList(cs.transitionProperty).map((p, i) => ({ property: p, duration: secs(splitList(cs.transitionDuration)[i % splitList(cs.transitionDuration).length]), easing: splitList(cs.transitionTimingFunction)[i % splitList(cs.transitionTimingFunction).length], delay: secs(splitList(cs.transitionDelay)[i % splitList(cs.transitionDelay).length]) })).filter((x) => x.duration > 0 || x.delay > 0);
      const an = cs.animationName !== "none" ? splitList(cs.animationName).map((n, i) => ({ name: n, duration: secs(splitList(cs.animationDuration)[i % splitList(cs.animationDuration).length]), easing: splitList(cs.animationTimingFunction)[i % splitList(cs.animationTimingFunction).length], iterations: splitList(cs.animationIterationCount)[i % splitList(cs.animationIterationCount).length], delay: secs(splitList(cs.animationDelay)[i % splitList(cs.animationDelay).length]) })) : [];
      an.forEach((a) => names.add(a.name));
      if ((tr.length || an.length) && motion.length < 24) motion.push({ target: describe(el), transitions: tr.length ? tr : undefined, animations: an.length ? an : undefined });
      if (!vis) continue;
      if (t) {
        const words = t.split(" ").length;
        const fs = round(parseFloat(cs.fontSize));
        const tk = `${fs}|${cs.fontWeight}|${cs.fontFamily.split(",")[0].replace(/["']/g, "").trim()}`;
        const e = typeMap.get(tk) || { px: fs, weight: +cs.fontWeight || cs.fontWeight, family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), lineHeight: cs.lineHeight === "normal" ? "normal" : round(parseFloat(cs.lineHeight) / fs, 2), letterSpacingEm: round((parseFloat(cs.letterSpacing) || 0) / fs, 3), count: 0, sample: t.slice(0, 40), textTransform: cs.textTransform !== "none" ? cs.textTransform : undefined };
        e.count += words;
        typeMap.set(tk, e);
        const tc = rgba(cs.color);
        addColor(tc, "text", words);
        heads.push({ text: t.slice(0, 50), size: fs, weight: +cs.fontWeight || 400, tag: el.tagName.toLowerCase(), contrast: contrast(tc, effectiveBg(el)) });
      }
      const bg = rgba(cs.backgroundColor);
      if (bg[3] > 0.1) addColor(bg, "background", Math.max(1, Math.min(60, Math.round((r.width * r.height) / 4000))));
      if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") addColor(rgba(cs.borderTopColor), "border", 1);
      const pads = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px).filter((v) => v > 0);
      paddings.push(...pads);
      if (px(cs.rowGap) > 0) gaps.push(px(cs.rowGap));
      if (px(cs.columnGap) > 0 && px(cs.columnGap) !== px(cs.rowGap)) gaps.push(px(cs.columnGap));
      const rad = cs.borderTopLeftRadius;
      if (px(rad) > 0 || rad.includes("%")) radii.push(rad);
      if (cs.boxShadow !== "none") shadows.push(cs.boxShadow);
      // sibling spacing
      if (el.children.length > 1 && !cs.display.includes("flex") && !cs.display.includes("grid")) {
        const kids = [...el.children].filter(visible);
        for (let i = 1; i < kids.length; i++) {
          const d = kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom;
          if (d > 0 && d < 400) gaps.push(round(d));
        }
      }
    }
    // dedupe motion by target kind + signature
    const seenSig = new Set();
    const motionStatic = motion.filter((m) => {
      const sig = JSON.stringify([m.transitions, m.animations]);
      if (seenSig.has(sig + m.target.split(/[ .#[]/)[0])) return false;
      seenSig.add(sig + m.target.split(/[ .#[]/)[0]);
      return true;
    });
    const typeScale = [...typeMap.values()].sort((a, b) => b.px - a.px || b.weight - a.weight);
    const palette = [...colorUse.values()].sort((a, b) => b.uses - a.uses).slice(0, 12);
    const textColors = palette.filter((c) => c.roles.text).sort((a, b) => b.roles.text - a.roles.text);
    const bgs = palette.filter((c) => c.roles.background).sort((a, b) => b.roles.background - a.roles.background);
    const surface = bgs.find((c) => c.hex !== hex(rootBg));
    const accent = palette.filter((c) => sat(c.c) > 0.35 && lum(c.c) > 0.02 && lum(c.c) < 0.9).sort((a, b) => b.uses - a.uses)[0];
    const roleColors = {
      background: hex(rootBg),
      surface: surface?.hex,
      text: textColors[0]?.hex,
      muted: textColors.find((c) => c.hex !== textColors[0]?.hex && contrast(c.c, rootBg) < contrast(textColors[0].c, rootBg))?.hex,
      border: palette.filter((c) => c.roles.border).sort((a, b) => b.roles.border - a.roles.border)[0]?.hex,
      accent: accent?.hex,
    };
    Object.keys(roleColors).forEach((k) => roleColors[k] === undefined && delete roleColors[k]);
    const pv = hist(paddings);
    const unit = [4, 8].find((u) => pv.length && pv.filter((p) => p.value % u === 0).reduce((n, p) => n + p.count, 0) >= 0.8 * pv.reduce((n, p) => n + p.count, 0)) || null;
    heads.sort((a, b) => b.size * (b.weight >= 600 ? 1.15 : 1) - a.size * (a.weight >= 600 ? 1.15 : 1));
    // ARIA and semantics
    const all = nodes.map((n) => n.el);
    const roles = hist(all.map((e) => e.getAttribute("role") || "").filter(Boolean), 10);
    const ariaAttrs = hist(all.flatMap((e) => e.getAttributeNames().filter((a) => a.startsWith("aria-"))), 12);
    const interactive = all.filter((e) => e.matches('a[href],button,input,select,textarea,summary,[role=button],[role=menuitem],[role=tab],[role=option],[role=switch],[role=checkbox],[tabindex]:not([tabindex="-1"])') && visible(e));
    const nameOf = (e) => (e.getAttribute("aria-label") || (e.getAttribute("aria-labelledby") ? [...e.getAttribute("aria-labelledby").split(" ")].map((i) => document.getElementById(i)?.textContent || "").join(" ") : "") || e.getAttribute("title") || e.getAttribute("alt") || (e.labels && e.labels[0]?.textContent) || e.textContent || e.getAttribute("placeholder") || "").trim();
    const unnamed = interactive.filter((e) => !nameOf(e));
    const issues = [];
    if (unnamed.length) issues.push(`${unnamed.length} interactive element(s) without an accessible name: ${unnamed.slice(0, 3).map(describe).join(", ")}`);
    all.filter((e) => e.hasAttribute("aria-controls") && !document.getElementById(e.getAttribute("aria-controls"))).slice(0, 3).forEach((e) => issues.push(`${describe(e)} has aria-controls pointing at a missing id`));
    all.filter((e) => e.matches("img:not([alt])")).slice(0, 3).forEach((e) => issues.push(`${describe(e)} has no alt`));
    const small = interactive.filter((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height) < 24);
    if (small.length) issues.push(`${small.length} interactive element(s) under 24px (WCAG 2.2 target size): ${small.slice(0, 3).map(describe).join(", ")}`);
    return {
      root: { selector: selector || null, tag: describe(root), role: root.getAttribute("role") || undefined, rect: rr, background: hex(rootBg) },
      structure,
      type: { families: hist([...typeMap.values()].flatMap((t) => Array(t.count).fill(t.family)), 4), scale: typeScale.slice(0, 12) },
      hierarchy: heads.slice(0, 6),
      colors: { roles: roleColors, palette: palette.map((c) => ({ hex: c.hex, uses: Math.round(c.uses), roles: Object.keys(c.roles) })) },
      spacing: { unit, padding: pv, gaps: hist(gaps) },
      radii: hist(radii, 6),
      shadows: hist(shadows, 4),
      motion: { declared: motionStatic, keyframes: keyframesNamed(names), reducedMotionRules: hasReduced() },
      aria: { role: root.getAttribute("role") || undefined, attrs: ariaAttrs, roles, interactive: interactive.length, tabbable: interactive.filter((e) => e.tabIndex >= 0).length, issues },
    };
  };

  // ---- snapshot of tracked elements: what a state change can alter -----------------------------------
  const SNAP_PROPS = ["color", "backgroundColor", "borderTopColor", "borderTopLeftRadius", "boxShadow", "opacity", "transform", "outline", "fontSize", "fontWeight", "textDecorationLine", "cursor", "filter", "scale", "translate"];
  const snap = ({ selector } = {}) => {
    const root = pickRoot(selector);
    const out = {};
    let u = null;
    for (const { el, key } of tracked(root)) {
      const cs = getComputedStyle(el);
      const vis = visible(el);
      const r = el.getBoundingClientRect();
      const p = {};
      for (const k of SNAP_PROPS) {
        let v = cs[k];
        if (k === "outline") v = cs.outlineStyle === "none" || !px(cs.outlineWidth) ? "none" : `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`;
        if (v === "none" || v === "normal" || v === "auto" || v === "rgba(0, 0, 0, 0)" || v === "0px" || v === "") continue;
        p[k] = v;
      }
      out[key] = { d: describe(el), v: vis, r: { x: round(r.left + scrollX), y: round(r.top + scrollY), w: round(r.width), h: round(r.height) }, p, a: { expanded: el.getAttribute("aria-expanded") ?? undefined, selected: el.getAttribute("aria-selected") ?? undefined, pressed: el.getAttribute("aria-pressed") ?? undefined, checked: el.getAttribute("aria-checked") ?? undefined, disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || undefined, state: el.getAttribute("data-state") ?? undefined, hidden: el.hasAttribute("hidden") || undefined } };
      if (vis && r.width * r.height > 0 && r.width * r.height < 4e6) {
        const b = { x1: r.left + scrollX, y1: r.top + scrollY, x2: r.right + scrollX, y2: r.bottom + scrollY };
        u = u ? { x1: Math.min(u.x1, b.x1), y1: Math.min(u.y1, b.y1), x2: Math.max(u.x2, b.x2), y2: Math.max(u.y2, b.y2) } : b;
      }
    }
    // With a shadow the visible bounds are wider than the box: add 12px.
    return { nodes: out, bounds: u ? { x: Math.max(0, Math.floor(u.x1 - 12)), y: Math.max(0, Math.floor(u.y1 - 12)), w: Math.ceil(u.x2 - u.x1 + 24), h: Math.ceil(u.y2 - u.y1 + 24) } : null, active: describe(document.activeElement) };
  };

  // ---- animation observation --------------------------------------------------------------------
  const events = [];
  for (const type of ["transitionrun", "transitionend", "animationstart", "animationend"]) {
    document.addEventListener(type, (e) => events.push({ type, name: e.propertyName || e.animationName, elapsed: e.elapsedTime, target: describe(e.target), at: performance.now() }), true);
  }
  const bits = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { o: round(+cs.opacity, 3), tf: cs.transform === "none" ? "" : cs.transform, w: round(r.width), h: round(r.height), x: round(r.left), y: round(r.top) };
  };
  const matrixSummary = (t) => {
    if (!t) return "";
    const m = t.match(/matrix(3d)?\(([^)]+)\)/);
    if (!m) return t;
    const v = m[2].split(",").map(Number);
    return m[1] ? `translate(${round(v[12])},${round(v[13])}) scale(${round(v[0], 3)},${round(v[5], 3)})` : `translate(${round(v[4])},${round(v[5])}) scale(${round(v[0], 3)},${round(v[3], 3)})`;
  };
  // Look at what is animating right now and follow it until it stops (max `ms`).
  const motion = async ({ ms = 1200 } = {}) => {
    const t0 = performance.now();
    const since = events.length;
    const anims = document.getAnimations().filter((a) => a.playState === "running" || a.playState === "pending");
    const info = [];
    const targets = new Map();
    for (const a of anims) {
      const eff = a.effect;
      const tg = eff && eff.target;
      if (!tg) continue;
      const timing = eff.getTiming();
      const kf = (eff.getKeyframes ? eff.getKeyframes() : []).slice(0, 5).map((k) => {
        const o = { offset: k.offset === null ? undefined : round(k.offset, 2) };
        for (const [p, v] of Object.entries(k)) if (!["offset", "computedOffset", "easing", "composite"].includes(p)) o[p] = String(v).slice(0, 60);
        return o;
      });
      info.push({ kind: a.constructor.name, name: a.transitionProperty || a.animationName || a.id || "", target: describe(tg), durationMs: round(+timing.duration || 0), delayMs: round(timing.delay || 0), easing: timing.easing, iterations: timing.iterations === Infinity ? "infinite" : timing.iterations, keyframes: kf });
      if (targets.size < 6 && !targets.has(tg)) targets.set(tg, []);
    }
    const first = new Map([...targets.keys()].map((t) => [t, bits(t)]));
    const samples = new Map([...targets.keys()].map((t) => [t, [{ t: 0, ...bits(t) }]]));
    let lastChange = 0;
    while (performance.now() - t0 < ms && document.getAnimations().some((a) => a.playState === "running" && (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity)) {
      await new Promise((r) => requestAnimationFrame(r));
      const t = round(performance.now() - t0);
      for (const [el, list] of samples) {
        const b = bits(el);
        const prev = list[list.length - 1];
        if (b.o !== prev.o || b.tf !== prev.tf || b.w !== prev.w || b.h !== prev.h || b.x !== prev.x || b.y !== prev.y) {
          lastChange = t;
          list.push({ t, ...b });
        }
      }
    }
    const evs = events.slice(since).filter((e) => e.type === "transitionrun" || e.type === "animationstart").map((e) => ({ kind: e.type === "transitionrun" ? "CSSTransition" : "CSSAnimation", name: e.name, target: e.target }));
    const ends = events.slice(since).filter((e) => e.type === "transitionend" || e.type === "animationend");
    // Transitions that finished before we looked: still report them, with the measured duration.
    for (const e of evs) if (!info.some((i) => i.name === e.name && i.target === e.target) && (ends.find((x) => x.name === e.name && x.target === e.target)?.elapsed || 0) > 0) info.push({ ...e, durationMs: round((ends.find((x) => x.name === e.name && x.target === e.target)?.elapsed || 0) * 1000), note: "finished before sampling" });
    const traces = [...samples.entries()].map(([el, list]) => {
      const keep = list.length <= 10 ? list : list.filter((_, i) => i % Math.ceil(list.length / 10) === 0 || i === list.length - 1);
      return { target: describe(el), from: { opacity: first.get(el).o, transform: matrixSummary(first.get(el).tf), w: first.get(el).w, h: first.get(el).h }, to: (() => { const b = bits(el); return { opacity: b.o, transform: matrixSummary(b.tf), w: b.w, h: b.h }; })(), samples: keep.map((s) => ({ t: s.t, opacity: s.o, transform: matrixSummary(s.tf), w: s.w, h: s.h })) };
    });
    return { animations: info.slice(0, 12), traces, settleMs: lastChange || undefined };
  };

  // ---- responsive facts for the current viewport ------------------------------------------------
  const responsive = ({ selector } = {}) => {
    const root = pickRoot(selector);
    const cs = getComputedStyle(root);
    const r = root.getBoundingClientRect();
    const all = [...root.querySelectorAll("*")].filter((e) => !SKIP.has(e.tagName));
    const heads = all.filter((e) => textOf(e)).map((e) => parseFloat(getComputedStyle(e).fontSize));
    const inter = all.filter((e) => e.matches("a[href],button,input,select,textarea,[role=button],[role=menuitem],[role=tab]") && visible(e));
    const kids = [...root.children].filter((e) => !SKIP.has(e.tagName));
    return {
      viewport: innerWidth,
      rect: { w: round(r.width), h: round(r.height) },
      layout: layoutOf(cs),
      visibleChildren: kids.filter(visible).length,
      hiddenChildren: kids.filter((k) => !visible(k)).length,
      maxFontPx: heads.length ? Math.max(...heads) : null,
      minFontPx: heads.length ? Math.min(...heads) : null,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      minTarget: inter.length ? round(Math.min(...inter.map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)))) : null,
      stackedChildren: kids.filter(visible).length > 1 && new Set(kids.filter(visible).map((k) => Math.round(k.getBoundingClientRect().left))).size === 1,
    };
  };

  // ---- keyboard ---------------------------------------------------------------------------------
  const active = ({ selector } = {}) => {
    const root = pickRoot(selector);
    const el = document.activeElement;
    if (!el || el === document.body) return { d: "body", inside: false };
    const cs = getComputedStyle(el);
    const ring = (cs.outlineStyle !== "none" && px(cs.outlineWidth) > 0) || (cs.boxShadow !== "none" && el.matches(":focus-visible"));
    return { d: describe(el), inside: root.contains(el) || extraRoots(root).some((p) => p.contains(el)), focusVisible: el.matches(":focus-visible"), ring, expanded: el.getAttribute("aria-expanded") ?? undefined, role: el.getAttribute("role") || undefined };
  };
  const sentinel = ({ selector, where = "before" } = {}) => {
    const root = pickRoot(selector);
    const s = document.createElement("span");
    s.id = "__drip_sentinel";
    s.tabIndex = 0;
    s.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    if (where === "before") root.parentNode.insertBefore(s, root);
    else root.parentNode.insertBefore(s, root.nextSibling);
    s.focus();
    return true;
  };
  const dropSentinel = () => document.getElementById("__drip_sentinel")?.remove();
  const triggers = ({ selector } = {}) => {
    const root = pickRoot(selector);
    const t = [...root.querySelectorAll("[aria-expanded],[aria-haspopup],summary")].filter(visible);
    return t.slice(0, 3).map((e, i) => (e.setAttribute("data-drip-probe", String(i)), { sel: `[data-drip-probe="${i}"]`, d: describe(e), expanded: e.getAttribute("aria-expanded") }));
  };

  window.__drip = { spec, snap, motion, responsive, active, sentinel, dropSentinel, triggers, events, version: 1 };
  return "installed";
}

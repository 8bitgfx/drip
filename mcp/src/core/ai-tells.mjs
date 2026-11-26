// The mistakes AI-built pages ship most, measured on the live page (fitcheck_shot, critic_prepare). Collected from
// write-ups of "vibe-coded" sites (2026-11) and Drip's own runs: a button whose label is the colour of its fill, a
// primary action that goes nowhere (href="#"), labels cut off or wrapped inside a button, pictures stretched or broken,
// placeholder copy ("[price]", "Acme", "John Doe"), a footer year from the past, no hover or focus states at all, the
// default indigo button, the three-icon-card feature row, a "trusted by" row of plain words posing as logos.
//
// aiTellsInPage runs INSIDE the page (capture() sends its source with Function.prototype.toString), so it must not
// use anything from this module's scope. It returns findings; judgeTells turns them into blockers and warnings.

import { Jimp } from "jimp";

/* eslint-disable no-undef */
export function aiTellsInPage() {
  const out = [];
  const add = (sev, kind, text, detail) => out.push({ sev, kind, text: String(text || "").trim().replace(/\s+/g, " ").slice(0, 60), detail });
  const W = innerWidth;
  const phone = W < 600;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (+ac.opacity < 0.15) return false;
      // Clipped away by an ancestor (text-roll hover effects keep a hidden copy of each label above or below its box).
      if (a !== el && /hidden|clip/.test(ac.overflow + ac.overflowY + ac.overflowX)) {
        const p = a.getBoundingClientRect();
        if (r.bottom <= p.top + 1 || r.top >= p.bottom - 1 || r.right <= p.left + 1 || r.left >= p.right - 1) return false;
      }
    }
    return true;
  };
  // The colour the text is painted in: -webkit-text-fill-color wins over color; transparent text is an effect layer.
  const ink = (el) => {
    const cs = getComputedStyle(el);
    const fill = parse(cs.webkitTextFillColor);
    const c = fill && cs.webkitTextFillColor !== cs.color ? fill : parse(cs.color);
    return c && c.a >= 0.1 ? c : null;
  };
  // The element that actually paints the words: a control's label often sits in a child with its own colour.
  const holder = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) if (t.textContent.trim() && t.parentElement && visible(t.parentElement)) return t.parentElement;
    return el;
  };
  const oneLabel = (el) => {
    let k = 0;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) if (t.textContent.trim()) k++;
    return k === 1;
  };
  const parse = (c) => {
    const m = String(c || "").match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  // The colour behind an element: its own fill, then its ancestors', blended; null when a picture or video is behind it.
  const behind = (el) => {
    const layers = [];
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/url\(/.test(cs.backgroundImage)) return null;
      if (/gradient/.test(cs.backgroundImage)) {
        const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        if (stops.length) {
          const avg = stops.reduce((s, c) => ({ r: s.r + c.r / stops.length, g: s.g + c.g / stops.length, b: s.b + c.b / stops.length, a: Math.max(s.a, c.a) }), { r: 0, g: 0, b: 0, a: 0 });
          layers.push(avg);
          if (avg.a >= 0.95) break;
        }
      }
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 0.95) break;
      }
      if (a !== el && /^(IMG|VIDEO|CANVAS|PICTURE)$/.test(a.tagName)) return null;
    }
    let c = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) c = over(layers[i], c);
    // A picture or video drawn under this element (absolutely placed siblings) means the colour above is a guess.
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x > 0 && y > 0 && x < innerWidth && y < innerHeight) {
      for (const hit of document.elementsFromPoint(x, y)) {
        if (hit === el || el.contains(hit)) continue;
        if (/^(IMG|VIDEO|CANVAS)$/.test(hit.tagName) && !hit.closest("button, a")) return null;
        if (hit.contains(el)) break;
      }
    }
    return c;
  };
  const label = (el) => (el.innerText || el.value || el.getAttribute("aria-label") || "").trim();

  // ---- buttons and links that look like buttons ---------------------------------------------------------------
  const controls = [...document.querySelectorAll("button, [role=button], input[type=submit], input[type=button], a")].filter(visible);
  // Button-sized controls that look like buttons: a fill or a border, and not a whole card that happens to be a link.
  const styled = controls.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 420 || r.height > 96) return false;
    if (el.tagName !== "A") return true;
    const cs = getComputedStyle(el);
    const bg = parse(cs.backgroundColor);
    return (bg && bg.a > 0.2) || parseFloat(cs.borderTopWidth) > 0 || /gradient/.test(cs.backgroundImage);
  });
  // Lines of text in a control: only its text nodes count (an icon beside the label sits at another height, not on a
  // second line), and a second line means the text's own height is well over one line-height.
  const lines = (el) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
    let top = Infinity, bottom = -Infinity;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) {
      if (!t.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const q of range.getClientRects()) {
        if (q.width < 2) continue;
        top = Math.min(top, q.top);
        bottom = Math.max(bottom, q.bottom);
      }
    }
    return bottom - top > lh * 1.7 ? 2 : 1;
  };
  const named = (el) => !!(label(el) || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") || el.querySelector("img[alt]:not([alt='']), svg title, [aria-label]"));
  const fills = new Map();
  const labels = new Map();
  let lowLabels = 0;
  for (const el of styled) {
    const cs = getComputedStyle(el);
    const text = label(el);
    const r = el.getBoundingClientRect();
    const ownFill = parse(cs.backgroundColor);
    if (text && ownFill && ownFill.a > 0.5) labels.set(text.toLowerCase(), (labels.get(text.toLowerCase()) || 0) + 1);
    // The label against the button's own fill.
    const words = holder(el);
    const fg = ink(words);
    const bg = behind(words);
    if (text && fg && bg && el.innerText.trim()) {
      const c = ratio(over(fg, bg), bg);
      const ws = getComputedStyle(words);
      const size = parseFloat(ws.fontSize), bold = parseInt(ws.fontWeight, 10) >= 600;
      const large = size >= 24 || (bold && size >= 18.66);
      if (c < 1.6) add("block", "unreadable button", text, `its label is the colour of its fill (contrast ${c.toFixed(2)}:1): nobody can read it`);
      // An inactive tab or toggle is faded on purpose: a warning, never a blocker.
      else if (c < 3 && lowLabels++ < 4) add(el.closest("[role=tablist], [role=tab], [aria-selected], [aria-pressed]") ? "warn" : "block", "unreadable button", text, `label contrast ${c.toFixed(2)}:1 on its fill (needs ${large ? 3 : 4.5}:1)`);
      else if (c < (large ? 3 : 4.5) && lowLabels++ < 4) add("warn", "faint button label", text, `label contrast ${c.toFixed(2)}:1 on its fill (WCAG asks ${large ? 3 : 4.5}:1)`);
    }
    // A label cut off by its box, or a short label wrapping onto a second line.
    if (text && el.scrollWidth > el.clientWidth + 8 && /hidden|clip/.test(cs.overflow + cs.overflowX)) add("block", "button label cut off", text, `the label is ${el.scrollWidth - el.clientWidth}px wider than the button`);
    if (text && text.length <= 24 && oneLabel(el) && lines(el) > 1) add("warn", "button label wraps", text, "a short label breaks onto two lines; give it white-space: nowrap or a wider button");
    // No name at all (an icon on its own).
    if (!named(el)) add("warn", "button with no name", el.outerHTML.slice(0, 60), "an icon-only control needs aria-label (screen readers say just \"button\")");
    // Too small to tap on a phone.
    if (phone && (r.height < 36 || r.width < 36) && el.tagName !== "A") add("warn", "tap target too small", text || el.tagName.toLowerCase(), `${Math.round(r.width)}x${Math.round(r.height)}px; 44px is comfortable, 36px the least`);
    // A filled button that doesn't look like one: same fill as what is behind it and no border.
    const own = parse(cs.backgroundColor);
    const parentBg = el.parentElement ? behind(el.parentElement) : null;
    if (el.tagName === "BUTTON" && text && own && own.a > 0.9 && parentBg && ratio(own, parentBg) < 1.08 && !(parseFloat(cs.borderTopWidth) > 0) && cs.boxShadow === "none" && parseFloat(cs.paddingLeft) >= 12)
      add("warn", "button doesn't look like a button", text, "its fill is the colour of the surface and it has no border or shadow");
    if (own && own.a > 0.5 && text) fills.set(`${Math.round(own.r)},${Math.round(own.g)},${Math.round(own.b)}|${cs.borderRadius}`, text);
    // The default AI button colour: Tailwind's indigo/violet.
    if (own && own.a > 0.8 && [[99, 102, 241], [79, 70, 229], [67, 56, 202], [124, 58, 237], [139, 92, 246], [147, 51, 234], [168, 85, 247]].some(([R, G, B]) => Math.abs(own.r - R) + Math.abs(own.g - G) + Math.abs(own.b - B) < 24))
      add("warn", "default indigo button", text, "Tailwind's indigo/violet: the colour of every AI-made page. Use the brand's own action colour");
  }
  const filled = [...fills.keys()].length;
  if (filled > 4) add("warn", "too many button styles", [...fills.values()].slice(0, 4).join(" / "), `${filled} different filled button styles (fill x radius); one primary, one secondary`);
  for (const [t, n] of labels) if (n >= 4 && t.length > 2) add("warn", "same button everywhere", t, `"${t}" appears on ${n} buttons: each section's action can say what it does there`);

  // Actions that go nowhere.
  const dead = [...document.querySelectorAll("a")].filter(visible).filter((a) => {
    const h = (a.getAttribute("href") || "").trim();
    // A menu trigger (aria-haspopup / aria-expanded) opens something without going anywhere: not dead.
    if (!a.hasAttribute("href")) return false; // no href: a script target, not a link
    if (a.hasAttribute("aria-haspopup") || a.hasAttribute("aria-expanded") || a.getAttribute("role") === "button") return false;
    return h === "#" || h === "" || /^javascript:/i.test(h);
  });
  const deadStyled = dead.filter((a) => styled.includes(a));
  if (deadStyled.length) add("block", "dead button", deadStyled.slice(0, 4).map(label).join(", "), `${deadStyled.length} button-styled link(s) go nowhere (href="#"): link them to the page, section or sign-up they promise`);
  else if (dead.length >= 3) add("warn", "dead links", dead.slice(0, 4).map(label).join(", "), `${dead.length} links go nowhere (href="#")`);

  // ---- pictures ---------------------------------------------------------------------------------------------
  let stretched = 0, broken = 0, noAlt = 0;
  for (const img of [...document.querySelectorAll("img")].filter(visible)) {
    if (img.complete && img.naturalWidth === 0) {
      if (broken++ < 3) add("block", "broken image", img.getAttribute("src") || "", "the picture didn't load: a broken frame on the page");
      continue;
    }
    if (!img.hasAttribute("alt")) noAlt++;
    const cs = getComputedStyle(img);
    if (img.naturalWidth && img.naturalHeight && cs.objectFit === "fill") {
      const r = img.getBoundingClientRect();
      const d = r.width / r.height / (img.naturalWidth / img.naturalHeight);
      if ((d > 1.06 || d < 0.94) && r.width > 40 && stretched++ < 3) add("block", "stretched image", img.getAttribute("src") || "", `drawn at ${Math.round(r.width)}x${Math.round(r.height)} but it is ${img.naturalWidth}x${img.naturalHeight}: squashed. Use object-fit: cover or its own aspect ratio`);
    }
  }
  if (noAlt >= 3) add("warn", "images without alt", "", `${noAlt} pictures have no alt attribute (alt="" for decoration)`);

  // ---- copy -------------------------------------------------------------------------------------------------
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const placeholders = new Set();
  let n, oldYear = null, emoji = 0;
  const year = new Date().getFullYear();
  while ((n = walker.nextNode())) {
    const t = n.textContent;
    if (!t.trim() || !n.parentElement || /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA)$/.test(n.parentElement.tagName) || !visible(n.parentElement)) continue;
    // Template words only: "Todo" is a real status in a product shot and "your company" is ordinary copy.
    // Blank prices count too: "$XX", "$—", "$__", "TBD".
    const m = t.match(/\b(lorem ipsum|dolor sit amet|acme (corp|inc|co)\b|john doe|jane doe|company name here|insert [a-z]+ here)\b|\[[A-Za-z][^\]\n]{1,28}\]|\{\{[^}]+\}\}/i) || t.match(/\bTODO:|\bTBD\b|[$€£]\s?(XX+|xx+|_{2,}|—|–|-{2})(?![\w])/);
    if (m && placeholders.size < 6) placeholders.add(m[0]);
    const y = t.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)|(20\d\d)\s*©/i);
    if (y && +(y[1] || y[2]) < year) oldYear = y[0];
    if (/\p{Extended_Pictographic}/u.test(t) && n.parentElement.closest("h1, h2, h3, button, a, nav, li")) emoji++;
  }
  if (placeholders.size) add("block", "placeholder copy", [...placeholders].join(", "), "placeholders on the page. Write it: realistic prices, plans, names and data for this product (list them at hand-off as assumptions); leave out what only the world can say (customers, quotes, user counts)");
  if (oldYear) add("warn", "old year in the footer", oldYear, `the copyright line says a past year (it is ${year})`);
  if (emoji >= 2) add("warn", "emoji as icons", "", `${emoji} headings, buttons or nav items carry emoji: use one icon set (icons_search)`);

  // Body text that doesn't read on its ground.
  let lowBody = 0;
  for (const p of [...document.querySelectorAll("p, li")].filter(visible)) {
    if ((p.innerText || "").trim().length < 30) continue;
    const words = holder(p);
    const fg = ink(words), bg = behind(words);
    if (!fg || !bg) continue;
    const c = ratio(over(fg, bg), bg);
    if (c < 4.5 && lowBody++ < 3) add(c < 3 ? "block" : "warn", "low-contrast text", p.innerText, `contrast ${c.toFixed(2)}:1 (body text needs 4.5:1)`);
  }

  // Everything centred.
  const paras = [...document.querySelectorAll("p")].filter((p) => visible(p) && (p.innerText || "").length > 60);
  const centred = paras.filter((p) => getComputedStyle(p).textAlign === "center").length;
  if (paras.length >= 6 && centred / paras.length > 0.75) add("warn", "everything centred", "", `${centred} of ${paras.length} paragraphs are centred: left-align running text; centre only short statements`);

  // Pills, tags and badges: small rounded labels that aren't controls ("New: ...", tag chips, status badges). The user
  // hates them; one above the headline or three anywhere is a blocker.
  const h1 = document.querySelector("h1");
  const h1r = h1 && visible(h1) ? h1.getBoundingClientRect() : null;
  const pills = [];
  let heroPill = null;
  for (const el of document.querySelectorAll("span, div, p, small, li, label, em, strong, mark")) {
    if (pills.length >= 12 || !visible(el) || el.closest("button, a[href], [role=button], input, select, nav, svg")) continue;
    if ([...el.children].some((c) => /^(DIV|P|UL|SECTION|IMG|H[1-6])$/.test(c.tagName))) continue;
    const text = (el.innerText || "").trim();
    if (text.length < 2 || text.length > 32 || /\n/.test(text)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 14 || r.height > 40 || r.width > 300) continue;
    const cs = getComputedStyle(el);
    const fill = parse(cs.backgroundColor);
    const framed = (fill && fill.a > 0.05) || parseFloat(cs.borderTopWidth) > 0;
    if (!framed || parseFloat(cs.borderTopLeftRadius) < r.height * 0.3) continue;
    if (el.parentElement && pills.includes(el.parentElement)) continue;
    pills.push(el);
    if (h1r && r.bottom <= h1r.top + 2 && h1r.top - r.bottom < 160 && r.top < innerHeight) heroPill = text;
  }
  if (heroPill) add("block", "pill above the headline", heroPill, "a pill or badge over the h1 (\"New: ...\"): drop it; say it in the headline or the line under it");
  if (pills.length >= 3) add("block", "pills and tags", pills.slice(0, 5).map((p) => p.innerText.trim()).join(", "), `${pills.length} pill-shaped tags or badges: remove them; let headings and copy carry it`);

  // A "bento" of equal cells is a card grid: a bento is odd-sized, each cell a visual.
  for (const grid of document.querySelectorAll("section, div, ul")) {
    if (getComputedStyle(grid).display !== "grid") continue;
    const kids = [...grid.children].filter(visible);
    if (kids.length < 4 || kids.length > 9) continue;
    const rs = kids.map((k) => k.getBoundingClientRect());
    const same = rs.every((r) => Math.abs(r.width - rs[0].width) < 8 && Math.abs(r.height - rs[0].height) < 8);
    if (same && rs[0].width < W / 2 && kids.every((k) => k.querySelector("h3, h4, strong, p"))) {
      add("warn", "equal-cell grid", (kids[0].innerText || "").trim().split("\n")[0], `a grid of ${kids.length} equal cards: a bento has odd sizes (a big 2x2, a tall 1x2, small 1x1s), each cell a visualisation`);
      break;
    }
  }

  // The three-icon-card feature row.
  let trios = 0;
  for (const parent of document.querySelectorAll("section, div, ul")) {
    const kids = [...parent.children].filter(visible);
    if (kids.length < 3 || kids.length > 4) continue;
    const rs = kids.map((k) => k.getBoundingClientRect());
    const sameRow = rs.every((r) => Math.abs(r.top - rs[0].top) < 4 && Math.abs(r.width - rs[0].width) < 6);
    if (!sameRow || rs[0].width > W / 2.4) continue;
    const shaped = kids.every((k) => k.querySelector("svg, img") && k.querySelector("h3, h4, strong") && k.querySelector("p"));
    const iconSmall = kids.every((k) => { const i = k.querySelector("svg, img"); return i && i.getBoundingClientRect().width <= 64; });
    if (shaped && iconSmall) trios++;
  }
  if (trios) add("warn", "icon-card row", "", `${trios} row(s) of identical cards, each an icon + heading + line: the stock AI feature grid. Show the feature itself (a screenshot, a demo, a number) instead`);

  // "Trusted by" rows of plain words posing as logos.
  for (const h of [...document.querySelectorAll("p, span, h2, h3, h4, div")].filter((e) => visible(e) && /^(trusted|backed|used|loved|chosen) by|teams at|companies like/i.test((e.innerText || "").trim()) && (e.innerText || "").length < 80)) {
    const row = h.nextElementSibling;
    if (!row) continue;
    const items = [...row.children].filter(visible);
    if (items.length >= 4 && items.every((i) => !i.querySelector("img, svg") && !/^(IMG|SVG)$/.test(i.tagName))) {
      add("warn", "logos are words", items.slice(0, 4).map((i) => i.innerText).join(", "), "the logo row is plain text: use the real logos (SVG), or drop the row");
      break;
    }
  }

  // No hover or focus styles anywhere.
  let hover = false, focus = false, sheetsRead = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    sheetsRead++;
    const walk = (list) => {
      for (const r of list) {
        if (r.selectorText) {
          if (/:hover/.test(r.selectorText)) hover = true;
          if (/:focus/.test(r.selectorText)) focus = true;
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  if (sheetsRead && styled.length >= 2) {
    if (!hover) add("warn", "no hover states", "", "no :hover rule anywhere: buttons and links don't answer the mouse");
    if (!focus) add("warn", "no focus states", "", "no :focus or :focus-visible rule: keyboard users can't see where they are");
  }
  return out;
}

/** In the page, at the top with no input: the big visuals in the first screen (canvas, video, data-visual), as boxes. */
export function heroVisualBoxes() {
  const vw = innerWidth, vh = innerHeight;
  // Text and controls over the visual are left out of the measure: a headline set on a blank effect is still blank.
  const holes = [...document.querySelectorAll("h1, h2, h3, p, a, button, nav, header")]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0)
    .slice(0, 60)
    .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  return [...document.querySelectorAll("canvas, video, [data-visual]")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width * r.height > vw * vh * 0.15 && r.top < vh && r.bottom > 0)
    .slice(0, 4)
    .map(({ el, r }) => ({ tag: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""), x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(vw, r.right) - Math.max(0, r.left), h: Math.min(vh, r.bottom) - Math.max(0, r.top), holes }));
}

/**
 * A visual that shows nothing until someone moves the mouse: its box on the untouched first-screen shot is one flat
 * colour. Returns findings for aiTellsInPage's list. buf: the first slice (jpeg), scale: the shot's scale.
 */
export async function blankVisuals(buf, boxes, scale = 1) {
  if (!buf?.length || !boxes?.length) return [];
  const img = await Jimp.read(buf);
  const out = [];
  for (const b of boxes) {
    const x0 = Math.max(0, Math.round(b.x * scale)), y0 = Math.max(0, Math.round(b.y * scale));
    const x1 = Math.min(img.width, Math.round((b.x + b.w) * scale)), y1 = Math.min(img.height, Math.round((b.y + b.h) * scale));
    const step = Math.max(2, Math.round(Math.min(x1 - x0, y1 - y0) / 60));
    const ls = [];
    const inHole = (x, y) => (b.holes || []).some((h) => x >= h.x * scale && x <= (h.x + h.w) * scale && y >= h.y * scale && y <= (h.y + h.h) * scale);
    for (let y = y0; y < y1; y += step)
      for (let x = x0; x < x1; x += step) {
        if (inHole(x, y)) continue;
        const c = img.getPixelColor(x, y);
        ls.push(0.299 * ((c >>> 24) & 255) + 0.587 * ((c >>> 16) & 255) + 0.114 * ((c >>> 8) & 255));
      }
    if (ls.length < 20) continue;
    // Blank = nearly all of the box is one flat colour. The headline set over it covers a small share, so it doesn't count.
    const median = [...ls].sort((p, q) => p - q)[Math.floor(ls.length / 2)];
    const flat = ls.filter((l) => Math.abs(l - median) <= 8).length / ls.length;
    const why = "It must look striking on its own (moving by itself: drifting, rotating, flowing, clearly visible on its ground) and get cooler on cursor and scroll";
    if (flat > 0.995) out.push({ sev: "block", kind: "visual blank at rest", text: b.tag, detail: `the ${b.tag} in the first screen is one flat colour until someone interacts. ${why}` });
    else if (flat > 0.985) out.push({ sev: "warn", kind: "visual faint at rest", text: b.tag, detail: `the ${b.tag} in the first screen is ${(flat * 100).toFixed(1)}% one flat colour without input: most visitors see almost nothing. ${why}` });
  }
  return out;
}

/** Findings -> { blockers, warnings }. Blockers start with "broken:" so the fast loop treats them as breakage. */
export function judgeTells(tells = []) {
  const blockers = [];
  const warnings = [];
  for (const t of tells) {
    const line = `${t.kind}${t.text ? ` "${t.text}"` : ""}: ${t.detail}`;
    (t.sev === "block" ? blockers : warnings).push(t.sev === "block" ? `broken: ${line}` : line);
  }
  return { blockers, warnings };
}

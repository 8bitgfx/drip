// Full-page capture and a measured page audit through the Chrome DevTools Protocol (no Puppeteer:
// the user's Chrome/Edge + Node's built-in WebSocket). Used by fitcheck_shot and critic_prepare so
// judgements see the WHOLE page and rest on measured facts, not just the first screen.
import { z } from "zod";
import { openPage, settle, withTab } from "./browser.mjs";

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
  const h2l = [...document.querySelectorAll('h2')].filter(visible).map((h) => Math.round(parseFloat(getComputedStyle(h).fontSize))).sort((a, b) => a - b);
  const h2 = h2l.length ? h2l[Math.floor(h2l.length / 2)] : null;
  // Pictures: media elements, elements with a background image, and anything marked data-visual (a built visual).
  const pics = [...document.querySelectorAll('body *')].filter((el) => visible(el) && (/^(IMG|PICTURE|VIDEO|CANVAS|SVG|IFRAME)$/i.test(el.tagName) || el.hasAttribute('data-visual') || getComputedStyle(el).backgroundImage.includes('url('))).map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top + scrollY, bottom: r.bottom + scrollY, w: r.width, h: r.height }; }).filter((p) => p.w * p.h > 160 * 120);
  // First viewport (the page is scrolled to the top here).
  let bigPic = { w: 0, h: 0 };
  for (const p of pics) { const h = Math.min(p.bottom, vh) - Math.max(p.top, 0); if (h > 0 && p.w * h > bigPic.w * bigPic.h) bigPic = { w: Math.round(p.w), h: Math.round(h) }; }
  let lowest = 0;
  for (const [t, b] of marks) if (t < vh) lowest = Math.max(lowest, Math.min(b, vh));
  for (const p of pics) if (p.top < vh) lowest = Math.max(lowest, Math.min(p.bottom, vh));
  const actions = [...document.querySelectorAll('a, button, [role=button]')].filter((el) => { if (!visible(el)) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.top < vh && r.top > 0 && r.height >= 32 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0); }).length;
  const hero = { h1w: h1 ? Math.round(h1.getBoundingClientRect().width) : 0, h1Visible: h1 ? h1.getBoundingClientRect().top < vh : false, pic: bigPic, emptyBelow: Math.round(vh - lowest), actions };
  // Sections below the first screen, and whether each shows a picture.
  let secs = [...document.querySelectorAll('section')].filter(visible);
  if (secs.length < 3) { const root = document.querySelector('main') || document.body; secs = [...root.children].filter((el) => visible(el) && el.getBoundingClientRect().height > 200); }
  secs = secs.filter((s) => !secs.some((o) => o !== s && o.contains(s)));
  const sections = secs.map((s) => { const r = s.getBoundingClientRect(); const top = r.top + scrollY; const head = s.querySelector('h2, h3'); return { top: Math.round(top), h: Math.round(r.height), id: s.id || (head ? head.textContent.trim().slice(0, 30) : s.tagName.toLowerCase()), pic: pics.some((p) => s.contains(p.el) && p.w >= 240 && p.h >= 160) }; }).filter((x) => x.top >= vh * 0.6);
  // How empty each screen is: share of its height with no text, control or picture.
  const spans = marks.concat(pics.map((p) => [p.top, p.bottom])).filter(([t, b]) => b - t < vh * 1.5).sort((a, b) => a[0] - b[0]);
  const screens = [];
  for (let y = 0; y + vh * 0.5 <= doc.scrollHeight; y += vh) {
    const end = Math.min(y + vh, doc.scrollHeight); let covered = 0, cur = y;
    for (const [t, b] of spans) { const s0 = Math.max(t, cur), s1 = Math.min(b, end); if (s1 > s0) { covered += s1 - s0; cur = s1; } }
    screens.push(+(1 - covered / (end - y)).toFixed(2));
  }
  const skeletons = [...document.querySelectorAll('[class*="skeleton" i], [class*="shimmer" i], [class*="placeholder" i]:not(input):not(textarea), [aria-busy="true"], [class*="spinner" i], [class*="loading" i]')].filter(visible).length;
  return { skeletons, viewportMeta: !!document.querySelector('meta[name=viewport]'), width: vw, vh, height: doc.scrollHeight, screens: +(doc.scrollHeight / vh).toFixed(1), overflowX, scrollWidth: doc.scrollWidth, offenders,
    fontSizes: Object.entries(sizes).sort((a, b) => b[1] - a[1]).map(([s, n]) => [+s, n]), families: Object.entries(families).sort((a, b) => b[1] - a[1]), weights: Object.keys(weights).length,
    words, smallShare: words ? +(small / words).toFixed(2) : 0, gaps, media, h1: h1s, h2, bodyText: medianP, hero, sections, empty: screens, title: document.title };
})()`;

// Text something else is drawn over (decoration, a sticker, paint, a badge): the browser is asked what is on top at
// points along each line of text, a screen at a time. pointer-events are forced on while it looks, because decoration is
// usually pointer-events: none. Written without backslashes or template placeholders: it is embedded as text.
const COVERED = `(async () => {
  const st = document.createElement('style'); st.textContent = '* { pointer-events: auto !important; }'; document.head.appendChild(st);
  const name = (el) => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''));
  const out = []; const seen = new Set(); let checks = 0;
  const h = document.documentElement.scrollHeight; const vh = innerHeight;
  for (let y = 0; y < h && y < vh * 14 && out.length < 10; y += vh) {
    scrollTo(0, y); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode()) && checks < 4000 && out.length < 10) {
      const t = n.textContent.trim(); if (t.length < 2 || seen.has(n)) continue;
      const el = n.parentElement; if (!el) continue;
      const cs0 = getComputedStyle(el); if (cs0.visibility === 'hidden' || +cs0.opacity < 0.1) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of [...range.getClientRects()].slice(0, 4)) {
        if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > vh) continue;
        checks++;
        let hits = 0, by = null;
        for (let f = 0.04; f < 1; f += 0.08) {
          const x = r.left + r.width * f, yy = r.top + r.height * 0.5;
          if (x < 0 || yy < 0 || x >= innerWidth || yy >= vh) continue;
          const top = document.elementFromPoint(x, yy);
          if (!top || top === el || el.contains(top) || top.contains(el)) continue;
          const cs = getComputedStyle(top);
          if (+cs.opacity < 0.35 || cs.visibility === 'hidden') continue;
          let pinned = false; for (let a = top; a && a !== document.body; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') { pinned = true; break; } }
          if (pinned) continue; // a sticky header over text while scrolling is not a layout fault
          if (cs.display === 'inline' || cs.mixBlendMode !== 'normal') continue; // text runs and blend-mode effect layers
          if ([...top.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue; // text over text: layered type, cards in a product shot
          const tr = top.getBoundingClientRect(); if (tr.width * tr.height > innerWidth * vh * 0.5) continue; // a screen-sized texture or grain overlay
          const solid = (() => { const m = cs.backgroundColor.match(/[0-9.]+/g); return m && (m.length < 4 || +m[3] >= 0.5); })();
          if (!(solid || /url[(]/.test(cs.backgroundImage) || /^(IMG|SVG|PATH|CANVAS|VIDEO|PICTURE)$/i.test(top.tagName))) continue; // outlines, shines and gradients don't hide words
          let lca = top.parentElement; while (lca && !lca.contains(el)) lca = lca.parentElement;
          if (lca && lca !== document.body) { const lr = lca.getBoundingClientRect(); if (lr.width * lr.height < innerWidth * vh * 0.25) continue; } // layering inside one card or illustration
          if (top.closest('[aria-hidden=true]') && el.closest('[aria-hidden=true]') === top.closest('[aria-hidden=true]')) continue; // both inside one illustration
          hits++; by = top;
        }
        if (hits >= 1) { seen.add(n); out.push({ text: t.slice(0, 48), by: name(by), image: /^(IMG|PICTURE|VIDEO)$/i.test(by.tagName) || /url[(]/.test(getComputedStyle(by).backgroundImage), y: Math.round(r.top + scrollY) }); break; }
      }
    }
  }
  scrollTo(0, 0); st.remove();
  return out;
})()`;

/**
 * Open `url` at `width` x `height`, return { audit, slices: [Buffer jpeg…] } where slices cover the whole page,
 * one viewport each (max `maxSlices`, evenly spaced if the page is longer).
 */
export async function capture(url, { width = 1440, height = 900, maxSlices = 6, quality = 78, scale = 1, idle = false, brand = false, config } = {}) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    await openPage(tab, url, { width, height, idle });
    // Scroll through once so lazy content and scroll-triggered reveals render, then back to the top.
    await s("Runtime.evaluate", { expression: "(async()=>{const h=document.documentElement.scrollHeight;const step=Math.max(innerHeight,h/24);for(let y=0;y<h;y+=step){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);})()", awaitPromise: true });
    await settle(s, 800);
    const { result } = await s("Runtime.evaluate", { expression: AUDIT, returnByValue: true });
    const audit = result.value;
    audit.covered = (await s("Runtime.evaluate", { expression: COVERED, awaitPromise: true, returnByValue: true })).result?.value || [];
    if (brand) audit.brand = (await s("Runtime.evaluate", { expression: BRAND, returnByValue: true })).result.value;
    const total = Math.min(audit.height, 30000);
    const count = Math.max(1, Math.ceil(total / height));
    const picks = count <= maxSlices ? [...Array(count).keys()] : maxSlices <= 1 ? [0] : [...Array(maxSlices).keys()].map((i) => Math.round((i * (count - 1)) / (maxSlices - 1)));
    const slices = [];
    for (const i of picks) {
      const y = Math.min(i * height, Math.max(0, total - height));
      const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: true, clip: { x: 0, y, width, height: Math.min(height, total - y), scale } });
      slices.push({ y, buf: Buffer.from(data, "base64") });
    }
    return { audit, slices, sliceCount: count };
  });
}

/** The Display token from kit/base.css: clamp(3rem, 1.2rem + 7.5vw, 9rem). */
export const displayPx = (vw) => Math.min(144, Math.max(48, 19.2 + 0.075 * vw));

/**
 * Hard problems in an audit (block a pass) and softer warnings.
 * persuade: a landing page, portfolio or showcase (the playbook's numbers apply). hero: judge only the first viewport.
 */
export function judgeAudit(a, { persuade = true, hero = false } = {}) {
  const blockers = [];
  const warnings = [];
  const desk = a.width >= 1000;
  const phone = a.width < 600;
  if (phone && a.viewportMeta === false) blockers.push('no <meta name="viewport" content="width=device-width, initial-scale=1">: phones render the page at 980px and shrink it');
  const shapes = (a.covered || []).filter((c) => !c.image);
  const pics = (a.covered || []).filter((c) => c.image);
  if (pics.length) warnings.push(`images over text: ${pics.slice(0, 3).map((c) => `"${c.text}" under ${c.by}`).join("; ")}. Fine in a deliberate collage; check the words still read`);
  if (shapes.length)
    blockers.push(`text covered by a shape: ${shapes.slice(0, 4).map((c) => `"${c.text}" under ${c.by} (y ${c.y})`).join("; ")}. Decoration that crosses content goes behind it, makes room for it, or the content moves; something drawn over words needs a reason and real depth (shadow, highlight, edge), never a flat shape pasted on top`);
  if (a.overflowX) blockers.push(`horizontal overflow at ${a.width}px: page is ${a.scrollWidth}px wide (${a.offenders.join(", ") || "unknown element"})`);
  // ---- hero gate (playbook P31): runs on every shot of a Persuade page ----
  if (persuade && a.hero) {
    const want = Math.round(displayPx(a.width));
    if (!a.h1) blockers.push("no h1: the hero needs its headline as the h1");
    else if (a.h1 < want * 0.85) blockers.push(`h1 is ${a.h1}px; the Display token at ${a.width}px is ~${want}px (kit/base.css --t-display). Go bigger, fewer words`);
    if (a.hero.h1Visible === false) blockers.push("the h1 is not in the first viewport");
    if (desk) {
      const container = Math.min(a.width - 128, 1312);
      const picOk = a.hero.pic.w >= container * 0.45 && a.hero.pic.h >= (a.vh || 900) * 0.6;
      const typeOk = a.hero.h1w >= container * 0.62;
      if (!picOk && !typeOk) blockers.push(`hero is small: biggest picture ${a.hero.pic.w}x${a.hero.pic.h}px, h1 ${a.hero.h1w}px wide. Needs a picture >= 6 columns and >= 60% of the screen tall, or an h1 spanning 8+ columns`);
      if (!a.hero.actions) warnings.push("no visible action (button or styled link) in the first viewport");
    }
    if (a.hero.emptyBelow > 160) blockers.push(`${a.hero.emptyBelow}px of nothing at the bottom of the first viewport (max 160). Make the content bigger, never the gap`);
  }
  if (hero) return { blockers, warnings };
  // ---- page gate (playbook P39) ----
  const sizes = a.fontSizes.filter(([, n]) => n >= 2).length;
  if (sizes > 7) blockers.push(`${sizes} different text sizes; the kit has 7 roles (kit/base.css). Map every size to a role`);
  const fams = a.families.filter(([, n]) => n >= 3);
  if (fams.length > (persuade ? 2 : 3)) blockers.push(`${fams.length} font families (${fams.map(([f]) => f).join(", ")}); one display face + one text face`);
  if (a.smallShare > (persuade ? 0.15 : 0.3)) blockers.push(`${Math.round(a.smallShare * 100)}% of the words are under 14px; nothing but the legal line goes under the Small role (14px)`);
  else if (a.smallShare > 0.08) warnings.push(`${Math.round(a.smallShare * 100)}% of words under 14px`);
  if (persuade && a.bodyText && a.bodyText < (phone ? 16 : 17)) blockers.push(`typical paragraph is ${a.bodyText}px; Body is ${phone ? 17 : 18}px (min ${phone ? 16 : 17})`);
  else if (a.bodyText && a.bodyText < 14) warnings.push(`typical paragraph size ${a.bodyText}px`);
  const monoShare = a.families.filter(([f]) => /mono|courier|code/i.test(f)).reduce((t, [, n]) => t + n, 0) / Math.max(1, a.words);
  if (persuade && monoShare > 0.1) blockers.push(`${Math.round(monoShare * 100)}% of the text is monospace (max 10%): mono only inside code, measurements or tables, never labels, nav or body`);
  else if (monoShare > 0.4) warnings.push(`${Math.round(monoShare * 100)}% of the text is monospace`);
  if (persuade && desk && a.h2 && a.h2 < 40) blockers.push(`median h2 is ${a.h2}px (min 40; the Section role is 56px)`);
  if (persuade && a.empty?.length) {
    const bad = a.empty.map((e, i) => [i + 1, e]).filter(([, e]) => e > 0.5);
    if (bad.length) blockers.push(`screen(s) ${bad.map(([i, e]) => `${i} (${Math.round(e * 100)}% empty)`).join(", ")}: more than half empty. Bigger content or a picture, never padding`);
    else if (a.empty.some((e) => e > 0.4)) warnings.push(`some screens are over 40% empty: ${a.empty.map((e) => Math.round(e * 100) + "%").join(" ")}`);
  }
  if (persuade && a.sections?.length) {
    const bare = a.sections.filter((s) => !s.pic);
    const touching = a.sections.some((s, i) => i > 0 && !s.pic && !a.sections[i - 1].pic);
    if (touching) blockers.push(`two sections without a picture touch (${bare.map((s) => `"${s.id}"`).join(", ")}). Every section shows something: the work, the product, a photo, or a built visual marked data-visual`);
    else if (bare.length) warnings.push(`sections without a picture: ${bare.map((s) => `"${s.id}"`).join(", ")}`);
  }
  const bigGaps = a.gaps.filter(([t, b]) => b - t > 900);
  if (bigGaps.length) warnings.push(`${bigGaps.length} empty stretch(es) taller than a screen: ${bigGaps.map(([t, b]) => `${t}-${b}px`).join(", ")}`);
  if (a.media === 0) (persuade ? blockers : warnings).push("no images, video or illustration anywhere on the page");
  if (a.skeletons > 2) warnings.push(`${a.skeletons} loading placeholders (skeleton/spinner) still visible: this shot may show a loading state, not the page`);
  return { blockers, warnings };
}

export function formatAudit(a, j) {
  return (
    `${a.width}px: ${a.screens} screens tall · text sizes ${a.fontSizes.slice(0, 8).map(([s, n]) => `${s}px×${n}`).join(" ")} · families ${a.families.map(([f, n]) => `${f}×${n}`).join(", ")} · ` +
    `${Math.round(a.smallShare * 100)}% words <14px · h1 ${a.h1 ?? "-"}px · h2 ${a.h2 ?? "-"}px · paragraphs ${a.bodyText ?? "-"}px · media ${a.media}` +
    (a.hero ? `\n  first viewport: h1 ${a.hero.h1w}px wide · biggest picture ${a.hero.pic.w}x${a.hero.pic.h}px · ${a.hero.emptyBelow}px empty at the bottom · ${a.hero.actions} action(s)` : "") +
    (a.empty?.length > 1 ? `\n  empty per screen: ${a.empty.map((e) => Math.round(e * 100) + "%").join(" ")}` : "") +
    (a.sections?.length ? ` · sections with a picture: ${a.sections.filter((s) => s.pic).length}/${a.sections.length}` : "") +
    (a.skeletons > 2 ? `\n  LOADING STATE? ${a.skeletons} skeleton/spinner elements visible` : "") +
    (j.blockers.length ? `\n  BLOCKERS: ${j.blockers.join(" | ")}` : "") +
    (j.warnings.length ? `\n  warnings: ${j.warnings.join(" | ")}` : "")
  );
}

/** A site's own brand, read from the live page: logo candidates, fonts, colours by area. For redesigns. */
const BRAND = `(() => {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
  const logos = [];
  const head = document.querySelector('header, [role=banner], nav') || document.body;
  for (const el of head.querySelectorAll('img, svg, [class*="logo" i], [id*="logo" i], a[href="/"] img, a[href="/"] svg')) {
    const r = el.getBoundingClientRect(); if (!r.width || r.top > 200) continue;
    if (el.tagName === 'IMG') logos.push({ kind: 'img', src: abs(el.currentSrc || el.src), w: Math.round(r.width), h: Math.round(r.height), alt: el.alt || '' });
    else if (el.tagName.toLowerCase() === 'svg') logos.push({ kind: 'svg', svg: el.outerHTML.slice(0, 20000), w: Math.round(r.width), h: Math.round(r.height) });
    if (logos.length >= 4) break;
  }
  const icons = [...document.querySelectorAll('link[rel*="icon" i], link[rel="apple-touch-icon"], meta[property="og:image"]')].map((l) => abs(l.href || l.content)).filter(Boolean).slice(0, 5);
  const fam = {}; const col = {}; const bg = {};
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); const area = r.width * r.height;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) { const f = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); fam[f] = (fam[f] || 0) + 1; col[cs.color] = (col[cs.color] || 0) + 1; }
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bg[cs.backgroundColor] = (bg[cs.backgroundColor] || 0) + area;
  }
  bg[getComputedStyle(document.body).backgroundColor] = (bg[getComputedStyle(document.body).backgroundColor] || 0) + innerWidth * innerHeight;
  const hex = (c) => { const m = c.match(/\\d+(\\.\\d+)?/g); if (!m || (m[3] !== undefined && +m[3] < 0.5)) return null; return '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join(''); };
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k]) => hex(k)).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, n);
  const faces = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')).filter((v, i, a) => a.indexOf(v) === i);
  return { title: document.title, logos, icons, fonts: Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f]) => f), webfonts: faces.slice(0, 6), backgrounds: top(bg, 5), textColors: top(col, 5) };
})()`;

export function formatBrand(b) {
  if (!b) return "";
  return (
    `BRAND (as shipped): fonts ${b.fonts.join(", ") || "?"}${b.webfonts.length ? ` (web fonts: ${b.webfonts.join(", ")})` : ""} · backgrounds ${b.backgrounds.join(" ")} · text ${b.textColors.join(" ")}\n` +
    `  logo: ${b.logos.map((l) => (l.kind === "img" ? `${l.src} (${l.w}x${l.h})` : `inline SVG ${l.w}x${l.h}`)).join(" · ") || "none found in the header"}` +
    (b.icons.length ? `\n  icons/og: ${b.icons.join(" · ")}` : "")
  );
}

/** One interaction step for fitcheck_shot / critic_prepare. */
export const STEP = z.object({
  do: z.enum(["click", "hover", "drag", "type", "key", "scroll", "wait", "shot"]),
  selector: z.string().optional().describe("CSS selector of the element to act on"),
  to: z.union([z.string(), z.object({ x: z.number(), y: z.number() })]).optional().describe("drag: a selector to drop on, or an offset {x, y} in px from the start"),
  text: z.string().optional().describe("type: the text; key: a key name (Enter, Escape, Tab, ArrowDown)"),
  y: z.number().optional().describe("scroll: page y in px"),
  ms: z.number().optional().describe("wait: milliseconds (max 5000)"),
  label: z.string().optional().describe("What this state shows, for the critic"),
  shot: z.boolean().optional().describe("Screenshot after this step (default true; false to chain steps)"),
});

const KEYS = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32, Backspace: 8 };

/**
 * Load `url`, then run `steps` with real input events (the browser's own mouse, so pointer, mouse and drag
 * handlers all fire) and screenshot the viewport after each. Returns [{ label, buf, error? }].
 */
export async function captureStates(url, steps, { width = 1440, height = 900, quality = 80, config } = {}) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    await openPage(tab, url, { width, height });
    const center = async (sel) => {
      const { result } = await s("Runtime.evaluate", {
        expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
        returnByValue: true,
      });
      if (!result.value) throw new Error(`no element matches ${sel}`);
      return result.value;
    };
    const mouse = (type, x, y, extra = {}) => s("Input.dispatchMouseEvent", { type, x, y, button: "left", pointerType: "mouse", ...extra });
    const out = [];
    for (const [i, st] of steps.slice(0, 12).entries()) {
      let error = null;
      try {
        if (st.do === "click" || st.do === "hover") {
          const p = await center(st.selector);
          await mouse("mouseMoved", p.x, p.y, { buttons: 0 });
          if (st.do === "click") {
            await mouse("mousePressed", p.x, p.y, { clickCount: 1, buttons: 1 });
            await mouse("mouseReleased", p.x, p.y, { clickCount: 1, buttons: 0 });
          }
        } else if (st.do === "drag") {
          const a = await center(st.selector);
          const b = typeof st.to === "string" ? await center(st.to) : { x: a.x + (st.to?.x || 0), y: a.y + (st.to?.y || 0) };
          await mouse("mouseMoved", a.x, a.y, { buttons: 0 });
          await mouse("mousePressed", a.x, a.y, { clickCount: 1, buttons: 1 });
          for (let k = 1; k <= 12; k++) {
            await mouse("mouseMoved", a.x + ((b.x - a.x) * k) / 12, a.y + ((b.y - a.y) * k) / 12, { buttons: 1 });
            await new Promise((r) => setTimeout(r, 16));
          }
          await mouse("mouseReleased", b.x, b.y, { clickCount: 1, buttons: 0 });
        } else if (st.do === "type") {
          if (st.selector) await s("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(st.selector)})?.focus()` });
          await s("Input.insertText", { text: st.text || "" });
        } else if (st.do === "key") {
          const key = st.text || "Enter";
          const code = KEYS[key] || key.toUpperCase().charCodeAt(0);
          await s("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode: code, code: key });
          await s("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code, code: key });
        } else if (st.do === "scroll") {
          await s("Runtime.evaluate", { expression: st.selector ? `document.querySelector(${JSON.stringify(st.selector)})?.scrollIntoView({ block: 'start' })` : `scrollTo(0, ${Number(st.y) || 0})` });
        } else if (st.do === "wait") {
          await new Promise((r) => setTimeout(r, Math.min(5000, st.ms || 500)));
        }
      } catch (e) {
        error = e.message;
      }
      if (st.shot === false) continue;
      await settle(s, 900);
      const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality, clip: { x: 0, y: 0, width, height, scale: width > 1200 ? 1200 / width : 1 } });
      out.push({ label: st.label || `${i + 1}. ${st.do}${st.selector ? ` ${st.selector}` : ""}`, buf: Buffer.from(data, "base64"), error });
    }
    return out;
  });
}

const KEY_CODES = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Space: 32, Backspace: 8, Home: 36, End: 35 };

/** The step kinds runStep understands: STEP's plus press / release (hold the mouse button down) and focus. */
export const STEP_KINDS = ["click", "hover", "drag", "type", "key", "scroll", "wait", "shot", "press", "release", "focus"];

/**
 * Perform one interaction step with real input on a tab ({ s } from withTab), without taking a screenshot.
 * Same semantics as captureStates, plus "press" (mouse down and hold: the :active state), "release" and
 * "focus" (keyboard-style focus on a selector). Throws when a selector matches nothing.
 */
export async function runStep(s, st) {
  const center = async (sel) => {
    const { result } = await s("Runtime.evaluate", {
      expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
      returnByValue: true,
    });
    if (!result.value) throw new Error(`no element matches ${sel}`);
    return result.value;
  };
  const mouse = (type, x, y, extra = {}) => s("Input.dispatchMouseEvent", { type, x, y, button: "left", pointerType: "mouse", ...extra });
  const kind = st.do;
  if (kind === "click" || kind === "hover" || kind === "press") {
    const p = await center(st.selector);
    await mouse("mouseMoved", p.x, p.y, { buttons: 0 });
    if (kind === "click") {
      await mouse("mousePressed", p.x, p.y, { clickCount: 1, buttons: 1 });
      await mouse("mouseReleased", p.x, p.y, { clickCount: 1, buttons: 0 });
    } else if (kind === "press") await mouse("mousePressed", p.x, p.y, { clickCount: 1, buttons: 1 });
  } else if (kind === "release") {
    const p = st.selector ? await center(st.selector) : { x: 0, y: 0 };
    await mouse("mouseReleased", p.x, p.y, { clickCount: 1, buttons: 0 });
  } else if (kind === "drag") {
    const a = await center(st.selector);
    const b = typeof st.to === "string" ? await center(st.to) : { x: a.x + (st.to?.x || 0), y: a.y + (st.to?.y || 0) };
    await mouse("mouseMoved", a.x, a.y, { buttons: 0 });
    await mouse("mousePressed", a.x, a.y, { clickCount: 1, buttons: 1 });
    for (let k = 1; k <= 12; k++) {
      await mouse("mouseMoved", a.x + ((b.x - a.x) * k) / 12, a.y + ((b.y - a.y) * k) / 12, { buttons: 1 });
      await new Promise((r) => setTimeout(r, 16));
    }
    await mouse("mouseReleased", b.x, b.y, { clickCount: 1, buttons: 0 });
  } else if (kind === "type") {
    if (st.selector) await s("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(st.selector)})?.focus()` });
    await s("Input.insertText", { text: st.text || "" });
  } else if (kind === "focus") {
    const { result } = await s("Runtime.evaluate", { expression: `(() => { const el = document.querySelector(${JSON.stringify(st.selector)}); if (!el) return false; el.focus(); return true; })()`, returnByValue: true });
    if (!result.value) throw new Error(`no element matches ${st.selector}`);
  } else if (kind === "key") {
    const key = st.text || "Enter";
    const code = KEY_CODES[key] || key.toUpperCase().charCodeAt(0);
    const text = key === "Space" ? " " : key.length === 1 ? key : undefined;
    await s("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: key === "Space" ? " " : key, windowsVirtualKeyCode: code, code: key === "Space" ? "Space" : key, ...(text ? { text } : {}) });
    await s("Input.dispatchKeyEvent", { type: "keyUp", key: key === "Space" ? " " : key, windowsVirtualKeyCode: code, code: key === "Space" ? "Space" : key });
  } else if (kind === "scroll") {
    await s("Runtime.evaluate", { expression: st.selector ? `document.querySelector(${JSON.stringify(st.selector)})?.scrollIntoView({ block: 'start' })` : `scrollTo(0, ${Number(st.y) || 0})` });
  } else if (kind === "wait") {
    await new Promise((r) => setTimeout(r, Math.min(5000, st.ms || 500)));
  }
}

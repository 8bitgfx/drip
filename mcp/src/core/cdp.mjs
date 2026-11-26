// Full-page capture and a measured page audit through the Chrome DevTools Protocol (no Puppeteer:
// the user's Chrome/Edge + Node's built-in WebSocket). Used by fitcheck_shot and critic_prepare so
// judgements see the WHOLE page and rest on measured facts, not just the first screen.
import { z } from "zod";
import { openPage, settle, withTab } from "./browser.mjs";
import { aiTellsInPage, blankVisuals, canvasBoxes, deadCanvases, heroVisualBoxes, judgeTells } from "./ai-tells.mjs";

// Sent to the page as source: real functions (linted, testable) instead of more escaped template strings.
const TELLS = `(${aiTellsInPage.toString()})()`;
const HERO_BOXES = `(${heroVisualBoxes.toString()})()`;
const CANVAS_BOXES = `(${canvasBoxes.toString()})()`;

/** The audit script, run inside the page. Returns plain JSON. */
const AUDIT = `(() => {
  const vw = innerWidth, vh = innerHeight;
  // Screen-reader-only copy (a 1px box, clipped away) is not on screen: never measured, never "cut off".
  const srOnly = (r, cs) => (r.width <= 1.5 && r.height <= 1.5) || cs.clip === 'rect(0px, 0px, 0px, 0px)' || /inset[(](50|100)%/.test(cs.clipPath);
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && !srOnly(r, cs); };
  // Rendered size: the computed font-size times the scale it is drawn at (an SVG text under a viewBox, a CSS transform), never the attribute.
  const tcache = new Map();
  const scaleOf = (el) => {
    if (el instanceof SVGElement) { const m = el.getScreenCTM ? el.getScreenCTM() : null; return m ? (Math.hypot(m.a, m.b) || 1) : 1; }
    let k = 1;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      if (!tcache.has(a)) { let f = 1; const t = getComputedStyle(a).transform; if (t && t !== 'none') { try { const m = new DOMMatrix(t); f = Math.hypot(m.a, m.b) || 1; } catch (e) { f = 1; } } tcache.set(a, f); }
      k *= tcache.get(a);
    }
    return k;
  };
  const rpx = (el, cs) => parseFloat((cs || getComputedStyle(el)).fontSize) * scaleOf(el);
  const textEls = [...document.querySelectorAll('body *')].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && visible(el));
  const sizes = {}, families = {}, weights = {};
  let small = 0, words = 0;
  for (const el of textEls) {
    const cs = getComputedStyle(el); const s = Math.round(rpx(el, cs));
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
  const h1 = document.querySelector('h1'); const h1s = h1 ? Math.round(rpx(h1)) : null;
  const bodyP = [...document.querySelectorAll('p')].filter(visible).map((p) => Math.round(rpx(p)));
  const medianP = bodyP.length ? bodyP.sort((a, b) => a - b)[Math.floor(bodyP.length / 2)] : null;
  const h2l = [...document.querySelectorAll('h2')].filter(visible).map((h) => Math.round(rpx(h))).sort((a, b) => a - b);
  const h2 = h2l.length ? h2l[Math.floor(h2l.length / 2)] : null;
  // Pictures: media elements, elements with a background image, and anything marked data-visual (a built visual).
  const pics = [...document.querySelectorAll('body *')].filter((el) => visible(el) && (/^(IMG|PICTURE|VIDEO|CANVAS|SVG|IFRAME)$/i.test(el.tagName) || el.hasAttribute('data-visual') || getComputedStyle(el).backgroundImage.includes('url('))).map((el) => { const r = el.getBoundingClientRect(); return { el, top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, w: r.width, h: r.height }; }).filter((p) => p.w * p.h > 160 * 120);
  // First viewport (the page is scrolled to the top here).
  let bigPic = { w: 0, h: 0 };
  let bigEl = null;
  for (const p of pics) { const h = Math.min(p.bottom, vh) - Math.max(p.top, 0); if (h > 0 && p.w * h > bigPic.w * bigPic.h) { bigPic = { w: Math.round(p.w), h: Math.round(h) }; bigEl = p.el; } }
  // A product window (browser / app frame, device, card with a border, shadow or its own ground) around the picture is
  // the picture: measure the frame, not only the screenshot inside it.
  if (bigEl) {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    let a = bigEl.parentElement;
    for (let i = 0; i < 5 && a && a !== document.body; i++, a = a.parentElement) {
      const cs = getComputedStyle(a);
      const framed = parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== bodyBg);
      const r = a.getBoundingClientRect();
      if (r.width > innerWidth * 0.8 || r.width * r.height > innerWidth * vh * 0.8) break;
      const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (framed && h > 0 && r.width * h > bigPic.w * bigPic.h) bigPic = { w: Math.round(r.width), h: Math.round(h), frame: true };
    }
  }
  const inView = pics.filter((p) => p.top < vh && p.bottom > 0);
  if (inView.length >= 3) {
    const w = Math.max(...inView.map((p) => p.right)) - Math.min(...inView.map((p) => p.left));
    const h = Math.min(vh, Math.max(...inView.map((p) => p.bottom))) - Math.max(0, Math.min(...inView.map((p) => p.top)));
    if (w * h > bigPic.w * bigPic.h) bigPic = { w: Math.round(w), h: Math.round(h), group: inView.length };
  }
  let lowest = 0;
  for (const [t, b] of marks) if (t < vh) lowest = Math.max(lowest, Math.min(b, vh));
  for (const p of pics) if (p.top < vh) lowest = Math.max(lowest, Math.min(p.bottom, vh));
  const actions = [...document.querySelectorAll('a, button, [role=button]')].filter((el) => { if (!visible(el)) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.top < vh && r.top > 0 && r.height >= 32 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0); }).length;
  // Real boxes for the hero gate: the h1 and the primary action fully inside the first viewport, nothing cut off at the left or right edge.
  const box = (r) => ({ top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) });
  const inside = (r) => r.top >= -1 && r.left >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1;
  const buttonish = (el) => { if (!visible(el) || el.closest('header, nav')) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.height >= 32 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0); };
  const h1r = h1 ? h1.getBoundingClientRect() : null;
  const primary = h1 ? ([...document.querySelectorAll('a, button, [role=button]')].find((el) => (h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) && !h1.contains(el) && el.getBoundingClientRect().top < h1r.bottom + 560 && buttonish(el)) || null) : null;
  const nameOf = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(' ')[0] : '');
  const clipBounds = (el) => {
    let left = 0, right = overflowX ? Infinity : vw, ok = true;
    for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') { if (cs.textOverflow === 'ellipsis') ok = false; const r = a.getBoundingClientRect(); left = Math.max(left, r.left); right = Math.min(right, r.right); }
    }
    return { left, right, ok };
  };
  const clipped = [];
  const edgeEls = [...new Set([...textEls, ...document.querySelectorAll('a, button, input, select, textarea, [role=button]')])].filter((el) => visible(el) && !el.closest('[data-bleed], [aria-hidden=true], .sr-only, .visually-hidden') && !(() => { for (let a = el.parentElement, i = 0; a && i < 4; a = a.parentElement, i++) if (srOnly(a.getBoundingClientRect(), getComputedStyle(a))) return true; return false; })());
  for (const el of edgeEls) {
    const rects = [];
    if (el.matches('a, button, input, select, textarea, [role=button]')) rects.push(el.getBoundingClientRect());
    else { const rg = document.createRange(); for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 1) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) rects.push(q); } }
    const cb = clipBounds(el); if (!cb.ok) continue;
    for (const r of rects) {
      if (r.width < 4 || r.top >= vh || r.bottom <= 0) continue;
      if (r.right <= cb.left + 1 || r.left >= cb.right - 1) continue;
      const l = Math.max(0, cb.left - r.left), rt = Math.max(0, r.right - cb.right);
      if (l > 2 || rt > 2) { clipped.push({ el: nameOf(el), text: (el.innerText || el.value || el.textContent || '').trim().slice(0, 30), side: l > rt ? 'left' : 'right', px: Math.round(Math.max(l, rt)) }); break; }
    }
    if (clipped.length >= 6) break;
  }
  // Unfilled [placeholders] on the first screen: a scaffold is not a hero.
  const firstText = [...document.querySelectorAll('h1,h2,h3,p,a,button,li,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && e.childElementCount === 0; }).map((e) => e.textContent || '').join(' ');
  const placeholders = [...new Set(firstText.match(/\\[[^\\]\\n]{2,60}\\]/g) || [])].slice(0, 6);
  // A fixed or sticky header over the hero: what it hides at the top of the first screen (the page scrolled to the top).
  const navs = [...document.querySelectorAll('header, nav, [class*="header"], [class*="navbar"]')].filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return (cs.position === 'fixed' || cs.position === 'sticky') && r.top <= 4 && r.height > 20 && r.height < 200 && r.width > vw * 0.5; });
  const navBottom = navs.length ? Math.max(...navs.map((e) => e.getBoundingClientRect().bottom)) : 0;
  const navCovers = [];
  if (navBottom) {
    const inNav = (e) => navs.some((n) => n.contains(e));
    for (const e of [...document.querySelectorAll('h1, h2, p, a, button, img, canvas, video, [data-visual]')]) {
      if (inNav(e) || !visible(e)) continue;
      const r = e.getBoundingClientRect();
      const media = /^(IMG|CANVAS|VIDEO)$/.test(e.tagName) || e.hasAttribute('data-visual');
      if (media && (r.width >= vw * 0.9 || r.width * r.height < 160 * 120)) continue; // a full-bleed picture behind the nav is a choice
      if (r.top < navBottom - 6 && r.bottom > navBottom - 6 && r.top > -r.height) navCovers.push(e.tagName.toLowerCase() + (media ? '' : ' "' + (e.textContent || '').trim().slice(0, 24) + '"') + ' (top ' + Math.round(r.top) + 'px, nav ends at ' + Math.round(navBottom) + 'px)');
      if (navCovers.length >= 4) break;
    }
  }
  // A headline with one word in another colour or gradient text: the most recognisable AI-page tell.
  const h1Accent = [];
  if (h1) {
    const h1cs = getComputedStyle(h1);
    const clipsText = (cs) => /text/.test(cs.webkitBackgroundClip || '') || /text/.test(cs.backgroundClip || '');
    if (clipsText(h1cs)) h1Accent.push('the whole headline (gradient text)');
    for (const e of [...h1.querySelectorAll('*')]) {
      const t = (e.textContent || '').trim();
      if (!t || !visible(e)) continue;
      const cs = getComputedStyle(e);
      if (cs.color !== h1cs.color || clipsText(cs)) h1Accent.push('"' + t.slice(0, 24) + '"');
      if (h1Accent.length >= 3) break;
    }
  }
  // The headline set over a picture: fine on a calm one, unreadable on busy art (and a thumbnail brings its own text).
  let h1Over = null;
  if (h1) {
    for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const x = h1r.left + h1r.width * fx;
      const y = h1r.top + h1r.height / 2;
      if (x < 0 || y < 0 || x > vw || y > vh) continue;
      const under = document.elementsFromPoint(x, y).find((e) => !h1.contains(e) && !e.contains(h1) && (/^(IMG|VIDEO|CANVAS)$/.test(e.tagName) || /url[(]/.test(getComputedStyle(e).backgroundImage)));
      if (under) { h1Over = (under.tagName.toLowerCase() + (under.getAttribute('alt') ? ' "' + under.getAttribute('alt').slice(0, 30) + '"' : '')); break; }
    }
  }
  // Pictures cut hard by object-fit: cover: the subject, or the picture's own title, goes missing.
  const cropped = [];
  for (const im of [...document.querySelectorAll('img')]) {
    const r = im.getBoundingClientRect();
    if (r.width < 200 || r.height < 120 || r.bottom < 0 || r.top > vh * 2 || !im.naturalWidth) continue;
    if (getComputedStyle(im).objectFit !== 'cover') continue;
    const a1 = im.naturalWidth / im.naturalHeight;
    const a2 = r.width / r.height;
    const cut = 1 - Math.min(a1, a2) / Math.max(a1, a2);
    if (cut > 0.3) cropped.push((im.getAttribute('alt') || (im.currentSrc || im.src).split('/').pop()).slice(0, 30) + ' ' + Math.round(cut * 100) + '% cut ' + (a2 > a1 ? 'top and bottom' : 'at the sides'));
    if (cropped.length >= 4) break;
  }
  const hero = { h1Over, cropped, h1Accent, navCovers, placeholders, h1w: h1 ? Math.round(h1r.width) : 0, h1Visible: h1 ? h1r.top < vh : false, h1Box: h1 ? box(h1r) : null, h1Inside: h1 ? inside(h1r) : false, cta: primary ? { box: box(primary.getBoundingClientRect()), inside: inside(primary.getBoundingClientRect()), text: (primary.innerText || '').trim().slice(0, 30) } : null, clipped, pic: bigPic, emptyBelow: Math.round(vh - lowest), actions };
  // Sections below the first screen, and whether each shows a picture.
  let secs = [...document.querySelectorAll('section')].filter(visible);
  if (secs.length < 3) { const root = document.querySelector('main') || document.body; secs = [...root.children].filter((el) => visible(el) && el.getBoundingClientRect().height > 200); }
  secs = secs.filter((s) => !secs.some((o) => o !== s && o.contains(s)));
  const sections = secs.map((s) => { const r = s.getBoundingClientRect(); const top = r.top + scrollY; const head = s.querySelector('h2, h3'); return { top: Math.round(top), h: Math.round(r.height), id: s.id || (head ? head.textContent.trim().slice(0, 30) : s.tagName.toLowerCase()), pic: pics.some((p) => s.contains(p.el) && p.w >= 240 && p.h >= 160), form: (() => { const big = pics.filter((p) => s.contains(p.el) && p.w >= 240 && p.h >= 160).sort((a, b) => b.w * b.h - a.w * a.h)[0]; if (!big) return 'text'; const br = big.el.getBoundingClientRect(); if (br.width > r.width * 0.8) return 'full'; const cx = (br.left + br.right) / 2 - r.left; return cx > r.width * 0.55 ? 'split-right' : cx < r.width * 0.45 ? 'split-left' : 'centre'; })() }; }).filter((x) => x.top >= vh * 0.6);
  const feet = [...document.querySelectorAll('footer')].filter((f) => visible(f) && f.getBoundingClientRect().height > 100 && !secs.some((o) => o.contains(f) || f.contains(o)));
  const sectionBoxes = secs.concat(feet).map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), h: Math.round(r.height) }; }).filter((b) => b.h > 40).sort((a, b) => a.top - b.top);
  // How empty each screen is: share of its height with no text, control or picture.
  const spans = marks.concat(pics.map((p) => [p.top, p.bottom])).filter(([t, b]) => b - t < vh * 1.5).sort((a, b) => a[0] - b[0]);
  const screens = [];
  for (let y = 0; y + vh * 0.5 <= doc.scrollHeight; y += vh) {
    const end = Math.min(y + vh, doc.scrollHeight); let covered = 0, cur = y;
    for (const [t, b] of spans) { const s0 = Math.max(t, cur), s1 = Math.min(b, end); if (s1 > s0) { covered += s1 - s0; cur = s1; } }
    screens.push(+(1 - covered / (end - y)).toFixed(2));
  }
  const skeletons = [...document.querySelectorAll('[class*="skeleton" i], [class*="shimmer" i], [class*="placeholder" i]:not(input):not(textarea), [aria-busy="true"], [class*="spinner" i], [class*="loading" i]')].filter(visible).length;
  // The same picture again and again (a marquee's loop copies and hidden duplicates don't count).
  const srcCount = {};
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (r.width * r.height < 160 * 120 || !visible(img) || img.closest('[aria-hidden="true"], [class*="marquee"], [class*="loop"], [class*="slider"], [class*="carousel"]')) continue;
    const src = (img.currentSrc || img.src || '').split('?')[0];
    if (src) srcCount[src] = (srcCount[src] || 0) + 1;
  }
  const repeats = Object.entries(srcCount).filter(([, n]) => n >= 3).map(([src, n]) => ({ src: src.split('/').pop().slice(0, 40), n }));
  const distinctPics = Object.keys(srcCount).length;
  return { repeats, distinctPics, skeletons, viewportMeta: !!document.querySelector('meta[name=viewport]'), width: vw, vh, height: doc.scrollHeight, screens: +(doc.scrollHeight / vh).toFixed(1), overflowX, scrollWidth: doc.scrollWidth, offenders,
    fontSizes: Object.entries(sizes).sort((a, b) => b[1] - a[1]).map(([s, n]) => [+s, n]), families: Object.entries(families).sort((a, b) => b[1] - a[1]), weights: Object.keys(weights).length,
    words, smallShare: words ? +(small / words).toFixed(2) : 0, gaps, media, h1: h1s, h2, bodyText: medianP, hero, sections, sectionBoxes, empty: screens, title: document.title };
})()`;

// Before anything is measured or shot: refuse bot checks, then clear what covers the page so the page is what's
// photographed: cookie walls and consent banners, country / region / "ship to" pickers, newsletter modals, and the scroll
// lock they leave behind. Overlays are found by what they SAY and how they are placed (fixed, sticky, a dialog, a bar along
// the top or bottom edge), never by class names alone. A reject / close / stay control inside is clicked first (reject
// beats close beats accept, and anything that opens a picker or navigates is never clicked); what still shows is hidden.
// Embedded as text: no backslashes, no placeholders (strings are joined with +).
const OVERLAY_FINDER =
  "const WS = new RegExp('[' + String.fromCharCode(9, 10, 13, 160) + ' ]+', 'g');" +
  "const norm = (s) => String(s || '').replace(WS, ' ').trim().toLowerCase();" +
  "const CONSENT = /cookie|consent|gdpr|ccpa|tracking|privacy (choices|settings|preferences|notice)|we use (cookies|technolog)|your (privacy|data) |personali[sz]e your|manage (preferences|settings|choices)|accept (all|only|necessary|functional|essential)|reject all|opt out/;" +
  "const GEO = /(choose|select|change|confirm|pick|set) (your |a |the |another )?(country|region|location|language|store|market|site)|ship(s|ping)? to|countries we ship|you('| a)re (viewing|visiting|browsing|shopping)|visiting from|which (country|region)|deliver(y|ing)? to|looks like you('| a)re|(country|region)[ /](selector|picker)|stay on this (site|page)|go to (the )?(us|uk|eu|local) (site|store)/;" +
  "const PROMO = /subscribe|newsletter|sign up|join (our|the)|[0-9]+% off|get [0-9]+%|discount code|before you go|download (the |our )?app|allow notifications|turn on notifications/;" +
  "const FRAME = /consent|cookie|privacy|cmp|didomi|onetrust|trustarc|usercentrics|cookiebot|sourcepoint|sp_message|quantcast|iubenda|osano/;" +
  "const shown = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };" +
  "const dialogish = (el) => el.matches('dialog[open], [role=dialog], [role=alertdialog], [aria-modal=true]');" +
  "const placed = (el) => { const cs = getComputedStyle(el); return cs.position === 'fixed' || cs.position === 'sticky' || (cs.position === 'absolute' && (+cs.zIndex || 0) >= 50) || dialogish(el); };" +
  "const hasControl = (el) => !!el.querySelector('button, [role=button], a, input[type=button], input[type=submit], [tabindex]');" +
  "const barish = (el) => { const r = el.getBoundingClientRect(); return r.height < 170 && r.width > innerWidth * 0.55 && (r.top < 200 || r.bottom > innerHeight - 200); };" +
  "const isPage = (el) => el.matches('html, body, main, header, nav, footer, form, article') || !!el.querySelector('nav, [role=navigation], main, h1');" +
  "const kind = (t, el) => (CONSENT.test(t) ? 'consent' : GEO.test(t) ? 'country' : (dialogish(el) || placed(el)) && PROMO.test(t) ? 'popup' : null);" +
  "const findOverlays = () => {" +
  "  const all = [];" +
  "  for (const el of document.body ? document.body.querySelectorAll('*') : []) {" +
  "    if (isPage(el) || !shown(el)) continue;" +
  "    if (el.tagName === 'IFRAME') { if (placed(el) && FRAME.test(norm((el.src || '') + ' ' + el.id + ' ' + el.className + ' ' + (el.title || '')))) all.push({ el, why: 'consent', text: 'consent frame' }); continue; }" +
  "    if (!(placed(el) || barish(el))) continue;" +
  "    const t = norm(el.innerText).slice(0, 1600);" +
  "    if (t.length < 12 || t.length > 1400 || !hasControl(el)) continue;" +
  "    const why = kind(t, el);" +
  "    if (why) all.push({ el, why, text: t.slice(0, 90) });" +
  "  }" +
  "  return all.filter((a) => !all.some((b) => b !== a && b.el.contains(a.el)));" +
  "};";

export const CLEAR_OVERLAYS =
  "(async () => {" +
  "const txt = (document.title + ' ' + (document.body ? document.body.innerText.slice(0, 600) : '')).toLowerCase();" +
  "if (/just a moment|performing security verification|verify you are human|attention required|checking your browser|access denied|are you a robot|captcha/.test(txt)) return { blocked: document.title || 'bot check' };" +
  OVERLAY_FINDER +
  "const REJECT = /^(reject|decline|deny|refuse|disagree|opt out)|(reject|decline|deny|refuse) (all|non)|(only|just) (necessary|essential|functional|required)|(necessary|essential|functional|required) only|accept (only )?(necessary|essential|functional|required)|strictly necessary|continue without|no,? ?thanks|no thank you|not now|maybe later|^(later|skip|no)$|(stay|keep) (on|here|shopping|browsing)|continue (on|to|with) (this|the|our|current)/;" +
  "const CLOSE = /^(x|close|dismiss|cancel|got it|hide)$|close|dismiss/;" +
  "const ACCEPT = /^(accept|allow|agree|ok|okay|got it|i agree|i accept|accept all|allow all|yes|understood|i understand|continue)( |$)/;" +
  "const label = (b) => norm(b.innerText || b.getAttribute('aria-label') || b.title || b.value || '').slice(0, 60);" +
  "const meta = (b) => norm((b.getAttribute('aria-label') || '') + ' ' + (b.title || '') + ' ' + b.id + ' ' + (typeof b.className === 'string' ? b.className : ''));" +
  "const score = (b, why) => {" +
  "  const l = label(b); const m = meta(b);" +
  "  if (!l && !m) return 0;" +
  "  const a = b.tagName === 'A' ? (b.getAttribute('href') || '') : '';" +
  "  if (a && a.charAt(0) !== '#' && !/^javascript/i.test(a)) return 0;" +
  "  if (REJECT.test(l)) return 10;" +
  "  if (l === 'x' || l === String.fromCharCode(215) || l === String.fromCharCode(10005) || l === String.fromCharCode(10006) || CLOSE.test(l) || (!l && CLOSE.test(m)) || (l.length < 3 && CLOSE.test(m))) return 8;" +
  "  if (why !== 'country' && ACCEPT.test(l)) return 3;" +
  "  return 0;" +
  "};" +
  "const texts = []; let clicked = 0; const seen = new Set();" +
  "for (let round = 0; round < 4; round++) {" +
  "  let did = false;" +
  "  for (const o of findOverlays()) {" +
  "    const btns = [...o.el.querySelectorAll('button, [role=button], a, input[type=button], input[type=submit], [tabindex]')].filter((b) => !seen.has(b) && shown(b));" +
  "    let best = null, bs = 0;" +
  "    for (const b of btns) { const sc = score(b, o.why); if (sc > bs) { bs = sc; best = b; } }" +
  "    if (!best) continue;" +
  "    seen.add(best); best.click(); clicked++; did = true; texts.push(o.why + ': ' + o.text);" +
  "    await new Promise((r) => setTimeout(r, 450));" +
  "  }" +
  "  if (!did) break;" +
  "}" +
  "let hidden = 0;" +
  "const hide = (el) => { el.style.setProperty('display', 'none', 'important'); hidden++; };" +
  "for (const o of findOverlays()) { hide(o.el); texts.push('hid ' + o.why + ': ' + o.text); }" +
  // Full-screen masks and splash layers that carry no page content, and consent frames that are still drawn.
  "for (const el of document.body ? document.body.querySelectorAll('*') : []) {" +
  "  if (!shown(el) || el.matches('header, nav') || el.closest('header, nav') || isPage(el)) continue;" +
  "  const cs = getComputedStyle(el);" +
  "  if (!(cs.position === 'fixed' || (cs.position === 'absolute' && (+cs.zIndex || 0) >= 100))) continue;" +
  "  const r = el.getBoundingClientRect();" +
  "  const covers = r.width * r.height > innerWidth * innerHeight * 0.3;" +
  "  const words = norm(el.innerText).length;" +
  "  if (covers && +cs.zIndex > 10 && words < 600 && !el.querySelector('video, canvas, h1, h2')) { hide(el); texts.push('hid cover'); }" +
  "}" +
  // Scroll lock: what the overlay left behind (overflow hidden on the page, a body pinned with position fixed).
  "let unlocked = false;" +
  "for (const el of [document.documentElement, document.body]) {" +
  "  if (!el) continue;" +
  "  const cs = getComputedStyle(el);" +
  "  if (cs.overflowY === 'hidden' || cs.overflowY === 'clip') { el.style.setProperty('overflow-y', 'auto', 'important'); unlocked = true; }" +
  "  if (el === document.body && cs.position === 'fixed') { el.style.setProperty('position', 'static', 'important'); el.style.setProperty('top', 'auto', 'important'); unlocked = true; }" +
  "  if (cs.touchAction === 'none') el.style.setProperty('touch-action', 'auto', 'important');" +
  "}" +
  "return { clicked, hidden, unlocked, texts: texts.slice(0, 6) };" +
  "})()";

// What still covers the first screen after clearing (the test and the audit read it): overlay text in a placed layer.
export const OVERLAY_PROBE = "(() => {" + OVERLAY_FINDER + "return findOverlays().map((o) => o.why + ': ' + o.text);" + "})()";

// Type that can't be read, measured: a fake (synthesized) bold because the face lacks that weight, a web font that never
// loaded, tracking tight enough that letters touch, line-height tight enough that lines touch. Embedded as text.
export const TYPE_CHECK = `(() => {
  const out = []; const seen = new Set();
  const faces = [...document.fonts].filter((f) => f.status === 'loaded');
  const famKey = (s) => s.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const generic = /^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy|-apple-system|blinkmacsystemfont|arial|helvetica|georgia|times new roman|segoe ui|roboto)$/;
  const weights = (fam) => faces.filter((f) => f.family.replace(/["']/g, '').trim().toLowerCase() === fam).flatMap((f) => String(f.weight).split(' ').map(Number)).filter((n) => !isNaN(n));
  for (const el of document.querySelectorAll('h1, h2, h3, p, a, button, span, div, li, strong, em, b')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (!r.width || cs.visibility === 'hidden' || +cs.opacity < 0.1) continue;
    const size = parseFloat(cs.fontSize); if (size < 20) continue;
    const fam = famKey(cs.fontFamily); const w = parseInt(cs.fontWeight, 10);
    const sample = el.textContent.trim().slice(0, 30); const id = fam + '|' + w + '|' + Math.round(size);
    if (!generic.test(fam)) {
      const ws = weights(fam);
      const declared = [...document.fonts].some((f) => f.family.replace(/["']/g, '').trim().toLowerCase() === fam);
      if (!ws.length) { if (declared && !seen.has('missing' + fam)) { seen.add('missing' + fam); out.push({ kind: 'font-missing', text: sample, detail: cs.fontFamily.split(',')[0] + ' never loaded: the text falls back to another face' }); } }
      else if (cs.fontSynthesis !== 'none' && w - Math.max(...ws) >= 100 && !seen.has('syn' + id)) { seen.add('syn' + id); out.push({ kind: 'fake-bold', text: sample, detail: cs.fontFamily.split(',')[0] + ' has no ' + w + ' weight (max ' + Math.max(...ws) + '): the browser smears a fake bold. Use a weight the face has' }); }
    }
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) / size;
    if ((ls < -0.06 || (ls < -0.045 && w >= 800)) && !seen.has('ls' + id)) { seen.add('ls' + id); out.push({ kind: 'letters-touch', text: sample, detail: 'letter-spacing ' + ls.toFixed(3) + 'em at weight ' + w + ': letters run into each other' }); }
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / size;
    if (lh < 0.88 && r.height > size * 1.6 && !seen.has('lh' + id)) { seen.add('lh' + id); out.push({ kind: 'lines-touch', text: sample, detail: 'line-height ' + lh.toFixed(2) + ' on ' + Math.round(size) + 'px text over several lines: ascenders hit the line above' }); }
  }
  return out.slice(0, 12);
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
/** The type check on its own (comps): open the page, return what TYPE_CHECK finds. */
export async function typeIssues(url, { width = 1440, height = 900, config } = {}) {
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, settleMs: 300 });
    return (await tab.s("Runtime.evaluate", { expression: TYPE_CHECK, returnByValue: true })).result?.value || [];
  });
}

/**
 * Which page offsets (y, px from the top) to shoot, in order. A page of at most `maxSlices` screens is shot whole, one
 * viewport after another. A longer page is sampled so EVERY top-level section (`sections`: [{ top, h }]) shows at least
 * once (at least a third of a viewport, or all of a shorter section), then the slices left in the budget are spent on the
 * biggest gaps; the budget grows past `maxSlices` only as far as covering the sections needs (never past `hardMax`).
 * Without section boxes the shots are evenly spaced, as before. critic_prepare and fitcheck_shot get this through capture().
 */
export function sectionSlices({ total, height, sections = [], maxSlices = 6, hardMax = 10 }) {
  const count = Math.max(1, Math.ceil(total / height));
  const maxY = Math.max(0, total - height);
  const at = (i) => Math.min(i * height, maxY);
  if (maxSlices <= 1) return [0];
  if (count <= maxSlices) return [...Array(count).keys()].map(at);
  const boxes = sections.filter((x) => x && x.h > 0).sort((p, q) => p.top - q.top);
  if (boxes.length < 2) return [...Array(maxSlices).keys()].map((i) => at(Math.round((i * (count - 1)) / (maxSlices - 1))));
  const seen = (y, x) => Math.min(x.top + x.h, y + height) - Math.max(x.top, y) >= Math.min(x.h, Math.round(height * 0.3));
  let ys = [0];
  for (const x of boxes) if (!ys.some((y) => seen(y, x))) ys.push(Math.min(maxY, Math.max(0, x.top - 16)));
  const cap = Math.max(maxSlices, hardMax);
  if (ys.length > cap) ys = Array.from({ length: cap }, (_, i) => ys[Math.round((i * (ys.length - 1)) / (cap - 1))]);
  ys = [...new Set(ys)].sort((p, q) => p - q);
  while (ys.length < maxSlices) {
    let best = -1, room = height * 0.2;
    for (let i = 0; i < ys.length; i++) {
      const unseen = (i + 1 < ys.length ? ys[i + 1] : total) - (ys[i] + height);
      if (unseen > room) { room = unseen; best = i; }
    }
    if (best < 0) break;
    const before = ys.length;
    ys.push(Math.min(maxY, ys[best] + height));
    ys = [...new Set(ys)].sort((p, q) => p - q);
    if (ys.length === before) break;
  }
  return ys;
}

/**
 * Open `url` at `width` x `height`, return { audit, slices: [{ y, buf }…], sliceCount }.
 * slicing "sections" (default): see sectionSlices; "top": the first `maxSlices` screens in order (screen 2 starts one viewport
 * down: what a reference study wants). shots: false returns the audit only (no pictures). section: a CSS selector: shoot just
 * that element (up to `maxSlices` viewport-high pieces) instead of the page; audit.section says where it is.
 */
export async function capture(url, { width = 1440, height = 900, maxSlices = 6, quality = 78, scale = 1, idle = false, brand = false, slicing = "sections", shots = true, section = null, config } = {}) {
  return withTab(config, async (tab) => {
    const { s } = tab;
    const run = async (expression, awaitPromise = false) => (await s("Runtime.evaluate", { expression, awaitPromise, returnByValue: true })).result?.value;
    const opened = (await openPage(tab, url, { width, height, idle })) || {};
    const cleared = (await run(CLEAR_OVERLAYS, true)) || {};
    if (cleared.blocked) return { audit: { blocked: cleared.blocked, height: height }, slices: [], sliceCount: 0, blocked: cleared.blocked };
    // Scroll through once so lazy content and scroll-triggered reveals render, then back to the top.
    await s("Runtime.evaluate", { expression: "(async()=>{const h=document.documentElement.scrollHeight;const step=Math.max(innerHeight,h/24);for(let y=0;y<h;y+=step){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);})()", awaitPromise: true });
    await settle(s, 800);
    // Banners and consent walls that come in late or on scroll: clear once more now that the page has loaded.
    const again = (await run(CLEAR_OVERLAYS, true)) || {};
    if (again.clicked || again.hidden) await settle(s, 400);
    const result = { value: await run(AUDIT) };
    const audit = result.value;
    audit.errors = opened.errors || [];
    audit.cleared = { clicked: (cleared.clicked || 0) + (again.clicked || 0), hidden: (cleared.hidden || 0) + (again.hidden || 0), unlocked: !!(cleared.unlocked || again.unlocked), texts: [...(cleared.texts || []), ...(again.texts || [])].slice(0, 6) };
    audit.overlayLeft = (await run(OVERLAY_PROBE)) || [];
    audit.covered = (await run(COVERED, true)) || [];
    audit.type = (await run(TYPE_CHECK)) || [];
    audit.tells = (await run(TELLS)) || [];
    if (brand) audit.brand = await run(BRAND);
    // The audit scrolled the page and came back: let headers that hide on scroll slide back before anything is shot.
    if (shots) await new Promise((r) => setTimeout(r, 150));
    const total = Math.min(audit.height, 30000);
    const count = Math.max(1, Math.ceil(total / height));
    const maxY = Math.max(0, total - height);
    const shoot = async (y, h) => {
      const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality, captureBeyondViewport: true, clip: { x: 0, y, width, height: Math.max(1, Math.min(h, total - y)), scale } });
      return { y, buf: Buffer.from(data, "base64") };
    };
    if (section) {
      const box = await run("(() => { const el = document.querySelector(" + JSON.stringify(section) + "); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), h: Math.round(r.height) }; })()");
      audit.section = box ? { selector: section, ...box } : { selector: section, missing: true };
      const slices = [];
      if (box && shots) for (let y = box.top, k = 0; y < box.top + box.h && k < Math.max(1, maxSlices); y += height, k++) slices.push(await shoot(y, Math.min(height, box.top + box.h - y)));
      return { audit, slices, sliceCount: box ? Math.max(1, Math.ceil(box.h / height)) : 0 };
    }
    const ys = slicing === "top" ? [...Array(Math.min(count, Math.max(1, maxSlices))).keys()].map((i) => Math.min(i * height, maxY)) : sectionSlices({ total, height, sections: audit.sectionBoxes || [], maxSlices });
    const slices = [];
    // The big visuals of the first screen, measured before anything is shot, so the untouched shot can show whether they
    // look like anything without input.
    const heroBoxes = shots && ys[0] === 0 ? (await run(HERO_BOXES)) || [] : [];
    if (shots) for (const y of ys) slices.push(await shoot(y, height));
    if (heroBoxes.length && slices[0]?.buf) audit.tells = [...(audit.tells || []), ...(await blankVisuals(slices[0].buf, heroBoxes, scale).catch(() => []))];
    // Canvases below the first screen (WebGL galleries, shaders): looked at once each, on screen, after the page shots.
    if (shots && !idle && maxSlices > 1) {
      const below = ((await run(CANVAS_BOXES)) || []).filter((b) => b.top >= height);
      if (below.length) {
        const look = async (i) => {
          const box = await run(`(() => { const c = document.querySelectorAll('canvas')[${i}]; if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: Math.max(0, r.left) + scrollX, y: Math.max(0, r.top) + scrollY, w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) }; })()`);
          if (!box || box.w < 50 || box.h < 50) return null;
          await new Promise((r) => setTimeout(r, 700)); // a WebGL piece draws on the frames after it comes into view
          // The clip is in page coordinates (x, y include the scroll).
          const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale } });
          return { buf: Buffer.from(data, "base64"), box };
        };
        audit.tells = [...(audit.tells || []), ...(await deadCanvases(below, look, scale).catch(() => []))];
        await run("scrollTo(0, 0)");
      }
    }
    audit.sliceYs = ys;
    return { audit, slices, sliceCount: count };
  });
}

/** The Display token from kit/base.css: clamp(3rem, 1.2rem + 7.5vw, 9rem). */
export const displayPx = (vw) => Math.min(144, Math.max(48, 19.2 + 0.075 * vw));

/**
 * Hard problems in an audit (block a pass) and softer warnings.
 * persuade: a landing page, portfolio or showcase (the playbook's numbers apply). hero: judge only the first viewport.
 */
/** Nothing on the page: (almost) no words and no pictures. */
export const blankPage = (a) => !!a && !a.blocked && typeof a.words === "number" && typeof a.media === "number" && a.words < 3 && a.media === 0;

export function judgeAudit(a, { persuade = true, hero = false } = {}) {
  const blockers = [];
  const warnings = [];
  const desk = a.width >= 1000;
  const phone = a.width < 600;
  // A page that renders nothing (a bad import, a crash in a section): say so first, with the page's own errors.
  if (blankPage(a)) {
    blockers.push(`the page rendered blank (${a.words || 0} words, ${a.media || 0} pictures)${a.errors?.length ? `. The page's errors: ${a.errors.slice(0, 3).join(" | ")}` : ". No error was logged: check the dev server's terminal, the entry file and App.tsx (a duplicate import, a missing export)"}`);
    return { blockers, warnings };
  }
  if (a.errors?.length) warnings.push(`errors in the page's console: ${a.errors.slice(0, 3).join(" | ")}`);
  if (a.hero?.navCovers?.length) blockers.push(`the fixed nav covers the hero: ${a.hero.navCovers.join("; ")}. Start the hero below the nav (padding-top: the nav's height) or make the picture a full-bleed ground behind it`);
  for (const r of a.repeats || []) blockers.push(`the same picture ${r.src} appears ${r.n} times: find, make or ask for more real pictures (images_search, art_generate / gen_image, or ask the user for their own work); one picture never stands in for a gallery`);
  if (phone && a.viewportMeta === false) blockers.push('no <meta name="viewport" content="width=device-width, initial-scale=1">: phones render the page at 980px and shrink it');
  for (const t of a.type || []) blockers.push(`unreadable type (${t.kind}): "${t.text}": ${t.detail}`);
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
    else {
      const container = Math.min(a.width - 128, 1312);
      const bigPicture = a.hero.pic && a.hero.pic.w >= container * 0.45 && a.hero.pic.h >= (a.vh || 900) * 0.5;
      // A big picture can carry the hero; then the h1 only has to be clearly a headline, not Display-size.
      if (a.h1 < want * (bigPicture ? 0.45 : 0.7)) blockers.push(`h1 is ${a.h1}px; ${bigPicture ? `even beside a big picture a headline needs ~${Math.round(want * 0.45)}px+` : `with no big picture the type carries the hero: ~${Math.round(want * 0.7)}px+ (Display token ~${want}px)`}`);
      else if (!bigPicture && a.h1 < want * 0.85) warnings.push(`h1 ${a.h1}px is under the Display token (~${want}px); fine if the composition is deliberate`);
    }
    if (a.hero.h1Visible === false) blockers.push("the h1 is not in the first viewport");
    if (a.hero.h1Over) warnings.push(`the headline sits on a picture (${a.hero.h1Over}): check it reads on every picture that can be there (a scrim, a calm area of the art, or the headline beside the picture), and that the picture's own text doesn't compete with it`);
    if (a.hero.cropped?.length) warnings.push(`pictures cropped hard by object-fit: cover: ${a.hero.cropped.join("; ")}. Their subject or own title may be cut; give the frame the picture's aspect ratio, or set object-position`);
    if (a.hero.h1Accent?.length) warnings.push(`accented headline: ${a.hero.h1Accent.join(", ")} is in another colour inside the h1. Keep it only if it reads better than one colour (it carries the meaning, the brand does it); never by reflex`);
    if (a.hero.placeholders?.length) blockers.push(`the first screen still has placeholders: ${a.hero.placeholders.join(", ")} (fill them with the client's words, or a builder hasn't written the hero yet)`);
    else if (a.h1 && a.hero.h1Box && a.hero.h1Inside === false) {
      const b = a.hero.h1Box;
      blockers.push(`the h1's box (top ${b.top}, bottom ${b.bottom}, left ${b.left}, right ${b.right}px) is not fully inside the first viewport (${a.width}x${a.vh || 900}): it must start below the top edge and end above the fold, and sit between the side edges`);
    }
    if (a.hero.cta && a.hero.cta.inside === false) {
      const b = a.hero.cta.box;
      blockers.push(`the primary action "${a.hero.cta.text}" (top ${b.top}, bottom ${b.bottom}, left ${b.left}, right ${b.right}px) is not fully inside the first viewport (${a.width}x${a.vh || 900}): the first screen needs the headline AND the way in`);
    }
    if (a.hero.clipped?.length)
      blockers.push(`text or controls cut off at the ${a.hero.clipped.length > 1 ? "edges" : "edge"}: ${a.hero.clipped.slice(0, 4).map((c) => `"${c.text}" (${c.el}) ${c.px}px past the ${c.side} edge`).join("; ")}. Pull it inside the margin, or mark an intentional bleed with data-bleed`);
    if (desk) {
      const container = Math.min(a.width - 128, 1312);
      const picOk = a.hero.pic.w >= container * 0.45 && a.hero.pic.h >= (a.vh || 900) * 0.6;
      const typeOk = a.hero.h1w >= container * 0.62;
      if (!picOk && !typeOk) blockers.push(`hero is small: biggest picture ${a.hero.pic.w}x${a.hero.pic.h}px, h1 ${a.hero.h1w}px wide. Needs a picture (or a group of 3+ pictures, such as a fan of cards or a product mockup) >= 6 columns and >= 60% of the screen tall, or an h1 spanning 8+ columns`);
      if (!a.hero.actions) warnings.push("no visible action (button or styled link) in the first viewport");
    }
    if (a.hero.emptyBelow > 160) blockers.push(`${a.hero.emptyBelow}px of nothing at the bottom of the first viewport (max 160). Make the content bigger, never the gap`);
  }
  if (hero) return { blockers, warnings };
  // ---- page gate (playbook P39) ----
  const sizes = a.fontSizes.filter(([, n]) => n >= 2).length;
  if (sizes > 7) {
    // The odd ones out (fewest words) are usually what installed pieces brought with them.
    const strays = a.fontSizes.filter(([, n]) => n >= 2).slice(7).map(([px, n]) => `${px}px×${n}`);
    blockers.push(`${sizes} different text sizes; the system has 7 roles. ${sizes > 9 ? "Type off the scale" : "Map every size to a role"}: ${strays.join(", ")} (usually a piece's own text-sm / text-[15px]) go to the nearest role`);
  }
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
    if (bad.length) blockers.push(`screen(s) ${bad.map(([i, e]) => `${i} (${Math.round(e * 100)}% empty)`).join(", ")}: more than half empty. Fill it with a layout move, never padding: make the picture span the full width, set the line as a big statement across the screen, put two short sections side by side as a bento, pin a sticky demo beside the copy, or run a horizontal gallery of the real work`);
    else if (a.empty.some((e) => e > 0.4)) warnings.push(`some screens are over 40% empty: ${a.empty.map((e) => Math.round(e * 100) + "%").join(" ")}`);
  }
  if (a.sections?.length >= 3) {
    const forms = {};
    for (const x of a.sections) if (x.form && x.form !== "text") forms[x.form] = (forms[x.form] || 0) + 1;
    const top = Object.entries(forms).sort((p, q) => q[1] - p[1])[0];
    if (top && top[1] >= 3 && top[0].startsWith("split")) (persuade ? blockers : warnings).push(`${top[1]} sections share one layout (${top[0].replace("split-", "text beside a picture on the ")}): a template, not a design. Give sections different forms from the references: a bento, a full-bleed picture, a horizontal gallery, a sticky demo, a big statement`);
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
  // The mistakes AI-built pages ship most (core/ai-tells.mjs): unreadable or dead buttons, stretched pictures, template copy...
  const tells = judgeTells(a.tells);
  blockers.push(...tells.blockers);
  warnings.push(...tells.warnings);
  return { blockers, warnings };
}

export function formatAudit(a, j) {
  return (
    `${a.width}px: ${a.screens} screens tall · text sizes ${a.fontSizes.slice(0, 8).map(([s, n]) => `${s}px×${n}`).join(" ")} · families ${a.families.map(([f, n]) => `${f}×${n}`).join(", ")} · ` +
    `${Math.round(a.smallShare * 100)}% words <14px · h1 ${a.h1 ?? "-"}px · h2 ${a.h2 ?? "-"}px · paragraphs ${a.bodyText ?? "-"}px · media ${a.media}` +
    (a.hero ? `\n  first viewport: h1 ${a.hero.h1w}px wide${a.hero.h1Box ? ` (y ${a.hero.h1Box.top}-${a.hero.h1Box.bottom})` : ""} · biggest picture ${a.hero.pic.w}x${a.hero.pic.h}px · ${a.hero.emptyBelow}px empty at the bottom · ${a.hero.actions} action(s)${a.hero.cta ? ` · primary action "${a.hero.cta.text}" y ${a.hero.cta.box.top}-${a.hero.cta.box.bottom}` : ""}` : "") +
    (a.empty?.length > 1 ? `\n  empty per screen: ${a.empty.map((e) => Math.round(e * 100) + "%").join(" ")}` : "") +
    (a.sections?.length ? ` · sections with a picture: ${a.sections.filter((s) => s.pic).length}/${a.sections.length}` : "") +
    (a.cleared && (a.cleared.clicked || a.cleared.hidden) ? `\n  cleared before shooting: ${a.cleared.clicked} click(s), ${a.cleared.hidden} layer(s) hidden${a.cleared.unlocked ? ", scroll unlocked" : ""} (${(a.cleared.texts || []).slice(0, 3).join(" | ")})` : "") +
    (a.overlayLeft?.length ? `\n  STILL COVERING the first screen: ${a.overlayLeft.slice(0, 3).join(" | ")}` : "") +
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
  do: z.enum(["click", "hover", "drag", "type", "key", "scroll", "wait", "shot", "hold"]),
  selector: z.string().optional().describe("CSS selector of the element to act on"),
  to: z.union([z.string(), z.object({ x: z.number(), y: z.number() })]).optional().describe("drag: a selector to drop on, or an offset {x, y} in px from the start"),
  text: z.string().optional().describe("type: the text; key: a key name (Enter, Escape, Tab, ArrowDown)"),
  y: z.number().optional().describe("scroll: page y in px"),
  ms: z.number().optional().describe("wait: milliseconds (max 5000)"),
  hold: z.object({ selector: z.string(), ms: z.number().optional() }).optional().describe('hold: press and hold the mouse on selector for ms (default 800, max 5000), screenshot WHILE it is held (the :active / hold-to-confirm state), then release. e.g. { do: "hold", hold: { selector: ".confirm", ms: 1200 }, label: "mid-hold" }'),
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
      if (st.do === "hold") {
        // Pointer down, wait, capture while it is still down, release.
        let buf = null;
        let down = null;
        try {
          const h = st.hold || { selector: st.selector, ms: st.ms };
          if (!h.selector) throw new Error("hold needs hold.selector");
          down = await center(h.selector);
          await mouse("mouseMoved", down.x, down.y, { buttons: 0 });
          await mouse("mousePressed", down.x, down.y, { clickCount: 1, buttons: 1 });
          await new Promise((r) => setTimeout(r, Math.min(5000, Math.max(0, h.ms ?? 800))));
          if (st.shot !== false) {
            const { data } = await s("Page.captureScreenshot", { format: "jpeg", quality, clip: { x: 0, y: 0, width, height, scale: width > 1200 ? 1200 / width : 1 } });
            buf = Buffer.from(data, "base64");
          }
        } catch (e) {
          error = e.message;
        } finally {
          if (down) await mouse("mouseReleased", down.x, down.y, { clickCount: 1, buttons: 0 }).catch(() => {});
        }
        if (buf) out.push({ label: st.label || `${i + 1}. hold ${st.hold?.selector || st.selector || ""}`, buf, error });
        else if (error) out.push({ label: st.label || `${i + 1}. hold`, buf: Buffer.alloc(0), error });
        continue;
      }
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
  } else if (kind === "hold") {
    const h = st.hold || { selector: st.selector, ms: st.ms };
    const p = await center(h.selector);
    await mouse("mouseMoved", p.x, p.y, { buttons: 0 });
    await mouse("mousePressed", p.x, p.y, { clickCount: 1, buttons: 1 });
    await new Promise((r) => setTimeout(r, Math.min(5000, Math.max(0, h.ms ?? 800))));
    await mouse("mouseReleased", p.x, p.y, { clickCount: 1, buttons: 0 });
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

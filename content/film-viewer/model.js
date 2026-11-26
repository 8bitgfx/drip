/* Drip Film: the story model. Pure functions, no DOM: turns film.json into a timed story (chapters, frames, cursors,
   camera) that the page renders at any time t, so seeking is exact and cursors stay in sync with frames.
   Loaded by index.html as a plain script (window.DripFilm) and by the tests through node:vm. */
(function (root) {
  'use strict';

  // Agent colours: Director first, then builders, then everyone else, in start order.
  const COLORS = ['#93A2FF', '#C8F031', '#FF9EC7', '#6FE3D2', '#F4EFE4', '#B9A3FF', '#FFD36E'];
  const KIND_NAME = { director: 'Director', builder: 'Builder', helper: 'Helper', scout: 'Scout', checker: 'Checker', critic: 'Critic' };
  const IMG = /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i;

  const ms = (v) => { const n = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(n) ? n : null; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const fmt = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const fmtLong = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return m ? m + ' min' + (r ? ' ' + r + ' s' : '') : r + ' s'; };
  const base = (f) => String(f || '').split(/[\\/]/).pop();
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  /** film.json (old v1 or new) -> one normalised shape. Unknown kinds are ignored; missing parts are empty. */
  function normalize(film) {
    film = film || {};
    const task = film.task || {};
    const evs = (film.events || []).map((e) => Object.assign({}, e, { ms: ms(e.t != null ? e.t : e.at) })).filter((e) => e.ms != null).sort((a, b) => a.ms - b.ms);
    const start = ms(task.startedAt) || (evs[0] && evs[0].ms) || 0;
    const doneEv = evs.find((e) => e.kind === 'done');
    const end = ms(task.endedAt) || (doneEv ? ms(doneEv.at) || doneEv.ms : null);

    // Agents: from agents[] and start events; named Director / Builder 1 / Builder 2 ... in start order.
    const byId = new Map();
    const add = (a) => {
      const id = String(a.id || a.agent || '');
      if (!id || byId.has(id)) return;
      byId.set(id, { id, type: id === 'main' ? 'director' : String(a.type || 'agent').replace(/^drip:/, '').toLowerCase(), job: a.label || a.job || '', start: ms(a.startedAt) || ms(a.t) || start, end: ms(a.endedAt) });
    };
    if (!(film.agents || []).some((a) => a.id === 'main')) add({ id: 'main', type: 'director', startedAt: start });
    (film.agents || []).forEach(add);
    evs.filter((e) => e.kind === 'start' && e.id).forEach((e) => add({ id: e.id, type: e.type, label: e.label, t: e.ms }));
    evs.filter((e) => (e.kind === 'stop' || e.kind === 'end') && byId.has(String(e.id || e.agent || ''))).forEach((e) => { const a = byId.get(String(e.id || e.agent)); if (!a.end && a.id !== 'main') a.end = e.ms; });
    const agents = [...byId.values()].sort((a, b) => (a.id === 'main' ? -1 : b.id === 'main' ? 1 : a.start - b.start));
    const count = {};
    agents.forEach((a, i) => {
      const k = KIND_NAME[a.type] || 'Agent';
      count[k] = (count[k] || 0) + 1;
      a.color = COLORS[i % COLORS.length];
    });
    const seen = {};
    agents.forEach((a) => { const k = KIND_NAME[a.type] || 'Agent'; seen[k] = (seen[k] || 0) + 1; a.name = k === 'Director' || count[k] === 1 && k !== 'Builder' ? k : k + ' ' + seen[k]; });
    if (end) agents.forEach((a) => { if (!a.end) a.end = end; });

    const list = (kind, top) => (film[top] || []).map((x) => Object.assign({ ms: ms(x.t || x.at) || start }, x)).concat(evs.filter((e) => e.kind === kind));
    const refs = list('ref', 'refs').filter((r) => r.image || r.title).map((r) => ({ ms: r.ms, title: r.title || host(r.url), site: host(r.url), url: r.url || null, image: r.image || null }));
    const pieces = list('piece', 'pieces').filter((p) => p.name || p.image).map((p) => ({ ms: p.ms, title: p.name || base(p.url).replace(/\.json$/, ''), site: host(p.url), url: p.url || null, image: p.image || null }));
    const assets = list('asset', 'assets').map((a) => {
      const src = a.src || (IMG.test(a.file || '') ? a.file : null);
      return { ms: a.ms, title: base(a.file || a.src), site: a.assetKind || (a.kind !== 'asset' ? a.kind : '') || '', image: src && IMG.test(src) ? src : null };
    }).filter((a) => a.title);

    const writes = evs.filter((e) => e.kind === 'write').map((e) => {
      const t = e.target && Number.isFinite(+e.target.x) && Number.isFinite(+e.target.y) ? { x: +e.target.x, y: +e.target.y, w: Math.max(1, +e.target.w || 1), h: Math.max(1, +e.target.h || 1), selector: e.target.selector || '' } : null;
      return { ms: e.ms, agent: byId.has(String(e.agent)) ? String(e.agent) : 'main', file: base(e.file), target: t };
    });

    // Frames: new frame events and old frames[] (file or image), deduplicated by image, in time order.
    const fr = [];
    const seenImg = new Set();
    const pushFrame = (f, t) => {
      const src = f.image || f.file;
      if (!src || seenImg.has(src) || t == null) return;
      seenImg.add(src);
      fr.push({ ms: t, src, width: +f.width || 1440, height: +f.height || 0, url: f.url || task.url || null, bad: f.bad === true || f.caption === 'error' });
    };
    (film.frames || []).forEach((f) => pushFrame(f, ms(f.t || f.at)));
    evs.filter((e) => e.kind === 'frame').forEach((e) => pushFrame(e, ms(e.at) || e.ms));
    fr.sort((a, b) => a.ms - b.ms);

    return { title: task.title || 'Drip Film', url: task.url || (fr.length ? fr[fr.length - 1].url : null), start, end, live: !end, agents, refs, pieces, assets, writes, frames: fr };
  }

  /* ---- frame quality (the page measures pixels, these judge them) ---- */

  /** stats: {std, mean, redRows: [{y, frac}], rows} from a small canvas copy. Blank pages and dev-server error overlays are bad. */
  function judgeFrame(st) {
    if (!st) return { bad: false };
    if (st.std < 4) return { bad: true, why: 'blank' };
    // An error overlay: a dark page crossed by a thin, wide red bar near the top (Vite, Next and webpack all draw one).
    const thin = (st.redRows || []).filter((r) => r.frac >= 0.45 && r.y < 0.4);
    if (st.mean < 100 && thin.length && thin.length <= 3) return { bad: true, why: 'error' };
    return { bad: false };
  }

  /** Where the page changed between two frames, in page px: rows are [lum] per row over the page height. */
  function changeBand(prevRows, prevH, rows, h) {
    if (!rows || !rows.length) return null;
    if (!prevRows || !prevRows.length) return { y0: 0, y1: h };
    let y0 = null, y1 = null;
    for (let i = 0; i < rows.length; i++) {
      const y = (i + 0.5) * (h / rows.length);
      let d;
      if (y > prevH) d = 255;
      else d = Math.abs(rows[i] - prevRows[clamp(Math.floor((y / prevH) * prevRows.length), 0, prevRows.length - 1)]);
      if (d > 2.5) { if (y0 == null) y0 = y; y1 = y; }
    }
    return y0 == null ? null : { y0: Math.max(0, y0 - h / rows.length), y1: Math.min(h, y1 + h / rows.length) };
  }

  /* ---- the story ---- */

  const T = { intro: 1.4, cardGap: 0.32, cardIn: 0.9, wallHold: 1.8, converge: 1.1, blank: 2.2, hold: 2.4, fade: 0.7, travel: 0.85, maxCards: 8 };

  /** n: normalize() output. info: Map src -> {pageH, bad, band} (measured frames; frames not measured yet are left out).
   *  Returns everything the page needs, in story seconds at 1x. */
  function buildStory(n, info, opts) {
    opts = opts || {};
    info = info || new Map();
    const live = !!opts.live;
    const chapters = [];
    let t = T.intro;
    const cards = [];
    const wall = (items, label, chapter) => {
      if (!items.length) return;
      const shown = items.slice(0, T.maxCards);
      const s = t;
      shown.forEach((it, i) => cards.push(Object.assign({ group: chapter, i, of: shown.length, tin: s + 0.2 + i * T.cardGap }, it)));
      t = s + 0.2 + shown.length * T.cardGap + T.cardIn + T.wallHold;
      chapters.push({ id: chapter, label, start: s, end: t, line: chapter === 'refs' ? 'Looked at ' + items.length + (items.length === 1 ? ' reference' : ' references') : pickLine(n) });
    };
    wall(n.refs, 'References', 'refs');
    wall(n.pieces.concat(n.assets), 'Pieces', 'pieces');
    // cards leave the wall at their chapter's end (flying into the window)
    cards.forEach((c) => { const ch = chapters.find((x) => x.id === c.group); c.tout = ch.end - 0.15; c.last = ch.id === chapters[chapters.length - 1].id; });

    const good = n.frames.filter((f) => !f.bad && info.has(f.src) && !info.get(f.src).bad && !info.get(f.src).dup);
    const frames = [];
    const writesAt = []; // {t, agent, target, file}
    const camKeys = [];
    let windowIn = null;
    if (good.length || (n.writes.length && !live)) {
      windowIn = t;
      if (chapters.length) t += T.converge * 0.6;
      const buildStart = t;
      // Writes before the first frame happen on a blank page.
      const pre = n.writes.filter((w) => !good.length || w.ms < good[0].ms);
      if (pre.length && good.length) { place(pre, t + 0.3, t + T.blank - 0.2); t += T.blank; }
      good.forEach((f, k) => {
        const inf = info.get(f.src);
        const pageW = f.width || 1440;
        const pageH = inf.pageH || f.height || 900;
        const next = good[k + 1];
        const mine = n.writes.filter((w) => w.ms >= f.ms && (!next || w.ms < next.ms));
        const lastOne = !next && !live;
        const tall = Math.max(0, pageH / (pageW * 0.625) - 1);
        const hold = lastOne ? 2.2 + (tall + 1) * 1.5 : T.hold + Math.min(2.4, tall * 0.5) + Math.min(2.4, mine.filter((w) => w.target).length * 0.45);
        const fr = { src: f.src, ms: f.ms, start: t, end: t + hold, pageW, pageH, url: f.url, last: lastOne, band: k > 0 ? inf.band || null : null };
        frames.push(fr);
        // camera: look at what changed as the frame fades in, then follow the writes; the last frame is toured top to bottom
        const band = inf.band;
        if (k > 0 && band) camKeys.push({ t: t + 0.15, y: (band.y0 + band.y1) / 2, top: band.y0, frame: k });
        else if (k === 0) camKeys.push({ t: t, y: 0, top: 0, frame: k });
        if (lastOne) { camKeys.push({ t: t + 0.9, y: 0, top: 0, frame: k, slow: true }); camKeys.push({ t: t + hold - 0.6, y: pageH, top: pageH, frame: k, slow: true }); }
        else place(mine, t + T.fade + 0.3, t + hold - 0.25);
        t += hold;
      });
      if (!good.length) { place(n.writes, t + 0.3, t + T.blank); t += T.blank + 0.6; }
      chapters.push({ id: 'build', label: 'Build', start: buildStart, end: t });
    }

    function place(ws, a, b) {
      if (!ws.length) return;
      const step = ws.length > 1 ? Math.max(0.28, (b - a) / ws.length) : 0;
      ws.forEach((w, i) => {
        const at = Math.min(b, a + i * step);
        writesAt.push({ t: at, agent: w.agent, target: w.target, file: w.file });
        if (w.target) camKeys.push({ t: at - 0.25, y: w.target.y + w.target.h / 2, top: w.target.y, frame: frames.length - 1 });
      });
    }

    const total = Math.max(t, T.intro + 0.4);
    camKeys.sort((a, b) => a.t - b.t);

    // Map real time to story time through anchors (frames and writes), for agent presence and the live head.
    const anchors = [{ ms: n.start, t: 0 }];
    frames.forEach((f) => anchors.push({ ms: f.ms, t: f.start }));
    const lastMs = n.end || Math.max(n.start, ...n.frames.map((f) => f.ms), ...n.writes.map((w) => w.ms));
    anchors.push({ ms: lastMs, t: total });
    anchors.sort((a, b) => a.ms - b.ms || a.t - b.t);
    const realToStory = (m) => {
      if (m <= anchors[0].ms) return 0;
      for (let i = 1; i < anchors.length; i++) if (m <= anchors[i].ms) { const a = anchors[i - 1], b = anchors[i]; return a.t + (b.t - a.t) * ((m - a.ms) / Math.max(1, b.ms - a.ms)); }
      return total;
    };
    const storyToReal = (s) => {
      if (s <= 0) return n.start;
      for (let i = 1; i < anchors.length; i++) if (s <= anchors[i].t) { const a = anchors[i - 1], b = anchors[i]; return a.ms + (b.ms - a.ms) * ((s - a.t) / Math.max(1e-6, b.t - a.t)); }
      return lastMs;
    };

    const agents = n.agents.map((a) => ({ id: a.id, name: a.name, color: a.color, type: a.type, from: a.id === 'main' ? 0 : realToStory(a.start), to: a.end ? realToStory(a.end) : Infinity }));
    const beats = [0].concat(chapters.map((c) => c.start), frames.map((f) => f.start)).filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

    return { total, chapters, cards, frames, writes: writesAt.sort((a, b) => a.t - b.t), camKeys, windowIn, agents, beats, realToStory, storyToReal, title: n.title, url: n.url, live, runSeconds: ((n.end || lastMs) - n.start) / 1000 };
  }

  function pickLine(n) {
    const p = n.pieces.length, a = n.assets.length;
    if (p && a) return 'Picked ' + p + (p === 1 ? ' piece' : ' pieces') + ' and ' + a + (a === 1 ? ' asset' : ' assets');
    if (p) return 'Picked ' + p + (p === 1 ? ' piece' : ' pieces');
    return 'Gathered ' + a + (a === 1 ? ' asset' : ' assets');
  }

  /* ---- sampling the story at time t ---- */

  /** Which frames show at t: {cur, prev, mix} (mix 0..1 = how far cur has faded in). */
  function frameAt(s, t) {
    const fs = s.frames;
    if (!fs.length || t < fs[0].start) return { cur: -1, prev: -1, mix: 0 };
    let k = fs.length - 1;
    while (k > 0 && fs[k].start > t) k--;
    const mix = k === 0 ? 1 : ease((t - fs[k].start) / T.fade);
    return { cur: k, prev: k - 1, mix };
  }

  /** Camera: the page y (page px) at the centre of the view, eased between keys. */
  function cameraAt(s, t, vh) {
    const ks = s.camKeys;
    if (!ks.length) return 0;
    // a tall change is shown from its top, not its middle
    const y = (k) => (vh && !k.slow ? Math.min(k.y, k.top + vh * 0.42) : k.y);
    if (t <= ks[0].t) return y(ks[0]);
    let i = 0;
    while (i < ks.length - 1 && ks[i + 1].t <= t) i++;
    const a = ks[i], b = ks[i + 1];
    if (!b) return y(a);
    const span = b.slow ? b.t - a.t : Math.min(1.1, b.t - a.t);
    return y(a) + (y(b) - y(a)) * ease((t - (b.t - span)) / span);
  }

  /** Cursors at t: one per agent with targeted writes, gliding to each target and arriving at the write. */
  function cursorsAt(s, t) {
    const out = [];
    s.agents.forEach((a) => {
      const ws = s.writes.filter((w) => w.agent === a.id && w.target);
      if (!ws.length) return;
      const first = ws[0].t - T.travel - 0.3;
      if (t < first || t > Math.max(a.to, ws[ws.length - 1].t + 1.5) + 0.6) return;
      const point = (w) => ({ x: w.target.x + Math.min(w.target.w * 0.35, 160), y: w.target.y + Math.min(w.target.h * 0.45, 70) });
      // i: the last write the cursor reached; it leaves for the next one just in time to arrive at it
      let i = -1;
      while (i < ws.length - 1 && ws[i + 1].t <= t) i++;
      const next = ws[i + 1];
      const here = i >= 0 ? point(ws[i]) : null;
      let p = here, writing = null, moving = false;
      if (next) {
        const tr = i >= 0 ? Math.min(T.travel, (next.t - ws[i].t) * 0.7) : T.travel;
        const to = point(next);
        const from = here || { x: to.x - 180, y: to.y + 120 };
        if (t > next.t - tr) {
          moving = true;
          const k = ease((t - (next.t - tr)) / tr);
          p = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
        } else if (!here) p = from;
      }
      if (!moving && i >= 0 && t - ws[i].t < 1.6) writing = ws[i];
      const end = Math.max(a.to, ws[ws.length - 1].t + 1.5);
      const alpha = Math.min(clamp((t - first) / 0.35, 0, 1), clamp((end + 0.6 - t) / 0.6, 0, 1));
      out.push({ id: a.id, name: a.name, color: a.color, x: p.x, y: p.y, alpha, writing });
    });
    return out;
  }

  /** Writes whose highlight shows at t (a box on the target, in the agent's colour, for 1.6 s). */
  function marksAt(s, t) {
    return s.writes.filter((w) => w.target && t >= w.t && t < w.t + 1.6).map((w) => ({ w, k: (t - w.t) / 1.6 }));
  }

  /** The newest untargeted write near t (old films): a one-line activity note. */
  function noteAt(s, t) {
    let last = null;
    for (const w of s.writes) { if (w.t > t) break; if (!w.target && t - w.t < 1.8) last = w; }
    return last;
  }

  function agentsAt(s, t) { return s.agents.filter((a) => t >= a.from && t <= a.to); }
  function chapterAt(s, t) { return s.chapters.find((c) => t >= c.start && t < c.end) || null; }

  /** Card placement on the wall: a loose grid, slightly turned, inside a box of w x h px. */
  function wallSlot(i, of, w, h) {
    const cols = of <= 3 ? of : of <= 4 ? 2 : of <= 6 ? 3 : 4;
    const rows = Math.ceil(of / cols);
    const narrow = w < 640;
    const c2 = narrow ? Math.min(2, cols) : cols;
    const r2 = Math.ceil(of / c2);
    const gap = narrow ? 12 : 28;
    const cw = Math.min(narrow ? 999 : 340, (w - gap * (c2 - 1)) / c2, ((h - gap * (r2 - 1)) / r2 - 34) * 1.6);
    const ch = cw / 1.6 + 34;
    const col = i % c2, row = Math.floor(i / c2);
    const inRow = Math.min(c2, of - row * c2);
    const x0 = (w - (inRow * cw + (inRow - 1) * gap)) / 2;
    const y0 = (h - (r2 * ch + (r2 - 1) * gap)) / 2;
    const tilt = narrow ? 0 : ((i * 37) % 5 - 2) * 0.9;
    const lift = narrow ? 0 : ((i * 53) % 3 - 1) * 10;
    void rows;
    return { x: x0 + col * (cw + gap), y: y0 + row * (ch + gap) + lift, w: cw, h: ch, r: tilt };
  }

  const api = { normalize, buildStory, judgeFrame, changeBand, frameAt, cameraAt, cursorsAt, marksAt, noteAt, agentsAt, chapterAt, wallSlot, fmt, fmtLong, ease, easeOut, clamp, T, COLORS };
  root.DripFilm = api;
})(typeof window !== 'undefined' ? window : globalThis);

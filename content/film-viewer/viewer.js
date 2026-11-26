/* Drip Film viewer: reads film.json (same folder, or ?film=<path>) and plays the run as a story: the references it looked
   at, the pieces and assets it picked, then the page being built with one cursor per agent, and a finished card on top.
   Everything on screen is a pure function of the story time t (model.js), so seeking lands exactly.
   Plain JS, no build step. URL options:
     ?film=path/film.json   which film to read (pictures are relative to it)
     ?t=<seconds>           start paused at this story time
     ?end=1                 start on the finished card                                                        */
(() => {
  'use strict';
  const F = window.DripFilm;
  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const FILM_URL = Q.get('film') || 'film.json';
  const BASE = FILM_URL.includes('/') ? FILM_URL.slice(0, FILM_URL.lastIndexOf('/') + 1) : '';
  const POLL_MS = 2000;
  const STALE_MS = 5 * 60e3; // a run with no news for this long and no end counts as finished at its last news
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = $('app'), stage = $('stage'), win = $('win'), view = $('view');
  const imgA = $('imgA'), imgB = $('imgB');

  let film = null, norm = null, story = null, sig = '';
  const info = new Map(); // frame src -> {pageH, bad, rows, ...}
  const loading = new Set();
  let t = 0, playing = false, speed = 1, follow = false, started = false, dragging = false, finishedShown = false;
  let L = null; // layout (sizes in px)

  const src = (p) => (!p ? '' : /^(https?:|data:|\/)/.test(p) ? p : BASE + p);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- loading ---------- */

  async function load() {
    let next;
    try {
      const r = await fetch(FILM_URL + (FILM_URL.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'missing' : 'HTTP ' + r.status);
      next = await r.json();
    } catch (e) {
      if (!film) showEmpty(e);
      return;
    }
    const s = JSON.stringify([next.task && next.task.endedAt, (next.events || []).length, (next.frames || []).length, (next.agents || []).length]);
    if (s === sig) return;
    sig = s;
    film = next;
    norm = F.normalize(film);
    const lastNews = Math.max(norm.start, ...((film.events || []).map((e) => Date.parse(e.t || e.at) || 0)));
    if (norm.live && Date.now() - lastNews > STALE_MS) { norm.end = lastNews; norm.live = false; }
    $('empty').hidden = true;
    $('title').textContent = norm.title;
    document.title = norm.title + ' · Drip Film';
    norm.frames.forEach(measure);
    [...norm.refs, ...norm.pieces, ...norm.assets].forEach((c) => { if (c.image) { const i = new Image(); i.src = src(c.image); } });
    rebuild();
  }

  /** Load a frame, measure it (blank? error overlay? what changed?) and rebuild the story once known. */
  function measure(f) {
    if (info.has(f.src) || loading.has(f.src)) return;
    loading.add(f.src);
    const img = new Image();
    img.onload = () => {
      const W = 160, H = Math.max(8, Math.min(900, Math.round((W * img.naturalHeight) / img.naturalWidth)));
      let st = null;
      try {
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        let sum = 0, sq = 0;
        const rows = new Array(H).fill(0), redRows = [];
        for (let y = 0; y < H; y++) {
          let rs = 0, red = 0;
          for (let i = 0; i < W; i++) {
            const o = (y * W + i) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            rs += l; sum += l; sq += l * l;
            if (r > 120 && r > 2 * g && r > 2 * b) red++;
          }
          rows[y] = rs / W;
          if (red / W >= 0.45) redRows.push({ y: y / H, frac: red / W });
        }
        const n = W * H, mean = sum / n;
        st = { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)), redRows, rows };
      } catch (e) { /* cross-origin picture: trust it */ }
      const pageW = f.width || 1440;
      const j = F.judgeFrame(st);
      info.set(f.src, { pageH: (img.naturalHeight * pageW) / img.naturalWidth, bad: j.bad, why: j.why, rows: st && st.rows });
      loading.delete(f.src);
      rebuild();
    };
    img.onerror = () => { info.set(f.src, { bad: true, why: 'missing' }); loading.delete(f.src); rebuild(); };
    img.src = src(f.src);
  }

  /** Changes between good frames (for the camera and the glow), duplicates dropped. */
  function compare() {
    let prev = null;
    for (const f of norm.frames) {
      const i = info.get(f.src);
      if (!i || i.bad || f.bad) continue;
      i.dup = false;
      if (!prev) { i.band = null; prev = i; continue; }
      i.band = i.rows && prev.rows ? F.changeBand(prev.rows, prev.pageH, i.rows, i.pageH) : null;
      if (i.rows && prev.rows && !i.band) { i.dup = true; continue; }
      prev = i;
    }
  }

  let rebuildT = 0;
  function rebuild() {
    // wait (briefly) until every frame is measured, so the story doesn't reshuffle while it plays
    clearTimeout(rebuildT);
    if (loading.size && !story) { rebuildT = setTimeout(rebuild, 150); return; }
    compare();
    const was = story;
    story = F.buildStory(norm, info, { live: norm.live });
    $('liveBtn').hidden = !norm.live;
    buildWall();
    buildTrack();
    layout();
    if (!started) {
      started = true;
      if (Q.has('end')) t = story.total;
      else if (Q.has('t')) t = Math.min(story.total, +Q.get('t') || 0);
      else if (norm.live) { follow = true; t = Math.max(0, story.total - 4); setPlaying(true); }
      else { t = 0; setTimeout(() => setPlaying(true), RM ? 0 : 500); }
    } else if (was && t > story.total) t = story.total;
    render();
  }

  function showEmpty(e) {
    const sample = 'sample/film.json';
    $('empty').hidden = false;
    $('emptyText').innerHTML = e.message === 'missing'
      ? 'No film here yet. Drip writes one as soon as a task starts.<br><a href="?film=' + sample + '">Watch the sample</a>'
      : 'Could not read <code>' + esc(FILM_URL) + '</code>. Serve this folder over http.<br><a href="?film=' + sample + '">Watch the sample</a>';
  }

  /* ---------- layout ---------- */

  function layout() {
    if (!story) return;
    const w = stage.clientWidth, h = stage.clientHeight, narrow = w < 640;
    const pad = narrow ? 16 : 40, top = narrow ? 52 : 64, bottom = narrow ? 44 : 52;
    const ratio = narrow ? 0.78 : 0.625; // view height / width
    const ww = Math.min(w - pad * 2, (h - top - bottom - 34) / ratio, 1360);
    const vh = Math.round(ww * ratio);
    L = { w, h, narrow, win: { x: (w - ww) / 2, y: top + (h - top - bottom - vh - 34) / 2, w: ww, h: vh + 34 }, vw: ww, vh, wallBox: { x: pad, y: top, w: w - pad * 2, h: h - top - bottom } };
    win.style.width = ww + 'px';
    view.style.height = vh + 'px';
    cards.forEach((c) => { c.slot = F.wallSlot(c.d.i, c.d.of, L.wallBox.w, L.wallBox.h); c.el.style.width = c.slot.w + 'px'; });
  }

  /* ---------- the wall ---------- */

  let cards = [];
  function buildWall() {
    const key = story.cards.map((c) => c.group + c.title + c.tin).join('|');
    if ($('wall').dataset.key === key) { cards.forEach((c, i) => (c.d = story.cards[i])); return; }
    $('wall').dataset.key = key;
    $('wall').innerHTML = '';
    cards = story.cards.map((d) => {
      const el = document.createElement('figure');
      el.className = 'card';
      el.innerHTML = '<div class="shot">' + (d.image ? '<img alt="" src="' + esc(src(d.image)) + '">' : '<span class="ph">' + esc(d.title) + '</span>') + '</div>' +
        '<figcaption class="cap"><b>' + esc(d.title) + '</b>' + (d.site ? '<span>' + esc(d.site) + '</span>' : '') + '</figcaption>';
      $('wall').appendChild(el);
      return { el, d, slot: null };
    });
  }

  /* ---------- the timeline ---------- */

  function buildTrack() {
    const tot = story.total;
    const pct = (v) => (v / tot) * 100 + '%';
    const segs = [];
    let a = 0;
    const cuts = story.chapters.map((c) => c.start).filter((v) => v > 0.5);
    cuts.concat([tot]).forEach((b) => { if (b - a > 0.05) segs.push([a, b]); a = b; });
    $('track').innerHTML = segs.map(([x, y], i) => '<div class="seg" style="left:calc(' + pct(x) + ' + ' + (i ? 2 : 0) + 'px);width:calc(' + pct(y - x) + ' - ' + (i ? 2 : 0) + 'px)" data-a="' + x + '" data-b="' + y + '"><b></b></div>').join('');
    const colour = new Map(story.agents.map((g) => [g.id, g.color]));
    $('ticks').innerHTML = story.writes.map((w) => '<i style="left:' + pct(w.t) + ';background:' + colour.get(w.agent) + '"></i>').join('');
    $('dur').textContent = F.fmt(tot);
    $('scrub').setAttribute('aria-valuemax', String(Math.round(tot)));
  }

  /* ---------- render at t ---------- */

  const curEls = new Map();
  const markEls = [];
  const set = (el, k, v) => { if (el.style[k] !== v) el.style[k] = v; };

  function render() {
    if (!story || !L) return;
    const s = story;
    // intro title
    const intro = $('intro');
    if (intro.textContent !== s.title) intro.textContent = s.title;
    const nothing = !s.cards.length && s.windowIn == null;
    const ii = nothing ? 1 : Math.min(F.easeOut(t / 0.8), 1 - F.ease((t - (F.T.intro - 0.45)) / 0.5));
    set(intro, 'opacity', String(ii));
    set(intro, 'filter', 'blur(' + ((1 - ii) * 12).toFixed(1) + 'px)');
    set(intro, 'transform', 'translate(-50%, calc(-50% + ' + ((t < 0.8 ? 1 - ii : -(1 - ii)) * 18).toFixed(1) + 'px))');

    // chapter line
    const ch = F.chapterAt(s, t);
    const line = $('line');
    if (ch && ch.line && line.dataset.id !== ch.id) { line.textContent = ch.line; line.dataset.id = ch.id; }
    const li = ch && ch.line ? Math.min(F.easeOut((t - ch.start) / 0.6), 1 - F.ease((t - (ch.end - 0.5)) / 0.5)) : 0;
    set(line, 'opacity', String(li));
    set(line, 'filter', 'blur(' + ((1 - li) * 8).toFixed(1) + 'px)');

    // wall cards
    const wc = { x: L.win.x + L.win.w / 2, y: L.win.y + L.win.h / 2 };
    cards.forEach((c) => {
      const d = c.d, sl = c.slot;
      if (!sl || t < d.tin || t > d.tout + 0.9) { set(c.el, 'opacity', '0'); set(c.el, 'visibility', 'hidden'); return; }
      set(c.el, 'visibility', 'visible');
      const p = F.easeOut((t - d.tin) / F.T.cardIn);
      let x = L.wallBox.x + sl.x, y = L.wallBox.y + sl.y + (1 - p) * 90, r = sl.r + (1 - p) * 7, sc = 0.9 + 0.1 * p, o = p, b = (1 - p) * 10;
      if (t > d.tout) {
        const q = F.ease((t - d.tout) / 0.8);
        if (d.last && s.windowIn != null) {
          x += (wc.x - (x + sl.w / 2)) * q; y += (wc.y - (y + sl.h / 2)) * q; sc *= 1 - 0.7 * q; r *= 1 - q;
        } else { y -= 50 * q; b = 8 * q; }
        o = 1 - q;
      }
      set(c.el, 'opacity', o.toFixed(3));
      set(c.el, 'filter', b > 0.2 ? 'blur(' + b.toFixed(1) + 'px)' : 'none');
      set(c.el, 'transform', 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')');
    });

    // window
    const wi = s.windowIn == null ? 0 : F.easeOut((t - s.windowIn) / 0.9);
    set(win, 'opacity', wi.toFixed(3));
    set(win, 'transform', 'translate3d(' + L.win.x.toFixed(1) + 'px,' + (L.win.y + (1 - wi) * 36).toFixed(1) + 'px,0) scale(' + (0.96 + 0.04 * wi).toFixed(4) + ')');

    const fa = F.frameAt(s, t);
    const cur = s.frames[fa.cur], prev = s.frames[fa.prev];
    const pageW = cur ? cur.pageW : 1440;
    const k = L.vw / pageW; // page px -> screen px
    const vhPage = L.vh / k;
    const maxScroll = Math.max(0, (cur ? cur.pageH : vhPage) - vhPage);
    const camY = F.cameraAt(s, t, vhPage);
    const scroll = F.clamp(camY - vhPage / 2, 0, maxScroll);
    const urlText = (cur && cur.url) || s.url || '';
    if ($('url').textContent !== urlText) $('url').textContent = urlText.replace(/^https?:\/\//, '');
    setImg(imgB, cur ? cur.src : '');
    setImg(imgA, prev && fa.mix < 1 ? prev.src : '');
    set(imgB, 'opacity', cur ? fa.mix.toFixed(3) : '0');
    set(imgA, 'opacity', prev && fa.mix < 1 ? '1' : '0');
    const ty = 'translate3d(0,' + (-scroll * k).toFixed(1) + 'px,0)';
    set(imgA, 'transform', ty);
    set(imgB, 'transform', ty);

    // the glow on what changed
    const band = $('band');
    const bk = cur && cur.band ? (t - cur.start) / 1.6 : 1;
    if (bk >= 0 && bk < 1) {
      const y0 = cur.band.y0, y1 = cur.band.y1;
      set(band, 'opacity', (Math.sin(Math.PI * Math.min(1, bk * 1.4)) * 0.9).toFixed(3));
      set(band, 'transform', 'translate3d(10px,' + ((y0 - scroll) * k + 6).toFixed(1) + 'px,0)');
      set(band, 'width', (L.vw - 20) + 'px');
      set(band, 'height', Math.max(12, (y1 - y0) * k - 8) + 'px');
    } else set(band, 'opacity', '0');

    // write marks
    const ms = F.marksAt(s, t);
    const colour = (id) => (s.agents.find((a) => a.id === id) || {}).color || '#fff';
    while (markEls.length < ms.length) { const m = document.createElement('div'); m.className = 'mark'; m.innerHTML = '<i></i><i></i><i></i><i></i>'; $('marks').appendChild(m); markEls.push(m); }
    markEls.forEach((m, i) => {
      const it = ms[i];
      if (!it) { set(m, 'opacity', '0'); return; }
      const tg = it.w.target, c = colour(it.w.agent);
      const o = it.k < 0.15 ? it.k / 0.15 : 1 - F.ease((it.k - 0.5) / 0.5);
      const grow = 1 + 0.04 * (1 - F.easeOut(it.k / 0.4));
      set(m, 'opacity', o.toFixed(3));
      set(m, 'color', c);
      set(m, 'background', c + '12');
      set(m, 'width', tg.w * k + 'px');
      set(m, 'height', tg.h * k + 'px');
      set(m, 'transform', 'translate3d(' + (tg.x * k).toFixed(1) + 'px,' + ((tg.y - scroll) * k).toFixed(1) + 'px,0) scale(' + grow.toFixed(3) + ')');
    });

    // cursors
    const cs = F.cursorsAt(s, t);
    const live = new Set();
    cs.forEach((c) => {
      live.add(c.id);
      let el = curEls.get(c.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'cur';
        el.innerHTML = '<svg viewBox="0 0 20 22" aria-hidden="true"><use href="#i-cursor"/></svg><span class="tag"><b></b><em></em></span>';
        el.querySelector('svg').style.fill = c.color;
        el.querySelector('.tag').style.background = c.color;
        el.querySelector('b').textContent = c.name;
        $('cursors').appendChild(el);
        curEls.set(c.id, el);
      }
      const file = c.writing ? c.writing.file : '';
      const em = el.querySelector('em');
      if (file && em.textContent !== file) em.textContent = file;
      el.classList.toggle('writing', !!file);
      set(el, 'opacity', (c.alpha * wi).toFixed(3));
      set(el, 'transform', 'translate3d(' + (c.x * k).toFixed(1) + 'px,' + ((c.y - scroll) * k).toFixed(1) + 'px,0)');
    });
    curEls.forEach((el, id) => { if (!live.has(id)) set(el, 'opacity', '0'); });

    // activity note (writes without a place on the page)
    const n = F.noteAt(s, t);
    const note = $('note');
    if (n) {
      const a = s.agents.find((x) => x.id === n.agent) || {};
      const html = '<i style="background:' + a.color + '"></i><b>' + esc(a.name) + '</b><code>' + esc(n.file) + '</code>';
      if (note.dataset.h !== html) { note.innerHTML = html; note.dataset.h = html; }
    }
    note.classList.toggle('on', !!n);

    // who is working, and the run's own clock
    const on = new Set(F.agentsAt(s, t).map((a) => a.id));
    s.agents.forEach((a) => {
      let el = $('who').querySelector('[data-id="' + CSS.escape(a.id) + '"]');
      if (!el) {
        el = document.createElement('span');
        el.className = 'a gone';
        el.dataset.id = a.id;
        el.innerHTML = '<i style="background:' + a.color + '"></i>' + esc(a.name);
        $('who').appendChild(el);
      }
      const want = on.has(a.id) && t > F.T.intro * 0.6;
      if (want && el.classList.contains('gone')) { el.classList.remove('gone'); void el.offsetWidth; }
      el.classList.toggle('on', want);
      if (!want && !el.classList.contains('gone') && !el._gt) el._gt = setTimeout(() => { el._gt = 0; if (!el.classList.contains('on')) el.classList.add('gone'); }, 360);
    });
    const real = (s.storyToReal(t) - norm.start) / 1000;
    $('realClock').textContent = t > 0.3 ? F.fmt(real) : '';

    // transport
    $('time').textContent = F.fmt(t);
    const p = s.total ? t / s.total : 0;
    $('track').querySelectorAll('.seg').forEach((g) => {
      const a = +g.dataset.a, b = +g.dataset.b;
      set(g.firstChild, 'transform', 'scaleX(' + F.clamp((t - a) / (b - a), 0, 1).toFixed(4) + ')');
    });
    set($('knob'), 'left', (p * 100).toFixed(3) + '%');
    $('scrub').setAttribute('aria-valuenow', String(Math.round(t)));
    $('scrub').setAttribute('aria-valuetext', F.fmt(t) + ' of ' + F.fmt(s.total));

    // the end card, over the last frame
    const atEnd = !norm.live && t >= s.total - 0.02 && !dragging;
    if (atEnd !== finishedShown) {
      finishedShown = atEnd;
      showEnd(atEnd);
    }
    app.classList.toggle('playing', playing);
  }

  function setImg(el, p) {
    const want = p ? src(p) : '';
    if (el.dataset.src === want) return;
    el.dataset.src = want;
    if (want) el.src = want; else el.removeAttribute('src');
  }

  function showEnd(on) {
    const end = $('end');
    if (on) {
      const helpers = story.agents.filter((a) => a.id !== 'main');
      const builders = helpers.filter((a) => a.type === 'builder').length;
      const who = builders ? 'Director and ' + builders + (builders === 1 ? ' builder' : ' builders') : helpers.length ? 'Director and ' + helpers.length + (helpers.length === 1 ? ' helper' : ' helpers') : 'One agent';
      $('endBig').textContent = 'Built in ' + F.fmtLong(story.runSeconds) + '.';
      $('endSub').textContent = who + ', ' + story.frames.length + (story.frames.length === 1 ? ' frame.' : ' frames.');
      const open = $('openBtn');
      open.hidden = !story.url;
      if (story.url) open.href = story.url;
      end.hidden = false;
      requestAnimationFrame(() => end.classList.add('on'));
    } else {
      end.classList.remove('on');
      setTimeout(() => { if (!finishedShown) end.hidden = true; }, 500);
    }
  }

  /* ---------- playback ---------- */

  let last = 0;
  function loop(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (playing && story && !dragging) {
      const rate = follow && story.total - t > 10 ? 3 : speed;
      t = Math.min(story.total, t + dt * rate);
      if (t >= story.total && !norm.live) setPlaying(false);
      render();
    }
    requestAnimationFrame(loop);
  }

  function setPlaying(on) {
    if (on && story && !norm.live && t >= story.total - 0.02) t = 0;
    playing = on;
    $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
    app.classList.toggle('playing', on);
  }
  function setFollow(on) {
    follow = on && norm && norm.live;
    $('liveBtn').setAttribute('aria-pressed', String(!!follow));
  }
  function seek(v, keepFollow) {
    if (!story) return;
    t = F.clamp(v, 0, story.total);
    if (!keepFollow) setFollow(false);
    render();
  }

  $('playBtn').addEventListener('click', () => { setPlaying(!playing); if (!playing) setFollow(false); });
  $('replayBtn').addEventListener('click', () => { seek(0); setPlaying(true); });
  $('liveBtn').addEventListener('click', () => { setFollow(true); if (story) t = Math.max(t, story.total - 4); setPlaying(true); });
  const SPEEDS = [1, 2, 4];
  $('speedBtn').addEventListener('click', () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; $('speedBtn').textContent = speed + '×'; });

  // the timeline: click or drag anywhere, it lands exactly there
  const scrub = $('scrub');
  const at = (e) => { const r = scrub.getBoundingClientRect(); return F.clamp((e.clientX - r.left) / r.width, 0, 1) * (story ? story.total : 0); };
  const peek = (e) => {
    if (!story) return;
    const v = at(e), r = scrub.getBoundingClientRect();
    const c = F.chapterAt(story, v);
    $('peek').innerHTML = F.fmt(v) + (c ? '<span>' + esc(c.label) + '</span>' : '');
    $('peek').style.left = F.clamp(e.clientX - r.left, 30, r.width - 30) + 'px';
  };
  let wasPlaying = false;
  scrub.addEventListener('pointerdown', (e) => {
    if (!story || e.button > 0) return;
    scrub.setPointerCapture(e.pointerId);
    dragging = true; wasPlaying = playing;
    scrub.classList.add('drag');
    peek(e);
    seek(at(e));
  });
  scrub.addEventListener('pointermove', (e) => { peek(e); if (dragging) seek(at(e)); });
  const up = (e) => {
    if (!dragging) return;
    dragging = false;
    scrub.classList.remove('drag');
    seek(at(e));
    if (wasPlaying && t < story.total) setPlaying(true);
  };
  scrub.addEventListener('pointerup', up);
  scrub.addEventListener('pointercancel', up);

  const beat = (dir) => {
    if (!story) return;
    const bs = story.beats.concat([story.total]);
    const nx = dir > 0 ? bs.find((b) => b > t + 0.05) : [...bs].reverse().find((b) => b < t - 0.4);
    seek(nx == null ? (dir > 0 ? story.total : 0) : nx);
  };
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); setPlaying(!playing); if (!playing) setFollow(false); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? seek(t + 5) : beat(1); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? seek(t - 5) : beat(-1); }
    else if (k === 'Home') { e.preventDefault(); seek(0); }
    else if (k === 'End') { e.preventDefault(); seek(story ? story.total : 0); }
    else if (k === 'l' || k === 'L') { if (norm && norm.live) $('liveBtn').click(); }
  });

  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layout(); render(); }); });

  load().then(() => {
    requestAnimationFrame(loop);
    setInterval(() => { if (!film || norm.live) load(); }, POLL_MS);
  });
})();

/* Drip Film viewer: reads film.json (same folder, or ?film=<path>) and shows the swarm live or as a montage.
   Plain JS, no build step. URL options:
     ?film=sample/film.json   which film to read (frames are relative to it)
     ?mode=live|montage       start in this view (default: live while running, montage once ended)
     ?t=<seconds>             montage: start paused at this many seconds from the task start
     ?end=1                   montage: start at the end card
     ?at=<seconds>            live: freeze the clock at this many seconds from the start (demos, screenshots)
     ?theme=light|dark                                                                                        */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const FILM_URL = Q.get('film') || 'film.json';
  const BASE = FILM_URL.includes('/') ? FILM_URL.slice(0, FILM_URL.lastIndexOf('/') + 1) : '';
  const app = $('app');
  const POLL_MS = 2000;
  const SEG_MS = 1150;          // wall time per frame in the montage at 1x
  const STALE_MS = 10 * 60e3;   // live run with no news for this long: freeze the clock at its last news

  const MODEL = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };
  const ROLE_ICON = {
    director: '<circle cx="8" cy="8" r="5.8"/><path d="M10.6 5.4 9.1 9.1 5.4 10.6 6.9 6.9z" stroke-linejoin="round"/>',
    builder: '<rect x="2.4" y="8.6" width="5" height="5" rx="1.1"/><rect x="8.6" y="8.6" width="5" height="5" rx="1.1"/><rect x="5.5" y="2.4" width="5" height="5" rx="1.1"/>',
    helper: '<path d="M8 2.2c.5 2.9 1.9 4.3 4.8 4.8-2.9.5-4.3 1.9-4.8 4.8C7.5 8.9 6.1 7.5 3.2 7 6.1 6.5 7.5 5.1 8 2.2Z" stroke-linejoin="round"/><path d="M12.6 11.2v2.6M11.3 12.5h2.6" stroke-linecap="round"/>',
    scout: '<circle cx="7" cy="7" r="4.2"/><path d="m10.2 10.2 3.4 3.4" stroke-linecap="round"/>',
    checker: '<circle cx="8" cy="8" r="5.8"/><path d="m5.5 8.2 1.8 1.8 3.3-3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    critic: '<path d="M1.8 8S4 3.9 8 3.9 14.2 8 14.2 8 12 12.1 8 12.1 1.8 8 1.8 8Z" stroke-linejoin="round"/><circle cx="8" cy="8" r="2"/>',
  };
  const svg = (inner, size = 16) => `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${inner}</svg>`;
  const ICON_DONE = svg('<path d="m3.8 8.4 2.7 2.7 5.7-6" stroke-linecap="round" stroke-linejoin="round"/>', 13);
  const ICON_FAIL = svg('<path d="m4.5 4.5 7 7M11.5 4.5l-7 7" stroke-linecap="round"/>', 13);
  const ICON_PEN = svg('<path d="M9.6 3.4 12.6 6.4 6.2 12.8H3.2V9.8z" stroke-linejoin="round"/>', 12);
  const ICON_DOT = svg('<circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>', 12);
  const PIECE_HOSTS = {
    'magicui.design': 'Magic UI', 'reactbits.dev': 'React Bits', 'ui.aceternity.com': 'Aceternity', 'cult-ui.com': 'Cult UI',
    'www.cult-ui.com': 'Cult UI', 'smoothui.dev': 'Smooth UI', 'www.efferd.com': 'efferd', 'efferd.com': 'efferd',
    'eldoraui.site': 'Eldora', 'www.eldoraui.site': 'Eldora', 'ui.shadcn.com': 'shadcn', '21st.dev': '21st.dev',
  };

  // ---------- state ----------
  let film = null, rawText = '';
  let T0 = 0, TE = null;                 // task start, task end (null while running)
  let agents = [], events = [], frames = [];
  let agentById = new Map();
  let mode = null;
  let loadError = null;
  const FROZEN = Q.has('at') ? Number(Q.get('at')) * 1000 : null;

  // montage
  let knots = [], seg = 0, u = 0, playing = false, speed = 1, lastTs = 0;
  let pendingSeek = Q.has('t') ? Number(Q.get('t')) * 1000 : null;
  let pendingEnd = Q.get('end') === '1';
  let toastShown = false;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ms = (iso) => (iso ? Date.parse(iso) : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function clock(d) {
    d = Math.max(0, Math.round(d / 1000));
    const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  }
  function dur(d) {
    d = Math.max(0, Math.round(d / 1000));
    const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return s ? `${m}m ${s}s` : `${m}m`;
    return `${s}s`;
  }
  function ago(d) {
    d = Math.max(0, d / 1000);
    if (d < 5) return 'just now';
    if (d < 60) return `${Math.round(d)}s ago`;
    if (d < 3600) return `${Math.round(d / 60)}m ago`;
    if (d < 86400) return `${Math.round(d / 3600)}h ago`;
    return `${Math.round(d / 86400)}d ago`;
  }
  function piece(p) {
    if (!p) return null;
    try {
      const u = new URL(p);
      const name = u.pathname.split('/').filter(Boolean).pop()?.replace(/\.json$/, '') || u.hostname;
      return { name, lib: PIECE_HOSTS[u.hostname] || u.hostname.replace(/^www\./, ''), href: p };
    } catch {
      return { name: p.replace(/^custom:\s*/i, ''), lib: /^custom:/i.test(p) ? 'custom' : '', href: null };
    }
  }
  const modelName = (m) => MODEL[m] || (m ? m[0].toUpperCase() + m.slice(1) : 'Agent');
  const glyph = (a, size) => `<span class="glyph">${svg(ROLE_ICON[a?.type] || ROLE_ICON.helper, size)}</span>`;
  const latestKnown = () => Math.max(T0, ...events.map((e) => e.t), ...frames.map((f) => f.t), ...agents.map((a) => Math.max(a.s, a.e || 0)));

  // the live clock: real time, the end of a finished run, a frozen ?at=, or the last news of a run that went quiet
  function liveNow() {
    if (FROZEN != null) return T0 + FROZEN;
    if (TE) return TE;
    const real = Date.now(), last = latestKnown();
    return real - last > STALE_MS ? last : Math.max(real, last);
  }
  const isStale = () => FROZEN == null && !TE && Date.now() - latestKnown() > STALE_MS;
  function domainEnd() {
    if (TE) return TE;
    const n = liveNow();
    return n + Math.max(30e3, (n - T0) * 0.06);
  }
  const statusAt = (a, t) => (a.e && a.e <= t ? (a.status === 'failed' ? 'failed' : 'done') : 'working');
  // index of the last item with .t <= t (sorted), -1 if none
  function lastIdx(list, t) {
    let lo = 0, hi = list.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m].t <= t) { r = m; lo = m + 1; } else hi = m - 1; }
    return r;
  }

  // ---------- load ----------
  async function load() {
    let text;
    try {
      const res = await fetch(FILM_URL + (FILM_URL.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : 'HTTP ' + res.status);
      text = await res.text();
    } catch (err) {
      if (!film) showLoadError(err);
      return;
    }
    if (text === rawText) return;
    let data;
    try { data = JSON.parse(text); } catch { return; } // a half-written file: wait for the next poll
    rawText = text;
    const wasRunning = film && !TE;
    ingest(data);
    if (wasRunning && TE) announceEnd();
  }

  function ingest(data) {
    film = data;
    loadError = null;
    T0 = ms(data.task?.startedAt) ?? Date.now();
    TE = ms(data.task?.endedAt);
    agents = (data.agents || []).map((a) => ({ ...a, s: ms(a.startedAt) ?? T0, e: ms(a.endedAt) }))
      .sort((x, y) => (x.type === 'director' ? -1 : 0) - (y.type === 'director' ? -1 : 0) || x.s - y.s);
    agentById = new Map(agents.map((a) => [a.id, a]));
    events = (data.events || []).map((e, i) => ({ ...e, i, t: ms(e.t) ?? T0 })).sort((a, b) => a.t - b.t || a.i - b.i);
    frames = (data.frames || []).map((f) => ({ ...f, t: ms(f.t) ?? T0, src: /^(https?:|\/)/.test(f.file) ? f.file : BASE + f.file }))
      .sort((a, b) => a.t - b.t);
    if (mode == null) setMode(Q.get('mode') === 'live' || Q.get('mode') === 'montage' ? Q.get('mode') : TE ? 'montage' : 'live', true);
    buildKnots();
    renderHeader();
    buildTimeline();
    frames.slice(-6).forEach((f) => { const i = new Image(); i.src = f.src; });
    if (mode === 'montage') {
      if (pendingEnd) { seekTo(knots[knots.length - 1]); pendingEnd = false; }
      else if (pendingSeek != null) { seekTo(T0 + pendingSeek); pendingSeek = null; }
      else if (!montageStarted) { montageStarted = true; seekTo(T0); if (!Q.has('t')) setTimeout(() => play(true), 600); }
    }
    renderAll();
  }
  let montageStarted = false;

  function showLoadError(err) {
    loadError = err;
    $('taskTitle').textContent = 'No film here yet';
    $('taskMeta').innerHTML = `<span class="chip">${esc(FILM_URL)}</span>`;
    setStatus('idle', 'Waiting');
    $('empty').hidden = false;
    const sample = 'sample/film.json';
    $('emptyText').innerHTML = err.message === 'not-found'
      ? `No <code>${esc(FILM_URL)}</code> next to this page yet. Drip writes it as soon as a swarm starts.<br><a href="?film=${sample}">Open the sample film</a>`
      : `Could not read <code>${esc(FILM_URL)}</code> (${esc(err.message)}). Serve this folder over http, not file://.<br><a href="?film=${sample}">Open the sample film</a>`;
    $('agents').innerHTML = '';
    $('feed').innerHTML = '<li class="feed-empty">Nothing yet.</li>';
  }

  // ---------- header ----------
  function renderHeader() {
    const task = film.task || {};
    $('taskTitle').textContent = task.title || 'Untitled build';
    document.title = (task.title ? task.title + ' · ' : '') + 'Drip Film';
    const meta = [];
    if (task.page) meta.push(`<span class="chip">${esc(task.page)}</span>`);
    meta.push(`<span>${new Date(T0).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>`);
    $('taskMeta').innerHTML = meta.join('');
    let host = '';
    try { const u = new URL(task.url); host = `${esc(u.host)}${esc(u.pathname === '/' ? '' : u.pathname)}`; } catch { host = esc(task.url || ''); }
    $('urlText').innerHTML = (task.page ? `<b>${esc(task.page)}</b>` : '') + (host ? `<span class="mono">${host}</span>` : '');
    $('url').hidden = !host && !task.page;
    if (task.url) $('openBtn').href = task.url; else $('openBtn').hidden = true;
  }

  function setStatus(state, text) {
    const el = $('status');
    el.dataset.state = state;
    $('statusText').textContent = text;
  }

  // ---------- mode ----------
  function setMode(m, quiet) {
    mode = m;
    app.dataset.mode = m;
    document.querySelectorAll('.top .seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    if (m === 'live') { pause(); $('endcard').hidden = true; }
    if (!quiet && film) {
      if (m === 'montage' && !montageStarted) { montageStarted = true; seekTo(T0); play(true); }
      renderAll();
    }
  }

  // ---------- montage transport ----------
  function buildKnots() {
    const end = TE || latestKnown();
    const ts = [T0];
    for (const f of frames) if (f.t > ts[ts.length - 1] && f.t < end) ts.push(f.t);
    if (end > ts[ts.length - 1]) ts.push(end);
    if (ts.length === 1) ts.push(T0 + 1000);
    knots = ts;
  }
  const playT = () => (seg >= knots.length - 1 ? knots[knots.length - 1] : knots[seg] + u * (knots[seg + 1] - knots[seg]));
  function seekTo(t) {
    t = clamp(t, knots[0], knots[knots.length - 1]);
    let k = 0;
    while (k < knots.length - 2 && knots[k + 1] <= t) k++;
    seg = k;
    u = knots[k + 1] > knots[k] ? (t - knots[k]) / (knots[k + 1] - knots[k]) : 0;
    if (t >= knots[knots.length - 1]) { seg = knots.length - 1; u = 0; }
    renderAll();
  }
  const atEnd = () => seg >= knots.length - 1;
  function play(fromStart) {
    if (mode !== 'montage' || !film) return;
    if (atEnd() || fromStart === 'restart') { seg = 0; u = 0; }
    playing = true;
    app.classList.add('playing');
    $('playBtn').setAttribute('aria-label', 'Pause');
    $('endcard').hidden = true;
    lastTs = performance.now();
  }
  function pause() {
    playing = false;
    app.classList.remove('playing');
    $('playBtn').setAttribute('aria-label', 'Play');
  }
  function step(dir) {
    if (mode !== 'montage') setMode('montage');
    pause();
    const t = playT();
    const fi = lastIdx(frames, t);
    let target;
    if (dir > 0) target = frames[fi + 1]?.t ?? knots[knots.length - 1];
    else target = fi >= 0 && t - frames[fi].t > 200 ? frames[fi].t : frames[fi - 1]?.t ?? T0;
    seekTo(target);
  }

  function loop(ts) {
    if (playing) {
      const dt = Math.min(100, ts - lastTs);
      u += dt / (SEG_MS / speed);
      while (u >= 1 && !atEnd()) { u -= 1; seg++; }
      if (atEnd()) { u = 0; pause(); }
      renderAll();
    }
    lastTs = ts;
    requestAnimationFrame(loop);
  }

  // ---------- render ----------
  function currentT() { return mode === 'montage' ? playT() : liveNow(); }

  function renderAll() {
    if (!film) return;
    const t = currentT();
    renderStatus();
    renderAgents(t);
    renderFeed(t);
    renderStage(t);
    renderTimelineState(t);
    renderBars(t);
    renderSummary(t);
  }

  function renderStatus() {
    if (TE) setStatus('done', `Finished · ${dur(TE - T0)}`);
    else if (isStale()) setStatus('stale', `Quiet · last news ${ago(Date.now() - latestKnown())}`);
    else setStatus('live', `Live · ${clock(liveNow() - T0)}`);
  }

  const cardEls = new Map();
  function renderAgents(t) {
    const list = $('agents');
    const ei = lastIdx(events, t);
    let working = 0, shown = 0;
    const order = [];
    for (const a of agents) {
      let li = cardEls.get(a.id);
      if (a.s > t) { if (li) li.hidden = true; continue; }
      shown++;
      const st = statusAt(a, t);
      if (st === 'working') working++;
      // what it is on now: its last file, else its last word
      let file = null, last = null;
      for (let i = ei; i >= 0; i--) {
        const e = events[i];
        if (e.agent !== a.id) continue;
        if (!last) last = e;
        if (e.file) { file = e; break; }
        if (t - e.t > 3600e3) break;
      }
      const pc = piece(a.piece);
      const nowText = st === 'working' ? (file ? file.file : last?.summary || 'starting') : '';
      const key = [st, nowText, a.label, a.job, a.piece].join('|');
      if (!li) { li = document.createElement('li'); li.className = 'agent'; li.dataset.id = a.id; cardEls.set(a.id, li); }
      li.hidden = false;
      li.dataset.model = a.model || '';
      if (li.dataset.key !== key) {
        const prevNow = li.dataset.now;
        li.dataset.key = key;
        li.dataset.now = nowText;
        li.dataset.status = st;
        const right = st === 'working' ? '<span class="a-dot"></span>' : `<span class="a-state">${st === 'failed' ? ICON_FAIL : ICON_DONE}</span>`;
        const idx = String(agents.indexOf(a) + 1).padStart(2, '0');
        let html = `<div class="a-main"><span class="a-idx">${idx}</span><div class="a-line"><span class="a-name">${esc(a.label || a.id)}</span><span class="a-model">${esc(modelName(a.model))}</span></div></div><span class="a-right"><span class="el"></span>${right}</span>`;
        if (st === 'working') {
          html += `<div class="a-job">${esc(a.job || '')}</div>`;
          html += `<div class="a-now">${file ? ICON_PEN : ICON_DOT}<span class="${prevNow !== nowText && prevNow ? 'new' : ''}">${esc(nowText)}</span></div>`;
          if (pc) html += `<div class="a-piece">${pc.href ? `<a class="chip" href="${esc(pc.href)}" target="_blank" rel="noopener"><b>${esc(pc.name)}</b>${esc(pc.lib)}</a>` : `<span class="chip"><b>${esc(pc.name)}</b>${esc(pc.lib)}</span>`}</div>`;
          li.removeAttribute('data-tip');
        } else {
          li.dataset.tip = `<b>${esc(a.label || a.id)}</b><br>${esc(a.job || '')}${pc ? `<br><span class="mono">${esc(pc.lib)} / ${esc(pc.name)}</span>` : ''}${st === 'failed' && last ? `<br><span style="color:var(--fail)">${esc(last.summary || '')}</span>` : ''}`;
        }
        li.innerHTML = html;
      }
      li.querySelector('.el').textContent = clock((a.e && a.e <= t ? a.e : t) - a.s);
      order.push(li);
    }
    // keep DOM order = agent order, without churning nodes that are already in place
    order.forEach((li, i) => { if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null); });
    $('agentsSub').textContent = shown ? `${working} working · ${shown}` : '';
    $('tabAgentsCount').textContent = shown || '';
  }

  let feedKey = '';
  function renderFeed(t) {
    const ei = lastIdx(events, t);
    const key = mode + ':' + ei + ':' + events.length;
    if (key === feedKey) return;
    const prevEi = Number(feedKey.split(':')[1] ?? -1);
    feedKey = key;
    const list = $('feed');
    if (ei < 0) { list.innerHTML = '<li class="feed-empty">Nothing yet.</li>'; $('feedSub').textContent = ''; return; }
    const from = Math.max(0, ei - 80);
    let html = '';
    for (let i = ei; i >= from; i--) {
      const e = events[i], a = agentById.get(e.agent);
      const fresh = mode === 'live' && i > prevEi && prevEi >= 0 ? ' fresh' : '';
      const cur = mode === 'montage' && i === ei ? ' current' : '';
      const fail = /fail|error/i.test(e.summary || '') ? ' data-fail' : '';
      html += `<li class="ev${fresh}${cur}" data-model="${esc(a?.model || '')}" data-kind="${esc(e.kind)}" data-t="${e.t}"${fail}>
        <span class="time">${clock(e.t - T0)}</span>
        <div class="ev-who"><i></i><b>${esc(a?.label || e.agent)}</b><span class="ev-kind">${esc(e.tool || e.kind)}</span></div>
        <div class="ev-sum">${esc(e.summary || e.kind)}</div>
        ${e.file ? `<div class="ev-file">${esc(e.file)}</div>` : ''}
      </li>`;
    }
    list.innerHTML = html;
    if (mode === 'montage') list.scrollTop = 0;
    $('feedSub').textContent = `${ei + 1} events`;
    $('tabFeedCount').textContent = ei + 1;
  }

  let shownFrame = -2, front = 'imgA';
  function renderStage(t) {
    // the nearest frame at or before the playhead; in the montage, before the first one, the first one
    let fi = lastIdx(frames, t);
    if (fi < 0 && mode === 'montage' && frames.length) fi = 0;
    const total = mode === 'live' ? lastIdx(frames, t) + 1 : frames.length;
    $('frameNo').innerHTML = fi >= 0 ? `Frame <b>${String(fi + 1).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')}` : '';
    if (fi !== shownFrame) {
      shownFrame = fi;
      if (fi < 0) {
        $('imgA').classList.remove('on'); $('imgB').classList.remove('on');
        $('caption').hidden = true;
        $('frameDims').textContent = '';
        $('empty').hidden = false;
        $('emptyText').textContent = frames.length ? 'The page appears with the first frame' : 'Waiting for the first frame';
      } else {
        $('empty').hidden = true;
        const f = frames[fi];
        const back = front === 'imgA' ? 'imgB' : 'imgA';
        const img = $(back);
        const show = () => { $(back).classList.add('on'); $(front).classList.remove('on'); front = back; };
        img.alt = f.caption || 'Frame ' + (fi + 1);
        if (img.getAttribute('src') === f.src && img.complete) show();
        else { img.onload = show; img.onerror = show; img.src = f.src; }
        if (frames[fi + 1]) { const n = new Image(); n.src = frames[fi + 1].src; }
        const faces = (f.agents || []).map((id) => agentById.get(id)).filter(Boolean)
          .map((a) => `<span class="tag" data-model="${esc(a.model || '')}"><i></i>${esc(a.label || a.id)}</span>`).join('');
        $('frameDims').textContent = f.width && f.height ? `${f.width} × ${f.height}` : '';
        $('capFaces').innerHTML = faces;
        $('capText').textContent = f.caption || '';
        $('capTime').textContent = clock(f.t - T0);
        $('caption').hidden = !f.caption && !faces;
        // restart the caption entrance
        const c = $('caption'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
      }
    }
    // end card
    const showEnd = mode === 'montage' && TE && atEnd() && !playing;
    if (showEnd && $('endcard').hidden) renderEndCard();
    $('endcard').hidden = !showEnd;
    app.classList.toggle('ended', showEnd);
    // transport
    const end = knots[knots.length - 1];
    $('clock').innerHTML = `${clock(t - T0)} <span>/ ${clock(end - T0)}</span>`;
    $('scrubFill').style.width = ((t - T0) / Math.max(1, end - T0)) * 100 + '%';
    // live bar
    if (mode === 'live') renderLiveBar(t);
  }

  function workingByModel(t) {
    const c = {};
    for (const a of agents) if (a.s <= t && statusAt(a, t) === 'working') c[a.model] = (c[a.model] || 0) + 1;
    return c;
  }
  function filesUpTo(t) {
    const s = new Set();
    for (const e of events) { if (e.t > t) break; if (e.file && (e.kind === 'write' || e.kind === 'stitch')) s.add(e.file); }
    return s;
  }
  function modelDots(c, suffix = '') {
    const parts = Object.entries(c).filter(([, n]) => n);
    if (!parts.length) return 'none';
    return parts.map(([m, n]) => `<span class="m"><i style="background:var(--${esc(m)}, var(--ink-3))"></i>${n} ${esc(modelName(m))}${suffix}</span>`).join('');
  }
  function renderLiveBar(t) {
    $('lbElapsed').textContent = clock((TE || t) - T0);
    $('lbWorking').innerHTML = modelDots(workingByModel(t));
    $('lbFiles').textContent = filesUpTo(t).size;
    $('lbFrames').textContent = lastIdx(frames, t) + 1;
    const ei = lastIdx(events, t);
    const e = events[ei];
    const a = e && agentById.get(e.agent);
    $('lbNote').textContent = e ? `${a?.label || e.agent}: ${e.summary || e.kind} · ${FROZEN != null || TE ? clock(e.t - T0) : ago(Date.now() - e.t)}` : '';
  }

  function pieceList() {
    const seen = new Map();
    for (const a of agents) { const p = piece(a.piece); if (p && !seen.has(p.name)) seen.set(p.name, p); }
    return [...seen.values()];
  }
  function countByModel(list) {
    const c = {};
    for (const a of list) c[a.model] = (c[a.model] || 0) + 1;
    return c;
  }
  function renderEndCard() {
    $('endTime').textContent = dur(TE - T0);
    const files = filesUpTo(TE).size;
    const failed = agents.filter((a) => a.status === 'failed').length;
    $('endSub').textContent = `${film.task?.page ? film.task.page + ': ' : ''}${agents.length} agent${agents.length === 1 ? '' : 's'}, ${files} file${files === 1 ? '' : 's'} written, ${frames.length} frames${failed ? `, ${failed} failed` : ''}`;
    $('endModels').innerHTML = Object.entries(countByModel(agents)).map(([m, n]) => `<span class="chip"><i style="width:7px;height:7px;border-radius:2px;background:var(--${esc(m)}, var(--ink-3))"></i><b>${n}</b>${esc(modelName(m))}</span>`).join('');
  }

  let summaryKey = '';
  function renderSummary(t) {
    // the strip sums up the whole run (so far, while live), not the playhead
    const files = filesUpTo(TE ? Infinity : liveNow()).size;
    const pcs = pieceList();
    const key = [TE, files, agents.length, frames.length, pcs.length, TE ? '' : Math.floor((liveNow() - T0) / 1000)].join('|');
    if (key === summaryKey) return;
    summaryKey = key;
    const total = TE ? `<span class="sum">Total <b>${dur(TE - T0)}</b></span>` : `<span class="sum">Elapsed <b>${clock(liveNow() - T0)}</b></span>`;
    $('summary').innerHTML = `${total}<span class="sum-sep"></span>
      <span class="sum">${modelDots(countByModel(agents))}</span><span class="sum-sep"></span>
      <span class="sum"><b>${files}</b> files</span>
      <span class="sum"><b>${frames.length}</b> frames</span>
      ${pcs.length ? `<span class="sum-sep"></span><span class="sum pieces">${pcs.slice(0, 6).map((p) => `<span class="chip" data-tip="${esc(p.lib)} / ${esc(p.name)}"><b>${esc(p.name)}</b></span>`).join('')}${pcs.length > 6 ? `<span class="chip">+${pcs.length - 6}</span>` : ''}</span>` : ''}`;
  }

  // ---------- timeline ----------
  let D0 = 0, D1 = 1;
  const pct = (t) => ((t - D0) / Math.max(1, D1 - D0)) * 100;

  function buildTimeline() {
    D0 = T0; D1 = domainEnd();
    const lanes = $('lanes');
    lanes.innerHTML = agents.map((a) => {
      const ticks = events.filter((e) => e.agent === a.id && (e.kind === 'write' || e.kind === 'stitch' || e.kind === 'shot'));
      return `<div class="lane" data-model="${esc(a.model || '')}" data-id="${esc(a.id)}">
        <div class="lane-label"><i></i><span>${esc(a.label || a.id)}</span><em class="lane-dur"></em></div>
        <div class="lane-track"><div class="bar" data-id="${esc(a.id)}"><div class="fill"></div><div class="ticks">${ticks.map((e) => `<i data-t="${e.t}"></i>`).join('')}</div>${a.status === 'failed' ? '<span class="x"></span>' : ''}</div></div>
      </div>`;
    }).join('');
    buildRuler();
    renderBars(currentT());
  }

  function buildRuler() {
    const span = D1 - D0;
    const steps = [5e3, 10e3, 15e3, 30e3, 60e3, 120e3, 300e3, 600e3, 900e3, 1800e3, 3600e3, 7200e3];
    const w = $('ruler').clientWidth || 800;
    const maxTicks = Math.max(3, Math.floor(w / 70));
    const stepMs = steps.find((s) => span / s <= maxTicks) || steps[steps.length - 1];
    let html = '';
    for (let x = 0; x <= span && (x === 0 || (x / span) * w < w - 44); x += stepMs) html += `<div class="tick" style="left:${(x / span) * 100}%"><span>${clock(x)}</span></div>`;
    const fi = 0;
    html += frames.map((f, i) => `<span class="fmark" data-i="${i}" data-t="${f.t}" style="left:${pct(f.t)}%"></span>`).join('');
    $('ruler').innerHTML = html;
    void fi;
  }

  function renderBars(t) {
    if (!film) return;
    const nextD1 = domainEnd();
    if (Math.abs(nextD1 - D1) > 500) { D1 = nextD1; buildRuler(); }
    const live = liveNow();
    document.querySelectorAll('#lanes .bar').forEach((bar) => {
      const a = agentById.get(bar.dataset.id);
      if (!a) return;
      const ref = mode === 'montage' ? t : live;
      const end = mode === 'live' ? Math.min(a.e ?? live, live) : a.e ?? live;
      bar.style.display = mode === 'live' && a.s > live ? 'none' : '';
      bar.style.left = pct(a.s) + '%';
      bar.style.width = Math.max(0, pct(end) - pct(a.s)) + '%';
      bar.dataset.status = a.e && a.e <= ref ? (a.status === 'failed' ? 'failed' : 'done') : 'working';
      const span = Math.max(1, end - a.s);
      const filled = mode === 'montage' ? clamp((t - a.s) / span, 0, 1) : 1;
      bar.firstElementChild.style.width = filled * 100 + '%';
      bar.querySelectorAll('.ticks i').forEach((i) => { i.style.left = ((Number(i.dataset.t) - a.s) / span) * 100 + '%'; });
      const lane = bar.closest('.lane');
      lane.querySelector('.lane-dur').textContent = a.s <= (mode === 'montage' ? t : live) ? dur(Math.min(end, mode === 'montage' ? Math.max(t, a.s) : end) - a.s) : '';
    });
  }

  function renderTimelineState(t) {
    const w = $('ruler').clientWidth;
    const x = (pct(t) / 100) * w;
    $('playhead').style.setProperty('--x', x + 'px');
    const bub = $('phBubble');
    bub.textContent = clock(t - T0);
    // keep the bubble inside the track at both ends
    bub.style.transform = x > w - 64 ? 'translateX(calc(-100% - 24px))' : '';
    document.querySelectorAll('#ruler .fmark').forEach((m) => {
      const ft = Number(m.dataset.t);
      m.classList.toggle('seen', ft <= t);
      m.classList.toggle('now', Number(m.dataset.i) === lastIdx(frames, t));
    });
  }

  // ---------- timeline input ----------
  function timeAtX(clientX) {
    const r = $('ruler').getBoundingClientRect();
    return D0 + clamp((clientX - r.left) / r.width, 0, 1) * (D1 - D0);
  }
  let drag = null;
  $('tlBody').addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.clientX < $('ruler').getBoundingClientRect().left) return;
    drag = { x: e.clientX, moved: false, bar: e.target.closest('.bar'), mark: e.target.closest('.fmark') };
    $('tlBody').setPointerCapture(e.pointerId);
  });
  $('tlBody').addEventListener('pointermove', (e) => {
    const hov = $('tlHover');
    const r = $('ruler').getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right) {
      hov.hidden = false;
      hov.style.left = e.clientX - $('tlBody').getBoundingClientRect().left + 'px';
    } else hov.hidden = true;
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) > 3) drag.moved = true;
    if (drag.moved) { if (mode !== 'montage') setMode('montage'); pause(); seekTo(timeAtX(e.clientX)); }
  });
  $('tlBody').addEventListener('pointerleave', () => { $('tlHover').hidden = true; });
  $('tlBody').addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) return;
    if (mode !== 'montage') setMode('montage');
    pause();
    if (d.mark) seekTo(Number(d.mark.dataset.t));
    else if (d.bar) { const a = agentById.get(d.bar.dataset.id); seekTo(a.s); focusAgent(a.id); }
    else seekTo(timeAtX(e.clientX));
  });
  function focusAgent(id) {
    const li = cardEls.get(id);
    if (!li) return;
    if (app.dataset.tab !== 'agents') setTab('agents');
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    li.classList.add('focus');
    setTimeout(() => li.classList.remove('focus'), 1400);
  }

  // ---------- tooltips ----------
  const tip = $('tip');
  document.addEventListener('pointerover', (e) => {
    const bar = e.target.closest('.bar');
    const mark = e.target.closest('.fmark');
    const el = e.target.closest('[data-tip]');
    let html = null;
    if (bar) {
      const a = agentById.get(bar.dataset.id);
      const pc = piece(a.piece);
      html = `<b>${esc(a.label || a.id)}</b> · ${esc(modelName(a.model))}<br>${esc(a.job || '')}<br><span class="mono">${clock(a.s - T0)} → ${a.e ? clock(a.e - T0) : 'now'} · ${dur((a.e ?? liveNow()) - a.s)}${pc ? ' · ' + esc(pc.name) : ''}</span>`;
    } else if (mark) {
      const f = frames[Number(mark.dataset.i)];
      html = `<b>Frame ${Number(mark.dataset.i) + 1}</b> · <span class="mono">${clock(f.t - T0)}</span><br>${esc(f.caption || '')}`;
    } else if (el) html = el.dataset.tip;
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const r = (bar || mark || el).getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let x = (bar ? clamp(e.clientX, r.left, r.right) : r.left + r.width / 2) - tr.width / 2;
    let y = r.top - tr.height - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = clamp(x, 8, innerWidth - tr.width - 8) + 'px';
    tip.style.top = y + 'px';
  });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest?.('.bar,.fmark,[data-tip]')) tip.hidden = true; });

  // ---------- controls ----------
  document.querySelectorAll('.top .seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('playBtn').addEventListener('click', () => (playing ? pause() : play()));
  $('prevBtn').addEventListener('click', () => step(-1));
  $('nextBtn').addEventListener('click', () => step(1));
  $('replayBtn').addEventListener('click', () => play('restart'));
  $('speed').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    speed = Number(b.dataset.speed);
    app.dataset.speed = speed;
    $('speed').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  });
  $('feed').addEventListener('click', (e) => {
    const li = e.target.closest('.ev'); if (!li) return;
    if (mode !== 'montage') setMode('montage');
    pause();
    seekTo(Number(li.dataset.t));
  });
  function setTab(tab) {
    app.dataset.tab = tab;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  }
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  function toggleTheme() {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('drip-film-theme', t); } catch {}
  }
  $('themeBtn').addEventListener('click', toggleTheme);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); if (mode !== 'montage') setMode('montage'); else playing ? pause() : play(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'l' || e.key === 'L') setMode('live');
    else if (e.key === 'm' || e.key === 'M') setMode('montage');
    else if (e.key === 't' || e.key === 'T') toggleTheme();
  });
  $('toastBtn').addEventListener('click', () => { $('toast').hidden = true; montageStarted = false; setMode('montage'); });

  function announceEnd() {
    if (toastShown) return;
    toastShown = true;
    $('toastText').textContent = `The build finished in ${dur(TE - T0)}.`;
    $('toast').hidden = false;
    setTimeout(() => { $('toast').hidden = true; }, 15000);
  }

  let resizeT;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (film) { buildRuler(); renderAll(); } }, 120); });

  // ---------- go ----------
  load().then(() => {
    requestAnimationFrame((ts) => { lastTs = ts; loop(ts); });
    setInterval(() => { if (film && !TE && FROZEN == null) load(); }, POLL_MS);
    setInterval(() => { if (film && mode === 'live' && !TE) renderAll(); }, 500);
  });
})();

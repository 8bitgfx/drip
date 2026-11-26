/*
 * DripVisuals: premium, seekable visuals for Drip Motion films.
 * Plain browser JS, no imports, no build. Attaches window.DripVisuals.
 *
 * THE CONTRACT
 *   const v = DripVisuals.<name>(container, opts);   // builds DOM / canvas ONCE
 *   v.el                                             // the root element (move it, order it, z-index it)
 *   v.at(t)                                          // sets the WHOLE state for time t (seconds) from scratch.
 *                                                    // Pure: seek the same t twice, get the same frame. Never accumulates.
 *   DripVisuals.drive(tl, [v1, v2, ...])             // one line: calls v.at(tl.time()) on every timeline update
 *
 * Rules kept: no timers, no Math.random (seeded opts.seed only), no Date.now, no CSS animation or transition,
 * no network. Colours come from the CSS variables --accent --ground --ink --glow (read at creation; override with
 * opts.accent / opts.ground / opts.ink / opts.glow). Positions are stage pixels inside `container`.
 *
 * Common opts: z (z-index), show / hide / fade (visibility window in seconds), seed.
 * Order in drive(): list order is run order. Put a visual's target before things that follow it (plane3d before glow).
 * Do not tween a plane3d / cameraDrift target from the film timeline (they own its transform); tween v.el instead.
 */
(function () {
  "use strict";

  // ---------- maths ----------
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const inOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const outCubic = (p) => 1 - Math.pow(1 - clamp(p), 3);
  const outExpo = (p) => { p = clamp(p); return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); };
  const TAU = Math.PI * 2;
  function rng(a) {
    a = (a == null ? 1 : a) | 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const EASES = { inOut, outCubic, outExpo, linear: clamp, sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p)) };
  const ez = (e) => (typeof e === "function" ? e : EASES[e] || inOut);

  // ---------- colour ----------
  const _cx = document.createElement("canvas").getContext("2d");
  function color(s, fb, depth) {
    s = (s || "").trim();
    if (!s) return fb || null;
    let m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = /^rgba?\(([^)]+)\)/i.exec(s);
    if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2]]; }
    if (depth) return fb || null;
    _cx.fillStyle = "#000"; _cx.fillStyle = s;
    return color(_cx.fillStyle, fb, 1);
  }
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.round((a == null ? 1 : a) * 1000) / 1000})`;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  function pal(el, o) {
    const cs = getComputedStyle(el), v = (n) => cs.getPropertyValue(n);
    const accent = color(o.accent || v("--accent"), [255, 91, 58]);
    const ground = color(o.ground || v("--ground"), [13, 13, 15]);
    const ink = color(o.ink || v("--ink"), [243, 241, 236]);
    const glow = color(o.glow || v("--glow"), null) || mix(accent, [255, 214, 170], 0.42);
    return { accent, ground, ink, glow };
  }
  function fontFamily(el, o) {
    if (o.font) return o.font;
    const v = getComputedStyle(el).getPropertyValue("--font-display").trim();
    return v || "Inter, system-ui, sans-serif";
  }

  // ---------- dom ----------
  const $ = (x, root) => (typeof x === "string" ? (root || document).querySelector(x) : x);
  function mk(parent, css, tag) {
    const e = document.createElement(tag || "div");
    e.style.cssText = "position:absolute;pointer-events:none;" + (css || "");
    if (parent) parent.appendChild(e);
    return e;
  }
  const NS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let _uid = 0;
  const uid = (p) => `dv-${p}-${++_uid}`;
  const size = (c, o) => ({ W: o.w || c.offsetWidth || 1920, H: o.h || c.offsetHeight || 1080 });
  const win = (t, o) => {
    const f = o.fade == null ? 0.5 : o.fade;
    let a = 1;
    if (o.show != null) a *= sstep((t - o.show) / f);
    if (o.hide != null) a *= 1 - sstep((t - o.hide) / f);
    return a;
  };
  // Position of an element inside `parent`, in the parent's own pixels (scale-safe).
  function relRect(e, parent) {
    const c = parent.getBoundingClientRect(), r = e.getBoundingClientRect();
    const k = c.width / (parent.offsetWidth || c.width) || 1;
    return { x: (r.left - c.left) / k, y: (r.top - c.top) / k, w: r.width / k, h: r.height / k };
  }
  function sprite(rgb, px) {
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const g = c.getContext("2d"), r = px / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba([255, 255, 255], 1));
    gr.addColorStop(0.12, rgba(mix(rgb, [255, 255, 255], 0.55), 0.95));
    gr.addColorStop(0.3, rgba(rgb, 0.5));
    gr.addColorStop(0.6, rgba(rgb, 0.1));
    gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, px, px);
    return c;
  }

  // =====================================================================================
  // 1. lightField: slow mesh-gradient light behind everything. Never dead.
  //    opts: { blobs:4, intensity:1, speed:1, colors:[rgb..], vignette:.6, z, seed, show, hide }
  // =====================================================================================
  function lightField(container, o = {}) {
    const P = pal(container, o), R = rng(o.seed == null ? 11 : o.seed), { W, H } = size(container, o);
    const n = o.blobs || 4, I = o.intensity == null ? 1 : o.intensity, sp = o.speed == null ? 1 : o.speed;
    const cols = o.colors || [P.accent, P.glow, mix(P.accent, P.ink, 0.28), mix(P.accent, P.ground, 0.4)];
    const alphas = [0.28, 0.17, 0.13, 0.2];
    const el = mk(container, `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;isolation:isolate;z-index:${o.z == null ? 0 : o.z}`);
    const blobs = [];
    for (let i = 0; i < n; i++) {
      const c = cols[i % cols.length], sz = (0.5 + R() * 0.45) * Math.max(W, H) * 1.05;
      const e = mk(el, `left:0;top:0;width:${sz}px;height:${sz}px;border-radius:50%;mix-blend-mode:screen;will-change:transform,opacity;` +
        `background:radial-gradient(circle at 50% 50%,${rgba(c, 1)} 0%,${rgba(c, 0.62)} 24%,${rgba(c, 0.22)} 52%,${rgba(c, 0)} 72%)`);
      blobs.push({
        e, sz, c, a: (alphas[i % 4]) * I,
        cx: 0.2 + R() * 0.6, cy: 0.2 + R() * 0.6, ax: 0.14 + R() * 0.16, ay: 0.12 + R() * 0.14,
        fx: (0.1 + R() * 0.12) * sp, fy: (0.08 + R() * 0.12) * sp, px: R() * TAU, py: R() * TAU, pb: R() * TAU,
      });
    }
    // a faint diagonal beam that drifts: more life, still quiet
    const beam = mk(el, `left:${-W * 0.25}px;top:${-H * 0.5}px;width:${W * 0.5}px;height:${H * 2}px;mix-blend-mode:screen;will-change:transform;` +
      `background:linear-gradient(90deg,${rgba(P.ink, 0)},${rgba(P.ink, 0.045 * I)} 50%,${rgba(P.ink, 0)})`);
    const vig = mk(el, `inset:0;background:radial-gradient(ellipse at 50% 46%,${rgba(P.ground, 0)} 38%,${rgba(P.ground, o.vignette == null ? 0.78 : o.vignette)} 100%)`);
    function at(t) {
      const vis = win(t, o);
      el.style.opacity = vis;
      for (const b of blobs) {
        const x = (b.cx + b.ax * Math.sin(TAU * b.fx * t + b.px)) * W;
        const y = (b.cy + b.ay * Math.sin(TAU * b.fy * t + b.py)) * H;
        const s = 1 + 0.07 * Math.sin(TAU * 0.07 * sp * t + b.pb);
        b.e.style.transform = `translate3d(${(x - b.sz / 2).toFixed(1)}px,${(y - b.sz / 2).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
        b.e.style.opacity = (b.a * (0.82 + 0.18 * Math.sin(TAU * 0.11 * sp * t + b.pb * 1.7))).toFixed(4);
      }
      beam.style.transform = `translate3d(${((((t * 38 * sp) % (W * 1.6)) + W * 1.6) % (W * 1.6) - W * 0.1).toFixed(1)}px,0,0) rotate(18deg)`;
    }
    return { el, at };
  }

  // =====================================================================================
  // 2. glow: a large soft bloom behind a target element (follows it).
  //    opts: { target, color, size (px) | scale (x target's larger side, 1.7), intensity .9, pulse:{period:2.4, amount:.18}, show, hide }
  // =====================================================================================
  function glow(container, o = {}) {
    const P = pal(container, o), tgt = $(o.target);
    const col = o.color ? color(o.color, P.accent) : P.accent;
    const el = mk(null, `left:0;top:0;mix-blend-mode:screen;z-index:${o.z == null ? 0 : o.z};will-change:transform,opacity`);
    if (tgt && tgt.parentNode && o.behind !== false) tgt.parentNode.insertBefore(el, tgt); else container.appendChild(el);
    const halo = mk(el, "left:0;top:0;right:0;bottom:0;border-radius:50%;" +
      `background:radial-gradient(circle,${rgba(col, 0.55)} 0%,${rgba(col, 0.28)} 26%,${rgba(col, 0.1)} 50%,${rgba(col, 0)} 72%)`);
    const core = mk(el, "left:25%;top:25%;right:25%;bottom:25%;border-radius:50%;" +
      `background:radial-gradient(circle,${rgba(mix(col, P.glow, 0.5), 0.55)} 0%,${rgba(col, 0.18)} 50%,${rgba(col, 0)} 72%)`);
    const pulse = o.pulse === true ? {} : o.pulse;
    const I = o.intensity == null ? 0.9 : o.intensity;
    function at(t) {
      let cx, cy, w = o.size, h = o.size;
      if (tgt) {
        const par = el.parentNode, r = relRect(tgt, par);
        cx = r.x + r.w / 2; cy = r.y + r.h / 2;
        const side = Math.max(r.w, r.h) * (o.scale || 1.7);
        w = o.size || side * 1.25; h = o.size ? o.size : side * (r.h / Math.max(r.w, 1) > 0.6 ? 1.25 : 1.1);
      } else { cx = o.x == null ? 960 : o.x; cy = o.y == null ? 540 : o.y; w = h = o.size || 900; }
      let k = 1, a = I;
      if (pulse) {
        const per = pulse.period || 2.4, amt = pulse.amount == null ? 0.18 : pulse.amount;
        const s = 0.5 - 0.5 * Math.cos(TAU * (t / per));
        k = 1 + amt * 0.5 * s; a = I * (1 - amt * 0.6 + amt * 0.6 * s * 1.6);
      }
      el.style.width = w + "px"; el.style.height = h + "px";
      el.style.transform = `translate3d(${(cx - w / 2).toFixed(1)}px,${(cy - h / 2).toFixed(1)}px,0) scale(${k.toFixed(4)})`;
      el.style.opacity = clamp(a * win(t, o), 0, 1).toFixed(4);
      core.style.opacity = (0.7 + 0.3 * Math.sin(TAU * 0.13 * t)).toFixed(3);
    }
    return { el, at };
  }

  // =====================================================================================
  // 3. grain: animated film grain overlay, seeded, changes per frame (shot on twos: 24 fps cadence).
  //    opts: { opacity:.07, fps:24, tile:256, frames:8, blend:"overlay", z:50, seed }
  // =====================================================================================
  function grain(container, o = {}) {
    const { W, H } = size(container, o), R = rng(o.seed == null ? 5 : o.seed), T = o.tile || 256, F = o.frames || 8;
    const el = mk(container, `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;z-index:${o.z == null ? 50 : o.z};mix-blend-mode:${o.blend || "overlay"}`);
    const layers = [];
    for (let f = 0; f < F; f++) {
      const c = document.createElement("canvas"); c.width = c.height = T;
      const g = c.getContext("2d"), im = g.createImageData(T, T), d = im.data;
      for (let i = 0; i < T * T; i++) {
        const v = (R() + R() + R()) / 3, k = i * 4, s = v > 0.5 ? 255 : 0;
        d[k] = d[k + 1] = d[k + 2] = s; d[k + 3] = Math.abs(v - 0.5) * 2 * 255;
      }
      g.putImageData(im, 0, 0);
      const e = mk(el, `left:-${T}px;top:-${T}px;width:${W + T * 2}px;height:${H + T * 2}px;background:url(${c.toDataURL("image/png")});background-size:${T}px ${T}px;opacity:0;will-change:transform,opacity`);
      layers.push({ e, ox: Math.floor(R() * T), oy: Math.floor(R() * T) });
    }
    let cur = -1;
    function at(t) {
      const fr = Math.floor(Math.max(0, t) * (o.fps || 24) + 1e-6);
      const i = ((fr * 5) % F + F) % F; // 5 is coprime to F=8: a long non-repeating-feeling cycle
      el.style.opacity = ((o.opacity == null ? 0.07 : o.opacity) * win(t, o)).toFixed(4) * 1 || 0;
      if (i === cur) return;
      if (cur >= 0) layers[cur].e.style.opacity = 0;
      const L = layers[i];
      L.e.style.opacity = 1;
      L.e.style.transform = `translate3d(${(L.ox + (fr * 37) % T) % T}px,${(L.oy + (fr * 53) % T) % T}px,0)`;
      cur = i;
    }
    // el opacity must be a pure function of t; the active tile changes with frame. Both are, so reset cur on each call:
    return { el, at: (t) => { cur = -2; layers.forEach((L) => (L.e.style.opacity = 0)); at(t); } };
  }

  // =====================================================================================
  // 4. plane3d: wraps a DOM element in a tilted 3D plane (perspective, rotate keyframes, drop shadow, glass edge, sheen).
  //    opts: { target, from:{rx,ry,rz,x,y,z,s}, to:{...}, start, dur, ease, keys:[{t,rx,ry,rz,x,y,z,s}],
  //            perspective:1800, radius, float:true, enter:{start,dur:.9,y:60,blur:12}, shadow:true, edge:true, sheen:true, show, hide }
  //    v.el is the wrapper (tween it for position moves); v.plane the rotating inner plane.
  // =====================================================================================
  function plane3d(container, o = {}) {
    const tgt = $(o.target);
    const par = tgt.parentNode, cs = getComputedStyle(tgt);
    const w = tgt.offsetWidth, h = tgt.offsetHeight, rad = o.radius != null ? o.radius + "px" : (cs.borderRadius && cs.borderRadius !== "0px" ? cs.borderRadius : "22px");
    const wrap = mk(null, `left:${tgt.offsetLeft}px;top:${tgt.offsetTop}px;width:${w}px;height:${h}px;perspective:${o.perspective || 1800}px;z-index:${cs.zIndex === "auto" ? 0 : cs.zIndex}`);
    par.insertBefore(wrap, tgt);
    const shadow = o.shadow === false ? null : mk(wrap, `left:0;top:0;width:${w}px;height:${h}px;border-radius:${rad};box-shadow:0 70px 120px -30px rgba(0,0,0,.65),0 30px 60px -20px rgba(0,0,0,.5);will-change:transform,opacity`);
    const plane = mk(wrap, `left:0;top:0;width:${w}px;height:${h}px;transform-style:preserve-3d;will-change:transform`);
    plane.appendChild(tgt);
    tgt.style.left = "0px"; tgt.style.top = "0px"; tgt.style.pointerEvents = "none";
    if (cs.position === "static") tgt.style.position = "absolute";
    const edge = o.edge === false ? null : mk(plane, `left:0;top:0;width:${w}px;height:${h}px;border-radius:${rad};box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(255,255,255,.04)`);
    const sheen = o.sheen === false ? null : mk(plane, `left:0;top:0;width:${w}px;height:${h}px;border-radius:${rad};` +
      "background:linear-gradient(112deg,rgba(255,255,255,0) 28%,rgba(255,255,255,.085) 44%,rgba(255,255,255,.02) 56%,rgba(255,255,255,0) 70%),radial-gradient(120% 90% at 12% 0%,rgba(255,255,255,.09),rgba(255,255,255,0) 55%);" +
      "background-size:260% 100%,100% 100%;mix-blend-mode:screen");
    const F = { rx: 0, ry: 0, rz: 0, x: 0, y: 0, z: 0, s: 1 };
    const s0 = o.start || 0, d0 = o.dur || 3;
    const keys = (o.keys || [Object.assign({ t: s0 }, { rx: 14, ry: -18, rz: 1.2 }, o.from), Object.assign({ t: s0 + d0 }, { rx: 9, ry: -11, rz: 0.4 }, o.to)])
      .map((k) => Object.assign({}, F, k));
    const easeFn = ez(o.ease);
    const en = o.enter ? Object.assign({ start: s0, dur: 0.9, y: 60, blur: 12 }, o.enter) : null;
    const flt = o.float !== false;
    function pose(t) {
      if (t <= keys[0].t) return keys[0];
      if (t >= keys[keys.length - 1].t) return keys[keys.length - 1];
      let i = 0; while (t > keys[i + 1].t) i++;
      const a = keys[i], b = keys[i + 1], p = easeFn((t - a.t) / (b.t - a.t || 1)), r = {};
      for (const k in F) r[k] = lerp(a[k], b[k], p);
      return r;
    }
    function at(t) {
      const q = pose(t);
      let rx = q.rx, ry = q.ry, rz = q.rz, y = q.y, ep = 1;
      if (flt) { rx += Math.sin(t * 0.8 + 1) * 0.55; ry += Math.sin(t * 0.63) * 0.6; y += Math.sin(t * 0.9) * 5; }
      if (en) { ep = outExpo((t - en.start) / en.dur); y += (1 - ep) * en.y; }
      plane.style.transform = `translate3d(${q.x.toFixed(1)}px,${y.toFixed(1)}px,${q.z.toFixed(1)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${q.s.toFixed(4)})`;
      plane.style.filter = en && ep < 0.999 ? `blur(${((1 - ep) * en.blur).toFixed(2)}px)` : "none";
      const vis = win(t, o) * (en ? clamp(ep * 2.2) : 1);
      wrap.style.opacity = vis.toFixed(4);
      if (shadow) shadow.style.transform = `translate3d(${(-ry * 2.6 + q.x).toFixed(1)}px,${(y + rx * 2).toFixed(1)}px,0) scale(${(0.92 * q.s).toFixed(4)})`;
      if (sheen) sheen.style.backgroundPosition = `${(50 - ry * 3.2 + Math.sin(t * 0.5) * 8).toFixed(1)}% 0,0 0`;
    }
    return { el: wrap, plane, at };
  }

  // =====================================================================================
  // 5. cameraDrift: gentle perspective drift (2-4 degrees over 3-5 s) + subtle scale on a root group.
  //    opts: { target (default: wraps container's current children), rx:2.2, ry:3, rz:.35 (amplitudes, deg), period:9, scale:1.03, perspective:1800, origin }
  //    The target must not also be tweened by the film timeline.
  // =====================================================================================
  function cameraDrift(container, o = {}) {
    let tgt = $(o.target);
    if (!tgt) {
      tgt = mk(null, "left:0;top:0;right:0;bottom:0;pointer-events:auto");
      while (container.firstChild) tgt.appendChild(container.firstChild);
      container.appendChild(tgt);
    }
    const ax = o.rx == null ? 2.2 : o.rx, ay = o.ry == null ? 3 : o.ry, az = o.rz == null ? 0.35 : o.rz;
    const per = o.period || 9, s0 = o.scale == null ? 1.03 : o.scale, P = o.perspective || 1800;
    tgt.style.transformOrigin = o.origin || "50% 50%";
    tgt.style.willChange = "transform";
    function at(t) {
      const w = TAU / per;
      const rx = ax * Math.sin(w * t + 0.6) + 0.15 * Math.sin(t * 2.1);
      const ry = ay * Math.sin(w * 0.78 * t) + 0.12 * Math.sin(t * 1.7 + 1);
      const rz = az * Math.sin(w * 0.55 * t + 2);
      const s = s0 + 0.012 * Math.sin(w * 0.9 * t + 1.3) + (o.zoom || 0) * clamp(t / (o.zoomDur || 12));
      tgt.style.transform = `perspective(${P}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    }
    return { el: tgt, at };
  }

  // =====================================================================================
  // 6. lightSweep: diagonal specular sweep across a target, masked to its shape.
  //    opts: { target, start | times:[..], dur:1.1, angle:18, width:.34, intensity:.55, show, hide }
  // =====================================================================================
  function lightSweep(container, o = {}) {
    const tgt = $(o.target), cs = getComputedStyle(tgt);
    if (cs.position === "static") tgt.style.position = "relative";
    const rad = cs.borderRadius || "0px";
    const el = mk(tgt, `left:0;top:0;right:0;bottom:0;overflow:hidden;border-radius:${rad};z-index:5;mix-blend-mode:screen`);
    const times = o.times || [o.start == null ? 0 : o.start];
    const wd = o.width || 0.34, I = o.intensity == null ? 0.55 : o.intensity, d = o.dur || 1.1;
    const strips = times.map(() => mk(el, "left:0;top:-60%;height:220%;will-change:transform,opacity;" +
      `background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,${0.1 * I}) 32%,rgba(255,255,255,${0.55 * I}) 49%,rgba(255,255,255,${0.9 * I}) 50%,rgba(255,255,255,${0.5 * I}) 52%,rgba(255,255,255,${0.1 * I}) 68%,rgba(255,255,255,0) 100%)`));
    function at(t) {
      const w = el.offsetWidth || 600, sw = w * wd * 1.4;
      times.forEach((ts, i) => {
        const p = (t - ts) / d, e = strips[i];
        if (p <= 0 || p >= 1) { e.style.opacity = 0; return; }
        const x = lerp(-sw * 1.2, w + sw * 0.4, inOut(p));
        e.style.width = sw + "px";
        e.style.opacity = (Math.sin(Math.PI * p) ** 0.5 * win(t, o)).toFixed(3);
        e.style.transform = `translate3d(${x.toFixed(1)}px,0,0) rotate(${(o.angle == null ? 18 : o.angle)}deg)`;
      });
    }
    return { el, at };
  }

  // =====================================================================================
  // 7. particlesToShape: seeded particles scatter, converge into a text / SVG path / image-alpha shape, can disperse.
  //    opts: { text, size:180, weight:600 | path:"M..", box:{x,y,w,h}, viewBox:[w,h] | image:img|src, x:960,y:540, n:1800,
  //            start:0, dur:1.8, disperse:{start,dur:1.4}, spread:.45, solid:true, dot:1, lead:.9, seed, accent, trail:3 }
  // =====================================================================================
  function particlesToShape(container, o = {}) {
    const P = pal(container, o), { W, H } = size(container, o), fam = fontFamily(container, o);
    const N = o.n || 1800, st = o.start || 0, dur = o.dur || 1.8, travel = dur * 0.62, maxDelay = dur - travel;
    const dis = o.disperse ? Object.assign({ dur: 1.4 }, o.disperse) : null;
    const cv = mk(container, `left:0;top:0;z-index:${o.z == null ? 10 : o.z}`, "canvas");
    cv.width = W; cv.height = H; cv.style.width = W + "px"; cv.style.height = H + "px";
    const g = cv.getContext("2d");
    const sa = sprite(P.accent, 48), sw = sprite(mix(P.glow, [255, 255, 255], 0.35), 48);
    const font = `${o.weight || 600} ${o.size || 180}px ${fam}`;
    let S = null, fontsOk = false, solidPath = null, solidTf = null, img = null;

    function sampleShape() {
      const off = document.createElement("canvas"), x0 = o.x == null ? W / 2 : o.x, y0 = o.y == null ? H / 2 : o.y;
      let ox, oy;
      if (o.text) {
        const m = document.createElement("canvas").getContext("2d"); m.font = font;
        const tw = Math.ceil(m.measureText(o.text).width + 60), th = Math.ceil((o.size || 180) * 1.6);
        off.width = tw; off.height = th;
        const c = off.getContext("2d"); c.font = font; c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(o.text, tw / 2, th / 2 + (o.size || 180) * 0.04);
        ox = x0 - tw / 2; oy = y0 - th / 2;
      } else if (o.path) {
        const b = o.box || { x: x0 - 200, y: y0 - 200, w: 400, h: 400 }, vb = o.viewBox || [b.w, b.h];
        off.width = Math.ceil(b.w); off.height = Math.ceil(b.h);
        const c = off.getContext("2d"); c.scale(b.w / vb[0], b.h / vb[1]); c.fillStyle = "#fff"; c.fill(new Path2D(o.path));
        ox = b.x; oy = b.y;
        solidPath = new Path2D(o.path); solidTf = [b.w / vb[0], b.h / vb[1], b.x, b.y];
      } else if (img && img.complete && img.naturalWidth) {
        const b = o.box || { x: x0 - img.naturalWidth / 2, y: y0 - img.naturalHeight / 2, w: img.naturalWidth, h: img.naturalHeight };
        off.width = Math.ceil(b.w); off.height = Math.ceil(b.h);
        off.getContext("2d").drawImage(img, 0, 0, b.w, b.h);
        ox = b.x; oy = b.y;
      } else return null;
      const d = off.getContext("2d").getImageData(0, 0, off.width, off.height).data;
      const step = N > 3500 ? 1 : 2, pts = [];
      for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) if (d[(y * off.width + x) * 4 + 3] > 140) pts.push(x + ox, y + oy);
      return pts.length ? pts : null;
    }
    function build() {
      if (o.image && !img) { if (typeof o.image === "string") { img = new Image(); img.src = o.image; } else img = o.image; }
      const pts = sampleShape();
      if (!pts) { S = null; return; }
      fontsOk = !document.fonts || document.fonts.status === "loaded";
      const R = rng(o.seed == null ? 21 : o.seed), cnt = pts.length / 2;
      const idx = Array.from({ length: cnt }, (_, i) => i);
      for (let i = cnt - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
      let minx = 1e9, maxx = -1e9;
      for (let i = 0; i < cnt; i++) { minx = Math.min(minx, pts[i * 2]); maxx = Math.max(maxx, pts[i * 2]); }
      const A = { tx: new Float32Array(N), ty: new Float32Array(N), sx: new Float32Array(N), sy: new Float32Array(N) };
      const meta = [];
      for (let i = 0; i < N; i++) {
        const k = idx[i % cnt], jit = i >= cnt ? 2.2 : 0.0;
        A.tx[i] = pts[k * 2] + (R() - 0.5) * jit; A.ty[i] = pts[k * 2 + 1] + (R() - 0.5) * jit;
        const ang = R() * TAU, rr = Math.sqrt(R());
        A.sx[i] = W / 2 + Math.cos(ang) * rr * W * 0.62; A.sy[i] = H / 2 + Math.sin(ang) * rr * H * 0.62;
        const xn = (A.tx[i] - minx) / Math.max(1, maxx - minx);
        meta.push({
          d: (0.55 * xn + 0.45 * R()) * maxDelay, cu: (R() - 0.5) * 260, r: R(), ph: R() * TAU, fq: 0.25 + R() * 0.5, am: 14 + R() * 34,
          ink: R() < 0.28, ea: R() * TAU, ed: 220 + R() * 520, dd: R() * (dis ? dis.dur * 0.35 : 0), ecu: (R() - 0.5) * 300,
        });
      }
      S = { A, meta };
    }
    const out = { x: 0, y: 0, p: 0, q: 0 };
    function place(i, t, m) {
      const A = S.A;
      const sx = A.sx[i] + Math.sin(t * m.fq + m.ph) * m.am, sy = A.sy[i] + Math.cos(t * m.fq * 0.8 + m.ph) * m.am;
      const p = inOut((t - st - m.d) / travel);
      let dx = A.tx[i] - sx, dy = A.ty[i] - sy;
      const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, arc = Math.sin(Math.PI * p) * m.cu;
      let x = lerp(sx, A.tx[i], p) + nx * arc, y = lerp(sy, A.ty[i], p) + ny * arc, q = 0;
      if (p >= 1) { x += Math.sin(t * 1.3 + m.ph) * 0.7; y += Math.cos(t * 1.1 + m.ph) * 0.7; }
      if (dis) {
        q = inOut((t - dis.start - m.dd) / (dis.dur * 0.65));
        if (q > 0) {
          const ex = A.tx[i] + Math.cos(m.ea) * m.ed, ey = A.ty[i] + Math.sin(m.ea) * m.ed * 0.6 - 180;
          const ddx = ex - A.tx[i], ddy = ey - A.ty[i], LL = Math.hypot(ddx, ddy) || 1;
          x = lerp(x, ex, q) + (-ddy / LL) * Math.sin(Math.PI * q) * m.ecu; y = lerp(y, ey, q) + (ddx / LL) * Math.sin(Math.PI * q) * m.ecu;
        }
      }
      out.x = x; out.y = y; out.p = p; out.q = q;
    }
    const trailN = o.trail == null ? 2 : o.trail, dot = o.dot || 1;
    function at(t) {
      if (!S || (!fontsOk && document.fonts && document.fonts.status === "loaded") || (o.image && !S)) build();
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      if (!S) return;
      const vis = clamp((t - (st - (o.lead == null ? 0.9 : o.lead))) / 0.7) * (dis ? 1 - sstep((t - dis.start - dis.dur * 0.9) / 0.4) : 1) * win(t, o);
      if (vis <= 0.001) return;
      const solidA = o.solid === false || !(o.text || solidPath) ? 0 : sstep((t - (st + dur) + 0.1) / 0.6) * (dis ? 1 - sstep((t - dis.start) / 0.3) : 1);
      if (solidA > 0.001) {
        g.globalCompositeOperation = "source-over"; g.globalAlpha = solidA * vis; g.fillStyle = rgba(P.ink, 1);
        if (o.text) { g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.text, o.x == null ? W / 2 : o.x, (o.y == null ? H / 2 : o.y) + (o.size || 180) * 0.04); }
        else { g.save(); g.translate(solidTf[2], solidTf[3]); g.scale(solidTf[0], solidTf[1]); g.fill(solidPath); g.restore(); }
      }
      g.globalCompositeOperation = "lighter";
      const settle = 1 - 0.7 * solidA;
      for (let i = 0; i < N; i++) {
        const m = S.meta[i];
        place(i, t, m);
        const p = out.p, q = out.q, moving = (p > 0.002 && p < 0.998) || (q > 0.002 && q < 0.998);
        const spr = m.ink ? sw : sa;
        let a = vis * (0.55 + 0.45 * m.r) * (1 - sstep((q - 0.5) / 0.5));
        if (p >= 1 && q <= 0) a *= (0.78 + 0.22 * Math.sin(t * 2.6 + m.ph)) * settle;
        else if (p < 1) a *= 0.7 + 0.3 * p;
        const s = (1.5 + m.r * 2.3) * dot * (1 + 0.7 * Math.sin(Math.PI * Math.min(p, 1)) * (q > 0 ? 0 : 1)) * 5;
        if (moving && trailN) {
          const x = out.x, y = out.y;
          for (let k = trailN; k >= 1; k--) {
            place(i, t - k * 0.04, m);
            g.globalAlpha = a * (1 - k / (trailN + 1)) * 0.5;
            const ss = s * (1 - k * 0.14);
            g.drawImage(spr, out.x - ss / 2, out.y - ss / 2, ss, ss);
          }
          g.globalAlpha = a; g.drawImage(spr, x - s / 2, y - s / 2, s, s);
        } else { g.globalAlpha = a; g.drawImage(spr, out.x - s / 2, out.y - s / 2, s, s); }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }
    return { el: cv, at };
  }

  // =====================================================================================
  // 8. dotGlobe: rotating dot-matrix sphere with land masses, highlights and arcs between points.
  //    opts: { x:960, y:540, r:220, dots:2400, speed:.12 (turns/s), tilt:.38 (rad), arcs:n | [[lat,lon],[lat,lon]..], seed, show, hide }
  // =====================================================================================
  function dotGlobe(container, o = {}) {
    const P = pal(container, o), R0 = o.r || 220, pad = Math.round(R0 * 0.34), S = (R0 + pad) * 2;
    const cx0 = o.x == null ? 960 : o.x, cy0 = o.y == null ? 540 : o.y;
    const el = mk(container, `left:${cx0 - S / 2}px;top:${cy0 - S / 2}px;width:${S}px;height:${S}px;z-index:${o.z == null ? 5 : o.z}`);
    const disc = mk(el, `left:${pad}px;top:${pad}px;width:${R0 * 2}px;height:${R0 * 2}px;border-radius:50%;` +
      `background:radial-gradient(circle at 34% 28%,${rgba(P.accent, 0.2)},${rgba(P.accent, 0.05)} 48%,${rgba(P.ground, 0.0)} 72%),radial-gradient(circle at 50% 50%,${rgba(P.ground, 0.0)} 60%,${rgba(P.accent, 0.1)} 100%);` +
      `box-shadow:inset 0 0 ${R0 * 0.22}px ${rgba(P.accent, 0.16)},0 0 ${R0 * 0.5}px ${rgba(P.accent, 0.14)};border:1px solid ${rgba(P.ink, 0.1)}`);
    const cv = mk(el, "left:0;top:0", "canvas"); cv.width = S; cv.height = S; cv.style.width = S + "px"; cv.style.height = S + "px";
    const g = cv.getContext("2d"), Rn = rng(o.seed == null ? 3 : o.seed);
    // seeded 3D value noise -> continents
    const hs = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + (o.seed || 3) * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const fade = (t) => t * t * (3 - 2 * t);
    function vn(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
      let r = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
        r += hs(xi + a, yi + b, zi + c) * (a ? xf : 1 - xf) * (b ? yf : 1 - yf) * (c ? zf : 1 - zf);
      return r;
    }
    const ND = o.dots || 2400, pts = [], gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < ND; i++) {
      const y = 1 - 2 * (i + 0.5) / ND, rr = Math.sqrt(1 - y * y), th = i * gold, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      const n = 0.55 * vn(x * 2.1, y * 2.1, z * 2.1) + 0.3 * vn(x * 4.3 + 9, y * 4.3, z * 4.3) + 0.15 * vn(x * 8.7, y * 8.7 + 4, z * 8.7);
      pts.push({ x, y, z, land: n > 0.52 });
    }
    const arcs = [];
    const ll = (lat, lon) => { const a = lat * Math.PI / 180, b = lon * Math.PI / 180; return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)]; };
    const land = pts.filter((p) => p.land);
    const na = typeof o.arcs === "number" ? o.arcs : Array.isArray(o.arcs) ? Math.floor(o.arcs.length / 2) : 5;
    for (let k = 0; k < na; k++) {
      let A, B;
      if (Array.isArray(o.arcs)) { A = ll(...o.arcs[k * 2]); B = ll(...o.arcs[k * 2 + 1]); }
      else { const a = land[Math.floor(Rn() * land.length)], b = land[Math.floor(Rn() * land.length)]; A = [a.x, a.y, a.z]; B = [b.x, b.y, b.z]; }
      arcs.push({ A, B, per: 3.4 + Rn() * 1.6, off: Rn() * 5, lift: 0.16 + Rn() * 0.1 });
    }
    const spA = sprite(P.glow, 48), speed = o.speed == null ? 0.12 : o.speed, tilt = o.tilt == null ? 0.38 : o.tilt;
    function at(t) {
      const yaw = t * speed * TAU + (o.yaw || 0.8), cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), stl = Math.sin(tilt), c = S / 2;
      el.style.opacity = win(t, o).toFixed(4);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
      const proj = (x, y, z, rr) => {
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * ct - z1 * stl, z2 = y * stl + z1 * ct;
        return [c + x1 * R0 * rr, c - y2 * R0 * rr, z2];
      };
      // buckets: [back ocean, back land, front ocean, front land, front-edge land]
      const B = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const rd = [R0 * 0.0042, R0 * 0.0062, R0 * 0.0055 + 0.6, R0 * 0.0086 + 0.8];
      for (let i = 0; i < ND; i++) {
        const p = pts[i], q = proj(p.x, p.y, p.z, 1), front = q[2] > 0;
        const k = (front ? 2 : 0) + (p.land ? 1 : 0), r = rd[k] * (0.75 + 0.25 * (q[2] + 1) / 2) * (S / S);
        B[k].moveTo(q[0] + r, q[1]); B[k].arc(q[0], q[1], r, 0, TAU);
      }
      g.fillStyle = rgba(P.ink, 0.11); g.fill(B[0]);
      g.fillStyle = rgba(P.accent, 0.2); g.fill(B[1]);
      g.fillStyle = rgba(mix(P.accent, P.ink, 0.35), 0.28); g.fill(B[2]);
      g.fillStyle = rgba(mix(P.accent, P.ink, 0.15), 0.95); g.fill(B[3]);
      // arcs
      g.lineCap = "round";
      for (const a of arcs) {
        const ph = ((t + a.off) / a.per) % 1, head = clamp(ph / 0.7), tail = clamp((ph - 0.3) / 0.7);
        const om = Math.acos(clamp(a.A[0] * a.B[0] + a.A[1] * a.B[1] + a.A[2] * a.B[2], -1, 1)) || 1e-3, so = Math.sin(om);
        const at3 = (s) => {
          const w1 = Math.sin((1 - s) * om) / so, w2 = Math.sin(s * om) / so;
          let x = a.A[0] * w1 + a.B[0] * w2, y = a.A[1] * w1 + a.B[1] * w2, z = a.A[2] * w1 + a.B[2] * w2;
          const l = Math.hypot(x, y, z) || 1, h = 1 + a.lift * Math.sin(Math.PI * s) * Math.min(1, om / 1.4);
          return proj(x / l, y / l, z / l, h);
        };
        const SEG = 26, ends = [at3(0), at3(1)];
        let prev = at3(tail);
        for (let k = 1; k <= SEG; k++) {
          const s = tail + (head - tail) * k / SEG, cur = at3(s);
          const f = k / SEG, vis = clamp((Math.min(prev[2], cur[2]) + 0.12) / 0.3);
          if (vis > 0 && head > tail) {
            g.strokeStyle = rgba(mix(P.glow, [255, 255, 255], 0.3), f * f * 0.95 * vis); g.lineWidth = 1.2 + f * 1.6;
            g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke();
          }
          prev = cur;
        }
        const tip = at3(head);
        if (ph < 0.72 && tip[2] > -0.1) { g.globalCompositeOperation = "lighter"; g.globalAlpha = clamp((tip[2] + 0.1) / 0.3); g.drawImage(spA, tip[0] - 22, tip[1] - 22, 44, 44); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
        // arrival ring + origin dot
        const rp = (ph - 0.7) / 0.3;
        if (rp > 0 && rp < 1 && ends[1][2] > -0.05) { g.strokeStyle = rgba(P.glow, (1 - rp) * 0.8); g.lineWidth = 2; g.beginPath(); g.ellipse(ends[1][0], ends[1][1], 4 + rp * 24, (4 + rp * 24) * (0.55 + 0.45 * Math.max(0, ends[1][2])), 0, 0, TAU); g.stroke(); }
        if (ends[0][2] > -0.05) { g.fillStyle = rgba(P.glow, 0.9 * clamp(ends[0][2] * 3 + 0.5)); g.beginPath(); g.arc(ends[0][0], ends[0][1], 2.6, 0, TAU); g.fill(); }
      }
    }
    return { el, at };
  }

  // =====================================================================================
  // 9. orbitCards: a ring of cards/chips orbiting a centre in 3D depth (front sharp, back blurred and dim).
  //    opts: { x:960, y:540, rx:360, ry:70 (ring tilt, px), items:["Design",...] | [{html}|Element], w:230, h:78, speed:.07 (turns/s),
  //            start:0, dur:1.1, dir:1, ring:true, seed, show, hide }
  // =====================================================================================
  function orbitCards(container, o = {}) {
    const P = pal(container, o), { W, H } = size(container, o), fam = fontFamily(container, o);
    const items = o.items || ["Design", "Motion", "Brand", "Type", "Colour", "Layout", "Icons", "Craft"];
    const w = o.w || 250, h = o.h || 86, n = items.length, cx = o.x == null ? W / 2 : o.x, cy = o.y == null ? H / 2 : o.y;
    const rx = o.rx || 360, ry = o.ry == null ? 70 : o.ry, R = rng(o.seed == null ? 9 : o.seed);
    const el = mk(container, `left:0;top:0;width:${W}px;height:${H}px;z-index:${o.z == null ? 6 : o.z};perspective:1400px`);
    let ring = null;
    if (o.ring !== false) {
      ring = sv("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, el); ring.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
      sv("ellipse", { cx, cy, rx, ry, fill: "none", stroke: rgba(P.ink, 0.08), "stroke-width": 1 }, ring);
      ring.front = sv("path", { d: `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`, fill: "none", stroke: rgba(P.accent, 0.35), "stroke-width": 1.5 }, ring);
    }
    const cards = items.map((it, i) => {
      const e = mk(el, `left:0;top:0;width:${w}px;height:${h}px;border-radius:${h / 2.4}px;display:flex;align-items:center;gap:14px;padding:0 26px;box-sizing:border-box;` +
        `font:500 30px/1 ${fam};letter-spacing:-0.01em;color:${rgba(P.ink, 0.96)};white-space:nowrap;will-change:transform,opacity,filter;` +
        `background:linear-gradient(180deg,${rgba(mix(P.ground, P.ink, 0.2), 0.92)},${rgba(mix(P.ground, P.ink, 0.09), 0.92)});box-shadow:inset 0 0 0 1px ${rgba(P.ink, 0.18)},inset 0 1px 0 ${rgba(P.ink, 0.28)},0 24px 50px -16px rgba(0,0,0,.7)`);
      if (typeof it === "string") {
        const dotc = i % 3 === 0 ? P.accent : i % 3 === 1 ? P.glow : mix(P.accent, P.ink, 0.5);
        const d = mk(e, `position:relative;width:14px;height:14px;border-radius:50%;flex:none;background:${rgba(dotc, 1)};box-shadow:0 0 18px ${rgba(dotc, 0.9)}`);
        const s = mk(e, "position:relative"); s.textContent = it;
      } else if (it && it.html) e.innerHTML = it.html; else if (it && it.nodeType) e.appendChild(it);
      return { e, a0: (i / n) * TAU + (R() - 0.5) * 0.12, dl: i * 0.07 };
    });
    const st = o.start || 0, dur = o.dur || 1.1, sp = (o.speed == null ? 0.07 : o.speed) * (o.dir || 1);
    function at(t) {
      const vis = win(t, o), spin = sp * TAU * (t - st);
      if (ring) { ring.style.opacity = (vis * outCubic((t - st) / dur)).toFixed(3); }
      cards.forEach((c, i) => {
        const e0 = outExpo((t - st - c.dl) / dur), a = c.a0 + spin + (1 - e0) * -1.4;
        const dep = Math.cos(a), f = (dep + 1) / 2;
        const x = cx + Math.sin(a) * rx * e0, y = cy + dep * ry * e0 - 0;
        const sc = 0.6 + 0.4 * f * (0.5 + 0.5 * e0);
        const blur = Math.round((1 - f) * 7 * 2) / 2;
        const op = (0.22 + 0.78 * Math.pow(f, 0.8)) * e0 * vis;
        c.e.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px,0) perspective(900px) rotateY(${(-Math.sin(a) * 26).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        c.e.style.opacity = op.toFixed(3);
        c.e.style.filter = blur > 0.3 ? `blur(${blur}px)` : "none";
        c.e.style.zIndex = Math.round((dep + 1) * 100);
      });
    }
    return { el, at };
  }

  // =====================================================================================
  // 10. liquidBlob: SVG goo blob that morphs between shapes (gooey filter, glossy rim, accent bloom).
  //     opts: { x:960, y:540, size:520, keys:[{t,shape:"drop"|"ring"|"pill"|"cluster"|"split"|"drip"|[[x,y,r]..]}],
  //             ease, wobble:1, gradient:[from,to], seed, show, hide }
  // =====================================================================================
  const SHAPES = {
    drop: [[0, 0.22, 0.46], [0, -0.1, 0.32], [0, -0.32, 0.21], [0, -0.5, 0.12], [0, -0.62, 0.06], [-0.1, 0.3, 0.3], [0.1, 0.3, 0.3], [0, 0.35, 0.42]],
    ring: Array.from({ length: 8 }, (_, i) => [Math.cos(i / 8 * TAU) * 0.5, Math.sin(i / 8 * TAU) * 0.5, 0.17]),
    pill: Array.from({ length: 8 }, (_, i) => [(i / 7 - 0.5) * 1.15, 0, 0.2 - Math.abs(i / 7 - 0.5) * 0.06]),
    cluster: [[-0.22, -0.18, 0.3], [0.24, -0.2, 0.26], [0.0, 0.1, 0.34], [-0.3, 0.25, 0.22], [0.32, 0.22, 0.24], [0.02, -0.4, 0.17], [-0.05, 0.42, 0.2], [0.5, 0, 0.12]],
    split: [[-0.38, 0.0, 0.34], [-0.26, 0.1, 0.2], [-0.5, -0.15, 0.16], [0.4, 0.0, 0.3], [0.52, 0.1, 0.17], [0.3, -0.16, 0.2], [0.05, 0.0, 0.07], [0.0, 0.0, 0.02]],
    drip: [[0, -0.34, 0.4], [-0.25, -0.38, 0.28], [0.26, -0.36, 0.26], [0, -0.05, 0.2], [0, 0.18, 0.12], [0, 0.4, 0.14], [0, 0.55, 0.1], [0, -0.2, 0.3]],
  };
  function liquidBlob(container, o = {}) {
    const P = pal(container, o), S = o.size || 520, cx0 = o.x == null ? 960 : o.x, cy0 = o.y == null ? 540 : o.y, R = rng(o.seed == null ? 13 : o.seed);
    const el = mk(container, `left:${cx0 - S / 2}px;top:${cy0 - S / 2}px;width:${S}px;height:${S}px;z-index:${o.z == null ? 6 : o.z}`);
    const fid = uid("goo"), gid = uid("gr"), sd = S * 0.026;
    const svg = sv("svg", { width: S, height: S, viewBox: `0 0 ${S} ${S}` }, el); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    const defs = sv("defs", {}, svg), gr = o.gradient || [P.glow, P.accent];
    const lg = sv("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0.55, y2: 1 }, defs);
    sv("stop", { offset: 0, "stop-color": rgba(mix(gr[0], [255, 255, 255], 0.1), 1) }, lg); sv("stop", { offset: 1, "stop-color": rgba(gr[1], 1) }, lg);
    const f = sv("filter", { id: fid, x: "-40%", y: "-40%", width: "180%", height: "180%", "color-interpolation-filters": "sRGB" }, defs);
    sv("feGaussianBlur", { in: "SourceGraphic", stdDeviation: sd, result: "b" }, f);
    sv("feColorMatrix", { in: "b", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10", result: "goo" }, f);
    sv("feGaussianBlur", { in: "goo", stdDeviation: sd * 3.2, result: "gb" }, f);
    sv("feColorMatrix", { in: "gb", mode: "matrix", values: `0 0 0 0 ${P.accent[0] / 255}  0 0 0 0 ${P.accent[1] / 255}  0 0 0 0 ${P.accent[2] / 255}  0 0 0 0.55 0`, result: "bloom" }, f);
    sv("feOffset", { in: "goo", dx: S * 0.012, dy: S * 0.016, result: "off" }, f);
    sv("feComposite", { in: "goo", in2: "off", operator: "out", result: "rim" }, f);
    sv("feGaussianBlur", { in: "rim", stdDeviation: S * 0.004, result: "rimb" }, f);
    sv("feColorMatrix", { in: "rimb", mode: "matrix", values: "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.75 0", result: "rimw" }, f);
    sv("feOffset", { in: "goo", dx: -S * 0.012, dy: -S * 0.018, result: "off2" }, f);
    sv("feComposite", { in: "goo", in2: "off2", operator: "out", result: "rim2" }, f);
    sv("feGaussianBlur", { in: "rim2", stdDeviation: S * 0.01, result: "rim2b" }, f);
    sv("feColorMatrix", { in: "rim2b", mode: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.3 0", result: "shade" }, f);
    const mg = sv("feMerge", {}, f);
    ["bloom", "goo", "shade", "rimw"].forEach((n) => sv("feMergeNode", { in: n }, mg));
    const grp = sv("g", { filter: `url(#${fid})`, fill: `url(#${gid})` }, svg);
    const NC = 8, circles = Array.from({ length: NC }, () => sv("circle", { cx: 0, cy: 0, r: 0 }, grp));
    const ph = Array.from({ length: NC }, () => [R() * TAU, R() * TAU, 0.6 + R() * 0.8]);
    const resolve = (s) => (typeof s === "string" ? SHAPES[s] || SHAPES.drop : s);
    const keys = (o.keys || [{ t: 0, shape: "drop" }]).map((k) => ({ t: k.t, shape: resolve(k.shape) }));
    const easeFn = ez(o.ease || "inOut"), wob = o.wobble == null ? 1 : o.wobble;
    function at(t) {
      let a = keys[0], b = keys[0], p = 0;
      if (t >= keys[keys.length - 1].t) a = b = keys[keys.length - 1];
      else if (t > keys[0].t) { let i = 0; while (t > keys[i + 1].t) i++; a = keys[i]; b = keys[i + 1]; p = easeFn((t - a.t) / (b.t - a.t || 1)); }
      for (let i = 0; i < NC; i++) {
        const A = a.shape[i % a.shape.length], B = b.shape[i % b.shape.length], q = ph[i];
        const x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p), r = lerp(A[2], B[2], p);
        const wx = Math.sin(t * q[2] * 1.3 + q[0]) * 0.022 * wob, wy = Math.cos(t * q[2] * 1.1 + q[1]) * 0.022 * wob;
        const br = 1 + Math.sin(t * 1.6 + q[0]) * 0.035 * wob;
        circles[i].setAttribute("cx", ((x + wx) * S / 2 + S / 2).toFixed(2));
        circles[i].setAttribute("cy", ((y + wy) * S / 2 + S / 2).toFixed(2));
        circles[i].setAttribute("r", Math.max(0.1, r * br * S / 2).toFixed(2));
      }
      el.style.opacity = win(t, o).toFixed(3);
    }
    return { el, at };
  }

  // =====================================================================================
  // 11. lineDraw: draws SVG paths (dashoffset by t) with a glowing pen tip.
  //     opts: { paths:["M..", {d,width,color,delay}], x:0,y:0,w,h, viewBox:[w,h], start:0, dur:1.6, stagger:.25, width:5, color, tip:true, ease, fill }
  // =====================================================================================
  function lineDraw(container, o = {}) {
    const P = pal(container, o), { W, H } = size(container, o), vb = o.viewBox || [o.w || W, o.h || H];
    const w = o.w || W, h = o.h || H, col = o.color ? color(o.color, P.accent) : P.accent;
    const el = mk(container, `left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;z-index:${o.z == null ? 7 : o.z}`);
    const svg = sv("svg", { width: w, height: h, viewBox: `0 0 ${vb[0]} ${vb[1]}` }, el); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
    const gid = uid("tip"), defs = sv("defs", {}, svg), rg = sv("radialGradient", { id: gid }, defs);
    [[0, rgba([255, 255, 255], 1)], [0.2, rgba(mix(col, [255, 255, 255], 0.6), 0.9)], [0.5, rgba(col, 0.35)], [1, rgba(col, 0)]].forEach(([off, c]) => sv("stop", { offset: off, "stop-color": c }, rg));
    const ease = ez(o.ease || "inOut"), tipOn = o.tip !== false;
    const items = (o.paths || []).map((pp, i) => {
      const spec = typeof pp === "string" ? { d: pp } : pp, sw = spec.width || o.width || 5, c = spec.color ? color(spec.color, col) : col;
      const mkp = (wd, op, c2) => sv("path", { d: spec.d, fill: "none", stroke: rgba(c2, op), "stroke-width": wd, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, svg);
      const fills = spec.fill || o.fill ? sv("path", { d: spec.d, fill: rgba(c, 0.12), stroke: "none", opacity: 0 }, svg) : null;
      const layers = [mkp(sw * 6, 0.07, c), mkp(sw * 3, 0.16, c), mkp(sw, 1, mix(c, [255, 255, 255], 0.15))];
      const core = mkp(sw * 0.45, 0.9, [255, 255, 255]);
      const dot = tipOn ? sv("circle", { r: sw * 5, fill: `url(#${gid})`, opacity: 0 }, svg) : null;
      const len = layers[2].getTotalLength();
      return { layers, core, dot, len, fills, st: (o.start || 0) + (spec.delay != null ? spec.delay : i * (o.stagger == null ? 0.25 : o.stagger)), d: spec.dur || o.dur || 1.6 };
    });
    function at(t) {
      el.style.opacity = win(t, o).toFixed(3);
      for (const it of items) {
        const p = ease((t - it.st) / it.d), off = 1 - p;
        for (const l of it.layers) l.setAttribute("stroke-dashoffset", off.toFixed(5));
        it.core.setAttribute("stroke-dashoffset", off.toFixed(5));
        it.core.setAttribute("stroke-opacity", (p > 0 && p < 1 ? 1 : 0.55).toFixed(2));
        if (it.fills) it.fills.setAttribute("opacity", sstep((p - 0.7) / 0.3).toFixed(3));
        if (it.dot) {
          const k = clamp((t - it.st) / it.d);
          if (k <= 0) it.dot.setAttribute("opacity", 0);
          else {
            const pt = it.layers[2].getPointAtLength(p * it.len);
            it.dot.setAttribute("cx", pt.x.toFixed(2)); it.dot.setAttribute("cy", pt.y.toFixed(2));
            it.dot.setAttribute("opacity", (1 - sstep((k - 0.9) / 0.1) * 0.85).toFixed(3));
          }
        }
      }
    }
    return { el, at };
  }

  // =====================================================================================
  // 12a. countUp: a number rolling to a value (odometer columns, tabular figures, motion blur by speed).
  //      opts: { value, from:0, x,y, start:0, dur:1.8, decimals:0, prefix:"", suffix:"", size:180, weight:600, color, commas:true, ease, align:"left"|"center", mode:"odometer"|"text" }
  // =====================================================================================
  function countUp(container, o = {}) {
    const P = pal(container, o), fam = fontFamily(container, o), sz = o.size || 180, lh = Math.round(sz * 1.08);
    const dec = o.decimals || 0, val = o.value == null ? 100 : o.value, from = o.from || 0, st = o.start || 0, dur = o.dur || 1.8;
    const ease = ez(o.ease || "outExpo"), colr = o.color || rgba(P.ink, 1);
    const el = mk(container, `left:${o.x || 0}px;top:${o.y || 0}px;display:flex;align-items:flex-start;white-space:nowrap;font:${o.weight || 600} ${sz}px/${lh}px ${fam};` +
      `letter-spacing:-0.03em;font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1,'lnum' 1;color:${colr};z-index:${o.z == null ? 8 : o.z};` +
      `transform:translateX(${o.align === "center" ? "-50%" : "0"})`);
    const text = (o.commas === false ? val.toFixed(dec) : val.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }));
    const chars = [...text], parts = [];
    const decDigits = dec;
    let seenDigits = 0, lastMin = 0;
    const total = chars.filter((c) => /\d/.test(c)).length;
    if (o.prefix) mk(el, "position:relative", "span").textContent = o.prefix;
    for (const ch of chars) {
      if (/\d/.test(ch)) {
        const place = total - 1 - seenDigits - decDigits; // power of ten of this digit
        seenDigits++;
        const box = mk(el, `position:relative;display:inline-block;width:0.62em;height:${lh}px;overflow:hidden;` +
          "-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%)");
        const col = mk(box, "position:relative;left:0;top:0;will-change:transform");
        const s1 = mk(col, `position:relative;display:block;height:${lh}px;text-align:center`), s2 = mk(col, `position:relative;display:block;height:${lh}px;text-align:center`);
        const minV = place > 0 ? Math.pow(10, place) : 0;
        lastMin = minV;
        parts.push({ kind: "d", e: box, col, s1, s2, place, minV, d1: -1, d2: -1 });
      } else {
        const s = mk(el, "position:relative;display:inline-block;" + (ch === "," || ch === "." ? "width:0.3em;text-align:center" : ""), "span");
        s.textContent = ch;
        parts.push({ kind: "s", e: s, sep: true, minV: null });
      }
    }
    // separators take the visibility of the digit to their left
    let prevMin = 0;
    for (const p of parts) { if (p.kind === "d") prevMin = p.minV; else p.minV = prevMin; }
    if (o.suffix) { const s = mk(el, "position:relative;font-size:0.5em;align-self:flex-start;margin:0.16em 0 0 0.1em", "span"); s.textContent = o.suffix; }
    const vAt = (t) => lerp(from, val, ease((t - st) / dur));
    function at(t) {
      const v = vAt(t), v0 = vAt(t - 1 / 30), vel = Math.abs(v - v0) * 30;
      const vis = win(t, { show: st - 0.25, hide: o.hide, fade: o.fade == null ? 0.35 : o.fade });
      el.style.opacity = vis.toFixed(3);
      const vs = v * Math.pow(10, dec);
      for (const p of parts) {
        if (p.kind === "s") { p.e.style.opacity = p.minV == null || v >= p.minV ? 1 : 0; continue; }
        const unit = Math.pow(10, p.place + dec), x = vs / unit, fl = Math.floor(x), dg = fl % 10, fr = x - fl, f = p.place + dec === 0 ? sstep(fr) : sstep((fr - 0.9) / 0.1);
        if (p.d1 !== dg) { p.d1 = dg; p.s1.textContent = dg; p.s2.textContent = (dg + 1) % 10; }
        const visible = p.minV === 0 || v >= p.minV || v >= p.minV * 0.999;
        p.e.style.opacity = visible ? 1 : 0;
        const dps = vel * Math.pow(10, dec) / unit, bl = Math.min(3.5, Math.max(0, (dps - 6) * 0.07));
        p.col.style.transform = `translate3d(0,${(-f * lh).toFixed(2)}px,0)`;
        p.col.style.filter = bl > 0.3 ? `blur(${(Math.round(bl * 2) / 2)}px)` : "none";
      }
    }
    return { el, at };
  }

  // =====================================================================================
  // 12b. barGrow: bars and/or an area chart growing with a soft gradient and a lit end point.
  //      opts: { data:[..], labels:[..], x,y,w:760,h:360, type:"bars"|"area"|"both", start:0, dur:1.4, stagger:.08, highlight:index, color, max, grid:3 }
  // =====================================================================================
  function barGrow(container, o = {}) {
    const P = pal(container, o), fam = fontFamily(container, o), data = o.data || [38, 52, 47, 64, 71, 88, 96], n = data.length;
    const w = o.w || 760, h = o.h || 360, st = o.start || 0, dur = o.dur || 1.4, stg = o.stagger == null ? 0.08 : o.stagger, type = o.type || "bars";
    const col = o.color ? color(o.color, P.accent) : P.accent, mx = o.max || Math.max(...data) * 1.12, labH = o.labels ? 40 : 0, ch = h - labH;
    const hi = o.highlight == null ? n - 1 : o.highlight;
    const el = mk(container, `left:${o.x || 0}px;top:${o.y || 0}px;width:${w}px;height:${h}px;z-index:${o.z == null ? 8 : o.z}`);
    const gl = o.grid == null ? 3 : o.grid;
    for (let i = 0; i <= gl; i++) mk(el, `left:0;width:${w}px;height:1px;top:${(ch * i / gl).toFixed(1)}px;background:${rgba(P.ink, i === gl ? 0.2 : 0.07)}`);
    const slot = w / n, bw = Math.min(slot * 0.56, 80), bars = [];
    if (type !== "area") for (let i = 0; i < n; i++) {
      const isH = i === hi;
      const e = mk(el, `left:${(slot * i + (slot - bw) / 2).toFixed(1)}px;bottom:${labH}px;width:${bw}px;height:0px;border-radius:${Math.min(12, bw / 3)}px ${Math.min(12, bw / 3)}px 3px 3px;` +
        `background:linear-gradient(180deg,${rgba(isH ? mix(col, [255, 255, 255], 0.15) : col, isH ? 1 : 0.7)},${rgba(col, isH ? 0.35 : 0.1)});` +
        `box-shadow:inset 0 1px 0 ${rgba([255, 255, 255], isH ? 0.5 : 0.22)}${isH ? `,0 0 70px ${rgba(col, 0.5)},0 0 22px ${rgba(col, 0.5)}` : ""}`);
      bars.push(e);
    }
    let area = null;
    if (type !== "bars") {
      const pts = data.map((v, i) => [slot * (i + 0.5), ch - (v / mx) * ch]);
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
      }
      const svg = sv("svg", { width: w, height: ch, viewBox: `0 0 ${w} ${ch}` }, el); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
      const gid = uid("ar"), cid = uid("clip"), defs = sv("defs", {}, svg), lg = sv("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      sv("stop", { offset: 0, "stop-color": rgba(col, 0.42) }, lg); sv("stop", { offset: 1, "stop-color": rgba(col, 0) }, lg);
      const cp = sv("clipPath", { id: cid }, defs), cr = sv("rect", { x: -20, y: -40, width: 0, height: ch + 80 }, cp);
      sv("path", { d: `${d} L ${pts[pts.length - 1][0]} ${ch} L ${pts[0][0]} ${ch} Z`, fill: `url(#${gid})`, "clip-path": `url(#${cid})` }, svg);
      const ln = sv("path", { d, fill: "none", stroke: rgba(mix(col, [255, 255, 255], 0.2), 1), "stroke-width": 4, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, svg);
      const gln = sv("path", { d, fill: "none", stroke: rgba(col, 0.25), "stroke-width": 14, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, svg);
      const halo = sv("circle", { r: 26, fill: rgba(col, 0.28) }, svg), dotc = sv("circle", { r: 7, fill: "#fff" }, svg);
      area = { cr, ln, gln, halo, dotc, len: ln.getTotalLength() };
    }
    const labs = (o.labels || []).map((s, i) => {
      const e = mk(el, `left:${slot * i}px;width:${slot}px;bottom:0;text-align:center;font:500 22px/1 ${fam};color:${rgba(P.ink, 0.55)};opacity:0`); e.textContent = s; return e;
    });
    const valEls = type === "area" ? [] : data.map((v, i) => { const e = mk(el, `left:${slot * i}px;width:${slot}px;text-align:center;font:600 24px/1 ${fam};font-variant-numeric:tabular-nums;color:${rgba(P.ink, 0.9)};opacity:0`); e.textContent = v; return e; });
    function at(t) {
      el.style.opacity = win(t, { show: st - 0.2, hide: o.hide, fade: 0.3 }).toFixed(3);
      bars.forEach((e, i) => {
        const p = outExpo((t - st - i * stg) / dur), bh = (data[i] / mx) * ch * p;
        e.style.height = bh.toFixed(1) + "px";
        valEls[i].style.opacity = sstep((p - 0.75) / 0.25).toFixed(3);
        valEls[i].style.top = (ch - bh - 40).toFixed(1) + "px";
      });
      labs.forEach((e, i) => (e.style.opacity = sstep((t - st - 0.1 - i * stg) / 0.4).toFixed(3)));
      if (area) {
        const p = inOut((t - st - (type === "both" ? 0.35 : 0)) / (dur * 1.5));
        area.cr.setAttribute("width", ((w + 40) * p).toFixed(1));
        area.ln.setAttribute("stroke-dashoffset", (1 - p).toFixed(5)); area.gln.setAttribute("stroke-dashoffset", (1 - p).toFixed(5));
        const pt = area.ln.getPointAtLength(p * area.len);
        for (const c of [area.halo, area.dotc]) { c.setAttribute("cx", pt.x.toFixed(1)); c.setAttribute("cy", pt.y.toFixed(1)); c.setAttribute("opacity", p > 0.001 ? 1 : 0); }
        area.halo.setAttribute("r", (24 + 4 * Math.sin(t * 3)).toFixed(1));
      }
    }
    return { el, at };
  }

  // =====================================================================================
  // 13. depthStack: layered panels in real 3D with parallax and depth-of-field blur by distance from the focus plane.
  //     opts: { layers:[html|Element..] | n:5, x:960, y:540, w:760, h:460, gap:150, spread:{x:70,y:-34}, focus: 2 | [{t,i}], dof:3.2,
  //             sway:{x:5,y:8, period:10}, start:0, dur:1, perspective:1500, show, hide }
  // =====================================================================================
  function depthStack(container, o = {}) {
    const P = pal(container, o), { W, H } = size(container, o), fam = fontFamily(container, o);
    const n = o.layers ? o.layers.length : o.n || 5, w = o.w || 760, h = o.h || 460, gap = o.gap || 150, sp = Object.assign({ x: 70, y: -34 }, o.spread);
    const cx = o.x == null ? W / 2 : o.x, cy = o.y == null ? H / 2 : o.y, sway = Object.assign({ x: 5, y: 8, period: 10 }, o.sway);
    const el = mk(container, `left:0;top:0;width:${W}px;height:${H}px;perspective:${o.perspective || 1500}px;perspective-origin:${(cx / W * 100).toFixed(1)}% ${(cy / H * 100).toFixed(1)}%;z-index:${o.z == null ? 4 : o.z}`);
    const scene = mk(el, `left:0;top:0;width:${W}px;height:${H}px;transform-style:preserve-3d;will-change:transform`);
    const skeleton = (i) => {
      const c = i % 2 ? P.accent : P.glow;
      return `<div style="position:absolute;left:34px;top:30px;width:150px;height:14px;border-radius:7px;background:${rgba(P.ink, 0.5)}"></div>` +
        `<div style="position:absolute;right:34px;top:26px;width:46px;height:22px;border-radius:11px;background:${rgba(c, 0.85)}"></div>` +
        [0, 1, 2, 3].map((k) => `<div style="position:absolute;left:34px;top:${96 + k * 52}px;width:${60 + ((k * 37 + i * 53) % 35)}%;height:12px;border-radius:6px;background:${rgba(P.ink, 0.16 - k * 0.02)}"></div>`).join("") +
        `<div style="position:absolute;left:34px;bottom:34px;width:${w - 68}px;height:${h * 0.28}px;border-radius:14px;background:linear-gradient(90deg,${rgba(c, 0.5)},${rgba(c, 0.08)})"></div>`;
    };
    const L = Array.from({ length: n }, (_, i) => {
      const e = mk(scene, `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;border-radius:26px;overflow:hidden;will-change:transform,opacity,filter;` +
        `background:linear-gradient(160deg,${rgba(mix(P.ground, P.ink, 0.22), 1)},${rgba(mix(P.ground, P.ink, 0.1), 1)});box-shadow:inset 0 0 0 1px ${rgba(P.ink, 0.14)},inset 0 1px 0 ${rgba(P.ink, 0.22)},0 40px 90px -20px rgba(0,0,0,.65)`);
      const it = o.layers && o.layers[i];
      if (typeof it === "string") e.innerHTML = it; else if (it && it.nodeType) e.appendChild(it); else e.innerHTML = skeleton(i);
      return e;
    });
    const fk = Array.isArray(o.focus) ? o.focus : [{ t: 0, i: o.focus == null ? 0 : o.focus }];
    const focusAt = (t) => {
      if (t <= fk[0].t) return fk[0].i;
      for (let i = 0; i < fk.length - 1; i++) if (t < fk[i + 1].t) return lerp(fk[i].i, fk[i + 1].i, inOut((t - fk[i].t) / (fk[i + 1].t - fk[i].t)));
      return fk[fk.length - 1].i;
    };
    const st = o.start || 0, dur = o.dur || 1, dof = o.dof == null ? 3.2 : o.dof;
    function at(t) {
      const w2 = TAU / sway.period, ry = sway.y * Math.sin(w2 * t), rx = sway.x * Math.sin(w2 * t * 0.8 + 1);
      scene.style.transform = `translateZ(${(-gap * (n - 1) * 0.3).toFixed(1)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
      const f = focusAt(t), vis = win(t, o);
      L.forEach((e, i) => {
        const p = outExpo((t - st - i * 0.12) / (dur * 1.1)), dz = -i * gap - (1 - p) * 500;
        const d = Math.abs(i - f), blur = Math.round(d * dof * 4) / 4;
        e.style.transform = `translate3d(${((i - (n - 1) / 2) * sp.x).toFixed(1)}px,${((i - (n - 1) / 2) * sp.y).toFixed(1)}px,${dz.toFixed(1)}px)`;
        e.style.opacity = (p * vis * (1 - 0.08 * Math.min(d, 3))).toFixed(3);
        e.style.filter = blur > 0.2 ? `blur(${blur}px) brightness(${(1 - 0.07 * Math.min(d, 4)).toFixed(3)})` : "none";
      });
    }
    return { el, layers: L, at };
  }

  // =====================================================================================
  // 14. typeReveal: word-by-word kinetic reveal (mask + blur-in rise), blur-out exit at the same spot. "*accent*" marks accent words.
  //     opts: { text:"Make it *move*.", x, y, w:1200, size:64, weight:500, align:"left"|"center", color, start:0, stagger:.12, dur:.5, rise:18, blur:10,
  //             out:{start,dur:.4,stagger:.04}, mask:true, lh:1.12, tracking:"-0.02em" }
  // =====================================================================================
  function typeReveal(container, o = {}) {
    const P = pal(container, o), fam = fontFamily(container, o), sz = o.size || 64, colr = o.color || rgba(P.ink, 1);
    const al = o.align || "left", w = o.w || 1200;
    const el = mk(container, `left:${al === "center" ? (o.x || 0) - w / 2 : o.x || 0}px;top:${o.y || 0}px;width:${w}px;display:flex;flex-wrap:wrap;column-gap:${(sz * 0.26).toFixed(1)}px;` +
      `justify-content:${al === "center" ? "center" : "flex-start"};font:${o.weight || 500} ${sz}px/${o.lh || 1.12} ${fam};letter-spacing:${o.tracking || "-0.02em"};color:${colr};z-index:${o.z == null ? 9 : o.z}`);
    const words = [], toks = (o.text || "").split(/\s+/).filter(Boolean);
    let acc = false;
    for (let tkn of toks) {
      const startA = tkn.startsWith("*"), endA = tkn.endsWith("*") || /\*[^\w]*$/.test(tkn);
      if (startA) acc = true;
      const clean = tkn.replace(/\*/g, ""), isA = acc;
      if (endA) acc = false;
      const m = mk(el, `position:relative;display:block;${o.mask === false ? "" : `overflow:hidden;padding:${(sz * 0.12).toFixed(1)}px ${(sz * 0.08).toFixed(1)}px ${(sz * 0.18).toFixed(1)}px;margin:${-(sz * 0.12).toFixed(1)}px ${-(sz * 0.08).toFixed(1)}px ${-(sz * 0.18).toFixed(1)}px`}`);
      const i = mk(m, `position:relative;display:block;will-change:transform,opacity,filter;${isA ? `color:${rgba(P.accent, 1)};text-shadow:0 0 ${(sz * 0.5).toFixed(0)}px ${rgba(P.accent, 0.4)}` : ""}`);
      i.textContent = clean;
      words.push(i);
    }
    const st = o.start || 0, stg = o.stagger == null ? 0.12 : o.stagger, d = o.dur || 0.5, rise = o.rise == null ? 18 : o.rise, bl = o.blur == null ? 10 : o.blur;
    const out = o.out ? Object.assign({ dur: 0.4, stagger: 0.04 }, o.out) : null;
    function at(t) {
      words.forEach((e, i) => {
        const p = outCubic((t - st - i * stg) / d), q = out ? sstep((t - out.start - i * out.stagger) / out.dur) : 0;
        const op = clamp(p * 1.4) * (1 - q), b = (1 - p) * bl + q * bl;
        e.style.opacity = op.toFixed(3);
        e.style.transform = `translate3d(0,${((1 - p) * rise).toFixed(2)}px,0)`;
        e.style.filter = b > 0.25 ? `blur(${(Math.round(b * 2) / 2)}px)` : "none";
      });
    }
    return { el, at };
  }

  // ---------- drive ----------
  // One line from the film: DripVisuals.drive(tl, [a, b, c]). Runs each at(tl.time()) on every timeline update (and once now).
  function drive(tl, list) {
    const run = () => { const t = tl.time(); for (let i = 0; i < list.length; i++) list[i].at(t); };
    tl.eventCallback("onUpdate", run);
    run();
    return run;
  }

  window.DripVisuals = {
    version: "1.0",
    lightField, glow, grain, plane3d, cameraDrift, lightSweep, particlesToShape, dotGlobe, orbitCards,
    liquidBlob, lineDraw, countUp, barGrow, depthStack, typeReveal, drive,
    util: { rng, clamp, lerp, sstep, inOut, outCubic, outExpo, mix, color, rgba, pal },
  };
})();

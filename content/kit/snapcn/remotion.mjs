// A clean-room stand-in for the slice of Remotion's API that SnapCN pieces use, driven by Drip's film clock instead
// of a Remotion player. Written from Remotion's public API docs (no Remotion code is copied; Remotion is not MIT).
// The current frame comes from a React context that Drip's mount sets on every seek, so a piece is a pure function of
// time like the rest of the film.
import { createContext, createElement, useContext } from "react";

export const FrameContext = createContext({ frame: 0, fps: 30, width: 1920, height: 1080, durationInFrames: 300, id: "piece" });

export const useCurrentFrame = () => useContext(FrameContext).frame;
export const useVideoConfig = () => {
  const c = useContext(FrameContext);
  return { fps: c.fps, width: c.width, height: c.height, durationInFrames: c.durationInFrames, id: c.id, defaultProps: {}, props: {} };
};

// Rendering waits: Drip's seek already waits for fonts and two frames, so these are bookkeeping only.
let handle = 0;
export const delayRender = () => ++handle;
export const continueRender = () => {};
export const cancelRender = (e) => {
  throw e instanceof Error ? e : new Error(String(e));
};
export const getRemotionEnvironment = () => ({ isRendering: true, isPlayer: false, isStudio: false, isReadOnlyStudio: false });
export const staticFile = (p) => String(p).replace(/^\//, "");

// ---- easing ----
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const at = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (at(t, x1, x2) - x) / s;
    }
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30 && Math.abs(at(t, x1, x2) - x) > 1e-6; i++) {
      if (at(t, x1, x2) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return at(t, y1, y2);
  };
}
export const Easing = {
  linear: (t) => t,
  ease: bezier(0.42, 0, 1, 1),
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  poly: (n) => (t) => t ** n,
  sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
  circle: (t) => 1 - Math.sqrt(1 - t * t),
  exp: (t) => (t === 0 ? 0 : 2 ** (10 * (t - 1))),
  elastic: (b = 1) => (t) => 1 - Math.cos((t * Math.PI) / 2) ** 3 * Math.cos(t * b * Math.PI),
  back: (s = 1.70158) => (t) => t * t * ((s + 1) * t - s),
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  bezier,
  in: (e) => e,
  out: (e) => (t) => 1 - e(1 - t),
  inOut: (e) => (t) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};

// ---- interpolate ----
export function interpolate(input, inputRange, outputRange, options = {}) {
  const { easing = (t) => t, extrapolateLeft = "extend", extrapolateRight = "extend" } = options;
  let i = 1;
  while (i < inputRange.length - 1 && input > inputRange[i]) i++;
  const a = inputRange[i - 1];
  const b = inputRange[i];
  const oa = outputRange[i - 1];
  const ob = outputRange[i];
  let x = input;
  if (x < a) {
    if (extrapolateLeft === "clamp") x = a;
    else if (extrapolateLeft === "identity") return input;
  }
  if (x > b) {
    if (extrapolateRight === "clamp") x = b;
    else if (extrapolateRight === "identity") return input;
  }
  if (a === b) return oa;
  let t = (x - a) / (b - a);
  t = t >= 0 && t <= 1 ? easing(t) : t; // extend: linear beyond the range, as the docs describe
  return oa + (ob - oa) * t;
}

const parseColor = (c) => {
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return [0, 0, 0, 1];
};
export function interpolateColors(input, inputRange, colors) {
  const cs = colors.map(parseColor);
  const ch = [0, 1, 2, 3].map((k) => interpolate(input, inputRange, cs.map((c) => c[k]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return `rgba(${Math.round(ch[0])}, ${Math.round(ch[1])}, ${Math.round(ch[2])}, ${+ch[3].toFixed(3)})`;
}

// ---- spring: a damped spring from `from` to `to`, evaluated in closed form at any frame ----
function springAt(t, { damping = 10, mass = 1, stiffness = 100, overshootClamping = false }) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let x;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  else {
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    x = 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  return overshootClamping ? Math.min(1, x) : x;
}
export function measureSpring({ fps, config = {}, threshold = 0.005 }) {
  for (let f = 1; f < fps * 60; f++) {
    let settled = true;
    for (let g = f; g < f + fps; g++) if (Math.abs(1 - springAt(g / fps, config)) > threshold) settled = false;
    if (settled) return f;
  }
  return fps * 60;
}
export function spring({ frame, fps, config = {}, from = 0, to = 1, delay = 0, durationInFrames, reverse = false, durationRestThreshold }) {
  let f = frame - delay;
  if (reverse) f = (durationInFrames ?? measureSpring({ fps, config })) - f;
  if (f <= 0) return reverse ? to : from;
  // A fixed duration stretches the spring so it settles at durationInFrames.
  const natural = durationInFrames ? measureSpring({ fps, config, threshold: durationRestThreshold ?? 0.005 }) : null;
  const t = (natural ? (f * natural) / durationInFrames : f) / fps;
  const p = springAt(t, config);
  return from + (to - from) * p;
}

// ---- random: a seeded value in [0, 1) ----
export function random(seed) {
  if (seed === null) return Math.random();
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return ((h >>> 0) % 1e9) / 1e9;
}

// ---- components ----
export function AbsoluteFill({ style, children, ...rest }) {
  return createElement("div", { ...rest, style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", ...style } }, children);
}

/** A stretch of time: children see frames from 0 at `from`, and nothing outside its duration. */
export function Sequence({ from = 0, durationInFrames = Infinity, children, layout = "absolute-fill", style, name: _name }) {
  const c = useContext(FrameContext);
  const local = c.frame - from;
  if (local < 0 || local >= durationInFrames) return null;
  const inner = createElement(FrameContext.Provider, { value: { ...c, frame: local, durationInFrames: Math.min(durationInFrames, c.durationInFrames - from) } }, children);
  return layout === "none" ? inner : createElement(AbsoluteFill, { style }, inner);
}

/** Pieces in a row: each Series.Sequence starts when the one before ends. */
export function Series({ children }) {
  let at = 0;
  const kids = [].concat(children).filter(Boolean);
  return createElement(
    "div",
    { style: { position: "absolute", inset: 0 } },
    kids.map((k, i) => {
      const d = k.props.durationInFrames ?? 0;
      const el = createElement(Sequence, { key: i, from: at + (k.props.offset ?? 0), durationInFrames: d }, k.props.children);
      at += d + (k.props.offset ?? 0);
      return el;
    }),
  );
}
Series.Sequence = ({ children }) => children;

export function Loop({ durationInFrames, children }) {
  const c = useContext(FrameContext);
  return createElement(FrameContext.Provider, { value: { ...c, frame: c.frame % durationInFrames } }, children);
}

export function Freeze({ frame, children, active = true }) {
  const c = useContext(FrameContext);
  return active ? createElement(FrameContext.Provider, { value: { ...c, frame } }, children) : children;
}

export const Img = ({ src, style, ...rest }) => createElement("img", { ...rest, src, style, decoding: "sync" });
export const Video = ({ style }) => createElement("div", { style });
export const OffthreadVideo = Video;
export const Audio = () => null;
export const Html5Audio = Audio;
export const Html5Video = Video;
export const Composition = () => null;
export const Still = () => null;
export const registerRoot = () => {};
export const prefetch = () => ({ free: () => {}, waitUntilDone: () => Promise.resolve() });

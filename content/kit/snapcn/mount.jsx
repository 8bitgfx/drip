// Entry for a bundled SnapCN piece: registers it on window.DripPieces so a Drip film can mount it and seek it.
//   const p = DripPieces.mount("text-reveal", container, { props: {...}, start: 2, fps: 30 });
//   DripVisuals.drive(tl, [p]);   // or call p.at(t) from the timeline
// The piece renders synchronously for the frame (start..start+duration in film seconds), so every renderer that seeks
// the film's clock gets the same picture.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { FrameContext } from "remotion";
import * as Piece from "__PIECE__";

const NAME = "__NAME__";
const COMPONENT = "__COMPONENT__";

function pick(mod) {
  if (COMPONENT && mod[COMPONENT]) return mod[COMPONENT];
  if (mod.default) return mod.default;
  const fns = Object.entries(mod).filter(([k, v]) => typeof v === "function" && /^[A-Z]/.test(k));
  return fns.length ? fns[0][1] : null;
}

function mount(container, opts = {}) {
  const Comp = (opts.component && Piece[opts.component]) || pick(Piece);
  if (!Comp) throw new Error(`${NAME}: no component export found`);
  const fps = opts.fps || (window.__drip && window.__drip.fps) || 30;
  const width = opts.width || (window.__drip && window.__drip.width) || 1920;
  const height = opts.height || (window.__drip && window.__drip.height) || 1080;
  const start = opts.start || 0;
  const durationInFrames = Math.round((opts.duration || 6) * fps);
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;left:${opts.x || 0}px;top:${opts.y || 0}px;width:${width}px;height:${height}px;overflow:hidden;${opts.scale ? `transform:scale(${opts.scale});transform-origin:0 0;` : ""}${opts.style || ""}`;
  container.appendChild(el);
  const root = createRoot(el);
  let last = -1;
  function at(t) {
    const frame = Math.round((t - start) * fps);
    const visible = frame >= 0 && frame < durationInFrames + (opts.hold ? 1e9 : 0);
    el.style.visibility = visible ? "visible" : "hidden";
    const f = Math.max(0, Math.min(frame, durationInFrames - 1));
    if (f === last) return;
    last = f;
    flushSync(() => {
      root.render(createElement(FrameContext.Provider, { value: { frame: f, fps, width, height, durationInFrames, id: NAME } }, createElement(Comp, opts.props || {})));
    });
  }
  at(start);
  return { el, at, name: NAME };
}

window.DripPieces = window.DripPieces || { mount: (name, container, opts) => window.DripPieces[name].mount(container, opts) };
window.DripPieces[NAME] = { mount, exports: Object.keys(Piece) };

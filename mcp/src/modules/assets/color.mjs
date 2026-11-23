// Colour maths: hex <-> OKLCH, gamut mapping, WCAG contrast, ramps. No dependencies.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function hexToRgb(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(toSrgb);
}

export function hexToOklch(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  const C = Math.hypot(a, b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c: C, h: H };
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH -> hex, lowering chroma until the colour fits sRGB. */
export function oklchToHex({ l, c, h }) {
  let lo = 0;
  let hi = c;
  const at = (cc) => oklabToRgb([l, cc * Math.cos((h * Math.PI) / 180), cc * Math.sin((h * Math.PI) / 180)]);
  if (inGamut(at(c))) return rgbToHex(at(c));
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(at(mid))) lo = mid;
    else hi = mid;
  }
  return rgbToHex(at(lo));
}

export function oklchCss({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function wcag(ratio) {
  return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large / UI only" : "FAIL";
}

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS = [0.975, 0.94, 0.885, 0.805, 0.715, 0.63, 0.545, 0.465, 0.385, 0.31, 0.24];

/** An 11-step ramp around a seed colour, same hue, chroma peaking in the middle. */
export function ramp(seedHex, { chromaScale = 1 } = {}) {
  const { c, h } = hexToOklch(seedHex);
  return STEPS.map((step, i) => {
    const l = LIGHTNESS[i];
    const bell = 1 - Math.abs(i - 5.5) / 6.5; // softer chroma at the ends
    const cc = c * chromaScale * (0.4 + 0.6 * bell); // peaks at the seed's own chroma, never above
    const col = { l, c: cc, h };
    return { step, hex: oklchToHex(col), oklch: oklchCss(col) };
  });
}

export function rotateHue(hex, deg, { l, c } = {}) {
  const o = hexToOklch(hex);
  return oklchToHex({ l: l ?? o.l, c: c ?? o.c, h: (o.h + deg + 360) % 360 });
}

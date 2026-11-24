// The GitHub social preview (1280x640): the wordmark, one line, nothing else.
//   node assets/brand/src/social.mjs
// Upload it by hand: repo Settings → General → Social preview (GitHub has no API for it).
// Optical layout: the lockup's body (frame + letters) and the tagline are centred as a group; the drips hang between them.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLORS, wordmarkSvg, wordmarkBand } from "./brand.mjs";
import { shoot, page, cleanup } from "./shoot.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const W = 1280, H = 640, MW = 640, TAG = 40, GAP = 30;
const raw = wordmarkSvg("dark", { pad: 0 });
const [vw, vh] = raw.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
const f = MW / vw, band = wordmarkBand({ pad: 0 });
const svgH = vh * f, bodyTop = band.top * f;
const tagTop = svgH + GAP;                                   // below the longest drip
const groupTop = bodyTop, groupBottom = tagTop + TAG;
const y = Math.round(H / 2 - (groupTop + groupBottom) / 2);  // svg top that centres body + tagline
const svg = raw.replace(/width="[\d.]+" height="[\d.]+"/, `width="${MW}" height="${svgH.toFixed(1)}"`);
shoot(page(`<main><div class="m" style="top:${y}px">${svg}</div><p style="top:${Math.round(y + tagTop)}px">taste for your coding agent.</p></main>`,
  `main{position:relative;width:${W}px;height:${H}px;background:${COLORS.ink};font-family:'Bricolage Grotesque';color:#A3A1AD}
.m{position:absolute;left:${(W - MW) / 2 - 12}px}p{position:absolute;left:0;right:0;margin:0;text-align:center;font-size:34px;line-height:${TAG}px;font-weight:500;letter-spacing:-.01em}`),
  path.resolve(here, "../social-preview.png"), W, H);
cleanup();

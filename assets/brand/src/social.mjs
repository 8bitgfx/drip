// The GitHub social preview (1280x640): the wordmark, one line, nothing else.
//   node assets/brand/src/social.mjs
// Upload it by hand: repo Settings → General → Social preview (GitHub has no API for it).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLORS, wordmarkSvg } from "./brand.mjs";
import { shoot, page, cleanup } from "./shoot.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const svg = wordmarkSvg("dark", { pad: 0 }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="640"');
shoot(page(`<main>${svg}<p>taste for your coding agent.</p></main>`,
  `main{width:1280px;height:640px;background:${COLORS.ink};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;font-family:'Bricolage Grotesque';color:#A3A1AD}
svg{width:640px;height:auto;margin-left:-24px}p{margin:0;font-size:34px;font-weight:500;letter-spacing:-.01em}`),
  path.resolve(here, "../social-preview.png"), 1280, 640);
cleanup();

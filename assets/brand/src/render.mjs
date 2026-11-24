// Renders every brand file from brand.mjs with headless Chrome or Edge.
//   node assets/brand/src/render.mjs
// Writes assets/brand/*.svg|png and copies icon.png to .claude-plugin/icon.png (the plugin icon).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLORS, iconSvg, markSvg, wordmarkSvg, mark, S } from "./brand.mjs";
import { shoot, page, cleanup } from "./shoot.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "..");
const root = path.resolve(out, "../..");

const write = (name, s) => { fs.writeFileSync(path.join(out, name), `${s}\n`); console.log("wrote", path.relative(root, path.join(out, name))); };
const size = (svg) => svg.match(/width="([\d.]+)" height="([\d.]+)"/).slice(1).map((n) => Math.ceil(+n));

// 1. Icon (plugin icon, favicons)
const icon = iconSvg();
write("icon.svg", icon);
shoot(page(icon), path.join(out, "icon.png"), 1024, 1024);
// On the brand branch there is no plugin folder: copy icon.png to main's .claude-plugin/icon.png by hand.
if (fs.existsSync(path.join(root, ".claude-plugin"))) { fs.copyFileSync(path.join(out, "icon.png"), path.join(root, ".claude-plugin/icon.png")); console.log("wrote .claude-plugin/icon.png"); }
else console.log("no .claude-plugin here: copy assets/brand/icon.png to main's .claude-plugin/icon.png");

// 2. Mark and wordmarks (SVG + 2x PNG, transparent)
write("mark.svg", markSvg("light"));
write("mark-dark.svg", markSvg("dark"));
for (const theme of ["light", "dark"]) {
  const svg = wordmarkSvg(theme);
  write(`wordmark-${theme}.svg`, svg);
  const [w, h] = size(svg);
  shoot(page(svg), path.join(out, `wordmark-${theme}.png`), w, h, 2);
}

// The social preview: node assets/brand/src/social.mjs. README art: node assets/brand/src/readme.mjs

cleanup();

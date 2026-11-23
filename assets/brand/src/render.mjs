// Renders the brand PNGs from the sources with headless Chrome/Edge (transparent backgrounds).
//   node assets/brand/src/render.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "../../../mcp/src/modules/fitcheck/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "..");
const chrome = findChrome();
if (!chrome) throw new Error("Chrome or Edge is needed to render the brand files.");

function shoot(url, file, width, height) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "drip-brand-"));
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${profile}`, "--default-background-color=00000000", "--force-device-scale-factor=1",
    `--window-size=${width},${height}`, "--virtual-time-budget=6000", `--screenshot=${file}`, url,
  ], { stdio: "ignore", windowsHide: true });
  fs.rmSync(profile, { recursive: true, force: true });
  console.log("wrote", path.relative(process.cwd(), file));
}

// Icon: the SVG on a page sized exactly to it.
const iconSvg = fs.readFileSync(path.join(here, "icon.svg"), "utf8");
fs.copyFileSync(path.join(here, "icon.svg"), path.join(out, "icon.svg"));
const iconPage = path.join(os.tmpdir(), "drip-icon.html");
fs.writeFileSync(iconPage, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${iconSvg}`);
shoot(pathToFileURL(iconPage).href, path.join(out, "icon.png"), 1024, 1024);

// The drop alone (no background), as SVG.
fs.writeFileSync(
  path.join(out, "drop.svg"),
  iconSvg.replace(/<rect[^>]*\/>/, "").replace(/<linearGradient[\s\S]*?<\/linearGradient>/, "").replace('viewBox="0 0 1024 1024"', 'viewBox="280 160 464 690"').replace(/width="1024" height="1024"/, 'width="464" height="690"'),
);

// Wordmarks, light and dark.
const word = pathToFileURL(path.join(here, "wordmark.html")).href;
shoot(word, path.join(out, "wordmark-light.png"), 600, 420);
shoot(`${word}#dark`, path.join(out, "wordmark-dark.png"), 600, 420);

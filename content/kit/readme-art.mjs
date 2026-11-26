// TEMPLATE: README art (a hero banner + a bento grid in light and dark), rendered to PNG at 2x.
// Everything here is a placeholder: greys, [bracketed] copy and a dashed art slot.
// Replace every CHANGE ME token and every [bracket] with the project's own brand and words.
// Guide: drip_guide readme/art
//   node assets/readme/src/readme-art.mjs [name-prefix]     -> assets/readme/hero.png, bento-light.png, bento-dark.png
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "..");                       // assets/readme/
const W = 830;                                               // GitHub's README column, shown 1:1, rendered at 2x

// ---------- tokens: CHANGE ME to the project's brand ----------
const TOKENS = {
  accent: "#6B6B73",                                         // CHANGE ME: brand accent (one accent tile per grid, the hero art)
  onAccent: "#FFFFFF",                                       // CHANGE ME: text on the accent
  ground: "#1C1C1F",                                         // CHANGE ME: hero ground (dark or brand, so one image suits both themes)
  fonts: "family=Inter:wght@400;500;600;700",                // CHANGE ME: Google Fonts query for the brand faces
  display: "Inter",                                          // CHANGE ME: display face
  text: "Inter",                                             // CHANGE ME: text face
  light: { tile: "#F2F2F3", line: "#E4E4E7", ink: "#18181B", ink2: "#71717A", chip: "#FFFFFF", chipLine: "#E4E4E7", slot: "#A1A1AA" },
  dark: { tile: "#18181B", line: "#27272A", ink: "#F4F4F5", ink2: "#A1A1AA", chip: "#232326", chipLine: "#323236", slot: "#52525B" },
};

// Phosphor icons (MIT) through Iconify; use one set only.
const icon = (name, color, size = 18) => `<img src="https://api.iconify.design/ph/${name}.svg?color=${encodeURIComponent(color)}" width="${size}" height="${size}">`;
// A dashed placeholder: replace each one with a real object, stat, specimen or diagram.
const slot = (t, label, css = "") => `<div class="slot" style="${css}">${label}</div>`;

const doc = (t, css, body) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?${TOKENS.fonts}&display=block" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}html,body{background:transparent}
body{width:${W}px;font:15px/1.4 "${TOKENS.text}",system-ui,sans-serif;color:${t.ink};-webkit-font-smoothing:antialiased}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.t{position:relative;background:${t.tile};border-radius:22px;box-shadow:inset 0 0 0 1px ${t.line};overflow:hidden;padding:24px 24px 0}
.c2{grid-column:span 2}
.cap{font-size:17px;line-height:1.35;letter-spacing:-.01em;color:${t.ink2};max-width:30ch}.cap b{color:${t.ink};font-weight:600}
.accent{background:${TOKENS.accent};box-shadow:none}.accent .cap{color:${TOKENS.onAccent};opacity:.75}.accent .cap b{color:${TOKENS.onAccent}}
.big{font-family:"${TOKENS.display}";font-weight:700;letter-spacing:-.04em;line-height:.9;white-space:nowrap}
.chip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:17px;background:${t.chip};box-shadow:inset 0 0 0 1px ${t.chipLine};font-size:13.5px;font-weight:500;white-space:nowrap}
.slot{position:absolute;display:grid;place-items:center;border:1.5px dashed ${t.slot};border-radius:14px;color:${t.slot};font:500 12px/1.3 "${TOKENS.text}";text-align:center;padding:8px}
${css}</style>${body}`;

// ---------- 1. hero: one image for both themes ----------
function hero() {
  const H = 340;
  const t = { ...TOKENS.dark, slot: "#6B6B73" };
  const css = `.h{position:relative;height:${H}px;border-radius:24px;background:${TOKENS.ground};overflow:hidden;padding:64px 48px}
  .h h1{font-family:"${TOKENS.display}";font-weight:700;font-size:64px;line-height:.95;letter-spacing:-.04em;color:#fff;max-width:9ch}
  .tag{position:absolute;left:48px;bottom:40px;font-size:13px;color:#8E8E96}`;
  const body = `<div class="h">
    <h1>[Headline, five words max]</h1>
    <div class="tag">[one small line: who it is for, where it runs]</div>
    ${slot(t, "[your logo idea at banner size:<br>the whole mark, never cropped into a box]", "right:40px;top:40px;width:300px;height:260px")}
  </div>`;
  return { name: "hero", h: H, html: doc(t, css, body) };
}

// ---------- 2. bento: light + dark, 5 tiles, one accent tile, one hero tile ----------
function bento(theme) {
  const t = TOKENS[theme], H = 500;
  const css = `.grid{grid-template-rows:230px 258px}
  .row{position:absolute;left:24px;right:-40px;bottom:24px;display:flex;flex-wrap:wrap;gap:8px}
  .stat{position:absolute;left:24px;bottom:22px}.stat .big{font-size:72px}
  .accent .chip{background:rgba(255,255,255,.16);box-shadow:none;color:${TOKENS.onAccent}}`;
  const body = `<div class="grid">
    <div class="t c2 accent"><div class="cap"><b>[Main feature.]</b> [One short line.]</div>
      <div class="row">${["[item]", "[item]", "[item]", "[item]", "[item]"].map((x) => `<span class="chip">${x}</span>`).join("")}</div></div>
    <div class="t"><div class="cap"><b>[A real number.]</b></div><div class="stat"><span class="big">[00k]</span></div></div>
    <div class="t"><div class="cap"><b>[Feature.]</b></div>
      <div class="row">${["check", "lightning", "lock-simple"].map((n) => `<span class="chip">${icon(n, t.ink)}</span>`).join("")}</div></div>
    <div class="t"><div class="cap"><b>[Feature.]</b> [Short line.]</div>${slot(t, "[an object, specimen or diagram]", "left:24px;right:24px;bottom:24px;height:110px")}</div>
    <div class="t"><div class="cap"><b>[Feature.]</b></div>${slot(t, "[an object, specimen or diagram]", "left:24px;right:24px;bottom:24px;height:140px")}</div>
  </div>`;
  return { name: `bento-${theme}`, h: H, html: doc(t, css, body) };
}

// ---------- render with headless Chrome or Edge ----------
const CHROME = [
  process.env.DRIP_CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((p) => p && fs.existsSync(p));
if (!CHROME) throw new Error("Chrome or Edge is needed (or set DRIP_CHROME to its path).");
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.toUpperCase() === "__COMPAT_LAYER") delete env[k]; // Windows: otherwise no screenshot is written

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "readme-art-"));
function shoot({ name, h, html }) {
  const page = path.join(tmp, `${name}.html`);
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(page, html);
  fs.rmSync(file, { force: true });
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${fs.mkdtempSync(path.join(tmp, "p-"))}`, "--default-background-color=00000000",
    "--force-device-scale-factor=2", `--window-size=${W},${h}`, "--virtual-time-budget=10000",
    `--screenshot=${file}`, pathToFileURL(page).href], { stdio: "ignore", windowsHide: true, env });
  for (let i = 0; i < 50 && !fs.existsSync(file); i++) execFileSync(process.execPath, ["-e", "setTimeout(()=>{},200)"]);
  if (!fs.existsSync(file)) throw new Error(`No screenshot written for ${name}`);
  console.log("wrote", path.relative(process.cwd(), file));
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
for (const s of [hero(), bento("light"), bento("dark")]) if (!only || s.name.startsWith(only)) shoot(s);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* the browser may still hold its profile; the OS cleans temp */ }

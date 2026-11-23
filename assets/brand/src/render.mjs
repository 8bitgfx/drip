// Renders every brand file from brand.mjs with headless Chrome or Edge.
//   node assets/brand/src/render.mjs
// Writes assets/brand/*.svg|png and copies icon.png to .claude-plugin/icon.png (the plugin icon).
// The social card and README panels load Bricolage Grotesque from Google Fonts, so render online.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { COLORS, iconSvg, markSvg, wordmarkSvg, mark, S } from "./brand.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "..");
const root = path.resolve(out, "../..");

const CHROME = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
};
const chrome = process.env.DRIP_CHROME || (CHROME[process.platform] || CHROME.linux).find((p) => p && fs.existsSync(p));
if (!chrome) throw new Error("Chrome or Edge is needed to render the brand files (or set DRIP_CHROME).");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drip-brand-"));
function shoot(html, file, width, height, scale = 1) {
  const page = path.join(tmp, `${path.basename(file)}.html`);
  fs.writeFileSync(page, html);
  const profile = fs.mkdtempSync(path.join(tmp, "p-"));
  fs.rmSync(file, { force: true });
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${profile}`,
    "--default-background-color=00000000", `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`,
    "--virtual-time-budget=10000", `--screenshot=${file}`, pathToFileURL(page).href,
  ], { stdio: "ignore", windowsHide: true });
  for (let t = 0; t < 50 && !fs.existsSync(file); t++) execFileSync(process.execPath, ["-e", "setTimeout(()=>{},200)"]);
  if (!fs.existsSync(file)) throw new Error(`Chrome did not write ${file}`);
  console.log("wrote", path.relative(root, file));
}
const page = (body, css = "") => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}svg{display:block}${css}</style>${body}`;
const write = (name, s) => { fs.writeFileSync(path.join(out, name), `${s}\n`); console.log("wrote", path.relative(root, path.join(out, name))); };
const size = (svg) => svg.match(/width="([\d.]+)" height="([\d.]+)"/).slice(1).map((n) => Math.ceil(+n));

// 1. Icon (plugin icon, favicons)
const icon = iconSvg();
write("icon.svg", icon);
shoot(page(icon), path.join(out, "icon.png"), 1024, 1024);
fs.copyFileSync(path.join(out, "icon.png"), path.join(root, ".claude-plugin/icon.png"));
console.log("wrote .claude-plugin/icon.png");

// 2. Mark and wordmarks (SVG + 2x PNG, transparent)
write("mark.svg", markSvg("light"));
write("mark-dark.svg", markSvg("dark"));
for (const theme of ["light", "dark"]) {
  const svg = wordmarkSvg(theme);
  write(`wordmark-${theme}.svg`, svg);
  const [w, h] = size(svg);
  shoot(page(svg), path.join(out, `wordmark-${theme}.png`), w, h, 2);
}

// 3. Social preview, 1280x640 (GitHub: Settings → Social preview)
const g = JSON.parse(fs.readFileSync(path.join(here, "glyphs.json"), "utf8"));
const social = page(`<main>
  <svg class="word" viewBox="0 ${g.ascender - 10} ${g.width + 10} ${-g.ascender + g.descender + 20}"><path d="${g.d}" fill="${COLORS.paper}"/></svg>
  <p class="tag">Give Claude drip.</p>
  <p class="sub">A design director for Claude Code: real references, moodboards,<br>design systems and fit checks, so your UI stops looking AI-made.</p>
  <p class="foot"><span>Claude Code plugin</span><span>MIT</span><span>github.com/8bitgfx/drip</span></p>
  <svg class="mark" viewBox="-30 -30 ${S + 60} ${S + 300}">${mark({ hs: 30, sw: 4 })}</svg>
</main>`, `main{width:1280px;height:640px;position:relative;overflow:hidden;background:radial-gradient(120% 90% at 85% 0%, #1E2130 0%, ${COLORS.ink} 60%);font-family:'Bricolage Grotesque';color:${COLORS.paper}}
.word{position:absolute;left:84px;top:112px;width:400px;height:auto}
.tag{position:absolute;left:86px;top:318px;margin:0;font-size:56px;font-weight:700;letter-spacing:-.035em}
.sub{position:absolute;left:88px;top:402px;margin:0;font-size:22px;line-height:1.45;color:#B9B7C2;letter-spacing:-.005em}
.foot{position:absolute;left:88px;bottom:56px;margin:0;display:flex;align-items:center;gap:16px;font-size:17px;color:#8E8C99;font-weight:500}
.foot span+span::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:#5E73FF;margin-right:16px;vertical-align:middle}
.mark{position:absolute;right:92px;top:74px;width:330px;height:auto}`);
shoot(social, path.join(out, "social-preview.png"), 1280, 640);

// 4. README panel: the designer loop (light + dark)
const STEPS = [
  ["Brief", "Who it's for, the job of the screen, the feeling, the constraints."],
  ["References", "Dribbble search without an account. Contact sheets, then full-size study."],
  ["Moodboard", "Picks with notes, clustered into 2–3 genuinely different directions."],
  ["Direction", "You pick on a board you can open, star and annotate."],
  ["System", "DESIGN.md and tokens: OKLCH palette, font pairing, spacing, motion."],
  ["Assets", "One icon family, real photos, gradients and grain, generated images."],
  ["Build", "Proven components first, restyled to the tokens. Never library defaults."],
  ["Fit check", "Phone and desktop screenshots, compared with the direction, scored honestly."],
];
for (const theme of ["light", "dark"]) {
  const d = theme === "dark";
  const bg = d ? "#0D1117" : "#FFFFFF", card = d ? "#161B22" : COLORS.paper, fg = d ? COLORS.paper : COLORS.ink, mute = d ? "#9AA0AA" : "#5E5B55", line = d ? "#262C36" : "#E4DFD5";
  const cards = STEPS.map(([t, s], i) => `<div class="c${i === 7 ? " last" : ""}"><b>${String(i + 1).padStart(2, "0")}</b><h3>${t}</h3><p>${s}</p></div>`).join("");
  shoot(page(`<main>${cards}</main>`, `*{box-sizing:border-box}main{width:1600px;padding:2px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;background:${bg};font-family:'Bricolage Grotesque';color:${fg}}
.c{background:${card};border:1px solid ${line};border-radius:20px;padding:30px 30px 34px;height:232px;position:relative;overflow:hidden}
.c b{font-size:15px;font-weight:600;color:${COLORS.blue};${d ? "color:#93A2FF;" : ""}letter-spacing:.04em}
.c h3{margin:14px 0 10px;font-size:34px;font-weight:700;letter-spacing:-.035em}
.c p{margin:0;font-size:18px;line-height:1.45;color:${mute};max-width:300px}
.last{background:${COLORS.blue};border-color:${COLORS.blue};color:#fff}.last b{color:#fff;opacity:.8}.last p{color:#DCE1FF;max-width:230px}
`), path.join(out, `loop-${theme}.png`), 1600, 484, 1);
}

try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* Chrome may still hold its profile; the OS temp cleaner gets it */ }

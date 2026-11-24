// Headless Chrome/Edge screenshots for the brand files and README panels.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

// The Claude desktop app sets __COMPAT_LAYER on child processes; headless Chrome/Edge then silently writes no screenshot.
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.toUpperCase() === "__COMPAT_LAYER") delete env[k];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drip-brand-"));
export function shoot(html, file, width, height, scale = 1) {
  const page = path.join(tmp, `${path.basename(file)}.html`);
  fs.writeFileSync(page, html);
  const profile = fs.mkdtempSync(path.join(tmp, "p-"));
  fs.rmSync(file, { force: true });
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${profile}`,
    "--default-background-color=00000000", `--force-device-scale-factor=${scale}`, `--window-size=${width},${height}`,
    "--virtual-time-budget=10000", `--screenshot=${file}`, pathToFileURL(page).href,
  ], { stdio: "ignore", windowsHide: true, env });
  for (let t = 0; t < 50 && !fs.existsSync(file); t++) execFileSync(process.execPath, ["-e", "setTimeout(()=>{},200)"]);
  if (!fs.existsSync(file)) throw new Error(`Chrome did not write ${file}`);
  console.log("wrote", path.relative(process.cwd(), file));
}
export const page = (body, css = "") => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700;12..96,800&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}svg{display:block}${css}</style>${body}`;
export function cleanup() {
  try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* Chrome may still hold its profile; the OS temp cleaner gets it */ }
}

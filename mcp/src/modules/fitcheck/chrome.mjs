// Screenshots with the user's own Chrome or Edge in headless mode. No Playwright, no downloads.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CANDIDATES = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", "/snap/bin/chromium"],
};

export function findChrome(config) {
  const configured = config?.fitcheck?.chromePath || process.env.DRIP_CHROME;
  if (configured && fs.existsSync(configured)) return configured;
  return (CANDIDATES[process.platform] || CANDIDATES.linux).find((p) => p && fs.existsSync(p)) || null;
}

/** PNG buffer of `url` at width x height. */
export async function screenshot(url, { width = 1440, height = 900, dark = false, waitMs = 4000, config } = {}) {
  const chrome = findChrome(config);
  if (!chrome) throw new Error("Chrome/Edge not found. Install Chrome or set fitcheck.chromePath in .drip/config.json.");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drip-shot-"));
  const out = path.join(dir, "shot.png");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${path.join(dir, "profile")}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${waitMs}`,
    ...(dark ? ["--force-dark-mode", "--blink-settings=preferredColorScheme=0"] : []),
    `--screenshot=${out}`,
    url,
  ];
  await new Promise((resolve, reject) =>
    execFile(chrome, args, { timeout: waitMs + 30000, windowsHide: true }, (err) => (err && !fs.existsSync(out) ? reject(err) : resolve())),
  );
  if (!fs.existsSync(out)) throw new Error("Chrome did not produce a screenshot (is the page reachable?).");
  const buf = fs.readFileSync(out);
  fs.rmSync(dir, { recursive: true, force: true });
  return buf;
}

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

/**
 * The environment to launch the browser with. Windows' __COMPAT_LAYER (the Claude desktop app sets it,
 * e.g. "DetectorsAppHealth", and child processes inherit it) makes headless Chrome/Edge exit without
 * writing a screenshot. Drop it.
 */
export function browserEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.toUpperCase() === "__COMPAT_LAYER") delete env[k];
  return env;
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
    execFile(chrome, args, { timeout: waitMs + 30000, windowsHide: true, env: browserEnv() }, (err) => (err && !fs.existsSync(out) ? reject(err) : resolve())),
  );
  // On Windows the launcher can return before the PNG is fully written: wait until it exists and its size settles.
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const size = fs.existsSync(out) ? fs.statSync(out).size : -1;
    if (size > 0 && size === last) break;
    last = size;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!fs.existsSync(out) || fs.statSync(out).size === 0) throw new Error("Chrome did not produce a screenshot (is the page reachable?).");
  const buf = fs.readFileSync(out);
  // The temp profile can stay locked for a moment after exit on Windows (EPERM); cleanup is best-effort.
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    /* leave it; the OS temp cleaner will */
  }
  return buf;
}

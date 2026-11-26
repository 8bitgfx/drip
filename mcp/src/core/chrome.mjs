// Screenshots with the user's own Chrome or Edge in headless mode. No Playwright, no downloads.
import fs from "node:fs";

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

/** PNG buffer of `url` at width x height (a tab in the shared browser; see core/browser.mjs). */
export async function screenshot(url, { width = 1440, height = 900, dark = false, waitMs = 4000, format = "png", quality = 80, scale = 1, config } = {}) {
  const { openPage, withTab } = await import("./browser.mjs");
  return withTab(config, async (tab) => {
    await openPage(tab, url, { width, height, dark, timeout: Math.max(waitMs, 8000), settleMs: Math.min(waitMs, 1500) });
    const { data } = await tab.s("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality } : {}), clip: { x: 0, y: 0, width, height, scale } });
    return Buffer.from(data, "base64");
  });
}

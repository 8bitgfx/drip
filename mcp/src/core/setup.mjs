// What's missing on this machine, as a short note for drip_start. Kept out of doctor.mjs (which imports the tool registry)
// so the workflow module can use it without an import cycle.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findChrome } from "./browser.mjs";
import { homeDripDir } from "./paths.mjs";
import { vendorResolve } from "./vendor.mjs";
import { loadConfig } from "./config.mjs";

export const vendor0 = () => path.join(process.env.DRIP_HOME || path.join(os.homedir(), ".drip"), "vendor");
export const CHROME_GET = "Install Google Chrome (google.com/chrome) or Microsoft Edge (microsoft.com/edge), or point Drip at one: set DRIP_CHROME or fitcheck.chromePath in .drip/config.json.";

export const FIX_VENDOR = ["axe-core", "svgo"];

const mockstudioReady = () => fs.existsSync(path.join(vendor0(), "mockstudio", "dist", "index.html"));

/** What is missing here: [{ id, what, fix, installable }] (Chrome and Blender are only explained, never installed). */
export function missingPieces({ config, chrome: chromeIn } = {}) {
  const out = [];
  const chrome = chromeIn === undefined ? findChrome(config || loadConfig()) : chromeIn;
  if (!chrome) out.push({ id: "chrome", what: "Chrome or Edge (screenshots, fit checks and previews need it)", fix: CHROME_GET, installable: false });
  const gone = FIX_VENDOR.filter((n) => !vendorResolve(n));
  if (gone.length) out.push({ id: "vendor", what: `${gone.join(" and ")} (accessibility and SVG checks)`, fix: "drip doctor --fix --yes", installable: true, names: gone });
  if (!mockstudioReady()) out.push({ id: "mockstudio", what: "MockStudio (device mockups)", fix: "drip doctor --fix --yes", installable: true });
  return out;
}

const setupFile = () => path.join(process.env.DRIP_HOME || homeDripDir, "setup.json");

function readSetup() {
  try {
    return JSON.parse(fs.readFileSync(setupFile(), "utf8"));
  } catch {
    return {};
  }
}

/**
 * One to three lines on what is missing on this machine, for drip_start to show. Shown once per machine for a given
 * set of missing pieces (cached in ~/.drip/setup.json); an empty string when nothing is missing or it was already shown.
 */
export function setupNotes(config, { chrome, force = false } = {}) {
  const missing = missingPieces({ config, chrome });
  const key = missing.map((m) => m.id).sort().join(",");
  const prev = readSetup();
  if (!force && prev.shown === key) return "";
  try {
    fs.mkdirSync(path.dirname(setupFile()), { recursive: true });
    fs.writeFileSync(setupFile(), JSON.stringify({ shown: key, at: new Date().toISOString(), missing: missing.map((m) => m.id) }, null, 2));
  } catch {
    /* read-only home: the note just shows again next time */
  }
  if (!missing.length) return "";
  const lines = [`SETUP: ${missing.length === 1 ? "one thing is" : `${missing.length} things are`} missing on this machine.`];
  const chromeGone = missing.find((m) => m.id === "chrome");
  if (chromeGone) lines.push(`- ${chromeGone.what}: ${chromeGone.fix} Do this before the first visual step.`);
  const rest = missing.filter((m) => m.id !== "chrome");
  if (rest.length) lines.push(`- Optional: ${rest.map((m) => m.what).join("; ")}. Run "drip doctor --fix --yes" (installs them; ask the user first).`);
  return lines.slice(0, 3).join("\n");
}

/**
 * `drip doctor --fix`. Without `confirm` it only says what it would install. With it, installs MockStudio and the npm
 * vendor packages that are missing. Never installs Chrome, Edge or Blender: it says where to get them.
 * `installers` ({ vendor, mockstudio }) can be injected for tests.
 */

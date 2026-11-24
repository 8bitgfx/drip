// `drip doctor`: what is installed, what is missing, how to fix it. Names of API keys only, never values.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findChrome } from "./browser.mjs";
import { loadConfig } from "./config.mjs";
import { KEY_ENV, keyStatus } from "./keys.mjs";
import { homeDripDir, pluginRoot, projectDir, projectDripDir } from "./paths.mjs";
import { collectTools } from "./registry.mjs";
import { executeCode } from "./codemode/execute.mjs";
import { VENDOR_DEPS, vendorDir, vendorResolve } from "./vendor.mjs";

/** First executable called one of `names` on PATH, or null. */
const vendor0 = () => path.join(process.env.DRIP_HOME || path.join(os.homedir(), ".drip"), "vendor");

export function onPath(names) {
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").concat("") : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter).filter(Boolean)) {
    for (const n of names) {
      for (const e of exts) {
        const f = path.join(dir, n + e);
        try {
          if (fs.statSync(f).isFile()) return f;
        } catch {
          /* not here */
        }
      }
    }
  }
  return null;
}

/** Blender: PATH, then the usual install folders. */
export function findBlender() {
  const viaPath = onPath(["blender"]);
  if (viaPath) return viaPath;
  const found = [];
  const scan = (base, rel) => {
    try {
      for (const d of fs.readdirSync(base)) found.push(path.join(base, d, rel));
    } catch {
      /* no such folder */
    }
  };
  if (process.platform === "win32") {
    for (const pf of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], "C:\\Program Files"].filter(Boolean)) scan(path.join(pf, "Blender Foundation"), "blender.exe");
  } else if (process.platform === "darwin") {
    found.push("/Applications/Blender.app/Contents/MacOS/Blender");
  } else {
    found.push("/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender", "/opt/blender/blender", path.join(os.homedir(), "blender", "blender"));
  }
  return found.find((f) => fs.existsSync(f)) || null;
}

const check = (id, label, status, detail, fix) => ({ id, label, status, detail, ...(fix ? { fix } : {}) });

const CHROME_GET = "Install Google Chrome (google.com/chrome) or Microsoft Edge (microsoft.com/edge), or point Drip at one: set DRIP_CHROME or fitcheck.chromePath in .drip/config.json.";
const BLENDER_GET = "download it from blender.org/download and put it on PATH.";

/** `config` and `chrome` can be injected (tests); otherwise they are looked up. */
export async function runDoctor({ hostsDoctor, config: cfg, chrome: chromeIn } = {}) {
  const checks = [];
  const major = Number(process.versions.node.split(".")[0]);
  checks.push(major >= 22 ? check("node", "Node.js", "ok", `v${process.versions.node}`) : check("node", "Node.js", "fail", `v${process.versions.node} (Drip needs 22 or newer)`, "Install Node 22+ from nodejs.org."));

  const config = cfg || loadConfig();
  const chrome = chromeIn === undefined ? findChrome(config) : chromeIn;
  checks.push(chrome ? check("chrome", "Chrome / Edge", "ok", chrome) : check("chrome", "Chrome / Edge", "fail", "not found (screenshots, fit checks and previews need it)", CHROME_GET));

  const blender = findBlender();
  checks.push(blender ? check("blender", "Blender (optional)", "ok", blender) : check("blender", "Blender (optional)", "info", "not found (only 3D renders need it)", "Blender is optional: " + BLENDER_GET));

  const uvx = onPath(["uvx"]);
  const ms = path.join(vendor0(), "mockstudio", "dist", "index.html");
  checks.push(fs.existsSync(ms) ? check("mockstudio", "MockStudio (device mockups)", "ok", path.dirname(path.dirname(ms))) : check("mockstudio", "MockStudio (device mockups)", "info", "not installed (mockup_render needs it)", "drip doctor --fix --yes (or drip doctor --install mockstudio)"));
  checks.push(uvx ? check("uvx", "uvx (optional)", "ok", uvx) : check("uvx", "uvx (optional)", "info", "not found (only the dry-lint check uses it)", "Install uv from docs.astral.sh/uv."));

  const vendor = vendorDir();
  const installed = Object.keys(VENDOR_DEPS).filter((n) => vendorResolve(n));
  checks.push(check("vendor", "Optional dependencies", "info", `${installed.length ? installed.join(", ") : "none installed"} (in ${vendor})`, `Available: ${Object.keys(VENDOR_DEPS).join(", ")}. Install the recommended ones with: drip doctor --fix --yes; any one with: drip doctor --install <name>`));

  const names = Object.keys(KEY_ENV);
  const keys = keyStatus(names);
  const set = keys.filter((k) => k.set).map((k) => k.name);
  checks.push(check("keys", "API keys (optional)", "info", set.length ? `set: ${set.join(", ")}; not set: ${names.filter((n) => !set.includes(n)).join(", ") || "none"}` : `none set (${names.join(", ")})`, "Run the keys_open tool, or set the environment variables."));

  const proj = projectDir();
  const dripDir = projectDripDir();
  const hasDrip = fs.existsSync(dripDir);
  checks.push(check("project", "Project", "ok", `${proj}${hasDrip ? " (.drip folder present)" : " (no .drip folder yet; created on first use)"}`));
  checks.push(check("plugin", "Plugin root", fs.existsSync(path.join(pluginRoot, "skills")) ? "ok" : "warn", pluginRoot, "Set the plugin location if skills are missing."));
  checks.push(check("home", "User folder", "ok", homeDripDir));

  let state = "no task";
  try {
    const f = path.join(dripDir, "state.json");
    if (fs.existsSync(f)) {
      const raw = JSON.parse(fs.readFileSync(f, "utf8"));
      const n = Object.keys(raw.tasks || (raw.task ? { x: 1 } : {})).length;
      state = `${n} open task${n === 1 ? "" : "s"}`;
    }
  } catch {
    state = "state.json is unreadable";
  }
  checks.push(check("state", "Task state", state.includes("unreadable") ? "warn" : "ok", state, state.includes("unreadable") ? "Move .drip/state.json aside; Drip starts fresh." : undefined));

  checks.push(check("tools", "Tool registry", "ok", `${collectTools().size} tools`));
  try {
    const r = await executeCode("return 1 + 1", { timeoutMs: 15000 });
    checks.push(r.ok && r.value === 2 ? check("codemode", "Code Mode sandbox", "ok", `QuickJS, ${r.ms} ms`) : check("codemode", "Code Mode sandbox", "warn", r.error?.message || "unexpected result"));
  } catch (e) {
    checks.push(check("codemode", "Code Mode sandbox", "warn", String(e?.message || e)));
  }
  if (hostsDoctor) {
    try {
      for (const c of (await hostsDoctor()) || []) checks.push(c);
    } catch (e) {
      checks.push(check("hosts", "Host integrations", "warn", String(e?.message || e)));
    }
  }
  const failed = checks.filter((c) => c.status === "fail");
  return { ok: failed.length === 0, checks, summary: failed.length ? `${failed.length} problem${failed.length === 1 ? "" : "s"} to fix` : "Everything Drip needs is here." };
}

export function formatDoctor(r) {
  const mark = { ok: "ok  ", warn: "warn", fail: "FAIL", info: "info" };
  const lines = [];
  for (const c of r.checks) {
    lines.push(`[${mark[c.status] || c.status}] ${c.label}: ${c.detail}`);
    if (c.fix && c.status !== "ok") lines.push(`       fix: ${c.fix}`);
  }
  lines.push("", r.summary);
  return lines.join("\n");
}

// ---- first-use setup: what is missing on this machine, and the fix with consent ----

/** The optional pieces `drip doctor --fix` installs (npm packages into ~/.drip/vendor, plus MockStudio). */
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
export async function doctorFix({ confirm = false, config, chrome, log = () => {}, installers } = {}) {
  const missing = missingPieces({ config, chrome });
  const inst = installers || {};
  const installVendorFn = inst.vendor || (await import("./vendor.mjs")).installVendor;
  const installMockFn = inst.mockstudio || (await import("../modules/studio/mockup.mjs")).installMockstudio;
  const manual = missing.filter((m) => !m.installable).map((m) => `${m.what}: ${m.fix}`);
  const blender = findBlender() ? [] : [`Blender (optional): ${BLENDER_GET}`];
  const todo = [];
  for (const m of missing) {
    if (m.id === "vendor") for (const n of m.names) todo.push(`npm package ${n} into ${vendorDir()}`);
    if (m.id === "mockstudio") todo.push("MockStudio into ~/.drip/vendor (git clone and build, a few minutes)");
  }
  if (!confirm) return { ok: true, confirmed: false, installed: [], failed: [], todo, manual: [...manual, ...blender] };
  const installed = [];
  const failed = [];
  for (const m of missing) {
    if (m.id === "vendor") {
      for (const n of m.names) {
        try {
          log(`Installing ${n} ...`);
          await installVendorFn(n);
          installed.push(n);
        } catch (e) {
          failed.push(`${n}: ${e.message}`);
        }
      }
    } else if (m.id === "mockstudio") {
      try {
        log("Installing MockStudio ...");
        const r = await installMockFn(log);
        if (r && r.ok === false) failed.push("mockstudio: installed but its build is missing");
        else installed.push("mockstudio");
      } catch (e) {
        failed.push(`mockstudio: ${e.message}`);
      }
    }
  }
  return { ok: failed.length === 0, confirmed: true, installed, failed, todo, manual: [...manual, ...blender] };
}

export function formatFix(r) {
  const lines = [];
  if (!r.confirmed) {
    lines.push(r.todo.length ? `Drip would install:\n${r.todo.map((t) => `  - ${t}`).join("\n")}\nRun again with --yes to do it: drip doctor --fix --yes` : "Nothing for Drip to install.");
  } else {
    if (r.installed.length) lines.push(`Installed: ${r.installed.join(", ")}.`);
    if (r.failed.length) lines.push(`Failed:\n${r.failed.map((t) => `  - ${t}`).join("\n")}`);
    if (!r.installed.length && !r.failed.length) lines.push("Nothing for Drip to install.");
  }
  if (r.manual.length) lines.push(`Install these yourself (Drip never installs them):\n${r.manual.map((t) => `  - ${t}`).join("\n")}`);
  return lines.join("\n");
}

/**
 * Before `drip install --agent X`: the full doctor checks. Returns { ok, failures, text }; each failure names its fix.
 * A missing Chrome/Edge is a failure, not a hint: every visual step needs it.
 */
export async function installPreflight({ config, chrome } = {}) {
  const r = await runDoctor({ config, chrome });
  const failures = r.checks.filter((c) => c.status === "fail");
  const warns = r.checks.filter((c) => c.status === "warn");
  const lines = [];
  for (const c of failures) lines.push(`${c.label} missing or broken: ${c.detail}\n  fix: ${c.fix || "see drip doctor"}`);
  for (const c of warns) lines.push(`warning: ${c.label}: ${c.detail}${c.fix ? ` (fix: ${c.fix})` : ""}`);
  return { ok: failures.length === 0, failures, checks: r.checks, text: lines.join("\n") };
}

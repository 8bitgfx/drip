// Optional heavy dependencies live in ~/.drip/vendor (installed on request with `drip doctor --install <name>`),
// never in the bundle. Code that wants one calls vendorImport(name): it returns the module, or null when
// the dependency is not installed (the caller then explains how to enable it).
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { homeDripDir } from "./paths.mjs";

/** Names accepted by `drip doctor --install`: short name -> npm package. Add new optional dependencies here. */
export const VENDOR_DEPS = {
  "axe-core": "axe-core",
  svgo: "svgo",
  resvg: "@resvg/resvg-js",
  "ts-morph": "ts-morph",
  fontkit: "fontkit",
};

export const vendorDir = () => path.join(process.env.DRIP_HOME || homeDripDir, "vendor");

/** Resolve an installed optional dependency to its entry file, or null. */
export function vendorResolve(name) {
  const pkg = VENDOR_DEPS[name] || name;
  const dir = vendorDir();
  if (!fs.existsSync(path.join(dir, "node_modules", pkg))) return null;
  try {
    return createRequire(path.join(dir, "package.json")).resolve(pkg);
  } catch {
    try {
      // ESM-only packages have no "require" entry: read package.json for the entry point.
      const pj = JSON.parse(fs.readFileSync(path.join(dir, "node_modules", pkg, "package.json"), "utf8"));
      const main = typeof pj.exports === "string" ? pj.exports : pj.exports?.["."]?.import || pj.exports?.["."]?.default || pj.module || pj.main || "index.js";
      return path.join(dir, "node_modules", pkg, typeof main === "string" ? main : "index.js");
    } catch {
      return null;
    }
  }
}

/** Import an optional dependency from ~/.drip/vendor; null if it is not installed. */
export async function vendorImport(name) {
  const file = vendorResolve(name);
  if (!file) return null;
  return import(pathToFileURL(file).href);
}

function npmCommand() {
  // Prefer the npm that ships next to this Node: runs without a shell on every platform.
  const bin = path.dirname(process.execPath);
  for (const p of [path.join(bin, "node_modules", "npm", "bin", "npm-cli.js"), path.join(bin, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")]) {
    if (fs.existsSync(p)) return { file: process.execPath, pre: [p], shell: false };
  }
  return { file: process.platform === "win32" ? "npm.cmd" : "npm", pre: [], shell: process.platform === "win32" };
}

/** Install one allowlisted optional dependency into ~/.drip/vendor. */
export function installVendor(name) {
  const pkg = VENDOR_DEPS[name];
  if (!pkg) return Promise.reject(new Error(`Unknown optional dependency "${name}". Available: ${Object.keys(VENDOR_DEPS).join(", ")}.`));
  const dir = vendorDir();
  fs.mkdirSync(dir, { recursive: true });
  const pj = path.join(dir, "package.json");
  if (!fs.existsSync(pj)) fs.writeFileSync(pj, JSON.stringify({ name: "drip-vendor", private: true, description: "Optional dependencies installed by drip doctor --install" }, null, 2));
  const cmd = npmCommand();
  return new Promise((resolve, reject) => {
    execFile(cmd.file, [...cmd.pre, "install", "--prefix", dir, "--no-audit", "--no-fund", pkg], { shell: cmd.shell, timeout: 300000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`npm install ${pkg} failed: ${String(stderr || err.message).trim().split("\n").slice(-4).join(" ")}`));
      else resolve({ name, package: pkg, dir });
    });
  });
}

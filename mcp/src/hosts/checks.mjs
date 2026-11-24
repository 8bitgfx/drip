// Doctor pieces every host shares.
import fs from "node:fs";
import { hookFile, serverFile } from "./common.mjs";

export const check = (id, status, detail, fix) => ({ id, status, detail, ...(fix ? { fix } : {}) });

/** Node, the bundle, the hook adapters. */
export function baseChecks(o, hookNames = []) {
  const out = [];
  const major = Number(process.versions.node.split(".")[0]);
  out.push(major >= 22 ? check("node", "ok", `Node ${process.versions.node}`) : check("node", "fail", `Node ${process.versions.node}; Drip needs 22+`, "Install Node 22 or newer."));
  const srv = serverFile({ ...o, template: false });
  out.push(fs.existsSync(srv) ? check("server", "ok", srv) : check("server", "fail", `missing ${srv}`, "Run: cd mcp && npm ci && npm run build"));
  for (const h of hookNames) {
    const f = hookFile({ ...o, template: false }, h);
    out.push(fs.existsSync(f) ? check(`hook-${h}`, "ok", f) : check(`hook-${h}`, "fail", `missing ${f}`));
  }
  return out;
}

export function summarize(host, checks, extra = {}) {
  const bad = checks.filter((c) => c.status === "fail");
  return { host, ok: bad.length === 0, summary: bad.length ? `${bad.length} problem${bad.length === 1 ? "" : "s"}: ${bad.map((b) => b.id).join(", ")}` : "ready", checks, ...extra };
}

/** Throw unless the server bundle exists (install would point a host at nothing). */
export function requireBuilt(o) {
  if (o.template) return;
  if (!fs.existsSync(serverFile(o))) throw new Error(`Drip's server bundle is missing (${serverFile(o)}). Run: cd mcp && npm ci && npm run build`);
}

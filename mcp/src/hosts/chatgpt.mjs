// ChatGPT desktop / Work: a desktop-only plugin (local stdio MCP + skills + Codex-format hooks).
// install builds the self-contained plugin folder in ~/.drip/hosts/chatgpt-plugin and adds a local marketplace entry in
// ~/.agents/plugins/marketplace.json; you then install it from the ChatGPT desktop app (Plugins). Built from
// https://developers.openai.com/plugins/deploy/desktop-only and /build/plugins; not verified in the real app.
import fs from "node:fs";
import path from "node:path";
import { baseChecks, check, requireBuilt, summarize } from "./checks.mjs";
import { Changes, readConfig, undoManifest } from "./common.mjs";
import { copyRuntime, openaiPluginFiles, writeJsonFile } from "./packages.mjs";

export const meta = {
  id: "chatgpt",
  label: "ChatGPT Desktop / Work",
  kind: "native",
  summary: "ChatGPT desktop-only plugin with the local Drip server, skills and hooks. Needs local execution; web ChatGPT is not supported.",
  capabilities: { mcpTools: "supported", imageResults: "unknown", skills: "supported", writeHook: "supported", stopHook: "supported", sessionStart: "supported", criticSubagent: "unknown", mcpApps: "unknown" },
};

const dirs = (o) => ({ plugin: path.join(o.home, ".drip", "hosts", "chatgpt-plugin"), market: path.join(o.home, ".agents", "plugins", "marketplace.json") });

export const marketplaceEntry = (rel) => ({ name: "drip", source: { source: "local", path: rel }, policy: { installation: "AVAILABLE" }, category: "Design" });

export async function install(o) {
  requireBuilt(o);
  const d = dirs(o);
  const ch = new Changes(o, meta.id);
  ch.note(`build plugin folder ${d.plugin}`);
  if (!o.dryRun) {
    copyRuntime(o.pluginRoot, d.plugin, "chatgpt");
    for (const [rel, data] of Object.entries(openaiPluginFiles(o, o.pluginRoot))) writeJsonFile(path.join(d.plugin, rel), data);
    fs.writeFileSync(path.join(d.plugin, ".drip-managed"), "Built by drip install --agent chatgpt. Remove with: drip uninstall --agent chatgpt\n");
  }
  ch.track({ kind: "dir", path: d.plugin });

  const rel = `./${path.relative(o.home, d.plugin).split(path.sep).join("/")}`; // marketplace root = the folder that holds .agents/
  const market = readConfig(d.market);
  market.name = market.name || "local";
  market.plugins = (market.plugins || []).filter((p) => p.name !== "drip");
  market.plugins.push(marketplaceEntry(rel));
  ch.backup(d.market);
  ch.write(d.market, `${JSON.stringify(market, null, 2)}\n`);
  ch.track({ kind: "entry", path: d.market, name: "drip", handler: "market" });
  ch.save();
  return {
    ok: true,
    host: meta.id,
    dryRun: o.dryRun,
    plugin: d.plugin,
    actions: ch.actions,
    warnings: [
      "Open the ChatGPT desktop app, go to Plugins and install Drip from the local marketplace (a plugin with a local MCP server is desktop-only and can only be mentioned in threads that run locally).",
      "Plugin hooks work only for manually installed desktop plugins and need your trust in the app before they run.",
      "The plugin's marketplace entry and manifest follow the published docs; they were not run in the real app.",
    ],
    restart: "Install the plugin in the ChatGPT desktop app, then start a new local thread.",
  };
}

export async function uninstall(o) {
  const r = undoManifest(o, meta.id, {
    market: (e) => {
      if (!fs.existsSync(e.path)) return false;
      const m = readConfig(e.path);
      const n = (m.plugins || []).length;
      m.plugins = (m.plugins || []).filter((p) => p.name !== "drip");
      if (m.plugins.length === n) return false;
      if (!o.dryRun) fs.writeFileSync(e.path, `${JSON.stringify(m, null, 2)}\n`);
      return true;
    },
  });
  return { ok: true, host: meta.id, dryRun: o.dryRun, removed: r.removed, note: r.removed.length ? "Uninstall the plugin in the ChatGPT desktop app too if you installed it there." : "Nothing of Drip's was found." };
}

export async function doctor(o) {
  const d = dirs(o);
  const checks = baseChecks(o, ["codex"]);
  checks.push(fs.existsSync(path.join(d.plugin, "plugin.json")) ? check("plugin", "ok", d.plugin) : check("plugin", "warn", "plugin folder not built", "Run: drip install --agent chatgpt"));
  try {
    const m = readConfig(d.market);
    checks.push((m.plugins || []).some((p) => p.name === "drip") ? check("marketplace", "ok", d.market) : check("marketplace", "warn", "Drip is not in the local marketplace"));
  } catch (e) {
    checks.push(check("marketplace", "fail", e.message));
  }
  checks.push(check("web", "info", "ChatGPT in the browser cannot run Drip's local engine; only the desktop app is supported"));
  return summarize(meta.id, checks);
}

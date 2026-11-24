// Claude Desktop / Cowork. Two ways in, both local:
//  1. install: add Drip to claude_desktop_config.json (chat and Cowork get the MCP tools).
//  2. `npm run build:hosts -- --mcpb`: a drip.mcpb Desktop Extension (double-click / Settings > Extensions) with the server bundled.
// Claude Desktop chat has no hooks or subagents, so the write/stop/critic gates are unsupported there. Cowork can load the Claude Code
// plugin (skills, commands, local MCP, sub-agents, hooks), which is the existing .claude-plugin: see docs/HOSTS.md.
// Never edits the real config unless called with the real home: tests pass a temp home.
import fs from "node:fs";
import path from "node:path";
import { baseChecks, check, requireBuilt, summarize } from "./checks.mjs";
import { Changes, fwd, isDripServer, readConfig, serverFile, setOwned, undoManifest, writeConfig, removeJsonEntry } from "./common.mjs";

export const meta = {
  id: "claude-desktop",
  label: "Claude Desktop / Cowork",
  kind: "native",
  summary: "Claude Desktop chat and Cowork: local MCP via claude_desktop_config.json or a .mcpb extension. Gates need the Cowork plugin; plain chat has none.",
  capabilities: { mcpTools: "supported", imageResults: "unknown", skills: "partial", writeHook: "unsupported", stopHook: "unsupported", sessionStart: "unsupported", criticSubagent: "partial", mcpApps: "unknown" },
};

/** Where claude_desktop_config.json is. On Windows the Store (MSIX) build reads a redirected copy under Packages. */
export function configCandidates(o) {
  const { platform, env, home } = o;
  if (platform === "win32") {
    const appdata = env.APPDATA || path.join(home, "AppData", "Roaming");
    const local = env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const out = [];
    try {
      const pk = path.join(local, "Packages");
      for (const d of fs.readdirSync(pk)) if (/^Claude_/i.test(d)) out.push(path.join(pk, d, "LocalCache", "Roaming", "Claude", "claude_desktop_config.json"));
    } catch {
      /* no Packages folder */
    }
    out.push(path.join(appdata, "Claude", "claude_desktop_config.json"));
    return out;
  }
  if (platform === "darwin") return [path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")];
  const xdg = env.XDG_CONFIG_HOME ? path.resolve(env.XDG_CONFIG_HOME) : path.join(home, ".config");
  return [path.join(xdg, "Claude", "claude_desktop_config.json")];
}

/** The file to edit: an existing one if there is one (MSIX first), else the standard location. */
export function configFile(o) {
  const c = configCandidates(o);
  return c.find((f) => fs.existsSync(f)) || c.find((f) => fs.existsSync(path.dirname(f))) || c[c.length - 1];
}

export function mcpEntry(o) {
  const env = { CLAUDE_PLUGIN_ROOT: fwd(o.pluginRoot), DRIP_HOST: "claude-desktop" };
  if (o.project) env.DRIP_PROJECT_DIR = fwd(o.project);
  return { command: o.node, args: [serverFile(o)], env };
}

export async function install(o) {
  requireBuilt(o);
  const file = configFile(o);
  const ch = new Changes(o, meta.id);
  const warnings = [];
  const cfg = readConfig(file);
  cfg.mcpServers = cfg.mcpServers || {};
  if (setOwned(cfg.mcpServers, "drip", mcpEntry(o), isDripServer) === "conflict") warnings.push(`${file} already has a "drip" server that is not Drip's; left it alone.`);
  else {
    writeConfig(ch, file, cfg);
    ch.track({ kind: "entry", path: file, name: "drip", handler: "mcp" });
  }
  ch.save();
  if (!o.project) warnings.push('Claude Desktop does not tell a server which project you are in. Set "env": { "DRIP_PROJECT_DIR": "<your project folder>" } on the drip entry (or install with a project folder), otherwise Drip works in the folder Claude Desktop starts it in.');
  warnings.push("Claude Desktop chat has no hooks or subagents: the write gate, stop gate and independent critic are unsupported in plain chat. In Cowork, install the Drip plugin (the .claude-plugin in this repo) to get skills, sub-agents and hooks.");
  warnings.push('Claude Desktop starts the server with "node" from PATH. If Node is not on the PATH of GUI apps, edit the entry to the full path of node.');
  return { ok: true, host: meta.id, dryRun: o.dryRun, configFile: file, actions: ch.actions, warnings, restart: "Quit Claude Desktop completely (tray icon too) and start it again." };
}

export async function uninstall(o) {
  const r = undoManifest(o, meta.id, { mcp: (e) => removeJsonEntry(e.path, (cfg) => [cfg.mcpServers, "drip"], o.dryRun) });
  if (!r.found) {
    for (const f of configCandidates(o)) if (removeJsonEntry(f, (cfg) => [cfg.mcpServers, "drip"], o.dryRun)) r.removed.push(`${f} (drip entry)`);
  }
  return { ok: true, host: meta.id, dryRun: o.dryRun, removed: r.removed, note: r.removed.length ? "Only the drip server entry was removed. A backup of the config is next to it (*.drip-backup-*)." : "Nothing of Drip's was found." };
}

export async function doctor(o) {
  const checks = baseChecks(o, []);
  const cands = configCandidates(o);
  const found = cands.filter((f) => fs.existsSync(f));
  checks.push(found.length ? check("host", "ok", `config: ${found.join(", ")}`) : check("host", "info", `no claude_desktop_config.json yet (looked in ${cands.join(", ")})`));
  for (const f of found) {
    try {
      const entry = readConfig(f).mcpServers?.drip;
      if (!entry) checks.push(check("mcp", "warn", `Drip is not in ${f}`, "Run: drip install --agent claude-desktop"));
      else if (!isDripServer(entry)) checks.push(check("mcp", "warn", `${f} has a different server named drip`));
      else checks.push(fs.existsSync(entry.args?.[0] || "") ? check("mcp", "ok", `Drip is in ${f}`) : check("mcp", "fail", `${f} points at a missing file: ${entry.args?.[0]}`));
    } catch (e) {
      checks.push(check("config", "fail", e.message));
    }
  }
  if (found.length > 1) checks.push(check("msix", "info", "Both a Store (MSIX) and a classic config exist; the Store app reads the one under Packages\\Claude_*"));
  checks.push(check("gates", "info", "Plain Claude Desktop chat: no hooks, no subagents (write, stop and critic gates unsupported). Cowork plugin: skills, sub-agents, hooks (hook firing on Windows reported unreliable)."));
  return summarize(meta.id, checks);
}

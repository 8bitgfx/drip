// OpenCode: ~/.config/opencode/{opencode.json, plugins/drip.js, agents/drip-critic.md, skills/, AGENTS.md}.
// OpenCode's docs exist in two generations (V1 `mcp.<name>`, V2 `mcp.servers.<name>`); the installer follows the shape already
// in the user's config, defaults to V1, and only the V1 plugin API is implemented. Built from the docs; not verified in the real app.
import fs from "node:fs";
import path from "node:path";
import { adaptText, criticMarkdown, hostRules } from "./adapt.mjs";
import { baseChecks, check, requireBuilt, summarize } from "./checks.mjs";
import { Changes, fwd, hookFile, installSkills, isDripServer, readConfig, serverFile, undoManifest, writeBlockFile, writeConfig, removeJsonEntry } from "./common.mjs";

export const meta = {
  id: "opencode",
  label: "OpenCode",
  kind: "native",
  summary: "OpenCode: local MCP, skills, a plugin that gates UI writes, read-only critic subagent. No stop gate (plugins cannot block turn end).",
  capabilities: { mcpTools: "supported", imageResults: "unknown", skills: "supported", writeHook: "supported", stopHook: "unsupported", sessionStart: "unsupported", criticSubagent: "supported", mcpApps: "unknown" },
};

const dirs = (o) => {
  const base = o.env.XDG_CONFIG_HOME ? path.resolve(o.env.XDG_CONFIG_HOME) : path.join(o.home, ".config");
  const oc = path.join(base, "opencode");
  return { oc, json: path.join(oc, "opencode.json"), jsonc: path.join(oc, "opencode.jsonc"), plugin: path.join(oc, "plugins", "drip.js"), agents: path.join(oc, "agents"), skills: path.join(oc, "skills"), agentsMd: path.join(oc, "AGENTS.md") };
};

export function serverEntry(o) {
  return { type: "local", command: [o.node, serverFile(o)], environment: { CLAUDE_PLUGIN_ROOT: fwd(o.pluginRoot), DRIP_HOST: "opencode" }, enabled: true };
}

export function variantOf(cfg, forced) {
  if (forced === "v1" || forced === "v2") return forced;
  return cfg?.mcp?.servers && typeof cfg.mcp.servers === "object" ? "v2" : "v1";
}

/** The plugin file OpenCode loads: a thin shim that runs Drip's hook adapter and throws to block a write. */
export function pluginSource(o) {
  const adapter = hookFile(o, "opencode");
  return `// Drip for OpenCode (installed by drip; remove with: drip uninstall). Gates UI writes through Drip's hook adapter.
import { spawnSync } from "node:child_process";

const ADAPTER = ${JSON.stringify(adapter)};
const WRITE_TOOLS = /^(write|edit|multiedit|patch|apply_patch)$/i;

function call(kind, payload) {
  const r = spawnSync(${JSON.stringify(o.node)}, [ADAPTER, kind], { input: JSON.stringify(payload), encoding: "utf8", timeout: 25000, windowsHide: true });
  try {
    return r.stdout && r.stdout.trim() ? JSON.parse(r.stdout) : {};
  } catch {
    return {};
  }
}

export const DripPlugin = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => {
    if (!WRITE_TOOLS.test(input.tool || "")) return;
    const r = call("pre-write", { tool: input.tool, args: output.args, directory, sessionID: input.sessionID });
    if (r.block) throw new Error(r.reason);
  },
  "tool.execute.after": async (input, output) => {
    if (!WRITE_TOOLS.test(input.tool || "")) return;
    const r = call("post-write", { tool: input.tool, args: input.args || output.args || {}, directory, sessionID: input.sessionID });
    if (r.context && typeof output.output === "string") output.output += "\\n\\n" + r.context;
  },
});
`;
}

export async function install(o) {
  requireBuilt(o);
  const d = dirs(o);
  const ch = new Changes(o, meta.id);
  const warnings = [];
  let cfgFile = d.json;
  if (!fs.existsSync(d.json) && fs.existsSync(d.jsonc)) {
    warnings.push(`${d.jsonc} exists (JSON with comments). Drip does not rewrite it; add this to it by hand: "mcp": { "drip": ${JSON.stringify(serverEntry(o))} }`);
    cfgFile = null;
  }
  let variant = "v1";
  if (cfgFile) {
    const cfg = readConfig(cfgFile);
    variant = variantOf(cfg, o.variant);
    const holder = variant === "v2" ? ((cfg.mcp = cfg.mcp || {}), (cfg.mcp.servers = cfg.mcp.servers || {})) : (cfg.mcp = cfg.mcp || {});
    if (holder.drip !== undefined && !isDripServer({ command: holder.drip?.command?.[0], args: holder.drip?.command?.slice(1) })) warnings.push(`${cfgFile} already has an mcp entry named drip that is not Drip's; left it alone.`);
    else {
      if (variant === "v2") {
        const { type, command, environment } = serverEntry(o);
        holder.drip = { type, command, environment };
      } else holder.drip = serverEntry(o);
      writeConfig(ch, cfgFile, cfg);
      ch.track({ kind: "entry", path: cfgFile, name: "drip", handler: "mcp", variant });
    }
  }
  if (variant === "v2") warnings.push("Your OpenCode config uses the V2 layout (mcp.servers). Drip's write-gate plugin is written for the V1 plugin API and was not built for V2: MCP, skills and the critic work, UI writes are not gated.");
  else {
    ch.write(d.plugin, pluginSource(o));
    ch.track({ kind: "file", path: d.plugin });
  }
  const skills = installSkills(ch, d.skills, (t) => adaptText(t, "opencode"));
  const critic = path.join(d.agents, "drip-critic.md");
  ch.write(critic, criticMarkdown("opencode", o.pluginRoot));
  ch.track({ kind: "file", path: critic });
  writeBlockFile(ch, d.agentsMd, hostRules("opencode", "partial"), "md");
  ch.save();
  warnings.push("OpenCode plugins cannot block the end of a turn: the stop gate is not available. The rule file tells the agent to call fitcheck_done and drip_end itself.");
  return { ok: true, host: meta.id, dryRun: o.dryRun, variant, actions: ch.actions, skills: skills.length, warnings, restart: "Restart OpenCode to load the MCP server, plugin, agent and skills." };
}

export async function uninstall(o) {
  const r = undoManifest(o, meta.id, {
    mcp: (e) => removeJsonEntry(e.path, (cfg) => (e.variant === "v2" ? [cfg.mcp?.servers, "drip"] : [cfg.mcp, "drip"]), o.dryRun, (v) => isDripServer({ command: v?.command?.[0], args: v?.command?.slice(1) })),
  });
  return { ok: true, host: meta.id, dryRun: o.dryRun, removed: r.removed, note: r.removed.length ? "Only entries Drip added were removed. Backups of changed files are next to them (*.drip-backup-*)." : "Nothing of Drip's was found." };
}

export async function doctor(o) {
  const d = dirs(o);
  const checks = baseChecks(o, ["opencode"]);
  checks.push(fs.existsSync(d.oc) ? check("host", "ok", `${d.oc} found`) : check("host", "info", `${d.oc} not found (OpenCode is not set up on this machine)`));
  let cfg = {};
  try {
    cfg = readConfig(d.json);
  } catch (e) {
    checks.push(check("config", "fail", e.message));
  }
  const v = variantOf(cfg);
  const entry = v === "v2" ? cfg.mcp?.servers?.drip : cfg.mcp?.drip;
  checks.push(entry ? check("mcp", "ok", `Drip MCP server is in opencode.json (${v} layout)`) : check("mcp", "warn", "Drip MCP server is not in opencode.json", "Run: drip install --agent opencode"));
  checks.push(fs.existsSync(d.plugin) ? check("plugin", "ok", d.plugin) : check("plugin", "warn", "write-gate plugin is not installed"));
  checks.push(fs.existsSync(path.join(d.skills, "drip", "SKILL.md")) ? check("skills", "ok", `skills in ${d.skills}`) : check("skills", "warn", "Drip skills are not installed"));
  checks.push(fs.existsSync(path.join(d.agents, "drip-critic.md")) ? check("critic", "ok", "drip-critic subagent installed (edit and bash denied)") : check("critic", "warn", "drip-critic subagent not installed"));
  checks.push(check("stop-gate", "info", "OpenCode cannot block the end of a turn; the stop gate is unsupported on this host"));
  return summarize(meta.id, checks);
}

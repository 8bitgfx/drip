// Codex (CLI and desktop app): direct install into ~/.codex (config.toml, hooks.json, agents, AGENTS.md) and ~/.agents/skills.
// Facts and links: docs/HOSTS.md. Built from the official docs; not verified in the real app.
import fs from "node:fs";
import path from "node:path";
import { adaptText, criticToml, hostRules } from "./adapt.mjs";
import { baseChecks, check, requireBuilt, summarize } from "./checks.mjs";
import { Changes, fwd, hasBlock, hookFile, installSkills, readConfig, readText, removeBlock, serverFile, undoManifest, writeBlockFile, writeConfig } from "./common.mjs";

export const meta = {
  id: "codex",
  label: "Codex",
  kind: "native",
  summary: "Codex CLI and desktop app: local stdio MCP, skills, hooks (write gate, stop gate), critic subagent.",
  capabilities: { mcpTools: "supported", imageResults: "unknown", skills: "supported", writeHook: "supported", stopHook: "supported", sessionStart: "supported", criticSubagent: "partial", mcpApps: "unknown" },
};

const dirs = (o) => {
  const codex = o.env.CODEX_HOME ? path.resolve(o.env.CODEX_HOME) : path.join(o.home, ".codex");
  return { codex, config: path.join(codex, "config.toml"), hooks: path.join(codex, "hooks.json"), agents: path.join(codex, "agents"), agentsMd: path.join(codex, "AGENTS.md"), skills: path.join(o.home, ".agents", "skills") };
};

export function tomlBlock(o) {
  const q = (s) => JSON.stringify(s);
  return [
    "[mcp_servers.drip]",
    `command = ${q(o.node)}`,
    `args = [${q(serverFile(o))}]`,
    "startup_timeout_sec = 30",
    "tool_timeout_sec = 300",
    "",
    "[mcp_servers.drip.env]",
    `CLAUDE_PLUGIN_ROOT = ${q(fwd(o.pluginRoot))}`,
    'DRIP_HOST = "codex"',
  ].join("\n");
}

const MATCH_WRITE = "apply_patch|Edit|Write";

/** Codex-format hooks.json content for Drip. Used by Codex's own hooks.json and by the ChatGPT/Codex plugin package. */
export function hooksJson(o, { plugin = false } = {}) {
  const cmd = (ev) => {
    const file = hookFile(o, "codex");
    const h = { type: "command", command: `${o.node} "${file}" ${ev}`, timeout: 30 };
    if (plugin) h.commandWindows = `${o.node} "${file.replace("${PLUGIN_ROOT}", "%PLUGIN_ROOT%")}" ${ev}`;
    return h;
  };
  return {
    hooks: {
      SessionStart: [{ hooks: [cmd("SessionStart")] }],
      UserPromptSubmit: [{ hooks: [cmd("UserPromptSubmit")] }],
      PreToolUse: [{ matcher: MATCH_WRITE, hooks: [cmd("PreToolUse")] }],
      PostToolUse: [
        { matcher: MATCH_WRITE, hooks: [cmd("PostToolUse")] },
        { matcher: "drip_start", hooks: [cmd("PostToolUse")] },
      ],
      Stop: [{ hooks: [cmd("Stop")] }],
      SubagentStop: [{ hooks: [cmd("SubagentStop")] }],
    },
  };
}

export const isDripHookGroup = (g) => (g?.hooks || []).some((h) => /hooks[\\/]hosts[\\/]codex\.mjs/.test(`${h.command || ""} ${h.commandWindows || ""}`));

export function mergeHooks(cfg, ours) {
  cfg.hooks = cfg.hooks || {};
  for (const [ev, groups] of Object.entries(ours.hooks)) {
    cfg.hooks[ev] = [...(cfg.hooks[ev] || []).filter((g) => !isDripHookGroup(g)), ...groups];
  }
  return cfg;
}

export function stripHooks(cfg) {
  let removed = false;
  for (const [ev, groups] of Object.entries(cfg.hooks || {})) {
    const keep = groups.filter((g) => !isDripHookGroup(g));
    if (keep.length !== groups.length) removed = true;
    if (keep.length) cfg.hooks[ev] = keep;
    else delete cfg.hooks[ev];
  }
  if (cfg.hooks && !Object.keys(cfg.hooks).length) delete cfg.hooks;
  return removed;
}

export async function install(o) {
  requireBuilt(o);
  const d = dirs(o);
  const ch = new Changes(o, meta.id);
  const warnings = [];

  const cur = readText(d.config);
  const foreign = !hasBlock(cur) && /^\s*\[mcp_servers\.drip[\].]/m.test(cur);
  if (foreign) warnings.push(`${d.config} already has a [mcp_servers.drip] table that Drip did not write; left it alone. Remove or rename it, then run install again.`);
  else writeBlockFile(ch, d.config, tomlBlock(o), "toml");

  writeConfig(ch, d.hooks, mergeHooks(readConfig(d.hooks), hooksJson(o)));
  ch.track({ kind: "entry", path: d.hooks, name: "hooks", handler: "hooks" });

  const skills = installSkills(ch, d.skills, (t) => adaptText(t, "codex"));
  const critic = path.join(d.agents, "drip-critic.toml");
  ch.write(critic, criticToml(o.pluginRoot));
  ch.track({ kind: "file", path: critic });
  writeBlockFile(ch, d.agentsMd, hostRules("codex", "full"), "md");
  ch.save();
  warnings.push("Codex asks you to review new hooks before they run: open /hooks once and trust Drip's.");
  warnings.push("Codex subagents inherit the parent's permissions, so the critic is read-only by instruction only (its prompt says so), not enforced by the host.");
  return { ok: true, host: meta.id, dryRun: o.dryRun, actions: ch.actions, skills: skills.length, warnings, restart: "Restart Codex (or start a new session) to load the MCP server and skills." };
}

export async function uninstall(o) {
  const d = dirs(o);
  const r = undoManifest(o, meta.id, {
    hooks: (e) => {
      if (!fs.existsSync(e.path)) return false;
      const cfg = readConfig(e.path);
      const removed = stripHooks(cfg);
      if (removed && !o.dryRun) fs.writeFileSync(e.path, `${JSON.stringify(cfg, null, 2)}\n`);
      return removed;
    },
  });
  if (!r.found) {
    // No manifest (installed by hand, or the manifest was lost): remove only what is recognisably Drip's.
    for (const [file, kind] of [[d.config, "toml"], [d.agentsMd, "md"]]) {
      const x = removeBlock(readText(file), kind);
      if (x.removed) {
        if (!o.dryRun) fs.writeFileSync(file, x.content);
        r.removed.push(`${file} (Drip block)`);
      }
    }
  }
  return { ok: true, host: meta.id, dryRun: o.dryRun, removed: r.removed, note: r.removed.length ? "Only entries Drip added were removed. Backups of changed files are next to them (*.drip-backup-*)." : "Nothing of Drip's was found." };
}

export async function doctor(o) {
  const d = dirs(o);
  const checks = baseChecks(o, ["codex"]);
  checks.push(fs.existsSync(d.codex) ? check("host", "ok", `${d.codex} found`) : check("host", "info", `${d.codex} not found (Codex is not set up on this machine)`));
  checks.push(hasBlock(readText(d.config)) ? check("mcp", "ok", "Drip MCP server is in config.toml") : check("mcp", "warn", "Drip MCP server is not in config.toml", "Run: drip install --agent codex"));
  let hooks = {};
  try {
    hooks = readConfig(d.hooks);
  } catch (e) {
    checks.push(check("hooks-file", "fail", e.message));
  }
  checks.push(Object.values(hooks.hooks || {}).flat().some(isDripHookGroup) ? check("hooks", "ok", "Drip hooks are in hooks.json (review them with /hooks)") : check("hooks", "warn", "Drip hooks are not installed", "Run: drip install --agent codex"));
  checks.push(fs.existsSync(path.join(d.skills, "drip", "SKILL.md")) ? check("skills", "ok", `skills in ${d.skills}`) : check("skills", "warn", "Drip skills are not installed"));
  checks.push(fs.existsSync(path.join(d.agents, "drip-critic.toml")) ? check("critic", "ok", "drip-critic agent installed") : check("critic", "warn", "drip-critic agent not installed"));
  return summarize(meta.id, checks);
}

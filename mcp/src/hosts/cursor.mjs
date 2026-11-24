// Cursor: ~/.cursor/mcp.json, hooks.json, skills/, agents/ (user scope) and, with a project folder, .cursor/rules/drip.mdc.
// Built from https://cursor.com/docs (mcp, hooks, skills, subagents, rules); not verified in the real app.
import fs from "node:fs";
import path from "node:path";
import { adaptText, criticMarkdown, hostRules } from "./adapt.mjs";
import { baseChecks, check, requireBuilt, summarize } from "./checks.mjs";
import { Changes, fwd, hookFile, installSkills, isDripServer, readConfig, serverFile, setOwned, undoManifest, writeConfig, removeJsonEntry } from "./common.mjs";

export const meta = {
  id: "cursor",
  label: "Cursor",
  kind: "native",
  summary: "Cursor: local stdio MCP, skills, hooks (write gate, stop via follow-up), read-only critic subagent, rules.",
  capabilities: { mcpTools: "supported", imageResults: "supported", skills: "supported", writeHook: "supported", stopHook: "supported", sessionStart: "supported", criticSubagent: "supported", mcpApps: "supported" },
};

const dirs = (o) => {
  const cursor = path.join(o.home, ".cursor");
  return { cursor, mcp: path.join(cursor, "mcp.json"), hooks: path.join(cursor, "hooks.json"), skills: path.join(cursor, "skills"), agents: path.join(cursor, "agents") };
};

export function mcpEntry(o) {
  return { command: o.node, args: [serverFile(o)], env: { CLAUDE_PLUGIN_ROOT: fwd(o.pluginRoot), DRIP_HOST: "cursor", DRIP_PROJECT_DIR: "${workspaceFolder}" } };
}

/** Cursor hooks.json entries (flat list per event). */
export function hooksJson(o) {
  const c = (ev) => ({ command: `${o.node} "${hookFile(o, "cursor")}" ${ev}`, timeout: 30 });
  return {
    version: 1,
    hooks: {
      sessionStart: [c("sessionStart")],
      preToolUse: [{ ...c("preToolUse"), matcher: "Write" }],
      postToolUse: [{ ...c("postToolUse"), matcher: "Write" }],
      afterFileEdit: [c("afterFileEdit")],
      stop: [c("stop")],
      subagentStop: [c("subagentStop")],
      afterMCPExecution: [{ ...c("afterMCPExecution"), matcher: "drip_start" }],
    },
  };
}

export const isDripHook = (h) => /hooks[\\/]hosts[\\/]cursor\.mjs/.test(h?.command || "");

export function mergeHooks(cfg, ours) {
  cfg.version = cfg.version || 1;
  cfg.hooks = cfg.hooks || {};
  for (const [ev, list] of Object.entries(ours.hooks)) cfg.hooks[ev] = [...(cfg.hooks[ev] || []).filter((h) => !isDripHook(h)), ...list];
  return cfg;
}

export function stripHooks(cfg) {
  let removed = false;
  for (const [ev, list] of Object.entries(cfg.hooks || {})) {
    const keep = list.filter((h) => !isDripHook(h));
    if (keep.length !== list.length) removed = true;
    if (keep.length) cfg.hooks[ev] = keep;
    else delete cfg.hooks[ev];
  }
  return removed;
}

export const ruleFile = (hostRulesText) => `---\ndescription: Drip, the design-process toolset (opt-in; start with drip_start when the user asks for Drip or a real design process)\nalwaysApply: true\n---\n\n${hostRulesText}`;

export async function install(o) {
  requireBuilt(o);
  const d = dirs(o);
  const ch = new Changes(o, meta.id);
  const warnings = [];

  const mcp = readConfig(d.mcp);
  mcp.mcpServers = mcp.mcpServers || {};
  const res = setOwned(mcp.mcpServers, "drip", mcpEntry(o), isDripServer);
  if (res === "conflict") warnings.push(`${d.mcp} already has an "drip" server that is not Drip's; left it alone.`);
  else {
    writeConfig(ch, d.mcp, mcp);
    ch.track({ kind: "entry", path: d.mcp, name: "drip", handler: "mcp" });
  }
  writeConfig(ch, d.hooks, mergeHooks(readConfig(d.hooks), hooksJson(o)));
  ch.track({ kind: "entry", path: d.hooks, name: "hooks", handler: "hooks" });

  const skills = installSkills(ch, d.skills, (t) => adaptText(t, "cursor"));
  const critic = path.join(d.agents, "drip-critic.md");
  ch.write(critic, criticMarkdown("cursor", o.pluginRoot));
  ch.track({ kind: "file", path: critic });
  if (o.project) {
    const rule = path.join(o.project, ".cursor", "rules", "drip.mdc");
    ch.write(rule, ruleFile(hostRules("cursor", "full")));
    ch.track({ kind: "file", path: rule });
  } else warnings.push("Cursor's always-on rules live in each project (.cursor/rules) or in Settings > Rules. Run install with a project folder to add the Drip rule; the skills already tell the agent how to use Drip.");
  ch.save();
  warnings.push("Cursor's file-write tool payload is read tolerantly (file_path / path / target_file); not verified against a running Cursor.");
  warnings.push("Cursor's beforeSubmitPrompt hook cannot add context, so Drip's per-prompt reminders are not used on Cursor.");
  return { ok: true, host: meta.id, dryRun: o.dryRun, actions: ch.actions, skills: skills.length, warnings, restart: "Restart Cursor to load the MCP server, hooks and skills." };
}

export async function uninstall(o) {
  const r = undoManifest(o, meta.id, {
    mcp: (e) => removeJsonEntry(e.path, (cfg) => [cfg.mcpServers, "drip"], o.dryRun),
    hooks: (e) => {
      if (!fs.existsSync(e.path)) return false;
      const cfg = readConfig(e.path);
      const removed = stripHooks(cfg);
      if (removed && !o.dryRun) fs.writeFileSync(e.path, `${JSON.stringify(cfg, null, 2)}\n`);
      return removed;
    },
  });
  return { ok: true, host: meta.id, dryRun: o.dryRun, removed: r.removed, note: r.removed.length ? "Only entries Drip added were removed. Backups of changed files are next to them (*.drip-backup-*)." : "Nothing of Drip's was found." };
}

export async function doctor(o) {
  const d = dirs(o);
  const checks = baseChecks(o, ["cursor"]);
  checks.push(fs.existsSync(d.cursor) ? check("host", "ok", `${d.cursor} found`) : check("host", "info", `${d.cursor} not found (Cursor is not set up on this machine)`));
  let mcp = {};
  let hooks = {};
  try {
    mcp = readConfig(d.mcp);
    hooks = readConfig(d.hooks);
  } catch (e) {
    checks.push(check("config", "fail", e.message));
  }
  const entry = mcp.mcpServers?.drip;
  if (!entry) checks.push(check("mcp", "warn", "Drip MCP server is not in mcp.json", "Run: drip install --agent cursor"));
  else if (!isDripServer(entry)) checks.push(check("mcp", "warn", "mcp.json has a different server named drip"));
  else checks.push(fs.existsSync(entry.args?.[0] || "") ? check("mcp", "ok", "Drip MCP server is in mcp.json") : check("mcp", "fail", `mcp.json points at a missing file: ${entry.args?.[0]}`, "Run: drip install --agent cursor"));
  checks.push(Object.values(hooks.hooks || {}).flat().some(isDripHook) ? check("hooks", "ok", "Drip hooks are in hooks.json") : check("hooks", "warn", "Drip hooks are not installed"));
  checks.push(fs.existsSync(path.join(d.skills, "drip", "SKILL.md")) ? check("skills", "ok", `skills in ${d.skills}`) : check("skills", "warn", "Drip skills are not installed"));
  checks.push(fs.existsSync(path.join(d.agents, "drip-critic.md")) ? check("critic", "ok", "drip-critic subagent installed (readonly)") : check("critic", "warn", "drip-critic subagent not installed"));
  return summarize(meta.id, checks);
}

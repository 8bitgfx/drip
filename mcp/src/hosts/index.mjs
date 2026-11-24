// Host adapters: install Drip into other agent hosts, remove it, check it.
//   listHosts()                    -> [{ id, label, kind, installable, summary, capabilities }]
//   install(agent, { pluginRoot, home, dryRun, project, env, platform })   -> { ok, actions, warnings, ... }
//   uninstall(agent, opts)         -> { ok, removed, ... }
//   doctor(agent?, opts)           -> { ok, summary, checks } (one host, or all)
// `home` and `env` are injectable so tests never touch a real machine. Claude Code keeps its native plugin (nothing to install here).
import * as chatgpt from "./chatgpt.mjs";
import * as claudeDesktop from "./claude-desktop.mjs";
import * as codex from "./codex.mjs";
import * as cursor from "./cursor.mjs";
import * as opencode from "./opencode.mjs";
import { resolveOpts } from "./common.mjs";

const NATIVE = [codex, cursor, opencode, claudeDesktop, chatgpt];

const INFO = [
  {
    id: "claude-code",
    label: "Claude Code",
    kind: "reference",
    installable: false,
    summary: "The reference implementation: install the Drip plugin with /plugin (marketplace add this repository). Nothing for `drip install` to do.",
    capabilities: { mcpTools: "supported", imageResults: "supported", skills: "supported", writeHook: "supported", stopHook: "supported", sessionStart: "supported", criticSubagent: "supported", mcpApps: "unknown" },
  },
  {
    id: "t3code",
    label: "T3 Code",
    kind: "via",
    installable: false,
    summary: "T3 Code is a front end that drives Codex, Claude Code, Cursor, OpenCode and other agents. Install Drip into the agent you run under it (drip install --agent codex, ...). Whether T3 Code passes each agent's MCP, skills and hooks through was not verified.",
    via: ["codex", "claude-code", "cursor", "opencode"],
    capabilities: { mcpTools: "unknown", imageResults: "unknown", skills: "unknown", writeHook: "unknown", stopHook: "unknown", sessionStart: "unknown", criticSubagent: "unknown", mcpApps: "unknown" },
  },
  {
    id: "claude-web",
    label: "Claude on the web",
    kind: "deferred",
    installable: false,
    summary: "Deferred: Claude web cannot run the local engine without a hosted service or tunnel.",
    capabilities: {},
  },
  {
    id: "chatgpt-web",
    label: "ChatGPT on the web",
    kind: "deferred",
    installable: false,
    summary: "Deferred: ChatGPT web only reaches remote MCP servers (public URL or tunnel); Drip is local-only.",
    capabilities: {},
  },
];

const ALIASES = { claude: "claude-desktop", cowork: "claude-desktop", "claude-cowork": "claude-desktop", "chatgpt-desktop": "chatgpt", "chatgpt-work": "chatgpt", openai: "chatgpt", t3: "t3code", "t3-code": "t3code", claudecode: "claude-code" };

const byId = (id) => {
  const key = ALIASES[String(id).toLowerCase()] || String(id).toLowerCase();
  return { key, native: NATIVE.find((m) => m.meta.id === key), info: INFO.find((i) => i.id === key) };
};

export const HOST_IDS = [...NATIVE.map((m) => m.meta.id), ...INFO.map((i) => i.id)];

export function listHosts() {
  return [...NATIVE.map((m) => ({ ...m.meta, installable: true })), ...INFO];
}

function resolve(agent) {
  if (!agent) throw new Error(`Unknown host. Hosts: ${HOST_IDS.join(", ")}`);
  const { key, native, info } = byId(agent);
  if (!native && !info) throw new Error(`Unknown host "${agent}". Hosts: ${HOST_IDS.join(", ")}`);
  return { key, native, info };
}

function notInstallable(info) {
  if (info.kind === "deferred") throw new Error(`${info.label} is unsupported: ${info.summary}`);
  return { ok: true, host: info.id, dryRun: false, actions: [], warnings: [], note: info.summary };
}

export async function install(agent, opts = {}) {
  const { native, info } = resolve(agent);
  if (!native) return notInstallable(info);
  return native.install(resolveOpts(opts));
}

export async function uninstall(agent, opts = {}) {
  const { native, info } = resolve(agent);
  if (!native) return { ...notInstallable(info), removed: [] };
  return native.uninstall(resolveOpts(opts));
}

export async function doctor(agent, opts = {}) {
  if (!agent) {
    const checks = [];
    for (const m of NATIVE) {
      const r = await m.doctor(resolveOpts(opts));
      checks.push({ id: m.meta.id, status: r.ok ? "ok" : "fail", detail: `${m.meta.label}: ${r.summary}` });
    }
    const bad = checks.filter((c) => c.status === "fail");
    return { ok: !bad.length, summary: bad.length ? `${bad.length} host${bad.length === 1 ? "" : "s"} need attention` : "ready", checks };
  }
  const { native, info } = resolve(agent);
  if (native) return native.doctor(resolveOpts(opts));
  return { host: info.id, ok: info.kind !== "deferred", summary: info.summary, checks: [{ id: "note", status: "info", detail: info.summary }] };
}

export const capabilityMatrix = () => listHosts().map((h) => ({ id: h.id, label: h.label, ...h.capabilities }));

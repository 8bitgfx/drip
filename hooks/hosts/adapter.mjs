// Shared machinery for the host hook adapters. Each host calls Drip's hooks with its own payload format.
// An adapter translates that payload into the Claude Code format on stdin, runs the unchanged hook script
// (hooks/pre-write.mjs and friends) and translates the answer back. Nothing in hooks/*.mjs is edited.
//
// An adapter must never break the host: on any error it prints nothing and exits 0 (= allow).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adaptText } from "../../mcp/src/hosts/adapt.mjs";

const hooksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function readStdinJson() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/** Run one of Drip's Claude Code hooks with a Claude-format payload. Returns { code, json, stderr }. */
export function runDripHook(script, payload, { projectDir } = {}) {
  const env = { ...process.env };
  if (projectDir) {
    env.CLAUDE_PROJECT_DIR = projectDir;
    env.DRIP_PROJECT_DIR = projectDir;
  }
  const r = spawnSync(process.execPath, [path.join(hooksDir, script)], { input: JSON.stringify(payload), encoding: "utf8", env, timeout: 25000, windowsHide: true });
  let json = null;
  try {
    json = r.stdout?.trim() ? JSON.parse(r.stdout) : null;
  } catch {
    /* plain text */
  }
  return { code: r.status ?? 0, json, stdout: r.stdout || "", stderr: r.stderr || "" };
}

/** Pull what the Claude-format hooks said out of their answer: { deny, block, context }. */
export function interpret(result, host) {
  const j = result.json || {};
  const hso = j.hookSpecificOutput || {};
  const fix = (t) => (t ? adaptText(String(t), host).trim() : t);
  return {
    deny: hso.permissionDecision === "deny" ? fix(hso.permissionDecisionReason) : null,
    block: j.decision === "block" ? fix(j.reason) : null,
    context: hso.additionalContext ? fix(hso.additionalContext) : null,
    code: result.code,
    stderr: result.stderr,
  };
}

export function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

/** Files and text touched by a Codex-style apply_patch body. */
export function parsePatch(patch) {
  const files = [];
  let cur = null;
  for (const line of String(patch || "").split(/\r?\n/)) {
    let m;
    if ((m = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line))) {
      cur = { kind: m[1].toLowerCase(), file: m[2].trim(), added: [] };
      files.push(cur);
    } else if ((m = /^\*\*\* Move to: (.+)$/.exec(line)) && cur) {
      cur.file = m[1].trim();
    } else if (cur && line.startsWith("+") && !line.startsWith("+++")) {
      cur.added.push(line.slice(1));
    }
  }
  return files.filter((f) => f.kind !== "delete");
}

/** Claude-format tool calls for a patch: Write for new files, Edit for changes. */
export function patchToClaudeCalls(patch) {
  return parsePatch(patch).map((f) => (f.kind === "add" ? { tool_name: "Write", tool_input: { file_path: f.file, content: f.added.join("\n") } } : { tool_name: "Edit", tool_input: { file_path: f.file, new_string: f.added.join("\n") } }));
}

/** Codex runs commands through its shell tool (Bash in hook payloads; older builds name it shell / exec_command). */
export const isShellTool = (name) => /^(bash|shell|exec_command|local_shell|shell_command|unified_exec|powershell)$/i.test(String(name || ""));

/** The command line from a shell tool's input: a string, or argv such as ["bash", "-lc", "cat > a.css <<EOF ..."]. */
export function shellCommand(ti) {
  const c = ti?.command ?? ti?.cmd ?? ti?.input ?? (typeof ti === "string" ? ti : "");
  return Array.isArray(c) ? c.join(" ") : String(c || "");
}

export const isFileWriteTool = (name) => /^(apply_patch|patch|edit|write|multiedit|str_replace_editor|str_replace_based_edit_tool|create)$/i.test(String(name || ""));

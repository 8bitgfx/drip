// OpenCode plugin shim -> Drip's hooks. The plugin (installed as drip.js) calls:
//   node .../hooks/hosts/opencode.mjs <pre-write|post-write|session-start>   with JSON on stdin:
//   { tool, args: { filePath, content, newString, oldString, patchText }, directory, sessionID }
// and reads { block, reason } or { context } back. OpenCode plugins have no "stop" hook, so the turn-end gate is
// not available there (documented in docs/HOSTS.md); the plugin can only gate writes and add notes.
import { emit, interpret, patchToClaudeCalls, readStdinJson, runDripHook } from "./adapter.mjs";

const HOST = "opencode";

function calls(p) {
  const a = p.args || {};
  if (/patch/i.test(p.tool || "") && (a.patchText || a.patch)) return patchToClaudeCalls(a.patchText || a.patch);
  const file = a.filePath || a.file_path || a.path;
  if (!file) return [];
  if (/^write$/i.test(p.tool || "")) return [{ tool_name: "Write", tool_input: { file_path: file, content: a.content ?? "" } }];
  return [{ tool_name: "Edit", tool_input: { file_path: file, new_string: a.newString ?? a.new_string ?? "" } }];
}

export async function handle(kind, p) {
  const dir = p.directory || process.cwd();
  const base = { session_id: p.sessionID, cwd: dir };
  const run = (script, extra) => interpret(runDripHook(script, { ...base, ...extra }, { projectDir: dir }), HOST);
  if (kind === "pre-write") {
    for (const call of calls(p)) {
      const r = run("pre-write.mjs", { hook_event_name: "PreToolUse", ...call });
      if (r.deny) return { block: true, reason: `[Drip] ${r.deny.replace(/^\[Drip\] /, "")}` };
    }
    return null;
  }
  if (kind === "post-write") {
    const notes = [];
    for (const call of calls(p)) {
      const r = run("post-write.mjs", { hook_event_name: "PostToolUse", ...call });
      if (r.context) notes.push(r.context);
    }
    return notes.length ? { context: notes.join("\n\n") } : null;
  }
  if (kind === "session-start") {
    const r = run("session-start.mjs", { hook_event_name: "SessionStart" });
    return r.context ? { context: r.context } : null;
  }
  return null;
}


if (/[\\/]opencode\.mjs$/.test(process.argv[1] || "")) {
  try {
    const out = await handle(process.argv[2], await readStdinJson());
    if (out) emit(out);
  } catch {
    /* never break the host */
  }
  process.exit(0);
}

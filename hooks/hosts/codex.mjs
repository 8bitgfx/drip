// Codex (and ChatGPT desktop plugins, which use the same hook format) -> Drip's hooks.
// Usage in hooks.json: node ".../hooks/hosts/codex.mjs" <SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|Stop|SubagentStop>
//
// Codex payload (https://learn.chatgpt.com/docs/hooks): { session_id, cwd, hook_event_name, tool_name, tool_input, tool_response, prompt, ... }.
// File edits arrive as the apply_patch tool; its patch text is in tool_input (the docs call the field `command`).
// Answers: PreToolUse deny = hookSpecificOutput.permissionDecision "deny"; Stop block = { decision: "block", reason };
// extra context = hookSpecificOutput.additionalContext. Those are the same shapes Claude Code uses.
import { emit, interpret, isFileWriteTool, patchToClaudeCalls, readStdinJson, runDripHook } from "./adapter.mjs";

const HOST = "codex";

function claudeCalls(p) {
  const ti = p.tool_input || {};
  if (/^apply_patch$/i.test(p.tool_name)) return patchToClaudeCalls(ti.command || ti.input || ti.patch || (typeof ti === "string" ? ti : ""));
  if (ti.file_path || ti.path) return [{ tool_name: /^write$/i.test(p.tool_name) ? "Write" : "Edit", tool_input: { ...ti, file_path: ti.file_path || ti.path } }];
  return [];
}

export async function handle(event, p) {
  const dir = p.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();
  const base = { session_id: p.session_id, cwd: dir, transcript_path: p.transcript_path };
  const run = (script, extra) => interpret(runDripHook(script, { ...base, ...extra }, { projectDir: dir }), HOST);

  if (event === "SessionStart") {
    const r = run("session-start.mjs", { hook_event_name: "SessionStart" });
    return r.context ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: r.context } } : null;
  }
  if (event === "UserPromptSubmit") {
    const r = run("prompt.mjs", { hook_event_name: "UserPromptSubmit", prompt: p.prompt });
    return r.context ? { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: r.context } } : null;
  }
  if (event === "PreToolUse") {
    if (!isFileWriteTool(p.tool_name)) return null;
    for (const call of claudeCalls(p)) {
      const r = run("pre-write.mjs", { hook_event_name: "PreToolUse", ...call });
      if (r.deny) return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `[Drip] ${r.deny.replace(/^\[Drip\] /, "")}` } };
    }
    return null;
  }
  if (event === "PostToolUse") {
    if (/drip_start$/.test(String(p.tool_name || ""))) {
      runDripHook("bind.mjs", { ...base, hook_event_name: "PostToolUse", tool_name: p.tool_name, tool_response: p.tool_response }, { projectDir: dir });
      return null;
    }
    if (!isFileWriteTool(p.tool_name)) return null;
    const notes = [];
    for (const call of claudeCalls(p)) {
      const r = run("post-write.mjs", { hook_event_name: "PostToolUse", ...call });
      if (r.context) notes.push(r.context);
    }
    return notes.length ? { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n\n") } } : null;
  }
  if (event === "Stop") {
    const r = run("stop.mjs", { hook_event_name: "Stop", stop_hook_active: p.stop_hook_active });
    return r.block ? { decision: "block", reason: r.block } : null;
  }
  if (event === "SubagentStop") {
    // Records that the critic subagent really ran, so critic_record cannot be called with an invented verdict.
    const type = p.agent_type || p.subagent_type || p.agent_name || "";
    runDripHook("agent-run.mjs", { ...base, hook_event_name: "PostToolUse", tool_name: "Agent", tool_input: { subagent_type: type } }, { projectDir: dir });
    return null;
  }
  return null;
}

if (/[\\/]codex\.mjs$/.test(process.argv[1] || "")) {
  try {
    const event = process.argv[2];
    const out = await handle(event, await readStdinJson());
    if (out) emit(out);
  } catch {
    /* never break the host */
  }
  process.exit(0);
}

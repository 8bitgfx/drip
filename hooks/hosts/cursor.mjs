// Cursor -> Drip's hooks.
// Usage in ~/.cursor/hooks.json: node ".../hooks/hosts/cursor.mjs" <sessionStart|preToolUse|postToolUse|afterFileEdit|stop|subagentStop|afterMCPExecution>
//
// Cursor payload (https://cursor.com/docs/hooks): { conversation_id, workspace_roots[], hook_event_name, ... }, plus per event
// preToolUse/postToolUse { tool_name, tool_input }, afterFileEdit { file_path, edits[{old_string,new_string}] },
// stop { status, loop_count }, subagentStop { subagent_type }, afterMCPExecution { tool_name, result_json }.
// Answers: preToolUse { permission: "deny", user_message, agent_message }; stop { followup_message };
// sessionStart / postToolUse { additional_context }.
// Unverified against a running Cursor: the tool_input field names of its file-writing tool (read tolerantly below).
import { emit, interpret, isFileWriteTool, readStdinJson, runDripHook } from "./adapter.mjs";

const HOST = "cursor";

function writeCall(p) {
  const ti = p.tool_input || {};
  const file = ti.file_path || ti.path || ti.target_file || ti.filePath;
  if (!file) return null;
  const text = ti.contents ?? ti.content ?? ti.new_string ?? ti.code_edit ?? ti.text ?? "";
  const isWrite = /^(write|create)$/i.test(p.tool_name || "") && (ti.contents !== undefined || ti.content !== undefined);
  return isWrite ? { tool_name: "Write", tool_input: { file_path: file, content: text } } : { tool_name: "Edit", tool_input: { file_path: file, new_string: text } };
}

export async function handle(event, p) {
  const dir = (p.workspace_roots && p.workspace_roots[0]) || p.cwd || process.env.CURSOR_PROJECT_DIR || process.cwd();
  const base = { session_id: p.session_id || p.conversation_id, cwd: dir, transcript_path: p.transcript_path };
  const run = (script, extra) => interpret(runDripHook(script, { ...base, ...extra }, { projectDir: dir }), HOST);

  if (event === "sessionStart") {
    const r = run("session-start.mjs", { hook_event_name: "SessionStart" });
    return r.context ? { additional_context: r.context } : null;
  }
  if (event === "preToolUse") {
    if (!isFileWriteTool(p.tool_name)) return null;
    const call = writeCall(p);
    if (!call) return null;
    const r = run("pre-write.mjs", { hook_event_name: "PreToolUse", ...call });
    return r.deny ? { permission: "deny", user_message: "Drip: the design loop is not ready for this UI change yet.", agent_message: `[Drip] ${r.deny.replace(/^\[Drip\] /, "")}` } : null;
  }
  if (event === "postToolUse" || event === "afterFileEdit") {
    let call = null;
    if (event === "afterFileEdit") call = { tool_name: "Edit", tool_input: { file_path: p.file_path, new_string: (p.edits || []).map((e) => e.new_string).filter(Boolean).join("\n") } };
    else if (isFileWriteTool(p.tool_name)) call = writeCall(p);
    if (!call || !call.tool_input.file_path) return null;
    const r = run("post-write.mjs", { hook_event_name: "PostToolUse", ...call });
    return event === "postToolUse" && r.context ? { additional_context: r.context } : null;
  }
  if (event === "stop") {
    const r = run("stop.mjs", { hook_event_name: "Stop" });
    return r.block ? { followup_message: r.block } : null;
  }
  if (event === "subagentStop") {
    runDripHook("agent-run.mjs", { ...base, hook_event_name: "PostToolUse", tool_name: "Agent", tool_input: { subagent_type: p.subagent_type || "" } }, { projectDir: dir });
    return null;
  }
  if (event === "afterMCPExecution") {
    if (/drip_start$/.test(String(p.tool_name || ""))) runDripHook("bind.mjs", { ...base, hook_event_name: "PostToolUse", tool_name: p.tool_name, tool_response: p.result_json }, { projectDir: dir });
    return null;
  }
  return null;
}

if (/[\\/]cursor\.mjs$/.test(process.argv[1] || "")) {
  try {
    const out = await handle(process.argv[2], await readStdinJson());
    if (out) emit(out);
  } catch {
    /* never break the host */
  }
  process.exit(0);
}

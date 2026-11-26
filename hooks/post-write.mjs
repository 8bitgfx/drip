// PostToolUse (Write | Edit | MultiEdit): record UI changes (so the Stop hook can demand a fit check)
// and run the static slop checks on the file that just changed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allow, filmEvent, hashFile, isUiFile, loadConfig, loadState, looksVisual, markSeen, out, readInput, run, shotHash, updateState } from "./lib.mjs";

// taste-skill's copy lint (no browser, ~0.1 s): slop words, stock lines, default names, invented stat strips.
// Its FAILs and WARNs come back as lint issues; its INFO lines stay out.
function copyLint(file) {
  const lint = path.join(process.env.DRIP_HOME || path.join(os.homedir(), ".drip"), "vendor", "taste-skill", "skills", "taste-skill", "scripts", "copy-lint.mjs");
  if (!fs.existsSync(lint)) return [];
  let txt = "";
  try {
    txt = execFileSync(process.execPath, [lint, file], { encoding: "utf8", timeout: 5000, windowsHide: true });
  } catch (e) {
    txt = String(e.stdout || ""); // it exits non-zero on a FAIL
  }
  const issues = [];
  const lines = txt.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s+(FAIL|WARN)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const fix = lines.slice(i + 1, i + 12).find((l) => /^\s+fix: /.test(l));
    issues.push({ id: m[2], severity: m[1] === "FAIL" ? "error" : "warn", line: "-", message: m[3].trim(), fix: fix ? fix.replace(/^\s+fix: /, "").trim() : "rewrite it" });
  }
  return issues;
}

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const ti = input.tool_input || {};
  const file = ti.file_path;
  if (!file || !isUiFile(file, dir)) return allow();
  const abs = path.isAbsolute(file) ? file : path.join(dir, file);
  const rel = path.relative(dir, abs);
  const visual = input.tool_name === "Write" || looksVisual(ti);

  const { task } = loadState(dir);
  const config = loadConfig(dir);
  if (task) {
    const body = [ti.content, ti.new_string, ...(ti.edits || []).map((e) => e.new_string)].filter(Boolean).join("\n");
    filmEvent(task, { kind: "write", agent: input.agent_id || "main", type: input.agent_type || null, tool: input.tool_name, file: rel.replace(/\\/g, "/"), summary: `${input.tool_name === "Write" ? "wrote" : "edited"} ${path.basename(rel)} (${body.split("\n").length} lines)` }, dir);
  }
  if (task) markSeen(task, rel, dir); // an edit this hook saw is known: only edits that bypass it count as unseen at the end
  // The director's own lines add up (directorTooBig): builders and helpers don't count; build_prepare resets it.
  if (task?.loop === "fast" && !input.agent_id && !input.agent_type) {
    const n = [ti.content, ti.new_string, ...(ti.edits || []).map((e) => e.new_string)].filter(Boolean).join("\n").split("\n").length;
    updateState((st) => {
      if (!st.task) return;
      st.task.directorLines = (st.task.directorLines || 0) + n;
      st.task.directorEdits = (st.task.directorEdits || 0) + 1; // edit calls since the last page check (fitcheck_shot resets)
    }, dir);
  }
  if (!task && config.gates.mode !== "always") return allow();
  if (task && visual) {
    // Same bytes as before (as last recorded, or as the last fit-check shot saw them): nothing changed, so nothing to re-check.
    const hash = hashFile(abs);
    const same = hash && (task.uiWrites.some((w) => w.file === rel && w.hash === hash) || shotHash(task, rel, dir) === hash);
    updateState((st) => {
      if (!st.task) return;
      const now = new Date().toISOString();
      const prev = st.task.uiWrites.find((w) => w.file === rel);
      st.task.uiWrites = [...st.task.uiWrites.filter((w) => w.file !== rel), same && prev ? { ...prev, hash } : { file: rel, at: now, hash }].slice(-200);
      if (!same) st.task.lastUiWriteAt = now;
    }, dir);
  }

  const { lintFiles } = await import("../mcp/src/modules/fitcheck/lint.mjs"); // only when there is something to lint
  const all = lintFiles([abs], dir).filter((i) => i.severity !== "info");
  if (task && /\.html$/i.test(abs)) all.push(...copyLint(abs));
  // Say each issue once: the same list after every edit of the file is noise.
  const sig = (i) => `${i.id}:${i.message}`;
  const said = new Set(task?.linted?.[rel] || []);
  const issues = all.filter((i) => !said.has(sig(i)));
  if (task && all.length) updateState((st) => st.task && ((st.task.linted ||= {})[rel] = [...new Set(all.map(sig))].slice(0, 80)), dir);
  const notes = [];
  if (issues.length) notes.push(`[Drip] Slop/polish checks on ${rel}:\n${issues.map((i) => `- ${i.severity} line ${i.line} [${i.id}${i.count > 1 ? ` x${i.count}` : ""}] ${i.message} -> ${i.fix}`).join("\n")}\nFix these now.`);
  if (!task && visual && config.gates.enforce) notes.push("[Drip] UI changed without a Drip task. Call drip_start (size quick) so the change gets the right guides and a fit check.");
  if (!notes.length) return allow();
  out({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n\n") } });
});

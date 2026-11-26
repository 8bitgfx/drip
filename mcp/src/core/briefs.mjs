// Subagent briefs live in files, not in the director's context. A builder's brief is ~5k tokens; pasted into the tool
// result and again into the Agent call, it stayed in Opus's context twice and was re-read on every later call.
// The director launches the agent with a two-line prompt that names the file; the agent reads it itself.
import fs from "node:fs";
import path from "node:path";
import { projectDir } from "./paths.mjs";
import { fwd, slug } from "./util.mjs";

/** Writes the brief to .drip/briefs/<name>.md and returns its absolute path (forward slashes). */
export function writeBrief(name, prompt, cwd) {
  const dir = path.join(projectDir(cwd), ".drip", "briefs");
  fs.mkdirSync(dir, { recursive: true });
  const safeName = slug(name, { max: 60, fallback: "brief" });
  const file = path.join(dir, `${safeName}-${Date.now().toString(36)}.md`);
  fs.writeFileSync(file, prompt);
  return fwd(file);
}

/** The prompt the director passes: the brief's first line (what the agent is) and where the rest is. */
export function briefPrompt(prompt, file) {
  const head = String(prompt).split("\n").find((l) => l.trim()) || "DRIP BRIEF";
  return `${head}\nYour full brief is in ${file}. Read it first (Read tool) and follow it exactly.`;
}

/** The Agent call to make, as one line. */
export function launchLine(type, description, prompt, file) {
  return `Agent({ subagent_type: "drip:${type}", description: ${JSON.stringify(description)}, prompt: ${JSON.stringify(briefPrompt(prompt, file))} })`;
}

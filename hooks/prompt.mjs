// UserPromptSubmit: when the prompt is design work, tell Claude to start (or continue) the Drip loop.
import { checklist, loadConfig, loadState, out, readInput, run, allow } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const config = loadConfig(dir);
  const prompt = input.prompt || "";
  const { task } = loadState(dir);
  const design = new RegExp(config.designWords, "i").test(prompt);
  if (task) {
    return out({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `[Drip] Active design task:\n${checklist(task, config)}\nContinue it (drip_status for the next call). If this message starts different design work, call drip_start again; when the task is finished, drip_end.`,
      },
    });
  }
  if (!design) return allow();
  out({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext:
        "[Drip] This looks like design/UI work. Before writing or restyling any UI, call drip_start (Drip MCP) with what you are designing. " +
        "It picks the loop, gives you the guides to read (drip_guide) and the next step. UI file writes are blocked until its requirements are met. " +
        "Use the drip-* skills for each craft (drip-color, drip-type, drip-layout, drip-motion, …).",
    },
  });
});

// UserPromptSubmit: keep Claude on track while a Drip task is active. In "always" mode, also
// remind it to start Drip on design prompts. Otherwise silent: Drip is opt-in.
import { allow, checklist, loadConfig, loadState, out, readInput, run } from "./lib.mjs";

const LOAD = "If the drip_* tools are not loaded, ToolSearch select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide.";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const config = loadConfig(dir);
  const { task } = loadState(dir);
  if (task) {
    return out({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `[Drip] Active design task:\n${checklist(task, config)}\nContinue it (drip_status gives the next call). If this message is unrelated or ends the design work, call drip_end. ${LOAD}`,
      },
    });
  }
  if (config.gates.mode !== "always" || !new RegExp(config.designWords, "i").test(input.prompt || "")) return allow();
  out({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `[Drip] This looks like design/UI work. Before writing or restyling UI, call drip_start with what you are designing and follow it. ${LOAD}`,
    },
  });
});

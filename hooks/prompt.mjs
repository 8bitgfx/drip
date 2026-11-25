// UserPromptSubmit: keep Claude on track while a Drip task is active. In "always" mode, also
// remind it to start Drip on design prompts. Otherwise silent: Drip is opt-in.
import { REWORK_WORDS, allow, checklist, loadConfig, loadState, out, readInput, run, updateState } from "./lib.mjs";

const LOAD = "If the drip_* tools are not loaded, ToolSearch select:mcp__plugin_drip_drip__drip_status,mcp__plugin_drip_drip__drip_start,mcp__plugin_drip_drip__drip_guide.";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const config = loadConfig(dir);
  const { task } = loadState(dir);
  if (task) {
    // A big-change request on a page that's already built opens a new round: a fresh look and pieces before any UI
    // write (reworkMissing in state.mjs). Without it every gate is already met and the agent hand-rolls effects.
    const rework = (task.uiWrites || []).length > 0 && !task.skipped && REWORK_WORDS.test(input.prompt || "");
    if (rework) {
      updateState((st) => {
        if (st.task) st.task.rework = { at: Date.now(), prompt: String(input.prompt || "").slice(0, 200) };
      }, dir);
    }
    const round = rework
      ? `\nThis is a NEW ROUND on the built page: the user wants a big change, not a touch-up. Run the loop's front half again before writing UI (the write gate holds until you do): ` +
        `1) look: refs_site on 2-3 shipped sites that are clearly better at what's asked + refs_gallery for the pattern, in one message; name what you take from each. ` +
        `2) one drip_execute with a components_find per upgrade, then ONE pieces_preview. 3) pieces_install, ONE build_prepare with every upgrade on its piece, drip:builder agents in one message. 4) fitcheck_shot. ` +
        `Re-read taste.md (drip_guide taste) first. "Better" means bigger real pictures, a stronger composition and finished library pieces, never stacked effects: no accented word in a headline, no gradient text, no glow, glass, grain or shine sweeps as decoration, no tilt on everything.`
      : "";
    return out({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `[Drip] Active design task:\n${checklist(task, config)}${round}\nContinue it (drip_status gives the next call). If the user says the design work is finished, call drip_end (it only closes this session's task). ${LOAD}`,
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

// PreToolUse on Drip's claim tools: things the agent can only say on someone else's behalf are checked against the
// session transcript. drip_skip / drip_end acceptOpen quote the user; fitcheck_done acceptedByUser and critic_prepare
// extraRound need the user's reply after the critic; drip_brief needs the user's answers when the loop asks;
// critic_record must match what the critic wrote. Without a transcript (other hosts) nothing is checked here.
import { allow, loadState, out, readInput, run } from "./lib.mjs";
import { criticVerdict, readTranscript, userReplied, userSaid } from "./transcript.mjs";

const SHIP = /\b(ship|accept|fine|good|ok|okay|as it is|as is|leave it|done|go ahead|yes|keep it|approve|looks (great|good)|love it|finish)\b/i;
const ROUND = /\b(round|critic|again|another|review|more)\b/i;

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const name = String(input.tool_name || "").split("__").pop();
  const a = input.tool_input || {};
  const tr = readTranscript(input.transcript_path);
  if (!tr) return allow();
  const { task } = loadState(dir);
  const deny = (why) => out({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `[Drip] ${why}` } });
  const lastCritic = (task?.critic?.records || []).filter((r) => r.kind === "build").at(-1);

  if (name === "drip_skip" && !userSaid(tr, a.reason))
    return deny(`drip_skip needs the user's own words, and "${String(a.reason || "").slice(0, 80)}" isn't in anything they wrote. Keep following the loop; if you think skipping is right, ask them.`);
  if (name === "drip_end" && a.acceptOpen && !/decide for me/i.test(a.acceptOpen) && !userSaid(tr, a.acceptOpen))
    return deny(`acceptOpen must quote the user, and "${String(a.acceptOpen).slice(0, 80)}" isn't in anything they wrote. Ask them whether to ship with the open points (AskUserQuestion), then quote their answer.`);
  if (name === "fitcheck_done" && a.acceptedByUser && !userReplied(tr, SHIP, lastCritic?.at || task?.startedAt || ""))
    return deny('acceptedByUser needs the user\'s reply. Ask with AskUserQuestion: "Ship with these open points" (list them) or "One more critic round", then record what they chose.');
  if (name === "critic_prepare" && a.extraRound && task?.intake?.max !== 0 && !userReplied(tr, ROUND, lastCritic?.at || ""))
    return deny('extraRound is the user\'s call after the round limit. Ask with AskUserQuestion: "Ship with these open points" or "One more critic round".');
  if (name === "drip_brief" && task?.loop === "fast" && task.noAsk === false && task.brief?.assumed) {
    const asked = tr.answers.some((m) => !task.startedAt || m.at >= task.startedAt) || tr.user.some((m) => task.startedAt && m.at > task.startedAt);
    if (!asked) return deny("drip_brief records the user's answers, and they haven't answered anything since the task started. Ask first: one AskUserQuestion round (fast.md, \"The questions\"), then record their answers.");
  }
  if (name === "critic_record") {
    const real = criticVerdict(tr, task?.critic?.pending?.at || "");
    if (!real && task?.critic?.pending)
      return deny("The critic's answer isn't in yet (no VERDICT from the drip:critic run since critic_prepare). Wait for it to finish, then record exactly what it wrote.");
    if (real) {
      if (a.verdict !== real.verdict) return deny(`The critic wrote VERDICT: ${real.verdict.toUpperCase()}, not ${String(a.verdict).toUpperCase()}. Record its verdict as written.`);
      const off = Object.entries(a.scores || {})
        .map(([k, v]) => [k, v, real.scores[k.toLowerCase().replace(/[^a-z]/g, "")]])
        .filter(([, v, r]) => typeof r === "number" && r !== v);
      if (off.length) return deny(`Scores differ from the critic's: ${off.map(([k, v, r]) => `${k} ${v} (critic: ${r})`).join(", ")}. Copy its numbers as written.`);
    }
  }
  allow();
});

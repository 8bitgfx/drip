// PostToolUse (drip_start): bind this Claude session to the task the server just started, so the
// hooks of other sessions in the same folder never gate, record into or close it.
import { allow, bindSession, readInput, run } from "./lib.mjs";

run(async () => {
  const input = await readInput();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const res = JSON.stringify(input.tool_response || "");
  const m = res.match(/task id ([a-z0-9]+)/);
  if (m && input.session_id) bindSession(input.session_id, m[1], dir);
  allow();
});

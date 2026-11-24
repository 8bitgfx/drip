// Drip for OpenCode (installed by drip; remove with: drip uninstall). Gates UI writes through Drip's hook adapter.
import { spawnSync } from "node:child_process";

const ADAPTER = "<DRIP_ROOT>/hooks/hosts/opencode.mjs";
const WRITE_TOOLS = /^(write|edit|multiedit|patch|apply_patch)$/i;

function call(kind, payload) {
  const r = spawnSync("node", [ADAPTER, kind], { input: JSON.stringify(payload), encoding: "utf8", timeout: 25000, windowsHide: true });
  try {
    return r.stdout && r.stdout.trim() ? JSON.parse(r.stdout) : {};
  } catch {
    return {};
  }
}

export const DripPlugin = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => {
    if (!WRITE_TOOLS.test(input.tool || "")) return;
    const r = call("pre-write", { tool: input.tool, args: output.args, directory, sessionID: input.sessionID });
    if (r.block) throw new Error(r.reason);
  },
  "tool.execute.after": async (input, output) => {
    if (!WRITE_TOOLS.test(input.tool || "")) return;
    const r = call("post-write", { tool: input.tool, args: input.args || output.args || {}, directory, sessionID: input.sessionID });
    if (r.context && typeof output.output === "string") output.output += "\n\n" + r.context;
  },
});

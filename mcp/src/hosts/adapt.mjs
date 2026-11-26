// Host-specific wording. Drip's skills, rules and critic prompt are written once (skills/, agents/critic.md) and
// adapted here per host: tool names, "load the deferred tools" steps (Claude Code only), and how the critic is called.
import fs from "node:fs";
import path from "node:path";

/** How each host names and calls things. */
export const HOST_TERMS = {
  codex: { label: "Codex", critic: "drip-critic", callCritic: "Ask the `drip-critic` agent (\"Have drip-critic review ...\")", question: "ask the user in chat" },
  cursor: { label: "Cursor", critic: "drip-critic", callCritic: "Run the `drip-critic` subagent (it is read-only)", question: "ask the user in chat" },
  opencode: { label: "OpenCode", critic: "drip-critic", callCritic: "Invoke the `drip-critic` subagent (`@drip-critic`)", question: "ask the user in chat" },
  "claude-desktop": { label: "Claude Desktop / Cowork", critic: "drip-critic", callCritic: "Use the `drip:critic` subagent (available in Cowork plugins; not in plain chat)", question: "ask the user in chat" },
  chatgpt: { label: "ChatGPT Desktop / Work", critic: "drip-critic", callCritic: "Ask the `drip-critic` agent if your surface offers subagents", question: "ask the user in chat" },
};

const SERVER_NOTE = "If the Drip tools are missing, the Drip MCP server is not connected: tell the user to run `drip doctor` and restart the host.";

/** Rewrite Claude Code specific text in a skill, command or rule for `host`. */
export function adaptText(text, host) {
  const t = HOST_TERMS[host];
  if (!t) return text;
  let s = text.replace(/mcp__plugin_drip_drip__/g, "");
  // Plain-text hook messages: "Load its tools with ToolSearch select:a,b." / "Tools not loaded: ToolSearch select:a,b."
  s = s.replace(/(?:Load its tools with |Tools not loaded: |If the drip_\* tools are not loaded, )?ToolSearch select:[^\s`]+?(?=[\s.`]|$)\.?/g, "").replace(/ {2,}/g, " ");
  // The "load the deferred tools" step exists only in Claude Code.
  s = s.replace(/\*\*0\. Load the tools\*\*[^\n]*/g, `**0. Tools.** The drip_* tools come from the Drip MCP server (drip_start, drip_brief, drip_status, drip_guide first). ${SERVER_NOTE}`);
  s = s.replace(/(?:If the Drip tools aren't callable, )?(?:load (?:it|them): )?ToolSearch `select:[^`]*`(?: \([^)]*\))?\.?/g, (m) => (/^If the Drip tools/.test(m) ? `If the Drip tools aren't callable, check that the Drip MCP server is connected (\`drip doctor\`).` : `check that the Drip MCP server is connected (\`drip doctor\`).`));
  s = s.replace(/ToolSearch `[^`]*`/g, "the host's tool list");
  s = s.replace(/Agent `?drip:critic`?/g, t.callCritic).replace(/drip:critic/g, t.critic);
  s = s.replace(/AskUserQuestion/g, t.question === "ask the user in chat" ? "a short question round in chat (clickable options if the host has them)" : t.question);
  return s;
}

/** The critic agent's prompt: agents/critic.md without its Claude frontmatter. */
export function criticBody(pluginRoot) {
  const raw = fs.readFileSync(path.join(pluginRoot, "agents", "critic.md"), "utf8");
  const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return (m ? m[1] : raw).trim();
}

export const CRITIC_DESCRIPTION = "Drip's independent design critic. Harsh, specific, unbiased review of design work (direction comps, logo concept sheets, page screenshots, niche packs) with weighted scores, a ranking and concrete fixes. Use whenever Drip asks for a critic review (critic_prepare returns the prompt). It sees only the brief and the images, never the conversation.";

const READ_ONLY = "You are read-only: only read the images and files you are pointed at. Never edit, write or run anything.";

/** Markdown agent file (Cursor, OpenCode). */
export function criticMarkdown(host, pluginRoot) {
  const body = adaptText(criticBody(pluginRoot), host);
  if (host === "cursor") return `---\nname: drip-critic\ndescription: ${JSON.stringify(CRITIC_DESCRIPTION)}\nmodel: inherit\nreadonly: true\n---\n\n${body}\n`;
  if (host === "opencode") return `---\ndescription: ${JSON.stringify(CRITIC_DESCRIPTION)}\nmode: subagent\npermission:\n  edit: deny\n  bash: deny\n  webfetch: deny\n---\n\n${body}\n`;
  return `---\nname: drip-critic\ndescription: ${JSON.stringify(CRITIC_DESCRIPTION)}\n---\n\n${body}\n`;
}

/** Codex agent file: TOML with the prompt as a literal multi-line string. A Codex subagent inherits the parent's permissions. */
export function criticToml(pluginRoot) {
  const body = `${READ_ONLY}\n\n${adaptText(criticBody(pluginRoot), "codex")}`.replace(/'''/g, "' ' '");
  return `name = "drip-critic"\ndescription = ${JSON.stringify(CRITIC_DESCRIPTION)}\ndeveloper_instructions = '''\n${body}\n'''\n`;
}

const GATES = {
  full: "Drip enforces its loop with hooks on this host: UI writes and ending the turn are checked.",
  partial: "Drip's hooks on this host cover UI writes but not ending the turn: before you finish, call drip_status, run fitcheck_done and drip_end yourself.",
  none: "This host has no write or stop hooks, so nothing forces the loop. Follow it anyway: call drip_status before writing UI and before finishing, run fitcheck_shot, the critic and fitcheck_done, then drip_end.",
};

/** The always-on rule text (AGENTS.md block, Cursor rule, OpenCode instructions). */
export function hostRules(host, enforcement = "full") {
  const t = HOST_TERMS[host];
  return `# Drip (design process)

Drip is a design-process toolset on this machine: the \`drip_*\`, \`refs_*\`, \`board_*\`, \`critic_*\`, \`fitcheck_*\` and related MCP tools plus the \`drip\` skills. It is opt-in: use it when the user asks for Drip or for a real design process on visual work (a page, screen, site, dashboard, component, logo or redesign). Otherwise do not start it.

- Start with \`drip_start\` and follow what it returns. Lost? \`drip_status\` gives the next call.
- ${GATES[enforcement]}
- Independent review: where Drip says "Agent drip:critic", ${t.callCritic}. Give it only what \`critic_prepare\` returns, then pass its verdict to \`critic_record\`. Do not review your own work in its place.
- ${SERVER_NOTE}
- Ask the user the intake questions in chat, material first, then record the answers with \`drip_brief\`.
- Many calls in a row? Code Mode: \`drip_search\` finds tool signatures, \`drip_execute\` runs one sandboxed script that calls them.
- Drip settings (API keys, checks, critic, builders, the open task): call \`settings_open\` and give the user the link in one line; it is a local page, so keys never go through chat. From a terminal: \`drip settings\`.
- Search the project's own components first (\`components_local_find\`), and run \`drip_check\` before hand-off.
`;
}

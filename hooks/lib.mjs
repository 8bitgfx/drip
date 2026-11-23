// Shared bits for the hook scripts. Hooks must be fast and must never crash the session:
// on any unexpected error they exit 0 with no output (= allow).
export { loadConfig } from "../mcp/src/core/config.mjs";
export { checklist, isUiFile, loadState, missingBeforeUi, needsFitcheck, saveState, updateState } from "../mcp/src/core/state.mjs";

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

export function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

export function allow() {
  process.exit(0);
}

/** Names of the Drip MCP tools as Claude sees them inside the plugin. */
export const T = (name) => `mcp__plugin_drip_drip__${name}`;

/** Does this edit look visual (classes, styles, colours, layout) rather than logic? */
export function looksVisual(toolInput) {
  const s = [toolInput.content, toolInput.new_string, ...(toolInput.edits || []).map((e) => e.new_string)].filter(Boolean).join("\n");
  return /className=|class=|style=|\bstyled\.|css`|tw`|@apply|var\(--|#[0-9a-fA-F]{3,6}\b|\b(bg|text|p[xytrbl]?|m[xytrbl]?|gap|rounded|shadow|font|grid|flex|w|h)-[\w[\]/.-]+|\{[^}]*(color|margin|padding|font|display|grid|flex|border|background)\s*:/.test(s);
}

export function run(main) {
  main().catch(() => process.exit(0));
}

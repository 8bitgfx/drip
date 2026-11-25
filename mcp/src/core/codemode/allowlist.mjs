// Which tools a Code Mode script may call. Constant defaults, overridable in .drip/config.json:
//   "codemode": { "allow": ["board_open"], "deny": ["gen_*"], "maxCalls": 50, "timeoutMs": 120000, "maxImages": 4, "memoryMb": 64 }
// Rules, in order: drip_execute is never reachable (no recursion); a name must match DEFAULT_ALLOW or
// config allow; config deny always wins; DEFAULT_BLOCKED (tools that open a local server) are only
// reachable when config allow names them exactly.

/** Tool-name patterns scripts may call by default. `*` matches any run of characters. */
export const DEFAULT_ALLOW = [
  "drip_*", "refs_*", "board_*", "project_*", "style_*", "feedback_*",
  "components_*", "pattern_*", "palette_*", "gradient_*", "icons_*", "fonts_*", "images_*", "optical_*",
  "gen_*", "keys_status", "fitcheck_*", "critic_*", "logo_*", "pack_*",
  "art_*", "shader_*", "scene_*", "assets_*", "blender_*", "motion_*", "wordmark_*",
  "pieces_*", "parts_*", "layout_*", "build_*", "page_*", "mockup_*", "checker_*", "scout_*",
];

/** Tools that start a local server or open a window. Exact-name allow in config re-enables them. */
export const DEFAULT_BLOCKED = ["board_open", "keys_open", "drip_serve"];

/** Never callable from a script. */
export const NEVER = ["drip_execute"];

function globToRegExp(glob) {
  return new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
}

const matches = (name, patterns) => patterns.some((p) => globToRegExp(p).test(name));

/** The set of tool names a script can call, given every registered tool name and the config. */
export function allowedTools(names, config = {}) {
  const cm = config.codemode || {};
  const allow = Array.isArray(cm.allow) ? cm.allow : [];
  const deny = Array.isArray(cm.deny) ? cm.deny : [];
  const out = [];
  for (const name of names) {
    if (NEVER.includes(name)) continue;
    if (matches(name, deny)) continue;
    const explicit = allow.includes(name);
    if (DEFAULT_BLOCKED.includes(name) && !explicit) continue;
    if (explicit || matches(name, DEFAULT_ALLOW) || matches(name, allow)) out.push(name);
  }
  return out;
}

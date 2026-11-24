// MCP Apps (https://github.com/modelcontextprotocol/ext-apps, spec 2026-01-26, "SEP-1865"): a tool can point at an
// interactive HTML view (`ui://...`) that the host renders in a sandboxed iframe next to the chat. This file holds the
// server-side helpers and a tiny View runtime written in plain JavaScript (no SDK, no network, no external files),
// so a Drip preview can offer parameter controls where the host supports it and still return image blocks and files
// everywhere else. UI is only ever an addition: every tool keeps its normal content.
//
// How a tool adopts it (see modules/studio/viewer.mjs):
//   1. registerAppResource(server, { uri, name, html })          once, at registration
//   2. server.registerTool(name, { ..., _meta: appToolMeta(uri) }, handler)
//   3. in the handler: return withApp(server, result, uri, structured)   adds structuredContent only for hosts that render Apps
//
// board_open and fitcheck can adopt it the same way: build the HTML with appShell(), register it, add appToolMeta to the
// tool, and hand the board or the shots over as `structured` (the View receives it as the tool result). A host without
// Apps support never sees any of it.

export const APP_MIME = "text/html;profile=mcp-app";
export const UI_EXTENSION = "io.modelcontextprotocol/ui";
export const APP_SPEC_VERSION = "2026-01-26";

/** Tool `_meta` that links a tool to its View. `visibility: ["app"]` makes a tool callable by the View only. */
export function appToolMeta(uri, { visibility } = {}) {
  return { ui: { resourceUri: uri, ...(visibility ? { visibility } : {}) }, "ui/resourceUri": uri };
}

/** Does the connected host render MCP Apps? False for the CLI, tests and any host that did not advertise the extension. */
export function hostSupportsApps(server) {
  try {
    const caps = (server?.server || server)?.getClientCapabilities?.();
    const ext = caps?.extensions?.[UI_EXTENSION] || caps?.experimental?.[UI_EXTENSION];
    return !!ext && (!ext.mimeTypes || ext.mimeTypes.includes(APP_MIME));
  } catch {
    return false;
  }
}

/**
 * Declare a View as a resource. Works on an McpServer; the CLI and registry sinks have no registerResource
 * (or a no-op one) and ignore it. Returns true when the server took it.
 */
const registered = new WeakMap();

export function registerAppResource(server, { uri, name, description, html, csp }) {
  if (typeof server?.registerResource !== "function") return false;
  const done = registered.get(server) || registered.set(server, new Set()).get(server);
  if (done.has(uri)) return true; // several tools share one View
  done.add(uri);
  server.registerResource(name, uri, { description, mimeType: APP_MIME, ...(csp ? { _meta: { ui: { csp } } } : {}) }, async () => ({
    contents: [{ uri, mimeType: APP_MIME, text: html, ...(csp ? { _meta: { ui: { csp } } } : {}) }],
  }));
  return true;
}

/**
 * Attach what a View needs to a tool result: `structuredContent` (kept out of the model's context by Apps hosts) and the
 * resource link. Without Apps support the result is returned unchanged, so no host pays tokens for UI data.
 */
export function withApp(server, result, uri, structured) {
  if (!hostSupportsApps(server)) return result;
  return { ...result, structuredContent: structured, _meta: { ...(result._meta || {}), ui: { resourceUri: uri } } };
}

/**
 * A complete View document. `body` is the HTML inside <body>; `script` runs after the handshake helper is defined and
 * can use the global `app`:
 *   app.onResult(fn)        fn(toolResult) for every ui/notifications/tool-result (structuredContent is in fn's argument)
 *   app.callTool(name, args) a tools/call through the host; resolves with the result
 *   app.context             the host context from the handshake (theme, styles, containerDimensions)
 *   app.size()              tell the host the content height (ui/notifications/size-changed)
 * Colours follow the host's CSS variables when it sends them, else the system light/dark preference.
 */
export function appShell({ title = "Drip", css = "", body = "", script = "" }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
:root{color-scheme:light dark;--bg:light-dark(#fbfaf7,#16140f);--fg:light-dark(#16140f,#f1eee6);--muted:light-dark(#77716a,#a39e93);--line:light-dark(#d9d6cd,#3a372f);--accent:light-dark(#d4400e,#ff7a45);--panel:light-dark(#fff,#1f1d17)}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--bg);color:var(--fg);font:13px/1.45 var(--font-sans,system-ui,sans-serif);padding:12px}
button,select,input{font:inherit;color:inherit}
button{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:5px 10px;cursor:pointer}button:hover{border-color:var(--accent)}
input,select{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:4px 6px}
${css}
</style></head><body>${body}
<script>
const app = (() => {
  let nextId = 1;
  const pending = new Map();
  const handlers = [];
  let last = null;
  const post = (msg) => window.parent.postMessage({ jsonrpc: "2.0", ...msg }, "*");
  const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); post({ id, method, params }); });
  window.addEventListener("message", (ev) => {
    const m = ev.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.id !== undefined && !m.method && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message || "error")) : p.resolve(m.result);
    } else if (m.method === "ui/notifications/tool-result") { last = m.params; handlers.forEach((h) => h(m.params)); }
    else if (m.method === "ui/notifications/host-context-changed") { Object.assign(api.context, m.params || {}); applyHost(api.context); }
    else if (m.id !== undefined && m.method === "ping") post({ id: m.id, result: {} });
    else if (m.id !== undefined && m.method === "ui/resource-teardown") post({ id: m.id, result: {} });
  });
  function applyHost(ctx) {
    const vars = ctx && ctx.styles && ctx.styles.variables;
    if (vars) for (const [k, v] of Object.entries(vars)) if (v) document.documentElement.style.setProperty(k, v);
    if (ctx && ctx.theme) document.documentElement.style.colorScheme = ctx.theme;
  }
  const api = {
    context: {},
    onResult(fn) { handlers.push(fn); if (last) fn(last); },
    callTool: (name, args) => request("tools/call", { name, arguments: args }),
    size() { post({ method: "ui/notifications/size-changed", params: { height: Math.ceil(document.documentElement.scrollHeight) } }); },
    openLink: (url) => request("ui/open-link", { url }),
    ready: null,
  };
  api.ready = request("ui/initialize", { appInfo: { name: "drip-view", version: "1" }, appCapabilities: {}, protocolVersion: "${APP_SPEC_VERSION}" })
    .then((res) => { api.context = (res && res.hostContext) || {}; applyHost(api.context); post({ method: "ui/notifications/initialized", params: {} }); return res; })
    .catch(() => null);
  return api;
})();
${script}
</script></body></html>`;
}

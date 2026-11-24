// One MCP Apps View for every studio tool: shows the rendered image and, below it, controls for the tool's parameters.
// Changing a control calls the same tool again through the host (without saving a file) and swaps the picture;
// "Save" repeats the call with the original `out`. Hosts without MCP Apps support never see this: the tools return
// an image block, the layer/scene spec and the files, as before.
import { appShell, appToolMeta, registerAppResource, withApp } from "../../core/apps.mjs";

export const VIEWER_URI = "ui://drip/studio-preview";

export function viewerHtml() {
  return appShell({
    title: "Drip studio preview",
    css: `
figure{margin:0 0 10px}img{display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line)}
h1{font-size:14px;margin:0 0 6px;font-weight:600}.sum{color:var(--muted);margin:0 0 10px;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px 12px;margin-bottom:10px}
label{display:flex;flex-direction:column;gap:3px;color:var(--muted);font-size:11px}label input,label select{color:var(--fg);width:100%}
.row{display:flex;gap:8px;align-items:center}.busy{opacity:.55;transition:opacity .15s}`,
    body: `<h1 id=t></h1><figure id=f><img id=img alt="" hidden></figure><p class=sum id=s></p><div class=grid id=c></div><div class=row><button id=shuffle hidden>New seed</button><button id=save hidden>Save to project</button><span class=sum id=m></span></div>`,
    script: `
const $ = (id) => document.getElementById(id);
let state = null, timer = null;
const setPath = (obj, path, value) => { const out = structuredClone(obj); const keys = path.split("."); let o = out; keys.slice(0, -1).forEach((k) => { o = o[k] ?? (o[k] = {}); }); o[keys[keys.length - 1]] = value; return out; };
function render(sc) {
  if (!sc || sc.kind !== "studio") return;
  const keepOut = state && state.args && state.args.out;
  state = keepOut && !(sc.args && sc.args.out) ? { ...sc, args: { ...sc.args, out: keepOut } } : sc;
  sc = state;
  $("t").textContent = sc.title || sc.tool;
  $("s").textContent = sc.summary || "";
  if (sc.image) { $("img").src = sc.image; $("img").hidden = false; }
  const box = $("c"); box.textContent = "";
  for (const c of sc.controls || []) {
    const label = document.createElement("label"); label.textContent = c.label || c.key;
    let input;
    if (c.type === "select") { input = document.createElement("select"); for (const o of c.options || []) { const op = document.createElement("option"); op.value = o; op.textContent = o; if (o === c.value) op.selected = true; input.append(op); } }
    else if (c.type === "toggle") { input = document.createElement("input"); input.type = "checkbox"; input.checked = !!c.value; }
    else { input = document.createElement("input"); input.type = c.type === "color" ? "color" : c.type === "range" ? "range" : "number"; input.value = c.value; if (c.min !== undefined) input.min = c.min; if (c.max !== undefined) input.max = c.max; if (c.step !== undefined) input.step = c.step; }
    input.addEventListener("input", () => { const v = c.type === "toggle" ? input.checked : (c.type === "number" || c.type === "range") ? Number(input.value) : input.value; change(c.key, v); });
    label.append(input); box.append(label);
  }
  const hasSeed = (sc.controls || []).some((c) => c.key === "seed");
  $("shuffle").hidden = !hasSeed; $("save").hidden = !(sc.args && sc.args.out);
  setTimeout(() => app.size(), 30);
}
function run(args, msg) {
  document.body.classList.add("busy"); $("m").textContent = msg || "Rendering...";
  app.callTool(state.tool, args).then((res) => { document.body.classList.remove("busy"); $("m").textContent = msg ? "Saved." : ""; if (res && res.structuredContent) render(res.structuredContent); }).catch((e) => { document.body.classList.remove("busy"); $("m").textContent = "Could not render: " + e.message; });
}
function change(key, value) {
  clearTimeout(timer);
  timer = setTimeout(() => { const next = setPath(state.args, key, value); delete next.out; state = { ...state, args: { ...next, out: state.args.out } }; run(next); }, 250);
}
$("shuffle").addEventListener("click", () => change("seed", Math.floor(Math.random() * 1e6)));
$("save").addEventListener("click", () => run(state.args, "Saving..."));
app.onResult((res) => render(res && res.structuredContent));
`,
  });
}

/** Register the View once per server (a no-op on the CLI and in tests). */
export function registerViewer(server) {
  return registerAppResource(server, { uri: VIEWER_URI, name: "drip-studio-preview", description: "Rendered preview with parameter controls for Drip's studio tools", html: viewerHtml() });
}

export const studioToolMeta = () => appToolMeta(VIEWER_URI);

/** Add the View's data to a result (only for hosts that render MCP Apps). `structured` = { tool, args, title, summary, image, controls }. */
export function studioResult(server, result, structured) {
  return withApp(server, result, VIEWER_URI, { kind: "studio", ...structured });
}

/** A data URL for a small JPEG preview, for the View. */
export const dataUrl = (buf, mime = "image/jpeg") => `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;

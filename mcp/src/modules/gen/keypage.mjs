// A one-off local page where the user pastes API keys. Keys go to ~/.drip/keys.json and never pass
// through Claude. The URL carries a random token so other local pages can't post to it.
import { servePage } from "../../core/localpage.mjs";
import { keyStatus, setKey } from "../../core/keys.mjs";
import { escHtml as esc } from "../../core/util.mjs";

let running = null;

function page(names, token, msg = "") {
  const rows = keyStatus(names)
    .map((k) => `<tr><td>${esc(k.name)}</td><td>${k.set ? `set (${esc(k.from)})` : "not set"}</td></tr>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drip keys</title>
<style>body{font:15px/1.5 system-ui;background:#f4f1ea;color:#16140f;max-width:560px;margin:48px auto;padding:0 16px}h1{font:600 28px ui-serif,Georgia,serif}
input,select,button{font:inherit;padding:8px 10px;border:1px solid #cfc9bc;border-radius:8px;width:100%;box-sizing:border-box;margin:6px 0}button{background:#16140f;color:#fff;border:0;cursor:pointer}
table{width:100%;border-collapse:collapse;margin-top:24px}td{border-top:1px solid #e2ddd2;padding:6px 0}.msg{background:#e8f5e9;padding:8px 12px;border-radius:8px}</style>
<h1>Drip API keys</h1><p>Keys are saved on this computer in <code>~/.drip/keys.json</code>. Claude never sees them.</p>
${msg ? `<p class="msg">${esc(msg)}</p>` : ""}
<form method="post" action="/save?t=${token}"><label>Provider<select name="name">${names.map((n) => `<option>${esc(n)}</option>`).join("")}</select></label>
<label>Name (for a custom provider)<input name="custom" placeholder="optional, e.g. replicate"></label>
<label>Key<input name="value" type="password" autocomplete="off" required></label><button>Save key</button></form>
<table>${rows}</table>`;
}

export async function openKeyPage(names) {
  if (running) return running.url;
  running = await servePage(
    ({ url, form, token, send }) => {
      if (form && url.pathname === "/save") {
        const name = (form.get("custom") || form.get("name") || "").trim().toLowerCase();
        if (name && form.get("value")) setKey(name, form.get("value"));
        return send(page(names, token, `Saved key for ${name}.`));
      }
      send(page(names, token));
    },
    { onClose: () => (running = null) },
  );
  return running.url;
}

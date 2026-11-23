// A style tile: one direction applied to a tiny piece of UI (nav, headline, body, buttons, a card,
// palette and type specimen), so a direction can be judged as a world, not as a list of references.
import { contrast } from "../assets/color.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function fonts(type) {
  const parts = String(type || "")
    .split(/\s*(?:\+|&|\/| and |,)\s*/i)
    .map((s) => s.replace(/\([^)]*\)/g, "").replace(/\b(\d{3}|bold|regular|medium|semibold|light|display|text|ui|body|wordmark|headings?)\b/gi, "").trim())
    .filter(Boolean);
  return { display: parts[0] || "Inter", text: parts[1] || parts[0] || "Inter" };
}

const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c);

/** Pick ground / ink / accent from a palette given in role order, fixing obviously unreadable pairs. */
function roles(palette) {
  const p = palette.filter(isHex);
  let [ground, ink, accent, ...rest] = p.length >= 3 ? p : [p[0] || "#F5F5F2", p[1] || "#111111", p[1] || "#111111"];
  if (contrast(ink, ground) < 4.5) ink = contrast("#111111", ground) > contrast("#F5F5F5", ground) ? "#111111" : "#F5F5F5";
  const onAccent = contrast("#FFFFFF", accent) >= contrast("#111111", accent) ? "#FFFFFF" : "#111111";
  return { ground, ink, accent, support: rest[0] || accent, onAccent, all: p };
}

export function tileHtml(direction, { brand, headline, body, cta }) {
  const f = fonts(direction.type);
  const r = roles(direction.palette || []);
  const gf = (fam) => `family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@400;500;600;700;800`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${gf(f.display)}&${gf(f.text)}&display=block">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:760px;background:${r.ground};color:${r.ink};font-family:'${f.text}',system-ui,sans-serif;display:grid;grid-template-columns:1fr 330px;overflow:hidden}
main{padding:36px 48px;display:flex;flex-direction:column;gap:28px}
nav{display:flex;align-items:center;justify-content:space-between;font-size:15px}
nav b{font-family:'${f.display}';font-size:22px;letter-spacing:-.01em}
nav span{opacity:.75;margin-left:22px}
h1{font-family:'${f.display}';font-weight:700;font-size:68px;line-height:1.02;letter-spacing:-.025em;margin:18px 0 0;max-width:14ch}
p{font-size:18px;line-height:1.55;max-width:46ch;margin:0;opacity:.82}
.row{display:flex;gap:12px;align-items:center}
.btn{padding:13px 22px;border-radius:10px;font-weight:600;font-size:15px}
.primary{background:${r.accent};color:${r.onAccent}}
.ghost{border:1.5px solid ${r.ink};color:${r.ink}}
.card{margin-top:auto;border:1px solid color-mix(in srgb, ${r.ink} 18%, transparent);border-radius:14px;padding:18px 20px;display:flex;gap:16px;align-items:center;max-width:520px}
.card i{width:44px;height:44px;border-radius:10px;background:${r.support};flex:none}
.card small{opacity:.65;display:block;margin-top:2px}
aside{background:color-mix(in srgb, ${r.ink} 6%, ${r.ground});padding:36px 28px;display:flex;flex-direction:column;gap:22px;border-left:1px solid color-mix(in srgb, ${r.ink} 12%, transparent)}
aside h2{font:600 13px/1 '${f.text}';letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin:0}
.name{font-family:'${f.display}';font-size:34px;font-weight:700;line-height:1.05;margin:0}
.sw{display:grid;grid-template-columns:repeat(${Math.min(Math.max(r.all.length, 3), 6)},1fr);gap:6px}
.sw div{height:58px;border-radius:8px;border:1px solid color-mix(in srgb, ${r.ink} 12%, transparent)}
.sw span{display:block;font:500 10px/1.3 ui-monospace,monospace;opacity:.7;margin-top:4px}
.spec{font-family:'${f.display}';font-size:64px;line-height:1}
.spec small{display:block;font:400 13px/1.4 '${f.text}';opacity:.7;margin-top:6px}
.adj{display:flex;flex-wrap:wrap;gap:6px}.adj span{border:1px solid color-mix(in srgb, ${r.ink} 25%, transparent);border-radius:99px;padding:4px 10px;font-size:13px}
</style></head><body>
<main>
  <nav><b>${esc(brand)}</b><div><span>Work</span><span>About</span><span>Contact</span></div></nav>
  <div><h1>${esc(headline)}</h1></div>
  <p>${esc(body)}</p>
  <div class="row"><span class="btn primary">${esc(cta)}</span><span class="btn ghost">How it's made</span></div>
  <div class="card"><i></i><div><b>${esc(direction.name)}</b><small>${esc(direction.summary).slice(0, 90)}</small></div></div>
</main>
<aside>
  <h2>Direction</h2><p class="name">${esc(direction.name)}</p>
  <div class="adj">${(direction.adjectives || []).map((a) => `<span>${esc(a)}</span>`).join("")}</div>
  <h2>Palette</h2><div class="sw">${r.all.slice(0, 6).map((c) => `<div style="background:${c}"></div>`).join("")}</div>
  <div class="sw" style="margin-top:-18px">${r.all.slice(0, 6).map((c) => `<span>${c}</span>`).join("")}</div>
  <h2>Type</h2><div class="spec">Aa<small>${esc(f.display)} / ${esc(f.text)}</small></div>
</aside>
</body></html>`;
}

// A direction comp: the direction's FIRST VIEWPORT at 1440x900, at real sizes (the Display token for the h1,
// the Lead for the sentence), with its picture slot at the size the page will use, plus a thin spec strip
// (name, palette, faces). Directions are judged as compositions, never as palette tiles (playbook P13).
import { contrast } from "../assets/color.mjs";
import { escHtml as esc } from "../../core/util.mjs";


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

export const COMP = { width: 1440, height: 1000 };

export function tileHtml(direction, { brand, headline, body, cta }) {
  const f = fonts(direction.type);
  const r = roles(direction.palette || []);
  const layout = direction.layout || "split";
  const gf = (fam) => `family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@300;400;500;700;800`;
  const picture = direction.picture || "the subject's strongest real thing";
  const pic = `<figure class="pic"><span>Picture: ${esc(picture)}</span></figure>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${gf(f.display)}&${gf(f.text)}&display=block">
<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1440px;height:1000px;background:${r.ground};color:${r.ink};font-family:'${f.text}',system-ui,sans-serif;overflow:hidden}
.vp{height:900px;display:flex;flex-direction:column;padding:0 64px}
nav{height:88px;display:flex;align-items:center;justify-content:space-between;font-size:16px}
nav b{font-family:'${f.display}';font-size:22px;font-weight:700}
nav span{margin-left:32px}
.act{background:${r.accent};color:${r.onAccent};padding:14px 24px;border-radius:999px;font-weight:600;font-size:17px;display:inline-block}
.hero{flex:1;display:grid;gap:32px;padding-bottom:48px;align-items:end}
.split .hero{grid-template-columns:repeat(12,1fr)}
.split .copy{grid-column:1/7;align-self:end}
.split .pic{grid-column:7/13;height:100%;min-height:600px}
.bleed .vp{position:relative}
.bleed .pic{position:absolute;inset:0;z-index:0;border-radius:0}
.bleed .copy{position:relative;z-index:1}
.type .pic{height:200px}
h1{font-family:'${f.display}';font-size:127px;line-height:.98;letter-spacing:-.035em;font-weight:${direction.weight || 700};margin:0 0 28px;max-width:${layout === "split" ? "8ch" : "11ch"};text-wrap:balance}
.split h1{font-size:104px}
p{font-size:21px;line-height:1.45;max-width:36ch;margin:0 0 32px}
.pic{margin:0;border-radius:${direction.radius ?? 8}px;background:linear-gradient(135deg, ${r.support}, color-mix(in srgb, ${r.support} 55%, ${r.ground}));display:flex;align-items:flex-end;padding:20px}
.pic span{font-size:15px;background:${r.ground};color:${r.ink};padding:6px 10px;border-radius:4px;max-width:44ch}
.spec{height:100px;display:flex;align-items:center;gap:28px;padding:0 64px;background:${r.ink};color:${r.ground};font-size:15px}
.spec b{font-family:'${f.display}';font-size:28px;font-weight:700;margin-right:12px}
.sw{display:flex;gap:6px}.sw i{width:36px;height:36px;border-radius:6px;border:1px solid color-mix(in srgb, ${r.ground} 30%, transparent)}
</style></head><body class="${esc(layout)}">
<div class="vp">
  ${layout === "bleed" ? pic : ""}
  <nav style="position:relative;z-index:1"><b>${esc(brand)}</b><div><span>Work</span><span>About</span><span>Contact</span></div></nav>
  <div class="hero">
    <div class="copy"><h1>${esc(headline)}</h1><p>${esc(body)}</p><span class="act">${esc(cta)}</span></div>
    ${layout === "split" ? pic : ""}
  </div>
  ${layout === "type" ? pic : ""}
</div>
<div class="spec"><b>${esc(direction.name)}</b><div class="sw">${r.all.slice(0, 6).map((c) => `<i style="background:${c}"></i>`).join("")}</div><span>${esc(f.display)} / ${esc(f.text)}</span><span>${esc((direction.adjectives || []).join(" · "))}</span></div>
</body></html>`;
}

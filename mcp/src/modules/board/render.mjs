// Renders a board as one self-contained HTML page.
//   mode "live":   served by the local board server; star / remove / note go straight back to Claude (board_read).
//   mode "static": a file to publish anywhere (e.g. a Claude artifact). Images are inlined; feedback is
//                  kept in the page and copied as text for the user to paste back.
import { fetchImage } from "../../core/images.mjs";
import { thumbUrl } from "../refs/dribbble.mjs";
import { liveItems } from "./store.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function imageSrc(item, inline) {
  if (!item.image) return null;
  const src = item.source === "dribbble" ? thumbUrl(item.image, 800, 600) : item.image;
  if (!inline) return src;
  try {
    const { buf, mime } = await fetchImage(src);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function card(item, n, inline) {
  const src = await imageSrc(item, inline);
  const media =
    item.kind === "color"
      ? `<div class="swatch" style="background:${esc(item.value)}"><span>${esc(item.value)}</span></div>`
      : item.kind === "font"
        ? `<div class="fontcard"><span>${esc(item.value)}</span><small>Aa Bb Cc 123</small></div>`
        : src
          ? `<img src="${src}" alt="${esc(item.title)}" loading="lazy">`
          : `<div class="noimg">${esc(item.title || item.value || "note")}</div>`;
  return `<figure class="item${item.starred ? " starred" : ""}" data-key="${esc(item.key)}">
  <div class="media">${media}<span class="num">${n}</span></div>
  <figcaption>
    ${item.title ? `<a class="title" href="${esc(item.url || "#")}" target="_blank" rel="noopener">${esc(item.title)}</a>` : ""}
    ${item.designer ? `<span class="by">${esc(item.designer)}</span>` : ""}
    ${item.note ? `<p class="note">${esc(item.note)}</p>` : ""}
    <div class="actions"><button data-act="star" title="Keep this">★</button><button data-act="remove" title="Not this">✕</button><button data-act="note" title="Add a note">✎</button></div>
  </figcaption>
</figure>`;
}

export async function renderBoard(board, { mode = "live", inline = false } = {}) {
  const items = liveItems(board);
  const numbers = new Map(items.map((it, i) => [it.key, i + 1]));
  const byKey = new Map(items.map((it) => [it.key, it]));
  const sections = [];
  for (const d of board.directions) {
    const its = d.items.map((k) => byKey.get(k)).filter(Boolean);
    const cards = await Promise.all(its.map((it) => card(it, numbers.get(it.key), inline)));
    sections.push(`<section class="direction${board.chosen === d.name ? " chosen" : ""}">
  <header>
    <div><h2>${esc(d.name)}${board.chosen === d.name ? ' <span class="pill">chosen</span>' : ""}</h2><p>${esc(d.summary)}</p></div>
    <div class="meta">
      ${(d.adjectives || []).map((a) => `<span class="chip">${esc(a)}</span>`).join("")}
      <div class="pal">${(d.palette || []).map((c) => `<i style="background:${esc(c)}" title="${esc(c)}"></i>`).join("")}</div>
      ${d.type ? `<span class="type">${esc(d.type)}</span>` : ""}
    </div>
  </header>
  <div class="grid">${cards.join("")}</div>
</section>`);
  }
  const grouped = new Set(board.directions.flatMap((d) => d.items));
  const loose = items.filter((it) => !grouped.has(it.key));
  if (loose.length) {
    const cards = await Promise.all(loose.map((it) => card(it, numbers.get(it.key), inline)));
    sections.push(`<section class="direction"><header><div><h2>${board.directions.length ? "Not grouped" : "Picks"}</h2><p>${loose.length} references</p></div></header><div class="grid">${cards.join("")}</div></section>`);
  }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(board.name)} · moodboard</title>
<style>
:root{--bg:#f4f1ea;--ink:#16140f;--muted:#6f6a5f;--line:#e2ddd2;--card:#fffdf8;--accent:#e8452c;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#151411;--ink:#f1ede4;--muted:#a39e92;--line:#2a2822;--card:#1d1b17;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.top{padding:40px clamp(16px,4vw,48px) 8px;max-width:1600px;margin:auto}
.top small{color:var(--muted);letter-spacing:.08em;text-transform:uppercase;font-size:12px}
.top h1{font:600 clamp(28px,4vw,44px)/1.1 ui-serif,Georgia,serif;margin:6px 0 10px;letter-spacing:-.01em}
.top p{color:var(--muted);max-width:70ch;margin:0}
main{padding:8px clamp(16px,4vw,48px) 80px;max-width:1600px;margin:auto}
.direction{margin-top:36px;padding-top:24px;border-top:1px solid var(--line)}
.direction.chosen{border-top:2px solid var(--accent)}
.direction header{display:flex;gap:24px;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}
.direction h2{font:600 22px/1.2 ui-serif,Georgia,serif;margin:0}.direction header p{margin:4px 0 0;color:var(--muted);max-width:60ch}
.pill{font:600 11px/1 ui-sans-serif,system-ui;background:var(--accent);color:#fff;border-radius:99px;padding:4px 8px;vertical-align:middle;margin-left:6px}
.meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.chip{border:1px solid var(--line);border-radius:99px;padding:3px 10px;font-size:13px}
.pal{display:flex}.pal i{width:22px;height:22px;border-radius:50%;border:2px solid var(--bg);margin-left:-6px}.type{font-size:13px;color:var(--muted)}
.grid{columns:4 280px;column-gap:16px}
.item{break-inside:avoid;margin:0 0 16px;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.item.starred{outline:2px solid var(--accent)}
.media{position:relative}.media img{display:block;width:100%;height:auto}
.num{position:absolute;top:8px;left:8px;background:rgba(17,17,17,.85);color:#fff;font:600 12px/1 ui-monospace,monospace;padding:5px 7px;border-radius:6px}
.swatch{aspect-ratio:4/3;display:flex;align-items:flex-end;padding:10px}.swatch span{background:rgba(255,255,255,.85);color:#111;border-radius:6px;padding:2px 6px;font:12px ui-monospace,monospace}
.fontcard{aspect-ratio:4/3;display:flex;flex-direction:column;justify-content:center;padding:16px;font-size:26px}.fontcard small{font-size:15px;color:var(--muted)}
.noimg{aspect-ratio:4/3;display:grid;place-items:center;color:var(--muted);padding:16px;text-align:center}
figcaption{padding:10px 12px 12px}.title{color:var(--ink);font-weight:600;text-decoration:none;display:block}.title:hover{text-decoration:underline}
.by{color:var(--muted);font-size:13px}.note{margin:8px 0 0;font-size:14px;border-left:2px solid var(--accent);padding-left:8px}
.actions{display:flex;gap:6px;margin-top:10px}.actions button{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:2px 9px;font-size:13px;color:var(--muted)}
.actions button:hover{color:var(--ink);border-color:var(--muted)}.actions button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.fb{position:fixed;right:16px;bottom:16px;background:var(--ink);color:var(--bg);border-radius:12px;padding:10px 14px;font-size:14px;display:none;gap:10px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.2)}
.fb button{all:unset;cursor:pointer;background:var(--accent);color:#fff;border-radius:8px;padding:4px 10px}
</style></head><body>
<div class="top"><small>Moodboard · ${items.length} references${board.directions.length ? ` · ${board.directions.length} directions` : ""}</small><h1>${esc(board.name)}</h1><p>${esc(board.brief || "")}</p></div>
<main>${sections.join("\n")}</main>
<div class="fb" id="fb"><span id="fbtext"></span><button id="fbcopy">Copy feedback for Claude</button></div>
<script>
const MODE=${JSON.stringify(mode)},BOARD=${JSON.stringify(board.id)},fb=[];
function show(){const el=document.getElementById('fb');if(MODE==='live'){return}el.style.display='flex';document.getElementById('fbtext').textContent=fb.length+' change'+(fb.length>1?'s':'');}
async function send(key,action,value){const entry={key,action,value,at:new Date().toISOString()};
 if(MODE==='live'){try{await fetch('/b/'+BOARD+'/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(entry)})}catch(e){}}else{fb.push(entry);show()}}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(!b)return;const fig=b.closest('.item'),key=fig.dataset.key,act=b.dataset.act;
 if(act==='star'){fig.classList.toggle('starred');send(key,'star',fig.classList.contains('starred'))}
 if(act==='remove'){fig.style.opacity=.3;send(key,'remove',true)}
 if(act==='note'){const v=prompt('Note for Claude');if(v){send(key,'note',v);const p=document.createElement('p');p.className='note';p.textContent=v;fig.querySelector('figcaption').insertBefore(p,fig.querySelector('.actions'))}}});
document.getElementById('fbcopy').onclick=()=>{const t='Moodboard feedback ('+BOARD+'):\\n'+fb.map(f=>'- '+f.action+' '+f.key+(f.action==='note'?': '+f.value:'')).join('\\n');navigator.clipboard.writeText(t);document.getElementById('fbtext').textContent='Copied. Paste it to Claude.'};
</script></body></html>`;
}

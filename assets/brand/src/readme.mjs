// README visuals: hero banner + two bento grids, rendered to assets/readme/*.png at 2x.
//   node assets/brand/src/readme.mjs [name-prefix]
// Everything is drawn here (our mark, type, shapes); icons come from Phosphor (MIT) via the Iconify API at render time.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { shoot, cleanup } from "./shoot.mjs";
import { COLORS, mark, MARK_BOUNDS, iconSvg, paint } from "./brand.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../readme");
fs.mkdirSync(out, { recursive: true });

const W = 830, GAP = 12;
const FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&family=Instrument+Serif:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,600&display=block";
const BLUE = COLORS.blue;

const THEMES = {
  light: { tile: "#F3F2EE", line: "#E7E5DF", ink: "#121318", ink2: "#6B6D76", ink3: "#A3A5AD", chip: "#FFFFFF", chipLine: "#E2E0DA", soft: "#E9E7E1" },
  dark: { tile: "#17181D", line: "#24252C", ink: "#EEEEF1", ink2: "#9A9CA6", ink3: "#5F616B", chip: "#202128", chipLine: "#2E2F37", soft: "#25262D" },
};

const icon = (name, color, size = 20) => `<img src="https://api.iconify.design/ph/${name}.svg?color=${encodeURIComponent(color)}" width="${size}" height="${size}" style="display:block">`;
const markSvg = (frame, size) => {
  const b = MARK_BOUNDS;
  return `<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${size}" height="${(size * b.h) / b.w}">${mark({ frame })}</svg>`;
};

const css = (t) => `
*{box-sizing:border-box;margin:0;padding:0}html,body{background:transparent}
body{width:${W}px;font:15px/1.4 Inter,system-ui,sans-serif;color:${t.ink};-webkit-font-smoothing:antialiased}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:${GAP}px}
.t{position:relative;background:${t.tile};border-radius:22px;box-shadow:inset 0 0 0 1px ${t.line};overflow:hidden;padding:24px 24px 0}
.c2{grid-column:span 2}.c3{grid-column:span 3}
.cap{font-size:17px;line-height:1.35;letter-spacing:-.01em;color:${t.ink2};max-width:30ch}.cap b{color:${t.ink};font-weight:600}
.blue{background:${BLUE};box-shadow:none}.blue .cap,.blue .cap b{color:#fff}.blue .cap{color:rgba(255,255,255,.72)}
.big{font-family:"Bricolage Grotesque";font-weight:700;letter-spacing:-.04em;line-height:.9;white-space:nowrap}
.chip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:17px;background:${t.chip};box-shadow:inset 0 0 0 1px ${t.chipLine};font-size:13.5px;font-weight:500;white-space:nowrap}
`;
const html = (t, extra, body) => `<!doctype html><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>${css(t)}${extra}</style>${body}`;

// ---------- Hero banner: one image for both themes ----------
function hero() {
  // The hero is the logo at banner size: the headline sits in a selected box of paint that drips off its bottom edge.
  const H = 360, BX = 40, BY = 40, BW = W - 80, BH = 200, hs = 14;
  const drips = [{ x: 104, w: 26, len: 70 }, { x: 306, w: 38, len: 150 }, { x: 384, w: 16, len: 30, s: 1.04 }, { x: 628, w: 22, len: 44 }];
  const handles = [[0, 0], [BW / 2, 0], [BW, 0], [0, BH / 2], [BW, BH / 2], [0, BH], [BW, BH]]
    .map(([x, y]) => `<rect x="${x - hs / 2}" y="${y - hs / 2}" width="${hs}" height="${hs}" rx="2.5" fill="#fff" stroke="${COLORS.blue}" stroke-width="2.5"/>`).join("");
  const svg = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0"><g transform="translate(${BX} ${BY})">
    <path d="${paint(BW, BH, drips, 14)}" fill="${COLORS.blue}"/>
    <rect width="${BW}" height="${BH}" fill="none" stroke="${COLORS.frameOnDark}" stroke-width="2"/>${handles}</g></svg>`;
  const extra = `
  .h{position:relative;height:${H}px;border-radius:24px;background:${COLORS.ink};overflow:hidden}
  .h h1{position:absolute;left:${BX + 36}px;top:${BY + 28}px;font-family:"Bricolage Grotesque";font-weight:800;font-size:80px;line-height:.92;letter-spacing:-.045em;color:#fff}
  .tag{position:absolute;right:40px;bottom:34px;font-size:13px;color:#8A8996;letter-spacing:.01em}
  .tag b{color:#D6D5DE;font-weight:500}
  `;
  const body = `<div class="h">${svg}
    <h1>Taste for your<br>coding agent.</h1>
    <div class="tag">for <b>Claude Code</b>, <b>Codex</b>, <b>Cursor</b> and any MCP agent</div>
  </div>`;
  return { name: "hero", h: H, html: html(THEMES.dark, extra, body) };
}

// ---------- Bento 1: the loop ----------
function loop(theme) {
  const t = THEMES[theme];
  const dark = theme === "dark";
  const H = 760;
  const extra = `
  .grid{grid-template-rows:330px 200px 206px}
  /* asks first */
  .q{position:absolute;left:24px;right:-40px;bottom:-14px;display:flex;flex-direction:column;gap:8px}
  .q .qh{font-family:"Bricolage Grotesque";font-weight:700;font-size:30px;letter-spacing:-.03em;margin-bottom:8px}
  .q .chip.on{background:${BLUE};color:#fff;box-shadow:none}
  .q .row{display:flex;gap:8px}
  /* directions */
  .dir{position:absolute;bottom:-30px;width:150px;height:190px;border-radius:14px;padding:16px;box-shadow:0 18px 30px -14px rgba(0,0,0,${dark ? ".7" : ".3"})}
  .dir.a{left:24px;background:#F4EFE4;color:#1B1A17;transform:rotate(-5deg);font-family:"Instrument Serif";font-size:34px;line-height:.95}
  .dir.b{left:118px;bottom:-14px;background:#0E1013;color:#C8F031;transform:rotate(4deg);font-family:"Bricolage Grotesque";font-weight:800;font-size:34px;line-height:.9;letter-spacing:-.04em;box-shadow:inset 0 0 0 1px #262A31,0 18px 30px -14px rgba(0,0,0,.5)}
  .dir small{display:block;font:600 10.5px/1 Inter;letter-spacing:.08em;margin-bottom:12px;opacity:.6}
  .rank{position:absolute;right:20px;top:118px;height:28px;padding:0 11px;border-radius:14px;background:${BLUE};color:#fff;font-size:12.5px;font-weight:600;display:flex;align-items:center}
  /* critic */
  .score{position:absolute;left:24px;bottom:22px;display:flex;align-items:baseline;gap:14px}
  .score .big{font-size:84px}
  .score .from{font-size:40px;color:${t.ink3};text-decoration:line-through;text-decoration-thickness:3px}
  .quote{font-family:"Instrument Serif";font-style:italic;font-size:22px;line-height:1.2;color:${t.ink};margin-top:12px;max-width:17ch}
  /* devices */
  .dev{position:absolute;bottom:-1px;border:2px solid ${t.ink};border-bottom:0;background:${t.chip}}
  .dev.d{left:24px;width:180px;height:84px;border-radius:12px 12px 0 0}
  .dev.p{left:168px;width:64px;height:100px;border-radius:16px 16px 0 0;background:${t.tile}}
  .dev i{display:block;height:6px;border-radius:3px;background:${t.soft};margin:10px 12px 0}
  .ok{position:absolute;right:20px;bottom:20px;z-index:2;width:30px;height:30px;border-radius:50%;background:#2FBF71;display:grid;place-items:center}
  /* hooks */
  .lockrow{position:absolute;left:24px;right:24px;bottom:24px;display:flex;gap:8px;align-items:center}
  .step{flex:1;height:44px;border-radius:12px;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:13px;font-weight:500;background:rgba(255,255,255,.12);color:#fff;white-space:nowrap}
  .step.off{background:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);color:rgba(255,255,255,.75)}
  `;
  const body = `<div class="grid">
    <div class="t c2"><div class="cap"><b>It asks first.</b> One round of four questions, with a recommendation you can take in one click.</div>
      <div class="q"><div class="qh">How should it feel?</div>
        <div class="row"><span class="chip on">${icon("check-bold", "#fff", 14)}Calm and exact</span><span class="chip">Loud and technical</span><span class="chip">Editorial</span></div>
        <div class="row"><span class="chip">Playful</span><span class="chip">Surprise me</span><span class="chip">Luxury, quiet</span><span class="chip">Retro</span></div>
        <div class="row" style="margin-bottom:24px"><span class="chip">Loves: Linear, Stripe docs</span><span class="chip">Hates: purple gradients</span></div>
      </div></div>
    <div class="t"><div class="cap"><b>Two directions.</b> The critic ranks them, you pick.</div>
      <div class="dir a"><small>A · LEDGER</small>Pay for what you keep.</div>
      <div class="dir b"><small style="color:#9BA197">B · SIGNAL</small>Books closed Friday.</div>
      <div class="rank">#1 · A</div></div>

    <div class="t blue c2" style="grid-row:span 1"><div class="cap"><b>Hooks keep it honest.</b> In Claude Code, UI files stay locked until the steps are done.</div>
      <div class="lockrow">
        <span class="step">${icon("check-bold", "#fff", 14)}Brief</span>
        <span class="step">${icon("check-bold", "#fff", 14)}References</span>
        <span class="step">${icon("check-bold", "#fff", 14)}Direction</span>
        <span class="step off">${icon("lock-simple-fill", "rgba(255,255,255,.75)", 14)}Build</span>
      </div></div>
    <div class="t"><div class="cap" style="max-width:20ch"><b>Checked on phone and desktop</b> before it says done.</div>
      <div class="ok">${icon("check-bold", "#fff", 16)}</div>
      <div class="dev d"><i style="width:60%"></i><i style="width:80%"></i><i style="width:45%"></i></div>
      <div class="dev p"><i style="width:60%;margin:14px 8px 0"></i><i style="margin:8px 8px 0"></i></div></div>

    <div class="t c3" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div><div class="cap"><b>A critic that sends work back.</b> A separate agent that only sees the brief and the screenshots.</div>
        <div class="score"><span class="big from">68</span><span class="big">84</span><span class="cap" style="font-size:14px">round 1 → round 2</span></div></div>
      <div style="padding-top:2px"><div class="cap" style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:${t.ink3}">Round 1, worst problem</div>
        <div class="quote">“The three plans are equal boxes. Nothing tells a visitor which one to buy.”</div></div>
    </div>
  </div>`;
  return { name: `loop-${theme}`, h: H, html: html(t, extra, body) };
}

// ---------- Bento 2: the toolbox ----------
function tools(theme) {
  const t = THEMES[theme];
  const H = 500;
  const libs = ["shadcn/ui", "Magic UI", "Aceternity", "React Bits", "Origin UI", "Motion Primitives", "Kokonut", "Cult UI", "Eldora", "Animata"];
  const icons = ["paint-brush", "drop", "pen-nib", "selection", "palette", "eyedropper", "ruler", "cursor-click", "sparkle", "stack", "frame-corners", "bezier-curve", "grid-four", "text-aa", "image", "camera"];
  const sw = [["#2340FF", "AA"], ["#F4EFE4", "AAA"], ["#C8F031", "AA"], ["#0E1013", "AAA"], ["#FF6A3D", "AA"]];
  const extra = `
  .grid{grid-template-rows:230px 258px}
  .stat .big{font-size:64px;margin-top:14px}
  .blue .chip{background:rgba(255,255,255,.12);box-shadow:none;color:#fff}.blue .big{color:#fff}.libs{position:absolute;left:24px;right:-60px;bottom:22px;display:flex;flex-wrap:wrap;gap:8px}
  .ic{position:absolute;left:24px;right:-30px;bottom:-12px;display:grid;grid-template-columns:repeat(6,46px);gap:8px}
  .ic span{width:46px;height:46px;border-radius:12px;background:${t.chip};box-shadow:inset 0 0 0 1px ${t.chipLine};display:grid;place-items:center}
  .fonts{position:absolute;left:24px;bottom:18px;display:flex;align-items:baseline;gap:18px;font-size:58px;line-height:1}
  .sw{position:absolute;left:24px;right:24px;bottom:24px;display:flex;gap:8px}
  .sw span{flex:1;height:96px;border-radius:12px;display:flex;align-items:flex-end;padding:8px;font-size:11.5px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
  .logo{position:absolute;left:24px;bottom:24px;display:flex;align-items:flex-end;gap:14px}
  `;
  const body = `<div class="grid">
    <div class="t c2 stat blue"><div class="cap"><b>Components from the libraries people actually use,</b> searchable by kind.</div>
      <div class="libs">${libs.map((l) => `<span class="chip">${l}</span>`).join("")}</div>
      <div class="big" style="position:absolute;right:24px;top:20px;font-size:52px">3,700+</div></div>
    <div class="t"><div class="cap"><b>200k icons,</b> one set at a time.</div>
      <div class="ic">${icons.slice(0, 12).map((n) => `<span>${icon(n, t.ink, 22)}</span>`).join("")}</div></div>

    <div class="t"><div class="cap"><b>Every open font,</b> paired and previewed.</div>
      <div class="fonts"><span style="font-family:'Instrument Serif'">Aa</span><span style="font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.04em">Aa</span><span style="font-family:Fraunces;font-weight:600">Aa</span></div></div>
    <div class="t"><div class="cap"><b>Palettes that pass contrast</b> before they ship.</div>
      <div class="sw">${sw.map(([c, l]) => `<span style="background:${c};color:${["#F4EFE4", "#C8F031"].includes(c) ? "#121318" : "#fff"}">${l}</span>`).join("")}</div></div>
    <div class="t"><div class="cap"><b>Logo tools.</b> Outlines, optical centre, favicons and app icons.</div>
      <div class="logo">${[76, 44, 24].map((n) => `<img src="data:image/svg+xml;base64,${Buffer.from(iconSvg()).toString("base64")}" width="${n}" height="${n}">`).join("")}</div></div>
  </div>`;
  return { name: `tools-${theme}`, h: H, html: html(t, extra, body) };
}

const scenes = [hero(), ...["light", "dark"].flatMap((th) => [loop(th), tools(th)])];
const only = process.argv[2];
for (const s of scenes) if (!only || s.name.startsWith(only)) shoot(s.html, path.join(out, `${s.name}.png`), W, s.h, 2);
cleanup();

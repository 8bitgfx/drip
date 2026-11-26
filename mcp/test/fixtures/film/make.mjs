// Makes the fixture film the Film viewer is developed and tested against: references, assets, pieces, three agents
// with write targets, tall frames of a page growing section by section, a blank frame and an error-overlay frame.
// Run: node mcp/test/fixtures/film/make.mjs   (needs Edge or Chrome; writes JPEGs and film.json next to this file)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Jimp } from "jimp";

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "drip-film-fixture-"));
const browser = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => fs.existsSync(p));
if (!browser) throw new Error("no Chrome or Edge found");

async function shoot(html, name, w, h, outW, quality = 72) {
  const file = path.join(tmp, `${name.replace(/\W/g, "_")}.html`);
  const png = path.join(tmp, `${name.replace(/\W/g, "_")}.png`);
  fs.writeFileSync(file, html);
  execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${w},${h}`, `--screenshot=${png}`, `file:///${file.replace(/\\/g, "/")}`], { stdio: "ignore" });
  const img = await Jimp.read(png);
  img.resize({ w: outW });
  const out = path.join(here, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await img.write(out, { quality });
  return { width: w, height: h };
}

const CSS = `*{box-sizing:border-box;margin:0}body{font-family:Georgia,serif;background:#f4efe6;color:#2a211b;width:1440px;overflow:hidden}
.sans{font-family:"Segoe UI",Helvetica,Arial,sans-serif}section{position:relative;overflow:hidden}`;

// The page, section by section (fixed heights so write targets are exact).
const NAV = (accent) => `<section style="height:80px;display:flex;align-items:center;justify-content:space-between;padding:0 120px;border-bottom:1px solid #e2d8c8" class="sans">
<b style="font:600 22px Georgia">Kiln</b><span style="display:flex;gap:40px;font-size:15px;color:#6b5d50">Shop <span>Workshops</span> <span>Studio</span></span>
<span style="background:${accent};color:#fff;padding:12px 22px;border-radius:999px;font-size:14px">Book a class</span></section>`;
const HERO = (accent, glow) => `<section style="height:820px;padding:150px 120px 0">
<div style="position:absolute;right:-120px;top:40px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle at 40% 40%,${glow},transparent 68%)"></div>
<div style="position:absolute;right:170px;top:170px;width:440px;height:520px;border-radius:220px 220px 40px 40px;background:linear-gradient(160deg,#c9a27c,#8a5a3c)"></div>
<h1 style="font-size:96px;line-height:1;letter-spacing:-2px;max-width:700px;font-weight:400">Clay, slowly,<br><i>by hand</i>.</h1>
<p class="sans" style="font-size:19px;line-height:1.6;max-width:470px;margin-top:32px;color:#6b5d50">Wheel classes, open studio hours and small-batch stoneware from a converted kiln house in Leith.</p>
<span class="sans" style="display:inline-block;margin-top:40px;background:${accent};color:#fff;padding:16px 28px;border-radius:999px;font-size:16px">See this month's classes</span></section>`;
const FEATURES = `<section style="height:800px;padding:110px 120px;background:#ebe3d6">
<h2 style="font-size:56px;font-weight:400;letter-spacing:-1px">Three ways in</h2>
<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:24px;margin-top:56px;height:440px">
<div style="border-radius:28px;background:linear-gradient(140deg,#8a5a3c,#c9a27c);padding:36px;color:#fff;display:flex;align-items:flex-end;font-size:30px">Six-week wheel course</div>
<div style="border-radius:28px;background:#2a211b;color:#f4efe6;padding:32px;display:flex;align-items:flex-end;font-size:24px">Open studio</div>
<div style="border-radius:28px;background:#d8c7ae;padding:32px;display:flex;align-items:flex-end;font-size:24px">Glaze nights</div></div></section>`;
const PRICING = (mid) => `<section style="height:800px;padding:110px 120px">
<h2 style="font-size:56px;font-weight:400;letter-spacing:-1px">Memberships</h2>
<div class="sans" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:56px">
${["Drop-in|£28|one session, clay and firing included", "Regular|£96|four sessions a month and a shelf|1", "Studio|£180|unlimited open hours, your own wheel"]
  .map((p) => {
    const [n, v, d, m] = p.split("|");
    const dark = m && mid;
    return `<div style="border-radius:28px;padding:40px;height:420px;border:1px solid #e2d8c8;background:${dark ? "#2a211b" : "#fbf8f3"};color:${dark ? "#f4efe6" : "#2a211b"}"><div style="font-size:16px;opacity:.7">${n}</div><div style="font:400 64px Georgia;margin-top:24px">${v}</div><p style="margin-top:20px;font-size:16px;line-height:1.5;opacity:.75">${d}</p></div>`;
  })
  .join("")}</div></section>`;
const FAQ = `<section style="height:500px;padding:100px 120px;background:#ebe3d6"><h2 style="font-size:56px;font-weight:400">Questions</h2>
<div class="sans" style="margin-top:40px;font-size:20px;line-height:2.6;border-top:1px solid #cdbfa9">${["Do I need any experience?", "Can I take my pieces home?", "Do you run private sessions?"].map((q) => `<div style="border-bottom:1px solid #cdbfa9">${q}</div>`).join("")}</div></section>`;
const FOOTER = `<section class="sans" style="height:200px;padding:70px 120px;background:#2a211b;color:#cdbfa9;display:flex;justify-content:space-between"><b style="font:400 40px Georgia;color:#f4efe6">Kiln</b><span>12 Coburg St, Leith · hello@kiln.studio</span></section>`;

const page = (...parts) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${parts.join("")}</body></html>`;

const STAGES = [
  { parts: [NAV("#2a211b"), HERO("#2a211b", "#e8c9a6")], h: 900 },
  { parts: [NAV("#b4532a"), HERO("#b4532a", "#f0b98a")], h: 900 },
  { parts: [NAV("#b4532a"), HERO("#b4532a", "#f0b98a"), FEATURES], h: 1700 },
  { parts: [NAV("#b4532a"), HERO("#b4532a", "#f0b98a"), FEATURES, PRICING(false)], h: 2500 },
  { blank: true },
  { parts: [NAV("#b4532a"), HERO("#b4532a", "#f0b98a"), FEATURES, PRICING(true)], h: 2500 },
  { error: true },
  { parts: [NAV("#b4532a"), HERO("#b4532a", "#f0b98a"), FEATURES, PRICING(true), FAQ, FOOTER], h: 3200 },
];

const card = (bg, ink, title, body) => page(`<section class="sans" style="height:900px;background:${bg};color:${ink};padding:120px 140px"><div style="font:400 104px Georgia;letter-spacing:-3px;line-height:1">${title}</div><p style="margin-top:36px;font-size:24px;max-width:640px;line-height:1.5;opacity:.8">${body}</p>
<div style="position:absolute;right:120px;bottom:120px;width:520px;height:380px;border-radius:32px;background:linear-gradient(135deg,${ink}33,${ink}05)"></div></section>`);
const REFS = [
  { title: "Ceramic studio, warm editorial", url: "https://www.ceramicstudio.example/", html: card("#efe6d8", "#3b2a20", "Made in<br>the fire", "Serif display type over warm clay tones, one photo carrying the hero.") },
  { title: "Workshop booking, calm grid", url: "https://www.workshops.example/", html: card("#1f2a24", "#e9efe7", "Learn the<br>wheel", "A booking grid with big dates and quiet cards.") },
  { title: "Craft shop, product first", url: "https://www.craftshop.example/", html: card("#f6f1ea", "#7a3e22", "Small<br>batches", "Products on soft paper backgrounds, prices set in serif.") },
  { title: "Pottery school, dark hero", url: "https://www.potteryschool.example/", html: card("#2b1d16", "#f2d9bf", "Hands<br>in clay", "Dark hero with a lit object and a single call to action.") },
];
const PIECES = [
  { name: "bento-grid", url: "https://magicui.design/r/bento-grid.json", html: page(`<section class="sans" style="height:900px;background:#0f1014;padding:90px;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:24px"><div style="grid-row:span 2;border-radius:28px;background:linear-gradient(160deg,#2d3250,#14161f)"></div><div style="border-radius:28px;background:#1b1d26"></div><div style="border-radius:28px;background:#232634"></div></section>`) },
  { name: "pricing-cards", url: "https://ui.example/r/pricing-cards.json", html: page(`<section class="sans" style="height:900px;background:#fafafa;padding:140px 90px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px">${[0, 1, 0].map((d) => `<div style="border-radius:28px;background:${d ? "#111" : "#fff"};border:1px solid #e5e5e5"></div>`).join("")}</section>`) },
  { name: "accordion", url: "https://ui.example/r/accordion.json", html: page(`<section class="sans" style="height:900px;background:#fff;padding:160px 200px;font-size:34px;line-height:3;color:#222">${["How does it work?", "What does it cost?", "Can I cancel?"].map((q) => `<div style="border-bottom:2px solid #eee">${q}</div>`).join("")}</section>`) },
];
const ASSET = page(`<section style="height:900px;background:radial-gradient(circle at 35% 40%,#f0b98a,#b4532a 55%,#3b1d10)"><div style="position:absolute;left:520px;top:180px;width:440px;height:540px;border-radius:220px 220px 40px 40px;background:linear-gradient(160deg,#e8c9a6,#8a5a3c)"></div></section>`);
const BLANK = page(`<section style="height:900px;background:#fff"></section>`);
const ERROR = page(`<section class="sans" style="height:900px;background:rgba(0,0,0,.66);padding:80px 120px"><div style="background:#181818;border-top:8px solid #ff5555;padding:40px;height:560px;font:15px Consolas,monospace;color:#ff5555">[plugin:vite:import-analysis] Failed to resolve import "./pricing-3" from "src/components/pricing.tsx". Does the file exist?<div style="color:#ccc;margin-top:30px;line-height:2">at TransformPluginContext._formatLog<br>at TransformPluginContext.error<br>at normalizeUrl</div></div></section>`);

const T0 = Date.parse("2026-11-25T10:00:00Z");
const at = (s) => new Date(T0 + s * 1000).toISOString();
const events = [];
const ev = (s, e) => events.push({ t: at(s), ...e });

for (const f of ["refs", "pieces", "assets", "frames"]) fs.rmSync(path.join(here, f), { recursive: true, force: true });
for (const [i, r] of REFS.entries()) {
  await shoot(r.html, `refs/r${i + 1}.jpg`, 1440, 900, 720);
  ev(20 + i * 9, { agent: "main", kind: "ref", title: r.title, url: r.url, image: `refs/r${i + 1}.jpg` });
}
await shoot(ASSET, "assets/hero-vase.jpg", 1440, 900, 720);
ev(70, { agent: "main", kind: "asset", file: "public/img/hero-vase.jpg", assetKind: "image", src: "assets/hero-vase.jpg" });
ev(72, { agent: "main", kind: "asset", file: "src/fonts/newsreader.woff2", assetKind: "font", src: null });
for (const [i, p] of PIECES.entries()) {
  await shoot(p.html, `pieces/p${i + 1}.jpg`, 1440, 900, 720);
  ev(80 + i * 6, { agent: "main", kind: "piece", name: p.name, url: p.url, image: `pieces/p${i + 1}.jpg` });
}
// (an asset's own kind travels as assetKind: `kind` is the event's)

const agents = [
  { id: "main", type: "director", model: "opus", label: "Director", startedAt: at(0), endedAt: at(760), status: "done" },
  { id: "b1", type: "builder", model: "sonnet", label: "Build nav, hero, pricing", startedAt: at(110), endedAt: at(560), status: "done" },
  { id: "b2", type: "builder", model: "sonnet", label: "Build features, faq, footer", startedAt: at(115), endedAt: at(680), status: "done" },
];
ev(110, { agent: "main", kind: "start", id: "b1", type: "builder", label: agents[1].label });
ev(115, { agent: "main", kind: "start", id: "b2", type: "builder", label: agents[2].label });

const W = (s, agent, file, target) => ev(s, { agent, kind: "write", file, summary: `wrote ${path.basename(file)}`, target });
const frameAt = [150, 230, 330, 420, 470, 520, 560, 700];
W(130, "b1", "src/components/nav.tsx", { selector: "header", x: 0, y: 0, w: 1440, h: 80 });
W(140, "b1", "src/components/hero.tsx", { selector: "#hero h1", x: 120, y: 230, w: 700, h: 200 });
W(145, "b2", "src/components/features.tsx", null);
W(200, "main", "src/styles/tokens.css", { selector: ":root", x: 120, y: 520, w: 520, h: 160 });
W(215, "b1", "src/components/hero.tsx", { selector: "#hero .cta", x: 120, y: 580, w: 300, h: 60 });
W(300, "b2", "src/components/features.tsx", { selector: "#features", x: 120, y: 1000, w: 1200, h: 560 });
W(320, "b2", "src/components/features.tsx", { selector: "#features .big", x: 120, y: 1110, w: 600, h: 440 });
W(390, "b1", "src/components/pricing.tsx", { selector: "#pricing", x: 120, y: 1800, w: 1200, h: 600 });
W(455, "b1", "src/components/pricing.tsx", { selector: "#pricing .mid", x: 549, y: 1890, w: 342, h: 420 });
W(500, "b1", "src/components/pricing.tsx", { selector: "#pricing .mid", x: 549, y: 1890, w: 342, h: 420 });
W(600, "b2", "src/components/faq.tsx", { selector: "#faq", x: 120, y: 2600, w: 1200, h: 300 });
W(650, "b2", "src/components/footer.tsx", { selector: "footer", x: 0, y: 3000, w: 1440, h: 200 });
W(690, "main", "src/app.tsx", { selector: "main", x: 0, y: 0, w: 1440, h: 900 });
ev(560, { agent: "b1", kind: "stop", id: "b1" });
ev(680, { agent: "b2", kind: "stop", id: "b2" });

for (const [i, s] of STAGES.entries()) {
  const name = `frames/${String(i + 1).padStart(4, "0")}.jpg`;
  if (s.blank) await shoot(BLANK, name, 1440, 900, 960);
  else if (s.error) await shoot(ERROR, name, 1440, 900, 960);
  else await shoot(page(...s.parts), name, 1440, s.h, 960);
  ev(frameAt[i], { agent: "main", kind: "frame", image: name, url: "http://127.0.0.1:5173/", width: 1440, height: s.h || 900 });
}
ev(760, { agent: "main", kind: "done", at: at(760) });

events.sort((a, b) => a.t.localeCompare(b.t));
const film = { version: 2, task: { id: "fixture", title: "Landing page for Kiln, a ceramics studio", startedAt: at(0), endedAt: at(760), page: "kiln", url: "http://127.0.0.1:5173/" }, agents, events, frames: [] };
fs.writeFileSync(path.join(here, "film.json"), `${JSON.stringify(film, null, 1)}\n`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`fixture film: ${events.length} events, ${STAGES.length} frames`);

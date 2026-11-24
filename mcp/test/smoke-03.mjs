// End-to-end check of the 0.3 flow through a real MCP client: brief, pick/zoom/study, board + tiles,
// critic prepare/record (the subagent run is simulated in state), logo sheet/test, niche packs.
// Network: Dribbble (a few requests), Google Fonts. Run: node test/smoke-03.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-03-"));
const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
const outDir = process.env.DRIP_SMOKE_OUT || path.join(project, "_out");
fs.mkdirSync(outDir, { recursive: true });
const client = new Client({ name: "smoke03", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(here, "..", "dist", "drip-mcp.mjs")], cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project, DRIP_HOME: home } }));

let fails = 0;
let n = 0;
async function call(name, args = {}, ok = (r) => !r.isError) {
  const t0 = Date.now();
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 300000 }).catch((e) => ({ isError: true, content: [{ type: "text", text: String(e) }] }));
  const ms = Date.now() - t0;
  const t = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  for (const im of r.content.filter((c) => c.type === "image")) fs.writeFileSync(path.join(outDir, `${String(++n).padStart(2, "0")}-${name}.jpg`), Buffer.from(im.data, "base64"));
  const pass = ok(r, t);
  if (!pass) fails++;
  const kb = Math.round(JSON.stringify(r.content).length / 1024);
  console.log(`${pass ? "PASS" : "FAIL"} ${name} · ${(ms / 1000).toFixed(1)}s · ${kb}KB\n   ${t.slice(0, 260).replace(/\n/g, "\n   ")}`);
  return t;
}
const statePath = path.join(project, ".drip", "state.json");
const fakeCriticRun = () => {
  const s = JSON.parse(fs.readFileSync(statePath, "utf8"));
  s.task.critic.runs.push(new Date(Date.now() + 5).toISOString());
  fs.writeFileSync(statePath, JSON.stringify(s));
};

const start = await call("drip_start", { task: "portfolio site for Claude" }, (r, t) => /mode design/.test(t) && /INTAKE/.test(t) && /GUIDE: playbook/.test(t) && /refs_site/.test(t));
console.log(`   drip_start returned ~${Math.round(start.length / 4)} tokens`);
await call("refs_site", { urls: ["https://example.com"], screens: 1 }, (r, t) => /h1 \d+px/.test(t) && r.content.some((c) => c.type === "image"));
await call("refs_study", { shot: "https://example.com", layout: "single 600px column, centred, no grid", type: "h1 32px system sans, body 16px", color: "#f0f0f2 ground, #38488f link", density: "~30 words, one screen", detail: "the link is the only colour", take: "how little it needs", leave: "the 32px h1 on a 1440 screen" }, (r, t) => /✓/.test(t));
await call("refs_tag", { tag: "portfolio", sheet: false }, (r, t) => /refs_pick/.test(t));
await call("refs_view", { shot: "1", maxImages: 1 });
await call("refs_study", { shot: "1", layout: "nice", type: "clean", color: "good", density: "ok", detail: "cool", take: "vibe", leave: "nothing" }, (r) => r.isError);
await call("refs_study", { shot: "2", layout: "12-col grid, hero spans 8 cols", type: "condensed sans at ~140px", color: "#111 ground, one #E8452C accent", density: "~30 words above the fold", detail: "index numbers in mono", take: "the huge type ratio", leave: "stock render" }, (r, t) => r.isError && /refs_view/.test(t));
await call("refs_pick", { picks: [{ shot: "1", why: "type-led hero with a real point of view" }, { shot: "2", why: "only one with motion as structure" }, { shot: "3", why: "editorial grid that breaks the template" }] });
await call("refs_zoom", { shot: "1", region: "top-left" }, (r) => r.content.some((c) => c.type === "image"));
await call("refs_view", { shots: ["2", "3"], maxImages: 1 }, (r, t) => /refs_study all 2 in one call/.test(t));
await call("refs_study", {
  studies: ["1", "2", "3"].map((s) => ({ shot: s, layout: `12-col grid, headline spans ${s === "2" ? 8 : 9} columns, image bleeds right`, type: "condensed grotesk caps ~140px, 10:1 display to body", color: "#0E0E0E ground, one acid #D4FF3A accent under 5%", density: "~30 words above the fold, 2 sections per screen", detail: "project index numbered 01-12 in mono on the baseline grid", take: "the 10:1 type ratio and single accent", leave: "the stock 3D render" })),
}, (r, t) => (t.match(/✓/g) || []).length === 3);
await call("board_create", { name: "Claude portfolio" }, (r, t) => /4 studied/.test(t));
await call("drip_brief", { what: "portfolio site for Claude", audience: "people meeting Claude", job: "see what Claude makes", feel: ["loud & playful"], ambition: "bold" });
await call("board_add", { items: [{ ref: "#0E0E0E", note: "ink ground for the kinetic direction, 18:1 with paper" }, { ref: "#D4FF3A", note: "acid accent for the single CTA and the cursor" }, { ref: "#F3EFE6", note: "paper ground for the editorial direction" }] });
await call("board_directions", {
  directions: [
    { name: "Live Wire", summary: "Kinetic type that rewrites itself as you scroll", adjectives: ["loud", "kinetic", "playful"], palette: ["#0E0E0E", "#F3EFE6", "#D4FF3A"], type: "Bricolage Grotesque + Inter", items: ["1", "2"] },
    { name: "Margin Notes", summary: "An annotated manuscript: Claude's work with its thinking in the margins", adjectives: ["editorial", "warm", "witty"], palette: ["#F3EFE6", "#141414", "#2340FF"], type: "Fraunces + IBM Plex Sans", items: ["3", "4"] },
  ],
});
await call("board_open", {}, (r, t) => r.isError && /critic hasn't ranked/.test(t));
await call("board_tile", {}, (r) => r.content.filter((c) => c.type === "image").length === 2);
const prep = await call("critic_prepare", { kind: "directions" }, (r, t) => /drip:critic/.test(t) && /\.png/.test(t));
await call("critic_record", { kind: "directions", verdict: "pass", scores: { concept: 7 }, worst: "x", fixes: ["y"], summary: "z" }, (r, t) => r.isError && /No drip:critic run/.test(t));
fakeCriticRun();
await call("critic_record", { kind: "directions", verdict: "pass", scores: { concept: 8, distinctiveness: 8 }, worst: "Live Wire's body copy is timid", fixes: ["set body at 20px"], summary: "Live Wire wins", perDirection: [{ name: "Live Wire", score: 8, verdict: "keep", note: "the only one with an idea" }, { name: "Margin Notes", score: 6, verdict: "rework", note: "safe" }] });
await call("board_open", {}, (r) => !r.isError);
await call("board_choose", { direction: "Live Wire", reason: "critic + user" }, (r, t) => /drip_kit/.test(t) && /seven type roles/.test(t));
await call("drip_status", {}, (r, t) => /critic ranked the directions/.test(t) && /hero gate/.test(t));
await call("drip_kit", {}, (r, t) => /styles\/drip-base.css/.test(t) && fs.existsSync(path.join(project, "styles", "drip-base.css")));
await call("drip_mark", { step: "system" }, (r, t) => /hero: true/.test(t));
// The hero gate in a real browser: a timid hero fails, a hero on the kit passes.
const page = (h1css, body) => `<!doctype html><html><head><meta name=viewport content="width=device-width"><link rel=stylesheet href="styles/drip-base.css"><style>${h1css}</style></head><body>${body}</body></html>`;
const pic = `<svg data-visual viewBox="0 0 10 10" style="width:100%;height:720px" preserveAspectRatio="none"><rect width="10" height="10" fill="#c33"/></svg>`;
fs.writeFileSync(path.join(project, "timid.html"), page("h1{font-size:56px}", `<main class="container"><nav>Studio</nav><h1>Six works and the drafts thrown away</h1><p>Small text.</p></main>`));
fs.writeFileSync(path.join(project, "bold.html"), page("", `<main class="container"><nav style="height:72px;display:flex;align-items:center">Studio</nav><div class="grid" style="align-items:end"><div style="grid-column:1/7"><h1>Six works, every draft</h1><p class="lead">What was made and what was thrown away.</p><a class="button" href="#">See the work</a></div><div style="grid-column:7/13">${pic}</div></div></main>`));
const url = (f) => `file:///${path.join(project, f).replace(/\\/g, "/")}`;
await call("fitcheck_shot", { url: url("timid.html"), hero: true }, (r, t) => /HERO GATE FAILED/.test(t) && /h1 is 56px/.test(t));
await call("fitcheck_shot", { url: url("bold.html"), hero: true }, (r, t) => /HERO GATE PASSED/.test(t));

const svgA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="18" y="18" width="64" height="64" rx="10" fill="#2340FF"/><path d="M30 70 C 40 40, 60 40, 70 70" stroke="#fff" stroke-width="8" fill="none"/></svg>`;
const svgB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#111"/><circle cx="62" cy="40" r="9" fill="#D4FF3A"/></svg>`;
await call("logo_sheet", { title: "Test marks", concepts: [{ name: "Arc", svg: svgA }, { name: "Dot", svg: svgB }, { name: "Arc 2", svg: svgA }] }, (r) => r.content.some((c) => c.type === "image"));
await call("logo_test", { svg: svgA, name: "arc" }, (r, t) => /Paths: 1/.test(t));
await call("pack_create", { id: "roblox-ui", name: "Roblox UI", niche: "game UI for Roblox experiences", keywords: ["roblox"], summary: "Touch-first chunky readable UI" });
await call("pack_write", { id: "roblox-ui", file: "guide.md", content: "# Roblox UI\nScale for touch: 44px+ targets." });
await call("pack_list", {}, (r, t) => /roblox-ui/.test(t));
await call("drip_start", { task: "shop menu for my roblox simulator" }, (r, t) => /niche packs: roblox-ui/.test(t) && /pack:roblox-ui/.test(t));
await call("drip_guide", { topic: "pack:roblox-ui" }, (r, t) => /Scale for touch/.test(t));
await call("drip_start", { task: "logo for a bakery called Crumb" }, (r, t) => /mode logo/.test(t));
await call("drip_start", { task: "just find references for brutalist portfolios" }, (r, t) => /mode refs/.test(t));

console.log(`\n${fails ? `${fails} FAILED` : "ALL PASSED"} · images: ${outDir}`);
await client.close();
process.exit(fails ? 1 : 0);

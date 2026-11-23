// End-to-end smoke test: starts the bundled server in a temp project and calls the tools like Claude would.
// Network tests hit Dribbble, Iconify, Fontsource and registries. Run: node test/smoke.mjs [--offline]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const offline = process.argv.includes("--offline");
const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-smoke-"));
const outDir = process.env.DRIP_SMOKE_OUT || path.join(project, "_out");
fs.mkdirSync(outDir, { recursive: true });
// This test covers tools, not the critic gate (smoke-03 covers that): switch it off for this project.
fs.mkdirSync(path.join(project, ".drip"), { recursive: true });
fs.writeFileSync(path.join(project, ".drip", "config.json"), JSON.stringify({ gates: { requireCritic: false } }));

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(here, "..", "dist", "drip-mcp.mjs")],
  cwd: project,
  env: { ...process.env, CLAUDE_PROJECT_DIR: project },
});
const client = new Client({ name: "smoke", version: "0" });
await client.connect(transport);

let failures = 0;
let imgN = 0;
async function call(name, args = {}, expect = (r) => !r.isError) {
  const t = Date.now();
  let r;
  try {
    r = await client.callTool({ name, arguments: args });
  } catch (e) {
    r = { isError: true, content: [{ type: "text", text: String(e) }] };
  }
  const textOut = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const imgs = r.content.filter((c) => c.type === "image");
  for (const im of imgs) fs.writeFileSync(path.join(outDir, `${String(++imgN).padStart(2, "0")}-${name}.jpg`), Buffer.from(im.data, "base64"));
  const ok = expect(r);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name} (${Date.now() - t}ms, ${imgs.length} img)\n   ${textOut.slice(0, 300).replace(/\n/g, "\n   ")}`);
  return { r, text: textOut };
}

const tools = (await client.listTools()).tools.map((t) => t.name);
console.log(`${tools.length} tools: ${tools.join(", ")}\n`);

await call("drip_status");
await call("drip_start", { task: "new pricing page for a developer tools SaaS, dark and technical" }, (r) => /full loop/.test(r.content[0].text));
await call("drip_guide", { topic: "rules/hard-rules" }, () => true);
await call("palette_generate", { accent: "#E8452C" });
await call("palette_check", { pairs: [{ fg: "#9CA3AF", bg: "#FFFFFF", label: "grey on white" }] }, (r) => /FAIL|AA/.test(r.content[0].text));
await call("gradient_mesh", { colors: ["#E8452C", "#F4B860", "#2B2D42"], grain: 0.12, out: "public/hero-mesh.svg" });
fs.mkdirSync(path.join(project, "src"), { recursive: true });
fs.writeFileSync(path.join(project, "src", "Hero.tsx"), `export function Hero(){return <h1 className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Unlock seamless growth 🚀</h1>}`);
await call("fitcheck_lint", { files: ["src/Hero.tsx"] }, (r) => /ai-gradient/.test(r.content[0].text));

if (!offline) {
  await call("refs_search", { query: "pricing page dark" }, (r) => !r.isError && r.content.some((c) => c.type === "image"));
  await call("refs_tag", { tag: "pricing", page: 3 }, (r) => !r.isError);
  await call("refs_view", { shot: "1", maxImages: 2 }, (r) => !r.isError && r.content.some((c) => c.type === "image"));
  await call("refs_view", { shot: "2", maxImages: 1 });
  await call("refs_sheet", { shots: ["1", "2", "3", "4"] });
  await call("board_create", { name: "Devtools pricing", brief: "Dark, technical pricing page for developers" });
  await call("board_add", { items: [{ ref: "1", note: "nice" }] }, (r) => /Rejected/.test(r.content[0].text));
  const items = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n, i) => ({ ref: n, note: `Plan cards with a single highlighted tier and monospace prices (${i})` }));
  await call("refs_tag", { tag: "pricing" });
  await call("board_add", { items });
  await call("board_directions", {
    directions: [
      { name: "Terminal Calm", summary: "Near-black, mono numerals, one green accent", adjectives: ["precise", "quiet", "technical"], palette: ["#0B0D10", "#E6E6E6", "#3DDC84"], type: "Geist + Geist Mono", items: ["1", "2", "3", "4"] },
      { name: "Warm Paper", summary: "Off-white editorial with a serif display", adjectives: ["editorial", "warm", "confident"], palette: ["#F4F1EA", "#16140F", "#E8452C"], type: "Instrument Serif + Inter", items: ["5", "6", "7", "8"] },
    ],
  });
  await call("board_open", {});
  await call("board_choose", { direction: "Terminal Calm", reason: "smoke test" });
  await call("drip_status");
  await call("icons_search", { query: "rocket", set: "lucide" });
  await call("fonts_pair", { mood: "developer minimal precise" });
  await call("fonts_search", { query: "geist" });
  await call("components_find", { need: "pricing toggle monthly yearly" });
  await call("components_get", { library: "magicui", item: "marquee" });
  await call("components_registries", { query: "charts" });
  await call("images_search", { query: "mountain lake morning", source: "wikimedia", limit: 8 });
  await call("keys_status");
  await call("gen_providers");
}

console.log(`\n${failures ? `${failures} FAILED` : "ALL PASSED"} · images in ${outDir} · project ${project}`);
await client.close();
process.exit(failures ? 1 : 0);

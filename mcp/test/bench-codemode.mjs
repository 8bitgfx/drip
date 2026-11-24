// Benchmark: the same deterministic multi-step task done with direct MCP tool calls and with one drip_execute.
// Both go through a real stdio MCP connection to a freshly started server, so wall time includes the transport.
//   node test/bench-codemode.mjs [--server dist/drip-mcp.mjs] [--runs 5]
// "agent output chars" is what an agent would have to read: the concatenated text of every tool result it sees.
// Direct calls return every full result; one script returns only what it chose to return.
// (An agent also pays one model round trip per direct call; those cannot be measured offline, so the count is reported.)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const server = path.resolve(arg("server", path.join(here, "..", "src", "index.mjs")));
const RUNS = Number(arg("runs", 5));
const ACCENTS = ["#E8452C", "#2B6CB0", "#0F766E", "#7C3AED", "#B45309", "#BE185D", "#15803D", "#1D4ED8"];

const proj = fs.mkdtempSync(path.join(os.tmpdir(), "drip-bench-"));
const client = new Client({ name: "bench", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: { ...process.env, DRIP_PROJECT_DIR: proj, DRIP_HOME: proj } }));
const text = (r) => (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");

/** Direct: the agent calls palette_generate, reads the whole answer, picks the accent-600 hex, then calls palette_check. */
async function direct() {
  let chars = 0;
  let calls = 0;
  const rows = [];
  for (const accent of ACCENTS) {
    const gen = text(await client.callTool({ name: "palette_generate", arguments: { accent } }));
    calls++;
    chars += gen.length;
    const hex = /accent: .*? 600 (#[0-9A-F]{6})/.exec(gen)[1];
    const chk = text(await client.callTool({ name: "palette_check", arguments: { pairs: [{ fg: hex, bg: "#FFFFFF" }, { fg: hex, bg: "#111111" }] } }));
    calls++;
    chars += chk.length;
    const ratios = [...chk.matchAll(/= ([\d.]+):1/g)].map((m) => Number(m[1]));
    rows.push(`${accent} ${hex} ${ratios.join("/")}`);
  }
  return { chars, calls, answer: rows.join("\n") };
}

const SCRIPT = `
const rows = [];
for (const accent of ${JSON.stringify(ACCENTS)}) {
  const gen = await drip.palette_generate({ accent });
  const hex = /accent: .*? 600 (#[0-9A-F]{6})/.exec(gen.text)[1];
  const chk = await drip.palette_check({ pairs: [{ fg: hex, bg: '#FFFFFF' }, { fg: hex, bg: '#111111' }] });
  const ratios = [...chk.text.matchAll(/= ([\\d.]+):1/g)].map((m) => Number(m[1]));
  rows.push(accent + ' ' + hex + ' ' + ratios.join('/'));
}
return rows.join('\\n');`;

async function code() {
  const out = text(await client.callTool({ name: "drip_execute", arguments: { code: SCRIPT } }));
  const m = /result:\n"([\s\S]*?)"\n\n/.exec(out);
  return { chars: out.length, calls: 1, answer: m ? JSON.parse(`"${m[1]}"`) : out };
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
await direct(); // warm up (module loading, first-call costs)
await code();
const d = [];
const c = [];
let dr;
let cr;
for (let i = 0; i < RUNS; i++) {
  let t = performance.now();
  dr = await direct();
  d.push(performance.now() - t);
  t = performance.now();
  cr = await code();
  c.push(performance.now() - t);
}
await client.close();
const same = dr.answer === cr.answer;
console.log(`server: ${server}`);
console.log(`task: ${ACCENTS.length} colour systems -> accent-600 -> contrast on white and near-black (${ACCENTS.length * 2} tool calls)`);
console.log(`same answer: ${same}`);
console.log(`direct MCP : ${dr.calls} calls, wall median ${median(d).toFixed(0)} ms (runs: ${d.map((x) => x.toFixed(0)).join(", ")}), agent output ${dr.chars} chars`);
console.log(`drip_execute: ${cr.calls} call,  wall median ${median(c).toFixed(0)} ms (runs: ${c.map((x) => x.toFixed(0)).join(", ")}), agent output ${cr.chars} chars`);
console.log(`output reduction: ${(dr.chars / cr.chars).toFixed(1)}x, model round trips: ${dr.calls} -> ${cr.calls}`);
if (!same) process.exitCode = 1;

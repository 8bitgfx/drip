// The bundled server must start, answer initialize and list every tool. (A bundling change once made it
// crash on startup while every unit test still passed.)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "drip-mcp.mjs");

test("bundled server starts and lists all tools", async () => {
  const p = spawn(process.execPath, [dist], { stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  let err = "";
  p.stdout.on("data", (d) => (out += d));
  p.stderr.on("data", (d) => (err += d));
  const send = (m) => p.stdin.write(`${JSON.stringify(m)}\n`);
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const t0 = Date.now();
  while (!out.includes('"id":2') && Date.now() - t0 < 10000 && p.exitCode === null) await new Promise((r) => setTimeout(r, 50));
  p.kill();
  assert.ok(out.includes('"id":2'), `no tools/list answer; stderr: ${err.slice(0, 500)}`);
  const list = JSON.parse(out.split("\n").find((l) => l.includes('"id":2')));
  const names = list.result.tools.map((t) => t.name);
  for (const must of ["drip_start", "drip_brief", "refs_pick", "refs_study", "refs_zoom", "board_tile", "critic_prepare", "critic_record", "logo_sheet", "logo_test", "pack_create", "fitcheck_done"]) assert.ok(names.includes(must), `missing tool ${must}`);
  assert.ok(Date.now() - t0 < 5000, "startup too slow");
});

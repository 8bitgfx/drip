// Code Mode on top of the shared registry: validate arguments with each tool's zod schema, call the very same
// handler MCP and the CLI call (so gates, state locks and errors are identical), write images to files.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadConfig } from "../config.mjs";
import { projectDripDir } from "../paths.mjs";
import { collectTools } from "../registry.mjs";
import { allowedTools } from "./allowlist.mjs";
import { runSandbox } from "./sandbox.mjs";
import { paramDocs, RESULT_TYPE, toolSignature, oneLine } from "./signatures.mjs";

const MAX_CALL_TEXT = 200000; // per tool call, into the sandbox

export function codemodeOutDir() {
  return path.join(projectDripDir(), "cli", "codemode");
}

/** The tools a script can call right now: Map name -> tool. */
export function scriptTools(tools = collectTools(), config = loadConfig()) {
  const names = allowedTools([...tools.keys()], config);
  return new Map(names.map((n) => [n, tools.get(n)]));
}

function zodMessage(err) {
  if (!err?.issues) return String(err?.message || err);
  return err.issues.map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`).join("; ");
}

/** Call a tool the way a script does. Throws on invalid input, gate refusals and tool errors. */
export async function callForScript(name, args, { allowed, outDir, images, signal }) {
  const tool = allowed.get(name);
  if (!tool) throw new Error(`drip.${name} is not available in Code Mode. Use drip_search to list what is.`);
  const parsed = z.object(tool.meta.inputSchema || {}).safeParse(args ?? {});
  if (!parsed.success) throw new Error(`Invalid arguments for ${name}: ${zodMessage(parsed.error)}. Signature: ${toolSignature(name, tool.meta)}`);
  const res = await tool.handler(parsed.data, { signal });
  let body = "";
  const files = [];
  for (const c of res?.content || []) {
    if (c.type === "text") body += (body ? "\n" : "") + c.text;
    else if (c.type === "image") {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${name}-${Date.now()}-${images.length + files.length + 1}.${c.mimeType === "image/png" ? "png" : c.mimeType === "image/webp" ? "webp" : "jpg"}`);
      fs.writeFileSync(file, Buffer.from(c.data, "base64"));
      files.push(file);
    }
  }
  images.push(...files);
  if (res?.isError) throw new Error(body || `${name} failed.`);
  if (body.length > MAX_CALL_TEXT) body = `${body.slice(0, MAX_CALL_TEXT)}\n[truncated at ${MAX_CALL_TEXT} characters]`;
  let data;
  if (/^\s*[[{]/.test(body)) {
    try {
      data = JSON.parse(body);
    } catch {
      /* plain text */
    }
  }
  return { text: body, ...(data !== undefined ? { data } : {}), images: files };
}

/**
 * Run a script. Returns { ok, logs, value, error, calls, ms, images, logsTruncated }. `images` lists every file written.
 * Options: timeoutMs, maxCalls, cpuMs, memoryMb; defaults come from config.codemode.
 */
export async function executeCode(code, opts = {}) {
  const config = loadConfig();
  const cm = config.codemode || {};
  const tools = collectTools();
  const allowed = scriptTools(tools, config);
  const images = [];
  const outDir = opts.outDir || codemodeOutDir();
  const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : d));
  const res = await runSandbox({
    code,
    toolNames: [...allowed.keys()],
    callTool: (name, args) => callForScript(name, args, { allowed, outDir, images, signal: opts.signal }),
    timeoutMs: clamp(opts.timeoutMs ?? cm.timeoutMs, 100, 600000, 120000),
    cpuMs: clamp(opts.cpuMs ?? cm.cpuMs, 50, 60000, 10000),
    maxCalls: clamp(opts.maxCalls ?? cm.maxCalls, 1, 500, 50),
    memoryBytes: clamp(opts.memoryMb ?? cm.memoryMb, 8, 512, 64) * 1024 * 1024,
    maxLogChars: opts.maxLogChars ?? 20000,
    signal: opts.signal,
  });
  return { ...res, images };
}

/** drip_search: tools matching a query, with signatures. */
export function searchTools(query, limit = 8) {
  const allowed = scriptTools();
  const words = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(Boolean);
  const scored = [];
  for (const [name, { meta, module }] of allowed) {
    const hay = `${name} ${module} ${meta.title || ""} ${meta.description || ""} ${Object.keys(meta.inputSchema || {}).join(" ")}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (name === w) score += 10;
      else if (name.includes(w)) score += 5;
      else if ((meta.title || "").toLowerCase().includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
    }
    if (!words.length) score = 1;
    if (score > 0) scored.push({ name, meta, score });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map(({ name, meta }) => ({
    name,
    summary: oneLine(meta.description, 140),
    signature: toolSignature(name, meta),
    params: paramDocs(meta),
  }));
}

export { RESULT_TYPE };

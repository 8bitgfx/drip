// Code Mode: drip_search finds tools with typed signatures; drip_execute runs a bounded script that calls
// several of them in one go. Every direct tool stays available; this is an extra, cheaper way to chain them.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { imageBlock } from "../../core/images.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { codemodeOutDir, executeCode, RESULT_TYPE, searchTools } from "../../core/codemode/execute.mjs";
import { loadConfig } from "../../core/config.mjs";

const MAX_OUTPUT = 12000;

export function register(server) {
  server.registerTool(
    "drip_search",
    {
      title: "Find Drip tools (Code Mode)",
      description:
        "Finds Drip tools by what they do and returns their TypeScript-style signatures, ready to use inside drip_execute. Use it when you want to chain several tools in one script and don't remember exact argument names. " +
        "Example: drip_search({ query: \"study references moodboard\", limit: 5 })",
      inputSchema: {
        query: z.string().describe("Words describing the tool you need"),
        limit: z.number().int().min(1).max(30).optional().describe("How many tools (default 8)"),
      },
    },
    safe(async ({ query, limit }) => {
      const found = searchTools(query, limit ?? 8);
      if (!found.length) return text(`No tool matches "${query}". Try fewer or broader words.`);
      const lines = [RESULT_TYPE, ""];
      for (const f of found) {
        lines.push(f.signature, `  ${f.summary}`);
        for (const p of f.params) lines.push(`  - ${p}`);
        lines.push("");
      }
      return text(lines.join("\n").trim());
    }),
  );

  server.registerTool(
    "drip_execute",
    {
      title: "Run a Drip script (Code Mode)",
      description:
        "Runs a short JavaScript function body in a sandbox that can only call Drip tools as `await drip.<tool>(args)` (find signatures with drip_search). Use it to chain several tool calls, loop over results and return only what matters, instead of one round trip per call. " +
        "Each call returns { text, data?, images: [file paths] } and throws on invalid arguments, gate refusals or tool errors (use try/catch to continue). Use `return` for the result and console.log for notes. No fs, network, process or require. Same gates and state as the direct tools. " +
        "Limits: timeoutMs (default 120000), maxCalls (default 50), 64 MB memory; images are saved to files and the first few are attached. " +
        "Use it whenever you'd make 3+ similar calls: a component search for every section, pictures for every section, several re-checks. " +
        'Example: drip_execute({ code: "const needs = { hero: \'fan of image cards\', features: \'bento of live product UI\', proof: \'testimonial wall\' }; const out = {}; for (const [s, n] of Object.entries(needs)) { const r = await drip.components_find({ need: n, limit: 4 }); const i = r.text.indexOf(\'Installable\'); out[s] = r.text.slice(i, i + 900); } return out;" })',
      inputSchema: {
        code: z.string().describe("JavaScript function body; `return` the result"),
        timeoutMs: z.number().int().min(100).max(600000).optional().describe("Wall time for the whole run"),
        maxCalls: z.number().int().min(1).max(500).optional().describe("Most tool calls in one run"),
      },
    },
    safe(async ({ code, timeoutMs, maxCalls }, extra) => {
      const r = await executeCode(code, { timeoutMs, maxCalls, signal: extra?.signal });
      const maxImages = Math.max(0, Number(loadConfig().codemode?.maxImages ?? 4));
      const parts = [];
      if (r.logs.length) parts.push(`console:\n${r.logs.join("\n")}${r.logsTruncated ? "\n[console output truncated]" : ""}`);
      if (r.ok) {
        const json = r.value === undefined ? "undefined" : JSON.stringify(r.value, null, 1);
        parts.push(`result:\n${bound(json)}`);
      } else parts.push(`error (${r.error.name}): ${r.error.message}`);
      parts.push(`${r.calls} tool call${r.calls === 1 ? "" : "s"}, ${r.ms} ms`);
      if (r.images.length) parts.push(`images (${r.images.length}):\n${r.images.join("\n")}${r.images.length > maxImages ? `\nOnly the first ${maxImages} are attached.` : ""}`);
      const content = [{ type: "text", text: parts.join("\n\n") }];
      for (const f of r.images.slice(0, maxImages)) {
        try {
          content.push(imageBlock(fs.readFileSync(f), /\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg"));
        } catch {
          /* file vanished: the path is listed anyway */
        }
      }
      return blocks(content, !r.ok);
    }),
  );
}

function bound(s) {
  if (s.length <= MAX_OUTPUT) return s;
  const dir = codemodeOutDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `result-${Date.now()}.json`);
  fs.writeFileSync(file, s);
  return `${s.slice(0, MAX_OUTPUT)}\n[truncated: ${s.length} characters, full result in ${file}]`;
}

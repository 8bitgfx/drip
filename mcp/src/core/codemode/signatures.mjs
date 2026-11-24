// TypeScript-like signatures for tools, generated from their zod input schemas. The same schemas drive
// `drip tools schema`, MCP and Code Mode, so a signature can never disagree with what a call accepts.
import { z } from "zod";

/** JSON Schema (draft 2020-12) for a tool's input. */
export function inputJsonSchema(meta) {
  return z.toJSONSchema(z.object(meta?.inputSchema || {}), { io: "input", unrepresentable: "any" });
}

function oneLine(s, n = 100) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  const cut = t.split(/(?<=[.!?])\s/)[0];
  const out = cut.length <= n ? cut : `${cut.slice(0, n - 1)}…`;
  return out;
}

function tsType(s) {
  if (!s || s === true) return "any";
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  const alt = s.anyOf || s.oneOf;
  if (alt) return [...new Set(alt.map(tsType))].join(" | ");
  if (Array.isArray(s.type)) return s.type.map((t) => tsType({ ...s, type: t })).join(" | ");
  switch (s.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array": {
      const inner = tsType(s.items);
      return /[|&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
    }
    case "object": {
      const props = s.properties || {};
      const keys = Object.keys(props);
      if (!keys.length) return s.additionalProperties && typeof s.additionalProperties === "object" ? `Record<string, ${tsType(s.additionalProperties)}>` : "object";
      const req = new Set(s.required || []);
      return `{ ${keys.map((k) => `${k}${req.has(k) ? "" : "?"}: ${tsType(props[k])}`).join("; ")} }`;
    }
    default:
      return "any";
  }
}

/** `drip.refs_study(args: { urls: string[]; note?: string }): Promise<ToolResult>` */
export function toolSignature(name, meta) {
  const schema = inputJsonSchema(meta);
  const has = Object.keys(schema.properties || {}).length > 0;
  const allOptional = has && !(schema.required || []).length;
  const arg = has ? `args${allOptional ? "?" : ""}: ${tsType(schema)}` : "";
  return `drip.${name}(${arg}): Promise<ToolResult>`;
}

/** Short lines describing each parameter (name, requiredness, first sentence of its description). */
export function paramDocs(meta) {
  const schema = inputJsonSchema(meta);
  const req = new Set(schema.required || []);
  return Object.entries(schema.properties || {})
    .map(([k, v]) => `${k}${req.has(k) ? "" : "?"}${v.description ? `: ${oneLine(v.description, 90)}` : ""}`)
    .filter((l) => l.includes(":"));
}

export const RESULT_TYPE = "type ToolResult = { text: string; data?: any /* parsed when the text is JSON */; images: string[] /* file paths */ }";

export { oneLine };

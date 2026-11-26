// Per-file facts for the component index: exports, props and variants, imports, JSX usage, tokens,
// near-duplicate sketches. A scanner plus regular expressions (no parser dependency, runs in milliseconds).
// ts-morph would be more exact for props; this is deliberately dependency-free.
import path from "node:path";
import { sha1 } from "../util.mjs";

export const EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs", ".vue", ".svelte", ".astro", ".css", ".scss"]);
const JS_EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs"]);
export const hashText = (s) => sha1(s, 16);

const KEYWORDS = new Set("abstract as async await break case catch class const continue default delete do else enum export extends false finally for from function get if implements import in instanceof interface let new null of private protected public readonly return set static super switch this throw true try type typeof undefined var void while yield".split(" "));

/** Blank out comments (keeping line breaks so line numbers still match). Strings are left alone. */
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") {
        out += " ";
        i++;
      }
    } else if (c === "/" && d === "*") {
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      out += "  ";
      i += 2;
    } else if (c === "/" && /(?:^|[(,=:[!&|?{};+\-*%~^]|=>|\breturn|\btypeof|\bcase)\s*$/.test(out.slice(-12))) {
      // A regular expression literal: blank its body (same length) so quotes and brackets inside it are inert.
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") j += 2;
        else if (src[j] === "[") {
          inClass = true;
          j++;
        } else if (src[j] === "]") {
          inClass = false;
          j++;
        } else if (src[j] === "/" && !inClass) break;
        else j++;
      }
      if (src[j] === "/") {
        out += "/" + "_".repeat(j - i - 1) + "/";
        i = j + 1;
      } else {
        out += c;
        i++;
      }
    } else if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i++;
      while (i < n && src[i] !== q) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (q !== "`" && src[i] === "\n") break;
        out += src[i];
        i++;
      }
      out += src[i] ?? "";
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const OPEN = { "{": "}", "(": ")", "[": "]" };

/** Index of the bracket matching the one at `i` (strings skipped), or -1. */
export function matchBracket(code, i) {
  const close = OPEN[code[i]];
  if (!close) return -1;
  const stack = [close];
  for (let k = i + 1; k < code.length; k++) {
    const c = code[k];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      k++;
      while (k < code.length && code[k] !== q) {
        if (code[k] === "\\") k++;
        else if (q !== "`" && code[k] === "\n") break;
        k++;
      }
    } else if (OPEN[c]) stack.push(OPEN[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (!stack.length) return k;
    }
  }
  return -1;
}

const lineAt = (src, idx) => {
  let n = 1;
  for (let i = 0; i < idx; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
};
// O(1) line lookups for many matches in one file.
function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
  return (idx) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Top-level keys of an object literal / members of a type literal given its `{` index. */
function topLevelKeys(code, open) {
  const end = matchBracket(code, open);
  if (end < 0) return [];
  const body = code.slice(open + 1, end);
  const keys = [];
  let depth = 0;
  let i = 0;
  let atStart = true;
  while (i < body.length) {
    const c = body[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      let j = i + 1;
      while (j < body.length && body[j] !== q) j += body[j] === "\\" ? 2 : 1;
      if (atStart && depth === 0 && /^\s*\??\s*:/.test(body.slice(j + 1))) keys.push({ key: body.slice(i + 1, j), at: open + 1 + i });
      atStart = false;
      i = j + 1;
      continue;
    }
    if (OPEN[c]) depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if ((c === "," || c === ";" || c === "\n") && depth === 0) atStart = true;
    else if (atStart && depth === 0 && /[A-Za-z_$]/.test(c)) {
      const m = /^([A-Za-z_$][\w$-]*)(\s*\??\s*[:(,}])/.exec(body.slice(i));
      if (m) keys.push({ key: m[1], at: open + 1 + i, optional: /\?/.test(m[2]) });
      atStart = false;
    } else if (!/\s/.test(c)) atStart = false;
    i++;
  }
  return keys;
}

const stringsIn = (s) => [...s.matchAll(/["']([^"']{1,40})["']/g)].map((m) => m[1]);

/** Parse `interface X { a: T; b?: U }` / `type X = { ... }` members. */
function typeMembers(code, open) {
  const end = matchBracket(code, open);
  if (end < 0) return [];
  const body = code.slice(open + 1, end);
  const members = [];
  let depth = 0;
  let cur = "";
  const flush = () => {
    const m = /^\s*(?:readonly\s+)?(['"]?)([\w$-]+)\1(\?)?\s*:\s*([\s\S]+?)\s*$/.exec(cur);
    if (m) {
      const type = m[4].replace(/\s+/g, " ");
      const lits = /^(?:["'][^"']*["']\s*\|\s*)+["'][^"']*["']$|^["'][^"']*["']$/.test(type) ? stringsIn(type) : [];
      members.push({ name: m[2], optional: !!m[3], type: type.length > 80 ? type.slice(0, 77) + "..." : type, ...(lits.length > 1 ? { union: lits } : {}) });
    }
    cur = "";
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      let j = i + 1;
      while (j < body.length && body[j] !== q) j += body[j] === "\\" ? 2 : 1;
      cur += body.slice(i, j + 1);
      i = j;
      continue;
    }
    if (OPEN[c] || c === "<") depth++;
    else if (c === "}" || c === ")" || c === "]" || (c === ">" && body[i - 1] !== "=")) depth--;
    if ((c === ";" || c === ",") && depth === 0) flush();
    else if (c === "\n" && depth === 0 && cur.trim() && !/[|&:,(<{]\s*$/.test(cur) && !/^\s*[|&]/.test(body.slice(i + 1))) flush();
    else cur += c;
  }
  flush();
  return members;
}

function variantsOf(code, from = 0) {
  const out = {};
  const defaults = {};
  const re = /\b(?:cva|tv)\s*\(/g;
  re.lastIndex = from;
  let m;
  while ((m = re.exec(code))) {
    const call = m.index + m[0].length - 1;
    const end = matchBracket(code, call);
    if (end < 0) continue;
    const args = code.slice(call, end);
    const vi = /\bvariants\s*:\s*\{/.exec(args);
    if (!vi) continue;
    const open = call + vi.index + vi[0].length - 1;
    for (const g of topLevelKeys(code, open)) {
      const brace = code.indexOf("{", g.at);
      if (brace < 0) continue;
      out[g.key] = topLevelKeys(code, brace).map((k) => k.key);
    }
    const di = /\bdefaultVariants\s*:\s*\{([^}]*)\}/.exec(args);
    if (di) for (const kv of di[1].matchAll(/([\w$]+)\s*:\s*["']?([\w$-]+)["']?/g)) defaults[kv[1]] = kv[2];
  }
  return { variants: out, defaults };
}

function importsOf(code, ext) {
  const out = [];
  const re = /\bimport\s+(?:type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(code))) {
    if (m[3] || m[4]) {
      out.push({ from: m[3] || m[4], names: [] });
      continue;
    }
    const clause = m[1];
    const names = [];
    const brace = /\{([^}]*)\}/.exec(clause);
    if (brace)
      for (const part of brace[1].split(",")) {
        const nm = part.trim().replace(/^type\s+/, "");
        if (!nm) continue;
        const [orig, alias] = nm.split(/\s+as\s+/);
        names.push({ name: alias || orig, imported: orig });
      }
    const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
    if (def) names.push({ name: def[1], imported: "default" });
    const ns = /\*\s+as\s+([\w$]+)/.exec(clause);
    if (ns) names.push({ name: ns[1], imported: "*" });
    out.push({ from: m[2], names });
  }
  void ext;
  return out;
}

function statementEnd(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < code.length && code[i] !== q) {
        if (code[i] === "\\") i++;
        else if (q !== "`" && code[i] === "\n") break;
        i++;
      }
      continue;
    }
    if (OPEN[c]) depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if (c === ";" && depth <= 0) return i;
    else if (c === "\n" && depth <= 0) {
      const prev = code.slice(start, i).trimEnd().slice(-1);
      const next = code.slice(i + 1, i + 60).trimStart();
      if (/[})\];>]/.test(prev) && (next === "" || /^(export|const|let|var|function|async function|class|interface|type|enum|import|\/\/|declare)\b/.test(next))) return i;
    }
  }
  return code.length;
}

/** The text of a definition starting at `start` (function declaration or `const X = ...`). */
function definitionRange(code, start) {
  const decl = /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\b/.test(code.slice(start, start + 60));
  if (decl) {
    const paren = code.indexOf("(", start);
    const pend = paren < 0 ? -1 : matchBracket(code, paren);
    const brace = pend < 0 ? -1 : code.indexOf("{", pend);
    const bend = brace < 0 ? -1 : matchBracket(code, brace);
    return { start, end: bend < 0 ? statementEnd(code, start) : bend + 1, paramsFrom: paren, paramsTo: pend };
  }
  const end = statementEnd(code, start);
  const paren = code.slice(start, end).search(/\(/);
  const abs = paren < 0 ? -1 : start + paren;
  return { start, end, paramsFrom: abs, paramsTo: abs < 0 ? -1 : matchBracket(code, abs) };
}

function normalizeTokens(text) {
  const toks = [];
  const re = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|\d[\w.]*|[A-Za-z_$][\w$]*|=>|===|!==|&&|\|\||\?\?|\.\.\.|[^\s]/g;
  let m;
  let prev = "";
  while ((m = re.exec(text))) {
    const t = m[0];
    let out;
    if (t[0] === '"' || t[0] === "'" || t[0] === "`") out = "S";
    else if (/^\d/.test(t)) out = "N";
    else if (/^[A-Za-z_$]/.test(t)) out = KEYWORDS.has(t) || prev === "." || prev === "<" || prev === "</" ? t : "I";
    else out = t;
    toks.push(out);
    prev = t === "/" && prev === "<" ? "</" : t;
  }
  return toks;
}

const fnv = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Bottom-k sketch of 6-token shingles: small, comparable, stable. */
export function sketch(text, k = 96) {
  const toks = normalizeTokens(text);
  if (toks.length < 6) return { n: toks.length, sh: [] };
  const set = new Set();
  for (let i = 0; i + 6 <= toks.length; i++) set.add(fnv(toks.slice(i, i + 6).join(" ")));
  return { n: toks.length, sh: [...set].sort((a, b) => a - b).slice(0, k), total: set.size };
}

/** Estimated Jaccard similarity of two sketches. */
export function similarity(a, b) {
  if (!a.sh.length || !b.sh.length) return 0;
  const k = Math.min(Math.max(a.sh.length, b.sh.length), 96);
  const A = new Set(a.sh);
  const B = new Set(b.sh);
  const union = [...new Set([...a.sh, ...b.sh])].sort((x, y) => x - y).slice(0, k);
  const both = union.filter((h) => A.has(h) && B.has(h)).length;
  return both / union.length;
}

function classSet(text) {
  const out = new Set();
  for (const m of text.matchAll(/class(?:Name)?\s*=\s*(?:\{?\s*)?["'`]([^"'`]{3,300})["'`]/g)) for (const c of m[1].split(/\s+/)) if (c && !c.includes("$")) out.add(c);
  for (const m of text.matchAll(/\b(?:cn|clsx|cx|twMerge|classNames)\(\s*["'`]([^"'`]{3,300})["'`]/g)) for (const c of m[1].split(/\s+/)) if (c) out.add(c);
  return [...out].sort();
}

function literalsOf(src, lineOf) {
  const colors = [];
  const radii = [];
  const shadows = [];
  const cap = (arr, v) => arr.length < 80 && arr.push(v);
  for (const m of src.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) cap(colors, { v: m[0].toLowerCase(), line: lineOf(m.index) });
  for (const m of src.matchAll(/\b(?:rgba?|hsla?)\(\s*[\d.%\s,/]+\)/g)) cap(colors, { v: m[0].replace(/\s+/g, ""), line: lineOf(m.index) });
  for (const m of src.matchAll(/(?:border-radius|borderRadius)\s*:\s*["']?([\d.]+(?:px|rem))/g)) cap(radii, { v: m[1], line: lineOf(m.index) });
  for (const m of src.matchAll(/\brounded-\[([\d.]+(?:px|rem))\]/g)) cap(radii, { v: m[1], line: lineOf(m.index) });
  for (const m of src.matchAll(/(?:box-shadow|boxShadow)\s*:\s*["'`]?([^;}\n"'`]{6,120})/g)) cap(shadows, { v: m[1].trim(), line: lineOf(m.index) });
  return { colors, radii, shadows };
}

function cssFacts(src, lineOf) {
  const defined = {};
  for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;}\n]+)/g)) defined[m[1]] = { value: m[2].trim(), line: lineOf(m.index) };
  const blocks = [];
  const code = stripComments(src);
  const re = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(code)) && blocks.length < 300) {
    const selector = m[1].trim().replace(/\s+/g, " ");
    if (!selector || selector.startsWith(":root") || /^(?:\d+%|from|to)\b/.test(selector)) continue;
    const decls = m[2]
      .split(";")
      .map((d) => d.trim().replace(/\s+/g, " "))
      .filter((d) => d.includes(":"))
      .map((d) => d.replace(/\s*:\s*/, ":"));
    if (decls.length >= 4) blocks.push({ selector: selector.slice(0, 80), line: lineOf(m.index + m[1].length - m[1].trimStart().length), decls });
  }
  return { defined, blocks };
}

const pascal = (n) => /^[A-Z][A-Za-z0-9]*$/.test(n);
const fileComponentName = (rel) => {
  const base = path.basename(rel).replace(/\.[^.]+$/, "").replace(/\.(stories|test|spec)$/, "");
  const name = base.replace(/(^|[-_.\s]+)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  return name[0] ? name[0].toUpperCase() + name.slice(1) : "Component";
};

function destructuredProps(code, from, to) {
  if (from < 0 || to < 0) return [];
  const p = code.slice(from + 1, to);
  const m = /^\s*\{([\s\S]*?)\}\s*(?::|=|$)/.exec(p) || /^\s*\{([\s\S]*)\}/.exec(p);
  if (!m) return [];
  const names = [];
  let depth = 0;
  let cur = "";
  for (const c of m[1] + ",") {
    if (OPEN[c]) depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) {
      const nm = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(cur);
      if (nm) names.push(nm[1]);
      cur = "";
    } else cur += c;
  }
  return names;
}

function jsFacts(rel, src, ext) {
  const code = stripComments(src);
  const lineOf = lineIndex(src);
  const imports = importsOf(code, ext);
  const isJsx = ext === ".tsx" || ext === ".jsx" || /<[A-Za-z][\w.]*[\s>/]/.test(code);
  const { variants: fileVariants, defaults } = variantsOf(code);

  // type / interface declarations by name
  const types = new Map();
  for (const m of code.matchAll(/\b(?:export\s+)?(?:interface\s+([A-Z][\w$]*)(?:\s*<[^>{]*>)?(?:\s+extends\s+([^{]+))?\s*(\{)|type\s+([A-Z][\w$]*)(?:\s*<[^=]*>)?\s*=\s*(\{))/g)) {
    const name = m[1] || m[4];
    const open = m.index + m[0].length - 1;
    types.set(name, { members: typeMembers(code, open), extends: m[2] ? m[2].trim().replace(/\s+/g, " ").slice(0, 100) : undefined });
  }
  // intersection / alias types: type XProps = A & { ... }
  for (const m of code.matchAll(/\btype\s+([A-Z][\w$]*)(?:\s*<[^=]*>)?\s*=\s*([^{;\n]*?)&\s*(\{)/g)) {
    const open = m.index + m[0].length - 1;
    types.set(m[1], { members: typeMembers(code, open), extends: m[2].trim().replace(/\s+/g, " ").slice(0, 100) });
  }

  const defs = [];
  const seen = new Set();
  const add = (name, idx, exported, isDefault, kind) => {
    if (!name || seen.has(name + idx)) return;
    seen.add(name + idx);
    defs.push({ name, idx, exported, isDefault, kind });
  };
  for (const m of code.matchAll(/^(export\s+(default\s+)?)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/gm)) add(m[3] || (m[2] ? fileComponentName(rel) : null), m.index, !!m[1], !!m[2], "function");
  for (const m of code.matchAll(/^(export\s+(default\s+)?)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=/gm)) add(m[3], m.index, !!m[1], !!m[2], "const");
  for (const m of code.matchAll(/^(export\s+(default\s+)?)?class\s+([A-Za-z_$][\w$]*)/gm)) add(m[3], m.index, !!m[1], !!m[2], "class");
  // export { A, B as C } and export default Name
  const reexports = new Set();
  for (const m of code.matchAll(/^[ \t]*export\s*\{([^}]*)\}(?:\s*from\s*["']([^"']+)["'])?/gm))
    for (const part of m[1].split(",")) {
      const nm = part.trim().replace(/^type\s+/, "");
      if (!nm) continue;
      const [orig, alias] = nm.split(/\s+as\s+/);
      reexports.add(alias || orig);
      if (!m[2]) {
        const d = defs.find((x) => x.name === orig);
        if (d) d.exported = true;
      }
    }
  const dm = /^[ \t]*export\s+default\s+([A-Za-z_$][\w$]*)\s*;?[ \t]*$/m.exec(code);
  if (dm) {
    const d = defs.find((x) => x.name === dm[1]);
    if (d) {
      d.exported = true;
      d.isDefault = true;
    }
  }
  const starFrom = [...code.matchAll(/^[ \t]*export\s*\*\s*(?:as\s+([\w$]+)\s*)?from\s*["']([^"']+)["']/gm)].map((m) => m[2]);

  const exports = [];
  const units = [];
  const locals = [];
  for (const d of defs) {
    if (!/^[A-Za-z_$]/.test(d.name)) continue;
    const range = definitionRange(code, d.idx);
    const body = code.slice(range.start, range.end);
    const isComp = pascal(d.name) && (isJsx || ext === ".vue") && (/<[A-Za-z>][\w.]*[\s>/]/.test(body) || /\bjsx\(|createElement\(|forwardRef\(|\bmemo\(/.test(body)) && body.length > 20;
    const isFn = d.kind === "function" || d.kind === "const";
    let props = [];
    let extendsText;
    const union = {};
    if (isComp) {
      const tn = [`${d.name}Props`, `${d.name}Properties`, "Props"].find((n) => types.has(n));
      const refMatch = range.paramsFrom >= 0 ? /:\s*([A-Z][\w$.]*)(?:<[^>]*>)?\s*\)?\s*(?:=>|\{|:|$)/.exec(code.slice(range.paramsFrom, Math.min(range.paramsTo + 1, range.paramsFrom + 400))) : null;
      const tname = tn || (refMatch && types.has(refMatch[1]) ? refMatch[1] : null);
      const generic = new RegExp(`(?:forwardRef|memo)\\s*<[^>]*?([A-Z][\\w$]*Props)\\b`).exec(body) || new RegExp(`React\\.FC<\\s*([A-Z][\\w$]*)`).exec(body) || new RegExp(`FC<\\s*([A-Z][\\w$]*)`).exec(body);
      const resolved = tname || (generic && types.has(generic[1]) ? generic[1] : null);
      if (resolved) {
        const t = types.get(resolved);
        props = t.members.map(({ name, optional, type, union: u }) => ({ name, optional, type, ...(u ? { union: u } : {}) }));
        extendsText = t.extends;
        for (const p of props) if (p.union) union[p.name] = p.union;
      } else {
        // inline type or destructured names
        const names = destructuredProps(code, range.paramsFrom, range.paramsTo);
        const inline = range.paramsFrom >= 0 ? /:\s*(\{)/.exec(code.slice(range.paramsTo > 0 ? code.lastIndexOf("}", range.paramsTo) : range.paramsFrom, range.paramsTo)) : null;
        if (inline) {
          const open = code.lastIndexOf("}", range.paramsTo) + inline.index + inline[0].length - 1;
          props = typeMembers(code, open).map(({ name, optional, type, union: u }) => ({ name, optional, type, ...(u ? { union: u } : {}) }));
          for (const p of props) if (p.union) union[p.name] = p.union;
        }
        if (!props.length) props = names.map((name) => ({ name }));
      }
    }
    // cva / tv variants belong to the component of the same name (buttonVariants -> Button) or the only component in the file
    let variants = {};
    if (isComp) {
      const own = variantsOf(body);
      variants = Object.keys(own.variants).length ? own.variants : {};
    }
    const entry = { name: d.name, line: lineOf(d.idx), end: lineOf(Math.max(d.idx, range.end - 1)), kind: isComp ? "component" : isFn ? "function" : "class", exported: d.exported, default: d.isDefault || undefined };
    if (isComp) Object.assign(entry, { props, ...(extendsText ? { extends: extendsText } : {}), ...(Object.keys(union).length ? { propUnions: union } : {}), ...(Object.keys(variants).length ? { variants } : {}) });
    if (body.length > 60 && (isComp || d.kind === "function" || /=>/.test(body.slice(0, 400)))) {
      const sk = sketch(body);
      if (sk.n >= 30) units.push({ name: d.name, line: entry.line, end: entry.end, n: sk.n, sh: sk.sh, classes: classSet(body), component: isComp, thin: isComp && thinWrapper(body) });
    }
    if (d.exported) exports.push(entry);
    else if (isComp) locals.push(entry);
  }
  // attach file-level cva variants to the component they obviously belong to
  const comps = exports.filter((e) => e.kind === "component");
  if (Object.keys(fileVariants).length) {
    const target = comps.find((c) => new RegExp(`\\b${c.name[0].toLowerCase()}${c.name.slice(1)}Variants\\b`).test(code)) || (comps.length === 1 ? comps[0] : null);
    if (target && !target.variants) target.variants = fileVariants;
    if (target && Object.keys(defaults).length) target.defaultVariants = defaults;
  }
  for (const name of reexports) if (!exports.some((e) => e.name === name) && !defs.some((d) => d.name === name)) exports.push({ name, line: 1, kind: "reexport", exported: true });
  for (const from of starFrom) exports.push({ name: `* from ${from}`, line: 1, kind: "reexport", exported: true });

  // JSX tags used
  const jsx = {};
  for (const m of code.matchAll(/<([A-Z][\w]*(?:\.[A-Za-z][\w]*)*)(?=[\s/>])/g)) jsx[m[1].split(".")[0]] = (jsx[m[1].split(".")[0]] || 0) + 1;
  const vars = {};
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) vars[m[1]] = (vars[m[1]] || 0) + 1;
  const story = /\.stories\.[a-z]+$/.test(rel) ? { component: (/\bcomponent\s*:\s*([A-Z][\w$]*)/.exec(code) || [])[1], title: (/\btitle\s*:\s*["']([^"']+)["']/.exec(code) || [])[1] } : undefined;
  return { imports, exports, locals, jsx, tokens: { vars, defined: {} }, literals: literalsOf(src, lineOf), units, ...(story ? { story } : {}) };
}

/** A component that only forwards to one imported component with fixed props. */
function thinWrapper(body) {
  const tags = [...body.matchAll(/<([A-Z][\w.]*)/g)].map((m) => m[1]);
  return body.length < 700 && new Set(tags).size === 1 && tags.length <= 2 && !/\buse[A-Z]\w*\(|\bif\s*\(|\bmap\(|\bfilter\(/.test(body);
}

function sfcFacts(rel, src, ext) {
  const lineOf = lineIndex(src);
  const name = fileComponentName(rel);
  let props = [];
  let script = src;
  if (ext === ".astro") script = (/^---\r?\n([\s\S]*?)\r?\n---/.exec(src) || [])[1] || "";
  else {
    const sm = /<script[^>]*>([\s\S]*?)<\/script>/.exec(src);
    script = sm ? sm[1] : "";
  }
  const code = stripComments(script);
  const types = new Map();
  for (const m of code.matchAll(/\b(?:interface\s+([A-Z][\w$]*)\s*\{|type\s+([A-Z][\w$]*)\s*=\s*\{)/g)) types.set(m[1] || m[2], typeMembers(code, m.index + m[0].length - 1));
  const dp = /defineProps\s*<\s*(\{|[A-Z][\w$]*)/.exec(code);
  if (dp) {
    if (dp[1] === "{") props = typeMembers(code, dp.index + dp[0].length - 1);
    else props = types.get(dp[1]) || [];
  } else if (types.has("Props")) props = types.get("Props");
  else {
    const dj = /defineProps\s*\(\s*(\{)/.exec(code) || /\bprops\s*:\s*(\{)/.exec(code);
    if (dj) props = topLevelKeys(code, code.indexOf("{", dj.index)).map((k) => ({ name: k.key }));
    else if (/\bprops\s*:\s*\[([^\]]*)\]/.test(code)) props = stringsIn(/\bprops\s*:\s*\[([^\]]*)\]/.exec(code)[1]).map((n) => ({ name: n }));
    for (const m of code.matchAll(/export\s+let\s+([A-Za-z_$][\w$]*)/g)) props.push({ name: m[1] });
    const sp = /let\s*\{([^}]*)\}\s*(?::[^=]+)?=\s*\$props\(\)/.exec(code) || /const\s*\{([^}]*)\}\s*=\s*Astro\.props/.exec(code);
    if (sp) for (const p of sp[1].split(",")) if (p.trim()) props.push({ name: p.trim().split(/[\s:=]/)[0] });
  }
  const jsx = {};
  for (const m of src.matchAll(/<([A-Z][\w]*)(?=[\s/>])/g)) jsx[m[1]] = (jsx[m[1]] || 0) + 1;
  const vars = {};
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) vars[m[1]] = (vars[m[1]] || 0) + 1;
  const imports = importsOf(code, ext);
  const props2 = props.map((p) => ({ name: p.name, optional: p.optional, type: p.type, ...(p.union ? { union: p.union } : {}) }));
  const union = {};
  for (const p of props2) if (p.union) union[p.name] = p.union;
  const sk = sketch(src.replace(/<style[\s\S]*?<\/style>/g, ""));
  return {
    imports,
    exports: [{ name, line: 1, end: lineAt(src, src.length), kind: "component", exported: true, default: true, props: props2, ...(Object.keys(union).length ? { propUnions: union } : {}) }],
    locals: [],
    jsx,
    tokens: { vars, defined: {} },
    literals: literalsOf(src, lineOf),
    units: sk.n >= 30 ? [{ name, line: 1, end: lineAt(src, src.length), n: sk.n, sh: sk.sh, classes: classSet(src), component: true, thin: false }] : [],
  };
}

/** Facts for one file. `rel` is the project-relative posix path. */
export function extractFile(rel, src) {
  const ext = path.extname(rel).toLowerCase();
  const base = { rel, lang: ext.slice(1), isTest: /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[a-z]+$/.test(rel), isStory: /\.stories\.[a-z]+$/.test(rel) };
  const lineOf = lineIndex(src);
  if (ext === ".css" || ext === ".scss") {
    const css = cssFacts(src, lineOf);
    const vars = {};
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) vars[m[1]] = (vars[m[1]] || 0) + 1;
    return { ...base, imports: [], exports: [], locals: [], jsx: {}, tokens: { vars, defined: css.defined }, literals: literalsOf(src, lineOf), units: [], css: { blocks: css.blocks } };
  }
  if (JS_EXTS.has(ext)) return { ...base, ...jsFacts(rel, src, ext) };
  const f = { ...base, ...sfcFacts(rel, src, ext) };
  if (ext === ".vue" || ext === ".svelte" || ext === ".astro") {
    const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(src);
    if (style) {
      const css = cssFacts(style[1], (i) => lineOf(src.indexOf(style[1]) + i));
      f.tokens.defined = css.defined;
      f.css = { blocks: css.blocks };
    }
  }
  return f;
}

// The Drip command line. It runs the very same handlers as the MCP server (core/registry.mjs), so a tool
// behaves identically over MCP, here and in Code Mode. See docs/CLI.md.
//
// Old forms still work:  drip-mcp list    drip-mcp <tool> '<json>' [--out dir]
// Exit codes: 0 ok, 1 tool error or gate refusal, 2 usage error, 3 missing prerequisite.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { inputJsonSchema } from "./codemode/signatures.mjs";
import { homeDripDir, pluginRoot, projectDir, projectDripDir } from "./paths.mjs";
import { collectTools } from "./registry.mjs";
import { bindSession, loadState, setIdentity } from "./state.mjs";
import { formatDoctor, runDoctor } from "./doctor.mjs";
import { installVendor } from "./vendor.mjs";
import { installMockstudio } from "../modules/studio/mockup.mjs";
import { executeCode } from "./codemode/execute.mjs";
import { toolSignature } from "./codemode/signatures.mjs";

export const EXIT = { OK: 0, TOOL: 1, USAGE: 2, PREREQ: 3 };

const VALUE_FLAGS = new Set(["project", "session", "task", "out", "input", "input-file", "install", "agent", "file", "max-chars", "code"]);
const BOOL_FLAGS = new Set(["json", "changed", "full", "dry-run", "help", "no-wait", "stdin", "version"]);
const DEFAULT_MAX_CHARS = 20000;

class UsageError extends Error {}

export function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (a === "-h") flags.help = true;
    else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = (eq > 0 ? a.slice(2, eq) : a.slice(2)).trim();
      if (BOOL_FLAGS.has(name)) flags[name] = eq > 0 ? !/^(false|0|no)$/i.test(a.slice(eq + 1)) : true;
      else if (VALUE_FLAGS.has(name)) {
        const v = eq > 0 ? a.slice(eq + 1) : argv[++i];
        if (v === undefined) throw new UsageError(`--${name} needs a value.`);
        flags[name] = v;
      } else throw new UsageError(`Unknown option --${name}. Run: drip help`);
    } else positional.push(a);
  }
  return { positional, flags };
}

// ---- output ----

const writeOut = (s) => new Promise((resolve) => process.stdout.write(s.endsWith("\n") ? s : `${s}\n`, resolve));
const log = (s) => process.stderr.write(`${s}\n`);

async function finish(res, flags, { code } = {}) {
  const exit = code ?? (res.ok ? EXIT.OK : res.error?.exit ?? EXIT.TOOL);
  if (flags.json) {
    const { error, ...rest } = res;
    await writeOut(JSON.stringify({ ...rest, ok: !!res.ok, images: res.images || [], ...(error ? { error: { code: error.code, message: error.message } } : {}) }, null, 2));
  } else {
    if (res.text) await writeOut(res.text);
    for (const f of res.images || []) await writeOut(`[image] ${f}`);
    if (!res.ok && res.error && !res.text) log(`error: ${res.error.message}`);
  }
  return exit;
}

const failure = (tool, exit, code, message, extra = {}) => ({ ok: false, tool, text: "", images: [], error: { code, message, exit }, ...extra });

const PREREQ = /(Chrome\/Edge not found|not installed|isn't installed|no API key|API key|missing prerequisite|not available in this build|Blender not found|uvx not found|Node 22)/i;

/** Keep the printed text small: the full text goes to a file the caller can read. */
function bound(text, flags, name, outDir) {
  const max = flags["max-chars"] ? Number(flags["max-chars"]) : flags.__legacy ? Infinity : DEFAULT_MAX_CHARS;
  if (!(text.length > max)) return { text };
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}-${Date.now()}.txt`);
  fs.writeFileSync(file, text);
  return { text: `${text.slice(0, max)}\n[output cut at ${max} of ${text.length} characters; full text: ${file}]`, textFile: file };
}

function outDirFor(flags) {
  return path.resolve(flags.out || path.join(projectDripDir(), "cli"));
}

// ---- running a tool ----

/** Run a registered tool with validated arguments. Never throws; returns the structured result. */
export async function invokeTool(name, args, flags = {}) {
  const tools = collectTools();
  const tool = tools.get(name);
  if (!tool) return failure(name, EXIT.USAGE, "unknown_tool", `Unknown tool "${name}". Run: drip tools list`);
  const parsed = z.object(tool.meta.inputSchema || {}).safeParse(args ?? {});
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`).join("; ");
    return failure(name, EXIT.USAGE, "invalid_arguments", `Invalid arguments for ${name}: ${msg}. See: drip tools schema ${name}`);
  }
  let res;
  try {
    res = await tool.handler(parsed.data, {});
  } catch (e) {
    const msg = String(e?.message || e);
    return failure(name, PREREQ.test(msg) ? EXIT.PREREQ : EXIT.TOOL, "tool_error", msg);
  }
  const outDir = outDirFor(flags);
  let body = "";
  const images = [];
  for (const c of res?.content || []) {
    if (c.type === "text") body += (body ? "\n" : "") + c.text;
    else if (c.type === "image") {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${name}-${Date.now()}-${images.length + 1}.${c.mimeType === "image/png" ? "png" : c.mimeType === "image/webp" ? "webp" : "jpg"}`);
      fs.writeFileSync(file, Buffer.from(c.data, "base64"));
      images.push(file);
    }
  }
  const b = bound(body, flags, name, outDir);
  if (res?.isError) {
    const exit = PREREQ.test(body) ? EXIT.PREREQ : EXIT.TOOL;
    return { ok: false, tool: name, text: b.text, ...(b.textFile ? { textFile: b.textFile } : {}), images, error: { code: exit === EXIT.PREREQ ? "missing_prerequisite" : "tool_error", message: body.split("\n")[0].slice(0, 500), exit } };
  }
  return { ok: true, tool: name, text: b.text, ...(b.textFile ? { textFile: b.textFile } : {}), images };
}

async function readInput(flags, pos) {
  let raw = null;
  if (flags.input !== undefined && flags.input !== "-") raw = flags.input;
  else if (flags["input-file"]) {
    try {
      raw = fs.readFileSync(path.resolve(flags["input-file"]), "utf8");
    } catch (e) {
      throw new UsageError(`Can't read --input-file: ${e.message}`);
    }
  } else if (flags.input === "-" || flags.stdin) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } else if (pos !== undefined) raw = pos;
  if (raw === null || !String(raw).trim()) return {};
  try {
    const v = JSON.parse(raw);
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("expected a JSON object");
    return v;
  } catch (e) {
    throw new UsageError(`The tool input is not valid JSON (${e.message}).`);
  }
}

// ---- hosts (built by another workstream; loaded when present) ----

async function loadHosts() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // From src/core/cli.mjs and from the bundle in dist/.
  for (const f of [path.resolve(here, "..", "hosts", "index.mjs"), path.resolve(here, "..", "src", "hosts", "index.mjs")]) {
    if (fs.existsSync(f)) return import(pathToFileURL(f).href);
  }
  return null;
}

const NO_HOSTS = "Host installers are not available in this build (mcp/src/hosts/index.mjs is missing).";

// ---- help ----

const COMMANDS = [
  ["doctor [--json] [--install <dep>]", "Check Node, Chrome/Edge, Blender, uvx, optional dependencies, keys (names only), project and plugin folders."],
  ["tools list [--json]", "Every tool name with a one-line description."],
  ["tools schema <name>", "A tool's JSON Schema, from the same definition MCP uses."],
  ["call <tool> [--input json | --input-file f | --input -] [--json] [--out dir]", "Run any tool. Images are written to --out (default .drip/cli)."],
  ["project inspect", "Compact project context: boards, design doc, task, config."],
  ["board open [--no-wait]", "Open the moodboard (keeps running while the preview server is up)."],
  ["components index|audit [--changed] [--json]", "Index or audit the project's components."],
  ["check [--changed|--full] [--json]", "Lint, typecheck, tests, fit-check lint and component audit in one pass."],
  ["run --file workflow.js [--json]", "Run a Code Mode script: await drip.<tool>(args), return a value."],
  ["install --agent <codex|cursor|opencode|claude-desktop|chatgpt> [--dry-run]", "Add Drip to another agent host."],
  ["uninstall --agent <host> [--dry-run]", "Remove only what install added."],
  ["hosts [--json]", "Which hosts Drip supports and their state (hosts doctor <host> for one)."],
];
const GLOBALS = ["--project <dir>  project to work on (sets DRIP_PROJECT_DIR)", "--session <id>   session identity for task state", "--task <id>      work on this task", "--json           one JSON object on stdout: { ok, tool, text, images, error }", "--out <dir>      where images and long output go (default <project>/.drip/cli)", "--max-chars <n>  longest text printed before it is cut and written to a file (default 20000)"];

function helpText() {
  const tools = collectTools();
  return [
    "Drip command line. Same engine and handlers as the MCP server.",
    "",
    "Commands:",
    ...COMMANDS.map(([c, d]) => `  drip ${c}\n      ${d}`),
    "",
    "Global options:",
    ...GLOBALS.map((g) => `  ${g}`),
    "",
    "Exit codes: 0 ok, 1 tool error or gate refusal, 2 usage error, 3 missing prerequisite.",
    "Older forms still work: drip list, drip <tool> '<json>'.",
    "",
    `${tools.size} tools (drip tools list). Examples:`,
    "  drip call refs_tag --input '{\"tag\":\"bakery logo\"}' --json",
    "  drip tools schema fitcheck_lint",
  ].join("\n");
}

const oneLine = (d) => (d || "").split(". ")[0].slice(0, 110);

// ---- commands ----

async function cmdDoctor(flags) {
  if (flags.install) {
    try {
      log(`Installing ${flags.install} into ~/.drip/vendor ...`);
      if (flags.install === "mockstudio") {
        const m = await installMockstudio(log);
        return finish({ ok: m.ok, tool: "doctor", text: m.ok ? `MockStudio is ready in ${m.dir}. mockup_render can use it now.` : "MockStudio installed but its build is missing.", images: [] }, flags);
      }
      const r = await installVendor(flags.install);
      return finish({ ok: true, tool: "doctor", text: `Installed ${r.package} in ${r.dir}.`, images: [] }, flags);
    } catch (e) {
      const unknown = /Unknown optional/.test(e.message);
      return finish(failure("doctor", unknown ? EXIT.USAGE : EXIT.TOOL, unknown ? "unknown_dependency" : "install_failed", e.message), flags);
    }
  }
  const hostsDoctor = async () => {
    const h = await loadHosts();
    if (!h?.doctor) return [];
    const out = [];
    const list = (await h.listHosts?.()) || [];
    for (const host of list) {
      const id = host.id || host.name || host;
      try {
        const d = await h.doctor(id);
        out.push({ id: `host-${id}`, label: `Host ${host.label || id}`, status: d?.ok === false ? "warn" : "info", detail: typeof d === "string" ? d : d?.summary || d?.text || (d?.ok ? "ready" : JSON.stringify(d)) });
      } catch (e) {
        out.push({ id: `host-${id}`, label: `Host ${id}`, status: "warn", detail: String(e?.message || e) });
      }
    }
    return out;
  };
  const r = await runDoctor({ hostsDoctor });
  const res = { ok: r.ok, tool: "doctor", text: formatDoctor(r), images: [], checks: r.checks, summary: r.summary, ...(r.ok ? {} : { error: { code: "missing_prerequisite", message: r.summary, exit: EXIT.PREREQ } }) };
  if (flags.json) delete res.text;
  return finish(res, flags);
}

async function cmdTools(pos, flags) {
  const tools = collectTools();
  const sub = pos[0];
  if (sub === "list" || sub === undefined) {
    if (flags.json) return finish({ ok: true, tool: "tools", images: [], tools: [...tools].map(([name, t]) => ({ name, module: t.module, description: t.meta.description || "" })) }, flags);
    const text = [...tools].map(([name, { meta }]) => `${name.padEnd(22)} ${oneLine(meta.description)}`).join("\n");
    return finish({ ok: true, tool: "tools", text, images: [] }, flags);
  }
  if (sub === "schema") {
    const name = pos[1];
    if (!name) throw new UsageError("Usage: drip tools schema <name>");
    const t = tools.get(name);
    if (!t) return finish(failure("tools", EXIT.USAGE, "unknown_tool", `Unknown tool "${name}". Run: drip tools list`), flags);
    const schema = { name, module: t.module, title: t.meta.title || name, description: t.meta.description || "", inputSchema: inputJsonSchema(t.meta) };
    await writeOut(JSON.stringify(schema, null, flags.json ? 0 : 2));
    return EXIT.OK;
  }
  throw new UsageError(`Unknown tools command "${sub}". Use: tools list | tools schema <name>`);
}

function basicProject() {
  const root = projectDir();
  const lines = [`Project: ${root}`];
  const drip = projectDripDir();
  lines.push(fs.existsSync(drip) ? `.drip folder: ${drip}` : "No .drip folder yet (created on first use).");
  for (const f of ["DESIGN.md", "docs/DESIGN.md", "design/DESIGN.md"]) if (fs.existsSync(path.join(root, f))) lines.push(`Design doc: ${f}`);
  try {
    const boards = path.join(drip, "boards");
    const ids = fs.existsSync(boards) ? fs.readdirSync(boards).filter((d) => fs.existsSync(path.join(boards, d, "board.json"))) : [];
    lines.push(ids.length ? `Boards: ${ids.join(", ")}` : "Boards: none");
  } catch {
    lines.push("Boards: unreadable");
  }
  try {
    const { task } = loadState();
    lines.push(task ? `Task: ${task.title || task.id} (${task.id})` : "Task: none open");
  } catch {
    lines.push("Task: state unreadable");
  }
  const cfg = path.join(drip, "config.json");
  lines.push(fs.existsSync(cfg) ? `Config: ${cfg}` : "Config: defaults");
  return lines.join("\n");
}

async function cmdProject(pos, flags) {
  if (pos[0] !== "inspect") throw new UsageError("Usage: drip project inspect");
  if (collectTools().has("project_context")) return finish(await invokeTool("project_context", {}, flags), flags);
  return finish({ ok: true, tool: "project", text: basicProject(), images: [] }, flags);
}

async function cmdBoard(pos, flags) {
  if (pos[0] !== "open") throw new UsageError("Usage: drip board open");
  const res = await invokeTool("board_open", {}, flags);
  const code = await finish(res, flags);
  if (res.ok && !flags["no-wait"]) {
    log("Board server is running. Press Ctrl+C to stop.");
    await new Promise(() => {}); // the preview server lives in this process
  }
  return code;
}

async function cmdComponents(pos, flags) {
  const sub = pos[0];
  if (sub !== "index" && sub !== "audit") throw new UsageError("Usage: drip components index|audit [--changed] [--json]");
  const tool = `components_${sub}`;
  if (!collectTools().has(tool)) return finish(failure(tool, EXIT.PREREQ, "not_available", `${tool} is not available in this build.`), flags);
  return finish(await invokeTool(tool, flags.changed ? { changed: true } : {}, flags), flags);
}

async function cmdCheck(flags) {
  const tools = collectTools();
  if (tools.has("drip_check")) return finish(await invokeTool("drip_check", flags.full ? { full: true } : flags.changed ? { changed: true } : {}, flags), flags);
  if (tools.has("fitcheck_lint")) {
    log("drip_check is not available in this build; running fitcheck_lint only.");
    return finish(await invokeTool("fitcheck_lint", {}, flags), flags);
  }
  return finish(failure("check", EXIT.PREREQ, "not_available", "drip_check is not available in this build."), flags);
}

async function cmdRun(flags) {
  if (!flags.file && !flags.code) throw new UsageError("Usage: drip run --file workflow.js");
  let code;
  if (flags.file) {
    try {
      code = fs.readFileSync(path.resolve(flags.file), "utf8");
    } catch (e) {
      throw new UsageError(`Can't read --file: ${e.message}`);
    }
  } else code = flags.code;
  const r = await executeCode(code, { outDir: flags.out ? path.resolve(flags.out) : undefined });
  const lines = [];
  if (r.logs.length) lines.push(...r.logs);
  if (r.ok) lines.push(r.value === undefined ? "(no return value)" : JSON.stringify(r.value, null, 2));
  else lines.push(`error (${r.error.name}): ${r.error.message}`);
  const res = { ok: r.ok, tool: "drip_execute", text: lines.join("\n"), logs: r.logs, result: r.value, calls: r.calls, ms: r.ms, images: r.images, ...(r.ok ? {} : { error: { code: r.error.name === "LimitError" ? "limit" : "script_error", message: r.error.message, exit: EXIT.TOOL } }) };
  if (flags.json) delete res.text;
  return finish(res, flags);
}

async function cmdHosts(sub, pos, flags) {
  const hosts = await loadHosts();
  if (!hosts) return finish(failure(sub, EXIT.PREREQ, "not_available", NO_HOSTS), flags);
  const show = async (data, ok = true) => {
    const text = typeof data === "string" ? data : data?.text || JSON.stringify(data, null, 2);
    return finish({ ok, tool: sub, ...(flags.json ? { result: data } : { text }), images: [] }, flags);
  };
  if (sub === "hosts") {
    if (pos[0] === "doctor") {
      if (!pos[1]) throw new UsageError("Usage: drip hosts doctor <host>");
      return show(await hosts.doctor(pos[1]));
    }
    return show(await hosts.listHosts());
  }
  const agent = flags.agent;
  if (!agent) throw new UsageError(`Usage: drip ${sub} --agent <host> [--dry-run]. Hosts: drip hosts`);
  const opts = { pluginRoot, home: process.env.HOME || process.env.USERPROFILE || path.dirname(homeDripDir), dryRun: !!flags["dry-run"] };
  const fn = hosts[sub];
  if (typeof fn !== "function") return finish(failure(sub, EXIT.PREREQ, "not_available", `${sub} is not available in this build.`), flags);
  try {
    return show(await fn(agent, opts));
  } catch (e) {
    return finish(failure(sub, /unknown|unsupported/i.test(e.message) ? EXIT.USAGE : EXIT.TOOL, "host_error", String(e?.message || e)), flags);
  }
}

// ---- entry ----

function applyGlobals(flags) {
  if (flags.project) {
    const p = path.resolve(flags.project);
    if (!fs.existsSync(p)) throw new UsageError(`--project folder not found: ${p}`);
    process.env.DRIP_PROJECT_DIR = p;
  }
  let session = flags.session;
  if (flags.task && !session) session = `cli-${flags.task}`;
  if (session) setIdentity({ session });
  if (flags.task) {
    bindSession(session, flags.task);
    const t = loadState().task;
    if (!t || t.id !== flags.task) log(`warning: no open task "${flags.task}" in ${projectDir()}.`);
  }
}

/** Run the CLI and return the exit code. The caller exits the process. */
export async function runCli(argv, { version = "" } = {}) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    log(`${e.message}`);
    return EXIT.USAGE;
  }
  const { positional, flags } = parsed;
  const [cmd, ...pos] = positional;
  try {
    if (flags.version) {
      await writeOut(`drip ${version}`.trim());
      return EXIT.OK;
    }
    if (cmd && flags.help && collectTools().has(cmd)) {
      const t = collectTools().get(cmd);
      await writeOut(`${t.meta.description || cmd}

${toolSignature(cmd, t.meta)}
Schema: drip tools schema ${cmd}`);
      return EXIT.OK;
    }
    if (!cmd || cmd === "help" || (flags.help && !collectTools().has(cmd))) {
      await writeOut(helpText());
      return cmd || flags.help || cmd === "help" ? EXIT.OK : EXIT.USAGE;
    }
    applyGlobals(flags);
    switch (cmd) {
      case "list": // old form: plain lines
        return cmdTools(["list"], { ...flags, json: false });
      case "doctor":
        return await cmdDoctor(flags);
      case "tools":
        return await cmdTools(pos, flags);
      case "call": {
        if (!pos[0]) throw new UsageError("Usage: drip call <tool> --input '<json>'");
        return await finish(await invokeTool(pos[0], await readInput(flags, pos[1]), flags), flags);
      }
      case "project":
        return await cmdProject(pos, flags);
      case "board":
        return await cmdBoard(pos, flags);
      case "components":
        return await cmdComponents(pos, flags);
      case "check":
        return await cmdCheck(flags);
      case "run":
        return await cmdRun(flags);
      case "install":
      case "uninstall":
      case "hosts":
        return await cmdHosts(cmd, pos, flags);
      default: {
        if (collectTools().has(cmd)) {
          // Old form: drip-mcp <tool> '<json>' [--out dir]. Text is printed whole, as it always was.
          const lf = { ...flags, __legacy: true };
          return await finish(await invokeTool(cmd, await readInput(flags, pos[0]), lf), lf);
        }
        log(`Unknown command or tool "${cmd}". Run: drip help`);
        return EXIT.USAGE;
      }
    }
  } catch (e) {
    if (e instanceof UsageError) {
      log(e.message);
      return EXIT.USAGE;
    }
    const msg = String(e?.message || e);
    log(`error: ${msg}`);
    return PREREQ.test(msg) ? EXIT.PREREQ : EXIT.TOOL;
  }
}

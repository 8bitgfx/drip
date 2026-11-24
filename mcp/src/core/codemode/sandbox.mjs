// A QuickJS (WASM) sandbox for Code Mode. The script sees ECMAScript built-ins, console.log and
// `await drip.<tool>(args)` for the tools it was given. Nothing else: no fs, net, process, require, import,
// timers or eval of host code. Limits: CPU time per run of the VM, wall time overall, memory, stack, call count.
// quickjs-emscripten's single-file variant has the WASM inlined, so esbuild bundles it into dist/drip-mcp.mjs.
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import variant from "@jitl/quickjs-singlefile-mjs-release-sync";

let modulePromise = null;
function quickjs() {
  modulePromise ||= newQuickJSWASMModuleFromVariant(variant);
  return modulePromise;
}

const PRELUDE = (names) => `
(() => {
  const call = globalThis.__call;
  const log = globalThis.__log;
  delete globalThis.__call;
  delete globalThis.__log;
  const show = (v) => {
    if (typeof v === "string") return v;
    try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
  };
  const out = (...a) => { log(a.map(show).join(" ")); };
  globalThis.console = Object.freeze({ log: out, info: out, warn: out, error: out, debug: out });
  const drip = {};
  for (const name of ${JSON.stringify(names)}) {
    drip[name] = async (args) => JSON.parse(await call(name, JSON.stringify(args === undefined ? {} : args)));
  }
  Object.freeze(drip);
  const guarded = new Proxy(drip, { get(t, k) { if (typeof k === "string" && !(k in t)) throw new Error("drip." + k + " is not available in Code Mode. Use drip_search to list what is."); return t[k]; } });
  Object.defineProperty(globalThis, "drip", { value: guarded, enumerable: false });
})();
`;

const wrap = (code) => `(async () => {
  const __value = await (async () => {
${code}
  })();
  return __value === undefined ? undefined : JSON.stringify(__value);
})()`;

/**
 * Run `code` (an async function body: use `return` for the result).
 * @param {object} o
 * @param {string} o.code
 * @param {string[]} o.toolNames names exposed as drip.<name>
 * @param {(name: string, args: any) => Promise<any>} o.callTool host side of every call; its return value is JSON-serialised
 * @param {number} [o.timeoutMs] wall time for the whole run (default 120000)
 * @param {number} [o.cpuMs] longest uninterrupted stretch of script execution (default 10000)
 * @param {number} [o.maxCalls] (default 50)
 * @param {number} [o.memoryBytes] (default 64 MB)
 * @param {number} [o.maxLogChars] (default 20000)
 * @param {AbortSignal} [o.signal]
 * @returns {Promise<{ ok: boolean, logs: string[], value: any, error?: { name: string, message: string }, calls: number, ms: number, logsTruncated: boolean }>}
 */
export async function runSandbox({ code, toolNames, callTool, timeoutMs = 120000, cpuMs = 10000, maxCalls = 50, memoryBytes = 64 * 1024 * 1024, maxLogChars = 20000, signal }) {
  const started = Date.now();
  const QuickJS = await quickjs();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(memoryBytes);
  runtime.setMaxStackSize(256 * 1024);
  let sliceEnd = Infinity;
  let limit = null; // why the interrupt handler fired
  const wallEnd = started + timeoutMs;
  runtime.setInterruptHandler(() => {
    const now = Date.now();
    if (signal?.aborted) {
      limit = "cancelled";
      return true;
    }
    if (now > wallEnd) {
      limit = "wall";
      return true;
    }
    if (now > sliceEnd) {
      limit = "cpu";
      return true;
    }
    return false;
  });
  const vm = runtime.newContext();
  const logs = [];
  let logChars = 0;
  let logsTruncated = false;
  let calls = 0;
  const deferreds = [];
  let inFlight = 0;
  let settled = 0;
  let wake = () => {};

  const enter = (fn) => {
    sliceEnd = Math.min(Date.now() + cpuMs, wallEnd);
    try {
      return fn();
    } finally {
      sliceEnd = Infinity;
    }
  };

  const result = { ok: false, logs, value: undefined, calls: 0, ms: 0, logsTruncated: false };
  try {
    const logFn = vm.newFunction("__log", (h) => {
      const line = vm.getString(h);
      if (logChars < maxLogChars) {
        logs.push(line.length > maxLogChars - logChars ? line.slice(0, maxLogChars - logChars) : line);
        logChars += line.length + 1;
      } else logsTruncated = true;
    });
    vm.setProp(vm.global, "__log", logFn);
    logFn.dispose();

    const callFn = vm.newFunction("__call", (nameH, argsH) => {
      const name = vm.getString(nameH);
      const argsJson = vm.getString(argsH);
      const deferred = vm.newPromise();
      deferreds.push(deferred);
      inFlight++;
      (async () => {
        if (++calls > maxCalls) throw new Error(`Call limit reached (${maxCalls} tool calls per run). Do more per call or raise maxCalls.`);
        if (signal?.aborted) throw new Error("Cancelled.");
        return JSON.stringify(await callTool(name, JSON.parse(argsJson)));
      })().then(
        (json) => {
          if (!vm.alive) return;
          const h = vm.newString(json ?? "null");
          deferred.resolve(h);
          h.dispose();
        },
        (err) => {
          if (!vm.alive) return;
          const h = vm.newError({ name: "ToolError", message: String(err?.message || err).slice(0, 4000) });
          deferred.reject(h);
          h.dispose();
        },
      ).finally(() => {
        inFlight--;
        settled++;
        wake();
      });
      return deferred.handle;
    });
    vm.setProp(vm.global, "__call", callFn);
    callFn.dispose();

    vm.unwrapResult(enter(() => vm.evalCode(PRELUDE(toolNames), "drip-prelude.js"))).dispose();

    const promise = vm.unwrapResult(enter(() => vm.evalCode(wrap(code), "script.js")));
    let seen = 0;
    let timer;
    const wallTimeout = new Promise((r) => (timer = setTimeout(() => r("wall"), Math.max(1, wallEnd - Date.now()))));
    try {
      for (;;) {
        const jobs = enter(() => runtime.executePendingJobs());
        if (jobs.error) {
          const e = vm.dump(jobs.error);
          jobs.error.dispose();
          throw Object.assign(new Error(e?.message || "Script error"), { name: e?.name || "Error" });
        }
        const state = vm.getPromiseState(promise);
        if (state.type === "fulfilled") {
          const v = state.value;
          const s = vm.typeof(v) === "string" ? vm.getString(v) : undefined;
          v.dispose();
          result.value = s === undefined ? undefined : JSON.parse(s);
          result.ok = true;
          break;
        }
        if (state.type === "rejected") {
          const e = vm.dump(state.error);
          state.error.dispose();
          throw Object.assign(new Error(typeof e === "string" ? e : e?.message || "Script error"), { name: e?.name || "Error" });
        }
        if (limit === "cpu" || limit === "wall" || limit === "cancelled") break;
        if (jobs.value > 0) continue; // more microtasks may be queued
        if (settled !== seen) {
          seen = settled; // a tool call finished since the last look: run its continuation
          continue;
        }
        if (inFlight === 0) throw new Error("The script's promise never settled (nothing is pending).");
        const which = await Promise.race([new Promise((r) => (wake = r)).then(() => "call"), wallTimeout]);
        if (which === "wall") {
          limit = "wall";
          break;
        }
      }
    } finally {
      clearTimeout(timer);
      promise.dispose();
    }
    if (!result.ok && limit) throw Object.assign(new Error(limitMessage(limit, timeoutMs, cpuMs)), { name: "LimitError" });
  } catch (err) {
    let e = err;
    if (limit && !(e?.name === "LimitError")) e = Object.assign(new Error(limitMessage(limit, timeoutMs, cpuMs)), { name: "LimitError" });
    else if (/out of memory/i.test(e?.message || "")) e = Object.assign(new Error(`Memory limit reached (${Math.round(memoryBytes / 1048576)} MB).`), { name: "LimitError" });
    else if (/stack/i.test(e?.message || "") && /overflow|exceed/i.test(e?.message || "")) e = Object.assign(new Error("Call stack too deep."), { name: "LimitError" });
    result.ok = false;
    result.error = { name: e?.name || "Error", message: String(e?.message || e) };
  } finally {
    // Let calls that are still running finish before the VM goes away; their results are dropped.
    for (const d of deferreds) {
      try {
        d.dispose();
      } catch {
        /* already disposed */
      }
    }
    try {
      vm.dispose();
    } catch {
      /* leaked handle: the runtime is discarded anyway */
    }
    try {
      runtime.dispose();
    } catch {
      /* ignore */
    }
  }
  result.calls = calls;
  result.ms = Date.now() - started;
  result.logsTruncated = logsTruncated;
  return result;
}

function limitMessage(limit, timeoutMs, cpuMs) {
  if (limit === "cancelled") return "Cancelled.";
  if (limit === "cpu") return `Script ran for more than ${cpuMs} ms without waiting on a tool (infinite loop?). Interrupted.`;
  return `Time limit reached (${timeoutMs} ms for the whole run). Interrupted.`;
}

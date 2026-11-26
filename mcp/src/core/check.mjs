// drip_check: the project's own lint / typecheck / tests, Drip's fit-check lint, the component reuse audit and
// the optional dry-lint, in one structured result, with receipts so unchanged work is not repeated.
//
// A receipt is reused only when the hash of that check's inputs matches (the files it reads, design tokens and
// assets, the relevant config, tool versions). `full: true` ignores receipts. Unknown inputs mean: run the check.
//
//   runCheck({ changed, full, only, project }) -> { exitCode, checks: [{ name, status, durationMs, findings, fix, reused, summary }] }
//   status: pass | warn | fail | skipped.  exitCode: 0 unless a check failed (1).
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { hashText } from "./indexer/extract.mjs";
import { indexHash, indexProject } from "./indexer/index.mjs";
import { walkProject } from "./indexer/walk.mjs";
import { readJson, updateJson } from "./jsonstore.mjs";
import { dataDir, pluginVersion, projectDir, projectDripDir } from "./paths.mjs";
import { auditIndex } from "../modules/components/audit.mjs";
import { evidenceStale, loadState, reconcileWorkspace, updateState } from "./state.mjs";
import { lintableUiFiles } from "./evidence.mjs";
import { lintFiles } from "../modules/fitcheck/lint.mjs";
import { detectJudge, DRY_LINT_EXTS, dryLintInputs, judgePairs, runDryLint } from "../modules/components/drylint.mjs";
import { relPath } from "./util.mjs";

export const AUDIT_VERSION = "audit-1";
const receiptsFile = (root) => path.join(projectDripDir(root), "check", "receipts.json");
const UI_RE = /\.(tsx|jsx|vue|svelte|astro|html|css|scss)$/;

const readIf = (f) => {
  try {
    return fs.readFileSync(f, "utf8");
  } catch {
    return "";
  }
};

function pkgManager(root) {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) return "bun";
  return "npm";
}

/** Run `<pm> run <script>`: argument array only, script name validated, output bounded. */
function runScript(root, pm, script, timeoutMs) {
  return new Promise((resolve) => {
    const win = process.platform === "win32";
    const exe = win ? process.env.ComSpec || "cmd.exe" : pm;
    const args = win ? ["/d", "/s", "/c", `${pm} run ${script}`] : ["run", script];
    const t0 = Date.now();
    execFile(exe, args, { cwd: root, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: { ...process.env, CI: "1", FORCE_COLOR: "0" }, windowsVerbatimArguments: win }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, out: `${stdout}\n${stderr}`.replace(/\x1b\[[0-9;]*m/g, ""), timedOut: !!err?.killed, ms: Date.now() - t0 });
    });
  });
}

const tail = (s, n = 30) => s.trim().split("\n").slice(-n).join("\n");

function parseLocations(out, root) {
  const found = [];
  const seen = new Set();
  for (const m of out.matchAll(/(?:^|\s)((?:[A-Za-z]:)?[\w./\\@()[\]-]+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte|astro|css|scss)):(\d+)(?::(\d+))?/gm)) {
    const rel = path.isAbsolute(m[1]) ? relPath(root, m[1]) : m[1].replace(/^\.\//, "");
    const key = `${rel}:${m[2]}`;
    if (seen.has(key) || rel.startsWith("..")) continue;
    seen.add(key);
    found.push({ file: rel, line: +m[2] });
    if (found.length >= 12) break;
  }
  return found;
}

/** Scripts the project defines, mapped to check names. */
export function discoverScripts(root) {
  const pkg = readJson(path.join(root, "package.json"), null);
  if (!pkg?.scripts) return [];
  const s = pkg.scripts;
  const pick = (names) => names.find((n) => s[n]);
  const out = [];
  const lint = pick(["lint", "eslint"]);
  const typecheck = pick(["typecheck", "type-check", "check-types", "tsc"]);
  const test = pick(["test"]);
  if (lint) out.push({ name: "lint", script: lint, timeoutMs: 180000 });
  if (typecheck) out.push({ name: "typecheck", script: typecheck, timeoutMs: 240000 });
  if (test && !/no test specified/.test(s[test])) out.push({ name: "test", script: test, timeoutMs: 300000 });
  return out;
}

function assetsHash(root) {
  const exts = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif", ".woff", ".woff2", ".ttf", ".otf", ".ico"]);
  const files = walkProject(root, { exts, maxFiles: 3000 });
  return hashText(files.map((f) => `${f.rel}:${f.size}`).join("\n"));
}


/**
 * Run the checks. Options: changed (only what changed since the last run), full (ignore receipts), only ([names]),
 * project (root), strict (audit `high` findings fail instead of warn; also check.strict in config).
 */
export async function runCheck({ changed = false, full = false, only, project, strict, config } = {}) {
  const root = project || projectDir();
  const cfg = config || loadConfig();
  const chk = cfg.check || {};
  const isStrict = strict ?? chk.strict ?? false;
  const want = (n) => !only?.length || only.includes(n);
  const { index, changed: changedFiles } = indexProject({ root });
  const prevReceipts = readJson(receiptsFile(root), { receipts: {}, snapshot: {} });
  const snapshot = Object.fromEntries(Object.entries(index.files).map(([r, e]) => [r, e.hash]));
  const touched = new Set(Object.keys(snapshot).filter((r) => prevReceipts.snapshot?.[r] !== snapshot[r]));
  for (const r of Object.keys(prevReceipts.snapshot || {})) if (!(r in snapshot)) touched.add(r);
  const scope = changed && Object.keys(prevReceipts.snapshot || {}).length ? touched : null;
  const idxHash = indexHash(index);
  const versions = { node: process.version, check: AUDIT_VERSION, drip: pluginVersion() || "?" };
  const cfgHash = hashText(JSON.stringify({ check: chk, uiFiles: cfg.uiFiles, ignoreFiles: cfg.ignoreFiles }));
  const assets = assetsHash(root);
  const checks = [];
  const fresh = {};

  const withReceipt = async (name, inputHash, fn) => {
    const prev = prevReceipts.receipts?.[name];
    if (!full && prev && prev.inputHash === inputHash) {
      checks.push({ ...prev.result, name, reused: true, durationMs: 0, summary: `${prev.result.summary} (unchanged since ${prev.at.slice(0, 16).replace("T", " ")}: result reused)` });
      return;
    }
    const t0 = Date.now();
    let result;
    try {
      result = await fn();
    } catch (e) {
      result = { status: "fail", findings: [], summary: `could not run: ${e.message}`, fix: "Fix the error above and run drip_check again." };
    }
    result.durationMs = Date.now() - t0;
    checks.push({ name, reused: false, ...result });
    if (result.status !== "skipped" || result.cacheable) fresh[name] = { inputHash, at: new Date().toISOString(), result: { status: result.status, findings: result.findings, summary: result.summary, fix: result.fix, durationMs: result.durationMs } };
  };

  // 1. the project's own scripts
  const pm = pkgManager(root);
  const pkgHash = hashText(readIf(path.join(root, "package.json")) + ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"].map((f) => readIf(path.join(root, f)).length).join(","));
  // Lint, types and tests run side by side: none of them writes what another reads.
  const scripts = discoverScripts(root).filter((s) => (want(s.name) || want("scripts")) && /^[\w:.-]+$/.test(s.script));
  await Promise.all(scripts.map((s) =>
    withReceipt(s.name, hashText([pkgHash, idxHash, cfgHash, versions.node, s.script].join("|")), async () => {
      const r = await runScript(root, pm, s.script, s.timeoutMs);
      const locs = r.code ? parseLocations(r.out, root) : [];
      return {
        status: r.code === 0 ? "pass" : "fail",
        findings: locs.map((l) => ({ ...l, severity: "error", message: `${s.name} reported a problem here` })),
        summary: r.code === 0 ? `${pm} run ${s.script} passed in ${(r.ms / 1000).toFixed(1)}s` : `${pm} run ${s.script} ${r.timedOut ? `timed out after ${s.timeoutMs / 1000}s` : `failed (exit ${r.code})`}:\n${tail(r.out)}`,
        fix: r.code === 0 ? undefined : `Run \`${pm} run ${s.script}\` yourself and fix what it reports, starting with the first error.`,
      };
    }),
  ));

  // 1b. the open Drip task's evidence: fit check / critic on an older version, UI edits no hook saw. Never cached.
  if (want("drip-evidence")) {
    const t0 = Date.now();
    try {
      const task = loadState(root).task;
      const unseen = task ? reconcileWorkspace(root) : [];
      const stale = task ? evidenceStale(task) : [];
      const findings = [
        ...unseen.map((u) => ({ severity: "error", file: u.file, message: `changed outside Drip's hooks (${u.status}); not covered by a fit check` })),
        ...stale.map((m) => ({ severity: "error", message: m })),
      ];
      if (task) checks.push({
        name: "drip-evidence",
        reused: false,
        durationMs: Date.now() - t0,
        status: !task ? "skipped" : findings.length ? "fail" : "pass",
        findings,
        summary: !task ? "no open Drip task" : findings.length ? `${findings.length} problem(s) with the task's evidence` : "fit check and critic cover the current version",
        fix: findings.length ? "fitcheck_shot the changed pages, fix blockers, then fitcheck_done (and the critic on full loops)." : undefined,
      });
    } catch (e) {
      checks.push({ name: "drip-evidence", reused: false, durationMs: Date.now() - t0, status: "skipped", findings: [], summary: `could not read the task: ${e.message}` });
    }
  }

  // 2. Drip's fit-check lint on the UI files
  if (want("fitcheck-lint")) {
    const indexed = Object.keys(index.files).filter((r) => UI_RE.test(r) && !index.files[r].facts.isTest && !index.files[r].facts.isStory && (!scope || scope.has(r)));
    // Files the component index doesn't cover (a root index.html, plain .html pages) are UI too.
    const ui = [...new Set([...indexed, ...lintableUiFiles(root).filter((r) => UI_RE.test(r) && !(r in index.files) && (!scope || scope.has(r)))])];
    const slopHash = hashText(readIf(path.join(dataDir, "slop.json")) + readIf(path.join(projectDripDir(root), "slop.json")));
    const designHash = hashText(["DESIGN.md", "design.md"].map((f) => readIf(path.join(root, f))).join(""));
    const hash = hashText([ui.map((r) => `${r}:${snapshot[r]}`).join(","), slopHash, designHash, assets, cfgHash].join("|"));
    await withReceipt("fitcheck-lint", hash, async () => {
      if (!ui.length) return { status: "skipped", findings: [], summary: scope ? "no UI files changed since the last check" : "no UI files in the project", cacheable: true };
      if (cfg.modules?.fitcheck === false) return { status: "skipped", findings: [], summary: "the fitcheck module is turned off in .drip/config.json" };
      // The same rules fitcheck_lint applies. Called directly, not through the tool registry: the registry imports this
      // module through the components tools, and that import cycle breaks the esbuild bundle.
      const issues = lintFiles(ui.slice(0, 300).map((f) => path.join(root, f)), root);
      const findings = issues.map((i) => ({ severity: i.severity, file: relPath(root, i.file), line: i.line, rule: i.id, message: i.message, fix: i.fix }));
      const errors = findings.filter((f) => f.severity === "error").length;
      return { status: errors ? "fail" : findings.some((f) => f.severity === "warn") ? "warn" : "pass", findings: findings.slice(0, 40), summary: `${ui.length} UI file(s): ${errors} error(s), ${findings.length - errors} other finding(s)`, fix: findings.length ? "Fix each finding at its file:line (the fix is listed), then run drip_check again." : undefined };
    });
  }

  // 3. the component reuse audit (+ the judge on duplicate pairs)
  if (want("components-audit")) {
    const judge = detectJudge(chk.dryLint || {});
    const hash = hashText([idxHash, assets, cfgHash, AUDIT_VERSION, judge.label, judge.model, readIf(path.join(projectDripDir(root), "check", "exceptions.json"))].join("|"));
    await withReceipt("components-audit", hash, async () => {
      const { findings, stats } = auditIndex(index, { root, changed: scope });
      const notes = [];
      const dups = findings.filter((f) => f.kind.startsWith("duplicate-") && f.files.length >= 2 && f.files[0].end);
      if (dups.length && judge.judge !== "none" && chk.dryLint?.judgeAudit !== false) {
        const j = await judgePairs(root, dups.map((d) => ({ a: d.files[0], b: d.files[1] })), judge, { maxCalls: chk.dryLint?.maxJudgeCalls ?? 8 });
        dups.forEach((d, i) => {
          const v = j.verdicts.get(i);
          if (!v) return;
          d.verdict = v;
          if (v.label === "separate" && v.score >= 0.6) d.severity = "low";
          d.message += ` Judge (${v.judge}${v.cached ? ", cached" : ""}): ${v.label} ${v.score}: ${v.why}`;
        });
        if (j.failed.length) notes.push(`${j.failed.length} pair(s) could not be judged (${j.failed[0]})`);
        if (j.skipped) notes.push(`${j.skipped} more pair(s) not judged this run (limit ${chk.dryLint?.maxJudgeCalls ?? 8})`);
      } else if (dups.length && judge.judge === "none") notes.push(`not judged: ${judge.reason || "no judge"}; read the pairs yourself or have the critic review them`);
      const high = findings.filter((f) => f.severity === "high").length;
      const out = findings.map((f) => ({ file: f.files[0].file, line: f.files[0].line, severity: f.severity === "high" ? (isStrict ? "error" : "warn") : f.severity === "medium" ? "warn" : "info", message: `${f.kind}: ${f.message}${f.files.length > 1 ? ` (also ${f.files.slice(1, 4).map((x) => `${x.file}:${x.line}`).join(", ")})` : ""}`, fix: `${f.fix} Reuse: ${f.reuse}` }));
      return {
        status: isStrict && high ? "fail" : findings.length ? "warn" : "pass",
        findings: out.slice(0, 40),
        summary: `${findings.length} finding(s) (${high} high) over ${Object.keys(index.files).length} files, ${stats.units} units${scope ? ", changed files only" : ""}${notes.length ? `; ${notes.join("; ")}` : ""}`,
        fix: findings.length ? "Reuse the named component or token, or record an exception in .drip/check/exceptions.json if the similarity is not a real duplicate." : undefined,
      };
    });
  }

  // 4. dry-lint (optional, warn-only)
  if (want("dry-lint") && chk.dryLint?.enabled !== false) {
    const judge = detectJudge(chk.dryLint || {});
    const inputs = await dryLintInputs(root);
    const hash = hashText([inputs.files.map((f) => `${f}:${hashText(readIf(path.join(root, f)))}`).join(","), judge.label, judge.model, chk.dryLint?.limit, chk.dryLint?.python, readIf(path.join(projectDripDir(root), "check", "dry-baseline.json"))].join("|"));
    await withReceipt("dry-lint", hash, async () => {
      const r = await runDryLint(root, chk.dryLint || {}, { judge });
      if (r.status === "skipped") return { status: "skipped", findings: [], summary: `dry-lint skipped: ${r.reason}` };
      const list = [...r.findings, ...r.candidates];
      return {
        status: r.findings.some((f) => f.severity === "warn" && (!f.verdict || f.verdict.label !== "separate")) || r.candidates.length ? "warn" : "pass",
        findings: list.map((f) => ({ file: f.files[0]?.file, line: f.files[0]?.line, severity: f.severity === "warn" ? "warn" : "info", message: f.message })),
        summary: `dry-lint (${r.judge}, ${(r.durationMs / 1000).toFixed(1)}s): ${r.findings.length} judged pair(s), ${r.candidates.length} candidate(s) listed${r.judgeError ? `. ${r.judgeError}` : ""}. It reads git-tracked ${DRY_LINT_EXTS.source.replace(/[\\$()]/g, "")} files only; untracked files are covered by components-audit.`,
        fix: list.length ? "Review each pair: if it is one concept, reuse one of them; if not, run drip_check with an exception or record it in .drip/check/dry-baseline.json." : undefined,
      };
    });
  }

  updateJson(
    receiptsFile(root),
    (doc) => {
      doc.receipts = { ...(doc.receipts || {}), ...fresh };
      doc.snapshot = snapshot;
      doc.versions = versions;
    },
    { init: { receipts: {}, snapshot: {} } },
  );
  const failed = checks.filter((c) => c.status === "fail");
  return { root, exitCode: failed.length ? 1 : 0, ok: !failed.length, checks, changedFiles: changedFiles.length, scope: scope ? scope.size : null, indexHash: idxHash };
}

export function formatCheck(r) {
  const icon = { pass: "PASS", warn: "WARN", fail: "FAIL", skipped: "SKIP" };
  const lines = [];
  for (const c of r.checks) {
    lines.push(`${icon[c.status]} ${c.name} (${c.reused ? "reused" : `${((c.durationMs || 0) / 1000).toFixed(1)}s`}): ${c.summary}`);
    for (const f of (c.findings || []).slice(0, 6)) lines.push(`    ${f.file ? `${f.file}:${f.line ?? 1} ` : ""}${f.severity ? `[${f.severity}] ` : ""}${f.message}${f.fix ? `\n      fix: ${f.fix}` : ""}`);
    if ((c.findings || []).length > 6) lines.push(`    ... ${c.findings.length - 6} more (drip_check with only: ["${c.name}"] and the CLI's --json list them all)`);
    if (c.fix && c.status === "fail") lines.push(`    next: ${c.fix}`);
  }
  lines.push(`Exit code ${r.exitCode}: ${r.ok ? "no check failed" : "a check failed"}. Warnings do not fail the run.`);
  return lines.join("\n");
}

// ---- evidence for the workflow (the coordinator wires these into drip_start, missingBeforeUi, fitcheck_done, drip_end) ----
const evidenceFile = (root) => path.join(projectDripDir(root), "index", "evidence.json");

/** Record that a component tool ran for the active task. kind: search | plan | audit | preview. */
export function recordComponentEvidence(taskId, kind, data = {}, root = projectDir()) {
  if (!taskId) return;
  updateJson(
    evidenceFile(root),
    (doc) => {
      const t = ((doc.tasks ||= {})[taskId] ||= { search: [], plan: [], audit: [], preview: [] });
      t[kind] = [...(t[kind] || []), { at: new Date().toISOString(), ...data }].slice(-20);
      const ids = Object.keys(doc.tasks);
      if (ids.length > 40) for (const id of ids.slice(0, ids.length - 40)) delete doc.tasks[id];
    },
    { init: { tasks: {} } },
  );
  // Mirror a small summary into the task so the gates (and the hooks, which only read state.json) see it.
  try {
    updateState((st) => {
      if (st.task?.id !== taskId) return;
      const c = (st.task.components ||= {});
      c[kind] = (c[kind] || 0) + 1;
      if (kind === "audit") c.auditHigh = data.high ?? null;
    }, root);
  } catch {
    /* evidence is advisory; never fail the tool over it */
  }
}

/**
 * What the active task did with the project's own components, for the gates:
 *   { searched, searches, planned, audited, auditHigh, auditTotal, auditStale, previews }
 * auditStale: the code changed after the last audit (the index hash moved). Refreshes the index first
 * (incremental, milliseconds when nothing changed); writes nothing else. Safe to call from a hook.
 */
export function componentEvidence(task, root = projectDir()) {
  const t = readJson(evidenceFile(root), { tasks: {} }).tasks?.[task?.id] || {};
  const cur = indexProject({ root }).index; // incremental: a few milliseconds when nothing changed
  const now = indexHash(cur);
  const last = (t.audit || []).slice(-1)[0];
  return {
    searched: (t.search || []).length,
    searches: (t.search || []).map((s) => s.query),
    planned: (t.plan || []).length > 0,
    audited: !!last,
    auditHigh: last?.high ?? null,
    auditTotal: last?.total ?? null,
    auditStale: !!last && last.indexHash !== now,
    previews: (t.preview || []).length,
    indexedAt: cur?.indexedAt || null,
  };
}

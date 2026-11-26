// The project's own components: index, find, plan, preview, audit, save, and drip_check.
// (components_find / components_get / ... in index.mjs search the outside world; these look at THIS project first.)
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { STEP, captureStates } from "../../core/cdp.mjs";
import { formatCheck, recordComponentEvidence, runCheck } from "../../core/check.mjs";
import { contactSheet, imageBlock, textBlock } from "../../core/images.mjs";
import { graphOf, indexHash, indexProject } from "../../core/indexer/index.mjs";
import { readJson, updateJson } from "../../core/jsonstore.mjs";
import { ensureDir, projectDir, projectDripDir } from "../../core/paths.mjs";
import { renderHtml, stamp } from "../../core/render.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { serveDir, toUrl } from "../../core/serve.mjs";
import { loadState } from "../../core/state.mjs";
import { auditIndex, formatFinding } from "./audit.mjs";
import { detectJudge, judgePairs } from "./drylint.mjs";
import { relPath, slug as slugOf } from "../../core/util.mjs";

const rel = (p) => relPath(projectDir(), p);
const slug = (s) => slugOf(s || "component", { fallback: "component" });
const taskId = () => loadState().task?.id;
const words = (s) => String(s || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
const GENERIC = new Set(["card", "cards", "tile", "tiles", "item", "items", "list", "block", "section", "wrapper", "container", "box", "panel", "view", "group", "row", "button"]);
const STOP = new Set(["the", "and", "for", "with", "that", "this", "component", "components", "ui", "new", "need", "needs", "a", "an", "of", "to", "in", "on"]);

const patternsFile = () => path.join(projectDripDir(), "patterns", "index.json");
const approvedPatterns = () => (readJson(patternsFile(), { patterns: [] }).patterns || []).filter((p) => p.status === "approved");

function currentIndex(opts = {}) {
  const r = indexProject(opts);
  return r;
}

/** Score a component against query words: name matches count most, then variants/props/path. */
function scoreComponent(c, qWords) {
  const name = words(c.name);
  const path_ = words(c.file);
  const props = (c.props || []).flatMap((p) => words(p.name));
  const vals = [...Object.values(c.variants || {}).flat(), ...Object.values(c.propUnions || {}).flat(), ...Object.keys(c.variants || {})].flatMap(words);
  let s = 0;
  // Words every component name has ("card", "list") say little: they count for less unless they are all there is.
  const onlyGeneric = qWords.every((w) => GENERIC.has(w));
  for (const w of qWords) {
    const k = GENERIC.has(w) && !onlyGeneric ? 0.3 : 1;
    if (name.includes(w)) s += 5 * k;
    else if (name.some((n) => n.startsWith(w) || w.startsWith(n))) s += 3 * k;
    if (path_.includes(w)) s += 1.5;
    if (props.includes(w)) s += 1.5;
    if (vals.includes(w)) s += 2;
  }
  if (qWords.length && qWords.every((w) => name.includes(w))) s += 4;
  return s;
}

function describe(c) {
  const variants = Object.entries(c.variants || {}).map(([g, v]) => `${g}(${v.join("|")})`);
  const unions = Object.entries(c.propUnions || {}).filter(([k]) => !(c.variants || {})[k]).map(([g, v]) => `${g}(${v.join("|")})`);
  const props = (c.props || []).map((p) => `${p.name}${p.optional ? "?" : ""}`);
  return `${c.name} · ${c.file}:${c.line} · used ${c.usageCount}x${c.usedBy?.length ? ` in ${c.usedBy.slice(0, 3).join(", ")}${c.usedBy.length > 3 ? ", ..." : ""}` : ""}${variants.length ? ` · variants ${variants.join(" ")}` : ""}${unions.length ? ` · options ${unions.join(" ")}` : ""}${props.length ? ` · props ${props.slice(0, 10).join(", ")}${props.length > 10 ? ", ..." : ""}` : ""}${c.tokens?.length ? ` · tokens ${c.tokens.slice(0, 4).join(", ")}` : ""} · story ${c.stories.length ? "yes" : "no"} · test ${c.tests.length ? "yes" : "no"}${c.exported ? "" : " · not exported"}`;
}

const PRIMITIVE = /\b(dialog|modal|drawer|sheet|menu|dropdown|select|combobox|autocomplete|tooltip|popover|tabs?|accordion|collapsible|date ?picker|calendar|toast|slider|switch|checkbox|radio|toggle|command palette|carousel)\b/i;
const CARDISH = /\b(cards?|tiles?|grid|bento|feature list|features?)\b/i;

export function register(server, ctx) {
  server.registerTool(
    "components_index",
    {
      title: "Index this project's components",
      description:
        "Builds or refreshes the index of the project's own components in .drip/index/components.json: exports, props, variants (cva / tailwind-variants / prop unions), who uses each, tokens used, stories and tests, across .tsx .jsx .ts .js .mjs .vue .svelte .astro .css .scss. " +
        "Incremental (only changed files are parsed) and includes untracked files; node_modules, build output and secrets are skipped, .gitignore is honoured and git's index is never touched. The other components_* tools refresh it themselves; call this to see what changed. " +
        "Example: components_index({ changed: true })",
      inputSchema: { changed: z.boolean().optional().describe("List only the files that changed since the last run"), full: z.boolean().optional().describe("Re-parse everything") },
    },
    safe(async ({ changed = false, full = false }) => {
      const r = currentIndex({ full });
      const g = graphOf(r.index);
      const s = r.stats;
      const comps = g.components.filter((c) => c.exported);
      const lines = [`Indexed ${s.files} files in ${s.ms} ms (${s.reused} reused from cache, ${s.added} new, ${s.reparsed} changed, ${s.removed} removed). ${comps.length} exported components, ${g.components.length - comps.length} local, ${Object.keys(g.tokensDefined).length} design tokens.`];
      if (changed) lines.push(r.changed.length ? `Changed: ${r.changed.slice(0, 30).join(", ")}${r.changed.length > 30 ? ` ... (${r.changed.length})` : ""}` : "Nothing changed since the last run.");
      else lines.push("Most used: " + (comps.sort((a, b) => b.usageCount - a.usageCount).slice(0, 8).map((c) => `${c.name} (${c.usageCount}x)`).join(", ") || "none") + ".");
      lines.push("Search it: components_local_find({ query: \"pricing card\" }) before building anything new.");
      return text(lines.join("\n"));
    }),
  );

  server.registerTool(
    "components_local_find",
    {
      title: "Find a component in this project first",
      description:
        "Searches the project's OWN components (and approved patterns in .drip/patterns/) before you build or install anything: name, props, variants, usage count, file:line, tokens, story and test. Words match names first, then variants, props and paths. " +
        "Call it for every component you are about to write. If one fits, reuse or extend it; say why when you build a new one. Refreshes the index first. " +
        'Example: components_local_find({ query: "pricing card" })',
      inputSchema: { query: z.string(), limit: z.number().int().min(1).max(30).optional(), includeLocal: z.boolean().optional().describe("Also list components that are not exported") },
    },
    safe(async ({ query, limit = 8, includeLocal = false }) => {
      const r = currentIndex();
      const g = graphOf(r.index);
      const q = words(query).filter((w) => !STOP.has(w));
      if (!q.length) return text("Give some words describing the component: components_local_find({ query: \"modal dialog\" }).", true);
      const ranked = g.components
        .filter((c) => includeLocal || c.exported)
        .map((c) => ({ c, s: scoreComponent(c, q) + Math.min(1.5, Math.log2(1 + c.usageCount) * 0.4) * (scoreComponent(c, q) > 0 ? 1 : 0) }))
        .filter((x) => x.s >= 3)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      const pats = approvedPatterns()
        .filter((p) => q.some((w) => words(`${p.id} ${p.name} ${(p.tags || []).join(" ")}`).includes(w)))
        .slice(0, 5);
      recordComponentEvidence(taskId(), "search", { query, hits: ranked.length + pats.length, indexHash: indexHash(r.index) });
      const out = [];
      if (ranked.length) out.push(`In this project (${g.components.filter((c) => c.exported).length} exported components):\n${ranked.map(({ c }, i) => `${i + 1}. ${describe(c)}`).join("\n")}`);
      if (pats.length) out.push(`Approved patterns (.drip/patterns/):\n${pats.map((p) => `- ${p.id} (${p.kind}) ${p.name}${p.files?.length ? ` · ${p.files.join(", ")}` : ""}${p.spec ? ` · spec ${p.spec}` : ""}`).join("\n")}`);
      if (!out.length) out.push(`Nothing in this project matches "${query}" (${g.components.length} components indexed). Check the primitives you already depend on, then components_find for a library component; build new only if neither fits.`);
      else out.push("Reuse before you build: read the file, use its variants and props, extend it if it is close. If you still need a new one, say what the existing ones lack.");
      return text(out.join("\n\n"));
    }),
  );

  server.registerTool(
    "components_plan",
    {
      title: "Plan a page as sections, product components and primitives",
      description:
        "Checks a page plan against what the project already has. You give the page and its sections, each with the components it needs; it answers per component: REUSE (the project already has it: file, variants), SIMILAR (extend this one), or NEW, and which accessible primitive to start a new interactive one from. " +
        "It warns about a page that is a grid of generic cards, and about abstraction nobody needs (a new component used once). Plan the creative composition first (hero moment, rhythm, a signature section), then call this with it. " +
        'Example: components_plan({ page: "pricing page", sections: [{ name: "Hero", components: [{ name: "PricingHero" }] }, { name: "Plans", components: [{ name: "PricingCard", need: "plan card with price, features, CTA", usedIn: 3 }, { name: "BillingToggle", need: "monthly yearly switch" }] }] })',
      inputSchema: {
        page: z.string(),
        sections: z
          .array(
            z.object({
              name: z.string(),
              purpose: z.string().optional(),
              components: z.array(z.object({ name: z.string(), need: z.string().optional().describe("What it must do, in words"), level: z.enum(["product", "primitive"]).optional(), usedIn: z.number().int().optional().describe("How many places will use it (default 1)") })).min(1),
            }),
          )
          .min(1)
          .max(14),
      },
    },
    safe(async ({ page, sections }) => {
      const r = currentIndex();
      const g = graphOf(r.index);
      const pats = approvedPatterns();
      const warnings = [];
      const lines = [`Plan for ${page}`];
      let cardish = 0;
      const newOnce = [];
      let reuse = 0;
      let fresh = 0;
      sections.forEach((s, i) => {
        lines.push(`${i + 1}. ${s.name}${s.purpose ? ` — ${s.purpose}` : ""}`);
        let sectionCards = 0;
        for (const c of s.components) {
          const q = [...new Set(words(`${c.name} ${c.need || ""}`).filter((w) => !STOP.has(w)))];
          const best = g.components.filter((x) => x.exported).map((x) => ({ x, s: scoreComponent(x, q) })).sort((a, b) => b.s - a.s)[0];
          const exact = g.components.find((x) => x.exported && x.name.toLowerCase() === c.name.toLowerCase());
          const pat = pats.find((p) => words(`${p.id} ${p.name}`).some((w) => q.includes(w)) && q.length && words(`${p.id} ${p.name}`).filter((w) => q.includes(w)).length >= Math.min(2, q.length));
          const level = c.level || (PRIMITIVE.test(`${c.name} ${c.need || ""}`) ? "primitive" : "product");
          let verdict;
          if (exact || (best && best.s >= 9)) {
            const x = exact || best.x;
            verdict = `REUSE ${x.name} (${x.file}:${x.line}, used ${x.usageCount}x${Object.keys(x.variants || {}).length ? `, variants ${Object.entries(x.variants).map(([k, v]) => `${k}(${v.join("|")})`).join(" ")}` : ""})`;
            reuse++;
          } else if (pat) {
            verdict = `REUSE approved pattern ${pat.id}${pat.files?.length ? ` (${pat.files[0]})` : ""}`;
            reuse++;
          } else if (best && best.s >= 7) {
            verdict = `SIMILAR ${best.x.name} (${best.x.file}:${best.x.line}): extend it with a variant or prop if it is close, else NEW`;
            fresh++;
          } else {
            verdict = "NEW";
            fresh++;
            if (PRIMITIVE.test(`${c.name} ${c.need || ""}`)) verdict += `: behaviour from an accessible primitive (components_find "${(c.need || c.name).slice(0, 40)}"), never hand-rolled`;
            if ((c.usedIn ?? 1) <= 1 && level === "product" && !PRIMITIVE.test(`${c.name} ${c.need || ""}`)) newOnce.push(c.name);
          }
          if (CARDISH.test(`${c.name} ${c.need || ""}`)) sectionCards++;
          lines.push(`   - ${level}: ${c.name}${c.need ? ` (${c.need})` : ""} -> ${verdict}`);
        }
        if (sectionCards || CARDISH.test(`${s.name} ${s.purpose || ""}`)) cardish++;
      });
      if (sections.length >= 3 && cardish >= Math.ceil(sections.length * 0.5) && cardish >= 3) warnings.push(`${cardish} of ${sections.length} sections are cards, tiles or a grid. That reads as a template. Give at least one section a different form (a full-bleed statement, a timeline, a table, an annotated screenshot, a quote wall) and let the page have one signature moment.`);
      const sameName = new Set();
      for (const s of sections) for (const c of s.components) if (/card|tile/i.test(c.name)) sameName.add(c.name.replace(/\d+$/, ""));
      if (sameName.size >= 3) warnings.push(`${sameName.size} different card components (${[...sameName].slice(0, 4).join(", ")}). Check they are not one component with variants (components_audit finds near-duplicates).`);
      if (newOnce.length) warnings.push(`New components used once: ${newOnce.join(", ")}. Build them inline in their section; extract a component when a second use appears (do not abstract before there is something to reuse).`);
      if (sections.length >= 6 && !sections.some((s) => /hero|header|intro|opening/i.test(s.name))) warnings.push("No hero or opening section named: the first screen is the one decision that shapes the rest.");
      recordComponentEvidence(taskId(), "plan", { page, sections: sections.length, reuse, new: fresh });
      lines.push("", `${reuse} reused, ${fresh} new or extended.`);
      if (warnings.length) lines.push("Warnings:", ...warnings.map((w) => `- ${w}`));
      lines.push("Next: build the primitives and product components, components_preview each, then compose the page and fitcheck_shot it.");
      return text(lines.join("\n"));
    }),
  );

  server.registerTool(
    "components_preview",
    {
      title: "Preview a component on its own",
      description:
        "Renders one component in isolation with real content: sizes (375 / 768 / 1440), the states you give (hover, focus, open...) by real input, and a keyboard walk (Tab through it). " +
        "React / Vue / Svelte: Drip does not run your build, so it uses YOUR Storybook or Ladle: pass `url` (a story URL such as http://localhost:6006/iframe.html?id=ui-button--primary) or `component` and Drip finds the story in a running Storybook. " +
        "Plain HTML/CSS/JS: pass html (+ css, js) and Drip builds a test page, with stress cells: normal, narrow container, long text, RTL, dark ground and your own content variants. Saves the sheets in .drip/index/previews/. " +
        'Example: components_preview({ html: "<button class=btn>Buy</button>", css: ".btn{padding:12px 20px}", variants: [{ label: "long label", html: "<button class=btn>Buy the annual plan today</button>" }], states: [{ do: "hover", selector: ".btn", label: "hover" }] })',
      inputSchema: {
        url: z.string().optional().describe("A story or page URL (Storybook iframe.html?id=..., Ladle ?story=..., your dev server)"),
        component: z.string().optional().describe("A component name: finds its story in a running Storybook"),
        html: z.string().optional(),
        css: z.string().optional(),
        js: z.string().optional(),
        variants: z.array(z.object({ label: z.string(), html: z.string() })).max(6).optional().describe("Realistic content variants for the stress sheet"),
        selector: z.string().optional(),
        states: z.array(STEP).max(8).optional(),
        sizes: z.array(z.number().int().min(280).max(2560)).max(4).optional(),
        keyboard: z.boolean().optional().describe("Tab through the component and shoot each stop (default true)"),
      },
    },
    safe(async ({ url, component, html, css = "", js = "", variants = [], selector, states = [], sizes = [375, 768, 1440], keyboard = true }) => {
      const config = ctx.config();
      const root = projectDir();
      let target = url;
      const notes = [];
      if (!target && component) {
        const found = await findStory(root, component);
        notes.push(found.note);
        target = found.url;
      }
      let sheetPath;
      if (!target && html === undefined) {
        const f = detectStorybook(root);
        return text(`Give me something to render: html (plain HTML/CSS/JS), a story \`url\`, or a \`component\` name.\n${f.note}`, true);
      }
      const tiles = [];
      const legend = [];
      let page;
      if (html !== undefined) {
        const dir = ensureDir(path.join(projectDripDir(), "cache", `components-preview-${stamp()}`));
        const doc = (body, extra = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:24px;font-family:system-ui,sans-serif}${css}${extra}</style></head><body>${body}${js ? `<script>${js}</script>` : ""}</body></html>`;
        fs.writeFileSync(path.join(dir, "index.html"), doc(html));
        page = `${await serveDir(dir)}/index.html`;
        // stress sheet: the same markup under hard conditions
        const cell = (label, inner, style = "") => `<section style="border:1px dashed #9a9a9a;padding:12px;${style}"><small style="display:block;font:11px system-ui;color:#666;margin-bottom:8px">${label}</small>${inner}</section>`;
        const long = html.replace(/>([^<>]{2,40})</g, (m, t) => `>${t} ${t} ${t}<`);
        const cells = [cell("default", html), cell("narrow container (240px)", html, "width:240px"), cell("long text", long, "max-width:420px"), cell("RTL", `<div dir="rtl">${html}</div>`), cell("dark ground", html, "background:#14161a;color:#f2f2f2;--dark:1"), cell("zoom 200%", html, "zoom:2;max-width:200px"), ...variants.map((v) => cell(v.label, v.html))];
        const stress = doc(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start">${cells.join("")}</div>`, "body{background:#fff}");
        sheetPath = path.join(ensureDir(path.join(projectDripDir(), "index", "previews")), `stress-${stamp()}.jpg`);
        const stressBuf = await renderHtml(stress, sheetPath, { width: 1200, height: 900, format: "jpeg", quality: 82, config });
        tiles.push({ buf: stressBuf, big: true });
        legend.push("stress sheet: default, narrow, long text, RTL, dark, zoom 200%" + (variants.length ? `, ${variants.map((v) => v.label).join(", ")}` : ""));
      } else page = /^https?:/i.test(target) ? target : await toUrl(target);
      const steps = [...states];
      if (keyboard) for (let i = 1; i <= 4; i++) steps.push({ do: "key", text: "Tab", label: `Tab ${i}` });
      const runs = await Promise.all(sizes.map((w) => captureStates(page, [{ do: "wait", ms: 100, label: `${w}px` }, ...(w === sizes[sizes.length - 1] || w === sizes[0] ? steps : [])], { width: w, height: 700, config })));
      runs.forEach((states_, i) => {
        for (const s of states_) {
          tiles.push({ buf: s.buf });
          legend.push(`${sizes[i]}px · ${s.label}${s.error ? ` (FAILED: ${s.error})` : ""}`);
        }
      });
      const sheet = await contactSheet(tiles.map((t) => t.buf), { cols: 4, tileW: 340, tileH: 260, fit: "contain" });
      const out = path.join(ensureDir(path.join(projectDripDir(), "index", "previews")), `${slug(component || selector || "preview")}-${stamp()}.jpg`);
      fs.writeFileSync(out, sheet);
      recordComponentEvidence(taskId(), "preview", { name: component || selector || "preview", sheet: rel(out) });
      return blocks([
        textBlock(`Rendered ${page}\n${legend.map((l, i) => `${i + 1}. ${l}`).join("\n")}\nSheet: ${rel(out)}${sheetPath ? ` · stress sheet: ${rel(sheetPath)}` : ""}\n${notes.filter(Boolean).join("\n")}\nLook for: text that overflows or wraps badly, a missing focus ring at each Tab stop, states that change nothing, content that breaks the narrow or RTL cell. Then compose the page and fitcheck_shot it.`),
        imageBlock(sheet),
      ]);
    }),
  );

  server.registerTool(
    "components_audit",
    {
      title: "Audit components for duplication, token drift and odd boundaries",
      description:
        "Reads the component index (including untracked files) and reports, with file:line for every side and a reuse candidate: near-duplicate components and helpers (token shingles: renamed copies still match), repeated CSS blocks, raw colours / radii / shadows that equal or nearly equal a design token, same-named components in several files, import cycles and primitives that depend on product code. " +
        "No file-length rules. Thin wrappers that pass one prop to a shared component, and pairs you recorded in .drip/check/exceptions.json, are not flagged. When a local AI CLI is on PATH (claude or codex, see check.dryLint in .drip/config.json) duplicate pairs are judged and the verdict is cached. " +
        "Example: components_audit({ changed: true })",
      inputSchema: {
        changed: z.boolean().optional().describe("Only findings that touch files changed since the last drip_check"),
        judge: z.boolean().optional().describe("Judge duplicate pairs with the local AI CLI when there is one (default true)"),
        limit: z.number().int().min(1).max(60).optional(),
      },
    },
    safe(async ({ changed = false, judge = true, limit = 20 }) => {
      const root = projectDir();
      const r = currentIndex();
      let scope = null;
      if (changed) {
        const snap = readJson(path.join(projectDripDir(root), "check", "receipts.json"), {}).snapshot;
        scope = snap && Object.keys(snap).length ? new Set(Object.keys(r.index.files).filter((f) => snap[f] !== r.index.files[f].hash)) : null;
      }
      const { findings, stats } = auditIndex(r.index, { root, changed: scope });
      const cfg = ctx.config().check?.dryLint || {};
      const j = detectJudge(cfg);
      const notes = [];
      const dups = findings.filter((f) => f.kind.startsWith("duplicate-") && f.files.length >= 2 && f.files[0].end);
      if (judge && dups.length && j.judge !== "none") {
        const res = await judgePairs(root, dups.map((d) => ({ a: d.files[0], b: d.files[1] })), j, { maxCalls: cfg.maxJudgeCalls ?? 8 });
        dups.forEach((d, i) => {
          const v = res.verdicts.get(i);
          if (!v) return;
          d.message += ` Judge (${v.judge}${v.cached ? ", cached" : ""}): ${v.label} ${v.score}: ${v.why}`;
          if (v.label === "separate" && v.score >= 0.6) d.severity = "low";
        });
        notes.push(`Judge ${j.label}: ${res.calls} asked, ${res.cached} cached${res.failed.length ? `, ${res.failed.length} failed (${res.failed[0]})` : ""}.`);
      } else if (dups.length) notes.push(`Duplicate pairs are not judged (${judge ? j.reason || "no judge" : "judge: false"}): read them yourself, or give them to the critic.`);
      const high = findings.filter((f) => f.severity === "high").length;
      recordComponentEvidence(taskId(), "audit", { high, total: findings.length, indexHash: indexHash(r.index) });
      const shown = findings.slice(0, limit);
      return text(
        `Audited ${Object.keys(r.index.files).length} files (${stats.units} units, ${stats.cssBlocks} CSS blocks, ${stats.tokens} tokens) in ${stats.ms + r.stats.ms} ms${scope ? ", changed files only" : ""}: ${findings.length} finding(s), ${high} high.\n` +
          (shown.length ? shown.map((f) => formatFinding(f, root)).join("\n") : "Nothing to report.") +
          (findings.length > limit ? `\n... ${findings.length - limit} more (raise limit)` : "") +
          (notes.length ? `\n${notes.join("\n")}` : "") +
          "\nSimilar is not always the same: variants of one component and genuinely different concepts are fine. To record that on purpose, add { \"audit\": [{ \"kind\": \"...\", \"files\": [\"path\"], \"reason\": \"...\" }] } to .drip/check/exceptions.json.",
      );
    }),
  );

  server.registerTool(
    "components_save",
    {
      title: "Save an approved component into the project's design memory",
      description:
        "Records a component you built (its file, spec read from the index: props, variants, usage, tokens, story, test; and the previews) as a `component` entry in .drip/patterns/ so later tasks find it with components_local_find and reuse it. Status 'proposed' until the user accepts it, then 'approved'. " +
        'Example: components_save({ name: "Pricing card", file: "src/components/pricing-card.tsx", status: "proposed", tags: ["pricing"] })',
      inputSchema: {
        name: z.string(),
        file: z.string().describe("Project path of the component file"),
        status: z.enum(["proposed", "approved"]).optional().describe("Approved only after the user said yes"),
        previews: z.array(z.string()).optional().describe("Image paths (default: the latest components_preview sheet)"),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    safe(async ({ name, file, status = "proposed", previews, notes, tags = [] }) => {
      const root = projectDir();
      const abs = path.resolve(root, file);
      if (!fs.existsSync(abs)) return text(`No file ${file}.`, true);
      const relFile = rel(abs);
      const r = currentIndex();
      const g = graphOf(r.index);
      const comps = g.components.filter((c) => c.file === relFile);
      if (!comps.length) return text(`${relFile} has no component the indexer recognised (it looks for PascalCase functions or consts that return JSX, and .vue/.svelte/.astro files). Save it anyway with pattern_save, or check the file.`, true);
      const comp = comps.find((c) => c.name.toLowerCase() === name.replace(/\s+/g, "").toLowerCase()) || comps.find((c) => c.exported) || comps[0];
      const id = slug(name);
      const dir = ensureDir(path.join(projectDripDir(root), "patterns", id));
      const keep = [];
      let prev = previews;
      if (!prev?.length) {
        const dirP = path.join(projectDripDir(root), "index", "previews");
        const latest = fs.existsSync(dirP) ? fs.readdirSync(dirP).filter((f) => f.startsWith(slug(name)) && f.endsWith(".jpg")).sort().slice(-1) : [];
        prev = latest.map((f) => path.join(dirP, f));
      }
      for (const p of prev || []) {
        const a = path.resolve(root, p);
        if (!fs.existsSync(a)) continue;
        const dest = path.join(ensureDir(path.join(dir, "previews")), path.basename(a));
        fs.copyFileSync(a, dest);
        keep.push(rel(dest));
      }
      const spec = { schema: 1, kind: "component", name, file: relFile, line: comp.line, exported: comp.exported, default: comp.default || undefined, props: comp.props, propUnions: comp.propUnions, variants: comp.variants, defaultVariants: comp.defaultVariants, extends: comp.extends, usageCount: comp.usageCount, usedBy: comp.usedBy, tokens: comp.tokens, stories: comp.stories, tests: comp.tests, notes, savedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(dir, "spec.json"), JSON.stringify(spec, null, 2));
      fs.writeFileSync(path.join(dir, "spec.md"), `# ${name}\n\n${relFile}:${comp.line}${comp.exported ? "" : " (not exported)"}\n\nProps: ${(comp.props || []).map((p) => `${p.name}${p.optional ? "?" : ""}${p.type ? `: ${p.type}` : ""}`).join(", ") || "none found"}\nVariants: ${Object.entries(comp.variants || {}).map(([k, v]) => `${k} = ${v.join(" | ")}`).join("; ") || "none"}\nOptions: ${Object.entries(comp.propUnions || {}).map(([k, v]) => `${k} = ${v.join(" | ")}`).join("; ") || "none"}\nUsed ${comp.usageCount}x${comp.usedBy?.length ? ` in ${comp.usedBy.join(", ")}` : ""}. Tokens: ${(comp.tokens || []).join(", ") || "none"}.\nStory: ${comp.stories.join(", ") || "none"}. Test: ${comp.tests.join(", ") || "none"}.\n${notes ? `\n${notes}\n` : ""}`);
      const entry = { id, name, kind: "component", files: [relFile], spec: rel(path.join(dir, "spec.json")), previews: keep, source: { file: relFile, capturedAt: spec.savedAt, savedBy: "components_save" }, status, tags, ...(notes ? { notes } : {}) };
      const idx = updateJson(
        patternsFile(),
        (doc) => {
          doc.patterns ||= [];
          const i = doc.patterns.findIndex((p) => p.id === id);
          const merged = { ...(i >= 0 ? doc.patterns[i] : {}), ...entry, files: [...new Set([...(i >= 0 ? doc.patterns[i].files || [] : []), relFile])], tags: [...new Set([...(i >= 0 ? doc.patterns[i].tags || [] : []), ...tags])], updatedAt: new Date().toISOString() };
          if (i >= 0) doc.patterns[i] = merged;
          else doc.patterns.push(merged);
        },
        { init: { patterns: [] } },
      );
      return text(`Saved ${name} as pattern ${id} (${status}): spec ${entry.spec}, ${keep.length} preview(s). Pattern index revision ${idx.revision}.${status === "proposed" ? " Ask the user to approve it, then components_save again with status: approved." : ""}`);
    }),
  );

  server.registerTool(
    "drip_check",
    {
      title: "Run the project's checks, Drip's fit-check lint and the reuse audit",
      description:
        "One command for 'is this clean?': the project's own lint / typecheck / test scripts (package.json), fitcheck_lint on the UI files, components_audit, and dry-lint when it can run (optional, warn-only). Each check returns pass / warn / fail / skipped with file:line findings and a fix hint. " +
        "Results are reused only when the check's inputs (files, tokens, assets, config, tool versions) are identical to the last run; changed: true limits it to what changed since. Warnings never fail the run; a failing script or an error-level finding does. It never replaces looking at the rendered page (fitcheck_shot, critic). " +
        'Example: drip_check({ changed: true })',
      inputSchema: {
        changed: z.boolean().optional().describe("Only what changed since the last run"),
        full: z.boolean().optional().describe("Ignore saved receipts and run everything"),
        only: z.array(z.enum(["lint", "typecheck", "test", "fitcheck-lint", "components-audit", "dry-lint"])).optional(),
        strict: z.boolean().optional().describe("Fail (not warn) on high-severity reuse findings (verified token drift, near-identical copies)"),
      },
    },
    safe(async ({ changed, full, only, strict }) => {
      const r = await runCheck({ changed, full, only, strict, config: ctx.config() });
      return text(formatCheck(r), !r.ok);
    }),
  );
}

// ---- Storybook / Ladle discovery -------------------------------------------------------------
function detectStorybook(root) {
  const pkg = readJson(path.join(root, "package.json"), {});
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const storybook = fs.existsSync(path.join(root, ".storybook")) || Object.keys(deps).some((d) => /^(@storybook\/|storybook$)/.test(d));
  const ladle = Object.keys(deps).includes("@ladle/react");
  const note = storybook ? "This project has Storybook: start it (npm run storybook) and pass a story url or a component name." : ladle ? "This project has Ladle: start it (npm run ladle serve) and pass a story url." : "No Storybook or Ladle found. For React/Vue/Svelte components, run your dev server or add Storybook, then pass `url`; plain HTML/CSS/JS can use html + css + js.";
  return { storybook, ladle, note, ports: storybook ? [6006, 6007] : ladle ? [61000] : [] };
}

async function findStory(root, component) {
  const d = detectStorybook(root);
  const rootRelFile = (graphOf(indexProject({ root }).index).components.find((c) => c.name.toLowerCase() === component.toLowerCase()) || {}).file;
  for (const port of d.ports.length ? d.ports : [6006]) {
    try {
      const res = await fetch(`http://localhost:${port}/index.json`, { signal: AbortSignal.timeout(900) });
      if (!res.ok) continue;
      const idx = await res.json();
      const entries = Object.values(idx.entries || idx.stories || {}).filter((e) => e.type !== "docs");
      const hit = entries.find((e) => (rootRelFile && String(e.importPath || "").replace(/^\.\//, "").startsWith(rootRelFile.replace(/\.[^.]+$/, ""))) || String(e.title || "").toLowerCase().endsWith(`/${component.toLowerCase()}`) || String(e.title || "").toLowerCase() === component.toLowerCase());
      if (hit) return { url: `http://localhost:${port}/iframe.html?id=${hit.id}&viewMode=story`, note: `Story ${hit.id} found in Storybook on :${port}.` };
      return { url: null, note: `Storybook on :${port} has no story for ${component}. Write one (src/…/${component}.stories.tsx) and try again.` };
    } catch {
      /* not running on this port */
    }
  }
  return { url: null, note: `No running Storybook found for ${component}. ${d.note}` };
}

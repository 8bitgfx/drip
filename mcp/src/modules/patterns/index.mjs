// Patterns: study -> extract -> implement independently -> render -> compare -> refine -> save.
// A pattern is a component, section, page, motion or style. Everything is measured in the user's own
// browser; specs, evidence and the project's reusable patterns live in <project>/.drip/patterns/.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { contactSheet, imageBlock, textBlock } from "../../core/images.mjs";
import { ensureDir, projectDir, projectDripDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { stamp } from "../../core/render.mjs";
import { diffSheet } from "./diff.mjs";
import { extractSpec } from "./extract.mjs";
import { PSTEP, SIZES, resolveTarget } from "./run.mjs";
import { compareSpecs, specToMarkdown } from "./spec.mjs";
import { KINDS, getPattern, listPatterns, patternDir, rel, saveImages, slug, upsertPattern, writeSpec } from "./store.mjs";

const TARGET = {
  url: z.string().optional().describe("A page URL (live site, your dev server, Storybook or Ladle story URL)"),
  file: z.string().optional().describe("A project path: a local .html file (served for you) or a screenshot (png/jpg/webp: the spec is then marked inferred)"),
  selector: z.string().optional().describe("CSS selector of the component. Omit for the page's main content"),
};
const STATES = z.array(PSTEP).max(12).optional().describe("Interaction steps, run in order with real input; each is measured and shot. Example: [{ do: 'hover', selector: '.item', label: 'hover' }, { do: 'click', selector: 'button', label: 'open' }, { do: 'key', text: 'Escape', label: 'closed with Escape' }]. do: click, hover, press (mouse held), release, focus, key, type, drag, scroll, wait");
const SIZE_LIST = z.array(z.number().int().min(280).max(2560)).min(1).max(4).optional().describe("Viewport widths (default 375, 768, 1440). The smallest counts as phone, the largest as desktop");

const jpegSheet = (bufs, opts = {}) => contactSheet(bufs, { cols: 4, tileW: 360, tileH: 270, fit: "contain", ...opts });
const trim = (s, n) => (s.length > n ? s.slice(0, n) + "\n... (trimmed; the full spec is in the saved file)" : s);
const stepsOf = (spec) => (spec.states || []).map((s) => ({ ...s.step, label: s.label }));

function patternPaths(id) {
  const dir = patternDir(id);
  return { dir, spec: path.join(dir, "spec.json"), md: path.join(dir, "spec.md") };
}

function writeEvidence(id, shots, widths) {
  const dir = patternDir(id);
  const files = [];
  for (const w of widths) {
    const sh = shots[w];
    if (!sh) continue;
    files.push(...saveImages(dir, "reference", [{ name: `base-${w}.png`, buf: sh.base }, ...sh.states.map((s, i) => ({ name: `state-${i + 1}-${w}.png`, buf: s.png }))]));
  }
  return files;
}

export function register(server, ctx) {
  server.registerTool(
    "refs_extract",
    {
      title: "Extract a structured spec from a page or component",
      description:
        "Measures a live page, a local .html file or a screenshot and returns a structured spec: geometry of the element and its children, computed type, colour roles, spacing, radii, shadows, hierarchy, state changes (hover / focus / open / disabled via real input), " +
        "animation timings and easing (CSS transitions, animations and getAnimations() while you interact, with sampled transforms), responsiveness at 375 / 768 / 1440, keyboard (tab order, focus ring, open / arrows / Escape) and ARIA. " +
        "A screenshot has no DOM, so its spec is labelled inferred (colours and layout bands only). Use it to learn from any publicly visible demo before building your own version, or to measure your own build. Does not save anything: pattern_study does. " +
        'Example: refs_extract({ url: "https://example.com/menu-demo", selector: "[data-demo]", states: [{ do: "click", selector: "button", label: "open" }, { do: "key", text: "Escape", label: "closed" }] })',
      inputSchema: { ...TARGET, states: STATES, sizes: SIZE_LIST },
    },
    safe(async ({ url, file, selector, states, sizes }) => {
      const target = await resolveTarget({ url, file });
      const { spec, shots } = await extractSpec(target, { selector, states, sizes, config: ctx.config() });
      const out = path.join(ensureDir(path.join(projectDripDir(), "cache")), `extract-${stamp()}.json`);
      fs.writeFileSync(out, JSON.stringify(spec, null, 2));
      const widths = Object.keys(shots).map(Number).sort((a, b) => a - b);
      const desktop = shots[widths[widths.length - 1]];
      const content = [textBlock(`${trim(specToMarkdown(spec), 7000)}\nFull spec JSON: ${out}\nNext: pattern_study (save it with evidence), or build your own version and pattern_compare it.`)];
      if (desktop) content.push(imageBlock(await jpegSheet([desktop.base, ...desktop.states.map((s) => s.png)].slice(0, 8))));
      return blocks(content);
    }),
  );

  server.registerTool(
    "pattern_study",
    {
      title: "Study a reference and keep the evidence",
      description:
        "refs_extract plus evidence: captures the component at desktop and phone and in each state, and stores the spec (spec.json + readable spec.md), the shots and the source in .drip/patterns/<id>/. " +
        "Status starts as 'proposed'. Use it on any publicly visible demo (a 21st.dev preview, a site's menu, a Dribbble shot's live page) or on your own existing component, then write an original implementation from the spec; do not copy markup or assets. " +
        'Example: pattern_study({ name: "Command menu", url: "https://example.com/demo", selector: "#demo", kind: "component", states: [{ do: "key", text: "k", label: "open" }], title: "Example demo", author: "Example Co" })',
      inputSchema: {
        name: z.string(),
        ...TARGET,
        kind: z.enum(KINDS).optional(),
        states: STATES,
        sizes: SIZE_LIST,
        tags: z.array(z.string()).optional(),
        title: z.string().optional().describe("Title of the source, for provenance"),
        author: z.string().optional().describe("Author of the source, when known"),
        notes: z.string().optional().describe("What you want from this reference (the behaviour or the principle), in your words"),
      },
    },
    safe(async ({ name, url, file, selector, kind = "component", states, sizes, tags = [], title, author, notes }) => {
      const id = slug(name);
      const target = await resolveTarget({ url, file });
      const source = { url: target.url ? url || target.url : undefined, title, author };
      const { spec, shots } = await extractSpec(target, { selector, states, sizes, config: ctx.config(), source });
      if (notes) spec.notes = notes;
      const { dir, md } = patternPaths(id);
      writeSpec(id, spec);
      fs.writeFileSync(md, specToMarkdown(spec, { name, notes }));
      const widths = Object.keys(shots).map(Number).sort((a, b) => a - b);
      const files = writeEvidence(id, shots, widths);
      if (target.kind === "screenshot") {
        const keep = path.join(dir, "reference", `source${path.extname(target.file)}`);
        ensureDir(path.dirname(keep));
        fs.copyFileSync(target.file, keep);
        files.push(keep);
      }
      upsertPattern({ id, name, kind, files: [], spec: rel(path.join(dir, "spec.json")), previews: files.map(rel), source: { ...spec.source, file: spec.source.file ? rel(spec.source.file) : undefined }, status: "proposed", tags });
      const desktop = shots[widths[widths.length - 1]];
      const phone = shots[widths[0]];
      const content = [textBlock(`Studied "${name}" as ${id}. Spec ${rel(path.join(dir, "spec.json"))}, readable ${rel(md)}, evidence in ${rel(path.join(dir, "reference"))} (${files.length} files). Status: proposed.\n\n${trim(specToMarkdown(spec, { name }), 5000)}\nNext: write your own implementation from this spec (primitives + your tokens, original styling), pattern_preview it, then pattern_compare({ id: "${id}", ... }).`)];
      const tiles = [];
      if (desktop) tiles.push(desktop.base, ...desktop.states.slice(0, 5).map((s) => s.png));
      if (phone && phone !== desktop) tiles.push(phone.base);
      if (tiles.length) content.push(imageBlock(await jpegSheet(tiles)));
      return blocks(content);
    }),
  );

  server.registerTool(
    "pattern_spec",
    {
      title: "Write or refine a pattern's spec",
      description:
        "Update the saved spec of a studied pattern: add your notes (the intent, what to keep, what to change on purpose), patch fields you corrected after looking (for example the easing you decided on), or re-measure it from a URL / file. Rewrites spec.json and spec.md with provenance kept. " +
        'Example: pattern_spec({ id: "command-menu", notes: "Keep: 140ms ease-out open, focus returns to trigger. Change: our radius is 6px.", patch: { "motion.reducedMotionRules": true } })',
      inputSchema: {
        id: z.string(),
        notes: z.string().optional(),
        patch: z.record(z.string(), z.any()).optional().describe("Dotted paths to set in the spec, e.g. { \"colors.roles.accent\": \"#e5322d\" }"),
        ...TARGET,
        states: STATES,
        sizes: SIZE_LIST,
      },
    },
    safe(async ({ id, notes, patch, url, file, selector, states, sizes }) => {
      const cur = getPattern(id);
      if (!cur) return text(`No pattern "${id}". pattern_list shows what exists; pattern_study creates one.`, true);
      let spec = cur.spec || { schema: 1 };
      if (url || file) {
        const target = await resolveTarget({ url, file });
        const r = await extractSpec(target, { selector: selector || spec.source?.selector, states: states || stepsOf(spec), sizes, config: ctx.config(), source: spec.source });
        spec = { ...r.spec, notes: spec.notes };
      }
      if (notes) spec.notes = [spec.notes, notes].filter(Boolean).join("\n");
      for (const [dotted, v] of Object.entries(patch || {})) {
        const keys = dotted.split(".");
        let o = spec;
        for (const k of keys.slice(0, -1)) o = o[k] ??= {};
        o[keys.at(-1)] = v;
      }
      writeSpec(id, spec);
      const { md } = patternPaths(id);
      fs.writeFileSync(md, specToMarkdown(spec, { name: cur.entry.name, notes: spec.notes }));
      upsertPattern({ id });
      return text(`Updated ${rel(md)} and spec.json for ${id}.`);
    }),
  );

  server.registerTool(
    "pattern_preview",
    {
      title: "Render your implementation of a pattern",
      description:
        "Renders an implementation at several sizes and in each state, so you can look at it. Give a URL (your dev server, a Storybook or Ladle story for React), a local .html file, or plain html + css + js that Drip wraps in a neutral test page. " +
        "Returns a contact sheet (sizes, then states) and saves the shots to .drip/patterns/<id>/preview/. Reuses the same state steps as the reference when you pass id and no states. " +
        'Example: pattern_preview({ id: "command-menu", html: "<div id=demo>...</div>", css: "#demo{...}", js: "...", selector: "#demo" })',
      inputSchema: {
        id: z.string().optional().describe("The pattern this implements (its reference states are reused when `states` is omitted)"),
        ...TARGET,
        html: z.string().optional().describe("A fragment for <body>; with css / js a generated test page is used"),
        css: z.string().optional(),
        js: z.string().optional(),
        states: STATES,
        sizes: SIZE_LIST,
      },
    },
    safe(async ({ id, url, file, selector, html, css, js, states, sizes }) => {
      const ref = id ? getPattern(id) : null;
      if (id && !ref) return text(`No pattern "${id}". pattern_list shows what exists.`, true);
      const outDir = ref ? ensureDir(path.join(ref.dir, "preview")) : ensureDir(path.join(projectDripDir(), "cache", `preview-${stamp()}`));
      const target = await resolveTarget({ url, file, html, css, js, dir: outDir });
      const useStates = states || (ref?.spec ? stepsOf(ref.spec) : []);
      const useSel = selector || ref?.spec?.source?.selector;
      const { spec, shots } = await extractSpec(target, { selector: useSel, states: useStates, sizes: sizes || (ref?.spec?.responsive ? Object.keys(ref.spec.responsive).map(Number) : undefined), config: ctx.config(), source: { title: "implementation" } });
      const widths = Object.keys(shots).map(Number).sort((a, b) => a - b);
      const files = [];
      for (const w of widths) files.push(...saveImages(outDir, ".", [{ name: `impl-base-${w}.png`, buf: shots[w].base }, ...shots[w].states.map((s, i) => ({ name: `impl-state-${i + 1}-${w}.png`, buf: s.png }))]));
      const specFile = path.join(outDir, "impl-spec.json");
      fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));
      const tiles = [];
      const legend = [];
      for (const w of widths) {
        tiles.push(shots[w].base);
        legend.push(`${tiles.length}. ${w}px`);
      }
      const big = shots[widths[widths.length - 1]];
      big.states.forEach((s) => {
        tiles.push(s.png);
        legend.push(`${tiles.length}. ${s.label} (${widths[widths.length - 1]}px)`);
      });
      const issues = [];
      for (const [w, r] of Object.entries(spec.responsive)) if (r.overflowX) issues.push(`horizontal overflow at ${w}px`);
      for (const s of spec.states) if (s.error) issues.push(`step "${s.label}" failed: ${s.error}`);
      for (const i of spec.aria?.issues || []) issues.push(i);
      return blocks([
        textBlock(`Rendered ${target.url}\n${legend.join("\n")}\nShots: ${rel(outDir)} · measured spec: ${rel(specFile)}\nKeyboard: ${spec.keyboard.tabStops} tab stops, focus ring on every stop: ${spec.keyboard.allFocusVisible ? "yes" : "no"}${spec.keyboard.popup ? `; opens with keyboard: ${spec.keyboard.popup.opensWithKeyboard ? "yes" : "no"}, Escape closes: ${spec.keyboard.popup.closesWithEscape ? "yes" : "no"}` : ""}\n${issues.length ? `Problems: ${issues.join("; ")}` : "No overflow, failed steps or ARIA problems measured."}${ref ? `\nNext: pattern_compare({ id: "${id}", ${url ? `url: "${url}"` : file ? `file: "${file}"` : "html: ..."} })` : ""}`),
        imageBlock(await jpegSheet(tiles)),
      ]);
    }),
  );

  server.registerTool(
    "pattern_compare",
    {
      title: "Compare your implementation with the studied reference",
      description:
        "Compares an implementation with a studied pattern: a side-by-side sheet (reference | yours | diff heatmap) for every size and state, the share of pixels that differ (pixelmatch-style YIQ metric), measured deltas between the two specs (geometry, type, colour roles, radii, spacing, motion duration and easing, states, keyboard, ARIA), " +
        "an axe-core accessibility run on your build (axe is fetched once from a pinned jsDelivr version, or read from DRIP_AXE_PATH; if neither works it says so) and keyboard checks (tab stops, focus ring, open / Escape). " +
        "Exact pixel match is the goal only for your own or licensed designs; for third-party inspiration read the deltas, not the percentage. Then refine and compare again. " +
        'Example: pattern_compare({ id: "command-menu", url: "http://localhost:6006/iframe.html?id=menu--default", selector: "#storybook-root" })',
      inputSchema: {
        id: z.string(),
        ...TARGET,
        html: z.string().optional(),
        css: z.string().optional(),
        js: z.string().optional(),
        threshold: z.number().min(0).max(1).optional().describe("YIQ colour tolerance, default 0.1 (as pixelmatch)"),
        axe: z.boolean().optional().describe("Run axe-core on the implementation (default true)"),
      },
    },
    safe(async ({ id, url, file, selector, html, css, js, threshold = 0.1, axe = true }) => {
      const ref = getPattern(id);
      if (!ref?.spec) return text(`No studied pattern "${id}". pattern_study first.`, true);
      const outDir = ensureDir(path.join(ref.dir, "preview"));
      const target = await resolveTarget({ url, file, html, css, js, dir: outDir });
      const refSpec = ref.spec;
      const widths = refSpec.responsive ? Object.keys(refSpec.responsive).map(Number) : SIZES;
      const { spec: impl, shots } = await extractSpec(target, { selector: selector || refSpec.source?.selector, states: stepsOf(refSpec), sizes: widths, config: ctx.config(), source: { title: "implementation" }, axe });
      const pairs = [];
      const readRef = (name) => {
        const f = path.join(ref.dir, "reference", name);
        return fs.existsSync(f) ? fs.readFileSync(f) : null;
      };
      for (const w of Object.keys(shots).map(Number).sort((a, b) => a - b)) {
        const r = readRef(`base-${w}.png`);
        if (r) pairs.push({ label: `${w}px · default`, ref: r, impl: shots[w].base });
        shots[w].states.forEach((s, i) => {
          const rs = readRef(`state-${i + 1}-${w}.png`);
          if (rs) pairs.push({ label: `${w}px · ${s.label}`, ref: rs, impl: s.png });
        });
      }
      let sheet = null;
      let diffs = [];
      if (pairs.length) ({ sheet, results: diffs } = await diffSheet(pairs.slice(0, 14), { threshold, config: ctx.config() }));
      const deltas = compareSpecs(refSpec, impl);
      const file0 = path.join(outDir, `compare-${stamp()}.jpg`);
      if (sheet) fs.writeFileSync(file0, sheet);
      fs.writeFileSync(path.join(outDir, "impl-spec.json"), JSON.stringify(impl, null, 2));
      const order = { high: 0, medium: 1, low: 2 };
      deltas.sort((a, b) => order[a.severity] - order[b.severity]);
      const L = [];
      L.push(`Compared ${id} with ${target.url}${refSpec.inferred ? " (reference is a screenshot: only colours and pixels can be compared)" : ""}.`);
      L.push("Pixels: " + (diffs.length ? diffs.map((d) => `${d.label} ${d.diffPct}%${d.sizeMismatch ? " (size differs)" : ""}`).join(" · ") : "no reference images to diff"));
      L.push(`Measured deltas (${deltas.length}${deltas.length > 16 ? ", first 16" : ""}):`);
      for (const d of deltas.slice(0, 16)) L.push(`- [${d.severity}] ${d.area}: ${d.what}: reference ${d.reference}, yours ${d.implementation}`);
      if (!deltas.length) L.push("- none above tolerance");
      const k = impl.keyboard;
      L.push(`Keyboard (yours): ${k.tabStops} tab stops, focus ring on every stop ${k.allFocusVisible ? "yes" : "NO"}${k.popup ? `, opens from keyboard ${k.popup.opensWithKeyboard ? "yes" : "NO"}, Escape closes ${k.popup.closesWithEscape ? "yes" : "NO"}` : ""}.`);
      if (!axe) L.push("axe: skipped (axe: false).");
      else if (!impl.a11y?.ran) L.push(`axe: not run — ${impl.a11y?.reason || "unavailable"}.`);
      else L.push(impl.a11y.violations.length ? `axe ${impl.a11y.version}: ${impl.a11y.violations.length} violation(s): ${impl.a11y.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes} node${v.nodes > 1 ? "s" : ""}, e.g. ${v.example})`).join("; ")}` : `axe ${impl.a11y.version}: no violations.`);
      for (const i of impl.aria?.issues || []) L.push(`ARIA: ${i}`);
      L.push(sheet ? `Sheet: ${rel(file0)}` : "");
      L.push("Fix the high items first, then pattern_compare again. Record what you decided on purpose with pattern_spec notes.");
      const content = [textBlock(L.filter(Boolean).join("\n"))];
      if (sheet) content.push(imageBlock(sheet));
      return blocks(content);
    }),
  );

  server.registerTool(
    "pattern_save",
    {
      title: "Save a pattern into the project's library",
      description:
        "Records your original implementation in .drip/patterns/index.json: the source files, its spec, previews, provenance (where the idea was studied, by whom) and status. 'proposed' until the user says it is right, then 'approved' (components_local_find offers approved patterns on later tasks). " +
        'Example: pattern_save({ id: "command-menu", files: ["src/components/command-menu.tsx"], tags: ["menu", "keyboard"], status: "proposed" })',
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        kind: z.enum(KINDS).optional(),
        files: z.array(z.string()).optional().describe("Project paths of the implementation (your own code)"),
        status: z.enum(["proposed", "approved"]).optional().describe("Set approved only after the user has accepted it"),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        source: z.object({ url: z.string().optional(), title: z.string().optional(), author: z.string().optional() }).optional(),
      },
    },
    safe(async ({ id, name, kind, files = [], status, tags, notes, source }) => {
      const cur = getPattern(id);
      const missing = files.filter((f) => !fs.existsSync(path.resolve(projectDir(), f)));
      if (missing.length) return text(`These files do not exist: ${missing.join(", ")}`, true);
      const dir = patternDir(id);
      const previews = fs
        .readdirSync(dir, { recursive: true })
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(String(f)))
        .map((f) => rel(path.join(dir, String(f))));
      const entry = {
        id,
        name: name || cur?.entry.name || id,
        kind: kind || cur?.entry.kind || "component",
        files: [...new Set([...(cur?.entry.files || []), ...files.map((f) => rel(path.resolve(projectDir(), f)))])],
        spec: fs.existsSync(path.join(dir, "spec.json")) ? rel(path.join(dir, "spec.json")) : undefined,
        previews,
        source: { ...(cur?.entry.source || {}), ...(source || {}) },
        status: status || cur?.entry.status || "proposed",
        tags: [...new Set([...(cur?.entry.tags || []), ...(tags || [])])],
        ...(notes ? { notes } : {}),
      };
      const idx = upsertPattern(entry);
      return text(`Saved pattern ${id} (${entry.status}) with ${entry.files.length} file(s) and ${previews.length} preview(s). Index revision ${idx.revision}. ${entry.status === "proposed" ? "Ask the user to approve it, then pattern_save again with status: approved." : ""}`);
    }),
  );

  server.registerTool(
    "pattern_list",
    {
      title: "List the project's patterns",
      description: 'The reusable patterns saved in .drip/patterns/ (studied references and your implementations). Filter by status, kind, tag or words. Check it before building: an approved pattern is reused, not rebuilt. Example: pattern_list({ status: "approved", kind: "component" })',
      inputSchema: { status: z.enum(["proposed", "approved"]).optional(), kind: z.enum(KINDS).optional(), tag: z.string().optional(), query: z.string().optional() },
    },
    safe(async ({ status, kind, tag, query }) => {
      let items = listPatterns({ status, kind, tag });
      if (query) {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        items = items.filter((p) => words.every((w) => `${p.id} ${p.name} ${(p.tags || []).join(" ")} ${p.notes || ""}`.toLowerCase().includes(w)));
      }
      if (!items.length) return text("No patterns yet. pattern_study a reference, or pattern_save your own component.");
      return text(items.map((p) => `${p.id} · ${p.kind} · ${p.status} · ${p.name}${p.tags?.length ? ` · ${p.tags.join(", ")}` : ""}${p.files?.length ? ` · ${p.files.join(", ")}` : ""}${p.source?.url ? ` · from ${p.source.url}` : ""}`).join("\n"));
    }),
  );

  server.registerTool(
    "pattern_get",
    {
      title: "Read one pattern",
      description: 'One saved pattern: its index entry and readable spec (spec.md), with the paths of the spec JSON, reference shots and previews. Example: pattern_get({ id: "command-menu" })',
      inputSchema: { id: z.string() },
    },
    safe(async ({ id }) => {
      const p = getPattern(id);
      if (!p) return text(`No pattern "${id}". pattern_list shows what exists.`, true);
      const md = path.join(p.dir, "spec.md");
      return text(`${JSON.stringify(p.entry, null, 2)}\n\n${fs.existsSync(md) ? trim(fs.readFileSync(md, "utf8"), 9000) : "(no spec.md)"}`);
    }),
  );
}

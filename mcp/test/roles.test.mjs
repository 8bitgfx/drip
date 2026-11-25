// 0.8.2: the director / builder / helper roles, pieces dealt per section, the React page, stitching both stacks.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
process.env.DRIP_HOME = tmp("home");
process.env.DRIP_NO_INSTALL = "1";
const project = tmp("roles");
process.env.CLAUDE_PROJECT_DIR = project;

const { dealPieces, formatPieces, loadPieces, registryPatterns, pieceUrl, saveKits, ownedKits } = await import("../src/modules/parts/pieces.mjs");
const { scaffoldReact, isReactPage } = await import("../src/modules/parts/react.mjs");
const swarm = await import("../src/modules/swarm/index.mjs");
const { directorTooBig } = await import("../../hooks/lib.mjs");
const state = await import("../src/core/state.mjs");
const { loadConfig } = await import("../src/core/config.mjs");

const seq = (xs) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

test("every piece has an install URL from its library's registry, and a role", () => {
  const pats = registryPatterns();
  const all = loadPieces();
  assert.ok(all.length > 100, `only ${all.length} pieces`);
  for (const p of all) {
    assert.ok(pieceUrl(p, pats), `${p.lib}/${p.name} has no registry pattern`);
    assert.ok(p.role && p.look, `${p.lib}/${p.name} needs a role and a look`);
  }
  assert.equal(new Set(all.map((p) => `${p.lib}/${p.name}/${p.surface || "landing"}`)).size, all.length, "no duplicates");
});

test("a software page gets pieces for every section; places get no shaders; the history keeps pages apart", () => {
  const hist = path.join(project, ".drip", "deal", "pieces-history.json");
  const a = dealPieces({ kind: "software", stack: "react", historyFile: hist, rnd: seq([0.1, 0.7, 0.3, 0.9]) });
  const roles = a.map((r) => r.role);
  for (const r of ["nav", "ground", "headline", "showcase", "features", "proof", "footer"]) assert.ok(roles.includes(r), `no ${r}`);
  for (const r of a) for (const p of r.options) assert.match(p.url, /^https:\/\//);
  const b = dealPieces({ kind: "software", stack: "react", historyFile: hist, rnd: seq([0.1, 0.7, 0.3, 0.9]) });
  const pick = (d) => d.find((r) => r.role === "ground").options.map((p) => p.name).join();
  assert.notEqual(pick(a), pick(b), "the next page is dealt other grounds");
  const place = dealPieces({ kind: "place", stack: "react" });
  assert.ok(place.every((r) => r.options.every((p) => !p.heavy)), "no WebGL on a cafe page");
  assert.ok(!place.some((r) => r.role === "ground"));
  const html = dealPieces({ kind: "gaming", stack: "html", htmlParts: { effect: [{ id: "aurora", about: "soft aurora" }], ui: [], component: [], moment: [] } });
  assert.ok(html.every((r) => r.options.every((p) => (p.stack || "react") === "html")), "a static page only gets plain-HTML pieces");
  const txt = formatPieces(a, { stack: "react", owned: ["Aceternity Pro"] });
  assert.match(txt, /PIECES ON OFFER/);
  assert.match(txt, /pieces_install/);
  assert.match(txt, /The user owns: Aceternity Pro/);
});

test("app screens get app pieces; every piece has a page to look at", async () => {
  const { previewUrl } = await import("../src/modules/parts/pieces.mjs");
  const app = dealPieces({ kind: "software", stack: "react", surface: "app" });
  const roles = app.map((r) => r.role);
  for (const r of ["shell", "chart", "table", "input", "feedback"]) assert.ok(roles.includes(r), `no ${r}`);
  assert.ok(app.every((r) => r.options.every((p) => p.surface === "app")));
  assert.ok(!dealPieces({ kind: "software", stack: "react" }).some((r) => r.options.some((p) => p.surface === "app")), "landing pages get no dashboards");
  assert.equal(previewUrl({ lib: "efferd", name: "features-6" }), "https://efferd.com/view/features-6");
  assert.equal(previewUrl({ lib: "bencho", name: "image-compare" }), "https://bencho.dev/blocks/image-compare");
  assert.equal(previewUrl({ lib: "reactbits", name: "Silk-TS-TW" }, { reactbitsPaths: ["https://reactbits.dev/backgrounds/silk"] }), "https://reactbits.dev/backgrounds/silk");
  assert.equal(previewUrl({ lib: "shadcn", name: "dashboard-01" }), "https://ui.shadcn.com/view/new-york-v4/dashboard-01");
});

test("the film: agents from hook events, matched to their ids; frames know who was working", async () => {
  const film = await import("../src/core/film.mjs");
  const task = { id: "t_film", title: "Relay", startedAt: new Date(Date.now() - 60000).toISOString() };
  film.filmEvent(task, film.startEvent({ subagent_type: "drip:builder", description: "Build features", prompt: "DRIP BUILDER · section: features\nTHE PIECE: https://magicui.design/r/bento-grid.json. It is installed" }));
  film.filmEvent(task, film.startEvent({ subagent_type: "drip:helper", description: "Save photos", prompt: "Download the hero photo" }));
  film.filmEvent(task, { kind: "write", agent: "ag-77", type: "drip:builder", tool: "Write", file: "src/sections/Features.tsx", summary: "wrote Features.tsx (84 lines)" });
  film.filmEvent(task, { kind: "write", agent: "main", tool: "Edit", file: "src/sections/Hero.tsx", summary: "edited Hero.tsx (3 lines)" });
  film.addFrame(task, Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { caption: "features in" });
  film.filmEvent(task, { kind: "end", agent: "ag-77", type: "drip:builder" });
  const f = film.buildFilm(task);
  const b = f.agents.find((a) => a.type === "builder");
  assert.equal(b.id, "ag-77", "the start is matched to the builder's agent_id");
  assert.equal(b.model, "sonnet");
  assert.match(b.piece, /bento-grid/);
  assert.match(b.job, /section features on magicui\.design bento-grid/);
  assert.equal(b.status, "done");
  assert.equal(f.agents.find((a) => a.type === "helper").model, "haiku");
  assert.equal(f.agents[0].type, "director");
  assert.ok(f.events.some((e) => e.agent === "ag-77" && e.file === "src/sections/Features.tsx"));
  assert.equal(f.frames.length, 1);
  assert.ok(f.frames[0].agents.includes("ag-77") && f.frames[0].agents.includes("main"));
  assert.ok(fs.existsSync(path.join(film.filmDir(task.id), "film.json")));
});

test("each agent has only its own tools", () => {
  const agents = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "..", "agents");
  const tools = (f) => (fs.readFileSync(path.join(agents, f), "utf8").match(/^tools: (.*)$/m) || [])[1] || "";
  assert.doesNotMatch(tools("builder.md"), /fitcheck_shot|refs_|critic/, "builders don't check or scout");
  assert.match(tools("builder.md"), /Write/);
  assert.doesNotMatch(tools("scout.md"), /Write|Edit|Bash/, "scouts only read");
  assert.equal(tools("checker.md"), "Read, mcp__plugin_drip_drip__fitcheck_shot");
  assert.match(tools("helper.md"), /images_save.*pieces_install/);
});

test("a niche pack learns from later tasks and travels as one file, privacy-checked", async () => {
  const packs = await import("../src/core/packs.mjs");
  const { readGuide } = await import("../src/core/guides.mjs");
  packs.createPack({ id: "roblox-ui", name: "Roblox UI", niche: "roblox game ui", keywords: ["roblox"], summary: "x" }, project);
  packs.writePackFile("roblox-ui", "guide.md", "# Roblox UI\nChunky buttons.", project);
  packs.writePackFile("roblox-ui", "sources.md", "Found by aviad@example.com in C:\\Users\\Someone\\notes.txt", project);
  assert.ok(packs.learnInPack("roblox-ui", "thumbnails need one big readable word", { cwd: project }));
  assert.equal(packs.learnInPack("roblox-ui", "thumbnails need one big readable word", { cwd: project }), false, "once");
  assert.match(readGuide("pack:roblox-ui"), /Learned on later tasks[\s\S]*one big readable word/);
  const { pack, found } = packs.exportPack("roblox-ui", { cwd: project });
  assert.ok(found.some((f) => f.what === "an email address") && found.some((f) => f.what === "a local path"), "private bits are listed before sharing");
  const clean = packs.exportPack("roblox-ui", { redact: true, cwd: project }).pack;
  assert.doesNotMatch(clean.files["sources.md"], /example\.com|Users/);
  assert.match(clean.files["learned.md"], /readable word/);
  fs.rmSync(packs.packDir("roblox-ui", project), { recursive: true });
  const added = packs.importPack(clean, { cwd: project });
  assert.equal(added.id, "roblox-ui");
  assert.match(packs.readPackFile("roblox-ui", "guide.md", project), /Chunky/);
  assert.throws(() => packs.importPack(clean, { cwd: project }), /exists/);
  assert.throws(() => packs.importPack({ ...clean, files: { ...clean.files, "run.sh": "rm -rf /" } }, { cwd: project, replace: true }), /data only/);
  assert.deepEqual(packs.matchPacks("a roblox thumbnail maker", project).map((p) => p.id), ["roblox-ui"]);
});

test("a page in a subfolder never inherits the repo's DESIGN.md; a whole-page builder owns the page", () => {
  fs.writeFileSync(path.join(project, "DESIGN.md"), "# The repo's own purple system");
  const p = swarm.buildPrompt({ section: "page", spec: "The whole viewer page, Drip's own brand", page: swarm.pageOf(null, "sp/index.html"), task: null });
  assert.doesNotMatch(p, /purple system/);
  assert.match(p, /You build the whole page/);
  assert.match(p, /index\.html, styles\/, scripts\/, assets\//);
  fs.rmSync(path.join(project, "DESIGN.md"));
});

test("the paid kits are asked once and remembered", () => {
  assert.equal(ownedKits(), null);
  saveKits(["Magic UI Pro"]);
  assert.deepEqual(ownedKits(), ["Magic UI Pro"]);
});

test("the React page: tokens mapped for shadcn pieces, registries known, drip markers in App.tsx", () => {
  const dir = path.join(project, "rp");
  const head = `<link href="https://fonts.googleapis.com/css2?family=Outfit&display=swap" rel="stylesheet">\n<style>\n:root {\n  --p-bg: #0f0f0f; --p-ink: #ffffff;\n  --font-display: "Outfit";\n}\n</style>`;
  const msg = scaffoldReact({ dir, rel: "rp", head, radius: "round", heroRecipe: "<section class=\"hero\"></section>", install: false });
  assert.match(msg, /React page/);
  assert.ok(isReactPage(dir));
  const css = fs.readFileSync(path.join(dir, "src", "index.css"), "utf8");
  assert.match(css, /--p-bg: #0f0f0f/);
  assert.match(css, /--background: var\(--p-bg\)/);
  assert.match(css, /--radius: 20px/);
  assert.doesNotMatch(css, /kit\/system\.css/, "the kit's .grid and .container clash with Tailwind");
  assert.doesNotMatch(css, /--font-display: var\(--font-display\)/, "no self-reference");
  assert.match(fs.readFileSync(path.join(dir, "index.html"), "utf8"), /class="dark"/);
  const cj = JSON.parse(fs.readFileSync(path.join(dir, "components.json"), "utf8"));
  assert.ok(cj.registries["@magicui"] && cj.registries["@efferd"]);
  assert.ok(fs.existsSync(path.join(dir, "src", "sections", "hero.recipe.html")));
});

test("page_stitch: React sections are imported into App.tsx; a static page gets the files between markers", () => {
  const dir = path.join(project, "rp");
  fs.writeFileSync(path.join(dir, "src", "sections", "Features.tsx"), "export default function Features(){return <section id=\"features\"/>}");
  fs.writeFileSync(path.join(dir, "src", "sections", "PricingTable.tsx"), "export default function PricingTable(){return null}");
  const r = swarm.stitchPage("rp", ["features", "pricing-table", "faq"]);
  assert.deepEqual(r.missing, ["faq"]);
  const app = fs.readFileSync(path.join(dir, "src", "App.tsx"), "utf8");
  assert.match(app, /import Features from "\.\/sections\/Features";/);
  assert.match(app, /<PricingTable \/>/);
  swarm.stitchPage("rp", ["features"]); // again: replaced, not duplicated
  assert.equal((fs.readFileSync(path.join(dir, "src", "App.tsx"), "utf8").match(/import Features/g) || []).length, 1);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "src", "App.tsx"), "utf8"), /PricingTable/);

  const s = path.join(project, "sp");
  fs.mkdirSync(path.join(s, "sections"), { recursive: true });
  fs.writeFileSync(path.join(s, "index.html"), "<html><head></head><body><main><section class=\"hero\"></section>\n<!-- drip:sections -->\n<!-- /drip:sections -->\n</main></body></html>");
  fs.writeFileSync(path.join(s, "sections", "proof.html"), "<section id=\"proof\">v1</section>");
  swarm.stitchPage("sp/index.html", ["proof"]);
  assert.match(fs.readFileSync(path.join(s, "index.html"), "utf8"), /v1/);
  // A builder changes its file: the next shot re-stitches by itself.
  const earlier = Date.now() / 1000 - 30;
  fs.utimesSync(path.join(s, "index.html"), earlier, earlier);
  fs.writeFileSync(path.join(s, "sections", "proof.html"), "<section id=\"proof\">v2</section>");
  assert.ok(swarm.restitchIfStale({ stitch: { page: "sp/index.html", sections: ["proof"] } }));
  assert.match(fs.readFileSync(path.join(s, "index.html"), "utf8"), /v2/);
  assert.equal(swarm.restitchIfStale({ stitch: { page: "sp/index.html", sections: ["proof"] } }), null, "nothing newer: nothing to do");
});

test("builder prompts: the piece is used as it is, the stack decides the files, no self-shots", () => {
  const react = swarm.buildPrompt({ section: "features", spec: "Bento of four live features with real numbers", piece: "https://magicui.design/r/bento-grid.json", page: swarm.pageOf(null, "rp"), task: null });
  assert.match(react, /src\/sections\/Features\.tsx/);
  assert.match(react, /AS IT IS/);
  assert.match(react, /bg-background/);
  assert.doesNotMatch(react, /fitcheck_shot with section/);
  const html = swarm.buildPrompt({ section: "proof", spec: "One quote from the head of ops, with photo", piece: "custom: a single quote", page: swarm.pageOf(null, "sp/index.html"), task: null });
  assert.match(html, /sections\/proof\.html, styles\/sections\/proof\.css/);
  assert.match(html, /PIECE: none/);
});

test("the director writes small fixes; a big write in the fast loop goes to a builder", () => {
  const cfg = loadConfig(project);
  const task = state.newTask({ title: "landing", size: "full", surface: "landing", guides: [] });
  task.loop = "fast";
  const big = { content: Array.from({ length: 80 }, (_, i) => `<div class="row-${i}">x</div>`).join("\n") };
  const small = { old_string: "a", new_string: "<h1 class=\"x\">Notes that write themselves</h1>" };
  assert.match(directorTooBig({ agent_id: undefined }, big, task, cfg) || "", /You are the director.*build_prepare/s);
  assert.equal(directorTooBig({}, small, task, cfg), null, "small fixes are the director's");
  assert.equal(directorTooBig({ agent_id: "a1", agent_type: "drip:builder" }, big, task, cfg), null, "builders write");
  assert.equal(directorTooBig({}, big, { ...task, swarm: false }, cfg), null, "roles off");
  assert.equal(directorTooBig({}, big, { ...task, loop: undefined }, cfg), null, "the full loop is unchanged");
  const running = { ...task, agents: [{ type: "drip:builder", at: new Date().toISOString() }] };
  assert.equal(directorTooBig({}, big, running, cfg), null, "an older host that doesn't say who writes: a running builder gets the benefit of the doubt");
  assert.match(directorTooBig({ agent_id: null }, big, running, cfg) || "", /director/, "a host that says it is the main agent is held to it");
});

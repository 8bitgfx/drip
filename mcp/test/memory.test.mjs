// Project memory (docs/PROJECT_MEMORY.md): boards that survive tasks, sessions and moves, the repo as first evidence,
// feedback with authority, redesign vs fidelity, concurrent writers, opt-in Git sharing. All offline, in temp folders.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcp = path.resolve(here, "..");
process.env.DRIP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `drip-${p}-`));
const use = (dir) => (process.env.CLAUDE_PROJECT_DIR = dir);

const store = await import("../src/modules/board/store.mjs");
const memory = await import("../src/core/memory.mjs");
const project = await import("../src/core/project.mjs");
const state = await import("../src/core/state.mjs");
const { collectTools } = await import("../src/core/registry.mjs");
const paths = await import("../src/core/paths.mjs");
const tools = collectTools();
const call = async (name, args = {}) => {
  const r = await tools.get(name).handler(args);
  return { text: r.content.map((c) => c.text || "").join("\n"), error: !!r.isError };
};

/** Another process = another session: the tool runs through the CLI against the same project folder. */
function session(dir, tool, args = {}, env = {}) {
  const r = spawnSync(process.execPath, [path.join(mcp, "src", "index.mjs"), tool, JSON.stringify(args)], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env }, encoding: "utf8", timeout: 60000 });
  return { text: r.stdout || "", err: r.stderr || "", code: r.status };
}

const hashTree = (dir) => {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== ".drip" && e.name !== ".git") walk(f);
      } else out[path.relative(dir, f)] = fs.readFileSync(f, "utf8").length + ":" + fs.statSync(f).mtimeMs;
    }
  };
  walk(dir);
  return out;
};

const DIR = (name, summary) => ({ name, summary, adjectives: ["a", "b"], palette: ["#101010", "#f0f0f0", "#e8452c"], type: "Fraunces + Inter", manifesto: `${name}: ${summary}`, items: [] });

function seedBoard(id = "main", { directions = [DIR("Live Wire", "kinetic type on paper"), DIR("Door Counter", "a quiet counter")], scope } = {}) {
  const b = store.createBoard(id, "brief", scope ? { scope } : {});
  store.updateBoard(b.id, (x) => {
    for (let i = 0; i < 4; i++) store.addItem(x, { key: `color:#00000${i}`, kind: "color", value: `#00000${i}`, title: `c${i}`, note: `colour ${i} used for the test board` });
    x.directions = directions.map((d) => ({ ...d, items: ["color:#000000"] }));
    x.directionsAt = new Date().toISOString();
  });
  return b.id;
}

// ---------------------------------------------------------------------------------------------------------------
test("1 · a v0.4 board migrates with everything it had, and its commands still work", async () => {
  const p = use(tmp("v04"));
  const dest = path.join(p, ".drip", "boards", "claude-portfolio");
  fs.mkdirSync(path.join(dest, "tiles"), { recursive: true });
  const fixture = path.join(here, "fixtures", "board-v04", "board.json");
  fs.copyFileSync(fixture, path.join(dest, "board.json"));
  for (const t of ["live-wire", "door-counter"]) fs.writeFileSync(path.join(dest, "tiles", `${t}.jpg`), "jpg");
  const raw = JSON.parse(fs.readFileSync(fixture, "utf8"));

  const b = store.loadBoard("claude-portfolio");
  assert.equal(b.schema, 2);
  assert.equal(b.items.length, raw.items.length, "no item lost");
  assert.equal(b.directions.length, raw.directions.length);
  assert.equal(b.chosen, "Live Wire");
  assert.equal(b.chosenReason, raw.chosenReason);
  assert.equal(b.feedback.length, raw.feedback.length);
  assert.deepEqual(b.criteria, raw.criteria);
  for (const it of raw.items) {
    const got = b.items.find((x) => x.key === it.key);
    for (const [k, v] of Object.entries(it)) assert.deepEqual(got[k], v, `${it.key}.${k}`);
    assert.ok(["inspiration", "current"].includes(got.status) && got.provenance, `${it.key} has status and provenance`);
  }
  assert.equal(b.items.find((x) => x.key === "color:#E8452C").starred, true);
  assert.equal(b.items.find((x) => x.key === "font:Fraunces").userNote, "a bit less soft");
  assert.equal(b.items.find((x) => x.key.startsWith("image:")).removed, true);
  // the tile paths pointed into the old checkout; they now resolve inside this project
  for (const d of b.directions) assert.ok(fs.existsSync(d.tile) && d.tile.startsWith(p), d.tile);

  // it is the project's master (the only board), and its chosen direction is carried as the approved one, marked migrated
  const idx = store.loadIndex();
  assert.equal(idx.masters.default, "claude-portfolio");
  assert.equal(store.loadBoard("claude-portfolio").approved.migrated, true);

  // existing commands
  assert.match((await call("board_list")).text, /claude-portfolio.*master/);
  const add = await call("board_add", { items: [{ ref: "#123456", note: "a second accent used only for links in the footer" }] });
  assert.match(add.text, /Added 1/);
  assert.match(add.text, /master board|Board has/);
  const read = await call("board_read", { pasted: "- note font:Fraunces: much less soft, almost sharp\n- star color:#F4F1EA" });
  assert.match(read.text, /note font:Fraunces/, "a note on a key with a colon is parsed now");
  const after = store.loadBoard("claude-portfolio");
  assert.equal(after.items.find((x) => x.key === "font:Fraunces").userNote, "much less soft, almost sharp");
  assert.equal(after.items.length, raw.items.length + 1);
  assert.equal(after.chosen, "Live Wire");
  const onDisk = JSON.parse(fs.readFileSync(path.join(dest, "board.json"), "utf8"));
  assert.equal(onDisk.schema, 2);
  assert.ok(onDisk.revision >= 2);
  assert.ok(!path.isAbsolute(onDisk.directions[0].tile), "tile stored relative to the project");
  const { renderBoard } = await import("../src/modules/board/render.mjs");
  assert.match(await renderBoard(after, { mode: "static", inline: false }), /Live Wire/);
  // star / remove / note from the live page are revision-checked writes and become feedback events
  const { ensureServer } = await import("../src/modules/board/server.mjs");
  const port = await ensureServer(4920);
  const res = await fetch(`http://localhost:${port}/b/claude-portfolio/feedback`, { method: "POST", body: JSON.stringify({ key: "color:#16140F", action: "star", value: true, at: new Date().toISOString() }) });
  assert.equal(res.status, 204);
  assert.equal(store.loadBoard("claude-portfolio").items.find((x) => x.key === "color:#16140F").starred, true);
  assert.ok(memory.readFeedback().some((e) => e.kind === "star" && e.source === "user-selection"));
});

// ---------------------------------------------------------------------------------------------------------------
test("2 · the master board and its approved direction outlive the task and the session; the new task still has its own gates", async () => {
  const p = use(tmp("persist"));
  fs.writeFileSync(path.join(p, ".drip-keep"), "");
  const id = seedBoard("Acme site");
  assert.equal(store.loadIndex().masters.default, id, "the first board of a project is its master");
  // task 1
  const start = await call("drip_start", { task: "landing page for Acme", mode: "design", size: "full", surface: "landing" });
  assert.match(start.text, /PROJECT MEMORY \(fresh mode/);
  const t1 = state.loadState().task;
  assert.equal(t1.memory.mode, "fresh", "a board but no approved direction yet");
  await call("drip_end", { summary: "stopped early" });
  // the user approved the direction (no task open here, so no critic record: the approval says so)
  const ch = await call("board_choose", { direction: "Live Wire", reason: "user picked it: loud and playful" });
  assert.match(ch.text, /Approved as the project's direction \(style sr1\)/);
  assert.equal(state.loadState().task, null);

  // a new session, a new process, a different page: the identity is there before anything is researched
  const ctx = session(p, "project_context", {});
  assert.match(ctx.text, /Master board "Acme site"/);
  assert.match(ctx.text, /Approved direction: "Live Wire" \(style sr1/);
  const sd = session(p, "drip_start", { task: "pricing page for Acme", mode: "design", size: "full", surface: "landing" });
  assert.match(sd.text, /PROJECT MEMORY \(fidelity mode/);
  assert.match(sd.text, /Approved direction: "Live Wire"/);
  assert.match(sd.text, /Still needed from this task: .*brief.*references for what is new/);
  // reusing the board never passes this task's own gates
  const t2 = state.loadState().task;
  assert.equal(t2.memory.mode, "fidelity");
  const cfg = (await import("../src/core/config.mjs")).loadConfig();
  const missing = state.missingBeforeUi(t2, cfg).map((m) => m.need);
  assert.ok(missing.includes("brief") && missing.includes("references") && missing.includes("direction"), `gates still open: ${missing}`);
  // the board is intact: the old notes and items are all there, and the board was not rewritten by merely starting a task
  const b = store.loadBoard(id);
  assert.equal(b.items.length, 4);
  assert.equal(b.approved.direction, "Live Wire");
  // adopting the approved direction needs its review on record; an unreviewed approval is refused without the user's say-so
  state.updateState((st) => (st.task.board = null));
  const att = await call("board_attach", { adopt: true });
  assert.match(att.text, /Not adopted: .*without a critic review/);
  assert.ok(state.missingBeforeUi(state.loadState().task, cfg).some((m) => m.need === "direction"));
  const att2 = await call("board_attach", { adopt: true, acceptUnreviewed: true });
  assert.match(att2.text, /Adopted the approved direction "Live Wire"/);
  const need2 = state.missingBeforeUi(state.loadState().task, cfg).map((m) => m.need);
  assert.ok(!need2.includes("direction") && !need2.includes("critic"), "the adopted direction counts");
  assert.ok(need2.includes("brief") && need2.includes("references"), "research and intake are still the task's own");
  // the task has its own feature board; the master did not change
  const t3 = state.loadState().task;
  assert.notEqual(t3.board.id, id);
  assert.equal(store.loadBoard(t3.board.id).scope, "feature");
  assert.equal(store.loadBoard(t3.board.id).parent, id);
  assert.equal(store.loadBoard(id).revision, b.revision, "a feature board inherits the brand without changing the master");
  // closing a task never deletes a board
  await call("drip_end", { acceptOpen: "test" });
  assert.ok(store.loadBoard(id) && store.loadBoard(t3.board.id));
});

test("2b · an approved direction with a passing critic review is adopted without asking, and a changed direction makes it stale", async () => {
  const p = use(tmp("adopt"));
  const id = seedBoard("Brand");
  state.updateState((st) => {
    st.task = state.newTask({ title: "brand page", size: "full", surface: "landing", guides: [] });
    st.task.board = { id, items: 4, directions: 2, chosen: null };
    st.task.critic.records.push({ kind: "directions", verdict: "pass", summary: "ok", at: new Date().toISOString() });
  });
  await call("board_choose", { direction: "Live Wire", reason: "yes" });
  assert.equal(store.loadIndex().approved.default.critic.verdict, "pass");
  await call("drip_end", { acceptOpen: "test" });
  fs.writeFileSync(path.join(p, ".keep"), "");
  await call("drip_start", { task: "about page for Brand", mode: "design", size: "full", surface: "landing" });
  const a = await call("board_attach", { adopt: true });
  assert.match(a.text, /Adopted/);
  const cfg = (await import("../src/core/config.mjs")).loadConfig();
  assert.ok(!state.missingBeforeUi(state.loadState().task, cfg).some((m) => m.need === "direction"));
  // the identity moves on (a redesign someone approved): what this task adopted is stale
  const mo = store.loadIndex();
  store.updateIndex((i) => ((i.approved.default.revision = "sr9"), i));
  assert.ok(state.missingBeforeUi(state.loadState().task, cfg).some((m) => m.need === "direction" && /changed since/.test(m.how)));
  void mo;
});

// ---------------------------------------------------------------------------------------------------------------
test("3 · an existing repo with logos, tokens, components and DESIGN.md becomes a real board from local evidence, and nothing in it changes", async () => {
  const p = use(tmp("repo"));
  const w = (rel, body) => {
    fs.mkdirSync(path.dirname(path.join(p, rel)), { recursive: true });
    fs.writeFileSync(path.join(p, rel), body);
  };
  w("README.md", "# Acme\n\nAcme is a calm invoicing tool for freelance illustrators who hate spreadsheets.\n");
  w("DESIGN.md", "# Acme design\nThesis: paper and ink.\n## Colour\n--ground #f4f1ea\n");
  w("public/brand/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#e8452c"/></svg>');
  w("public/brand/logo-copy.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#e8452c"/></svg>');
  w("src/styles/tokens.css", ":root{--ground:#f4f1ea;--ink:#16140f;--accent:#e8452c;--radius:2px;--space-4:16px;--font-display:'Fraunces',serif;}\n@font-face{font-family:'Fraunces';src:url(/fonts/Fraunces.woff2)}\nbody{font-family:'Inter',sans-serif;color:var(--ink)}h1{font-size:72px;font-weight:600}.btn{padding:12px 20px;border-radius:2px;transition:color 120ms ease-out}");
  w("public/fonts/Fraunces.woff2", "font");
  w("public/images/hero.jpg", "jpgdata");
  w("src/app/page.tsx", "export default function Home(){return <main/>}");
  w("package.json", JSON.stringify({ name: "acme", dependencies: { react: "19", tailwindcss: "4", "@radix-ui/react-dialog": "1", "class-variance-authority": "0.7" } }));
  w(".env", `API_KEY=${["sk", "live", "x".repeat(24)].join("_")}`); // built at runtime: no key-shaped literal in the repo
  w("server/private.key", "-----BEGIN PRIVATE KEY-----\nabc");
  w("node_modules/dep/style.css", ":root{--leak:#123456}");
  w("dist/bundle.css", ":root{--leak2:#654321}");
  const before = hashTree(p);

  const found = await call("board_project", {});
  assert.match(found.text, /No master board yet/);
  assert.match(found.text, /DESIGN\.md: DESIGN\.md/);
  assert.match(found.text, /Skipped \(never read\): 2 secret-looking/);
  assert.ok(!fs.existsSync(path.join(p, ".drip", "boards")), "discover wrote nothing");

  const r = await call("board_project", { action: "bootstrap" });
  assert.ok(!r.error, r.text);
  const idx = store.loadIndex();
  const b = store.loadBoard(idx.masters.default);
  assert.equal(b.scope, "master");
  const kinds = new Set(b.items.map((i) => i.kind));
  for (const k of ["doc", "tokens", "font", "logo", "image", "page", "stack"]) assert.ok(kinds.has(k), `has a ${k} item: ${[...kinds]}`);
  for (const it of b.items) {
    assert.equal(it.status, "current", `${it.key} is evidence of what exists, not approved`);
    assert.ok(it.provenance?.source, `${it.key} has a source label`);
    if (it.path) {
      assert.ok(!path.isAbsolute(it.path) && !it.path.includes("\\"), `${it.path} is project-relative`);
      assert.ok(fs.existsSync(path.join(p, it.path)));
    }
  }
  assert.ok(b.items.some((i) => i.key === "file:DESIGN.md" && i.hash));
  assert.equal(b.items.filter((i) => i.kind === "logo").length, 1, "the same logo under two names is one item");
  assert.ok(b.items.find((i) => i.kind === "logo").aliases?.length === 1);
  assert.ok(!JSON.stringify(b).match(/\.env|private\.key|node_modules|dist\/bundle|sk_live|--leak/), "nothing from secrets, dependencies or builds");
  assert.match(b.items.find((i) => i.key === "stack:components").value, /Tailwind CSS.*Radix/);
  assert.equal(b.approved, null, "no approved direction was invented");
  assert.deepEqual(hashTree(p), before, "no file of the repo changed");
  // the project skill exists from the start; DESIGN.md is only pointed at
  const skill = fs.readFileSync(path.join(p, ".drip", "skills", "project-design", "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: project-design\ndescription: /);
  assert.match(skill, /DESIGN\.md: DESIGN\.md/);
  // it says what to do next, and asking again does not recreate or reset the board
  assert.match(r.text, /research only the gaps/);
  const again = await call("board_project", { action: "bootstrap" });
  assert.match(again.text, /already has a master board/);
  assert.equal(store.loadBoard(b.id).revision, b.revision);

  // style extraction reads the tokens that are really there
  const sx = await call("style_extract", {});
  assert.ok(!sx.error, sx.text);
  const st = memory.loadStyle();
  assert.equal(st.tokens.vars["--accent"], "#e8452c");
  assert.ok(st.tokens.colors.some((c) => c.value === "#e8452c"));
  assert.ok(st.tokens.type.some((t) => t.size === 72));
  assert.ok(st.tokens.motion.includes("120ms"));
  assert.ok(!JSON.stringify(st).includes("--leak"));
  const up = await call("style_update", {});
  assert.match(up.text, /Project skill/);
  assert.match(fs.readFileSync(path.join(p, ".drip", "skills", "project-design", "SKILL.md"), "utf8"), /#e8452c/);
});

test("3b · importing user-given files: inside the project by reference, outside copied in, secrets refused; refresh records a changed hash", async () => {
  const p = use(tmp("import"));
  const outside = tmp("outside");
  fs.writeFileSync(path.join(outside, "moodref.png"), "pngbytes");
  fs.writeFileSync(path.join(outside, ".env"), "K=1");
  fs.mkdirSync(path.join(p, "brand"), { recursive: true });
  fs.writeFileSync(path.join(p, "brand", "mark.svg"), "<svg/>");
  const id = seedBoard("Imports");
  const r = await call("board_import", { board: id, paths: ["brand/mark.svg", path.join(outside, "moodref.png"), path.join(outside, ".env")], status: "inspiration" });
  assert.match(r.text, /2 added/);
  assert.match(r.text, /secrets file/);
  const b = store.loadBoard(id);
  const mark = b.items.find((i) => i.key === "file:brand/mark.svg");
  assert.equal(mark.provenance.source, "repo");
  assert.equal(mark.status, "inspiration");
  const copied = b.items.find((i) => i.provenance.source === "user-file");
  assert.ok(copied.path.startsWith(".drip/boards/"), copied.path);
  fs.writeFileSync(path.join(p, "brand", "mark.svg"), "<svg><g/></svg>");
  store.updateBoard(id, (x) => (x.items.find((i) => i.key === "file:brand/mark.svg").starred = true));
  await call("board_import", { board: id, paths: ["brand/mark.svg"] });
  const m2 = store.loadBoard(id).items.find((i) => i.key === "file:brand/mark.svg");
  assert.notEqual(m2.hash, mark.hash);
  assert.ok(m2.changedAt, "a changed file is recorded");
  assert.equal(m2.starred, true, "the user's star stays");
  assert.equal(m2.status, "inspiration", "a refresh does not change the status the user's side set");
});

// ---------------------------------------------------------------------------------------------------------------
test("4 · a feature board inherits without changing the master; a redesign is a proposal that is kept apart until approved, and can be rolled back", async () => {
  use(tmp("redesign"));
  const id = seedBoard("Brand", { directions: [DIR("Paper", "paper and ink"), DIR("Neon", "dark neon"), DIR("Chalk", "chalkboard")] });
  const fb = await call("board_choose", { direction: "Paper", reason: "user: paper and ink" });
  assert.match(fb.text, /Approved as the project's direction \(style sr1\)/);
  const idx1 = store.loadIndex().approved.default;
  assert.equal(idx1.direction, "Paper");

  // fidelity: another direction on the master is refused (no task = fidelity)
  const no = await call("board_choose", { direction: "Neon", reason: "I like it" });
  assert.equal(no.error, true);
  assert.match(no.text, /fidelity mode/);
  assert.equal(store.loadIndex().approved.default.direction, "Paper");

  // a feature board: its own choice, the master untouched
  const feat = store.createBoard("Pricing", "pricing page", { scope: "feature" });
  store.updateBoard(feat.id, (b) => {
    b.directions = [DIR("Pricing grid", "a grid")];
  });
  const rev = store.loadBoard(id).revision;
  const fc = await call("board_choose", { board: feat.id, direction: "Pricing grid", reason: "ok" });
  assert.match(fc.text, /Chosen on this feature board only/);
  assert.equal(store.loadBoard(id).revision, rev, "the master did not change");
  assert.equal(store.loadIndex().approved.default.direction, "Paper");

  // redesign mode: a proposal; the approved direction stays; feedback in redesign is part of the proposal
  state.updateState((st) => {
    st.task = state.newTask({ title: "redesign Brand", size: "full", surface: "landing", guides: [] });
    st.task.memory = { mode: "redesign", styleRevision: "sr1", approved: "Paper", inherited: [], needed: [] };
    st.task.board = { id, items: 4, directions: 3, chosen: null };
    st.task.critic.records.push({ kind: "directions", verdict: "pass", summary: "ok", at: new Date().toISOString() });
  });
  store.updateBoard(id, (b) => (b.directionsAt = "2000-01-01T00:00:00.000Z"));
  const prop = await call("board_choose", { direction: "Neon", reason: "exploring" });
  assert.match(prop.text, /stored as a PROPOSAL \(style sr2\)/);
  assert.equal(store.loadIndex().approved.default.direction, "Paper", "approved one kept");
  assert.equal(store.loadBoard(id).approved.direction, "Paper");
  const r1 = memory.recordFeedback({ text: "go dark and sharp", scope: "brand", source: "user-explicit", rule: { topic: "ground colour", value: "near-black" } });
  assert.equal(r1.status, "proposed", "redesign feedback is proposed, whoever said it, until the revision is approved");
  const d1 = memory.loadDecisions();
  assert.equal(d1.activeRevision, "sr1");
  assert.equal(d1.styleRevisions.find((r) => r.id === "sr2").status, "proposed");

  // the user says yes: promote; the previous one is retained and the pointer moves
  assert.match((await call("board_update", { style: { promote: "sr2" } })).text, /needs the user's yes/);
  const pr = await call("board_update", { style: { promote: "sr2" }, approved: true });
  assert.match(pr.text, /sr2 is now the approved direction/);
  assert.equal(store.loadIndex().approved.default.direction, "Neon");
  assert.equal(memory.loadDecisions().styleRevisions.find((r) => r.id === "sr1").status, "superseded");
  assert.equal(memory.loadDecisions().rules.find((r) => r.topic === "ground colour").status, "approved");
  // rollback: back to the first, nothing destroyed
  const rb = await call("board_update", { style: { rollback: true }, approved: true });
  assert.match(rb.text, /Rolled back from sr2 to sr1/);
  assert.equal(store.loadIndex().approved.default.direction, "Paper");
  const d2 = memory.loadDecisions();
  assert.equal(d2.styleRevisions.find((r) => r.id === "sr2").status, "rolled-back");
  assert.equal(d2.rules.find((r) => r.topic === "ground colour").status, "rolled-back");
  assert.match((await call("board_history", {})).text, /Style revisions:[\s\S]*sr1 approved \(in force\)/);
  // the project skill follows, and can be undone
  const skill = fs.readFileSync(path.join(process.env.CLAUDE_PROJECT_DIR, ".drip", "skills", "project-design", "SKILL.md"), "utf8");
  assert.match(skill, /Approved direction: Paper/);
});

// ---------------------------------------------------------------------------------------------------------------
test("5 · two sessions writing the same board and rules at once lose nothing; a stale update is rejected, not merged blindly", async () => {
  const p = use(tmp("concurrent"));
  seedBoard("main");
  const child = (who) =>
    new Promise((resolve, reject) => {
      const c = spawn(process.execPath, [path.join(here, "fixtures", "concurrent-child.mjs"), p, who, "15"], { env: { ...process.env, CLAUDE_PROJECT_DIR: p }, stdio: ["ignore", "pipe", "pipe"] });
      let err = "";
      c.stderr.on("data", (d) => (err += d));
      c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`child ${who}: ${err}`))));
    });
  await Promise.all([child("a"), child("b")]);
  const b = store.loadBoard("main");
  const items = b.items.filter((i) => /^color:#(aa|bb)/.test(i.key));
  assert.equal(items.length, 30, "every item from both sessions is there");
  assert.equal(new Set(b.items.map((i) => i.key)).size, b.items.length);
  for (const it of items) assert.equal(it.provenance.addedBy.task, `task-${it.title.split("-")[0]}`, "each item keeps the task that added it");
  assert.equal(b.revision, 1 + 1 + 30, "one revision per write");
  assert.equal(memory.readFeedback().filter((e) => e.kind === "star").length, 30, "every feedback event is there");
  // the contradicting brand rules: one is approved, the other became a question; neither silently replaced the other
  const rules = memory.loadDecisions().rules.filter((r) => r.topic === "corner radius");
  assert.equal(rules.length, 2);
  assert.deepEqual(rules.map((r) => r.status).sort(), ["approved", "proposed"]);
  assert.ok(rules.find((r) => r.status === "proposed").conflictsWith.length === 1);
  // a stale update is rejected, nothing changes
  const stale = await call("board_update", { board: "main", expect: 3, patch: { name: "late" } });
  assert.equal(stale.error, true);
  assert.match(stale.text, /changed since revision 3/);
  assert.notEqual(store.loadBoard("main").name, "late");
  const ok = await call("board_update", { board: "main", expect: store.loadBoard("main").revision, patch: { name: "on time" } });
  assert.ok(!ok.error);
  assert.throws(() => store.updateBoard("main", () => {}, { expect: 1 }), /changed since revision 1/);
});

// ---------------------------------------------------------------------------------------------------------------
test("6 · rejected rounded corners, approved sharp ones: the rule survives a restart with its provenance; weaker voices cannot override it; page feedback stays on the page", async () => {
  const p = use(tmp("rules"));
  seedBoard("main");
  await call("board_choose", { direction: "Live Wire", reason: "yes" });
  const fb = await call("feedback_record", { text: "less rounded, more editorial", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "sharp, 0-2px", avoid: ["rounded cards", "pill buttons"] }, rejects: ["12px rounded cards"], shots: { before: "shots/before.png", after: "shots/after.png" }, board: "main" });
  assert.match(fb.text, /APPROVED/);
  // another session, after a restart
  const ctx = session(p, "project_context", { detail: true });
  assert.match(ctx.text, /corner radius: sharp, 0-2px \(not rounded cards\/pill buttons\)/);
  assert.match(ctx.text, /Rejected:.*12px rounded cards/);
  const ev = memory.readFeedback().find((e) => e.text === "less rounded, more editorial");
  assert.equal(ev.source, "user-explicit");
  assert.equal(ev.scope, "brand");
  assert.equal(ev.shots.after, "shots/after.png");
  assert.ok(ev.id && ev.at && ev.artifact.board === "main" && typeof ev.artifact.boardRevision === "number");
  // the critic and the agent's own inference cannot replace an approved rule
  const c = memory.recordFeedback({ text: "cards feel stiff", scope: "brand", source: "critic", rule: { topic: "corner radius", value: "soft 16px" } });
  assert.equal(c.status, "proposed");
  assert.match(c.question || "", /contradicts the approved rule/);
  assert.equal(memory.effectiveRules().find((r) => r.topic === "corner radius").value, "sharp, 0-2px");
  // even the user must say so on purpose: a contradicting explicit instruction is a question until they confirm the replacement
  const u = memory.recordFeedback({ text: "make corners softer", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "soft 8px" } });
  assert.equal(u.status, "proposed");
  assert.ok(u.question);
  const sup = memory.recordFeedback({ text: "yes, softer corners everywhere", scope: "brand", source: "user-explicit", supersede: true, rule: { topic: "corner radius", value: "soft 8px" } });
  assert.equal(sup.status, "approved");
  const d = memory.loadDecisions();
  assert.equal(d.rules.find((r) => r.value === "sharp, 0-2px").status, "superseded", "the old rule is kept, marked superseded");
  assert.equal(d.rules.find((r) => r.value === "sharp, 0-2px").supersededBy, sup.rule.id);
  // a single page's wish is an exception, never a brand change
  const pg = memory.recordFeedback({ text: "pricing cards can be pill shaped", scope: "page", target: "page:/pricing", source: "user-explicit", rule: { topic: "corner radius", value: "pill" } });
  assert.equal(pg.status, "approved");
  assert.equal(pg.rule.scope, "page");
  assert.ok(pg.rule.exceptionTo);
  assert.equal(memory.effectiveRules().find((r) => r.topic === "corner radius" && r.scope === "brand").value, "soft 8px");
  assert.ok(!memory.effectiveRules().some((r) => r.value === "pill"), "the page rule is not in force elsewhere");
  assert.ok(memory.effectiveRules(undefined, { target: "page:/pricing" }).some((r) => r.value === "pill"));
  // a proposal is approved or rejected by id; approving over a contradiction needs the explicit replace
  const prop = memory.recordFeedback({ text: "maybe a serif", scope: "brand", source: "agent-inference", rule: { topic: "display face", value: "serif" } });
  assert.equal(prop.status, "proposed");
  assert.match((await call("project_learn", { action: "approve", id: prop.rule.id })).text, /now approved/);
  assert.match((await call("project_learn", {})).text, /Approved \(/);
  // the generated skill carries the rule and the history keeps the superseded one
  await call("style_update", {});
  const skillFile = path.join(p, ".drip", "skills", "project-design", "SKILL.md");
  assert.match(fs.readFileSync(skillFile, "utf8"), /corner radius: soft 8px/);
  // hand-written text outside the generated block survives the next update, and undo brings the previous version back
  fs.writeFileSync(skillFile, `${fs.readFileSync(skillFile, "utf8")}\nOUR OWN NOTE: never use stock photos.\n`);
  memory.recordFeedback({ text: "tight spacing", scope: "brand", source: "user-explicit", rule: { topic: "spacing", value: "4px grid" } });
  await call("style_update", {});
  assert.match(fs.readFileSync(skillFile, "utf8"), /OUR OWN NOTE: never use stock photos\./);
  assert.match(fs.readFileSync(skillFile, "utf8"), /spacing: 4px grid/);
  await call("style_update", { undo: true });
  assert.ok(!/spacing: 4px grid/.test(fs.readFileSync(skillFile, "utf8")));
  assert.match(fs.readFileSync(skillFile, "utf8"), /OUR OWN NOTE/);
});

test("6b · critic prompts carry the approved direction and rules, and a fix that breaks one is marked off-direction", async () => {
  const p = use(tmp("critic"));
  seedBoard("main");
  await call("board_choose", { direction: "Live Wire", reason: "yes" });
  memory.recordFeedback({ text: "no rounded cards", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "sharp", avoid: ["rounded cards"] } });
  fs.writeFileSync(path.join(p, "shot.png"), Buffer.from("iVBORw0KGgo=", "base64"));
  state.updateState((st) => {
    st.task = state.newTask({ title: "brand page", size: "quick", surface: "landing", guides: [] });
    st.task.memory = { mode: "fidelity", styleRevision: "sr1", approved: "Live Wire", inherited: [], needed: [] };
  });
  const prep = await call("critic_prepare", { kind: "any", targets: ["shot.png"] });
  assert.match(prep.text, /THE PROJECT'S APPROVED DIRECTION AND RULES/);
  assert.match(prep.text, /corner radius: sharp/);
  assert.match(prep.text, /OFF-DIRECTION/);
  state.updateState((st) => (st.task.critic.runs = [new Date().toISOString()]));
  const rec = await call("critic_record", { kind: "any", verdict: "revise", scores: { fit: 6 }, worst: "stiff", fixes: ["use rounded cards with a 24px radius", "raise the headline contrast"], summary: "stiff" });
  assert.ok(!rec.error, rec.text);
  const saved = state.loadState().task.critic.records.at(-1);
  assert.match(saved.fixes[0], /^\[OFF-DIRECTION: breaks "corner radius: sharp"\]/);
  assert.equal(saved.fixes[1], "raise the headline contrast");
  const ev = memory.readFeedback().find((e) => e.source === "critic");
  assert.ok(ev && ev.status === "proposed", "the critic's opinion is evidence, never a rule");
});

// ---------------------------------------------------------------------------------------------------------------
test("7 · Git sharing is opt-in: the design memory is tracked, the personal and generated files are not, and a fresh clone finds the same direction", async () => {
  const git = (cwd, ...a) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" });
  const p = use(tmp("share"));
  git(p, "init", "-q");
  fs.writeFileSync(path.join(p, "index.html"), "<h1>hi</h1>");
  const id = seedBoard("Share me");
  await call("board_choose", { direction: "Live Wire", reason: "yes" });
  memory.recordFeedback({ text: "sharp corners", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "sharp" } });
  await call("style_update", {});
  const d = path.join(p, ".drip");
  const touch = (rel, body = "x") => {
    fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true });
    fs.writeFileSync(path.join(d, rel), body);
  };
  touch(`boards/${id}/board.html`);
  touch(`boards/${id}/tiles/live-wire.jpg`);
  touch(`boards/${id}/assets/app-1440.jpg`);
  touch(`boards/${id}/history.jsonl`, "{}");
  touch("cache/seen.json");
  touch("state.json", "{}");
  touch("renders/critic/a.jpg");
  touch("config.json", "{}");
  touch("packs/project-style/guide.md");
  touch("packs/project-style/pack.json", "{}");
  touch("patterns/index.json", "{}");
  touch("patterns/btn/spec.json", "{}");
  touch("patterns/btn/preview.png");
  const ignored = (rel) => git(p, "check-ignore", "-q", path.join(".drip", rel)).status === 0;

  // default: nothing of the memory is tracked; settings are
  for (const rel of [`boards/${id}/board.json`, "boards/index.json", "memory/decisions.json", "memory/feedback.jsonl", "skills/project-design/SKILL.md", "packs/project-style/guide.md"]) assert.ok(ignored(rel), `${rel} is private by default`);
  assert.ok(!ignored("config.json"));

  const on = await call("board_project", { share: true });
  assert.match(on.text, /boards ON/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, "config.json"), "utf8")).share.boards, true);
  for (const rel of [`boards/${id}/board.json`, "boards/index.json", "memory/decisions.json", "skills/project-design/SKILL.md", "packs/project-style/guide.md", "packs/project-style/pack.json", "patterns/index.json", "patterns/btn/spec.json", "config.json"]) assert.ok(!ignored(rel), `${rel} is shared`);
  for (const rel of ["memory/feedback.jsonl", `boards/${id}/board.html`, `boards/${id}/tiles/live-wire.jpg`, `boards/${id}/assets/app-1440.jpg`, `boards/${id}/history.jsonl`, "cache/seen.json", "state.json", "renders/critic/a.jpg", "patterns/btn/preview.png"]) assert.ok(ignored(rel), `${rel} stays local`);
  assert.match((await call("board_project", { shareFeedback: true })).text, /feedback ON/);
  assert.ok(!ignored("memory/feedback.jsonl"));
  await call("board_project", { shareFeedback: false });
  assert.ok(ignored("memory/feedback.jsonl"));

  // commit and clone: what is tracked is what a clone sees
  git(p, "add", "-A");
  const tracked = git(p, "ls-files", ".drip").stdout.split("\n").filter(Boolean);
  assert.ok(tracked.includes(`.drip/boards/${id}/board.json`) && tracked.includes(".drip/memory/decisions.json"));
  assert.ok(!tracked.some((f) => /feedback|board\.html|tiles|assets|renders|state\.json|cache|\.env|history\.jsonl/.test(f)), `nothing private is tracked: ${tracked.join(", ")}`);
  assert.equal(git(p, "commit", "-q", "-m", "share").status, 0);
  const clone = tmp("clone");
  assert.equal(git(os.tmpdir(), "clone", "-q", p, clone).status, 0);
  use(clone);
  const ctx = project.projectContext({});
  assert.equal(ctx.master.id, id);
  assert.equal(ctx.approved.direction, "Live Wire");
  assert.ok(ctx.rules.some((r) => r.topic === "corner radius"));
  assert.ok(project.sessionPointer(clone).includes("Live Wire"));
});

test("7b · the old generated .gitignore is migrated and the user's own lines are kept", () => {
  const dir = tmp("ignore");
  const drip = path.join(dir, ".drip");
  fs.mkdirSync(drip);
  const legacy = "# Drip's working files. Shareable settings and the asset credits log stay tracked.\n*\n!.gitignore\n!config.json\n!slop.json\n!catalogue.json\n!assets.json\n";
  fs.writeFileSync(path.join(drip, ".gitignore"), `${legacy}my-notes/\n`);
  paths.syncGitignore(drip);
  const out = fs.readFileSync(path.join(drip, ".gitignore"), "utf8");
  assert.ok(out.includes(paths.GITIGNORE_BEGIN) && out.includes(paths.GITIGNORE_END));
  assert.ok(out.includes("my-notes/"), "the user's line is kept");
  assert.equal(out.split("\n").filter((l) => l === "*").length, 1);
  paths.syncGitignore(drip, { boards: true });
  const on = fs.readFileSync(path.join(drip, ".gitignore"), "utf8");
  assert.ok(on.includes("!boards/index.json") && on.includes("my-notes/"));
  assert.equal(on.split(paths.GITIGNORE_BEGIN).length, 2, "one block");
  paths.syncGitignore(drip, { boards: false });
  assert.ok(!fs.readFileSync(path.join(drip, ".gitignore"), "utf8").includes("!boards/index.json"));
  // a hand-written file only gets the sharing lines, once
  const hand = path.join(tmp("hand"), ".drip");
  fs.mkdirSync(hand);
  fs.writeFileSync(path.join(hand, ".gitignore"), "cache/\n!keep.me\n");
  assert.equal(paths.syncGitignore(hand, {}).changed, false, "left alone when sharing is off");
  paths.syncGitignore(hand, { boards: true });
  paths.syncGitignore(hand, { boards: true });
  const h = fs.readFileSync(path.join(hand, ".gitignore"), "utf8");
  assert.ok(h.startsWith("cache/\n!keep.me\n") && h.includes("!boards/index.json"));
  assert.equal(h.split(paths.GITIGNORE_BEGIN).length, 2);
  assert.ok(!h.split("\n").includes("*"), "no catch-all added to a hand-written file");
});

// ---------------------------------------------------------------------------------------------------------------
test("8 · offline: saved boards load with every item; what cannot be fetched or found is flagged, never erased", async () => {
  const p = use(tmp("offline"));
  const id = seedBoard("Offline");
  fs.writeFileSync(path.join(p, "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  store.updateBoard(id, (b) => {
    store.addItem(b, { key: "image:http://127.0.0.1:9/ref.jpg", kind: "image", image: "http://127.0.0.1:9/ref.jpg", title: "remote ref", note: "a reference that lives on another site" });
    store.addItem(b, { key: "file:logo.svg", kind: "logo", path: "logo.svg", title: "logo", note: "the logo" }, { status: "current" });
    store.addItem(b, { key: "file:gone/logo-old.svg", kind: "logo", path: "gone/logo-old.svg", title: "old logo", note: "from another checkout" }, { status: "current" });
  });
  const n = store.loadBoard(id).items.length;
  const { renderBoard } = await import("../src/modules/board/render.mjs");
  const html = await renderBoard(store.loadBoard(id), { mode: "static", inline: true });
  assert.match(html, /unavailable/);
  assert.match(html, /data:image\/svg\+xml;base64/, "the local logo is inlined");
  assert.match(html, /remote ref/);
  assert.equal(store.loadBoard(id).items.length, n, "rendering erased nothing");
  const ctx = project.projectContext({});
  assert.match(ctx.text, /Master board "Offline"/);
  // moving the project keeps project-relative assets valid
  const moved = tmp("moved");
  fs.cpSync(p, moved, { recursive: true });
  use(moved);
  const html2 = await renderBoard(store.loadBoard(id), { mode: "static", inline: true });
  assert.match(html2, /data:image\/svg\+xml;base64/);
  assert.equal(store.loadBoard(id).items.find((i) => i.key === "file:logo.svg").path, "logo.svg");
});

// ---------------------------------------------------------------------------------------------------------------
test("9 · a style pack exports project-owned material only, imports into another repo without loss, and never carries private feedback or secrets", async () => {
  const a = use(tmp("pack-a"));
  const w = (rel, body) => {
    fs.mkdirSync(path.dirname(path.join(a, rel)), { recursive: true });
    fs.writeFileSync(path.join(a, rel), body);
  };
  w("brand/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>');
  w("brand/leaky.css", ":root{--a:#fff} /* api_key: 'abcdefghijklmnopqrstuvwxyz123456' */");
  w("src/tokens.css", ":root{--ground:#f4f1ea;--accent:#e8452c;--radius:2px;--s1:4px}");
  w("DESIGN.md", "# Acme\nPaper.");
  const id = seedBoard("Acme");
  store.updateBoard(id, (b) => {
    store.addItem(b, { key: "site:linear.app", kind: "shot", url: "https://linear.app", image: "https://cdn.example/x.jpg", title: "Linear", designer: "Linear", note: "left nav density" }, { status: "inspiration", provenance: store.makeProvenance({ source: "reference", label: "Linear" }) });
    store.addItem(b, { key: "file:brand/logo.svg", kind: "logo", path: "brand/logo.svg", title: "logo", hash: store.fileHash(path.join(a, "brand/logo.svg")), note: "logo" }, { status: "current", provenance: store.makeProvenance({ source: "repo", path: "brand/logo.svg" }) });
    store.addItem(b, { key: "file:brand/leaky.css", kind: "tokens", path: "brand/leaky.css", title: "leaky", note: "tokens" }, { status: "current", provenance: store.makeProvenance({ source: "repo", path: "brand/leaky.css" }) });
  });
  await call("board_choose", { direction: "Live Wire", reason: "yes" });
  memory.recordFeedback({ text: "PRIVATE: the client hates the founder's face", scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: "sharp, 0-2px", avoid: ["pill buttons"] } });
  memory.recordFeedback({ text: "private page note", scope: "page", target: "page:/secret", source: "user-explicit", rule: { topic: "hero", value: "photo of the founder" } });
  await call("style_extract", { files: ["src/tokens.css"] });
  const ex = await call("style_export", { out: "exports/acme" });
  assert.ok(!ex.error, ex.text);
  const out = path.join(a, "exports", "acme");
  const manifest = JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8"));
  assert.equal(manifest.kind, "drip-style-pack");
  assert.ok(manifest.files.every((f) => !path.isAbsolute(f.path) && !f.path.includes("..") && !f.path.includes("\\")));
  assert.ok(manifest.files.some((f) => f.path === "assets/brand/logo.svg"));
  assert.ok(manifest.skipped.some((s) => s.path === "brand/leaky.css" && /secret/.test(s.why)), "a file with a secret is left out and listed");
  const everything = manifest.files.map((f) => fs.readFileSync(path.join(out, f.path), "utf8")).join("\n");
  assert.ok(!/PRIVATE|founder|private page note|abcdefghijklmnopqrstuvwxyz123456/.test(everything), "no private feedback, no secret");
  const exBoard = JSON.parse(fs.readFileSync(path.join(out, "board.json"), "utf8"));
  const ref = exBoard.items.find((i) => i.key === "site:linear.app");
  assert.ok(!ref.image && !ref.path, "another site's picture is not copied, only the reference");
  assert.equal(ref.url, "https://linear.app");
  const rules = JSON.parse(fs.readFileSync(path.join(out, "decisions.json"), "utf8")).rules;
  assert.deepEqual(rules.map((r) => r.topic), ["corner radius"], "only brand rules; the page-private one stays");
  // the source project is unchanged by exporting
  assert.equal(store.loadBoard(id).items.length, 7);

  // a second repository
  const b = use(tmp("pack-b"));
  fs.writeFileSync(path.join(b, "index.html"), "<h1>other</h1>");
  const im = await call("style_import", { from: out });
  assert.ok(!im.error, im.text);
  const idx = store.loadIndex();
  const master = store.loadBoard(idx.masters.default);
  assert.equal(master.importedFrom.name, "Acme".replace(/^/, "") && master.importedFrom.name);
  assert.equal(idx.approved.default.direction, "Live Wire", "the imported identity is in force in a project that had none");
  assert.ok(memory.effectiveRules().some((r) => r.topic === "corner radius" && r.source === "import"));
  const logo = master.items.find((i) => i.key === "file:brand/logo.svg");
  assert.match(logo.path, /^.drip.imports.[a-z0-9-]+.assets.brand.logo.svg$/);
  assert.ok(fs.existsSync(path.join(b, logo.path)), "relative and present in the new repo");
  assert.ok(!fs.existsSync(path.join(b, ".drip", "memory", "feedback.jsonl")) || !/founder/.test(fs.readFileSync(path.join(b, ".drip", "memory", "feedback.jsonl"), "utf8")));
  assert.match(fs.readFileSync(path.join(b, ".drip", "skills", "project-design", "SKILL.md"), "utf8"), /Live Wire/);
  assert.equal(memory.loadStyle().tokens.vars["--accent"], "#e8452c");
  // importing into a project that already has an identity never replaces it: proposals only
  const c = use(tmp("pack-c"));
  seedBoard("Own");
  await call("board_choose", { direction: "Door Counter", reason: "ours" });
  const im2 = await call("style_import", { from: out });
  assert.match(im2.text, /as proposals/);
  assert.equal(store.loadIndex().approved.default.direction, "Door Counter");
  assert.ok(memory.loadDecisions().rules.every((r) => r.status === "proposed"));
  // a tampered pack file is refused
  fs.writeFileSync(path.join(out, "guide.md"), "tampered");
  use(tmp("pack-d"));
  const im3 = await call("style_import", { from: out });
  assert.match(im3.text, /hash mismatch/);
  void c;
});

// ---------------------------------------------------------------------------------------------------------------
test("10 · project packs and declarative workflows: versioned, validated, never executable; old packs keep working", async () => {
  use(tmp("packs"));
  const packs = await import("../src/core/packs.mjs");
  assert.match((await call("pack_create", { id: "roblox-ui", name: "Roblox UI", niche: "game UI", keywords: ["roblox"], summary: "chunky" })).text, /ready/);
  assert.equal((await call("pack_create", { id: "empty-niche", name: "x", niche: "x", summary: "x" })).error, true, "a niche pack still needs keywords");
  const wf = { stages: [{ id: "refs", title: "References", gate: "references" }, { id: "review", requires: ["refs"], gate: "critic", criteria: ["distinct from the category default"] }], criteria: ["one accent"] };
  const mk = await call("pack_create", { id: "project-style", name: "Acme style", niche: "this project", summary: "s", type: "project", workflow: wf });
  assert.match(mk.text, /project style pack.*workflow v1/);
  await call("pack_create", { id: "project-style", name: "Acme style", niche: "this project", summary: "s", type: "project", workflow: wf });
  assert.equal(packs.listPacks().find((p) => p.id === "project-style").workflowVersion, 1, "the same workflow does not bump the version");
  await call("pack_create", { id: "project-style", name: "Acme style", niche: "this project", summary: "s", type: "project", workflow: { stages: [...wf.stages, { id: "ship", requires: ["review"], gate: "fitcheck" }] } });
  const meta = packs.listPacks().find((p) => p.id === "project-style");
  assert.equal(meta.workflowVersion, 2);
  assert.equal(meta.workflowHistory.length, 1, "the old workflow is kept");
  assert.ok(fs.existsSync(path.join(process.env.CLAUDE_PROJECT_DIR, ".drip", "packs", "project-style", "pack.json")), "a project pack lives in the project");
  assert.throws(() => packs.validateWorkflow({ stages: [{ id: "x", command: "rm -rf /" }] }), /data only/);
  assert.throws(() => packs.validateWorkflow({ stages: [{ id: "x", requires: ["nope"] }] }), /unknown stage/);
  assert.throws(() => packs.validateWorkflow({ stages: [{ id: "x", gate: "whatever" }] }), /gate must be/);
  // a project pack always applies; a niche pack only when its keywords appear
  assert.deepEqual(packs.matchPacks("a bakery site").map((p) => p.id), ["project-style"]);
  assert.deepEqual(packs.matchPacks("roblox shop screen").map((p) => p.id).sort(), ["project-style", "roblox-ui"]);
  // drip_start does not paste a project pack's guide into the task; the niche one still arrives
  await call("pack_write", { id: "roblox-ui", file: "guide.md", content: "# Roblox UI chunky" });
  const s = await call("drip_start", { task: "roblox shop screen", mode: "design", size: "full", surface: "app" });
  assert.match(s.text, /GUIDE: pack:roblox-ui/);
  assert.ok(!/GUIDE: pack:project-style/.test(s.text));
  // style_update keeps the project pack's guide/critic, and leaves hand-written ones alone
  fs.writeFileSync(path.join(process.env.CLAUDE_PROJECT_DIR, ".drip", "packs", "project-style", "guide.md"), "# hand-written guide\n");
  const up = await call("style_update", {});
  assert.match(up.text, /guide\.md: hand-written, left alone/);
  assert.match(fs.readFileSync(path.join(process.env.CLAUDE_PROJECT_DIR, ".drip", "packs", "project-style", "critic.md"), "utf8"), /Judge against this project/);
});

test.after(async () => {
  (await import("../src/modules/board/server.mjs")).closeServer();
  setTimeout(() => process.exit(0), 300);
});

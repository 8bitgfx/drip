// Fixes from a real run's report: page_stitch twice, install leftovers, a leftover task taking over a new session,
// a blank page, piece type sizes.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { stitchReact } from "../src/modules/swarm/index.mjs";
import { DEMO_SIZES, installSnapshot, isStub, tidyInstall } from "../src/core/pieces-check.mjs";
import { blankPage, judgeAudit } from "../src/core/cdp.mjs";
import { loadState, newTask, orphanTasks, resumeOrphan, setIdentity } from "../src/core/state.mjs";

const APP = `import Nav from "./sections/Nav";
// drip:imports
// /drip:imports
export default function App() {
  return (
    <main>
      <Nav />
      {/* drip:sections */}
      {/* /drip:sections */}
    </main>
  );
}
`;

test("page_stitch: a section already in App.tsx is never imported twice, and running it twice changes nothing", () => {
  const one = stitchReact(APP, ["nav", "features", "pricing"]);
  assert.deepEqual(one.already, ["nav"]);
  assert.deepEqual(one.found, ["features", "pricing"]);
  assert.equal(one.src.match(/import Nav /g).length, 1);
  assert.match(one.src, /<Features \/>/);
  const two = stitchReact(one.src, ["nav", "features", "pricing"]);
  assert.equal(two.src, one.src, "idempotent");
});

test("page_stitch: a duplicate import of one name is removed (it blanks the page)", () => {
  const broken = APP.replace("// drip:imports\n", '// drip:imports\nimport Nav from "./sections/Nav";\n');
  const r = stitchReact(broken, ["features"], () => true);
  assert.equal(r.src.match(/import Nav /g).length, 1, "the copy inside the markers goes when the markers are rewritten");
  const twice = `import Nav from "./sections/Nav";\n${APP}`;
  const r2 = stitchReact(twice, ["features"], () => true);
  assert.equal(r2.src.match(/import Nav /g).length, 1);
  assert.deepEqual(r2.dropped, ["Nav"], "a hand-added repeat outside the markers is removed and reported");
});

test("page_stitch: no markers is an error, not a guess", () => {
  assert.ok(stitchReact("export default () => null;", ["a"]).error);
});

test("pieces_install leftovers: empty stubs removed, a stray root components/ folded into src/, an emptied file restored", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "drip-tidy-"));
  fs.mkdirSync(path.join(root, "src", "components"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "App.tsx"), "export default function App() { return null; }\n");
  fs.writeFileSync(path.join(root, "src", "components", "hero.tsx"), "export const Hero = () => <div />;\n");
  const before = installSnapshot(root);
  // What a sloppy registry item does:
  fs.writeFileSync(path.join(root, "src", "components", "header.tsx"), "");
  fs.writeFileSync(path.join(root, "src", "components", "footer.tsx"), "// TODO\n");
  fs.writeFileSync(path.join(root, "src", "components", "hero.tsx"), "  \n");
  fs.mkdirSync(path.join(root, "components", "ui"), { recursive: true });
  fs.writeFileSync(path.join(root, "components", "ui", "marquee.tsx"), "export const Marquee = () => <div />;\n");
  fs.writeFileSync(path.join(root, "components", "pricing-section.tsx"), "");
  const done = tidyInstall(root, before);
  assert.ok(!fs.existsSync(path.join(root, "src", "components", "header.tsx")));
  assert.ok(!fs.existsSync(path.join(root, "src", "components", "footer.tsx")));
  assert.match(fs.readFileSync(path.join(root, "src", "components", "hero.tsx"), "utf8"), /Hero/, "restored");
  assert.ok(fs.existsSync(path.join(root, "src", "components", "ui", "marquee.tsx")), "moved into src/");
  assert.ok(!fs.existsSync(path.join(root, "components")), "the stray folder is gone");
  assert.ok(done.length >= 5, done.join("; "));
  assert.ok(isStub("export {};\n/* nothing */") && !isStub("export const a = 1;"));
});

test("a task an ended session left open never takes over a new session; resuming it is explicit", () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), "drip-orphan-"));
  const t = newTask({ title: "Kiln film", size: "full", surface: "landing", guides: [] });
  t.ownerSession = "old-session";
  t.ownerPid = 999999; // not running
  fs.mkdirSync(path.join(p, ".drip"), { recursive: true });
  fs.writeFileSync(path.join(p, ".drip", "state.json"), JSON.stringify({ version: 2, tasks: { [t.id]: t }, sessions: { "old-session": t.id }, history: [] }));
  try {
    setIdentity({ session: "new-session", server: true });
    assert.equal(loadState(p).task, null, "the new session's server does not pick it up by itself");
    assert.equal(orphanTasks(p).length, 1);
    assert.equal(resumeOrphan(null, p)?.id, t.id);
    assert.equal(loadState(p).task?.id, t.id, "after drip_status({ resume: true }) it is this session's");
  } finally {
    setIdentity({ session: null, server: false });
  }
});

test("a page that rendered blank is one blocker that says so, with the page's errors", () => {
  const a = { words: 0, media: 0, errors: ["SyntaxError: Identifier 'Hero' has already been declared"], width: 1440, vh: 900, fontSizes: [], families: [] };
  assert.ok(blankPage(a));
  const { blockers } = judgeAudit(a);
  assert.equal(blockers.length, 1);
  assert.match(blockers[0], /rendered blank.*already been declared/);
  assert.ok(!blankPage({ words: 120, media: 2 }));
  assert.ok(!blankPage({}), "an audit without counts is not judged blank");
});

test("piece type sizes are found (Tailwind steps and px values), page tokens are not", () => {
  const found = "text-sm md:text-[15px] text-2xl text-foreground text-balance text-muted-foreground".match(DEMO_SIZES);
  assert.deepEqual(found, ["text-sm", "md:text-[15px]", "text-2xl"]);
});

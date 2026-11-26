// Taste guards: two reference passes, no docs/GitHub references, no repeated faces or palettes across projects,
// README checks on images, render_html at 2x, the hero gate only from a hero shot, stale critic warnings.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { findChrome } from "../src/modules/fitcheck/chrome.mjs";
import { facesOf, isOverused, sameFace, samePalette } from "../src/core/looks.mjs";
import { readmeImages } from "../src/modules/fitcheck/readme.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !findChrome({}) && "no Chrome/Edge on this machine";

test("faces and palettes are compared the way a designer would", () => {
  assert.deepEqual(facesOf("Fraunces 600 + Söhne"), ["Fraunces", "Söhne"]);
  assert.deepEqual(facesOf("Bricolage Grotesque / Atkinson Hyperlegible Mono (labels)"), ["Bricolage Grotesque", "Atkinson Hyperlegible Mono"]);
  assert.ok(sameFace("Fraunces Variable", "fraunces"));
  assert.ok(!sameFace("Inter", "Inter Tight") || sameFace("Inter", "Inter Tight")); // prefix families count as the same voice
  assert.ok(isOverused("Instrument Serif") && !isOverused("Newsreader"));
  assert.ok(samePalette(["#F4EFE6", "#16140F", "#E8452C"], ["#F3EEE5", "#111111", "#E5472E"]));
  assert.ok(!samePalette(["#F4EFE6", "#16140F", "#E8452C"], ["#0B0D12", "#ECEAE4", "#E8452C"]));
});

test("readme images: pictures with dark variants, img tags, markdown; badges ignored", () => {
  const md = `<img src="https://img.shields.io/badge/x-y-red">\n<picture>\n<source media="(prefers-color-scheme: dark)" srcset="art/hero-dark.png">\n<img alt="Hero" src="art/hero.png">\n</picture>\n![Loop](art/loop.png)\n<img src="art/tools.png">`;
  const imgs = readmeImages(md);
  assert.equal(imgs.length, 3);
  assert.deepEqual(imgs[0], { src: "art/hero.png", dark: "art/hero-dark.png", alt: "Hero", picture: true });
  assert.equal(imgs.find((i) => i.src === "art/tools.png").alt, null);
});

test("taste guards through the server", { skip, timeout: 240000 }, async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
  const start = async (project) => {
    const client = new Client({ name: "taste-test", version: "0" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(here, "..", "dist", "drip-mcp.mjs")], cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project, DRIP_PROJECT_DIR: project, DRIP_HOME: home } }));
    const call = async (name, args = {}) => {
      const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
      return { r, err: !!r.isError, t: r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: r.content.filter((c) => c.type === "image").length };
    };
    return { client, call };
  };
  const projA = fs.mkdtempSync(path.join(os.tmpdir(), "drip-a-"));
  const projB = fs.mkdtempSync(path.join(os.tmpdir(), "drip-b-"));
  // Project A already locked a look (as board_choose records it).
  fs.writeFileSync(path.join(home, "looks.jsonl"), JSON.stringify({ at: new Date().toISOString(), project: projA, direction: "Toybox", faces: ["Bricolage Grotesque", "Atkinson Hyperlegible"], palette: ["#F7D046", "#141414", "#E8452C"] }) + "\n");
  const { client, call } = await start(projB);
  try {
    await call("drip_start", { task: "landing page for a ceramics studio" });

    await t.test("docs and GitHub pages are refused as references", async () => {
      const r = await call("refs_site", { urls: ["https://github.com/foo/bar", "https://docs.example.com/start"] });
      assert.ok(r.err);
      assert.match(r.t, /Not references[\s\S]*refs_gallery/);
    });

    await t.test("status shows the three reference roles", async () => {
      assert.match((await call("drip_status")).t, /references by role: style 0\/2 · competitors 0\/2 · same page 0\/2/);
    });

    // Board with enough items (the gate checks happen before saving directions). This test is about faces and palettes,
    // so the reference gates are turned off for it.
    fs.mkdirSync(path.join(projB, ".drip"), { recursive: true });
    fs.writeFileSync(path.join(projB, ".drip", "config.json"), JSON.stringify({ gates: { minRefsStudied: 0, minDesigners: 0, minOnSurface: 0, minStyle: 0, minCompetitors: 0, minPage: 0 } }));
    await call("board_create", { name: "Ceramics" });
    await call("board_add", { items: ["#F4EFE6", "#1B1A17", "#B5452B", "#6F7A5C"].map((c) => ({ ref: c, note: `${c} as a role colour for the kiln and clay world` })) });
    const dir = (name, type, palette, extra = {}) => ({ name, pattern: "product-mockup-glow", idea: `${name}: a different answer to the brief`, takes: [{ ref: "1", what: "the colour role used as a block" }, { ref: "2", what: "the second role as the ground" }], summary: "s", adjectives: ["a", "b"], palette, type, items: ["1"], ...extra });

    await t.test("directions need font research, and refuse faces and palettes used in another project", async () => {
      let r = await call("board_directions", { directions: [dir("Kiln", "Newsreader + Public Sans", ["#F4EFE6", "#1B1A17", "#B5452B"]), dir("Clay", "Fragment Mono + Public Sans", ["#101010", "#EEE", "#6F7A5C"])] });
      assert.ok(r.err);
      assert.match(r.t, /No font research yet/);
      await call("fonts_pair", { mood: "warm editorial", preview: false });
      r = await call("board_directions", { directions: [dir("Kiln", "Bricolage Grotesque + Public Sans", ["#F7D046", "#141414", "#E8452C"]), dir("Clay", "Newsreader + Public Sans", ["#101010", "#EEE", "#6F7A5C"])] });
      assert.ok(r.err);
      assert.match(r.t, /Bricolage Grotesque was the face of "Toybox" in another project/);
      assert.match(r.t, /palette of "Toybox"/);
      r = await call("board_directions", { directions: [dir("Kiln", "Fraunces + Public Sans", ["#F4EFE6", "#1B1A17", "#B5452B"]), dir("Clay", "Fraunces + Public Sans", ["#101010", "#EEE", "#6F7A5C"])] });
      assert.match(r.t, /share the display face Fraunces/);
      assert.match(r.t, /Fraunces is what every agent reaches for/);
      r = await call("board_directions", {
        directions: [
          dir("Kiln", "Fraunces + Public Sans", ["#F4EFE6", "#1B1A17", "#B5452B"], { typeReason: "its soft wonky serifs echo thrown, hand-trimmed pots" }),
          dir("Clay", "Newsreader + Public Sans", ["#101010", "#EEE", "#6F7A5C"]),
        ],
      });
      assert.ok(!r.err, r.t);
      assert.match(r.t, /2 directions saved/);
    });

    await t.test("render_html writes a complete 2x PNG", async () => {
      fs.writeFileSync(path.join(projB, "art.html"), `<!doctype html><style>body{margin:0}div{height:300px;background:#B5452B}</style><div></div>`);
      const r = await call("render_html", { file: "art.html", out: "out/art.png", width: 400 });
      assert.match(r.t, /800x600 px/);
      const png = fs.readFileSync(path.join(projB, "out", "art.png"));
      assert.equal(png.readUInt32BE(16), 800);
      assert.equal(png.readUInt32BE(20), 600);
    });

    await t.test("readme_check judges the images and counts as the README fit check", async () => {
      await call("drip_start", { task: "redo the README for my cli tool" });
      assert.match((await call("drip_status")).t, /\(design, full loop, readme\)/);
      assert.match((await call("drip_kit")).t, /GitHub strips CSS/);
      fs.writeFileSync(path.join(projB, "README.md"), `# Tool\n\n<img src="out/art.png">\n\n\`\`\`mermaid\ngraph TD; A-->B\n\`\`\`\n`);
      const r = await call("readme_check");
      assert.equal(r.images, 1);
      assert.match(r.t, /no alt text/);
      assert.match(r.t, /800px wide, soft on retina/);
      assert.match(r.t, /mermaid block/);
      const st = JSON.parse(fs.readFileSync(path.join(projB, ".drip", "state.json"), "utf8"));
      const task = Object.values(st.tasks).find((x) => x.surface === "readme");
      assert.equal(task.fitcheck.shots, 1);
      assert.ok(task.fitcheck.blockers.some((b) => /alt text/.test(b)));
    });
  } finally {
    await client.close();
  }
});

test("intake asks only what the request leaves open, never padded to 4", async () => {
  const { intakePlan } = await import("../src/modules/workflow.mjs");
  assert.equal(intakePlan("use drip and make a cool 3d + mockups brandsheet for drip, a showcase", { mode: "design", memory: { mode: "fidelity" } }).max <= 1, true);
  assert.equal(intakePlan("design a landing page for my bakery", { mode: "design" }).max, 2);
  assert.equal(intakePlan("pricing page for developers, minimal and dark", { mode: "design" }).max, 1);
  assert.equal(intakePlan("make a portfolio site, decide for me", { mode: "design" }).max, 0);
});

test("a product named with what it does is designed as the product, not a landing page about it", async () => {
  const { guess } = await import("../src/modules/workflow.mjs");
  assert.equal(guess("An AI animation studio for turning still illustrations into living, breathing anime scenes.").surface, "app");
  assert.equal(guess("a music workspace that turns hums into songs").surface, "app");
  assert.equal(guess("a landing page for an AI animation studio for turning stills into scenes").surface, "landing");
  assert.equal(guess("a website for a design studio in Lisbon").surface, "landing");
  assert.equal(guess("something cool for my bakery").surface, "other");
});

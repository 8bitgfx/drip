// The browser tools end to end through the bundled server, with no third-party sites (CI-safe):
// hero gate, interaction states, local serving, optical centre, icons, gradients, compare, brand board,
// templates and the DESIGN.md check. Skipped when no Chrome/Edge is installed.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { findChrome } from "../src/core/chrome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = !findChrome({}) && "no Chrome/Edge on this machine";

test("browser tools", { skip, timeout: 240000 }, async (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "drip-browser-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "drip-home-"));
  const client = new Client({ name: "browser-test", version: "0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(here, "..", "dist", "drip-mcp.mjs")], cwd: project, env: { ...process.env, CLAUDE_PROJECT_DIR: project, DRIP_HOME: home } }));
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    return { r, t: r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), images: r.content.filter((c) => c.type === "image").length };
  };
  try {
    await call("drip_start", { task: "portfolio site for a ceramics studio" });
    await call("drip_kit");
    const page = (css, body) => `<!doctype html><html><head><meta name=viewport content="width=device-width"><link rel=stylesheet href="styles/drip-base.css"><style>${css}</style></head><body>${body}</body></html>`;
    const pic = `<svg data-visual viewBox="0 0 10 10" style="width:100%;height:720px" preserveAspectRatio="none"><rect width="10" height="10" fill="#c33"/></svg>`;
    fs.writeFileSync(path.join(project, "timid.html"), page("h1{font-size:56px}", `<main class="container"><nav>Studio</nav><h1>Six works and the drafts thrown away</h1><p>Small text.</p></main>`));
    fs.writeFileSync(path.join(project, "bold.html"), page("", `<main class="container"><nav style="height:72px;display:flex;align-items:center">Studio</nav><div class="grid" style="align-items:end"><div style="grid-column:1/7"><h1>Six works, every draft</h1><p class="lead">What was made and what was thrown away.</p><a class="button" href="#">See the work</a></div><div style="grid-column:7/13">${pic}</div></div></main>`));

    await t.test("hero gate: timid fails, bold passes (local files are served)", async () => {
      assert.match((await call("fitcheck_shot", { url: "timid.html", hero: true })).t, /HERO GATE FAILED[\s\S]*h1 is 56px/);
      assert.match((await call("fitcheck_shot", { url: "bold.html", hero: true })).t, /HERO GATE PASSED/);
    });

    await t.test("interaction states use real pointer input", async () => {
      fs.writeFileSync(path.join(project, "drag.html"), `<!doctype html><meta name=viewport content="width=device-width"><div id=s style="position:absolute;left:100px;top:300px;width:200px;height:120px;background:#c33"></div><p id=o>still</p><script>let d=null;s.onpointerdown=e=>{d=[e.clientX-s.offsetLeft,e.clientY-s.offsetTop];s.setPointerCapture(e.pointerId)};s.onpointermove=e=>{if(d){s.style.left=e.clientX-d[0]+'px'}};s.onpointerup=()=>{d=null;o.textContent='moved'}</script>`);
      const { t: out, images } = await call("fitcheck_shot", { url: "drag.html", app: true, steps: [{ do: "drag", selector: "#s", to: { x: 300, y: 0 }, label: "dragged" }] });
      assert.match(out, /State 1: dragged/);
      assert.doesNotMatch(out, /STEP FAILED/);
      assert.ok(images >= 3);
    });

    await t.test("optical centre finds the body, not the box", async () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect x="100" y="120" width="200" height="140" fill="#e5322d"/><rect x="190" y="260" width="20" height="120" fill="#e5322d"/></svg>`;
      const { t: out } = await call("optical_center", { svg });
      const body = +out.match(/BODY centre[^:]*: [\d.]+% ([\d.]+)%/)[1];
      const box = +out.match(/Bounding box centre \(maths\): [\d.]+% ([\d.]+)%/)[1];
      assert.ok(body < box - 5, `body ${body}% should sit well above the box centre ${box}%`);
      assert.ok(Math.abs(body - 47.5) < 3, `body centre ${body}% ~ the rectangle's centre`);
      fs.writeFileSync(path.join(project, "mark.svg"), svg);
    });

    await t.test("logo_export writes a real ICO and PNGs", async () => {
      await call("logo_export", { svg: "mark.svg", out: "public" });
      const ico = fs.readFileSync(path.join(project, "public", "favicon.ico"));
      assert.equal(ico.readUInt16LE(2), 1);
      assert.equal(ico.readUInt16LE(4), 3);
      assert.ok(fs.existsSync(path.join(project, "public", "icon-512.png")));
    });

    await t.test("gradient_mesh renders WebP; images_save makes web crops", async () => {
      await call("gradient_mesh", { colors: ["#FF5B2E", "#FFB199"], base: "#140D0B", calm: "left", out: "public/bg.webp" });
      const webp = fs.readFileSync(path.join(project, "public", "bg.webp"));
      assert.equal(webp.subarray(8, 12).toString(), "WEBP");
      const { t: out } = await call("images_save", { image: "public/bg.webp", dest: "public/img/hero", slots: [{ name: "d", ar: "16:9", width: 1600 }, { name: "p", ar: "4:5", width: 800 }] });
      assert.match(out, /hero-d\.webp: 1600x900/);
      assert.match(out, /hero-p\.webp: 800x1000/);
      assert.match(out, /<picture>/);
    });

    await t.test("compare, brand board, templates, DESIGN.md drift", async () => {
      assert.ok((await call("drip_compare", { items: [{ src: "bold.html" }, { src: "timid.html" }] })).images === 1);
      assert.ok((await call("board_brand", { name: "Kiln", logo: "mark.svg", palette: [{ hex: "#F3EFE6", role: "ground" }, { hex: "#141414", role: "ink" }, { hex: "#E5322D", role: "accent" }], display: "Fraunces", text: "Inter" })).images === 1);
      await call("drip_kit", { template: "design-md" });
      assert.ok(fs.existsSync(path.join(project, "DESIGN.md")));
      assert.match((await call("fitcheck_lint", { files: ["bold.html"] })).t, /DESIGN\.md vs the code|kit placeholders|matches the code/);
    });
  } finally {
    await client.close();
  }
});

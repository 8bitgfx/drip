// The live board: the user's star / remove / note reach board.json, and the static render inlines nothing remote when asked.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.CLAUDE_PROJECT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "drip-board-"));
const { createBoard, loadBoard, saveBoard } = await import("../src/modules/board/store.mjs");
const { ensureServer } = await import("../src/modules/board/server.mjs");
const { renderBoard } = await import("../src/modules/board/render.mjs");

test("live board records feedback", async () => {
  const b = createBoard("Test board", "brief");
  b.items.push({ key: "color:#E8452C", kind: "color", value: "#E8452C", title: "Vermilion", note: "accent for the one primary action" });
  saveBoard(b);
  const port = await ensureServer(4890);
  const page = await fetch(`http://localhost:${port}/b/${b.id}`).then((r) => r.text());
  assert.match(page, /Test board/);
  for (const entry of [
    { key: "color:#E8452C", action: "star", value: true },
    { key: "color:#E8452C", action: "note", value: "a bit less orange" },
  ])
    assert.equal((await fetch(`http://localhost:${port}/b/${b.id}/feedback`, { method: "POST", body: JSON.stringify({ ...entry, at: new Date().toISOString() }) })).status, 204);
  const after = loadBoard(b.id);
  assert.equal(after.items[0].starred, true);
  assert.equal(after.items[0].userNote, "a bit less orange");
  assert.equal(after.feedback.length, 2);
});

test("static render escapes text and has the copy-feedback flow", async () => {
  const b = createBoard("<script>x</script>", "brief");
  const html = await renderBoard(b, { mode: "static", inline: true });
  assert.ok(!html.includes("<script>x</script>"));
  assert.match(html, /Copy feedback for Claude/);
});

test.after(() => process.exit(0));

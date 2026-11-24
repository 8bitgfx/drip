// Moodboards on disk: <project>/.drip/boards/<id>/board.json (+ board.html when rendered).
import fs from "node:fs";
import path from "node:path";
import { ensureDir, ensureProjectDrip } from "../../core/paths.mjs";

export const boardsDir = () => ensureDir(path.join(ensureProjectDrip(), "boards"));

export function slug(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "board"
  );
}

export function boardFile(id) {
  return path.join(boardsDir(), id, "board.json");
}

export function loadBoard(id) {
  try {
    return JSON.parse(fs.readFileSync(boardFile(id), "utf8"));
  } catch {
    return null;
  }
}

export function saveBoard(board) {
  ensureDir(path.dirname(boardFile(board.id)));
  board.updatedAt = new Date().toISOString();
  fs.writeFileSync(boardFile(board.id), JSON.stringify(board, null, 2));
  return board;
}

export function createBoard(name, brief) {
  let id = slug(name);
  let n = 2;
  while (fs.existsSync(path.join(boardsDir(), id))) id = `${slug(name)}-${n++}`;
  return saveBoard({ id, name, brief, createdAt: new Date().toISOString(), items: [], directions: [], chosen: null, feedback: [], feedbackReadAt: null });
}

export function listBoards() {
  return fs
    .readdirSync(boardsDir())
    .map((id) => loadBoard(id))
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function liveItems(board) {
  return board.items.filter((it) => !it.removed);
}

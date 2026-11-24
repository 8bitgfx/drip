// A second session: adds items, feedback and rules to the same project as another process at the same moment.
// node concurrent-child.mjs <project> <who> <count>
import { setIdentity } from "../../src/core/state.mjs";

const [, , project, who, countArg] = process.argv;
process.env.CLAUDE_PROJECT_DIR = project;
const n = Number(countArg || 20);
const { updateBoard, makeProvenance, addItem } = await import("../../src/modules/board/store.mjs");
const { recordFeedback } = await import("../../src/core/memory.mjs");
setIdentity({ session: who });

for (let i = 0; i < n; i++) {
  updateBoard(
    "main",
    (b) => {
      addItem(b, { key: `color:#${who === "a" ? "aa" : "bb"}${String(i).padStart(4, "0")}`, kind: "color", value: "#000000", title: `${who}-${i}`, note: `${who} adds item ${i} for the test` }, { provenance: makeProvenance({ source: "agent", by: { task: `task-${who}`, session: who } }) });
    },
    { op: "add", summary: `${who} ${i}`, by: { task: `task-${who}` } },
  );
  recordFeedback({ text: `${who} says ${i}`, scope: "page", source: "user-selection", kind: "star", target: `${who}-${i}`, board: "main" });
}
// both sessions state the same brand rule topic with different values: the second to land must become a question, not an overwrite
recordFeedback({ text: `${who} wants ${who === "a" ? "sharp" : "soft"} corners`, scope: "brand", source: "user-explicit", rule: { topic: "corner radius", value: who === "a" ? "sharp 0-2px" : "soft 16px+" } });
console.log(JSON.stringify({ who, done: true }));

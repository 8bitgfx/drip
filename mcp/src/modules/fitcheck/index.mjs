// Fit check: look at the real result, next to the chosen direction, and score it honestly.
import path from "node:path";
import { z } from "zod";
import { fetchImage, contactSheet, imageBlock, textBlock, toJpeg } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { thumbUrl } from "../refs/dribbble.mjs";
import { loadBoard } from "../board/store.mjs";
import { screenshot } from "./chrome.mjs";
import { formatIssues, lintFiles } from "./lint.mjs";

const CRITERIA = ["hierarchy", "layout", "type", "color", "imagery", "polish", "copy", "fidelity"];

export function register(server, ctx) {
  server.registerTool(
    "fitcheck_shot",
    {
      title: "Screenshot the result",
      description:
        "Screenshots a running page at phone and desktop sizes (Chrome/Edge headless) and returns the images so you can judge them. Required after building or changing UI. " +
        "Start the dev server first. Then compare with the board (fitcheck_compare), fix what you see, and record the verdict with fitcheck_done.",
      inputSchema: {
        url: z.string().describe("e.g. http://localhost:3000/pricing"),
        sizes: z.array(z.object({ name: z.string(), width: z.number(), height: z.number() })).optional(),
        dark: z.boolean().optional().describe("Also try dark mode (best effort)"),
      },
    },
    safe(async ({ url, sizes, dark }) => {
      const config = ctx.config();
      const list = sizes || config.fitcheck.sizes;
      const content = [];
      for (const s of list)
        for (const d of dark ? [false, true] : [false]) {
          const png = await screenshot(url, { width: s.width, height: s.height, dark: d, config });
          content.push(textBlock(`${s.name} ${s.width}x${s.height}${d ? " dark" : ""}`), imageBlock(await toJpeg(png, 1440, 1440)));
        }
      updateState((st) => {
        if (st.task) {
          st.task.fitcheck.shots += content.length / 2;
          st.task.fitcheck.lastShotAt = new Date().toISOString();
          st.task.fitcheck.url = url;
        }
      });
      content.unshift(
        textBlock(
          "Judge these like a design director, not like the author. Read drip_guide fitcheck if you have not. Look for: weak hierarchy, cramped or uneven spacing, more than one accent, " +
            "off-system type, placeholder imagery, slop tells (rules/slop-tells), broken phone layout, missing states. Fix, re-shoot, then fitcheck_done.",
        ),
      );
      return blocks(content);
    }),
  );

  server.registerTool(
    "fitcheck_compare",
    {
      title: "Compare with the chosen direction",
      description: "Puts the latest screenshot of the page next to the chosen moodboard direction, so you can see whether the build actually matches what was agreed.",
      inputSchema: { url: z.string().optional().describe("Page to shoot; defaults to the last fitcheck_shot URL") },
    },
    safe(async ({ url }) => {
      const { task } = loadState();
      const target = url || task?.fitcheck?.url;
      if (!target) return text("No page URL. Pass url or run fitcheck_shot first.", true);
      const board = task?.board?.id && loadBoard(task.board.id);
      const dir = board?.directions.find((d) => d.name === board.chosen);
      const content = [];
      const png = await screenshot(target, { width: 1440, height: 900, config: ctx.config() });
      content.push(textBlock(`The build (${target}):`), imageBlock(await toJpeg(png, 1440, 900)));
      if (dir) {
        const items = dir.items.map((k) => board.items.find((it) => it.key === k)).filter((it) => it?.image);
        const bufs = await Promise.all(items.slice(0, 9).map((it) => fetchImage(it.source === "dribbble" ? thumbUrl(it.image, 480, 360) : it.image).then((r) => r.buf).catch(() => Buffer.alloc(0))));
        content.push(
          textBlock(`The direction "${dir.name}": ${dir.summary}\nAdjectives: ${dir.adjectives.join(", ")} · Palette: ${dir.palette.join(" ")} · Type: ${dir.type}\nNotes:\n${items.map((it, i) => `${i + 1}. ${it.note}`).join("\n")}`),
          imageBlock(await contactSheet(bufs, { cols: 3, tileW: 480, tileH: 360 })),
        );
      } else content.push(textBlock("No chosen direction on record (quick loop or no board). Compare against DESIGN.md instead."));
      content.push(textBlock("Does the build carry the direction's adjectives, palette discipline, type and density? Name each gap and fix it."));
      return blocks(content);
    }),
  );

  server.registerTool(
    "fitcheck_lint",
    {
      title: "Static slop and polish checks",
      description: "Scans UI files for AI-slop tells and polish problems (purple gradients, emoji icons, filler copy, removed focus rings, transition-all, 100vh, fake stats…). Defaults to the files changed in this task.",
      inputSchema: { files: z.array(z.string()).optional() },
    },
    safe(async ({ files }) => {
      const { task } = loadState();
      const root = projectDir();
      const list = (files?.length ? files : [...new Set((task?.uiWrites || []).map((w) => w.file))]).map((f) => path.resolve(root, f));
      if (!list.length) return text("No files given and none recorded for this task.", true);
      const issues = lintFiles(list, root);
      updateState((st) => {
        if (st.task) st.task.fitcheck.lintAt = new Date().toISOString();
      });
      return text(`${list.length} file(s) checked.\n${formatIssues(issues, root)}`);
    }),
  );

  server.registerTool(
    "fitcheck_done",
    {
      title: "Record the fit check verdict",
      description:
        "Record your honest scores (1-5) after looking at fitcheck_shot images. A verdict of 'pass' needs every score >= 4 and no open slop tells; otherwise list the fixes and do them, then shoot again. " +
        "Ending your turn after UI changes is blocked until a passing fit check is recorded (or the user accepts the listed gaps).",
      inputSchema: {
        scores: z.object(Object.fromEntries(CRITERIA.map((c) => [c, z.number().int().min(1).max(5)]))),
        verdict: z.enum(["pass", "fail"]),
        fixes: z.array(z.string()).describe("What you fixed, or what is still wrong"),
        acceptedByUser: z.boolean().optional().describe("True only if the user said to ship despite the remaining gaps"),
      },
    },
    safe(async ({ scores, verdict, fixes, acceptedByUser }) => {
      const low = Object.entries(scores).filter(([, v]) => v < 4);
      const pass = verdict === "pass" && !low.length;
      const st = updateState((s) => {
        if (!s.task) return;
        s.task.fitcheck.score = Object.entries(scores).map(([k, v]) => `${k} ${v}`).join(", ");
        if (pass || acceptedByUser) s.task.fitcheck.doneAt = new Date().toISOString();
      });
      if (!st.task) return text("No Drip task is active.", true);
      if (pass) return text("Fit check passed. Polish last (drip_guide polish), then drip_end when the work is done.");
      if (acceptedByUser) return text(`Recorded as shipped with known gaps: ${fixes.join("; ")}.`);
      return text(`Not passing yet${low.length ? ` (below 4: ${low.map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}. Fix: ${fixes.join("; ") || "name what is wrong"}. Then fitcheck_shot again and record a new verdict.`, true);
    }),
  );
}

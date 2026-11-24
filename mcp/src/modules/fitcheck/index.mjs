// Fit check: look at the real result, next to the chosen direction, and score it honestly.
import path from "node:path";
import { z } from "zod";
import { fetchImage, contactSheet, imageBlock, textBlock } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { isPersuade, loadState, updateState } from "../../core/state.mjs";
import { thumbUrl } from "../refs/dribbble.mjs";
import { loadBoard } from "../board/store.mjs";
import fs from "node:fs";
import { capture, captureStates, formatAudit, judgeAudit, STEP } from "../../core/cdp.mjs";
import { designDoc } from "../../core/skills.mjs";
import { designDrift } from "./drift.mjs";
import { toUrl } from "../../core/serve.mjs";
import * as compare from "./compare.mjs";
import { rendersDir, stamp } from "../../core/render.mjs";
import { screenshot } from "./chrome.mjs";
import { formatIssues, lintFiles } from "./lint.mjs";

const CRITERIA = ["hierarchy", "layout", "type", "color", "imagery", "polish", "copy", "fidelity"];

export function register(server, ctx) {
  compare.register(server, ctx);
  server.registerTool(
    "fitcheck_shot",
    {
      title: "Screenshot the result",
      description:
        "Captures the WHOLE running page at phone and desktop sizes (screen-sized slices from top to bottom, not just the first screen) and MEASURES it: " +
        "horizontal overflow, number of text sizes and font families, share of tiny text, paragraph size, monospace share, empty stretches, imagery. " +
        "Blockers in the audit must be fixed before fitcheck_done can pass. Use it instead of improvising screenshots. url can be a dev-server URL or a local .html file / folder (served for you on a free port; no dev server needed). " +
        "hero: true shoots only the first viewport and runs the hero gate (playbook P31): do it after building nav + hero, before any section. Example: fitcheck_shot({ url: \"http://localhost:3000\", hero: true })",
      inputSchema: {
        url: z.string().describe("e.g. http://localhost:3000/pricing, or index.html / site/ (served automatically)"),
        sizes: z.array(z.object({ name: z.string(), width: z.number(), height: z.number() })).optional(),
        maxSlices: z.number().int().min(1).max(10).optional().describe("Slices per size (default 5 desktop, 4 phone); long pages are sampled evenly"),
        hero: z.boolean().optional().describe("Only the first viewport, judged by the hero gate"),
        steps: z
          .array(STEP)
          .max(12)
          .optional()
          .describe(
            'Interactions to capture as states, with real mouse and keyboard input (drag handlers fire). Each step screenshots the desktop viewport. e.g. [{ do: "drag", selector: ".sheet:nth-child(1)", to: { x: 400, y: 60 }, label: "sheets dragged apart" }, { do: "click", selector: "[data-work=2]", label: "work 2 open" }, { do: "key", text: "Escape" }]',
          ),
        app: z.boolean().optional().describe("An app/tool screen rather than a landing page, portfolio or showcase (the page-scale checks are relaxed). Default: from the task's surface"),
      },
    },
    safe(async ({ url: target, sizes, maxSlices, hero, app, steps }) => {
      const config = ctx.config();
      const url = await toUrl(target);
      const persuade = app === undefined ? isPersuade(loadState().task) : !app;
      const list = sizes || config.fitcheck.sizes;
      const dir = rendersDir(`fitcheck-${stamp()}`);
      const content = [];
      const audits = [];
      const files = [];
      const caps = await Promise.all(list.map((s) => capture(url, { width: s.width, height: s.height, maxSlices: hero ? 1 : maxSlices || (s.width < 600 ? 4 : 5), scale: s.width > 1200 ? 1200 / s.width : 1, config })));
      for (const [k, s] of list.entries()) {
        const r = caps[k];
        const j = judgeAudit(r.audit, { persuade, hero });
        audits.push({ size: s.name, width: s.width, audit: r.audit, ...j });
        content.push(textBlock(`${s.name} ${s.width}px · ${r.slices.length} of ${r.sliceCount} screens\n${formatAudit(r.audit, j)}`));
        for (const [i, sl] of r.slices.entries()) {
          const f = path.join(dir, `${s.name}-${String(i + 1).padStart(2, "0")}.jpg`);
          fs.writeFileSync(f, sl.buf);
          files.push(f);
          content.push(imageBlock(sl.buf));
        }
      }
      if (steps?.length && !hero) {
        const desk = list.find((s) => s.width >= 1000) || list.at(-1);
        const states = await captureStates(url, steps, { width: desk.width, height: desk.height, config });
        for (const [i, st] of states.entries()) {
          const f = path.join(dir, `state-${String(i + 1).padStart(2, "0")}.jpg`);
          fs.writeFileSync(f, st.buf);
          files.push(f);
          content.push(textBlock(`State ${i + 1}: ${st.label}${st.error ? ` · STEP FAILED: ${st.error}` : ""}`), imageBlock(st.buf));
        }
      }
      const blockers = audits.flatMap((a) => a.blockers.map((b) => `${a.size}: ${b}`));
      updateState((st) => {
        if (st.task) {
          st.task.fitcheck.url = url;
          if (!blockers.length) st.task.fitcheck.heroPassedAt = new Date().toISOString();
          if (hero) return; // a hero shot is not a fit check of the page
          st.task.fitcheck.shots += files.length;
          st.task.fitcheck.lastShotAt = new Date().toISOString();
          st.task.fitcheck.blockers = blockers;
          st.task.fitcheck.files = files;
        }
      });
      content.unshift(
        textBlock(
          (hero
            ? blockers.length
              ? `HERO GATE FAILED (fix before writing any section):\n- ${blockers.join("\n- ")}\n\nRedo the hero bigger, then fitcheck_shot({ url, hero: true }) again.\n\n`
              : "HERO GATE PASSED. Now look: could this be any brand's hero? If not, build the sections in plan order (playbook P24-P32), then fitcheck_shot the whole page.\n\n"
            : `${blockers.length ? `MEASURED BLOCKERS (fix before fitcheck_done can pass):\n- ${blockers.join("\n- ")}\n\n` : "No measured blockers.\n\n"}`) +
            "Now judge the slices like a design director, not the author (drip_guide fitcheck): hierarchy, scale (is the type big and confident enough?), empty stretches, " +
            "off-system type, imagery, slop tells, the phone layout, missing states. Fix, re-shoot, then the critic. Files for the critic: " +
            dir,
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
      const shot = await screenshot(target, { width: 1440, height: 900, format: "jpeg", quality: 80, config: ctx.config() });
      content.push(textBlock(`The build (${target}):`), imageBlock(shot));
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
      description: "Scans UI files for AI-slop tells and polish problems (purple gradients, emoji icons, filler copy, removed focus rings, transition-all, 100vh, fake stats…), and checks DESIGN.md against the code (colours, fonts, kit placeholders). Defaults to the files changed in this task.",
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
      const doc = designDoc(root);
      let drift = "";
      if (doc) {
        const d = designDrift(root, doc.file);
        drift = d.issues.length ? `\n\n${doc.rel} vs the code (${d.files} style files, ${d.tokenCount} tokens):\n- ${d.issues.join("\n- ")}` : `\n\n${doc.rel} matches the code's colours and fonts.`;
      }
      return text(`${list.length} file(s) checked.\n${formatIssues(issues, root)}${drift}`);
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
      const { task: t0 } = loadState();
      if (t0 && !t0.fitcheck?.lastShotAt) return text("Shoot the page first: fitcheck_shot({ url }). A fit check needs the measured, full-page capture.", true);
      if (t0 && t0.lastUiWriteAt && t0.fitcheck.lastShotAt < t0.lastUiWriteAt) return text("The UI changed after the last fitcheck_shot. Shoot it again so the verdict is about the current page.", true);
      const blockers = t0?.fitcheck?.blockers || [];
      if (verdict === "pass" && blockers.length && !acceptedByUser)
        return text(`Can't pass with measured blockers:\n- ${blockers.join("\n- ")}\nFix them (drip_guide type / layout), fitcheck_shot again, then record the verdict.`, true);
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

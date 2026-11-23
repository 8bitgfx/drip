// The Critic: an independent, harsh reviewer (the drip:critic subagent, Sonnet, no conversation history).
// critic_prepare renders what is to be judged into image files and writes the exact prompt;
// Claude launches the subagent with it; critic_record stores the verdict. A PostToolUse hook on the
// Agent tool records that the subagent really ran, so a verdict can't be invented.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { readPackFile } from "../../core/packs.mjs";
import { projectDir } from "../../core/paths.mjs";
import { renderSvg, renderUrl, rendersDir, stamp } from "../../core/render.mjs";
import { capture, formatAudit, judgeAudit } from "../../core/cdp.mjs";
import { safe, text } from "../../core/result.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { loadBoard, saveBoard } from "../board/store.mjs";

const KIND_BRIEF = {
  directions:
    "You are judging 2-4 candidate DESIGN DIRECTIONS (style tiles) before the client sees them. Rank them best to worst. For each: is it a real, distinctive idea or a template in a costume? Would anyone remember or screenshot it? Does it fit the brief? Cut anything generic. If none is good enough, say so (verdict reject).",
  build:
    "You are judging a BUILT page/screen (screenshots at phone and desktop sizes) against the brief and the chosen direction. Judge only what you see. Is it distinctive, crafted and finished, or a competent template? Name every place it looks amateur, generic or AI-made.",
  logo:
    "You are judging LOGO concepts or a finished logo (renders at large and small sizes, light and dark). Judge the idea (one clear thought, not a cliché), the construction (curve quality, optical balance, consistent stroke and spacing, no wobbly or lumpy shapes), small-size survival (16-32px), the wordmark's type, and whether it would look at home next to the best marks in its field. Rank concepts if several.",
  pack:
    "You are judging a NICHE PACK: written guidance meant to make a designer excellent in one niche. Is it specific to the niche (real standards, real artists, real techniques, real numbers) or generic design advice with the niche's name pasted in? Name every generic or wrong statement and what's missing.",
  any: "You are judging a design. Judge only what you see against the brief (if any).",
};

const AXES = {
  directions: ["concept", "distinctiveness", "brief fit", "craft potential"],
  build: ["concept", "distinctiveness", "hierarchy", "typography", "colour", "composition", "craft & detail", "copy", "brief/direction fit"],
  logo: ["idea", "distinctiveness", "construction", "small-size", "typography", "versatility"],
  pack: ["specificity", "accuracy", "usefulness", "coverage"],
  any: ["concept", "distinctiveness", "hierarchy", "typography", "colour", "composition", "craft & detail"],
};

function briefBlock(task) {
  const b = task?.brief;
  if (!b) return task ? `Request: ${task.title}` : "No brief given.";
  return [
    `Request: ${task.title}`,
    `What: ${b.what}`,
    `For: ${b.audience}`,
    `Job: ${b.job}`,
    `Feel: ${b.feel.join(", ")}`,
    b.loves?.length ? `Loves: ${b.loves.join(", ")}` : "",
    b.hates?.length ? `Hates: ${b.hates.join(", ")}` : "",
    `Ambition: ${b.ambition}${b.ambition === "bold" ? " (the client wants distinctive, memorable work; safe defaults fail)" : ""}`,
    b.constraints ? `Constraints: ${b.constraints}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const isUrl = (s) => /^https?:\/\//i.test(s) || /^file:/i.test(s);

export function register(server, ctx) {
  server.registerTool(
    "critic_prepare",
    {
      title: "Prepare a critic review",
      description:
        "Prepares an independent review by the drip:critic subagent (Sonnet, no history, harsh). It renders the work to image files and returns the exact prompt to pass to the subagent: " +
        'Agent({ subagent_type: "drip:critic", description: "Critic review", prompt: <returned prompt> }). Pass the prompt unchanged; never add your own defence of the work. ' +
        "kind: directions (uses the board's style tiles), build (screenshots the URL(s) at phone + desktop), logo (renders SVG/PNG files light/dark + small), pack (a niche pack id), any. " +
        'Examples: critic_prepare({ kind: "directions" }) · critic_prepare({ kind: "build", targets: ["http://localhost:3000"] }) · critic_prepare({ kind: "logo", targets: ["brand/concepts.png"] })',
      inputSchema: {
        kind: z.enum(["directions", "build", "logo", "pack", "any"]),
        targets: z.array(z.string()).optional().describe("URLs, file paths (png/jpg/svg/html) or, for kind pack, the pack id"),
        context: z.string().optional().describe("Facts the critic needs that aren't visible (e.g. 'this is the mobile app's settings screen'). Never excuses."),
      },
    },
    safe(async ({ kind, targets = [], context }) => {
      const config = ctx.config();
      const { task } = loadState();
      const dir = rendersDir(`critic-${stamp()}`);
      const files = [];
      const notes = [];
      const measured = [];

      if (kind === "directions") {
        const board = task?.board?.id && loadBoard(task.board.id);
        if (!board?.directions?.length) return text("No directions to judge. board_directions + board_tile first.", true);
        const missing = board.directions.filter((d) => !d.tile || !fs.existsSync(d.tile));
        if (missing.length) return text(`Render the style tiles first (board_tile): missing for ${missing.map((d) => d.name).join(", ")}.`, true);
        board.directions.forEach((d, i) => {
          files.push(d.tile);
          notes.push(`Direction ${i + 1} "${d.name}" (${files.length}): ${d.summary}${d.manifesto ? ` Manifesto: ${d.manifesto}` : ""}${d.pairing ? ` Pairing: ${d.pairing}.` : ""} · ${d.adjectives.join(", ")} · palette ${d.palette.join(" ")} · type ${d.type}`);
          if (i === 0 && board.criteria?.length) context = `${context ? `${context}\n` : ""}Choice criteria (written before the tiles): ${board.criteria.join("; ")}`;
        });
      }

      for (const t of kind === "directions" || kind === "pack" ? [] : targets) {
        if (isUrl(t)) {
          // The whole page, top to bottom, plus measured facts the critic must weigh.
          for (const s of config.fitcheck.sizes) {
            const r = await capture(t, { width: s.width, height: s.height, maxSlices: s.width < 600 ? 4 : 6, config });
            const j = judgeAudit(r.audit);
            measured.push(`${s.name}: ${formatAudit(r.audit, j)}`);
            r.slices.forEach((sl, i) => {
              const f = path.join(dir, `${s.name}-${String(i + 1).padStart(2, "0")}.jpg`);
              fs.writeFileSync(f, sl.buf);
              files.push(f);
              notes.push(`${t} at ${s.name} ${s.width}px, screen ${i + 1} of ${r.sliceCount} (from y=${sl.y}px)`);
            });
          }
        } else {
          const abs = path.resolve(projectDir(), t);
          if (!fs.existsSync(abs)) return text(`File not found: ${t}`, true);
          if (/\.svg$/i.test(abs)) {
            const svg = fs.readFileSync(abs, "utf8");
            for (const [bg, label, size] of [["#FFFFFF", "light", 1024], ["#111111", "dark", 1024], ["#FFFFFF", "small 64px", 64], ["#FFFFFF", "tiny 24px", 24]]) {
              const f = path.join(dir, `${path.basename(abs, ".svg")}-${label.replace(/\W+/g, "")}.png`);
              await renderSvg(svg, f, { size, bg, config });
              files.push(f);
              notes.push(`${t} on ${label}`);
            }
          } else if (/\.html?$/i.test(abs)) {
            const f = path.join(dir, `${path.basename(abs)}.png`);
            await renderUrl(`file:///${abs.replace(/\\/g, "/")}`, f, { width: 1440, height: 900, config });
            files.push(f);
            notes.push(`${t} rendered`);
          } else {
            files.push(abs);
            notes.push(t);
          }
        }
      }

      let packText = "";
      if (kind === "pack") {
        const id = targets[0];
        const parts = ["guide.md", "genres.md", "artists.md", "critic.md", "queries.md"].map((f) => [f, readPackFile(id, f)]).filter(([, c]) => c);
        if (!parts.length) return text(`No pack "${id}" (or it is empty).`, true);
        packText = parts.map(([f, c]) => `----- ${f} -----\n${c.slice(0, 9000)}`).join("\n\n");
      }
      if (kind !== "pack" && !files.length) return text("Nothing to judge: pass targets (URLs or files).", true);

      const rubric = (task?.packs || []).map((p) => readPackFile(p, "critic.md")).filter(Boolean).join("\n\n");
      const id = `c${Date.now().toString(36)}`;
      const prompt = [
        `DRIP CRITIC REVIEW ${id} · kind: ${kind}`,
        KIND_BRIEF[kind],
        "",
        "THE BRIEF",
        briefBlock(task),
        task?.board?.chosen && kind === "build" ? `Chosen direction: ${task.board.chosen}` : "",
        context ? `Context: ${context}` : "",
        measured.length ? `\nMEASURED FACTS (from the live page; trust these over your eyes, and apply the caps in your rules):\n${measured.join("\n")}` : "",
        rubric ? `\nNICHE RUBRIC (also judge against this)\n${rubric}` : "",
        "",
        files.length ? `IMAGES (open every one with the Read tool before judging):\n${files.map((f, i) => `${i + 1}. ${f}${notes[i] ? `  — ${notes[i]}` : ""}`).join("\n")}` : "",
        packText ? `\nTHE PACK\n${packText}` : "",
        "",
        `Score these axes 1-10: ${AXES[kind].join(", ")}.`,
        "Answer in your standard format (VERDICT, SCORES, RANKING if several, WORST PROBLEM, WHAT'S GENERIC, FIXES, ONE-LINE SUMMARY).",
      ]
        .filter((x) => x !== "")
        .join("\n");
      updateState((st) => {
        if (st.task) st.task.critic.pending = { id, kind, files, at: new Date().toISOString(), blockers: measured.filter((m) => /BLOCKERS:/.test(m)).map((m) => m.split("BLOCKERS:")[1].split("\n")[0].trim()) };
      });
      return text(
        `Prepared ${id}: ${files.length} image(s) in ${dir}.\n\nNOW: launch the critic with exactly this prompt (do not edit it, do not add your opinion):\nAgent({ subagent_type: "drip:critic", description: "Critic review ${kind}", prompt: <the text between the lines> })\n\n` +
          `----------------------------------------\n${prompt}\n----------------------------------------\n\nThen critic_record the verdict and show the user the critic's own words.`,
      );
    }),
  );

  server.registerTool(
    "critic_record",
    {
      title: "Record the critic's verdict",
      description:
        "Store the drip:critic subagent's verdict (copy its numbers and words; don't soften them). Only works after the subagent actually ran. " +
        "verdict: pass (ship it / show it), revise (fix the listed problems), reject (start over / replace). For directions, include perDirection so the board shows the critic's ranking. " +
        'Example: critic_record({ kind: "build", verdict: "revise", scores: { concept: 6, typography: 4 }, worst: "hero type is timid: 48px on a 1440 canvas", fixes: ["set the headline at 120px+", "cut the three equal cards"], summary: "competent template, not a portfolio anyone remembers" })',
      inputSchema: {
        kind: z.enum(["directions", "build", "logo", "pack", "any"]),
        verdict: z.enum(["pass", "revise", "reject"]),
        scores: z.record(z.string(), z.number().min(1).max(10)),
        worst: z.string(),
        fixes: z.array(z.string()).min(1),
        summary: z.string(),
        ranking: z.array(z.string()).optional(),
        perDirection: z.array(z.object({ name: z.string(), score: z.number(), verdict: z.enum(["keep", "rework", "cut"]), note: z.string() })).optional(),
      },
    },
    safe(async (rec) => {
      const { task } = loadState();
      if (task && !task.skipped) {
        const pending = task.critic?.pending;
        const ran = (task.critic?.runs || []).some((r) => !pending || r >= pending.at);
        if (!ran) return text('No drip:critic run found after critic_prepare. Launch it: Agent({ subagent_type: "drip:critic", prompt: <prompt from critic_prepare> }). Then record its verdict.', true);
      }
      // Measured blockers outrank any verdict: a page with tiny text or 12 type sizes can't PASS.
      const measuredBlockers = task?.critic?.pending?.blockers || [];
      if (rec.verdict === "pass" && measuredBlockers.length) rec.verdict = "revise";
      const r = { ...rec, at: new Date().toISOString(), measuredBlockers };
      const st = updateState((s) => {
        if (!s.task) return;
        s.task.critic.records.push(r);
        s.task.critic.pending = null;
      });
      if (rec.kind === "directions" && st.task?.board?.id && rec.perDirection) {
        const board = loadBoard(st.task.board.id);
        if (board) {
          for (const pd of rec.perDirection) {
            const d = board.directions.find((x) => x.name.toLowerCase() === pd.name.toLowerCase());
            if (d) d.critic = `${pd.score}/10 · ${pd.verdict} — ${pd.note}`;
          }
          saveBoard(board);
        }
      }
      const rounds = (st.task?.critic?.records || []).filter((x) => x.kind === rec.kind).length;
      const max = ctx.config().gates.maxCriticRounds;
      const next =
        rec.verdict === "pass"
          ? rec.kind === "directions"
            ? "NEXT: board_open and present the ranking + your pick to the user (buttons)."
            : rec.kind === "build"
              ? "NEXT: fitcheck_done, then hand off (screenshots, scores, the critic's summary, what's left)."
              : "NEXT: continue."
          : rounds >= max && rec.kind === "build"
            ? `That's ${rounds} critic rounds: fix what you can, then hand off and list the critic's open points honestly.`
            : rec.verdict === "reject"
              ? "NEXT: start over on what was rejected (new concepts / directions), not cosmetic tweaks. Then prepare a new review."
              : "NEXT: fix the listed problems in order, re-render / re-shoot, and prepare a new review.";
      return text(`Recorded critic verdict: ${rec.verdict.toUpperCase()} (${rec.kind}, round ${rounds}). Worst: ${rec.worst}\n${next}\nShow the user the critic's own summary and scores, not a softened version.`);
    }),
  );
}

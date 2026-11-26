// The Critic: an independent, harsh reviewer (the drip:critic subagent, Sonnet, no conversation history).
// critic_prepare renders what is to be judged into image files and writes the exact prompt;
// Claude launches the subagent with it; critic_record stores the verdict. A PostToolUse hook on the
// Agent tool records that the subagent really ran, so a verdict can't be invented.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { readPackFile } from "../../core/packs.mjs";
import { examplesDir, projectDir } from "../../core/paths.mjs";
import { renderSvg, renderUrl, rendersDir, stamp } from "../../core/render.mjs";
import { capture, captureStates, formatAudit, judgeAudit, STEP } from "../../core/cdp.mjs";
import { safe, text } from "../../core/result.mjs";
import { launchLine, writeBrief } from "../../core/briefs.mjs";
import { agentsRunning, criticRounds, isPersuade, loadState, updateState } from "../../core/state.mjs";
import { artifactRev } from "../../core/evidence.mjs";
import { offDirectionFixes, recordFeedback } from "../../core/memory.mjs";
import { projectContext } from "../../core/project.mjs";
import { loadBoard, updateBoard } from "../board/store.mjs";
import { designDoc, relevantSkills } from "../../core/skills.mjs";
import { toUrl } from "../../core/serve.mjs";
import { loadPieces } from "../parts/pieces.mjs";

/** The first phrase in a critic context that argues for the work instead of stating a fact, or null. */
export function defends(context) {
  const s = String(context || "");
  if (s.length > 400) return `${s.length} characters: a context that long is a pitch`;
  const m = s.match(/\b(intentional(ly)?|deliberate(ly)?|on purpose|by design|as designed|(already|now) (fixed|improved|addressed|better)|we (fixed|improved|chose)|i (fixed|improved|chose)|don'?t (judge|penali[sz]e|count|mark)|ignore|not a (bug|flaw|mistake)|this is fine|should pass|please (pass|be kind)|was (fixed|improved)|much better|huge improvement)\b/i);
  return m ? m[0] : null;
}

const INTERACTIVE =/accordion|expand|hover|carousel|slider|tabs?\b|toggle|marquee|tilt|reveal|drag|compare|before.?after|flip|stack|swipe|scroll|dock|magnet|spotlight|morph|gallery/i;

/** The library piece behind a section ("https://reactbits.dev/r/AccordionGallery-TS-TW.json" -> its catalogue entry). */
function pieceInfo(piece) {
  if (!piece || /^custom/i.test(piece)) return null;
  const name = String(piece).split(/[/@]/).pop().replace(/\.json$/i, "").replace(/-(TS|JS)-(TW|CSS)$/i, "").toLowerCase();
  try {
    return loadPieces().find((p) => String(p.name).toLowerCase() === name) || { name };
  } catch {
    return { name };
  }
}

/** How the page is meant to behave, in words: stills can't show a hover, an open panel or a transition. */
export function behaviourBlock(task) {
  const sections = Object.entries(task?.sections || {});
  const motions = (task?.refs?.studied || []).filter((s) => s.motion).slice(0, 4);
  if (!sections.length && !motions.length) return "";
  const lines = sections.map(([id, s]) => {
    const p = pieceInfo(s.piece);
    const what = p ? `library piece ${p.lib ? `${p.lib}/` : ""}${p.name}${p.look ? ` (${p.look})` : ""}` : s.piece ? `homemade (${s.piece})` : "no piece named";
    return `- #${id}: ${what}. Spec: ${s.spec}`;
  });
  return [
    "\nHOW IT BEHAVES (stills can't show motion or interaction; this is what each section does, from the build specs):",
    ...lines,
    ...(motions.length ? ["Motion taken from the references:", ...motions.map((m) => `- ${m.source}: ${m.motion}`)] : []),
    "Judge each interactive section by what it does, using the interaction states when given. A resting frame of a known pattern (an accordion gallery's narrow panels, a carousel's one slide, collapsed tabs) is its design, not a defect: ask whether the rest state reads and invites the interaction. Without states for it, write \"unjudged: <section>\" instead of guessing.",
  ].join("\n");
}

/** Hover each interactive section (up to 6) and shoot it: the critic's frames when the director gave none. */
export function hoverSteps(task) {
  return Object.entries(task?.sections || {})
    .filter(([, s]) => INTERACTIVE.test(`${s.piece} ${s.spec} ${pieceInfo(s.piece)?.look || ""}`))
    .slice(0, 6)
    .flatMap(([id]) => [
      { do: "hover", selector: `#${id}`, shot: false },
      { do: "wait", ms: 600, label: `#${id} while hovered (the pointer at its centre)` },
    ]);
}

const KIND_BRIEF = {
  directions:
    "You are judging 2-4 candidate DESIGN DIRECTIONS, each shown as its first viewport at 1440x900 (a comp; the picture slot is labelled with what will fill it) plus a spec strip, before the client sees them. Rank them best to worst. For each: is it beautiful, the kind of hero a designer saves on Dribbble? Is there one rich picture carrying it (the product UI as a glowing mockup, a fan or arc of real image cards, a 3D render, a character, a product photo) at a real size, with a calm confident headline (about 48-80px) and soft light and depth? Is it polished or rough? Does it fit the brief? Are the directions different ways to show the product, not one idea recoloured? A familiar structure done beautifully is a strength; a shouting poster nobody asked for is not. If none is good enough, say so (verdict reject).",
  build:
    "You are judging a BUILT page/screen (screenshots at phone and desktop sizes) against the brief and the chosen direction. Judge only what you see. Is it beautiful, polished and finished, with something worth looking at on every screen? Do the states and interaction states show a considered flow (hover, press, loading, transitions)? Name every place it looks rough, empty, generic or AI-made.",
  logo:
    "You are judging LOGO concepts or a finished logo (renders at large and small sizes, light and dark). Judge the idea (one clear thought, not a cliché), the construction (curve quality, optical balance, consistent stroke and spacing, no wobbly or lumpy shapes), small-size survival (16-32px), the wordmark's type, and whether it would look at home next to the best marks in its field. Rank concepts if several.",
  pack:
    "You are judging a NICHE PACK: written guidance meant to make a designer excellent in one niche. Is it specific to the niche (real standards, real artists, real techniques, real numbers) or generic design advice with the niche's name pasted in? Name every generic or wrong statement and what's missing.",
  any: "You are judging a design. Judge only what you see against the brief (if any).",
};

const AXES = {
  directions: ["appeal", "craft potential", "brief fit", "eye candy", "different ideas"],
  build: ["appeal", "polish & craft", "hierarchy", "typography", "colour", "composition", "imagery & eye candy", "UX & motion", "copy", "brief/direction fit"],
  logo: ["idea", "distinctiveness", "construction", "small-size", "typography", "versatility"],
  pack: ["specificity", "accuracy", "usefulness", "coverage"],
  any: ["appeal", "polish & craft", "hierarchy", "typography", "colour", "composition", "imagery & eye candy"],
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
    `Ambition: ${b.ambition}${b.ambition === "bold" ? " (the client asked for loud, distinctive work)" : b.ambition === "conservative" ? " (the category standard done perfectly)" : " (beautiful and polished: proven structure is fine; judge appeal, craft and feel, never mark good familiar work down as safe)"}`,
    b.constraints ? `Constraints: ${b.constraints}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const isUrl = (s) => /^https?:\/\//i.test(s) || /^file:/i.test(s);

/** The gold page closest to the task (examples/gold/<kind>/1.jpg), or null. */
export function goldFor(task) {
  const t = `${task?.title || ""} ${task?.brief?.what || ""}`.toLowerCase();
  const kind =
    /\b(walker|device|hardware|speaker|bike|camera|furniture|toy|gadget|appliance|wearable|shoe|bottle|stroller)\b/.test(t) && !/\b(saas|software|app|platform)\b/.test(t)
      ? "hardware"
      : /\b(ai|generator|thumbnail|image|video|creative tool|model)\b/.test(t)
        ? "ai-tool"
        : /\b(portfolio|studio|agency|designer|artist|photographer)\b/.test(t)
          ? "studio"
          : task?.surface === "landing" || task?.surface === "app"
            ? "saas"
            : null;
  const labels = { hardware: "teenage.engineering, OP-1 product page", "ai-tool": "krea.ai", studio: "locomotive.ca", saas: "linear.app" };
  const file = kind && path.join(examplesDir, "gold", kind, "1.jpg");
  return file && fs.existsSync(file) ? { kind, file, label: labels[kind] } : null;
}

export function register(server, ctx) {
  server.registerTool(
    "critic_prepare",
    {
      title: "Prepare a critic review",
      description:
        "Prepares an independent review by the drip:critic subagent (Sonnet, no history, harsh). It renders the work to image files and returns the exact prompt to pass to the subagent: " +
        'Agent({ subagent_type: "drip:critic", description: "Critic review", prompt: <returned prompt> }). Pass the prompt unchanged; never add your own defence of the work. ' +
        "kind: directions (uses the board's first-viewport comps), build (screenshots the URL(s) at phone + desktop), logo (renders SVG/PNG files light/dark + small), pack (a niche pack id), any. " +
        'Examples: critic_prepare({ kind: "directions" }) · critic_prepare({ kind: "build", targets: ["http://localhost:3000"] }) · critic_prepare({ kind: "logo", targets: ["brand/concepts.png"] })',
      inputSchema: {
        kind: z.enum(["directions", "build", "logo", "pack", "any"]),
        targets: z.array(z.string()).optional().describe("URLs, file paths (png/jpg/svg/html) or, for kind pack, the pack id. Pass every state of an app screen at once (?state=typing, ?state=result, ...): each keeps its own screenshots"),
        context: z.string().optional().describe("Facts the critic needs that aren't visible (e.g. 'this is the mobile app's settings screen'). Never excuses."),
        steps: z.array(STEP).optional().describe("build: interactions to show the critic as extra screenshots (hover, click, open, generate...), same as fitcheck_shot steps. For a transition, add waits of ~150ms between shots: the critic judges motion from that frame strip"),
        extraRound: z.boolean().optional().describe("Only when the user chose 'one more round' after the round limit"),
      },
    },
    safe(async ({ kind, targets = [], context, steps, extraRound }) => {
      const config = ctx.config();
      // Context is facts the critic can't see (what screen this is, who uses it), never a case for the work.
      const pleading = defends(context);
      if (pleading)
        return text(
          `The context argues for the work ("${pleading}"). The critic must judge what it sees: give only facts it can't see (what the screen is, who uses it, what's real data), in under 400 characters, and let the work speak.`,
          true,
        );
      const { task } = loadState();
      // The critic judges the finished page once: a review while a builder is still writing a section is a wasted round.
      const building = kind === "build" ? agentsRunning(task).filter((a) => /builder/i.test(a.type)) : [];
      if (building.length)
        return text(`${building.length} builder${building.length > 1 ? "s are" : " is"} still writing sections. Wait for ${building.length > 1 ? "them" : "it"} to finish, then page_stitch and one fitcheck_shot; the critic judges the finished page, once.`, true);
      const prevRounds = (task?.critic?.records || []).filter((r) => r.kind === kind);
      // The user said "decide for me": that standing answer covers one more round without a question.
      const decided = task?.intake?.max === 0;
      if (kind === "build" && decided && !extraRound && !(task?.critic?.extraRounds) && prevRounds.length >= criticRounds(task, config)) extraRound = true;
      if (kind === "build" && prevRounds.length >= criticRounds(task, config) + (task?.critic?.extraRounds || 0) && !extraRound)
        return text(
          decided
            ? `Round limit: ${prevRounds.length} critic rounds (last: ${prevRounds.at(-1).verdict.toUpperCase()}). The user told you to decide: ship it. fitcheck_done, then drip_end({ acceptOpen: "decide for me" }) and list the open points in the hand-off.`
            :
          `Round limit: the critic has judged this build ${prevRounds.length} times (last: ${prevRounds.at(-1).verdict.toUpperCase()}, ${prevRounds.at(-1).summary}).\n` +
            'Ask the user now with AskUserQuestion: "Ship it with the open points listed" or "One more critic round". Show the open points first. ' +
            "If they pick another round, call critic_prepare again with extraRound: true; if they ship, fitcheck_done and hand off with the open points.",
          true,
        );
      if (extraRound) updateState((st) => st.task && (st.task.critic.extraRounds = (st.task.critic.extraRounds || 0) + 1));
      const dir = rendersDir(`critic-${stamp()}`);
      const files = [];
      const notes = [];
      const measured = [];

      if (kind === "directions") {
        const board = task?.board?.id && loadBoard(task.board.id);
        if (!board?.directions?.length) return text("No directions to judge. board_directions first (it renders the comps).", true);
        const missing = board.directions.filter((d) => !d.tile || !fs.existsSync(d.tile));
        if (missing.length) return text(`Render the comps first (board_tile): missing for ${missing.map((d) => d.name).join(", ")}.`, true);
        const unreadable = board.directions.filter((d) => d.typeIssues?.length);
        if (unreadable.length)
          return text(`Not ready for the critic: ${unreadable.map((d) => `"${d.name}" (${d.typeIssues.map((t) => t.detail).join("; ")})`).join(" · ")}. Fix the comps and board_tile again; a critic's time goes on ideas, not on broken type.`, true);
        board.directions.filter((d) => !d.dropped).forEach((d, i) => {
          files.push(d.tile);
          notes.push(`Direction ${i + 1} "${d.name}" (${files.length}): ${d.idea ? `IDEA: ${d.idea}. ` : ""}${d.summary}${d.manifesto ? ` Manifesto: ${d.manifesto}` : ""}${d.pairing ? ` Pairing: ${d.pairing}.` : ""} · ${d.adjectives.join(", ")} · palette ${d.palette.join(" ")} · type ${d.type}`);
          if (i === 0 && board.criteria?.length) context = `${context ? `${context}\n` : ""}Choice criteria (written before the tiles): ${board.criteria.join("; ")}`;
        });
      }
      // The bar: a shipped page of the same kind (examples/gold.md). The work is judged against its craft, not its look.
      if (kind === "directions" || kind === "build") {
        const gold = goldFor(task);
        if (gold) {
          files.push(gold.file);
          notes.push(`THE BAR (image ${files.length}): ${gold.label}, a shipped page of the same kind. Judge craft, confidence and restraint against it ("would this sit next to it without looking like a template?"); never ask the work to copy its look.`);
        }
      }

      const list = kind === "directions" || kind === "pack" ? [] : targets;
      for (const [ti, t0] of list.entries()) {
        // Several targets (states of one screen, several pages) each keep their own files.
        const tag = list.length > 1 ? `t${ti + 1}-` : "";
        // A local page is served and judged like a live one (whole page, measured), not as one still.
        const t = kind === "build" && /\.html?$/i.test(t0) && !isUrl(t0) ? await toUrl(t0) : t0;
        if (isUrl(t)) {
          // The whole page, top to bottom, plus measured facts the critic must weigh.
          const sizes = config.fitcheck.sizes;
          const caps = await Promise.all(sizes.map((s) => capture(t, { width: s.width, height: s.height, maxSlices: s.width < 600 ? 4 : 6, config })));
          for (const [k, s] of sizes.entries()) {
            const r = caps[k];
            const j = judgeAudit(r.audit, { persuade: isPersuade(loadState().task) });
            measured.push(`${s.name}: ${formatAudit(r.audit, j)}`);
            r.slices.forEach((sl, i) => {
              const f = path.join(dir, `${tag}${s.name}-${String(i + 1).padStart(2, "0")}.jpg`);
              fs.writeFileSync(f, sl.buf);
              files.push(f);
              notes.push(`${t} at ${s.name} ${s.width}px, screen ${i + 1} of ${r.sliceCount} (from y=${sl.y}px)`);
            });
          }
          // Interactive sections show their resting state in a still; when the director gave no steps, hover each one
          // (scrolled into view) so the critic sees what it does.
          const autoSteps = !steps?.length && kind === "build" && ti === 0 ? hoverSteps(task) : [];
          const useSteps = steps?.length ? steps : autoSteps;
          if (useSteps.length) {
            const desk = sizes.find((s) => s.width >= 1000) || sizes.at(-1);
            const states = await captureStates(t, useSteps, { width: desk.width, height: desk.height, config });
            states.forEach((st, i) => {
              const f = path.join(dir, `${tag}state-${String(i + 1).padStart(2, "0")}.jpg`);
              fs.writeFileSync(f, st.buf);
              files.push(f);
              notes.push(`interaction state ${i + 1}: ${st.label}${st.error ? ` (step failed: ${st.error})` : ""}`);
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
      const doc = kind === "build" || kind === "any" ? designDoc(projectDir(), task) : null;
      // The project's approved direction and the rules the user approved: the critic judges against them, and a fix that
      // would break one is labelled [OFF-DIRECTION] (it never lowers Fit or System), like a DESIGN.md rule.
      const memory = kind === "build" || kind === "any" || kind === "directions" ? projectContext({ task, maxChars: 1500 }) : null;
      const skills = relevantSkills(task);
      const prev = prevRounds.at(-1);
      const prevBlock = prev
        ? [
            `\nPREVIOUS ROUND (round ${prevRounds.length}: ${prev.verdict.toUpperCase()}, scores ${Object.entries(prev.scores).map(([k, v]) => `${k} ${v}`).join(", ")})`,
            `Worst then: ${prev.worst}`,
            `Fixes asked for:\n${prev.fixes.map((f, i) => `  ${i + 1}. ${f}`).join("\n")}`,
            "START your answer with a PROGRESS line per fix above: FIXED / PARTLY / NOT FIXED, from what you see. Then new problems. " +
              "Scores must reflect progress: an axis whose problems are fixed goes up unless something visibly got worse; do not swap in fresh nitpicks to hold a score down.",
          ].join("\n")
        : "";
      const id = `c${Date.now().toString(36)}`;
      const prompt = [
        `DRIP CRITIC REVIEW ${id} · kind: ${kind}`,
        KIND_BRIEF[kind],
        "",
        "THE BRIEF",
        briefBlock(task),
        task?.board?.chosen && kind === "build" ? `Chosen direction: ${task.board.chosen}` : "",
        doc
          ? `\nTHE LOCKED DIRECTION AND SYSTEM (${doc.rel}; the client chose this. Judge the build against it. A suggestion that breaks one of its rules, e.g. a second accent in a one-accent system, is allowed only labelled [OFF-DIRECTION] in FIXES and never lowers Fit or System):\n${doc.text.slice(0, 4000)}`
          : "",
        skills.length ? `\nTHE PRODUCT'S OWN RULES (Claude skills in this workspace; Read each SKILL.md and flag any violation as S1):\n${skills.map((k) => `- ${k.name}: ${k.file}`).join("\n")}` : "",
        memory?.approved
          ? `\nTHE PROJECT'S APPROVED DIRECTION AND RULES (approved by the user, style ${memory.approved.revision}; ${kind === "directions" ? "a direction that ignores them must justify itself as a redesign" : "judge the work against them. A suggestion that breaks one is allowed only labelled [OFF-DIRECTION] in FIXES"}):\n${memory.text}`
          : "",
        prevBlock,
        context ? `Context: ${context}` : "",
        kind === "build" ? behaviourBlock(task) : "",
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
        if (st.task) st.task.critic.pending = { id, kind, files, rev: artifactRev(st.task), at: new Date().toISOString(), blockers: measured.filter((m) => /BLOCKERS:/.test(m)).map((m) => m.split("BLOCKERS:")[1].split("\n")[0].trim()) };
      });
      // The brief goes to a file: the critic reads it, the director's context never carries it.
      const brief = writeBrief(`critic-${kind}`, prompt);
      return text(
        `Prepared ${id}: ${files.length} image(s) in ${dir}; the critic's brief is in ${brief}.\n\nNOW: launch the critic with exactly this call (do not add your opinion; you don't need to read the brief):\n${launchLine("critic", `Critic review ${kind}`, prompt, brief)}\n\n` +
          "Then critic_record the verdict and show the user the critic's own words.",
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
        'Example: critic_record({ kind: "build", verdict: "revise", scores: { concept: 6, typography: 4 }, worst: "the hero has nothing to look at: a headline on a flat ground", fixes: ["put the real product UI as layered cards beside the headline", "cut the three equal cards"], summary: "competent template, not a portfolio anyone remembers" })',
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
      // Fixes that would break an approved rule are marked, not applied blindly. The verdict is bound to what was reviewed.
      rec.fixes = offDirectionFixes(rec.fixes).map((m) => (m.off ? `[OFF-DIRECTION: breaks "${m.rule.topic}: ${m.rule.value}"] ${m.fix}` : m.fix));
      const r = { ...rec, at: new Date().toISOString(), measuredBlockers, rev: task?.critic?.pending?.rev || null };
      // The work changed while the critic was reviewing it: the verdict is about an older version.
      const movedOn = task && r.rev && r.rev !== artifactRev(task);
      const st = updateState((s) => {
        if (!s.task) return;
        s.task.critic.records.push(r);
        s.task.critic.pending = null;
      });
      if (rec.kind === "directions" && st.task?.board?.id && rec.perDirection) {
        if (loadBoard(st.task.board.id))
          updateBoard(
            st.task.board.id,
            (board) => {
              for (const pd of rec.perDirection) {
                const d = board.directions.find((x) => x.name.toLowerCase() === pd.name.toLowerCase());
                if (d) {
                  d.critic = `${pd.score}/10 · ${pd.verdict} — ${pd.note}`;
                  d.dropped = typeof pd.score === "number" && pd.score < (ctx.config().gates.minDirectionScore ?? 6); // the user sees only strong ideas
                }
              }
            },
            { op: "critic", summary: "ranking" },
          );
      }
      // The critic's opinion is evidence, never an approved rule: stored as feedback with its source.
      try {
        recordFeedback({ scope: rec.kind === "directions" ? "feature" : "page", source: "critic", kind: "critic", target: rec.kind, board: st.task?.board?.id, text: `${rec.verdict}: ${rec.summary} Worst: ${rec.worst}` });
      } catch {
        /* best effort */
      }
      const rounds = (st.task?.critic?.records || []).filter((x) => x.kind === rec.kind).length;
      const max = ctx.config().gates.maxCriticRounds;
      const next =
        rec.verdict === "pass"
          ? rec.kind === "directions"
            ? "NEXT: show the user the two strongest comps (Read the tile images and present them side by side, with the critic's ranking and your pick), ask them to choose with buttons, then board_choose. No moodboard page unless they ask (board_open)."
            : rec.kind === "build"
              ? "NEXT: fitcheck_done, then hand off (screenshots, scores, the critic's summary, what's left)."
              : "NEXT: continue."
          : rounds >= max + (st.task?.critic?.extraRounds || 0) && rec.kind === "build"
            ? `That's ${rounds} critic rounds, the limit. Fix what you can, then ask the user with AskUserQuestion: "Ship with these open points" (list them) or "One more critic round" (critic_prepare with extraRound: true). Don't stop silently.`
            : rec.verdict === "reject"
              ? "NEXT: start over on what was rejected (new concepts / directions), not cosmetic tweaks. Then prepare a new review."
              : "NEXT: fix the listed problems in order, re-render / re-shoot, and prepare a new review.";
      const stale = movedOn ? "\nWARNING: the work changed after critic_prepare, so this verdict is about the earlier version and does not count for the current one. critic_prepare again when you're done changing it." : "";
      return text(`Recorded critic verdict: ${rec.verdict.toUpperCase()} (${rec.kind}, round ${rounds}). Worst: ${rec.worst}${stale}\n${next}\nShow the user the critic's own summary and scores, not a softened version.`);
    }),
  );
}

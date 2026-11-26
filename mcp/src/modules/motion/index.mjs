// Drip Motion: motion-design films made in code (HTML + GSAP/CSS/canvas/three.js), rendered locally by seeking
// every frame. Tools: motion_refs (search motion references), motion_study (watch a film: sheet + measured
// rhythm and cuts), motion_storyboard (the plan, checked), motion_frames (look at the composition's real
// frames, the fit check of a film), motion_export (MP4/WebM). The director skill is drip-video.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { fetchImage, imageBlock, textBlock } from "../../core/images.mjs";
import { sheetInBrowser } from "../../core/imaging.mjs";
import { projectDir, projectDripDir } from "../../core/paths.mjs";
import { rendersDir, stamp } from "../../core/render.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadState, reconcileWorkspace, updateState } from "../../core/state.mjs";
import { artifactRev } from "../../core/evidence.mjs";
import { findFfmpeg, fmtT, judgeFrames, measureFrames, renderComposition, sampleVideo, sparkline } from "./capture.mjs";
import { compositionUrl, filmSheets, isVideo } from "./sheets.mjs";
import { ROLES, checkStoryboard, storyboardMd } from "./story.mjs";
import { analyzeTrace, dopesheet, onionSkin, stretches, traceComposition } from "./trace.mjs";
import { mastersWork, parseLikes, search24fps, searchDribbbleMotion, searchKisto, searchRelaxed } from "./refsources.mjs";
import { listing, shot as dribbbleShot, thumbUrl } from "../refs/dribbble.mjs";
import { registerAudio } from "./audio.mjs";
import { registerVoice } from "./voice.mjs";
import { mixGraph, soundTracks } from "./sound.mjs";
import { ensureRenderers, mux, renderWith } from "./renderers.mjs";

const motionOf = (task) => task?.motion || { studied: [], renders: [] };

/** Drip's own capture as a renderer test: used by ensureRenderers to time it against the others. */
export function dripTestRender(config) {
  return async (entry, out) => {
    const ffmpeg = await findFfmpeg();
    if (!ffmpeg) throw new Error("no ffmpeg");
    const url = await compositionUrl(entry);
    await renderComposition(url, { out, fps: 30, width: 1280, height: 720, ffmpeg, config });
  };
}

/** Start the one-time renderer setup in the background (the first film task); never blocks. */
export function startRendererSetup(config) {
  if (process.env.NODE_TEST_CONTEXT || process.env.DRIP_NO_RENDERER_SETUP) return; // tests and CI never install
  ensureRenderers({ renderDrip: dripTestRender(config) }).catch(() => {});
}

/** Trace a composition and draw its dopesheet and onion skins (shared with critic_prepare). */
export async function traceTarget(target, { from, to, fps, storyboard, config, maxOnions = 6 } = {}) {
  const fmt = storyboard?.format || {};
  const W = fmt.width || 1920;
  const H = fmt.height || 1080;
  const url = await compositionUrl(target);
  const D0 = fmt.duration;
  const a0 = from ?? 0;
  const span = (to ?? D0 ?? 10) - a0;
  const rate = fps || Math.min(fmt.fps || 30, span > 30 ? 15 : 30);
  // The onion skins' ghost frames: 8 per stretch.
  const parts = (from != null || to != null) && D0 ? [[a0, to ?? D0]] : storyboard ? stretches(D0 || 10, storyboard.beats || [], maxOnions) : null;
  const ghostTimes = (parts || []).flatMap(([a, b]) => Array.from({ length: 8 }, (_, i) => a + ((b - a) * i) / 7));
  let tr = await traceComposition(url, { from: a0, to, fps: rate, width: W, height: H, ghostTimes, config });
  if (!tr.probe) throw new Error("No clock in the page (see motion_frames for the seek contract).");
  const D = tr.probe.duration;
  const stretchesNow = parts || stretches(D, [], maxOnions);
  if (!parts) {
    // No storyboard: the duration is known only now; shoot the ghosts in a second pass.
    const gt = stretchesNow.flatMap(([a, b]) => Array.from({ length: 8 }, (_, i) => a + ((b - a) * i) / 7));
    tr = await traceComposition(url, { from: a0, to, fps: rate, width: W, height: H, ghostTimes: gt, config });
  }
  const beats = (storyboard?.beats || []).slice(1).map((b) => b.at);
  const a = analyzeTrace({ labels: tr.labels, times: tr.times, samples: tr.samples, width: W, beats });
  const sheet = await dopesheet({ labels: tr.labels, times: tr.times, speeds: a.speeds, segments: a.segments, samples: tr.samples, beats, config });
  const onions = [];
  for (const [s, e] of stretchesNow) onions.push({ from: s, to: e, buf: await onionSkin({ ghosts: tr.ghosts, labels: tr.labels, times: tr.times, samples: tr.samples, from: s, to: e, width: W, height: H, config }) });
  return { labels: tr.labels, a, sheet, onions, duration: D };
}

// Reference sources live in refsources.mjs (masters first, then open search with a quality floor).
export { relaxQuery } from "./refsources.mjs";

export function register(server, ctx) {
  registerAudio(server, ctx);
  registerVoice(server, ctx);
  server.registerTool(
    "motion_refs",
    {
      title: "Find motion design references (masters first)",
      description:
        "References for a film, best first. MASTERS: the studios and designers whose work is the bar (TimeFrame and others in Drip's vetted list), picked by the kind of film your queries describe (product launch, UI motion, brand film, explainer, kinetic type, 3D product, abstract, logo); their Dribbble video shots and Kisto pieces. " +
        "Then open search with a quality floor: Dribbble's animation category (video shots, no paid boosts, 40+ likes, best liked first) and Kisto (curated studio motion; AI-generated clips dropped). 24fps.dev (indie films made in code) only with source \"24fps\": for how something is built, never for taste. " +
        "Returns ONE numbered poster sheet and a list with each film's playable video. Then motion_study the 1-3 that fit. Search the IDEA and the MOVES, not the product: \"product launch ui motion\", \"shape morph transition\", \"kinetic typography\". Name a designer to see their work: designers: [\"TimeFrame_motion\"]. " +
        'Example: motion_refs({ queries: ["saas product launch", "ui motion continuous"] })',
      inputSchema: {
        queries: z.array(z.string()).min(1).max(4).describe("1-4 searches, run at once"),
        source: z.enum(["best", "masters", "dribbble", "kisto", "24fps"]).optional().describe("Default best: masters, then Dribbble and Kisto with the quality floor"),
        designers: z.array(z.string()).max(4).optional().describe("Dribbble usernames to pull video shots from (e.g. one the user named)"),
        per: z.number().int().min(2).max(12).optional().describe("Results per source and query (default 6)"),
        minLikes: z.number().int().min(0).optional().describe("Dribbble like floor (default 40)"),
      },
    },
    safe(async ({ queries, source = "best", designers = [], per = 6, minLikes = 40 }) => {
      const config = ctx.config();
      const errs = [];
      const tryIt = (label, p) => p.catch((e) => (errs.push(`${label}: ${e.message}`), []));
      const groups = [];
      if (designers.length)
        for (const u of designers)
          groups.push(
            await tryIt(
              `dribbble ${u}`,
              listing("designer", { username: u }, config).then((r) => r.cards.filter((c) => c.video).map((c) => ({ from: "dribbble", master: c.designer || u, title: c.title, creator: c.designer || u, url: c.url, poster: c.image ? thumbUrl(c.image, 400, 300) : null, video: c.video, likes: parseLikes(c.likes), tags: ["animation"] })).sort((x, y) => y.likes - x.likes).slice(0, per * 2)),
            ),
          );
      if (["best", "masters"].includes(source)) groups.push(await tryIt("masters", mastersWork(queries, { config, per: Math.max(2, Math.ceil(per / 2)) })));
      if (["best", "dribbble"].includes(source)) for (const q of queries.slice(0, 2)) groups.push(await tryIt(`dribbble "${q}"`, searchDribbbleMotion(q, { per, minLikes, config })));
      if (["best", "kisto"].includes(source)) groups.push(...(await Promise.all(queries.map((q) => tryIt(`kisto "${q}"`, searchRelaxed(searchKisto, q, per))))));
      if (source === "24fps") groups.push(...(await Promise.all(queries.map((q) => tryIt(`24fps "${q}"`, searchRelaxed(search24fps, q, per))))));
      const seen = new Set();
      let items = groups.flat().filter((it) => it.url && it.video && !seen.has(it.url) && seen.add(it.url));
      // In the default mode masters lead; open search adds a few, to be judged before use.
      if (source === "best") {
        const top = items.filter((it) => it.master);
        const open = items.filter((it) => !it.master).slice(0, top.length >= 6 ? 6 : 12);
        items = [...top, ...open.map((it) => ({ ...it, open: true }))];
      }
      if (!items.length) return text(`Nothing found.${errs.length ? ` ${errs.join("; ")}` : ""} Try broader words (the kind of film or a technique), or source "masters".`, true);
      const list = items.slice(0, 24);
      const imgs = await Promise.all(list.map((it) => (it.poster ? fetchImage(it.poster).then((r) => r.buf).catch(() => null) : null)));
      const sheet = await sheetInBrowser(imgs, { cols: 6, tileW: 300, tileH: 169, config });
      updateState((st) => {
        if (st.task) (st.task.motion ||= { studied: [], renders: [] }).searched = [...(st.task.motion.searched || []), ...queries].slice(-20);
      });
      const lines = list.map(
        (it, i) =>
          `${i + 1}. ${it.master ? `[MASTER: ${it.master}] ` : `[${it.from}${it.open ? ", open search: judge before using" : ""}] `}${it.title}${it.creator && it.creator !== it.master ? ` — ${it.creator}` : ""}${it.likes ? ` · ${it.likes} likes` : ""}${it.seconds ? ` · ${it.seconds}s` : ""}${it.tags?.length ? ` · ${it.tags.slice(0, 5).join(", ")}` : ""}\n   ${it.url}\n   video: ${it.video}${it.code ? `\n   code: ${it.code}` : ""}`,
      );
      const masters = [...new Set(list.filter((it) => it.master && it.style).map((it) => `${it.master}: ${it.style}`))];
      return blocks([
        textBlock(
          `${list.length} films, best first (sheet numbers = list numbers).${errs.length ? ` Skipped: ${errs.join("; ")}.` : ""}\n` +
            (masters.length ? `MASTERS here and why they are the bar:\n${masters.map((m) => `- ${m}`).join("\n")}\n` : "") +
            `${lines.join("\n")}\n\n` +
            "NEXT: motion_study the 1-3 that best fit (pass its video URL or the Dribbble shot URL, and a role: moves / look / story / sound). Prefer masters' work; an open-search result earns its place only if it is as good. Study the moves, never copy a film's frames, characters or copy; credit what you learned from in the hand-off.",
        ),
        imageBlock(sheet),
      ]);
    }),
  );

  server.registerTool(
    "motion_study",
    {
      title: "Watch a film and measure it",
      description:
        "Watch a reference film (a video URL from motion_refs, a local .mp4/.webm, or a web page with a <video>) or your own render: it seeks through the video and returns a timestamped contact sheet plus what it measured: duration, hard cuts and the average shot length, still stretches, and a rhythm line of how much changes per moment. " +
        "Measured is measured; easing curves, layers and intent are your reading of the frames: say which is which. Studying a MOVES reference (how things enter, transform, connect) is required before motion_storyboard. " +
        'Example: motion_study({ source: "https://cdn.kisto.app/previews/v2/<id>.webm", role: "moves" }) · motion_study({ source: "film/out/launch.mp4" }) to check your render',
      inputSchema: {
        source: z.string().describe("Video URL, local video file, or page URL with a video"),
        role: z.enum(ROLES).optional().describe("What you study it for: moves (choreography, transitions, timing), look (type, colour, composition), story (structure, hook), sound"),
        every: z.number().min(0.1).max(10).optional().describe("Seconds between samples (default: ~100 samples over the film)"),
      },
    },
    safe(async ({ source, role, every }) => {
      const config = ctx.config();
      let abs = /^https?:/i.test(source) ? source : path.resolve(projectDir(), source);
      // A Dribbble shot page: play its full video (the listing gives a small teaser).
      const shotId = String(source).match(/dribbble\.com\/shots\/(\d+)/)?.[1];
      if (shotId) {
        const sh = await dribbbleShot(shotId, config).catch(() => null);
        if (sh?.videos?.length) abs = sh.videos[0];
        else return text(`That Dribbble shot has no video I can reach (or Dribbble is rate-limiting). Use the video URL motion_refs listed for it.`, true);
      }
      const r = await sampleVideo(abs, { every, max: 100, config });
      if (!r.frames.length) return text(`Could not play a video at ${source} (no duration). For Vimeo/YouTube pages, use the film's direct preview (motion_refs gives one) or a downloaded file the user provides.`, true);
      const m = await measureFrames(r.frames.map((f) => f.buf), { config });
      const ts = r.frames.map((f) => f.t);
      const j = judgeFrames(ts, m);
      // The sheet: every shot's first frame, topped up with even samples, at most 24.
      const pick = new Set([0]);
      for (const c of j.cuts) pick.add(ts.indexOf(c));
      const step = Math.max(1, Math.floor(ts.length / 24));
      for (let i = 0; i < ts.length && pick.size < 24; i += step) pick.add(i);
      const idx = [...pick].filter((i) => i >= 0).sort((a, b) => a - b).slice(0, 24);
      const ar = 16 / 9;
      const sheet = await sheetInBrowser(idx.map((i) => r.frames[i].buf), { cols: 6, tileW: 300, tileH: Math.round(300 / ar), labels: idx.map((i) => `${fmtT(ts[i])}${j.cuts.includes(ts[i]) ? " ✂" : ""}`), fit: "contain", config });
      const dir = rendersDir(`study-${stamp()}`);
      const file = path.join(dir, "sheet.jpg");
      fs.writeFileSync(file, sheet);
      const shots = j.cuts.length + 1;
      const asl = r.duration / shots;
      const studied = { source, role: role || null, duration: +r.duration.toFixed(2), cuts: j.cuts.length, asl: +asl.toFixed(2), at: new Date().toISOString() };
      updateState((st) => {
        if (st.task) {
          const mo = (st.task.motion ||= { studied: [], renders: [] });
          mo.studied = [...(mo.studied || []).filter((s) => s.source !== source), studied].slice(-20);
        }
      });
      // Per-second energy for the rhythm line.
      const perSec = [];
      for (let s = 0; s < Math.ceil(r.duration); s++) {
        const vals = j.energy.filter((_, k) => ts[k + 1] >= s && ts[k + 1] < s + 1);
        perSec.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
      }
      return blocks([
        textBlock(
          `MEASURED: ${r.duration.toFixed(1)}s, ${shots} shot${shots > 1 ? "s" : ""} (${j.cuts.length} hard cut${j.cuts.length === 1 ? "" : "s"}${j.cuts.length ? ` at ${j.cuts.slice(0, 12).map(fmtT).join(", ")}` : ""}), average shot ${asl.toFixed(1)}s.\n` +
            `Rhythm (change per second): ${sparkline(perSec)}\n` +
            (j.holds.length ? `Still stretches: ${j.holds.map(([a, b]) => `${fmtT(a)}-${fmtT(b)}`).join(", ")}\n` : "") +
            (j.issues.length ? `Flags: ${j.issues.join("; ")}\n` : "") +
            `Sheet: ${file} (✂ = a hard cut lands on that frame).\n\n` +
            "Now READ it like a motion designer (inferred, say so): the one idea it communicates; what the eye follows; how things enter, transform and leave; what carries across each transition; where it rests; how the timing feels (snappy, floaty, weighty). Then name 1-3 techniques you take, and what would be wrong to take for this brief. Those go in motion_storyboard's references (take).",
        ),
        imageBlock(sheet),
      ]);
    }),
  );

  server.registerTool(
    "motion_storyboard",
    {
      title: "Record the film's storyboard",
      description:
        "The plan of the film, recorded before any composition is written (composition files are held until it exists). Checked: at least one studied reference with what you take from it, no AI-slop copy (errors); gaps, a late hook, no rest, all cuts/fades, too many words per beat, no motif (warnings). " +
        "Write actions as concrete verbs with a cause (\"the cursor drags the card; the grid closes the gap behind it\"), never adjectives (\"dynamic, engaging\"). Re-record it after the user changes the plan; the critic judges against it. " +
        'Example: motion_storyboard({ concept: "47 scattered tabs fold themselves into one calm window", hook: "a wall of tabs shudders and snaps into a single line", motif: "the tab shape", format: { width: 1920, height: 1080, fps: 30, duration: 20 }, look: "warm off-white ground, ink black, one coral accent; Inter Display tight", moves: "tabs are paper: light, slight overshoot, settle fast; camera pulls back to reveal scale", beats: [{ at: 0, len: 2.5, action: "tabs pile in from every edge and shudder", text: "You have 47 tabs open.", energy: 4 }, ...], references: [{ source: "<video url>", role: "moves", take: "the trailing edge of each shape springs later than the leading edge" }] })',
      inputSchema: {
        concept: z.string().describe("The one visual idea (a metaphor, not a feature list)"),
        hook: z.string().describe("What happens in the first ~2 seconds that makes someone keep watching"),
        motif: z.string().optional().describe("The object or shape that persists and changes meaning through the film"),
        format: z.object({ width: z.number().int(), height: z.number().int(), fps: z.number().int().min(12).max(120), duration: z.number().positive() }),
        look: z.string().describe("Palette, type, materials, ground"),
        moves: z.string().describe("The motion language: physics and weight, easing character per material, how compositions connect, camera"),
        sound: z.string().optional().describe("Music feel and tempo, where the accents land; 'silent' is a choice"),
        beats: z.array(
          z.object({
            at: z.number().min(0),
            len: z.number().positive(),
            action: z.string().describe("Concrete verbs: what moves, what it causes"),
            text: z.string().optional().describe("On-screen copy, if any"),
            transition: z.string().optional().describe("How this beat arrives from the last one (morph, match cut, push, mask wipe...)"),
            energy: z.number().int().min(1).max(5).optional(),
            sound: z.string().optional(),
          }),
        ).min(1),
        references: z.array(z.object({ source: z.string(), role: z.enum(ROLES), take: z.string(), given: z.boolean().optional().describe("The user supplied it") })),
        file: z.string().optional().describe("Where the composition will live (e.g. film/launch/index.html)"),
      },
    },
    safe(async (sb) => {
      const { task } = loadState();
      const r = checkStoryboard(sb, { studied: motionOf(task).studied || [] });
      if (r.errors.length) return text(`Storyboard not recorded:\n${r.errors.map((e) => `- ${e}`).join("\n")}`, true);
      const dir = path.join(projectDripDir(), "motion", task?.id || "draft");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "storyboard.md");
      fs.writeFileSync(file, storyboardMd(sb));
      updateState((st) => {
        if (st.task) {
          const mo = (st.task.motion ||= { studied: [], renders: [] });
          mo.storyboard = { ...sb, at: new Date().toISOString(), version: (mo.storyboard?.version || 0) + 1 };
        }
      });
      const bounds = r.beats.slice(1).map((b) => b.at);
      return text(
        `Storyboard recorded (${r.beats.length} beats, ${r.duration}s): ${path.relative(projectDir(), file)}.\n` +
          (r.warnings.length ? `Consider:\n${r.warnings.map((w) => `- ${w}`).join("\n")}\n` : "") +
          `\nNEXT: style frames first: build the 2-3 hardest frames (the hook, the biggest transformation, the end card) as still states of the composition and motion_frames({ target, times: [...] }) them. Then the whole timeline, then motion_frames (the full sweep) and motion_frames({ target, around: [${bounds.slice(0, 8).join(", ")}] }) for the transitions.`,
      );
    }),
  );

  server.registerTool(
    "motion_frames",
    {
      title: "Look at a composition's real frames",
      description:
        "The fit check of a film. Opens the composition (a local .html or URL with a seekable clock: window.__drip.seek(t), window.seek(t), a paused GSAP timeline as window.__tl, HyperFrames' __timelines, or CSS animations), seeks to each time and returns a timestamped sheet, plus automatic checks: page errors and missing files, blank frames, text clipped at the frame edge, flicker (dense ranges), hard changes and still stretches. " +
        "With no times it sweeps the whole film (16 frames): a clean sweep on the current files is what lets the turn end and the task close. around: [t...] shoots each transition at -0.25/-0.1/0/+0.1/+0.25s (inspect the whole morph, not its ends); from/to/step shoots a fast stretch frame by frame. Also works on a rendered .mp4. " +
        'Examples: motion_frames({ target: "film/launch/index.html" }) · motion_frames({ target: "film/launch/index.html", around: [2.5, 7] }) · motion_frames({ target: "film/launch/index.html", from: 6.8, to: 7.4, step: 0.0333 })',
      inputSchema: {
        target: z.string(),
        times: z.array(z.number()).optional(),
        around: z.array(z.number()).optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        step: z.number().positive().optional(),
        count: z.number().int().min(4).max(48).optional().describe("Frames in a sweep (default 16)"),
      },
    },
    safe(async ({ target, times, around, from, to, step, count }) => {
      const config = ctx.config();
      reconcileWorkspace(); // edits no hook saw (drip_kit, a shell) belong to the version being checked
      const { task } = loadState();
      const fmt = motionOf(task).storyboard?.format;
      const sweep = !times?.length && !around?.length && from == null && to == null;
      const r = await filmSheets(target, { times: { times, around, from, to, step, count: count || 16 }, width: fmt?.width, height: fmt?.height, dense: !!step && step <= 0.05, config });
      const dir = rendersDir(`frames-${stamp()}`);
      const files = r.sheets.map((b, i) => {
        const f = path.join(dir, `sheet-${i + 1}.jpg`);
        fs.writeFileSync(f, b);
        return f;
      });
      const issues = [...r.errors.map((e) => `page: ${e}`), ...r.judge.issues, ...(r.clipped.length ? [`text cut by the frame edge at ${r.clipped.slice(0, 4).join("; ")}`] : [])];
      const D = r.probe?.duration;
      const notes = [...r.judge.notes];
      if (fmt?.duration && D && Math.abs(fmt.duration - D) > 0.25 && !isVideo(target)) issues.push(`the composition says ${D.toFixed(2)}s, the storyboard ${fmt.duration}s`);
      const clean = !issues.length;
      updateState((st) => {
        if (!st.task) return;
        const now = new Date().toISOString();
        const rev = artifactRev(st.task);
        st.task.fitcheck.shots = (st.task.fitcheck.shots || 0) + 1;
        st.task.fitcheck.lastShotAt = now;
        st.task.fitcheck.shotRev = rev;
        if (sweep && clean && !isVideo(target)) {
          st.task.fitcheck.doneAt = now;
          st.task.fitcheck.doneRev = rev;
        }
        const mo = (st.task.motion ||= { studied: [], renders: [] });
        mo.frames = { at: now, rev, sweep, clean, target };
      });
      const head = issues.length ? `PROBLEMS (fix, then sweep again):\n${issues.map((x) => `- ${x}`).join("\n")}` : sweep ? "No measured problems: the sweep is recorded for this version." : "No measured problems in these frames (a range or transition check; the full sweep is what records the check).";
      return blocks([
        textBlock(
          `${head}\nClock: ${r.probe?.via}${D ? `, ${D.toFixed(2)}s` : ""}. ${notes.join(". ")}${notes.length ? "." : ""}\nRhythm: ${sparkline(r.judge.energy)}\nSheets: ${files.join(", ")}\n\n` +
            "LOOK at every tile as a frame someone pauses on: is there one clear focal point, is the type set well at this size, does each transition carry something across, is anything half-drawn or colliding mid-move? Then fix and look again.",
        ),
        ...r.sheets.map((b) => imageBlock(b)),
      ]);
    }),
  );

  server.registerTool(
    "motion_trace",
    {
      title: "Measure how things move",
      description:
        "Stills can't show motion; this measures it. Samples the composition every frame and reads each element's position, size and opacity from the page (elements with an id or data-track). Returns: a DOPESHEET (a lane per element: when it moves, its speed curve, its opacity, against the storyboard's beats: stagger, overlap, rest and simultaneity at a glance), ONION SKINS per beat (frames ghosted over each other plus each element's measured path, one dot per frame: even dots = linear, bunching = easing, a dot past the end = overshoot, straight where an arc was meant = mechanical), and measured flags: stops dead, linear moves, hitches, 4+ things starting on one frame, one duration for every move, mostly fades, overshoot %, how much of the film is still, beats where nothing starts. " +
        "Use it on every beat you build or change, before the critic. Give important elements data-track=\"name\" for readable lanes. " +
        'Examples: motion_trace({ target: "film/index.html" }) · motion_trace({ target: "film/index.html", from: 2, to: 4.6 })',
      inputSchema: {
        target: z.string().describe("The composition (.html or URL). Not a rendered video: it reads the page"),
        from: z.number().optional(),
        to: z.number().optional(),
        fps: z.number().int().min(10).max(60).optional().describe("Samples per second (default the film's fps, max 30 over long spans)"),
      },
    },
    safe(async ({ target, from, to, fps }) => {
      if (isVideo(target)) return text("motion_trace reads the composition's page (element positions), not a video. Pass the .html; for a video use motion_study.", true);
      const config = ctx.config();
      const { task } = loadState();
      const r = await traceTarget(target, { from, to, fps, storyboard: motionOf(task).storyboard, config });
      const dir = rendersDir(`trace-${stamp()}`);
      const files = [];
      const save = (name, buf) => {
        const f = path.join(dir, name);
        fs.writeFileSync(f, buf);
        files.push(f);
        return buf;
      };
      save("dopesheet.png", r.sheet);
      r.onions.forEach((o, i) => save(`onion-${i + 1}.png`, o.buf));
      updateState((st) => {
        if (st.task) (st.task.motion ||= { studied: [], renders: [] }).trace = { at: new Date().toISOString(), rev: artifactRev(st.task), flags: r.a.flags.length };
        if (st.task) st.task.motion.traceMoves = r.a.segments.filter((x) => x.travel > 20).map((x) => [x.from, x.to]).slice(0, 300);
      });
      return blocks([
        textBlock(
          `${r.a.flags.length ? `FLAGS (measured):\n${r.a.flags.map((f) => `- ${f}`).join("\n")}` : "No measured motion flags."}\n${r.a.notes.join(". ")}.\n` +
            `${r.a.segments.length} moves on ${new Set(r.a.segments.map((s) => s.k)).size} of ${r.labels.length} tracked elements, sampled at ${Math.round(1 / r.a.dt)} fps.\nFiles: ${files.join(", ")}\n\n` +
            "Read the dopesheet for choreography (who leads, who follows, where it rests) and each onion skin for spacing and arcs. Measured is measured; whether a move feels right is your call, and the flags are contextual (a linear move can be a deliberate mechanical feel).",
        ),
        imageBlock(r.sheet, "image/png"),
        ...r.onions.map((o) => imageBlock(o.buf, "image/png")),
      ]);
    }),
  );

  server.registerTool(
    "motion_export",
    {
      title: "Render the film to video",
      description:
        "Renders a composition frame by frame (each frame a seek, never real-time playback, so it is exact and repeatable) and encodes it with ffmpeg: MP4 (H.264), or WebM with transparency (alpha: true). draft: true renders half size at 15 fps for a quick look at the movement. " +
        "engine auto (default): on the first film Drip installs the renderers itself into ~/.drip/vendor (Kinetograph >=0.4.0-rc.1: GPU, no browser, carries FFmpeg; FrameVelo; HyperFrames), test-renders a 1s clip with each and keeps the fastest that works; never asks the user. Fallbacks run in measured order, Drip's own Chrome capture last. Drafts, ranges and alpha always use Drip's capture. The film's music, effects and narration are mixed on afterwards. " +
        "After rendering, motion_study the file: the final check is on the video itself. " +
        'Example: motion_export({ target: "film/launch/index.html", out: "film/launch/out/launch.mp4", audio: "film/launch/assets/music.mp3" })',
      inputSchema: {
        target: z.string(),
        out: z.string().optional().describe("Default <composition folder>/out/<name>.mp4 (.webm with alpha)"),
        fps: z.number().int().min(12).max(120).optional(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        audio: z.string().optional().describe("A music/sound file mixed under the picture"),
        alpha: z.boolean().optional(),
        draft: z.boolean().optional(),
        engine: z.enum(["auto", "kinetograph", "framevelo", "hyperframes", "drip"]).optional().describe("Default auto: the renderer this machine picked on its first film (fastest that worked), falling back through the rest"),
      },
    },
    safe(async ({ target, out, fps, width, height, from = 0, to, audio, alpha, draft, engine = "auto" }) => {
      const config = ctx.config();
      const { task } = loadState();
      const fmt = motionOf(task).storyboard?.format || {};
      const abs = /^https?:/i.test(target) ? null : path.resolve(projectDir(), target);
      const base = abs ? path.basename(abs).replace(/\.[^.]+$/, "") : "film";
      const name = base === "index" && abs ? path.basename(path.dirname(abs)) : base;
      const outFile = path.resolve(projectDir(), out || path.join(abs ? path.dirname(abs) : projectDir(), "out", `${name}${draft ? "-draft" : ""}.${alpha ? "webm" : "mp4"}`));
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      // Partial, draft and transparent renders need per-frame control: Drip's own capture does those.
      const special = alpha || draft || from > 0 || to != null || /^https?:/i.test(target);
      if (engine !== "drip" && !special) {
        if (!abs) return text("The external renderers render a local composition file: pass its path.", true);
        let order = [engine];
        if (engine === "auto") {
          const choice = await ensureRenderers({ renderDrip: dripTestRender(config) });
          order = choice.order?.length ? choice.order : ["drip"];
        }
        const fails = [];
        for (const eng of order) {
          if (eng === "drip") break;
          const tmp = outFile.replace(/(\.[^.]+)$/, `.${eng}-video$1`);
          const r = await renderWith(eng, abs, tmp);
          if (!r.ok) {
            fails.push(`${eng}: ${r.why}`);
            continue;
          }
          const tracks = audio ? [{ file: audio, kind: "music", start: 0 }] : soundTracks(motionOf(task).sound).filter((tr) => fs.existsSync(path.resolve(projectDir(), tr.file)));
          if (tracks.length) {
            const ff = await findFfmpeg();
            if (!ff) {
              fs.renameSync(tmp, outFile);
              return text(`Rendered ${path.relative(projectDir(), outFile)} with ${eng} in ${(r.ms / 1000).toFixed(0)}s, WITHOUT sound: no ffmpeg found to mix it.`);
            }
            const D = fmt.duration || 600;
            await mux(ff, tmp, { files: tracks.map((tr) => path.resolve(projectDir(), tr.file)), graph: mixGraph(tracks, { duration: D }) }, outFile);
            fs.rmSync(tmp, { force: true });
          } else fs.renameSync(tmp, outFile);
          updateState((st) => {
            if (st.task) {
              const mo = (st.task.motion ||= { studied: [], renders: [] });
              mo.renders = [...(mo.renders || []), { file: path.relative(projectDir(), outFile), engine: eng, draft: false, at: new Date().toISOString(), rev: artifactRev(st.task) }].slice(-10);
            }
          });
          return text(
            `Rendered ${path.relative(projectDir(), outFile)} with ${eng} in ${(r.ms / 1000).toFixed(0)}s${tracks.length ? `, ${tracks.length} sound track(s) mixed` : ""}.${fails.length ? `\n(${fails.join("; ")})` : ""}\n` +
              `NEXT: motion_study({ source: "${path.relative(projectDir(), outFile).replace(/\\/g, "/")}" }) to check the video itself, then show the user the file.`,
          );
        }
        if (fails.length && engine !== "auto") return text(`${engine} failed:\n${fails.join("\n")}\nengine "auto" falls back through the other renderers.`, true);
        // Everything external failed (or Drip's capture won the test): render with Drip's own capture below.
      }
      const ffmpeg = await findFfmpeg();
      if (!ffmpeg) return text("ffmpeg isn't installed. Ask the user to install it (winget install ffmpeg / brew install ffmpeg), or run `drip doctor --install ffmpeg` (a static build, ~70 MB, in ~/.drip/vendor). Meanwhile motion_frames shows the frames.", true);
      const W = width || fmt.width || 1920;
      const H = height || fmt.height || 1080;
      const F = fps || fmt.fps || 30;
      const url = await compositionUrl(target);
      // The film's own sound (music ducked under narration, cues), unless one plain audio file was passed.
      let mixFor = null;
      const tracks = audio ? [] : soundTracks(motionOf(task).sound).filter((tr) => fs.existsSync(path.resolve(projectDir(), tr.file)));
      if (tracks.length && !alpha) {
        const filmLen = Math.min(to ?? fmt.duration ?? 600, fmt.duration ?? 600) - from;
        mixFor = { files: tracks.map((tr) => path.resolve(projectDir(), tr.file)), graph: mixGraph(tracks.map((tr) => ({ ...tr, start: Math.max(0, tr.start - from) })), { duration: filmLen }) };
      }
      const r = await renderComposition(url, {
        out: outFile,
        fps: draft ? Math.min(15, F) : F,
        width: draft ? Math.round(W / 2) : W,
        height: draft ? Math.round(H / 2) : H,
        from,
        to,
        duration: fmt.duration,
        audio: audio ? path.resolve(projectDir(), audio) : undefined,
        mix: mixFor,
        alpha,
        ffmpeg,
        config,
      });
      updateState((st) => {
        if (st.task) {
          const mo = (st.task.motion ||= { studied: [], renders: [] });
          mo.renders = [...(mo.renders || []), { file: path.relative(projectDir(), outFile), draft: !!draft, at: new Date().toISOString(), rev: artifactRev(st.task) }].slice(-10);
        }
      });
      return text(
        `Rendered ${path.relative(projectDir(), r.file)}: ${r.frames} frames in ${r.seconds.toFixed(0)}s${draft ? " (draft: half size, 15 fps)" : ""}${mixFor ? `, with ${tracks.length} sound track(s) mixed (music ducked under the voice)` : ""}.\n` +
          `NEXT: motion_study({ source: "${path.relative(projectDir(), r.file).replace(/\\/g, "/")}" }) to check the video itself (cuts where you meant them, no blank or held frames), then show the user the file.`,
      );
    }),
  );
}

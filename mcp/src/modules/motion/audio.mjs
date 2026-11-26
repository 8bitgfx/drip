// The film's sound: music (found, analysed, placed), a few calm UI sounds, and narration (voice.mjs). All of it is
// recorded on the task (task.motion.sound) and mixed by motion_export. Files are copied into <film>/sound/ with
// their licence written to sound/LICENCES.md, so the project carries its own usage rights.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { getKey, logUsage } from "../../core/keys.mjs";
import { imageBlock, textBlock } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { fmtT } from "./capture.mjs";
import { alignToMusic, analyseMusic, musicChartHtml } from "./music.mjs";
import { checkCues, loadCatalogue, motionFit, musicQueries, placeCue, searchCatalogue, searchJamendo, searchOpenverse } from "./sound.mjs";
import { drawPage } from "./trace.mjs";
import { relaxQuery } from "./refsources.mjs";

/** The film's folder: where the storyboard says the composition lives, else film/. */
export function filmDir(task) {
  const f = task?.motion?.storyboard?.file;
  return path.resolve(projectDir(), f ? path.dirname(f) : "film");
}

/** Copy or download a sound into <film>/sound/ and note its licence. Returns the project-relative path. */
export async function bringSound(task, source, { name, licence, credit, url } = {}) {
  const dir = path.join(filmDir(task), "sound");
  fs.mkdirSync(dir, { recursive: true });
  const base = String(name || path.basename(String(source).split("?")[0]) || "sound")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .slice(0, 60);
  const ext = path.extname(base) || path.extname(String(source).split("?")[0]) || ".mp3";
  const file = path.join(dir, base.endsWith(ext) ? base : `${base}${ext}`);
  if (!fs.existsSync(file)) {
    if (/^https?:/i.test(source)) fs.writeFileSync(file, (await get(source, { as: "buffer", ttlMs: 30 * 24 * 3600e3, timeoutMs: 120000, headers: { "User-Agent": "drip-design-plugin" } })).body);
    else fs.copyFileSync(path.resolve(projectDir(), source), file);
  }
  const lic = path.join(dir, "LICENCES.md");
  const line = `- ${path.basename(file)}: ${licence || "UNKNOWN: check before publishing"}${credit ? ` · ${credit}` : ""}${url ? ` · ${url}` : ""}`;
  const prev = fs.existsSync(lic) ? fs.readFileSync(lic, "utf8") : "# Sound licences\n\nEvery sound in this folder, where it came from and the terms it may be used under.\n\n";
  if (!prev.includes(`- ${path.basename(file)}:`)) fs.writeFileSync(lic, `${prev}${line}\n`);
  return path.relative(projectDir(), file).replace(/\\/g, "/");
}

const soundOf = (task) => task?.motion?.sound || { cues: [], voice: [] };

export function registerAudio(server, ctx) {
  server.registerTool(
    "motion_music",
    {
      title: "Find, read and place the film's music",
      description:
        "Music drives a launch film: pick it BEFORE choreographing when it carries the story. " +
        "action search: licensed tracks from Openverse (Jamendo and others; each with its licence and attribution; check the terms) — or use a track the user gives you. " +
        "action analyse: decodes a track and measures it: tempo (BPM), beat grid, bars, sections by energy, builds and DROPS, quiet bars; returns a chart, and if a storyboard exists, how far each beat boundary sits from a bar line. Put the biggest transformation on the drop, scene changes on bar lines, rests in the quiet bars. " +
        "action use: copies the track into <film>/sound/ with its licence and sets it as the film's music (gainDb, from = where in the track to start, fadeOut seconds). motion_export mixes it. " +
        "action generate (fallback, only when the user asks; pass userAsked): Eleven Music with a composition plan timed to the storyboard (exact section lengths, the drop where the big moment is, instrumental, negative styles), then analyse it like any track. Suno has no public API: a track made there comes in with action use. " +
        'Examples: motion_music({ action: "search", query: "minimal electronic upbeat" }) · motion_music({ action: "analyse", source: "film/sound/track.mp3" }) · motion_music({ action: "use", source: "<url>", licence: "CC BY 4.0", credit: "Artist – Title (Jamendo)", from: 12.5, gainDb: -6, fadeOut: 1.5 })',
      inputSchema: {
        action: z.enum(["search", "analyse", "use", "generate"]),
        userAsked: z.string().optional().describe("generate only: the user's own words asking for a generated track, quoted. Found music comes first; generation is the fallback"),
        plan: z
          .array(z.object({ seconds: z.number().min(3).max(120), what: z.string().describe("What the music does here: 'soft pulse, filtered synth, building', 'the drop: full drums and bass', 'resolve, piano and pad, ends cleanly'"), styles: z.array(z.string()).optional() }))
          .optional()
          .describe("generate: sections that follow the storyboard (the drop where the big moment is)"),
        styles: z.array(z.string()).optional().describe("generate: global styles: genre, mood, instruments, '112 BPM', 'D minor'"),
        avoid: z.array(z.string()).optional().describe("generate: what to keep out: 'vocals', 'cheesy corporate ukulele', 'big risers'"),
        query: z.string().optional(),
        feel: z.enum(["calm", "upbeat"]).optional().describe("search: default calm (ambient, minimal electronic, piano, lo-fi, soft cinematic at a slow-to-medium pulse: the motion-design bed); upbeat for an energetic launch the user asked for"),
        vocals: z.enum(["no", "any"]).optional().describe("search: default no (instrumental only); any when the user wants a song with words"),
        source: z.string().optional().describe("A file in the project or an audio URL"),
        licence: z.string().optional(),
        credit: z.string().optional(),
        gainDb: z.number().optional(),
        from: z.number().optional().describe("Start this many seconds into the track (e.g. so the drop meets the film's big moment)"),
        fadeOut: z.number().optional(),
      },
    },
    safe(async ({ action, query, feel = "calm", vocals = "no", source, licence, credit, gainDb = -4, from = 0, fadeOut = 1.5, userAsked, plan, styles = [], avoid = [] }) => {
      const config = ctx.config();
      const { task } = loadState();
      if (action === "generate") {
        if (!userAsked) return text("Found music comes first (motion_music search, or a track the user owns). Generate only when the user asks for it: pass userAsked with their words.", true);
        const key = getKey("elevenlabs");
        if (!key) return text("No ElevenLabs key (it is set on /drip:settings → API keys). Suno has no public API; a track the user makes there can come in as a file (action use).", true);
        if (!plan?.length) return text("Pass plan: the sections in order, timed to the storyboard (seconds + what the music does), e.g. [{ seconds: 6, what: 'soft pulse, building' }, { seconds: 8, what: 'the drop: full drums' }, { seconds: 5, what: 'resolve and end cleanly' }].", true);
        // A composition plan (music_v2_5 chunks): exact section lengths, so the drop lands where the picture needs it.
        const body = {
          model_id: "music_v2_5",
          composition_plan: {
            chunks: plan.map((p) => ({ text: `${p.what}. Instrumental, no vocals.`, duration_ms: Math.round(p.seconds * 1000), positive_styles: [...styles, ...(p.styles || [])], negative_styles: ["vocals", "spoken words", ...avoid] })),
          },
        };
        const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", { method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(600000) });
        if (!res.ok) return text(`Eleven Music failed (${res.status}): ${(await res.text()).slice(0, 300)}`, true);
        const dir = path.join(filmDir(task), "sound");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `music-generated-${Date.now().toString(36)}.mp3`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        logUsage({ provider: "elevenlabs", kind: "music", seconds: plan.reduce((s, p) => s + p.seconds, 0) });
        const rel = await bringSound(task, file, { licence: "Generated with ElevenLabs Eleven Music on the user's plan (check its music terms: film/TV use may need Enterprise)", credit: `asked: "${userAsked.slice(0, 80)}"` });
        return text(`Generated ${rel} (${plan.reduce((s, p) => s + p.seconds, 0)}s, ${plan.length} sections). NOW: motion_music analyse it (check the drop really lands at ${plan.slice(0, -1).reduce((s, p) => s + p.seconds, 0)}s-ish and the tempo is steady), then action use. Give the user the file to listen to first.`);
      }
      if (action === "search") {
        // No words given: the motion-design bed for the feel.
        if (!query) query = "";
        const jamendoId = getKey("jamendo");
        const found = [];
        const notes = [];
        if (jamendoId) found.push(...(await searchJamendo(musicQueries(query, feel)[0], { clientId: jamendoId, vocals, feel }).catch((e) => (notes.push(`Jamendo: ${e.message}`), []))));
        else notes.push("Jamendo's own API (a real instrumental filter, popularity order) needs a free client id: add it on /drip:settings → API keys");
        const seen = new Set(found.map((t) => t.name.toLowerCase()));
        // Openverse matches every word: run the music words and the feel's beds, relaxing long ones.
        // A few from each search, so the list spans several kinds of bed (not 14 tracks named "Ambient").
        for (const q of musicQueries(query, feel)) {
          let got = 0;
          for (const v of relaxQuery(q).slice(0, 2)) {
            for (const t of await searchOpenverse(v, { music: true, limit: 10, vocals }).catch(() => []))
              if (got < 6 && motionFit(t, feel) > -4 && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase())) {
                found.push(t);
                got++;
              }
            if (got >= 6) break;
          }
        }
        // Best fit for motion design first (calm by default); tracks that fight the picture drop to the bottom or out.
        const r = found.map((t) => ({ ...t, fit: motionFit(t, feel) })).filter((t) => t.fit > -4).sort((a, b) => b.fit - a.fit).slice(0, 14);
        if (!r.length) return text("No tracks found. Try fewer, broader words (a genre and a feel); or use a track the user owns.", true);
        return text(
          "PRO LIBRARIES FIRST: if this session has Epidemic Sound tools (its official MCP: SearchRecordings, SearchSimilarToRecording, DownloadRecording) or Artlist's, search there first: that is the music big brands license, covered by the user's own plan. Bring the downloaded file in with action use (licence: \"Epidemic Sound subscription\"). No such tools: ask the user once whether they have one of these subscriptions; else use the free tracks below.\n\n" +
            `${r.length} free tracks${vocals === "any" ? "" : ", instrumental first (tracks tagged with vocals are left out; 'vocals unknown' means untagged: check by listening)"} (licences vary: CC0 and CC BY are fine with credit; NC means no commercial use; ND, already left out, forbids cutting to picture):\n` +
            r.map((t, i) => `${i + 1}. ${t.name} · ${t.seconds ? `${Math.round(t.seconds)}s` : "?"} · ${t.vocals === "instrumental" ? "instrumental" : t.vocals === "vocal" ? "VOCALS" : "vocals unknown"}${t.tempo ? ` · ${t.tempo}` : ""} · ${t.licence} · ${t.source}${t.category && t.category !== "music" ? ` · ${t.category}` : ""}\n   ${t.preview}`).join("\n") +
            (notes.length ? `\n(${notes.join("; ")})` : "") +
            "\n\nYou can't listen: motion_music analyse the 2-3 likeliest (tempo, energy, drops) and pick by structure and fit, then tell the user which one and why, with the link so they can listen. Good motion-design music is a calm, clean bed under the picture: instrumental; a steady, unhurried pulse (about 80-110 BPM; up to 120 for an upbeat launch); soft synths, pads, piano, light percussion; one gentle lift or build near the film's big moment rather than a hard drop; a clean ending. Never rock, metal, drum and bass, hard techno or anything aggressive under a product film. Music with words only when the user asks for it.",
        );
      }
      if (!source) return text("Pass source: a project file or an audio URL.", true);
      const local = /^https?:/i.test(source) ? source : path.resolve(projectDir(), source);
      if (action === "analyse") {
        const a = await analyseMusic(local, { config });
        const story = (task?.motion?.storyboard?.beats || []).slice(1).map((b) => b.at + (task?.motion?.sound?.music?.from ? 0 : 0));
        const shift = task?.motion?.sound?.music?.source === source ? task.motion.sound.music.from || 0 : 0;
        const shifted = { ...a, bars: a.bars.map((b) => b - shift), beats: a.beats.map((b) => b - shift), drops: a.drops.map((d) => d - shift) };
        const chart = await drawPage(musicChartHtml(a, { beats: story.map((t) => t + shift) }), 1600, 300, config);
        const align = story.length ? alignToMusic(story, shifted) : [];
        updateState((st) => {
          if (st.task) {
            const mo = (st.task.motion ||= { studied: [], renders: [] });
            mo.music = { source, bpm: a.bpm, beat: a.beat, bars: a.bars.slice(0, 400), drops: a.drops, builds: a.builds, sections: a.sections, duration: a.duration };
          }
        });
        return blocks([
          textBlock(
            `MEASURED (estimates from the signal): ${a.duration}s, ${a.bpm} BPM (confidence ${a.confidence}; one beat ${a.beat}s, one bar ${(a.beat * 4).toFixed(2)}s).\n` +
              `First bars: ${a.bars.slice(0, 8).map(fmtT).join(", ")}…\n` +
              `Sections: ${a.sections.map((s) => `${fmtT(s.from)}-${fmtT(s.to)} (${s.level} dB)`).join(" · ")}\n` +
              `Drops: ${a.drops.length ? a.drops.map(fmtT).join(", ") : "none found (a steady track: use section changes as accents)"}${a.builds.length ? ` · builds: ${a.builds.map(([x, y]) => `${fmtT(x)}-${fmtT(y)}`).join(", ")}` : ""}${a.quiet.length ? ` · quiet bars from ${fmtT(a.quiet[0])}` : ""}\n` +
              (align.length
                ? `Storyboard vs music${shift ? ` (track starts at ${shift}s)` : ""}: ${align.map((x) => `${x.at}s → bar ${x.bar.toFixed(2)}s (${x.offBarMs > 0 ? "+" : ""}${x.offBarMs} ms)`).join("; ")}. Move beat boundaries onto bar lines (within ~40 ms), or start the track later with from.\n`
                : "No storyboard yet: build its beats on these bars (scene changes on bar lines, the big transformation on the drop).\n") +
              "WORKING WITH IT: the hook lands on the first downbeat; a build is where things gather or tension rises; the drop is the reveal; quiet bars are where the picture rests. Cut a track to length on bar lines; to land a drop on your moment, start the track later (from = drop - moment).",
          ),
          imageBlock(chart, "image/png"),
        ]);
      }
      // use
      const rel = await bringSound(task, source, { licence, credit, url: /^https?:/i.test(source) ? source : undefined });
      updateState((st) => {
        if (!st.task) return;
        const mo = (st.task.motion ||= { studied: [], renders: [] });
        mo.sound = { ...(mo.sound || { cues: [], voice: [] }), music: { file: rel, source, licence: licence || null, credit: credit || null, gainDb, from, fadeOut } };
      });
      return text(
        `Music set: ${rel} (from ${from}s, ${gainDb} dB, fade out ${fadeOut}s). Licence: ${licence || "NOT RECORDED: find and record it before the film is shared"}.\n` +
          "NEXT: motion_music analyse it (if you haven't) and put the storyboard's beat boundaries on its bars and the big moment on its drop; motion_export mixes it automatically.",
      );
    }),
  );

  server.registerTool(
    "motion_sound",
    {
      title: "Sound effects: few, calm, placed on the movement",
      description:
        "Sound effects for the film, from existing CC0 recordings and presets (sfx.akalan.dev incl. Wyzowl's SFX Kit, foleykit, Kenney's interface sounds, Openverse/Freesound). Never generated. " +
        "THE DEFAULT IS SPARSE: most beats get no effect. When one is used it is a smooth, calm UI sound (soft click, tick, gentle pop, glassy tap, soft chime) on a meaningful interaction or landing; no whooshes, risers or cheap beeps unless the brief is loud. " +
        "action search: ranked sounds with duration, sync point (the moment in the file that should meet the movement), what it's for and what to avoid. " +
        "action cue: the film's cue sheet: [{ at, sound (id from search, a URL or a file), role: foreground|support|ambient, gainDb, align: sync|start }]. The file is placed so its sync point lands exactly on `at`; files are copied into <film>/sound/ with licences. Checked: density, repetition, whooshes, cues where nothing moves (with motion_trace). motion_export mixes the sheet. " +
        'Examples: motion_sound({ action: "search", query: "soft ui click" }) · motion_sound({ action: "cue", cues: [{ at: 4.2, sound: "akalan:click-soft-01", role: "foreground", gainDb: -10 }] })',
      inputSchema: {
        action: z.enum(["search", "cue"]),
        query: z.string().optional(),
        category: z.string().optional().describe("e.g. clicks, pops, ui, impacts, shimmers"),
        seconds: z.number().optional().describe("Length of the move the sound accompanies"),
        cues: z
          .array(
            z.object({
              at: z.number().min(0),
              sound: z.string(),
              role: z.enum(["foreground", "support", "ambient"]).optional(),
              gainDb: z.number().optional(),
              align: z.enum(["sync", "start"]).optional(),
              rate: z.number().min(0.5).max(2).optional(),
              note: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    safe(async ({ action, query, category, seconds, cues }) => {
      const { task } = loadState();
      if (action === "search") {
        const cat = await loadCatalogue();
        let r = searchCatalogue(cat, { query: query || "soft ui click", category, seconds, limit: 12 });
        if (r.length < 4 && query) r = [...r, ...(await searchOpenverse(query, { limit: 6 }).catch(() => []))];
        if (!r.length) return text("Nothing found. Try the material and action (\"soft glass tap\", \"paper slide\", \"gentle pop\").", true);
        const loud = r.filter((s) => /whoosh|riser|swoosh|boom|braam|hit/i.test(`${s.name} ${s.category} ${(s.tags || []).join(" ")}`)).length;
        return text(
          r
            .map(
              (s, i) =>
                `${i + 1}. ${s.id} · ${s.name} · ${s.category} · ${s.seconds ? `${s.seconds.toFixed(2)}s` : "?"}${s.sync ? ` · sync ${s.sync.at}s (${s.sync.meets})` : ""}${s.tier ? ` · ${s.tier}` : ""} · ${s.licence}\n   for: ${(s.use || []).slice(0, 3).join("; ") || "-"}${s.avoid?.length ? ` · avoid: ${s.avoid.slice(0, 2).join("; ")}` : ""}\n   ${s.preview}`,
            )
            .join("\n") +
            `\n\n${loud ? `${loud} of these are loud (whoosh/riser/hit): the default film uses none. ` : ""}Pick by material and weight (a glass card taps, paper slides, a cursor clicks softly), quieter than you think (-12 to -18 dB under the music), and only where something meaningful happens.`,
        );
      }
      if (!cues?.length) return text("Pass cues: [{ at, sound, role, gainDb }].", true);
      const cat = await loadCatalogue().catch(() => []);
      const placed = [];
      for (const c of cues) {
        const s = cat.find((x) => x.id === c.sound) || null;
        const src = s?.file || c.sound;
        const licence = s?.licence || (/^(https?:|[a-z]:|\.|\/)/i.test(c.sound) ? null : null);
        const file = await bringSound(task, src, { name: s ? s.id.replace(/[:/]/g, "-") : undefined, licence: s?.licence || licence || undefined, credit: s?.source, url: s?.preview });
        placed.push({ ...c, role: c.role || "foreground", gainDb: c.gainDb ?? -12, file, name: s?.name || c.sound, licence: s?.licence || null, start: placeCue(c, s), sync: s?.sync || null });
      }
      const moves = (task?.motion?.traceMoves || []).map((m) => ({ from: m[0], to: m[1] }));
      const chk = checkCues(placed.map((p) => ({ ...p, sound: p.sound })), { duration: task?.motion?.storyboard?.format?.duration, moves });
      if (chk.errors.length) return text(`Cue sheet not recorded:\n${chk.errors.map((e) => `- ${e}`).join("\n")}\nUse sounds from search (they carry their licence), or record the licence of your own file in sound/LICENCES.md and pass it as a catalogue sound.`, true);
      updateState((st) => {
        if (!st.task) return;
        const mo = (st.task.motion ||= { studied: [], renders: [] });
        mo.sound = { ...(mo.sound || { voice: [] }), cues: placed };
      });
      return text(
        `Cue sheet recorded: ${placed.length} cue(s).\n${placed.map((p) => `- ${p.at}s ${p.role} ${p.name} (file starts ${p.start}s, ${p.gainDb} dB)`).join("\n")}\n` +
          (chk.warnings.length ? `Consider:\n${chk.warnings.map((w) => `- ${w}`).join("\n")}\n` : "") +
          "motion_export mixes them with the music and narration.",
      );
    }),
  );
}

export { soundOf };

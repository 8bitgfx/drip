// The film's sound: music (found, analysed, placed), a few calm UI sounds, and narration (voice.mjs). All of it is
// recorded on the task (task.motion.sound) and mixed by motion_export. Files are copied into <film>/sound/ with
// their licence written to sound/LICENCES.md, so the project carries its own usage rights.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { get } from "../../core/http.mjs";
import { getKey, logUsage } from "../../core/keys.mjs";
import { textBlock } from "../../core/images.mjs";
import { projectDir } from "../../core/paths.mjs";
import { serveDir } from "../../core/serve.mjs";
import { blocks, safe, text } from "../../core/result.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { fmtT } from "./capture.mjs";
import { alignToMusic, analyseMusic, energyLines } from "./music.mjs";
import { checkCues, feelFor, loadCatalogue, motionFit, musicQueries, queryFit, placeCue, searchCatalogue, searchJamendo, searchOpenverse } from "./sound.mjs";
import { relaxQuery } from "./refsources.mjs";

/** The film's folder: where the storyboard says the composition lives, else film/. */
/** The film's own folder: the composition's (from the last frame check or render), else the project folder. */
export function filmDir(task) {
  const mo = task?.motion || {};
  const comp = [mo.frames?.target, mo.storyboard?.file].find((f) => f && !/^https?:/i.test(f));
  if (comp) return path.dirname(path.resolve(projectDir(), comp));
  const render = mo.renders?.at(-1)?.file;
  if (render) return path.dirname(path.dirname(path.resolve(projectDir(), render))); // <film>/out/x.mp4
  return projectDir();
}

/** Copy or download a sound into <film>/sound/ and note its licence. Returns the project-relative path. */
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|flac|aac|opus|webm)$/i;

/**
 * A readable file name and a real audio extension for a sound: from its name or credit ("Upbeat Corporate — Soundrider"),
 * else the file name in the URL when it is an audio file, else a track id in the query. Streaming URLs such as
 * https://prod-1.storage.jamendo.com/?trackid=1670486&format=mp32 have no file name (the host is not one). Pure (tested).
 */
export function soundFileName(source, label) {
  const src = String(source);
  let u = null;
  try {
    u = /^https?:/i.test(src) ? new URL(src) : null;
  } catch {
    u = null;
  }
  const pathPart = u ? u.pathname : src.split("?")[0];
  const fileBase = path.basename(pathPart || "");
  const fmt = u?.searchParams.get("format") || "";
  const ext = AUDIO_EXT.test(fileBase) ? path.extname(fileBase).toLowerCase() : /ogg|vorbis/i.test(fmt) ? ".ogg" : /flac/i.test(fmt) ? ".flac" : /wav/i.test(fmt) ? ".wav" : ".mp3";
  const id = u ? u.searchParams.get("trackid") || u.searchParams.get("id") : null;
  const raw = label ? String(label).split(/[(·]/)[0] : AUDIO_EXT.test(fileBase) ? fileBase.replace(AUDIO_EXT, "") : id ? `track-${id}` : "sound";
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sound";
  return { base, ext };
}

export async function bringSound(task, source, { name, licence, credit, url } = {}) {
  const dir = path.join(filmDir(task), "sound");
  fs.mkdirSync(dir, { recursive: true });
  const { base, ext } = soundFileName(source, name || credit);
  // One name, one sound: a second track that happens to get the same name gets its own file (it once silently reused
  // the first). Which source each file came from is kept beside them.
  const srcFile = path.join(dir, ".sources.json");
  let sources = {};
  try {
    sources = JSON.parse(fs.readFileSync(srcFile, "utf8"));
  } catch {
    /* none yet */
  }
  const key = String(source);
  let file = path.join(dir, `${base}${ext}`);
  for (let i = 2; fs.existsSync(file) && sources[path.basename(file)] && sources[path.basename(file)] !== key; i++) file = path.join(dir, `${base}-${i}${ext}`);
  if (fs.existsSync(file) && !sources[path.basename(file)] && /^https?:/i.test(key)) file = path.join(dir, `${base}-${Date.now().toString(36)}${ext}`);
  if (sources[path.basename(file)] !== key) {
    sources[path.basename(file)] = key;
    fs.writeFileSync(srcFile, JSON.stringify(sources, null, 2));
  }
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

/**
 * The listening page: one player per candidate track, so the user picks by ear. Agents can't listen, and a raw audio
 * link usually downloads instead of playing (a user had to ask for "proper links in the browser to play"). Pure (tested).
 */
export function listenPage(tracks) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Music for the film</title>
<style>body{margin:0;background:#0D0E12;color:#F5F2EC;font:16px/1.5 system-ui,sans-serif;padding:40px 16px}main{max-width:640px;margin:0 auto}h1{font-size:26px;margin:0 0 6px}p{color:#9A9EAD;margin:0 0 24px}
.t{background:#16181F;border:1px solid #262934;border-radius:14px;padding:16px 18px 12px;margin-bottom:12px}.t h2{margin:0;font-size:19px}.t .m{color:#9A9EAD;font-size:14px;margin:2px 0 10px}audio{width:100%}</style></head>
<body><main><h1>Music for the film</h1><p>Press play on each and say which one fits. Nothing is used until you pick.</p>
${tracks.map((t) => `<div class="t"><h2>${esc(t.name)}</h2><div class="m">${esc([t.note, t.licence, t.credit].filter(Boolean).join(" · "))}</div><audio controls preload="metadata" src="${esc(t.file)}"></audio></div>`).join("\n")}
</main></body></html>`;
}

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
        "action listen: the user picks the track BY EAR, never you from tags: pass tracks [{ source, name, licence, credit, note }] (2-4 candidates); it downloads them into <film>/sound/candidates/, writes a page with a player for each and serves it on localhost; give the user that URL (open it in the browser pane), then wait for their pick. " +
        "action generate (fallback, only when the user asks; pass userAsked): Eleven Music with a composition plan timed to the storyboard (exact section lengths, the drop where the big moment is, instrumental, negative styles), then analyse it like any track. Suno has no public API: a track made there comes in with action use. " +
        'Examples: motion_music({ action: "search", query: "minimal electronic upbeat" }) · motion_music({ action: "analyse", source: "film/sound/track.mp3" }) · motion_music({ action: "use", source: "<url>", licence: "CC BY 4.0", credit: "Artist – Title (Jamendo)", from: 12.5, gainDb: -6, fadeOut: 1.5 })',
      inputSchema: {
        action: z.enum(["search", "listen", "analyse", "use", "generate"]),
        tracks: z
          .array(z.object({ source: z.string(), name: z.string(), licence: z.string().optional(), credit: z.string().optional(), note: z.string().optional().describe("What it is: '120 BPM, bright clean electronic'") }))
          .max(6)
          .optional()
          .describe("listen: the candidates to play to the user"),
        userAsked: z.string().optional().describe("generate only: the user's own words asking for a generated track, quoted. Found music comes first; generation is the fallback"),
        plan: z
          .array(z.object({ seconds: z.number().min(3).max(120), what: z.string().describe("What the music does here: 'soft pulse, filtered synth, building', 'the drop: full drums and bass', 'resolve, piano and pad, ends cleanly'"), styles: z.array(z.string()).optional() }))
          .optional()
          .describe("generate: sections that follow the storyboard (the drop where the big moment is)"),
        styles: z.array(z.string()).optional().describe("generate: global styles: genre, mood, instruments, '112 BPM', 'D minor'"),
        avoid: z.array(z.string()).optional().describe("generate: what to keep out: 'vocals', 'cheesy corporate ukulele', 'big risers'"),
        query: z.string().optional(),
        feel: z.enum(["motion", "energetic", "ambient", "cinematic"]).optional().describe("search: cinematic for a launch film with trailer weight (a pulse building to one hit; read from the query when it says cinematic/trailer/epic); default motion (rhythmic, clean electronic to cut to: steady 100-125 BPM pulse, crisp percussion, plucky synths, a tight groove, a lift for the reveal); energetic for a big punchy launch; ambient only for a slow atmospheric brand piece"),
        vocals: z.enum(["no", "any"]).optional().describe("search: default no (instrumental only); any when the user wants a song with words"),
        source: z.string().optional().describe("A file in the project or an audio URL"),
        licence: z.string().optional(),
        credit: z.string().optional(),
        gainDb: z.number().optional(),
        from: z.number().optional().describe("Start this many seconds into the track (e.g. so the drop meets the film's big moment)"),
        fadeOut: z.number().optional(),
      },
    },
    safe(async ({ action, query, feel, vocals = "no", source, licence, credit, gainDb = -4, from = 0, fadeOut = 1.5, userAsked, plan, styles = [], avoid = [], tracks }) => {
      const config = ctx.config();
      const { task } = loadState();
      if (action === "listen") {
        if (!tracks?.length) return text('Pass tracks: [{ source: "<audio url or file>", name: "Title (Artist)", licence: "CC BY 4.0", note: "120 BPM, bright clean electronic" }], 2-4 of them.', true);
        const dir = path.join(filmDir(task), "sound", "candidates");
        fs.mkdirSync(dir, { recursive: true });
        const done = [];
        const failed = [];
        for (const t of tracks) {
          const { base, ext } = soundFileName(t.source, t.name);
          const file = path.join(dir, `${base}${ext}`);
          try {
            if (!fs.existsSync(file)) {
              if (/^https?:/i.test(t.source)) fs.writeFileSync(file, (await get(t.source, { as: "buffer", ttlMs: 30 * 24 * 3600e3, timeoutMs: 120000, headers: { "User-Agent": "drip-design-plugin" } })).body);
              else fs.copyFileSync(path.resolve(projectDir(), t.source), file);
            }
            done.push({ ...t, file: path.basename(file) });
          } catch (e) {
            failed.push(`${t.name}: ${e.message}`);
          }
        }
        if (!done.length) return text(`None of the tracks could be fetched: ${failed.join("; ")}`, true);
        fs.writeFileSync(path.join(dir, "listen.html"), listenPage(done));
        const url = `${await serveDir(dir)}/listen.html`;
        return text(
          `Listening page: ${url} (${done.length} track${done.length > 1 ? "s" : ""}${failed.length ? `; not fetched: ${failed.join("; ")}` : ""}). Open it in the browser pane for the user and ask which one fits; wait for their pick. ` +
            "Then motion_music analyse the chosen file and action use it. A track can be made to fit: a 3-8% tempo change (ffmpeg atempo) or a few dB quieter is fine; ask before anything bigger.",
        );
      }
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
        feel = feelFor(query, feel);
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
        // Licence matters as much as fit: setting music to picture makes the film an adaptation, so ShareAlike (SA) would
        // put the whole film under the same licence, and NC forbids commercial use. CC0 and CC BY first.
        const licScore = (t) => (/cc0|public/i.test(t.licence) ? 3 : /nc/i.test(t.licence) ? -6 : /sa/i.test(t.licence) ? -3 : /by/i.test(t.licence) ? 2 : 0);
        const r = found.map((t) => ({ ...t, fit: motionFit(t, feel) + licScore(t) + queryFit(t, query) })).filter((t) => t.fit > -4).sort((a, b) => b.fit - a.fit).slice(0, 14);
        if (!r.length) return text("No tracks found. Try fewer, broader words (a genre and a feel); or use a track the user owns.", true);
        return text(
          "PRO LIBRARIES FIRST: if this session has Epidemic Sound tools (its official MCP: SearchRecordings, SearchSimilarToRecording, DownloadRecording) or Artlist's, search there first: that is the music big brands license, covered by the user's own plan. Bring the downloaded file in with action use (licence: \"Epidemic Sound subscription\"). No such tools: ask the user once whether they have one of these subscriptions; else use the free tracks below.\n\n" +
            `${r.length} free tracks${vocals === "any" ? "" : ", instrumental first (tracks tagged with vocals are left out; 'vocals unknown' means untagged: check by listening)"} (licences ranked too: CC0 is free to use; CC BY needs a credit line; BY-SA makes the film itself an adaptation that must be shared under BY-SA too, so avoid it for a commercial launch film; NC forbids commercial use; ND, already left out, forbids cutting to picture). Read each one's tags: anything tagged game, action, intense, strange or techno is out (scored down already). The user picks by ear:\n` +
            r.map((t, i) => `${i + 1}. ${t.name} · ${t.seconds ? `${Math.round(t.seconds)}s` : "?"} · ${t.vocals === "instrumental" ? "instrumental" : t.vocals === "vocal" ? "VOCALS" : "vocals unknown"}${t.tempo ? ` · ${t.tempo}` : ""} · ${t.licence} · ${t.source}${t.category && t.category !== "music" ? ` · ${t.category}` : ""}\n   ${t.preview}`).join("\n") +
            (notes.length ? `\n(${notes.join("; ")})` : "") +
            "\n\nYou can't listen, and your pick from tags has been wrong before. motion_music analyse the 3-4 likeliest (tempo, energy, drops), then motion_music listen with them: the user gets a page with a player for each and chooses. Never set a track nobody heard. Good motion-design music is made to cut to: instrumental; a steady, clear pulse (about 100-125 BPM); crisp percussion and plucky synths with sharp attacks, so transitions land on hits; a tight bass groove; a build into a lift or drop at the reveal; a clean ending. Restrained, not ambient: drones, solo piano and orchestral swells have no beat to cut to; rock, metal and club mixes fight the picture. After analysing, prefer a confident tempo reading and a clear drop or lift where the film's big moment is. Music with words only when the user asks for it.",
        );
      }
      if (!source) return text("Pass source: a project file or an audio URL.", true);
      const local = /^https?:/i.test(source) ? source : path.resolve(projectDir(), source);
      if (action === "analyse") {
        const a = await analyseMusic(local, { config });
        const story = (task?.motion?.storyboard?.beats || []).slice(1).map((b) => b.at + (task?.motion?.sound?.music?.from ? 0 : 0));
        const shift = task?.motion?.sound?.music?.source === source ? task.motion.sound.music.from || 0 : 0;
        const shifted = { ...a, bars: a.bars.map((b) => b - shift), beats: a.beats.map((b) => b - shift), drops: a.drops.map((d) => d - shift) };
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
              `\nENERGY BY BAR (8 bars a line, ▁ quiet … █ loudest; track time${story.length ? ", storyboard beats as beat@" : ""}):\n${energyLines(a, { beats: story.map((t) => t + shift) })}\n\n` +
              "WORKING WITH IT: the hook lands on the first downbeat; a build is where things gather or tension rises; the drop is the reveal; quiet bars are where the picture rests. Cut a track to length on bar lines; to land a drop on your moment, start the track later (from = drop - moment).",
          ),
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
      const moves = [...(task?.motion?.traceMoves || []), ...(task?.motion?.traceActive || [])].map((m) => ({ from: m[0], to: m[1] }));
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

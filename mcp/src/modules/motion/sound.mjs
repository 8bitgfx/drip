// Sound direction for films: search existing CC0 recordings and presets, place them as cues, mix them in the render.
// Never generated audio. Sources (all login-free, checked 2026-11-26):
//   sfx.akalan.dev   ~4,000 CC0 sounds with sync points, timings, loudness and pairing notes (includes Wyzowl's SFX Kit)
//   foleykit         335 CC0 presets (ui, nature, mecha, trailer) with use_when notes
//   Kenney (hipdiscovery/Free-Sound-Effects)  CC0 interface sounds
//   Openverse        CC0 recordings from Freesound (sound effects); music by licence, shown per track
import fs from "node:fs";
import path from "node:path";
import { get } from "../../core/http.mjs";
import { homeDripDir } from "../../core/paths.mjs";

const WEEK = 7 * 24 * 3600e3;
const UA = { "User-Agent": "drip-design-plugin" };

/** One normalised list from the static catalogues, cached in ~/.drip/audio/catalog.json for a week. */
export async function loadCatalogue() {
  const file = path.join(process.env.DRIP_HOME || homeDripDir, "audio", "catalog.json");
  try {
    const st = fs.statSync(file);
    if (Date.now() - st.mtimeMs < WEEK) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* build it */
  }
  const out = [];
  const errors = [];
  await Promise.all([
    get("https://sfx.akalan.dev/api/v1/sounds.json", { as: "json", ttlMs: WEEK, headers: UA })
      .then(({ body }) => {
        for (const s of body.sounds || []) out.push(fromAkalan(s));
      })
      .catch((e) => errors.push(`akalan: ${e.message}`)),
    get("https://rudqlsdla.github.io/foleykit/catalog.json", { as: "json", ttlMs: WEEK, headers: UA })
      .then(({ body }) => {
        for (const s of body.sounds || [])
          out.push({ id: `foleykit:${s.id}`, name: s.description, category: s.pack, tags: s.tags || [], use: s.use_when || [], avoid: [], seconds: s.seconds, sync: s.peak != null ? { at: s.peak, meets: "peak" } : null, lufs: s.lufs, loop: !!s.loop, file: `https://rudqlsdla.github.io/foleykit/${s.audio}`, preview: `https://rudqlsdla.github.io/foleykit/${s.audio}`, licence: s.license || "CC0-1.0", source: "foleykit (CC0 presets)" });
      })
      .catch((e) => errors.push(`foleykit: ${e.message}`)),
    get("https://hipdiscovery.github.io/Free-Sound-Effects/catalog.json", { as: "json", ttlMs: WEEK, headers: UA })
      .then(({ body }) => {
        for (const s of body.sounds || [])
          out.push({ id: `kenney:${s.id}`, name: `${s.title} (${s.category})`, category: `ui ${String(s.category || "").toLowerCase()}`, tags: s.tags || [], use: [], avoid: [], seconds: s.durationSeconds, sync: null, file: `https://hipdiscovery.github.io/Free-Sound-Effects/${s.path}`, preview: `https://hipdiscovery.github.io/Free-Sound-Effects/${s.path}`, licence: s.license || "CC0-1.0", source: `${s.creator || "Kenney"} via Free-Sound-Effects` });
      })
      .catch((e) => errors.push(`kenney: ${e.message}`)),
  ]);
  if (out.length) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(out));
  }
  if (!out.length) throw new Error(`No sound catalogue could be loaded (${errors.join("; ")})`);
  return out;
}

function fromAkalan(s) {
  return {
    id: `akalan:${s.id}`,
    name: s.name,
    category: s.category,
    tags: s.tags || [],
    use: s.use_for || [],
    avoid: s.avoid_for || [],
    seconds: s.duration,
    sync: s.sync ? { at: s.sync.at, meets: s.sync.meets, how: s.sync.how } : null,
    fits: s.fits_seconds,
    lufs: s.level?.lufs,
    tier: s.level?.tier,
    pairs: (s.pairs_with || []).map((p) => `${p.category}: ${p.how}`),
    file: s.file,
    preview: s.preview,
    licence: "CC0-1.0",
    source: s.source === "kit" ? "SFX Kit by Wyzowl via sfx.akalan.dev" : s.source === "synth" ? "sfx.akalan.dev (curated preset)" : "sfx.akalan.dev",
  };
}

/** Keyword search with light ranking: name and tags beat descriptions; a length that fits the move ranks up. */
export function searchCatalogue(cat, { query, category, seconds, limit = 12 }) {
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  const scored = [];
  for (const s of cat) {
    if (category && !String(s.category || "").toLowerCase().includes(category.toLowerCase())) continue;
    const name = `${s.name} ${s.id}`.toLowerCase();
    const tags = (s.tags || []).join(" ").toLowerCase();
    const more = `${s.category} ${(s.use || []).join(" ")}`.toLowerCase();
    let score = 0;
    for (const w of words) score += (name.includes(w) ? 3 : 0) + (tags.includes(w) ? 2 : 0) + (more.includes(w) ? 1 : 0);
    if (words.length && !score) continue;
    if (seconds && s.fits) score += seconds >= s.fits[0] && seconds <= s.fits[1] ? 2 : 0;
    else if (seconds && s.seconds) score += Math.abs(s.seconds - seconds) < seconds * 0.5 ? 1 : 0;
    scored.push([score, s]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, s]) => s);
}

/** Openverse audio (anonymous; 100 requests a minute). Effects: CC0 only. Music: any licence that allows reuse, shown per track. */
export async function searchOpenverse(query, { music = false, limit = 8 } = {}) {
  const ask = async (extra) => {
    const q = new URLSearchParams({ q: query, page_size: String(limit), ...extra });
    return (await get(`https://api.openverse.org/v1/audio/?${q}`, { as: "json", ttlMs: 24 * 3600e3, headers: UA })).body.results || [];
  };
  // Music: whole tracks (Jamendo, and anything filed as music), licences that allow commercial use; never ND for
  // a film (no edits means no cutting it to picture), at least 20 seconds long.
  const raw = music
    ? (await Promise.all([ask({ license_type: "commercial", source: "jamendo" }), ask({ license_type: "commercial", category: "music" })]))
        .flat()
        .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)
        .filter((r) => !/nd/i.test(r.license || "") && (r.duration || 0) >= 20000)
    : await ask({ license: "cc0" });
  return raw.slice(0, limit * 2).map((r) => ({
    id: `openverse:${r.id}`,
    name: r.title,
    category: music ? (r.genres || []).join(", ") || "music" : r.category || "sound",
    tags: (r.tags || []).map((t) => t.name).slice(0, 8),
    use: [],
    avoid: [],
    seconds: r.duration ? r.duration / 1000 : null,
    sync: null,
    file: r.url,
    preview: r.url,
    licence: `${String(r.license || "").toUpperCase()} ${r.license_version || ""}`.trim(),
    licenceUrl: r.license_url,
    attribution: r.attribution,
    source: `${r.provider || "openverse"}${r.creator ? ` / ${r.creator}` : ""}`,
  }));
}

/** Where each cue's file starts so that its sync point (or its start) lands on `at`. */
export function placeCue(cue, sound) {
  const offset = cue.align === "start" || !sound?.sync ? 0 : sound.sync.at || 0;
  return Math.max(0, +(cue.at - offset).toFixed(3));
}

/**
 * Judge a cue sheet: density, repetition, whoosh overuse, cues that land on no movement (when a trace exists),
 * and missing licences. Pure (tested). moves: [{ from, to, peakAt? }] from motion_trace.
 */
export function checkCues(cues, { duration, moves = [] } = {}) {
  const errors = [];
  const warnings = [];
  for (const [i, c] of cues.entries()) if (!c.licence) errors.push(`cue ${i + 1} (${c.sound}): no licence recorded`);
  const fx = cues.filter((c) => c.role !== "ambient");
  if (duration && fx.length > Math.max(4, duration / 1.2)) warnings.push(`${fx.length} effect cues in ${duration}s: sound on every movement flattens the important ones; keep the moments that matter`);
  const counts = new Map();
  for (const c of fx) counts.set(c.sound, (counts.get(c.sound) || 0) + 1);
  for (const [s, n] of counts) if (n >= 3) warnings.push(`"${s}" is used ${n} times: vary it (another take, a softer one, pitch) or drop some`);
  const whoosh = fx.filter((c) => /whoosh|swish|swoosh/i.test(`${c.sound} ${c.name || ""}`));
  if (whoosh.length >= 3 && whoosh.length / Math.max(1, fx.length) > 0.4) warnings.push(`${whoosh.length} of ${fx.length} effects are whooshes: match sounds to what the object is (paper, glass, a click, a soft thud)`);
  if (moves.length) {
    const near = (t) => moves.some((m) => t >= m.from - 0.12 && t <= m.to + 0.12);
    const lone = fx.filter((c) => !near(c.at));
    if (lone.length) warnings.push(`cue${lone.length > 1 ? "s" : ""} at ${lone.slice(0, 6).map((c) => `${c.at}s`).join(", ")} land${lone.length > 1 ? "" : "s"} where nothing moves`);
  }
  return { errors, warnings };
}

/** The film's sound as mixer tracks: [{ file, kind: music|cue|voice, start, gainDb, trimFrom?, rate?, fadeOut? }]. */
export function soundTracks(sound = {}) {
  const tracks = [];
  if (sound.music?.file) tracks.push({ file: sound.music.file, kind: "music", start: 0, trimFrom: sound.music.from || 0, gainDb: sound.music.gainDb ?? -4, fadeOut: sound.music.fadeOut ?? 1.5 });
  for (const c of sound.cues || []) tracks.push({ file: c.file, kind: "cue", start: c.start ?? c.at, gainDb: c.gainDb ?? -12, rate: c.rate });
  for (const v of sound.voice || []) tracks.push({ file: v.file, kind: "voice", start: v.at, gainDb: v.gainDb ?? 0 });
  return tracks;
}

/**
 * ffmpeg filter graph for the soundtrack. Inputs: 0 = video, 1.. = `tracks` in order. With a voice, the music is
 * ducked under it (sidechain compression keyed by the voice); everything is summed, trimmed to the film and limited.
 */
export function mixGraph(tracks, { duration }) {
  const parts = [];
  const by = { music: [], cue: [], voice: [] };
  tracks.forEach((tr, i) => {
    const n = i + 1;
    const ms = Math.round((tr.start || 0) * 1000);
    const chain = [];
    if (tr.trimFrom) chain.push(`atrim=start=${tr.trimFrom}`, `asetpts=PTS-STARTPTS`);
    chain.push(`aresample=48000`, `aformat=sample_fmts=fltp:channel_layouts=stereo`);
    if (tr.rate && tr.rate !== 1) chain.push(`atempo=${Math.min(2, Math.max(0.5, tr.rate))}`);
    if (ms) chain.push(`adelay=${ms}|${ms}`);
    chain.push(`volume=${tr.gainDb ?? 0}dB`);
    if (tr.fadeOut && duration) chain.push(`afade=t=out:st=${Math.max(0, duration - tr.fadeOut)}:d=${tr.fadeOut}`);
    parts.push(`[${n}:a]${chain.join(",")}[t${n}]`);
    (by[tr.kind] || by.cue).push(`[t${n}]`);
  });
  const bus = (labels, name) => {
    if (!labels.length) return null;
    if (labels.length === 1) return labels[0];
    parts.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0[${name}]`);
    return `[${name}]`;
  };
  let music = bus(by.music, "mus");
  const voice = bus(by.voice, "vox");
  const cues = bus(by.cue, "fx");
  const finals = [];
  if (voice && music) {
    parts.push(`${voice}asplit=2[voxout][voxkey]`);
    parts.push(`${music}[voxkey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350:makeup=1[ducked]`);
    music = "[ducked]";
    finals.push(music, "[voxout]");
  } else {
    if (music) finals.push(music);
    if (voice) finals.push(voice);
  }
  if (cues) finals.push(cues);
  if (!finals.length) return null;
  const sum = finals.length === 1 ? `${finals[0]}anull` : `${finals.join("")}amix=inputs=${finals.length}:normalize=0:dropout_transition=0`;
  parts.push(`${sum},atrim=end=${duration},alimiter=limit=0.89[aout]`);
  return parts.join(";");
}

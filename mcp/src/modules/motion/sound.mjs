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
/** Vocals from a track's tags: "instrumental", "vocal" or "unknown". Pure (tested). */
export function vocalsOf(tags = [], title = "") {
  const t = tags.map((x) => String(x).toLowerCase());
  if (t.includes("instrumental")) return "instrumental";
  if (t.some((x) => /^(vocal|vocals|singing|singer|rap|lyrics|female|male|choir|voice)$/.test(x)) || /\b(feat\.?|ft\.|vocal|remix by)\b/i.test(title)) return "vocal";
  return "unknown";
}

// What motion-design music sounds like: rhythmic and clean, made to cut to. A steady pulse (about 100-125 BPM), crisp
// percussion and plucky synths with sharp attacks so transitions land on hits, a tight bass groove, a build and a
// lift for the reveal: modern electronic, synth-pop, nu-disco, future garage, chillhop beats, funky electronic.
// "Calm" means restrained, never ambient: drones, solo piano, new age and orchestral swells have no beat to cut to.
// Aggressive genres and club mixes fight the picture; words fight any narration.
const GOOD = {
  motion: /\b(electronic|electronica|electro|pop|synthpop|synth|future garage|chillwave|nu ?disco|deep house|house|funk|funky|groove|groovy|beat|beats|percussion|pluck|plucky|minimal|tech|modern|clean|upbeat|uplifting|optimistic|bright|positive|corporate|instrumental|glitch|chillhop|hip ?hop|breakbeat|indie)\b/i,
  energetic: /\b(electronic|electro|house|future ?bass|funk|pop|upbeat|energetic|happy|groove|disco|indie|dance|synthpop|bright|optimistic|uplifting|driving|punchy)\b/i,
  ambient: /\b(ambient|atmospheric|cinematic|pads?|soft|dreamy|minimal|electronic|calm|elegant|clean)\b/i,
  // A launch film's trailer sound: a pulse that builds to one hit, hybrid electronic with cinematic weight.
  cinematic: /\b(cinematic|trailer|epic|hybrid|pulse|pulsing|build|building|rise|rising|tension|dramatic|score|soundtrack|film|orchestral|electronic|synth|drums|percussion|powerful|inspiring|uplifting|modern|synthwave)\b/i,
};
// What "no beat to cut to" means for a cinematic film: only the sleepy kinds (orchestral and epic are its home).
const SLEEPY = /\b(drone|darkambient|new ?age|meditation|sleep|relax|relaxing|relaxation|lullaby|ballad|solo piano|piano solo)\b/i;
// No beat to cut to: right for a slow atmospheric piece (feel "ambient"), wrong for a launch film.
const BEATLESS = /\b(ambient|drone|darkambient|new ?age|meditation|sleep|relax|relaxing|relaxation|lullaby|classical|orchestral|orchestra|epic|choir|acoustic|folk|ballad|solo piano|piano solo|beatless|soundscape|filmscore)\b/i;
const BAD = /\b(rock|metal|punk|hardcore|grind|drum ?n ?bass|dnb|dubstep|hardstyle|gabber|industrial|noise|aggressive|dark|horror|screamo|trap|rap|reggae|country|polka|schlager|march|military|christmas|kids|comedy|world)\b/i;
// Club tracks are made for dance floors (long DJ mixes, trance builds), not under a 20 s film.
const CLUB = /\b(techno|club|party|trance|goa|psy|dj|mix|remix|edm|rave|bass ?boost|banger)\b/i;
const SPEED_SCORE = {
  motion: { speed_verylow: -3, speed_low: -1, speed_medium: 2, speed_high: 1, speed_veryhigh: -2 },
  energetic: { speed_verylow: -3, speed_low: -1, speed_medium: 1, speed_high: 2, speed_veryhigh: 0 },
  ambient: { speed_verylow: 1, speed_low: 2, speed_medium: 1, speed_high: -2, speed_veryhigh: -3 },
  cinematic: { speed_verylow: -2, speed_low: 0, speed_medium: 2, speed_high: 1, speed_veryhigh: -1 },
};
// Fine music, wrong room for a product film: bar jazz, blues, Latin, lounge, battle themes.
const OFF = /\b(jazz|blues|bossa ?nova|bossanova|latin|salsa|tango|swing|lounge|bar|cafe|war|battle|fight|ethnic|tribal)\b/i;
// Game and action music: what a user heard as "video game music, not motion design" (an action electronic track and a
// "minimal tech" track tagged strange/techno were both turned down). Out for every feel but a cinematic trailer.
const GAMEY = /\b(game|games|gaming|video ?game|8 ?bit|chiptune|chip ?tune|arcade|retro ?game|boss|action|intense|adventure|heroic|spy|strange|weird|glitchy)\b/i;
const count = (re, txt) => (txt.match(new RegExp(re.source, "gi")) || []).length;

/** How well a track fits a film, for a feel: "motion" (default), "energetic" or "ambient". Pure (tested). */
export function motionFit(t, feel = "motion") {
  const f = GOOD[feel] ? feel : "motion";
  const words = `${t.category || ""} ${(t.tags || []).join(" ")} ${t.name || ""}`;
  let s = count(GOOD[f], words);
  s -= 8 * count(BAD, words); // one is enough to rule a track out
  if (f === "cinematic") s -= 3 * count(SLEEPY, words);
  else if (f !== "ambient") s -= 3 * count(BEATLESS, words);
  s -= 4 * count(OFF, words);
  if (f !== "cinematic") s -= 8 * count(GAMEY, words);
  if (CLUB.test(words)) s -= f === "energetic" ? 1 : 3;
  for (const tag of t.tags || []) s += SPEED_SCORE[f][tag] ?? 0;
  if (t.tempo) s += /very fast/.test(t.tempo) ? -2 : /very slow/.test(t.tempo) ? (f === "ambient" ? 1 : -3) : /slow/.test(t.tempo) ? (f === "ambient" ? 2 : -1) : /medium/.test(t.tempo) ? 2 : /fast/.test(t.tempo) ? (f === "motion" ? 1 : 2) : 0;
  if (t.vocals === "instrumental") s += 2;
  if (t.vocals === "vocal") s -= 6;
  // A film needs 20 s to 4 min of track; a 7-minute mix is hard to cut.
  if (t.seconds && t.seconds > 360) s -= 2;
  return s;
}

/** Jamendo's speed tag as a tempo hint. */
const SPEED = { speed_verylow: "very slow", speed_low: "slow", speed_medium: "medium tempo", speed_high: "fast", speed_veryhigh: "very fast" };

export async function searchOpenverse(query, { music = false, limit = 8, vocals = "no" } = {}) {
  const ask = async (extra) => {
    const q = new URLSearchParams({ q: query, page_size: String(Math.min(20, limit * 3)), ...extra });
    return (await get(`https://api.openverse.org/v1/audio/?${q}`, { as: "json", ttlMs: 24 * 3600e3, headers: UA })).body.results || [];
  };
  // Music: whole tracks (Jamendo, and anything filed as music), licences that allow commercial use; never ND for
  // a film (no edits means no cutting it to picture), at least 20 seconds long. Instrumental first: a track with
  // words fights the picture and any narration.
  const raw = music
    ? (await Promise.all([ask({ license_type: "commercial", source: "jamendo" }), ask({ license_type: "commercial", category: "music" })]))
        .flat()
        .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)
        .filter((r) => !/nd/i.test(r.license || "") && (r.duration || 0) >= 20000)
    : await ask({ license: "cc0" });
  const mapped = raw.map((r) => {
    const tags = (r.tags || []).map((t) => t.name);
    return {
      id: `openverse:${r.id}`,
      name: r.title,
      category: music ? (r.genres || []).join(", ") || "music" : r.category || "sound",
      tags: tags.slice(0, 8),
      vocals: music ? vocalsOf(tags, r.title) : undefined,
      tempo: tags.map((t) => SPEED[t]).find(Boolean),
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
    };
  });
  if (!music || vocals === "any") return mapped.slice(0, limit * 2);
  // vocals "no": confirmed instrumentals first, unknowns after (labelled), never a track tagged with vocals.
  const rank = { instrumental: 0, unknown: 1 };
  return mapped.filter((m) => m.vocals !== "vocal").sort((a, b) => rank[a.vocals] - rank[b.vocals]).slice(0, limit * 2);
}

/** Jamendo's own API (a free client id on the settings page): a real instrumental filter and popularity order. */
export async function searchJamendo(query, { clientId, limit = 10, vocals = "no", feel = "motion" } = {}) {
  const q = new URLSearchParams({ client_id: clientId, format: "json", limit: String(limit), search: query, include: "musicinfo licenses", audioformat: "mp32", order: "popularity_total", audiodlformat: "mp32" });
  if (vocals !== "any") q.set("vocalinstrumental", "instrumental");
  q.set("speed", feel === "ambient" ? "low+medium" : feel === "energetic" ? "medium+high" : "medium+high");
  const { body } = await get(`https://api.jamendo.com/v3.0/tracks/?${q}`, { as: "json", ttlMs: 24 * 3600e3, headers: UA });
  return (body.results || [])
    .filter((r) => r.audiodownload_allowed !== false && !/-nd/i.test(r.license_ccurl || ""))
    .map((r) => ({
      id: `jamendo:${r.id}`,
      name: `${r.name} — ${r.artist_name}`,
      category: (r.musicinfo?.tags?.genres || []).join(", ") || "music",
      tags: [...(r.musicinfo?.tags?.vartags || []), ...(r.musicinfo?.tags?.instruments || [])].slice(0, 8),
      vocals: r.musicinfo?.vocalinstrumental === "instrumental" ? "instrumental" : r.musicinfo?.vocalinstrumental === "vocal" ? "vocal" : "unknown",
      tempo: r.musicinfo?.speed ? `${r.musicinfo.speed} tempo` : undefined,
      seconds: r.duration,
      file: r.audiodownload || r.audio,
      preview: r.audio,
      licence: (r.license_ccurl || "").replace(/^https?:\/\/creativecommons\.org\/licenses\//, "CC ").replace(/\/$/, "").toUpperCase() || "see Jamendo",
      licenceUrl: r.license_ccurl,
      attribution: `${r.name} by ${r.artist_name} (Jamendo)`,
      source: `jamendo / ${r.artist_name}`,
      pro: r.prourl || null,
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

// Words about the film, not the music: a library can't match "launch" or "saas". They become music searches.
const NOT_MUSIC = /\b(launch|product|saas|app|startup|film|video|promo|trailer|brand|explainer|teaser|demo|ad|commercial|motion|design|logo|website|tech company)\b/gi;
const BEDS = {
  motion: ["upbeat electronic", "synthpop", "funky electronic", "nu disco", "future garage", "chillhop", "electro pop"],
  energetic: ["energetic electronic", "future bass", "electro house", "indie dance", "funk"],
  ambient: ["ambient electronic", "cinematic ambient", "soft synth", "atmospheric"],
  cinematic: ["cinematic electronic", "epic trailer", "hybrid trailer", "cinematic pulse", "dramatic build", "synthwave"],
};

/** The feel a query asks for when none was passed: "cinematic trailer" means cinematic, not the motion default. */
export function feelFor(query, feel) {
  if (feel) return feel;
  const q = String(query || "");
  if (/\b(cinematic|trailer|epic|orchestral|film ?score|dramatic|hybrid)\b/i.test(q)) return "cinematic";
  if (/\b(ambient|atmospheric|calm|slow)\b/i.test(q)) return "ambient";
  if (/\b(energetic|punchy|hype|loud)\b/i.test(q)) return "energetic";
  return "motion";
}

/** The query's music words a track carries: the genre asked for leads the list, others drop. Pure (tested). */
export function queryFit(t, query) {
  const want = String(query || "").replace(NOT_MUSIC, " ").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!want.length) return 0;
  const words = `${t.category || ""} ${(t.tags || []).join(" ")} ${t.name || ""}`.toLowerCase();
  const hits = want.filter((w) => new RegExp(`\\b${w}`).test(words)).length;
  return hits ? 3 * hits : -2;
}

/** The searches to run for a music query: its music words, or the motion-design beds for the feel. Pure (tested). */
export function musicQueries(query, feel = "motion") {
  const rest = String(query || "").replace(NOT_MUSIC, " ").replace(/\s+/g, " ").trim();
  const beds = BEDS[feel] || BEDS.motion;
  return rest.split(" ").filter(Boolean).length >= 1 ? [rest, ...beds.slice(0, 3)] : beds;
}

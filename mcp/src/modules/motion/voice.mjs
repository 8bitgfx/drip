// Narration with ElevenLabs (the user's key, from /drip:settings). Voices are chosen like casting: shortlist from the
// user's voices and the Voice Library by use, gender, age, accent and tone, audition the same line on 2-3, let the
// user pick by ear. Lines are written per beat, checked against the beat's length and the account's remaining
// characters before anything is spent, generated with character timestamps (word timings for captions and picture
// sync), chained with previous/next request ids so the delivery stays one performance, and mixed by motion_export
// with the music ducked under the voice. API shapes checked against elevenlabs.io/docs on 2026-11-26.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getKey, logUsage } from "../../core/keys.mjs";
import { projectDir } from "../../core/paths.mjs";
import { safe, text } from "../../core/result.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { filmDir } from "./audio.mjs";
import { SLOP_COPY } from "./story.mjs";

const API = "https://api.elevenlabs.io";

async function xi(pathname, { method = "GET", body, key, raw = false } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { "xi-api-key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      const d = j.detail;
      detail = Array.isArray(d) ? d.map((x) => `${(x.loc || []).join(".")}: ${x.msg}`).join("; ") : d?.code ? `${d.code}: ${d.message}` : JSON.stringify(d || j).slice(0, 300);
    } catch {
      /* no body */
    }
    const err = new Error(`ElevenLabs ${res.status}${detail ? ` (${detail})` : ""}`);
    err.status = res.status;
    err.code = /^([a-z_]+):/.exec(detail)?.[1];
    throw err;
  }
  return raw ? res : res.json();
}

const KEY_HELP = "No ElevenLabs key. The user adds it on the settings page (/drip:settings → API keys → ElevenLabs) or sets ELEVENLABS_API_KEY. Never ask them to paste it in chat.";

/** Words with start/end seconds from character alignment, offset to the film's clock. Pure (tested). */
export function wordsFrom(alignment, offset = 0) {
  if (!alignment?.characters?.length) return [];
  const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = alignment;
  const out = [];
  let cur = null;
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (/\s/.test(c)) {
      if (cur) out.push(cur);
      cur = null;
      continue;
    }
    if (!cur) cur = { w: "", start: +(st[i] + offset).toFixed(3), end: 0 };
    cur.w += c;
    cur.end = +(en[i] + offset).toFixed(3);
  }
  if (cur) out.push(cur);
  // Audio tags like [curious] aren't spoken: drop them from the words.
  return out.filter((x) => !/^\[.*\]$/.test(x.w));
}

/** Check a narration plan before spending characters: pace per beat, slop, tags. Pure (tested). */
export function checkLines(lines, { beats = [], wps = 2.6 } = {}) {
  const errors = [];
  const warnings = [];
  const spoken = (t) => t.replace(/\[[^\]]*\]/g, " ").trim();
  for (const [i, l] of lines.entries()) {
    for (const [re, why] of SLOP_COPY) {
      const m = spoken(l.text).match(re);
      if (m) errors.push(`line ${i + 1}: "${m[0]}": ${why}`);
    }
    const words = spoken(l.text).split(/\s+/).filter(Boolean).length;
    const need = words / wps + 0.3;
    const beat = beats.find((b) => l.at >= b.at - 0.01 && l.at < b.at + b.len);
    const room = l.len || (beat ? beat.at + beat.len - l.at : null);
    if (room && need > room + 0.2) warnings.push(`line ${i + 1} ("${spoken(l.text).slice(0, 40)}…"): ~${need.toFixed(1)}s of speech at a calm ${wps} words/s, but only ${room.toFixed(1)}s until the next beat: cut words or give it more time`);
    if (words > 22) warnings.push(`line ${i + 1}: ${words} words: one idea per line reads and sounds better (under ~14)`);
    if ((l.text.match(/\[[^\]]+\]/g) || []).length > 2) warnings.push(`line ${i + 1}: more than two audio tags; tags work best as one delivery cue at the start`);
    if (/\b\d{2,}(\.\d+)?%?\b/.test(l.text) && !l.checked) warnings.push(`line ${i + 1}: has a number: make sure it's real (never invent stats) and write it the way it should be said`);
  }
  for (let i = 1; i < lines.length; i++) if (lines[i].at < lines[i - 1].at) errors.push("lines must be in time order");
  return { errors, warnings };
}

export function registerVoice(server, ctx) {
  server.registerTool(
    "motion_voice",
    {
      title: "Narration: cast a voice, write and record the lines",
      description:
        "ElevenLabs narration for the film (the user's key). Plan before spending: the script is written per beat (short spoken sentences, one idea a line, ~2.4-2.8 words a second for calm narration, ellipses for pauses, one emphasis at most). " +
        "action voices: shortlist voices from the user's own and the Voice Library (filters: gender, age, accent, language, use_case like narrative_story / advertisement / informative_educational / social_media, search words like 'warm', 'confident', 'calm'); returns names, descriptions and PREVIEW links. Show the user 2-4 with links and let them choose by ear. " +
        "action audition: records ONE line (the hook) with 2-3 voices into <film>/sound/audition/ so the user compares the real line (costs characters; say so). " +
        "action speak: records every line [{ at, text }] with the chosen voice, chained so the delivery is one performance, with word timings saved to sound/voice-words.js (window.__voiceWords, for captions and syncing picture to words) and placed on the film's clock. Checked first: pace against each beat, AI-slop copy, invented numbers, characters left on the account. " +
        "Models: eleven_v4 (most expressive, audio tags like [curious] [excited] [whispers] at the start of a line), eleven_multilingual_v2 (steadiest over long reads), eleven_flash_v2_5 (cheap drafts). Settings: stability (lower = more varied and emotive; 0.35-0.55 for narration), similarity_boost (~0.75), style (0-0.3; higher costs stability), speed (0.9-1.1). Same seed for re-takes. " +
        'Examples: motion_voice({ action: "voices", use_case: "advertisement", gender: "female", search: "warm confident" }) · motion_voice({ action: "speak", voice_id: "<id>", lines: [{ at: 0.4, text: "You have forty-seven tabs open." }, { at: 3.2, text: "[warmly] We can fix that." }] })',
      inputSchema: {
        action: z.enum(["voices", "audition", "speak", "account"]),
        search: z.string().optional(),
        gender: z.enum(["male", "female", "neutral"]).optional(),
        age: z.enum(["young", "middle_aged", "old"]).optional(),
        accent: z.string().optional().describe("e.g. american, british, australian"),
        language: z.string().optional().describe("ISO code, e.g. en"),
        use_case: z.string().optional().describe("narrative_story, advertisement, informative_educational, social_media, conversational, characters_animation"),
        voice_id: z.string().optional(),
        voice_owner: z.string().optional().describe("public_owner_id of a Voice Library voice (it is added to the user's voices first)"),
        voice_ids: z.array(z.string()).optional().describe("audition: 2-3 voice ids (library voices as \"<public_owner_id>/<voice_id>\")"),
        model: z.string().optional().describe("Default eleven_v4; eleven_multilingual_v2 for long steady reads; eleven_flash_v2_5 for drafts"),
        lines: z.array(z.object({ at: z.number().min(0), text: z.string().min(1), len: z.number().optional(), checked: z.boolean().optional().describe("true when a number in the line is real and verified") })).optional(),
        settings: z.object({ stability: z.number().min(0).max(1).optional(), similarity_boost: z.number().min(0).max(1).optional(), style: z.number().min(0).max(1).optional(), speed: z.number().min(0.7).max(1.2).optional(), use_speaker_boost: z.boolean().optional() }).optional(),
        language_code: z.string().optional(),
        seed: z.number().int().optional(),
        dryRun: z.boolean().optional().describe("speak: check the plan and the cost without recording"),
      },
    },
    safe(async (a) => {
      const key = getKey("elevenlabs");
      if (!key) return text(KEY_HELP, true);
      const { task } = loadState();
      if (a.action === "account") {
        const s = await xi("/v1/user/subscription", { key });
        return text(`ElevenLabs: ${s.tier} (${s.status}), ${s.character_count}/${s.character_limit} characters used this period${s.next_character_count_reset_unix ? `, resets ${new Date(s.next_character_count_reset_unix * 1000).toISOString().slice(0, 10)}` : ""}.`);
      }
      if (a.action === "voices") {
        const q = new URLSearchParams({ page_size: "12" });
        for (const k of ["search", "gender", "age", "accent", "language"]) if (a[k]) q.set(k, a[k]);
        if (a.use_case) q.append("use_cases", a.use_case);
        const lib = await xi(`/v1/shared-voices?${q}`, { key }).catch((e) => ({ error: e.message, voices: [] }));
        const mineQ = new URLSearchParams({ page_size: "20" });
        if (a.search) mineQ.set("search", a.search);
        const mine = await xi(`/v2/voices?${mineQ}`, { key }).catch(() => ({ voices: [] }));
        const fmtMine = (mine.voices || []).slice(0, 8).map((v) => `- [yours] ${v.name} · ${v.voice_id} · ${Object.values(v.labels || {}).join(", ")}${v.description ? ` · ${v.description.slice(0, 80)}` : ""}\n  preview: ${v.preview_url || "-"}`);
        const fmtLib = (lib.voices || []).slice(0, 12).map((v) => `- [library] ${v.name} · ${v.public_owner_id}/${v.voice_id} · ${[v.gender, v.age, v.accent, v.use_case, v.descriptive].filter(Boolean).join(", ")}${v.description ? ` · ${v.description.slice(0, 90)}` : ""}\n  preview: ${v.preview_url || "-"}`);
        return text(
          `${fmtMine.length ? `Your voices:\n${fmtMine.join("\n")}\n` : ""}${fmtLib.length ? `Voice Library:\n${fmtLib.join("\n")}\n` : ""}${lib.error ? `(library search failed: ${lib.error})\n` : ""}\n` +
            "CASTING: match the voice to the brand (a calm product: warm, unhurried, mid-low pitch; a playful app: bright and quick; premium: close, intimate, never 'announcer'). Shortlist 2-4, give the user their preview links and let them pick by ear (AskUserQuestion), or audition the hook line on 2-3 (costs characters).",
        );
      }
      const model = a.model || "eleven_v4";
      const voiceSettings = { stability: 0.45, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 1, ...(a.settings || {}) };
      const dir = path.join(filmDir(task), "sound");
      fs.mkdirSync(dir, { recursive: true });
      // A library voice ("owner/voice") is added to the user's voices first; returns the usable voice_id.
      const resolveVoice = async (v, owner) => {
        const [o, id] = v.includes("/") ? v.split("/") : [owner, v];
        if (!o) return id;
        try {
          const r = await xi(`/v1/voices/add/${o}/${id}`, { method: "POST", key, body: { new_name: `drip ${id.slice(0, 6)}` } });
          return r.voice_id || id;
        } catch (e) {
          if (e.status === 400 || e.status === 409) return id; // already added
          throw e;
        }
      };
      const say = async (voice, line, prev = [], extra = {}) => {
        const body = { text: line, model_id: model, voice_settings: voiceSettings, apply_text_normalization: "auto", ...(a.language_code ? { language_code: a.language_code } : {}), ...(a.seed != null ? { seed: a.seed } : {}), ...extra };
        if (prev.length) body.previous_request_ids = prev.slice(-3);
        const res = await xi(`/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, { method: "POST", key, body, raw: true });
        const rid = res.headers.get("request-id") || res.headers.get("x-request-id");
        const j = await res.json();
        logUsage({ provider: "elevenlabs", kind: "tts", model, chars: line.length });
        return { rid, audio: Buffer.from(j.audio_base64, "base64"), alignment: j.alignment || j.normalized_alignment };
      };
      if (a.action === "audition") {
        const ids = a.voice_ids || [];
        const line = a.lines?.[0]?.text;
        if (ids.length < 2 || !line) return text("Pass voice_ids (2-3) and lines: [{ at: 0, text: <the hook line> }].", true);
        const adir = path.join(dir, "audition");
        fs.mkdirSync(adir, { recursive: true });
        const out = [];
        for (const v of ids.slice(0, 3)) {
          const id = await resolveVoice(v);
          const r = await say(id, line);
          const f = path.join(adir, `${id.slice(0, 10)}.mp3`);
          fs.writeFileSync(f, r.audio);
          out.push(`- ${v} → ${path.relative(projectDir(), f)}`);
        }
        return text(`Auditions (${line.length * ids.length} characters):\n${out.join("\n")}\nGive the user these files to play and ask which voice (AskUserQuestion). Then speak with that voice_id.`);
      }
      // speak
      if (!a.voice_id) return text("Pass voice_id (the chosen voice; a library voice as voice_owner + voice_id or \"owner/voice\").", true);
      const lines = a.lines || [];
      if (!lines.length) return text("Pass lines: [{ at, text }] in film time.", true);
      const chk = checkLines(lines, { beats: task?.motion?.storyboard?.beats || [] });
      if (chk.errors.length) return text(`Not recorded:\n${chk.errors.map((e) => `- ${e}`).join("\n")}`, true);
      const chars = lines.reduce((n, l) => n + l.text.length, 0);
      let left = null;
      try {
        const s = await xi("/v1/user/subscription", { key });
        left = s.character_limit - s.character_count;
      } catch {
        /* not fatal */
      }
      if (left != null && chars > left) return text(`This script needs ${chars} characters; the account has ${left} left this period. Shorten it or ask the user.`, true);
      if (a.dryRun) return text(`Plan OK: ${lines.length} lines, ${chars} characters (${left != null ? `${left} left` : "balance unknown"}), model ${model}.${chk.warnings.length ? `\nConsider:\n${chk.warnings.map((w) => `- ${w}`).join("\n")}` : ""}`);
      const voice = await resolveVoice(a.voice_id, a.voice_owner);
      const prev = [];
      const takes = [];
      for (const [i, l] of lines.entries()) {
        // Chain the performance: the request ids of the lines before (same model) keep tone and pace continuous.
        const r = await say(voice, l.text, prev, lines[i + 1] ? { next_text: lines[i + 1].text.replace(/\[[^\]]*\]/g, "").slice(0, 300) } : {});
        if (r.rid) prev.push(r.rid);
        const f = path.join(dir, `voice-${String(i + 1).padStart(2, "0")}.mp3`);
        fs.writeFileSync(f, r.audio);
        const words = wordsFrom(r.alignment, l.at);
        const end = words.length ? words.at(-1).end : l.at;
        takes.push({ at: l.at, text: l.text, file: path.relative(projectDir(), f).replace(/\\/g, "/"), words, end });
      }
      const wordsData = takes.map((t) => ({ at: t.at, text: t.text, words: t.words }));
      fs.writeFileSync(path.join(dir, "voice-words.json"), JSON.stringify(wordsData, null, 1));
      // Compositions never fetch (every renderer must play the file offline): the same data as a script to include.
      fs.writeFileSync(path.join(dir, "voice-words.js"), `window.__voiceWords = ${JSON.stringify(wordsData)};\n`);
      const lic = path.join(dir, "LICENCES.md");
      const prevLic = fs.existsSync(lic) ? fs.readFileSync(lic, "utf8") : "# Sound licences\n\n";
      if (!prevLic.includes("voice-01.mp3")) fs.writeFileSync(lic, `${prevLic}- voice-*.mp3: generated with ElevenLabs (${model}, voice ${voice}) on the user's account; usage under the user's ElevenLabs plan terms\n`);
      // Overlaps: a line still speaking when the next begins.
      const clash = takes.flatMap((t, i) => (takes[i + 1] && t.end > takes[i + 1].at - 0.1 ? [`line ${i + 1} ends ${t.end.toFixed(2)}s, the next starts ${takes[i + 1].at}s`] : []));
      const beatsEnd = task?.motion?.storyboard?.format?.duration;
      updateState((st) => {
        if (!st.task) return;
        const mo = (st.task.motion ||= { studied: [], renders: [] });
        mo.sound = { ...(mo.sound || { cues: [] }), voice: takes.map((t) => ({ at: t.at, file: t.file, text: t.text, end: t.end })), voiceModel: model, voiceId: voice };
      });
      return text(
        `Recorded ${takes.length} lines (${chars} characters, ${model}).\n${takes.map((t) => `- ${t.at.toFixed(2)}-${t.end.toFixed(2)}s ${t.file}: "${t.text}"`).join("\n")}\n` +
          `Word timings: ${path.relative(projectDir(), path.join(dir, "voice-words.js"))} (include it with a <script src> in the composition, then read window.__voiceWords; compositions never fetch). Captions and key moments time to words from it.\n` +
          (clash.length ? `OVERLAPS: ${clash.join("; ")}: move the next line later or shorten this one, then speak again (same seed).\n` : "") +
          (beatsEnd && takes.at(-1).end > beatsEnd ? `The last line runs past the film's end (${beatsEnd}s).\n` : "") +
          (chk.warnings.length ? `Consider:\n${chk.warnings.map((w) => `- ${w}`).join("\n")}\n` : "") +
          "LISTEN-THROUGH CHECK for the user: play the files in order. Re-record single lines by speaking just those lines with the same voice and seed.",
      );
    }),
  );
}

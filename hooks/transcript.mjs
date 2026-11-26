// What really happened in the session, read from the host's transcript (Claude Code's JSONL): the user's own messages,
// their answers to AskUserQuestion, and the drip:critic subagent's own output. Drip's claim tools (skip, ship, one more
// round, the brief, the critic's verdict) are checked against this instead of the agent's word.
import fs from "node:fs";

export const NOT_THE_USER = /^\s*(<task-notification|<system-reminder|Stop hook feedback|This session is being continued|\[Request interrupted|Caveat:|<command-|<local-command|\[SYSTEM NOTIFICATION)/i;

/** The user's own words in a prompt: task notifications (a builder's or the critic's report), system reminders and
 *  hook feedback arrive as prompts too, and are never the user asking for something. */
export function userWords(prompt) {
  const t = String(prompt || "")
    .replace(/<(task-notification|system-reminder|local-command-stdout|local-command-stderr)>[\s\S]*?<\/\1>/gi, "")
    .trim();
  return !t || NOT_THE_USER.test(t) ? "" : t;
}

const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((b) => (b?.type === "text" ? b.text : typeof b === "string" ? b : "")).join("\n") : "");

/** { user: [{at, text}], answers: [{at, text}], critic: [{at, text}], starts: [at] } or null when there is no transcript. */
export function readTranscript(file) {
  if (!file || !fs.existsSync(file)) return null;
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const out = { user: [], answers: [], critic: [], starts: [] };
  const toolName = new Map(); // tool_use id -> "ask" | "critic" | "start"
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const at = o.timestamp || "";
    const c = o.message?.content;
    if (o.type === "assistant" && Array.isArray(c)) {
      for (const b of c) {
        if (b?.type !== "tool_use") continue;
        if (b.name === "AskUserQuestion") toolName.set(b.id, "ask");
        else if (/^(Agent|Task)$/.test(b.name) && /critic/i.test(String(b.input?.subagent_type || ""))) toolName.set(b.id, "critic");
        else if (/drip_start$/.test(String(b.name))) out.starts.push(at);
      }
      continue;
    }
    if (o.type !== "user" || o.isMeta) continue;
    if (typeof c === "string" || (Array.isArray(c) && !c.some((b) => b?.type === "tool_result"))) {
      const t = textOf(c);
      // A background subagent's result arrives as a task notification naming the tool call that launched it.
      const note = /^\s*<task-notification>/.test(t) && t.match(/<tool-use-id>([^<]+)<\/tool-use-id>/);
      if (note) {
        if (toolName.get(note[1]) === "critic") out.critic.push({ at, text: (t.match(/<result>([\s\S]*?)<\/result>/) || [])[1] || "" });
        continue;
      }
      if (t.trim() && !NOT_THE_USER.test(t)) out.user.push({ at, text: t });
      continue;
    }
    for (const b of c) {
      if (b?.type !== "tool_result") continue;
      const kind = toolName.get(b.tool_use_id);
      const t = textOf(b.content);
      if (kind === "ask") out.answers.push({ at, text: t });
      else if (kind === "critic" && /VERDICT\s*:/i.test(t)) out.critic.push({ at, text: t });
    }
  }
  return out;
}

const words = (s) => String(s || "").toLowerCase().replace(/&amp;/g, "&").match(/[a-z0-9']{3,}/g) || [];

/** Did the user say this (a quote of their words, loosely: most of its words in one of their messages)? */
export function userSaid(tr, quote, { after = "" } = {}) {
  const q = [...new Set(words(quote))];
  if (!q.length) return false;
  return [...tr.user, ...tr.answers].some((m) => {
    if (after && m.at && m.at < after) return false;
    const w = new Set(words(m.text));
    return q.filter((x) => w.has(x)).length / q.length >= 0.6;
  });
}

/** Any message or answer from the user after `after` matching re. */
export function userReplied(tr, re, after = "") {
  return [...tr.user, ...tr.answers].some((m) => (!after || !m.at || m.at >= after) && re.test(m.text));
}

/** The critic's own verdict and scores, from its latest output after `after`. */
export function criticVerdict(tr, after = "") {
  const last = tr.critic.filter((c) => !after || !c.at || c.at >= after).at(-1);
  if (!last) return null;
  const t = last.text.replace(/&amp;/g, "&");
  const verdict = (t.match(/VERDICT\s*:\s*\**\s*(PASS|REVISE|REJECT)/i) || [])[1]?.toLowerCase() || null;
  const scores = {};
  const line = (t.match(/SCORES\s*:([^\n]*)/i) || [])[1] || "";
  for (const m of line.matchAll(/([a-z][a-z &/-]*?)\s+(\d+(?:\.\d+)?)\s*\/\s*10/gi)) scores[m[1].toLowerCase().replace(/[^a-z]/g, "")] = Number(m[2]);
  return verdict ? { verdict, scores, at: last.at } : null;
}

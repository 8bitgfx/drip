// Where motion references come from, best first. Keyword search alone finds whatever is tagged with the words
// (freelance templates, AI clips, animated dashboards), so a film's references start from MASTERS: studios and
// designers whose work is the bar (content/data/motion-masters.json, vetted by watching their work), then open
// search with a quality floor. 24fps.dev (indie films made in code) is opt-in: technique, not taste.
import fs from "node:fs";
import path from "node:path";
import { get } from "../../core/http.mjs";
import { dataDir } from "../../core/paths.mjs";
import { listing, thumbUrl } from "../refs/dribbble.mjs";

const DAY = 24 * 3600e3;
// Kisto marks AI-generated work by discipline and tool tags; none of it is a reference for craft.
const AI_TAGS = /^(genai|ai|ai-generated|kling|runway|sora|veo|midjourney|pika|luma|hailuo|minimax|ai-video|ai-art)$/i;

function mastersFile() {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, "motion-masters.json"), "utf8"));
  } catch {
    return {};
  }
}
export const loadMasters = () => mastersFile().masters || [];

/** Makers watched and found below the bar: open search drops their work. */
export function isRejected(creator) {
  const c = String(creator || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return !!c && (mastersFile().rejected || []).some((r) => c.includes(String(r.name).toLowerCase().replace(/[^a-z0-9]/g, "")));
}

/** "1.2k" -> 1200. */
export function parseLikes(s) {
  const m = String(s || "").trim().match(/^([\d.,]+)\s*([km])?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Math.round(n * (m[2] ? (m[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1));
}

// Words in a query -> the kinds of film in motion-masters.json.
const KIND_WORDS = [
  ["product-launch", /\b(launch|promo|product|saas|app|startup|announcement|teaser|hype|commercial|ad)\b/i],
  ["ui-motion", /\b(ui|interface|dashboard|app|screen|cursor|demo|onboarding|interaction)\b/i],
  ["brand-film", /\b(brand|identity|manifesto|story|film)\b/i],
  ["explainer", /\b(explain|explainer|how it works|tutorial|education)\b/i],
  ["kinetic-type", /\b(type|typography|kinetic|text|lettering|words)\b/i],
  ["3d-product", /\b(3d|render|product shot|hardware|device|cgi|cinema ?4d|blender)\b/i],
  ["abstract", /\b(abstract|shape|morph|loop|geometric|fluid|generative|particles|transition)\b/i],
  ["logo", /\b(logo|sting|reveal|ident|mark)\b/i],
];

export function kindsFor(text) {
  return KIND_WORDS.filter(([, re]) => re.test(text)).map(([k]) => k);
}

const words = (q) =>
  String(q)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => (w.length > 2 || /^(ai|ui|ux|3d|tv)$/.test(w)) && !/^(the|and|for|with|video|film|motion|design|animation|new|our|drip)$/.test(w));

// A word in a query also matches the words a title uses for the same thing ("launch" finds "Introducing…").
const SAME = [
  ["launch", "launch|introducing|announcing|announcement|reveal|release|promo|teaser|trailer|keynote|product"],
  ["ai", "ai|gpt|llm|agent|assistant|model|intelligence|neural|copilot|chatbot"],
  ["saas", "saas|app|platform|startup|software|workspace|dashboard"],
  ["product", "product|launch|app|device|feature"],
  ["brand", "brand|identity|manifesto|rebrand"],
  ["ui", "ui|interface|app|screen|product"],
  ["logo", "logo|ident|sting|mark|reveal"],
];
const SAME_RE = new Map(SAME.map(([w, alts]) => [w, new RegExp(`\\b(${alts})`, "i")]));

/** How well a title/tags match a query: shared words (and their synonyms). */
export const matchScore = (q, textIn) => {
  const t = String(textIn).toLowerCase();
  return words(q).filter((w) => (SAME_RE.get(w) ? SAME_RE.get(w).test(t) : new RegExp(`\\b${w}`).test(t))).length;
};

/** The masters whose kinds fit the queries, best fit first. */
export function pickMasters(queries, masters = loadMasters(), max = 4) {
  const want = new Set(queries.flatMap(kindsFor));
  const scored = masters.map((m, i) => ({ m, s: (m.kinds || []).filter((k) => want.has(k)).length * 10 - i * 0.01 }));
  const fit = scored.filter((x) => x.s > 0 || !want.size).sort((a, b) => b.s - a.s);
  return (fit.length ? fit : scored).slice(0, max).map((x) => x.m);
}

/** A master's work: their Dribbble video shots and their Kisto pieces, best match to the queries first. */
export async function mastersWork(queries, { max = 4, per = 3, config } = {}) {
  const out = [];
  for (const m of pickMasters(queries, undefined, max)) {
    const items = [];
    if (m.dribbble) {
      try {
        const r = await listing("designer", { username: m.dribbble }, config);
        for (const c of r.cards.filter((c) => c.video))
          items.push({ from: "dribbble", master: m.name, style: m.style, title: c.title, creator: c.designer || m.name, url: c.url, poster: c.image ? thumbUrl(c.image, 400, 300) : null, video: c.video, likes: parseLikes(c.likes), tags: m.kinds || [] });
      } catch {
        /* rate-limited or gone: the others still count */
      }
    }
    if (m.kisto) {
      try {
        const { body } = await get(`https://kisto.app/api/v1/items?creator=${encodeURIComponent(m.kisto)}&limit=12`, { as: "json", ttlMs: DAY, delayMs: 1100 });
        for (const it of kistoClean(body?.items || [])) items.push({ ...kistoItem(it), master: m.name, style: m.style });
      } catch {
        /* skip */
      }
    }
    // A master's whole portfolio is not a reference for every film: only pieces whose title fits the subject.
    // (Their kinds already fit; a "Range Rover" spot is still not a reference for an AI product launch.)
    const q = queries.join(" ");
    const scored = items.map((it) => ({ it, s: matchScore(q, `${it.title} ${(it.tags || []).join(" ")}`) })).filter((x) => x.s > 0 && !BLANK_TITLE.test(x.it.title || ""));
    scored.sort((a, b) => b.s - a.s || (b.it.likes || 0) - (a.it.likes || 0));
    out.push(...scored.slice(0, per).map((x) => x.it));
  }
  return out;
}

// Animated UI showcases (a landing page or dashboard that moves) are page design, not films.
// Teaching material and stock templates aren't references for craft.
const NOT_WORK = /\b(tutorial|template|course|how to|after effects tutorial|no plugins|preset pack|free download)\b/i;
const UI_SHOWCASE = /\b(landing page|website|web site|dashboard|ui ?\/? ?ux|ui design|app design|web design|homepage)\b/i;

/** Dribbble's animation category, video shots only, no paid boosts, a like floor, best liked first. */
export async function searchDribbbleMotion(q, { per = 6, minLikes = 40, config } = {}) {
  const r = await listing("search", { query: q, category: "animation", sort: "popular" }, config);
  return r.cards
    .filter((c) => c.video && !c.boosted && parseLikes(c.likes) >= minLikes && !isRejected(c.designer) && !isRejected(c.designerUrl) && !UI_SHOWCASE.test(c.title || "") && !NOT_WORK.test(c.title || ""))
    .sort((a, b) => parseLikes(b.likes) - parseLikes(a.likes))
    .slice(0, per)
    .map((c) => ({ from: "dribbble", title: c.title, creator: c.designer, url: c.url, poster: c.image ? thumbUrl(c.image, 400, 300) : null, video: c.video, likes: parseLikes(c.likes), tags: ["animation"] }));
}

// Titles that say nothing about the piece ("Untitled", "Shot 12", a lone emoji) can't be judged from a list.
const BLANK_TITLE = /^\s*(untitled|shot ?\d*|wip|test|\W*)\s*$/i;

const kistoClean = (items) => items.filter((it) => ![...(it.disciplines || []), ...(it.tags || [])].some((t) => AI_TAGS.test(t)) && !NOT_WORK.test(it.title || ""));
const kistoItem = (it) => ({
  from: "kisto",
  title: it.title,
  creator: it.creator?.name,
  url: it.url,
  post: it.source?.url,
  poster: it.thumbnailUrl,
  video: it.previewUrl || null,
  seconds: it.durationSeconds,
  tags: [...(it.disciplines || []), ...(it.tags || []).slice(0, 5)],
  aspect: it.aspectRatio || null,
  posted: it.publishedAt ? String(it.publishedAt).slice(0, 7) : null,
});

export async function searchKisto(q, limit) {
  const { body } = await get(`https://kisto.app/api/v1/items?q=${encodeURIComponent(q)}&limit=${Math.min(50, limit * 2)}`, { as: "json", ttlMs: DAY, delayMs: 1100 });
  return kistoClean(body?.items || []).filter((it) => !isRejected(it.creator?.name)).slice(0, limit).map(kistoItem);
}

export async function search24fps(q, limit) {
  const { body } = await get(`https://24fps.dev/api/clips?q=${encodeURIComponent(q)}`, { as: "json", ttlMs: DAY });
  return (body?.results || [])
    .filter((c) => c.preview_mp4)
    .slice(0, limit)
    .map((c) => ({ from: "24fps", title: c.title, creator: c.creator, url: c.url, post: c.original_post, poster: c.poster, video: c.preview_mp4, seconds: c.duration_s, tags: [c.category, c.framework].filter(Boolean), code: c.source && c.source !== "none" ? `${c.source} source on its 24fps page` : null }));
}

/** Both open sources match every word: relax a long query (pairs of words, then single words). */
export function relaxQuery(q) {
  const stop = new Set("a an the and of for with in on to my our video film animation motion design".split(" "));
  const w = q.toLowerCase().split(/\s+/).filter((x) => x && !stop.has(x));
  const out = [q];
  for (let i = 0; i + 1 < w.length; i++) out.push(`${w[i]} ${w[i + 1]}`);
  // Single words only for a one-word query: "ai" alone or "launch" alone finds anything tagged with it.
  if (w.length < 2) out.push(...w);
  return [...new Set(out)].slice(0, 5);
}

export async function searchRelaxed(fn, q, per) {
  const got = [];
  const seen = new Set();
  for (const v of relaxQuery(q)) {
    const r = await fn(v, per);
    for (const it of r) if (!seen.has(it.url) && seen.add(it.url)) got.push(it);
    if (got.length >= per) break;
  }
  return got.slice(0, per);
}

// Launch films of AI, SaaS, developer-tool and tech brands (content/data/launch-films.json): official films posted
// by the brands on YouTube, X and Vimeo, each checked to play. A launch brief studies these first: the open
// sources are mostly freelance shots, never how a real company announced a real product.
function launchFile() {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, "launch-films.json"), "utf8"));
  } catch {
    return {};
  }
}
export const loadLaunches = () => launchFile().films || [];

/** Briefs that are about announcing a product: launch films lead their references. */
export const LAUNCHY = /\b(launch|launches|announce|announcement|introducing|reveal|release|product|promo|trailer|teaser|keynote|commercial|saas|startup|app|ai|agent|brand film)\b/i;

const TOPICS = [
  ["ai", /\b(ai|a\.i\.|llm|gpt|agent|assistant|model|chatbot|genai|copilot|intelligence)\b/i],
  ["devtool", /\b(dev|developer|devtool|code|coding|ide|terminal|api|cli|plugin|git|deploy)\b/i],
  ["saas", /\b(saas|b2b|startup|platform|workspace|productivity|team|app)\b/i],
  ["fintech", /\b(fintech|bank|banking|payments?|finance|card|money)\b/i],
  ["consumer", /\b(consumer|music|social|travel|shopping|photo)\b/i],
  ["hardware", /\b(hardware|device|phone|laptop|headphones|watch|chip)\b/i],
  ["ui-heavy", /\b(ui|interface|screen|dashboard|cursor|demo)\b/i],
  ["kinetic-type", /\b(type|typography|kinetic|text)\b/i],
  ["3d", /\b(3d|cgi|render)\b/i],
  ["minimal", /\b(minimal|clean|calm|simple)\b/i],
  ["playful", /\b(playful|fun|colorful|colourful|bold)\b/i],
  ["dark", /\b(dark|night|black)\b/i],
];
export const topicsFor = (text) => TOPICS.filter(([, re]) => re.test(text)).map(([t]) => t);

/** The launch films that fit the queries, best first: a brand named in the queries, then shared topics and words. */
export function searchLaunches(queries, { per = 8, films = loadLaunches() } = {}) {
  const q = queries.join(" ");
  const want = new Set(topicsFor(q));
  const ql = q.toLowerCase();
  const scored = films.map((f, i) => {
    const brand = String(f.brand || "").toLowerCase();
    const named = brand && ql.includes(brand) ? 8 : 0;
    const shared = (f.tags || []).filter((t) => want.has(t)).length * 3;
    const said = matchScore(q, `${f.title} ${f.why || ""} ${(f.tags || []).join(" ")} ${f.kind || ""}`);
    // Films made with motion design lead; mostly-on-camera launches teach the story, not the moves.
    const made = f.study === "story" && !/\b(live|actor|people|founder|story)\b/i.test(q) ? -2 : 0;
    return { f, s: named + shared + said + made - i * 0.001 };
  });
  const fit = scored.filter((x) => x.s >= 1).sort((a, b) => b.s - a.s);
  return (fit.length ? fit : LAUNCHY.test(q) ? scored : [])
    .slice(0, per)
    .map(({ f }) => ({ from: "launch", brand: f.brand, title: `${f.brand}: ${f.title}${f.year ? ` (${f.year})` : ""}`, creator: f.brand, url: f.url, video: f.url, poster: f.poster || null, seconds: f.seconds, about: f.about || null, tags: f.tags || [], why: f.study === "story" ? `${f.why || ""} (mostly on camera: study it for the story, not the moves)`.trim() : f.why, launch: true }));
}

/**
 * A post's own description, made readable for choosing a reference: no links, hashtag runs or "follow us" lines,
 * whitespace collapsed, cut at a sentence near `max` characters.
 */
export function cleanAbout(s, max = 320) {
  const lines = String(s || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+|\b[\w-]+\.(com|io|app|dev|so|co|ai)\/\S*/gi, "").replace(/(^|\s)#\w+/g, "").replace(/[ \t]+/g, " ").trim())
    .filter((l) => l && !/^(follow|subscribe|download|like us|visit|learn more|try (it|raycast|now)|sign up|join|website|docs|get started|more videos|connect with|read (our|more)|check out|see (what|everything)|find us|add us|technical deep dive|want to see)\b/i.test(l) && !/^[:\-–—_|•·\s]*$/.test(l) && !/:\s*$/.test(l));
  let t = lines
    .join(" ")
    .replace(/_{2,}.*$/, "")
    .replace(/\s*\b(try it( now)?|learn more|read more|sign up)( (at|here|on))?\s*$/i, "").replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    t = end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
  }
  return t;
}

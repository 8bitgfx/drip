// What a reference is, in words: a poster says little about a film, so each one in motion_refs comes with what its
// maker wrote about it and the facts that help choose (length, aspect, date, views, palette, tags). Dribbble shots: the
// shot page (description, tags, palette, views). Kisto pieces: their source post on Vimeo or YouTube, read with yt-dlp.
// Launch films carry theirs in launch-films.json. Everything is cached; whatever isn't back within the budget is
// shown without it.
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { homeDripDir } from "../../core/paths.mjs";
import { shot } from "../refs/dribbble.mjs";
import { cleanAbout } from "./refsources.mjs";
import { ensureYtDlp, fetchableUrl } from "./sitevideo.mjs";

const cacheDir = () => path.join(process.env.DRIP_HOME || homeDripDir, "cache", "about");

/** A post's facts from yt-dlp (no download): { seconds, views, posted, about }, cached for a month. */
export async function postFacts(url) {
  const dir = cacheDir();
  const file = path.join(dir, `${crypto.createHash("sha1").update(url).digest("hex").slice(0, 16)}.json`);
  try {
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - c.at < 30 * 24 * 3600e3) return c.facts;
  } catch {
    /* not cached */
  }
  const bin = await ensureYtDlp();
  const out = await new Promise((resolve) =>
    execFile(bin, ["--simulate", "--encoding", "utf-8", "--no-warnings", "--playlist-items", "1", "--print", "%(duration)s\t%(view_count)s\t%(upload_date)s\t%(description)j", fetchableUrl(url)], { timeout: 45e3, windowsHide: true, maxBuffer: 4 << 20 }, (err, so) => resolve(err ? null : so.trim().split("\n")[0])),
  );
  if (!out) return null;
  const [dur, views, date, desc] = out.split("\t");
  let about = "";
  try {
    about = cleanAbout(JSON.parse(desc));
  } catch {
    /* no description */
  }
  const facts = { seconds: Math.round(+dur) || null, views: +views || null, posted: /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}` : null, about };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ at: Date.now(), facts }));
  return facts;
}

async function describeOne(it, config) {
  const shotId = it.from === "dribbble" && String(it.url).match(/\/shots\/(\d+)/)?.[1];
  if (shotId) {
    const sh = await shot(shotId, config);
    it.about = cleanAbout(sh.description);
    it.palette = (sh.palette || []).slice(0, 5);
    it.views = sh.views || null;
    it.posted = sh.postedOn ? String(sh.postedOn).trim() : null;
    if (sh.tags?.length) it.tags = [...new Set([...(sh.tags || []), ...(it.tags || []).filter((t) => t !== "animation")])].slice(0, 6);
    return;
  }
  if (it.post && /(^|\.)(vimeo\.com|youtube\.com|youtu\.be)/i.test(it.post)) {
    const f = await postFacts(it.post);
    if (!f) return;
    it.about = f.about;
    it.seconds ||= f.seconds;
    it.views ||= f.views;
    it.posted ||= f.posted;
  }
}

/** Fill about/palette/views/posted on the items in place (two at a time, Dribbble rate-limits), within budgetMs. */
export async function describeRefs(items, { config, budgetMs = 40e3 } = {}) {
  const queue = items.filter((it) => !it.launch && !it.about);
  const work = Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let it; (it = queue.shift()); ) await describeOne(it, config).catch(() => {});
    }),
  );
  await Promise.race([work, new Promise((r) => setTimeout(r, budgetMs).unref?.())]);
  queue.length = 0;
  return items;
}

/** One reference as text: what it is, who made it, the facts, what its maker says, where to watch. */
export function refText(it, n) {
  const kind = it.launch ? "LAUNCH FILM" : it.master ? `MASTER: ${it.master}` : `${it.from}${it.open ? ", open search: judge before using" : ""}`;
  const facts = [
    it.creator && it.creator !== it.master && !it.launch ? `by ${it.creator}` : null,
    it.seconds ? `${it.seconds}s` : null,
    it.aspect ? (it.aspect < 0.9 ? "vertical" : it.aspect > 1.2 ? "landscape" : "square") : null,
    it.posted ? `posted ${it.posted}` : null,
    it.views ? `${it.views >= 1e6 ? `${(it.views / 1e6).toFixed(1)}M` : it.views >= 1e3 ? `${Math.round(it.views / 1e3)}k` : it.views} views` : null,
    it.likes ? `${it.likes} likes` : null,
  ].filter(Boolean);
  return [
    `${n}. [${kind}] ${it.title}${facts.length ? ` · ${facts.join(" · ")}` : ""}`,
    it.about ? `   says: "${it.about}"` : null,
    it.why ? `   why: ${it.why}` : null,
    it.tags?.length ? `   tags: ${it.tags.slice(0, 8).join(", ")}` : null,
    it.palette?.length ? `   palette: ${it.palette.join(" ")}` : null,
    `   ${it.url}${it.video && it.video !== it.url ? `\n   video: ${it.video}` : ""}${it.code ? `\n   code: ${it.code}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

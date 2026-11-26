// Videos that live on platforms (YouTube, X, Vimeo, Instagram, TikTok, LinkedIn…) are not plain <video> elements a
// headless tab can seek: X needs a login to play, Vimeo plays inside an iframe, YouTube streams in pieces. yt-dlp
// (Unlicense, the official release binary) fetches a 720p MP4 of a public post without an account, which then plays
// from memory like any local file. Fetched once into ~/.drip/vendor/bin; downloaded videos are cached for a week.
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { homeDripDir } from "../../core/paths.mjs";
import { vendorDir } from "../../core/vendor.mjs";
import { mediaTools } from "./renderers.mjs";

/** Hosts whose pages never hold a seekable <video> for a logged-out tab: go straight to yt-dlp. */
const PLATFORMS = /(^|\.)(youtube\.com|youtu\.be|x\.com|twitter\.com|vimeo\.com|instagram\.com|tiktok\.com|linkedin\.com|threads\.net|facebook\.com|fb\.watch|bilibili\.com|streamable\.com|loom\.com|wistia\.com|reddit\.com)$/i;

export function isPlatformVideo(url) {
  try {
    return PLATFORMS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * The URL yt-dlp can fetch without an account. vimeo.com pages ask for a login; the player URL of the same video
 * doesn't. twitter.com is x.com.
 */
export function fetchableUrl(url) {
  const u = new URL(url);
  const vimeo = /(^|\.)vimeo\.com$/i.test(u.hostname) && !/^player\./i.test(u.hostname) ? u.pathname.match(/\/(\d{5,})(?:\/|$)/) : null;
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

const binName = () => (process.platform === "win32" ? "yt-dlp.exe" : process.platform === "darwin" ? "yt-dlp_macos" : "yt-dlp_linux");
const binPath = () => path.join(vendorDir(), "bin", binName());

let fetching = null;
/** The yt-dlp binary, fetched from its official GitHub release the first time. */
export async function ensureYtDlp() {
  const file = binPath();
  if (fs.existsSync(file) && fs.statSync(file).size > 1e6) return file;
  if (fetching) return fetching;
  fetching = (async () => {
    const res = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binName()}`, { redirect: "follow" });
    if (!res.ok) throw new Error(`could not fetch yt-dlp (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.part`, buf);
    fs.renameSync(`${file}.part`, file);
    if (process.platform !== "win32") fs.chmodSync(file, 0o755);
    return file;
  })();
  try {
    return await fetching;
  } finally {
    fetching = null;
  }
}

const cacheDir = () => path.join(process.env.DRIP_HOME || homeDripDir, "cache", "videos");

/**
 * Download a platform post's video (≤720p MP4, the first video of a post) and return its path. Throws with yt-dlp's
 * own reason (private, login needed, DRM) when it can't.
 */
export async function fetchSiteVideo(url, { timeoutMs = 6 * 60e3 } = {}) {
  const src = fetchableUrl(url);
  const dir = cacheDir();
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.createHash("sha1").update(src).digest("hex").slice(0, 16);
  const out = path.join(dir, `${id}.mp4`);
  if (fs.existsSync(out) && Date.now() - fs.statSync(out).mtimeMs < 7 * 24 * 3600e3) return out;
  const bin = await ensureYtDlp();
  const { ffmpeg } = mediaTools();
  const args = [
    "--no-progress",
    "--no-warnings",
    "--encoding",
    "utf-8",
    "--playlist-items",
    "1",
    "--max-filesize",
    "200M",
    "-S",
    "res:720,ext:mp4:m4a",
    "--check-formats",
    "--merge-output-format",
    "mp4",
    "-o",
    path.join(dir, `${id}.%(ext)s`),
  ];
  if (ffmpeg) args.push("--ffmpeg-location", ffmpeg);
  args.push(src);
  const r = await new Promise((resolve) => execFile(bin, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 << 20 }, (err, so, se) => resolve({ err, out: `${so}\n${se}` })));
  if (fs.existsSync(out)) return out;
  // Without ffmpeg yt-dlp may keep a single non-mp4 file: use whatever it wrote.
  const other = fs.readdirSync(dir).find((f) => f.startsWith(`${id}.`) && /\.(mp4|webm|mov|m4v)$/i.test(f));
  if (other) return path.join(dir, other);
  const why = (r.out.match(/ERROR:.*$/m)?.[0] || r.err?.message || "no video").replace(/\s*Use --cookies.*$/s, "").slice(0, 300);
  throw new Error(`could not fetch the video from ${new URL(url).hostname}: ${why}`);
}

// Every reference provider in one list. Add a provider by pushing it here (or, in tests and from a project,
// with registerProvider). Dribbble and refs_site stay in modules/refs; these are the extra sources.
import { arena } from "./arena.mjs";
import { providers as designGalleries } from "./design-galleries.mjs";
import { providers as galleries } from "./galleries.mjs";
import { onepagelove } from "./onepagelove.mjs";
import { twentyfirst } from "./twentyfirst.mjs";

const list = [...galleries.filter((p) => ["awwwards", "minimalgallery"].includes(p.id)), onepagelove, twentyfirst, arena, ...galleries.filter((p) => ["httpster", "darkmode", "godly"].includes(p.id)), ...designGalleries];

export const allProviders = () => [...list];

export function registerProvider(p) {
  if (!p?.id || typeof p.search !== "function") throw new Error("A provider needs an id and a search(query, opts) function");
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.push(p);
  return p;
}

export function unregisterProvider(id) {
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list.splice(i, 1);
}

export const getProvider = (id) => list.find((p) => p.id === id || p.id === String(id).toLowerCase().replace(/[^a-z0-9]/g, ""));

/** Sites that were tried and cannot be used without a login or a human check; documented, not adapters. */
export const NOT_USABLE = [
  { id: "siteinspire", label: "Siteinspire", why: "answers HTTP 429 and a Vercel security checkpoint to scripted requests (checked 2026-11-24)" },
  { id: "behance", label: "Behance", why: "HTTP 403 on public search; the API needs a client id" },
  { id: "landbook", label: "Land-book", why: "answers scripted requests with HTTP 403 (a Cloudflare check); the pages open in a normal browser (checked 2026-11-24)" },
  { id: "lapaninja", label: "Lapa Ninja", why: "same: HTTP 403 to scripted requests, fine in a normal browser" },
  { id: "fps60", label: "60fps.design", why: "every shot is a video of an iOS interaction: a still poster says nothing about the motion, so it is no use to a model (removed 2026-11-26)" },
  { id: "mobbin", label: "Mobbin", why: "screens load only after login in a script-rendered app; open it in your own browser" },
];

// Are.na: public blocks (mood, print, objects, interfaces). The API needs an access token now (anonymous calls get
// a 401), so this provider is off until one is set: env ARENA_TOKEN (or ARENA_API_KEY), or "arena" in ~/.drip/keys.json.
// Get a token at https://www.are.na/settings/personal-access-tokens. Not verified live without a token.
import { getKey } from "../../../core/keys.mjs";
import { makeItem } from "../contract.mjs";

const API = "https://api.are.na/v3";

export const token = () => process.env.ARENA_TOKEN || getKey("arena");

/** Read blocks out of either API shape (v3 { data: [...] } or v2 { blocks: [...] }). */
export function parseArena(json) {
  const list = json?.data || json?.blocks || json?.contents || [];
  const out = [];
  for (const b of list) {
    const image = b.image?.display?.url || b.image?.large?.url || b.image?.original?.url || b.image?.src || b.image?.url || b.thumbnail?.url;
    if (!image) continue;
    const id = b.id ?? b.slug;
    out.push(
      makeItem("arena", {
        id,
        title: b.title || b.generated_title || b.name || `Block ${id}`,
        url: b.source?.url || (b.id ? `https://www.are.na/block/${b.id}` : ""),
        image,
        author: b.user?.name || b.user?.username || b.user?.full_name,
        tags: ["moodboard"],
        kind: "image",
        copy: b.description || undefined,
      }),
    );
  }
  return out;
}

export const arena = {
  id: "arena",
  label: "Are.na",
  kinds: ["image", "site"],
  status: "needs-key",
  needsKey: "ARENA_TOKEN",
  async search(query, { limit = 24, page = 1, config }) {
    const t = token();
    if (!t) throw new Error("Are.na needs an access token: set ARENA_TOKEN (https://www.are.na/settings/personal-access-tokens)");
    const url = `${API}/search?query=${encodeURIComponent(query || "interface")}&type=Image&per=${Math.min(limit, 50)}&page=${page}`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${t}`, "user-agent": config?.refs?.userAgent || "drip-mcp (design reference search)", accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Are.na: HTTP ${res.status}${res.status === 401 ? " (token rejected)" : ""}`);
    return parseArena(await res.json()).slice(0, limit);
  },
};

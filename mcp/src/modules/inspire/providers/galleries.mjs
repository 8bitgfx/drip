// Site galleries read from their public pages: Awwwards, Minimal Gallery (WordPress REST), Httpster,
// Dark Mode Design, Godly. Each parser takes the page HTML and returns normalised items, so
// tests can run it on a fixture; search() fetches the right page (politely, cached) and parses it.
import { abs, decode, getHtml, hostOf, makeItem, rankByQuery, slugify, strip } from "../contract.mjs";

const q = encodeURIComponent;

// ---- Awwwards: every card carries its data as JSON in data-collectable-model-value -----------------------
export function parseAwwwards(html) {
  const out = [];
  for (const chunk of html.split(/<li[^>]*data-collectable-model-value=/).slice(1)) {
    const raw = chunk.match(/^"([^"]*)"/)?.[1];
    if (!raw) continue;
    let m;
    try {
      m = JSON.parse(decode(raw));
    } catch {
      continue;
    }
    const slug = m.slug || m.collectableIdentifier;
    const thumb = m.images?.thumbnail || m.collectableImage;
    if (!slug || !thumb) continue;
    const live = chunk.match(/class="figure-rollover__bt"\s+href="(https?:[^"]+)"/)?.[1] || chunk.match(/href="(https?:\/\/(?!www\.awwwards\.com)[^"]+)"/)?.[1] || "";
    out.push(
      makeItem("awwwards", {
        id: slug,
        title: m.title || m.collectableTitle,
        url: `https://www.awwwards.com/sites/${slug}`,
        image: `https://assets.awwwards.com/awards/media/cache/thumb_880_660/${thumb}`,
        author: hostOf(live),
        tags: m.tags || [],
        kind: "site",
        live: live || undefined,
        awardedAt: m.createdAt ? new Date(m.createdAt * 1000).toISOString().slice(0, 10) : undefined,
      }),
    );
  }
  return out;
}

const awwwards = {
  id: "awwwards",
  label: "Awwwards",
  kinds: ["site"],
  status: "works",
  async search(query, { limit = 24, page = 1, config }) {
    const url = `https://www.awwwards.com/websites/?${query ? `text=${q(query)}&` : ""}page=${page}`;
    const found = parseAwwwards(await getHtml(url, config));
    if (!query) return found.slice(0, limit);
    // A query it can't match returns its usual list: compare with the unfiltered page and call that no match.
    const plain = new Set(parseAwwwards(await getHtml(`https://www.awwwards.com/websites/?page=${page}`, config)).map((i) => i.key));
    const same = found.filter((i) => plain.has(i.key)).length;
    return (found.length && same / found.length > 0.6 ? found.map((i) => ({ ...i, feed: true })) : found).slice(0, limit);
  },
};

// ---- Minimal Gallery: WordPress; the REST API has a real search --------------------------------------------
export function parseMinimalGallery(posts) {
  const out = [];
  for (const p of Array.isArray(posts) ? posts : []) {
    const media = p._embedded?.["wp:featuredmedia"]?.[0];
    const image = media?.media_details?.sizes?.large?.source_url || media?.source_url;
    if (!image || !p.link) continue;
    const terms = (p._embedded?.["wp:term"] || []).flat().map((t) => t.name);
    out.push(makeItem("minimalgallery", { id: p.slug || p.id, title: strip(p.title?.rendered || ""), url: p.link, image, tags: terms, kind: "site" }));
  }
  return out;
}

const minimalgallery = {
  id: "minimalgallery",
  label: "Minimal Gallery",
  kinds: ["site"],
  status: "works",
  async search(query, { limit = 24, page = 1, config }) {
    const url = `https://minimal.gallery/wp-json/wp/v2/posts?per_page=${Math.min(limit, 40)}&page=${page}&_embed=wp:featuredmedia,wp:term${query ? `&search=${q(query)}` : ""}`;
    const found = parseMinimalGallery(JSON.parse(await getHtml(url, config)));
    if (found.length || !query) return found;
    // Its search is strict (every word must hit): say so and show the latest instead of nothing.
    return parseMinimalGallery(JSON.parse(await getHtml(url.replace(/&search=[^&]*/, ""), config))).map((it) => ({ ...it, feed: true }));
  },
};

// ---- Httpster: latest sites, no server-side search ------------------------------------------------------
export function parseHttpster(html) {
  const out = [];
  for (const chunk of html.split('<article class="Preview"').slice(1)) {
    const link = chunk.match(/class="Preview__title" href="([^"]+)">([\s\S]*?)<\/a>/);
    const image = chunk.match(/<img class="Preview__img"[^>]*src="([^"]+)"/)?.[1];
    if (!link || !image) continue;
    const live = chunk.match(/class="Preview__ext" href="([^"]+)"/)?.[1]?.replace(/[?&]ref=httpster\.net/, "");
    out.push(makeItem("httpster", { id: link[1].replace(/^\/website\/|\/$/g, "") || slugify(link[2]), title: strip(link[2]), url: abs(link[1], "https://httpster.net"), image: abs(image, "https://httpster.net"), kind: "site", live }));
  }
  return out;
}

const httpster = {
  id: "httpster",
  label: "Httpster",
  kinds: ["site"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseHttpster(await getHtml("https://httpster.net/", config)), query).slice(0, limit);
  },
};

// ---- Dark Mode Design: a Webflow collection list of dark sites ------------------------------------------
export function parseDarkMode(html) {
  const out = [];
  for (const chunk of html.split('<div role="listitem" class="collectionitem').slice(1)) {
    const live = chunk.match(/<a href="(https?:[^"]+)"/)?.[1];
    const tag = chunk.match(/<img alt="([^"]*)" src="([^"]+)"[^>]*class="thumb"/);
    if (!live || !tag) continue;
    out.push(makeItem("darkmode", { id: hostOf(live) + (new URL(live).pathname.replace(/\/$/, "") || ""), title: tag[1], url: live, image: tag[2], tags: ["dark"], kind: "site" }));
  }
  return out;
}

const darkmode = {
  id: "darkmode",
  label: "Dark Mode Design",
  kinds: ["site"],
  status: "feed",
  async search(query, { limit = 24, page = 1, config }) {
    const url = page > 1 ? `https://www.darkmodedesign.com/?60a99e98_page=${page}` : "https://www.darkmodedesign.com/";
    return rankByQuery(parseDarkMode(await getHtml(url, config)), query).slice(0, limit);
  },
};

// ---- Godly (recent.design): a feed of animated UI items; no text search -----------------------------------
export function parseGodly(html) {
  const out = [];
  for (const chunk of html.split("<article").slice(1)) {
    if (!/data-slot="feed-media-card"/.test(chunk)) continue;
    const label = chunk.match(/aria-label="View post: ([^"]*)"/)?.[1];
    const href = chunk.match(/href="(\/i\/[^"]+)"/)?.[1];
    const image = chunk.match(/<img[^>]*\ssrc="(https:\/\/cdn\.recent\.design\/items\/[^"]+)"/)?.[1];
    if (!label || !href || !image) continue;
    out.push(makeItem("godly", { id: href.replace(/^\/i\//, ""), title: label, url: abs(href, "https://godly.website"), image, kind: "motion", tags: ["motion", "ui"] }));
  }
  return out;
}

const godly = {
  id: "godly",
  label: "Godly",
  kinds: ["motion", "component", "site"],
  status: "feed",
  async search(query, { limit = 24, config }) {
    return rankByQuery(parseGodly(await getHtml("https://godly.website/", config)), query).slice(0, limit);
  },
};

export const providers = [awwwards, minimalgallery, httpster, darkmode, godly];

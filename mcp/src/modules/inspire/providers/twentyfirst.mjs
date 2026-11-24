// 21st.dev: community UI components. The public listing pages (/s/<search>, /community/components) carry their
// data as JSON inside the page, so no key is needed to see names, authors, descriptions and preview images.
// Items are kind "component": study the preview, then build your own (see the patterns workflow).
import { getHtml, makeItem, slugify } from "../contract.mjs";

const BASE = "https://21st.dev";

export function parseTwentyFirst(html) {
  // The listing is inside a Next.js flight string: quotes are escaped. Undo that, then read each demo object.
  const text = html.replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\\//g, "/");
  const out = new Map();
  for (const chunk of text.split(/\{"id":\d+,"name":"/).slice(1)) {
    const name = chunk.match(/^([^"]*)"/)?.[1];
    const demoSlug = chunk.match(/"demo_slug":"([^"]*)"/)?.[1];
    const preview = chunk.match(/"preview_url":"(https:[^"]+)"/)?.[1];
    const compSlug = chunk.match(/"component_slug":"([^"]*)"/)?.[1];
    const user = chunk.match(/"user":\{"id":"[^"]*","username":"([^"]*)"/)?.[1] || chunk.match(/"username":"([^"]*)"/)?.[1];
    if (!name || !demoSlug || !preview || !compSlug || !user) continue;
    const key = `${user}/${compSlug}/${demoSlug}`;
    if (out.has(`21st:${key}`)) continue;
    const description = chunk.match(/"description":"([^"]*)"/)?.[1];
    const downloads = Number(chunk.match(/"downloads_count":(\d+)/)?.[1] || 0);
    const likes = Number(chunk.match(/"likes_count":(\d+)/)?.[1] || 0);
    const pro = /"pro_preview_image_url":"https:/.test(chunk) || /"payment_url":"https:/.test(chunk);
    const demoName = name.replace(/\.(tsx|jsx|vue|svelte)$/i, "");
    const compName = chunk.slice(chunk.indexOf('"component_data"') + 1).match(/"name":"([^"]*)"/)?.[1] || "";
    const title = !compName || /^default$/i.test(demoName) || demoName.toLowerCase() === compName.toLowerCase() ? compName || demoName : `${compName}: ${demoName}`;
    out.set(
      `21st:${key}`,
      makeItem("21st", {
        id: key,
        title,
        url: `${BASE}/community/components/${user}/${compSlug}/${demoSlug}`,
        image: preview,
        author: user,
        tags: ["ui", ...(pro ? ["pro"] : [])],
        kind: "component",
        copy: description || undefined,
        downloads,
        likes,
        pro,
      }),
    );
  }
  return [...out.values()];
}

export const twentyfirst = {
  id: "21st",
  label: "21st.dev",
  kinds: ["component"],
  status: "works",
  async search(query, { limit = 24, config }) {
    const slug = slugify(query);
    const url = slug ? `${BASE}/s/${slug}` : `${BASE}/community/components`;
    let items = [];
    try {
      items = parseTwentyFirst(await getHtml(url, config));
    } catch (err) {
      if (!slug) throw err;
    }
    if (!items.length && slug) items = parseTwentyFirst(await getHtml(`${BASE}/community/components`, config)).map((it) => ({ ...it, feed: true }));
    return items.slice(0, limit);
  },
};

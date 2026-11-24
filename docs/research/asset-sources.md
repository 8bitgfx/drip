# Hero asset sources for a coding agent (checked 2026-11-24)

> **Tested from the tool (0.4.0):** the Art Institute of Chicago IIIF image server sits behind a Cloudflare bot challenge (403 for every size) and The Met's image host returns an HTML block page, so neither works for an agent even though their APIs answer. Drip uses the **Cleveland Museum of Art** Open Access API instead (CC0, no key, direct 3400px JPEGs). Wired into `images_search`: unsplash, pexels, pixabay, openverse (commercial licences only), wikimedia, cleveland, nasa.

Legend: **Comm** = commercial web use OK. **Attr** = attribution required. ⚠ = ambiguous or unverified, see note. "Verified" means I read the source's own licence or API page. Where a page refused automated fetch (403), it says so.

## 1. Anime / illustrated / painterly scenes

| Source | What | Licence | Comm | Attr | API / URL | Notes |
|---|---|---|---|---|---|---|
| Studio Ghibli stills (ghibli.jp/works/) | ~650 film stills | **No licence.** The only terms: 常識の範囲でご自由にお使いください ("use freely within common sense") | ⚠ **No** | – | Static JPG URLs, no API | Goodwill permission only. The press read it as non-commercial. **Do not use on a commercial landing page.** |
| Art Institute of Chicago | Public-domain paintings (Impressionist and Japanese prints are good for painterly heroes) | CC0 (`is_public_domain=true`) | Yes | No | Free, no key. `api.artic.edu/api/v1/artworks/search` + IIIF `{iiif_url}/{image_id}/full/1686,/0/default.jpg` | ⚠ Docs page returned 403. Mirrors cite 60 req/min/IP; send an `AIC-User-Agent` header |
| The Met Open Access | 400k+ PD artworks, ukiyo-e, landscapes | CC0 for OA images (check `isPublicDomain` per object) | Yes | No | No key. `collectionapi.metmuseum.org/public/collection/v1.1/search?q=&hasImages=true` (v1 search retires 2026-10-01) | 80 req/s. Verified |
| Pixabay (image_type=illustration) | Illustrations, many anime-ish | Pixabay Content License | Yes | No (API: show source) | Free key. `pixabay.com/api/?image_type=illustration` | ⚠ Contains AI-generated uploads and there is no API filter for them. Recognisable brands may not be used commercially |
| Openverse | CC search across Flickr, museums and more | Per item; filter `license_type=commercial` | Per item | Per item (CC BY) | No key needed; OAuth client for higher limits. `api.openverse.org/v1/images/?q=&license_type=commercial` | ⚠ Anonymous limits aren't published on the pages I could read; it throttles with 429s. Openverse doesn't vouch for licence accuracy |
| itch.io CC0 VN packs | Small hand-made anime and VN backgrounds | CC0 (per pack) | Yes | No | Manual zip downloads; no API | ⚠ Licences come from search snippets, so verify each pack. Candidates: jjsinclair "134 free VN backgrounds" (page now 404), prismshard77 handpainted (3 images), the-outlander Japanese BGs (4). Some packs are Midjourney-made |

No large, verified CC0 anime-background API exists. The safest painterly route is museum CC0 art.

## 2. Gradients, mesh, grain (generate locally)

| Source | What | Licence | Port? |
|---|---|---|---|
| Paper Shaders (`@paper-design/shaders`, `-react`) | MeshGradient, GrainGradient, dithering and more as WebGL | Apache-2.0 (verified) | npm. Keep LICENSE and NOTICE if redistributed. Pin the version (0.0.x has breaking changes) |
| ShaderGradient (`@shadergradient/react`, `/vue`) | Three.js animated gradients, configurable through a URL query string | MIT (verified) | npm. `urlString` from shadergradient.co/customize |
| whatamesh (jordienr) | Port of Stripe's WebGL mesh gradient | ⚠ No licence file shown. Stripe's original code is unlicensed | Don't port. Reimplement instead |
| meshgrad (cristicretu) | CSS mesh from stacked radial-gradients | MIT (README) | Easy to port. Stale |
| SVG `feTurbulence` grain (CSS-Tricks technique; fffuel gggrain/nnnoise) | Noise/grain overlays | The technique is free to use. ⚠ fffuel tools state no licence for their output | Write it ourselves: ~10 lines of SVG |
| Vanta.js | 14 three.js/p5 effects (waves, fog, net…) | MIT (verified) | `cdn.jsdelivr.net/npm/vanta/dist/vanta.<effect>.min.js` |

## 3. Photos

| Source | Licence | Comm | Attr | API | Rate limit |
|---|---|---|---|---|---|
| Unsplash | Unsplash License | Yes | No (API: yes, photographer + Unsplash) | Free key. `api.unsplash.com/search/photos`. You must hotlink the returned URLs and call `/photos/:id/download` | 50/h demo, 1000/h production (verified) |
| Pexels | Pexels License | Yes | No (API: link to Pexels required) | Free key in the `Authorization` header. `api.pexels.com/v1/search` | 200/h, 20k/month (verified) |
| Pixabay | Pixabay Content License | Yes | No (API: show source) | Free key. `pixabay.com/api/` | 100 per 60 s. Cache for 24 h. No permanent hotlinking: download first (verified) |
| Openverse | Mixed CC/PD | filter | per item | see §1 | ⚠ |
| Wikimedia Commons | Per file (PD, CC0, CC BY, CC BY-SA) | per file | Usually | No key. `commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata` (read `LicenseShortName`) | Descriptive User-Agent required. ⚠ BY-SA share-alike |
| Burst (Shopify) | "Photo License: Burst" (not CC0) | Yes | No | None | – |
| StockSnap | CC0 | Yes | No | None | ⚠ Licence page 403; confirmed through the site's search snippet |
| Rawpixel public domain | Labelled CC0 | Yes | No | No public API; free login to download | ⚠ Licence page 403. Mixed with paid "rawpixel license" items, so check each one |
| NASA (`images-api.nasa.gov/search`) | Generally not copyrighted (US gov) | Yes, but no implied endorsement; logos protected | Credit NASA | No key | ⚠ Third-party items are marked as copyrighted. Rules restrict use with AI-generated imagery |
| Smithsonian Open Access | CC0 (filter on CC0) | Yes | No | Free api.data.gov key. `api.si.edu/openaccess/api/v1.0/search` | ⚠ Page 403. api.data.gov default is ~1000/h |
| The Met / AIC | CC0 | Yes | No | see §1 | |
| Library of Congress | "No known restrictions" per item | per item | Suggested | No key. `loc.gov/photos/?q=…&fo=json` | Throttled; blocks on excess (numbers not given) |

## 4. 3D / renders

| Source | Licence | Attr | API |
|---|---|---|---|
| Poly Haven | CC0 (HDRIs, textures, models) | Assets no. The **live API requires** a "from Poly Haven" credit | No key. `api.polyhaven.com/assets?t=hdris`, `/files/{id}`. A unique `User-Agent` is mandatory. Free for commercial use (verified) |
| ambientCG | CC0 1.0 | No | No key stated. `ambientcg.com/api/v2/full_json?type=HDRI,Material&q=&include=downloadData`. Self-described as not enterprise-stable |
| Kenney | CC0 | No (don't use the Kenney logo) | No API; zip downloads |
| 3dicons.co | CC0 (current version) | No | No API. ⚠ Unclear whether Pro editor output is covered |
| Sketchfab | Per model (CC0, BY, BY-SA…) | Per model | `api.sketchfab.com/v3/search?type=models&downloadable=true&license=cc0`. ⚠ Download needs user OAuth (glTF/USDZ only) |
| Spline community | CC0 1.0 (Spline docs) | No | No API. ⚠ The 2026-10-29 ToS update wasn't read in full |

## 5. Illustrations

| Source | Licence | Comm | Attr | Notes |
|---|---|---|---|---|
| unDraw | unDraw License | Yes | No | ⚠ **Bans automated linking, embedding and scraping without consent**, packs, and AI use. A user must download manually; the agent may not fetch these |
| Open Peeps / Humaaans | CC0 | Yes | No | Best fit for agents (static SVG/Figma files) |
| IRA Design | MIT | Yes | No (keep MIT notice) | |
| Blush | Free licence | Yes | No | No reselling, merchandise, or competing service |
| Storyset (Freepik) | Storyset ToU | Yes | **Yes** (free tier) | Premium (Flaticon) removes credit. No sharing or redistribution |
| Absurd | Free licence | **No: non-commercial only** | Yes, linked | Avoid |

## 6. Video loops

| Source | Licence | Attr | API |
|---|---|---|---|
| Pexels Videos | Pexels License | API: link | `api.pexels.com/v1/videos/search` (same key and limits) |
| Pixabay Videos | Content License | API: show source | `pixabay.com/api/videos/`. Embedding allowed |
| Coverr | Coverr License | Downloads no. Free API: credit creator + Coverr | `api.coverr.co`. You must PATCH download stats. Has an `is_ai_generated` flag. ⚠ Old API docs say "free as long as you don't charge", which conflicts with the licence page; ask Coverr |
| Mixkit | Free License (no attribution), but ⚠ some items carry a **Restricted (non-commercial)** licence | No | No API |

## 7. Hero components and effects

| Library | Licence | Index |
|---|---|---|
| Magic UI | MIT | `magicui.design/r/{name}.json`. Index: `raw.githubusercontent.com/magicuidesign/magicui/main/registry.json` (backgrounds: retro-grid, flickering-grid, dot-pattern, particles, warp-background, noise-texture…) |
| React Bits | **MIT + Commons Clause**: fine to use in a site, but you **may not redistribute the components** (so no bundling them in our plugin) | `reactbits.dev/r/{Name}-TS-TW.json` (63 backgrounds) |
| Aceternity UI | Custom licence: commercial end products OK; no redistribution of source, no marketplaces | `ui.aceternity.com/registry/{name}.json` (⚠ listed as "degraded"; the "free = MIT" claim is third-party only) |
| shadcn blocks + registry directory | MIT (shadcn/ui) | **`ui.shadcn.com/r/registries.json`** (125+ namespaces, e.g. `@crucible` WebGL backgrounds) |
| 21st.dev | Per component; ToS bars redistribution of marketplace content | Magic MCP needs a key. ⚠ Unclear |
| Uiverse | MIT (known) | ⚠ Licence page 403. No public JSON |
| ShaderGradient / Paper Shaders / Vanta | see §2 | npm |

## 8. Textures and patterns

| Source | Licence | Attr | Notes |
|---|---|---|---|
| Hero Patterns | CC BY 4.0 | **Yes** | SVG snippets. Credit Steve Schoger |
| Transparent Textures | ⚠ **None stated**; per-pattern "made by" credits; derived from Subtle Patterns | Assume yes | `transparenttextures.com/patterns/{slug}.png`. Hotlinking policy unknown |
| Haikei | ⚠ No output licence in its ToS; bans scrapers | – | Prefer reimplementing (blobs, waves and low-poly are easy) |
| SVG Backgrounds | Free licence: **attribution required**; not usable as the main design element; no automated or template use | Yes | Avoid for an agent |
| pattern.monster | Code MIT; ⚠ pattern licence unstated | – | Paid API/MCP at pro.pattern.monster |

## Top 8 to integrate first

1. **Unsplash**: `GET https://api.unsplash.com/search/photos?query=…` (header `Authorization: Client-ID …`), then `GET /photos/{id}/download` to track.
2. **Pexels** (photo and video): `GET https://api.pexels.com/v1/search` and `/v1/videos/search` (header `Authorization: <key>`).
3. **Poly Haven**: `GET https://api.polyhaven.com/assets?t=hdris|textures|models`, then `/files/{id}` (unique User-Agent plus credit).
4. **Art Institute of Chicago**: `GET https://api.artic.edu/api/v1/artworks/search?q=…&query[term][is_public_domain]=true&fields=id,title,image_id`, then `https://www.artic.edu/iiif/2/{image_id}/full/1686,/0/default.jpg`.
5. **The Met**: `GET https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=…&hasImages=true`, then `/public/collection/v1/objects/{id}` (keep only `isPublicDomain`).
6. **shadcn registry directory**: `https://ui.shadcn.com/r/registries.json`, then Magic UI `https://magicui.design/r/{name}.json` (MIT, safe to vendor).
7. **Paper Shaders** (`npm i @paper-design/shaders-react`, Apache-2.0) for local mesh and grain gradients. Add ShaderGradient (MIT) as a second option.
8. **Openverse**: `GET https://api.openverse.org/v1/images/?q=…&license_type=commercial` (carry each item's `license` and `attribution` fields into the page).

Sources: ghibli.jp/info/013344, pixabay.com/service/license-summary + /api/docs + /service/terms, pexels.com/license + /api/documentation, unsplash.com/license + /documentation, metmuseum.github.io, polyhaven.com/our-api, docs.ambientcg.com, kenney.nl/support, 3dicons.co, undraw.co/license, openpeeps.com, humaaans.com, iradesign.io, storyset.com/terms, blush.design/license, absurd.design/freelicense, mixkit.co/llm-info, coverr.co/license, api.coverr.co/docs, heropatterns.com, transparenttextures.com, haikei.app/terms, svgbackgrounds.com/license, github.com/catchspider2002/svelte-svg-patterns, github.com (magicui, react-bits LICENSE.md, paper-design/shaders, shadergradient, vanta, whatamesh), ui.aceternity.com/licence, 21st.dev/terms, ui.shadcn.com/docs/registry, nasa.gov brand centre, loc.gov/apis, commons.wikimedia.org reuse page, docs.spline.design (via search). AIC, Smithsonian, Uiverse, StockSnap and rawpixel licence pages returned 403, so those rows rely on secondary sources.

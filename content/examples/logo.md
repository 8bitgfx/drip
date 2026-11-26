# Worked run: "/drip:logo a logo for Crumb, a sourdough bakery"

```
drip_start({ task: "logo for Crumb, a neighbourhood sourdough bakery" })     → mode logo
```
Intake (AskUserQuestion, one round): where it lives (shopfront sign + paper bags + Instagram (Recommended)), feel ("warm & handmade" · "sharp & modern" · "loud & playful" · "Surprise me"), what to avoid ("wheat sheaves" (Recommended) · "script fonts" · nothing).
```
drip_brief({ what: "logo for Crumb bakery", audience: "neighbours walking past, Instagram", job: "be recognised on a bag and a sign", feel: ["warm & handmade"], hates: ["wheat sheaves"], ambition: "bold" })
drip_guide("logo")
refs_tag({ tag: "bakery logo" }) · refs_search({ query: "food packaging typography", category: "branding" }) · refs_search({ query: "letterpress wordmark" })
refs_pick → refs_view → refs_zoom (the letterforms) → refs_study   × 6+
```
Concepts: 8-12 one-sentence ideas across at least 2 mark types, e.g.
1. "The C is a loaf seen from the end, its score mark forming the opening" (lettermark).
2. "A crumb-shaped dot replaces the tittle-less u: Crumb, with one crumb fallen off" (wordmark).
3. "A bite taken out of a perfect circle stamp" (symbol). …
```
logo_sheet({ title: "Crumb concepts", concepts: [{ name: "End-of-loaf C", svg: "<svg viewBox='0 0 256 256'>…</svg>" }, …] })
critic_prepare({ kind: "logo", targets: ["<the sheet file it returned>"] }) → Agent drip:critic → critic_record
```
Refine the top 2-3 **in black first** on a 256 viewBox, few clean nodes per curve:
```
logo_test({ svg: "brand/crumb-c.svg", name: "crumb-c" })     → check 16/32px, mono, inverse, path stats (lumpy curves?)
critic_prepare({ kind: "logo", targets: ["brand/crumb-c.svg", "brand/crumb-wordmark.svg"] }) → critic → record
```
Show the user the two finalists (renders + critic line each), ask with buttons, lock the choice, then colour, lockups, files
(SVG, PNG 1024, favicon, light/dark) and a BRAND.md. Hand-off shows the mark at 16px and on the bag mock.

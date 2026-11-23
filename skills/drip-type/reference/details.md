# Type details: numerals, loading, variable fonts, punctuation

The last 10% that makes text look set rather than poured in.

## Numerals and OpenType features

Prefer the high-level `font-variant-*` properties; they combine safely. Use `font-feature-settings` only for
features without one (stylistic sets).

| Need | CSS | Tailwind |
|---|---|---|
| Columns, prices, timers, counters, stats, pagination | `font-variant-numeric: tabular-nums` | `tabular-nums` |
| Numbers inside prose | `proportional-nums` (default in most faces) | `proportional-nums` |
| Figures that sit on the baseline at cap height | `lining-nums` | `lining-nums` |
| Old-style figures in literary body text | `oldstyle-nums` | `oldstyle-nums` |
| Codes, IDs, coupons (0 vs O) | `slashed-zero` | `slashed-zero` |
| Fractions (1/2) | `diagonal-fractions` | `diagonal-fractions` |
| Small caps for abbreviations | `font-variant-caps: all-small-caps` (only if the font has real small caps) | |
| Stylistic alternates (single-storey a, straight l) | `font-feature-settings: "ss01"` (check the font's list) | `[font-feature-settings:"ss01"]` |
| Case-sensitive punctuation in caps labels | `font-feature-settings: "case"` | |

- **Do** set `tabular-nums` on table cells, price lists, number inputs, dashboards, countdowns, version-less counters. Right-align numeric columns.
- **Don't** set `tabular-nums` on a big decorative number in a hero; proportional figures look better there unless the number animates.
- Some faces change the shape of `1` with tabular figures (Inter does). Check it in the preview.
- Animated counters: tabular figures, or the width jitters every frame.

## Font loading and performance

Goal: text visible immediately, no layout jump when the web font arrives, as few bytes as possible.

1. **Load only what you use.** One variable file per family and style (roman, italic) beats four static weights. If static: only the 2-3 weights on the page.
2. **Self-host** (`next/font`, Fontsource packages, or WOFF2 files you serve). Third-party CSS adds a connection and a render-blocking request.
3. **`font-display: swap`** for brand and body faces (text shows in the fallback, then swaps). `optional` for faces you can live without on slow connections (no swap after ~100ms, no shift).
4. **Metric-matched fallback** so the swap does not reflow: `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` on a local fallback face. `next/font` does this automatically (`adjustFontFallback`); Fontaine or Capsize can generate them elsewhere.
5. **Preload 1-2 files at most**: the face used above the fold (usually the display face and the body roman). Preloading every weight delays everything.
6. **Subset** to the languages you ship (`latin`, `latin-ext`). Unicode-range subsets come with Fontsource and Google.
7. **`font-synthesis: none`** so a missing bold or italic is obvious in development instead of faked in production.
8. **Budget:** 2-4 font files, under ~150KB total for a page.

```css
@font-face {
  font-family: "Hanken Grotesk";
  src: url("/fonts/HankenGrotesk-Variable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {               /* fallback tuned to the web font's metrics */
  font-family: "Hanken Grotesk Fallback";
  src: local("Arial");
  size-adjust: 101%; ascent-override: 96%; descent-override: 26%; line-gap-override: 0%;
}
:root { --font-sans: "Hanken Grotesk", "Hanken Grotesk Fallback", ui-sans-serif, system-ui, sans-serif; }
```

(The override values above are placeholders: generate real ones for your face.)

**Next.js (App Router):**

```ts
import { Hanken_Grotesk, Newsreader } from "next/font/google";
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const display = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", axes: ["opsz"] });
// <html className={`${sans.variable} ${display.variable} antialiased`}>
```

```css
/* Tailwind v4: map under different names; --font-sans: var(--font-sans) would be a cycle */
@theme inline {
  --font-sans: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-newsreader), ui-serif, Georgia, serif;
}
```

**Fontsource (Vite, any bundler):** `npm i @fontsource-variable/hanken-grotesk`, `import "@fontsource-variable/hanken-grotesk";`, family name `"Hanken Grotesk Variable"`.

## Variable fonts

| Axis | CSS | Use |
|---|---|---|
| `wght` weight | `font-weight: 450` | any weight between named ones; 350 for body on dark |
| `opsz` optical size | `font-optical-sizing: auto` (default) | the face redraws for small vs large sizes; leave it on |
| `wdth` width | `font-stretch: 90%` | narrower headlines for long words; never squeeze body |
| `ital` / `slnt` | `font-style: italic` / `oblique 10deg` | real italic where available |
| `GRAD` grade | `font-variation-settings: "GRAD" 50` | heavier look without changing width; good for dark mode and hover |

- **Do** use in-between weights to tune: a 64px headline at 560 can look better than 500 or 600.
- **Don't** animate `font-weight` on hover: the text gets wider and the layout shifts. Use `GRAD` if the font has it, or colour.
- **Do** declare the weight range in `@font-face` (`font-weight: 100 900`) or the browser treats it as one weight.

## Punctuation and typesetting

- Curly quotes and apostrophes (“ ” ‘ ’), not straight ones, in all visible copy.
- A real ellipsis (…), not three dots.
- Non-breaking space between a number and its unit (`12&nbsp;kg`, `5&nbsp;min`), and in short names that must not split (`⌘&nbsp;K`).
- En dash for ranges where the style allows it (9–5, 2024–2026); otherwise "to".
- Hanging punctuation on pull quotes: `hanging-punctuation: first` (Safari) or a small negative text-indent.
- No double spaces, no spaces before punctuation in English.
- Avoid widows in short blocks: `text-wrap: pretty`, or a `&nbsp;` between the last two words of a heading only if it does not cause overflow at 375px.

## Wrapping, overflow and truncation

- `text-wrap: balance` on headings (short blocks only; browsers ignore it past ~6 lines).
- `text-wrap: pretty` on paragraphs, captions and list items.
- Truncate only labels with unpredictable length (names in a table, file names): `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` on an element with `min-width: 0`, and make the full text reachable by pointer, touch and keyboard (a tooltip on focus and hover, or an expand). Never truncate headings or body copy.
- Multi-line clamp: `line-clamp: 2` (Tailwind `line-clamp-2`) for card excerpts, with the full text one click away.
- Long tokens (URLs, hashes): `overflow-wrap: anywhere`.
- Hyphenation for narrow columns in long text: `hyphens: auto` with a correct `lang` attribute on `<html>`.

## Optical alignment of text

- Large headings sit visibly indented from the left edge because of side bearings. At 64px+, a `margin-left: -0.04em` to `-0.06em` can align the stem with body text below. Check by eye.
- Centring a label in a button: caps and x-height are not centred in the line box. `text-box: trim-both cap alphabetic` on the label element (not the flex container) trims the extra space where supported; otherwise nudge padding by 1px after looking.
- Icons next to text: align to the cap height or x-height centre, not the line box. Usually `align-items: center` plus a 1px nudge.

## Selection, caret, rendering

- `::selection { background: var(--accent-subtle); color: var(--text); }`
- `caret-color: var(--accent);` on inputs.
- `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` on `html` (Tailwind `antialiased`).
- Underlines: `text-underline-offset: 0.2em; text-decoration-thickness: 1px;` (2px on hover), `text-decoration-skip-ink: auto`.

## Checklist

- [ ] Every compared or changing number is tabular; numeric columns right-aligned.
- [ ] 2-4 font files, self-hosted, `swap`, metric-matched fallback, at most 2 preloads.
- [ ] No faux bold or italic (`font-synthesis: none` and the real files loaded).
- [ ] Variable weight range declared; no weight animation.
- [ ] Curly quotes, real ellipsis, non-breaking spaces in number-unit pairs.
- [ ] Headings balanced, paragraphs pretty, nothing truncated that people need to read.

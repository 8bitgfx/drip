# Type scales

Ready-to-use scales per surface, with line-height and tracking per step. Pick the one that matches the surface,
keep 5-7 of its steps, and write them as tokens. Values assume a 16px root; rem values are what you ship.

## How to pick

| Surface | Scale | Why |
|---|---|---|
| Landing, marketing, campaign | Major third 1.25 (calm) or perfect fourth 1.333 (dramatic), fluid display | Big contrast between headline and body sells the hierarchy |
| App UI, dashboard, settings, tools | 1.125-1.2, fixed rem | Many roles live close together; large jumps create noise |
| Docs, blog, long reading | 1.2-1.25, body 17-18px | Comfortable reading first, headings clearly separated |
| Mobile app (native feel) | Platform text styles (iOS: 17pt body; Android: 16sp) | Users expect the system rhythm and Dynamic Type |

## Marketing scale (1.25, base 16)

| Role | rem | px | Line-height | Tracking | Weight (typical) |
|---|---|---|---|---|---|
| Small / caption | 0.875 | 14 | 1.45 | +0.005em | 400 |
| Body | 1 | 16 | 1.6 | 0 | 400 |
| Lead (line under a heading) | 1.25 | 20 | 1.45 | -0.005em | 400 |
| Title (card, h3) | 1.5625 | 25 | 1.3 | -0.01em | 500-600 |
| Section head (h2) | fluid 1.875 → 3.063 | 30 → 49 | 1.15 | -0.02em | 500-600 |
| Display (h1) | fluid 2.5 → 4.75 | 40 → 76 | 1.05 | -0.03em | 400-600 |

Body on long marketing pages can be 17-18px; keep the ratio and scale the steps from that base.

## Dramatic scale (1.333, base 16), for poster-like heroes

| Role | px | Line-height | Tracking |
|---|---|---|---|
| Body | 16-18 | 1.6 | 0 |
| Lead | 21 | 1.45 | -0.005em |
| Title | 28 | 1.25 | -0.01em |
| h2 | 38 → 50 | 1.12 | -0.02em |
| Display | 48 → 90 | 1.0 | -0.035em |
| Single-word poster | up to 120-160 | 0.92-0.98 | -0.04em |

Use when the direction is type-led and the headline is short (under ~20 characters at full size).

## Product UI scale (fixed rem, ~1.15)

| Role | rem | px | Line-height | Tracking | Weight |
|---|---|---|---|---|---|
| Caption / meta | 0.75 | 12 | 1.4 (16px) | +0.01em | 400-500 |
| Small / table cell (dense) | 0.8125 | 13 | 1.45 (≈19px) | 0 | 400 |
| Body / UI text | 0.875 | 14 | 1.45 (≈20px) | 0 | 400 |
| Body (comfortable) | 1 | 16 | 1.5 (24px) | 0 | 400 |
| Section title | 1.125 | 18 | 1.4 (≈25px) | -0.005em | 600 |
| Page title | 1.5 | 24 | 1.25 (30px) | -0.015em | 600 |
| Big number (stat) | 1.875 | 30 | 1.1 | -0.02em | 500-600 |

- Choose 14px *or* 16px as the UI body, not both. 14px suits dense tools used on desktop all day (tables, editors); 16px suits forms, consumer apps and anything used on phones.
- Product UI does not use fluid type. Layout changes at breakpoints; text sizes stay put.
- Snap line-heights to the 4px grid when you can (16, 20, 24, 28, 32): rows and controls then align.

## Reading scale (docs, articles)

| Role | px | Line-height | Notes |
|---|---|---|---|
| Caption, footnote | 14 | 1.5 | |
| Body | 17-18 | 1.65-1.75 | measure 60-72ch |
| h3 | 20 | 1.35 | 1.5em above, 0.5em below |
| h2 | 26 | 1.25 | 2em above, 0.6em below |
| h1 | 34-40 | 1.15 | once per page |
| Code inline | 0.9em of body | inherit | mono face, a tinted background, 2-4px radius |
| Code block | 14-15 | 1.6 | its own measure, horizontal scroll allowed |

## Fluid type with `clamp()`

Formula, sizing between a 375px and a 1440px viewport:

```
slope     = (max - min) / (1440 - 375)
intercept = min - slope * 375
font-size: clamp(min_rem, intercept_rem + slope*100 vw, max_rem)
```

Precomputed (375 → 1440):

| From → to (px) | CSS |
|---|---|
| 18 → 20 (lead) | `clamp(1.125rem, 1.081rem + 0.19vw, 1.25rem)` |
| 20 → 25 | `clamp(1.25rem, 1.14rem + 0.47vw, 1.5625rem)` |
| 24 → 39 | `clamp(1.5rem, 1.17rem + 1.41vw, 2.4375rem)` |
| 28 → 48 | `clamp(1.75rem, 1.31rem + 1.88vw, 3rem)` |
| 30 → 49 (h2) | `clamp(1.875rem, 1.457rem + 1.78vw, 3.0625rem)` |
| 32 → 56 | `clamp(2rem, 1.472rem + 2.25vw, 3.5rem)` |
| 36 → 64 | `clamp(2.25rem, 1.634rem + 2.63vw, 4rem)` |
| 40 → 76 (h1) | `clamp(2.5rem, 1.708rem + 3.38vw, 4.75rem)` |
| 44 → 96 (poster) | `clamp(2.75rem, 1.606rem + 4.88vw, 6rem)` |

- **Always keep a rem term** in the middle value. Pure `vw` sizes do not grow with browser zoom and fail WCAG resize-text.
- Fluid only for display and section heads. Body stays fixed (16-18px).
- Cap the max at the size you would choose for 1440px; above that, let the container stop growing instead.
- Check the h1 at its longest real headline at 375px: at most 3-4 lines. If it takes 5, lower the min or shorten the copy.

## Tailwind v4 tokens

```css
@theme {
  --text-sm: 0.875rem;   --text-sm--line-height: 1.45;
  --text-base: 1rem;     --text-base--line-height: 1.6;
  --text-lead: 1.25rem;  --text-lead--line-height: 1.45; --text-lead--letter-spacing: -0.005em;
  --text-title: 1.5625rem; --text-title--line-height: 1.3; --text-title--letter-spacing: -0.01em; --text-title--font-weight: 600;
  --text-h2: clamp(1.875rem, 1.457rem + 1.78vw, 3.0625rem); --text-h2--line-height: 1.15; --text-h2--letter-spacing: -0.02em;
  --text-display: clamp(2.5rem, 1.708rem + 3.38vw, 4.75rem); --text-display--line-height: 1.05; --text-display--letter-spacing: -0.03em;
}
```

Markup then reads `class="text-display font-display"`, and one utility sets size, line-height and tracking.
Overriding Tailwind's own names (`--text-sm`, `--text-base`) changes them everywhere; that is intended in a new
system and worth a check in an existing one.

## Spacing around text

- Heading to its own body: 0.4-0.6em of the heading size (8-24px).
- Space above a heading: 1.5-2x the space below it.
- Paragraph to paragraph: 0.75-1em of body (12-16px), or a first-line indent, never both.
- Head block (heading + lead) to the section's content: 32-64px on marketing pages, 16-24px in product UI.
- Lists: 4-8px between short items, 12px between items of 2+ lines.

## Checks

- Adjacent roles differ by at least 1.2x, or by size + weight.
- No role between steps ("this one is 19px").
- Display line-height ≤ 1.15, body ≥ 1.5.
- Tracking never below -0.04em; body tracking 0.
- Screenshot at 375 and 1440: hierarchy reads with the text blurred.

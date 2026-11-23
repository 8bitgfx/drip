# App: charts

A chart earns its place when the shape of the data says something a table can't say as fast. It reads as set, not generated: one series argues in the accent, everything else is quiet, the axes tell the truth, and the numbers are readable without hovering. Choose the form from the data before choosing a library or a colour.

## Form first

| The data is | Use | Not |
|---|---|---|
| One value | A stat: the figure, its unit, a worded comparison | A one-bar chart, a gauge with no target |
| One value against a target | Bullet chart or a progress bar with the target marked | A speedometer gauge |
| 2 to 5 values compared | Horizontal bars sorted by value, or a stat row | Pie, radar |
| A series over time | Line (area only when the total matters) | Bars for 90 daily points |
| A small trend inside a tile or row | Sparkline: no axes, no grid, one colour | A full chart squeezed small |
| Several series over time (≤ 4) | Lines with direct labels at their ends | 8 colours and a legend |
| More than 4 series | Small multiples (one small chart per series, shared axes) | One spaghetti chart |
| Categories (≤ ~15) | Bars, horizontal when labels are long, sorted | Vertical bars with rotated labels |
| More than ~15 categories | A sortable table with an inline bar per row | A longer bar chart |
| Parts of a whole | 100% stacked horizontal bar; a donut only for 2 or 3 parts with direct labels | Pie with 7 slices |
| Change from start to end via steps | Waterfall | Stacked bars |
| Conversion through stages | Funnel as horizontal bars with the % kept between stages | 3D funnel |
| Distribution | Histogram, box plot | Line through bins |
| Two continuous variables | Scatter (20+ points) | Bubble chart for 6 points |
| Activity by day/hour | Heatmap grid with a numeric legend | Rainbow ramp |
| Region data | Choropleth of rates (per capita, %), proportional symbols for totals | Choropleth of raw totals |

Under 4 data points: a stat card or a sentence. "Signups doubled from 210 to 430" beats a two-bar chart.

## Marks

- **Bars:** thicker than the gaps between them; baseline at zero always; rounded only at the data end, 2px at most; sorted descending unless the categories have a natural order (months, stages).
- **Lines:** 1.5 to 2px; points only where annotated or on hover (6px+ hit target, larger invisible hover area); no smoothing that invents peaks (`monotone` interpolation at most).
- **Areas:** 10 to 20% fill of the line colour, or a fade to transparent; only when the area means something (volume, total).
- **No 3D, no shadows on marks, no gradients in bars,** no animated bounce on load. A chart may draw on once (line left to right, bars rising) in 400 to 600ms, then hold still; nothing under reduced motion.

## Axes, grid, labels

- **3 to 5 horizontal gridlines,** 1px, solid, very low contrast (6 to 10% ink); no vertical gridlines on time series unless reading exact dates matters.
- **One y-axis.** Two series with different units get two small charts stacked with a shared x-axis. Dual axes fake correlations.
- **Nice tick values** (0, 25, 50, 75, 100; 0, 1k, 2k) with units on the axis or the title; abbreviate consistently.
- **Truncated axes** only for line charts where the data lives in a narrow band, and then say so ("Axis starts at 94%"). Never truncate a bar chart.
- **Direct labels over legends:** put the series name at the end of its line, the value at the end of its bar. A legend is a fallback for more than 3 series, placed above the chart, in series order.
- **Title says what and when:** "Weekly active teams, last 12 weeks". The subtitle can state the takeaway.
- **Annotate events:** a thin vertical line with a short label where something changed.
- **Text never wears the data colour.** Labels and values stay in ink or muted ink; a swatch beside the label identifies the series.
- **Tabular numerals** on axes, tooltips and value labels.

## Colour

- **Single series:** the accent.
- **Emphasis:** the series that argues in the accent; comparison and context series in a neutral grey. If every series is loud, none is.
- **Multiple series that are equal:** a categorical palette of 4 to 6 hues at similar lightness, assigned in a fixed order and kept for the same entity across every chart (the "EU" series is always the same colour).
- **Ordered data (low to high):** a single-hue sequential ramp, light to dark.
- **Diverging data (below/above a midpoint):** two hues around a neutral middle.
- **Never rainbow or jet ramps.** Check the palette for colour-blind safety (`palette_check`) and pair colour with a second cue: line style (solid, dashed), marker shape, direct labels or patterns.
- **Status colours** (red, amber, green) only when the chart is about status; never as a series palette.
- **Dark mode:** raise lightness and lower chroma of every series; re-check contrast against the dark ground.

## Interaction

- **Tooltip** on hover and on keyboard focus: the x value as a heading, each series' value with its swatch, aligned right in tabular figures. It follows a crosshair (a 1px vertical line) on time series.
- **Scrubbing** a time series updates the headline figure to the hovered point; release restores the latest.
- **Legend toggles** to hide series, with keyboard support and a visible "Show all".
- **Zoom/brush** only for long ranges, with a Reset; offer preset ranges (7d, 30d, 90d) first.
- **Click to drill** into the slice's records (`app/dashboards`).

## Accessibility and fallbacks

- Every chart has a text summary (one sentence of the takeaway) and a way to see the data as a table ("View as table" toggle or an adjacent table).
- SVG charts get `role="img"` and an `aria-label` with the title and takeaway, or are built from focusable marks with values announced.
- Don't rely on hover: on touch, tap shows the tooltip; values that matter are printed.
- Pause and stop controls on live, moving charts.

## Rendering

| Points | Render |
|---|---|
| < 1,000 | SVG (crisp, styleable, accessible) |
| 1,000 – 10,000 | Canvas, or SVG with downsampling |
| > 10,000 | Aggregate to intervals before drawing; Canvas or WebGL |

Use a library that renders SVG you can style with tokens: Recharts, visx, Nivo, Observable Plot, ECharts for heavy data, or the project's own (`components_find` "chart"). Strip its defaults: gradients, drop shadows, rounded thick bars, rainbow palettes, legend boxes with borders.

## Chart slop tells

| Tell | Fix |
|---|---|
| Donut with a big number in the middle for a single value | The stat alone |
| Gradient-filled area under every line, glowing points | Flat 15% fill or none; points on hover |
| Every series a saturated different colour | One accent, the rest neutral |
| Pie with 8 slices and a legend | Sorted horizontal bars with values |
| Bars that start at 80 to make a 3% gain look huge | Start at zero |
| Two y-axes | Two stacked small charts |
| Tooltip-only values on a chart meant to be read at a glance | Direct labels |
| "Analytics" page of six charts that answer no question | One chart per question, titled with the question's answer |

## Check

- [ ] The form matches the data shape table.
- [ ] Bars start at zero; any truncated line axis is labelled.
- [ ] One series is emphasised; colour is paired with a second cue; the palette passes `palette_check`.
- [ ] Titles state what and when; values use tabular figures and units.
- [ ] A text summary and a table view exist; tooltips work by keyboard.

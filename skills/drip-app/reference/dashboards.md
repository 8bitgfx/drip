# App: dashboards

A dashboard answers a question the user asks repeatedly: "Is anything wrong?", "How are we doing against the target?", "What needs me today?". Decide which question before drawing anything. A good dashboard shows few, true figures with their context, makes the exception obvious, and hands off to the list where the work happens. A KPI wall with six gauges and a greeting is the tell this guide exists to kill.

## Name the dashboard's type

| Type | Question | Leads with | Refresh |
|---|---|---|---|
| **Operational / monitoring** | Is anything wrong right now? | Status and exceptions: failing services, overdue items, alerts | Live or every 15 to 60s, with a "Updated 12s ago" stamp |
| **Analytical** | Why did this change? | One trend chart with filters and drill-down, a breakdown table | On demand |
| **Strategic / executive** | Are we on target this period? | 3 to 5 KPIs against targets, each with its trend | Daily |
| **Work queue / home** | What needs me today? | The user's own list: assigned, due, mentions | On focus |

Most "dashboards" in product apps should be a work queue. If the user's next action is in a list, lead with the list.

## Layout

- **Reading order:** the most important figure top-left, then left to right, top to bottom. Use one grid (12 columns, 16 to 24px gaps) and let widths say importance: the hero chart spans 8 columns, supporting panels 4.
- **The shape that works:** one hero figure row (2 to 5 KPI tiles), one supporting chart, one table or list. Then stop or link out.
- **Filters on top, global:** a date range and at most 2 to 3 dimension filters in one row over everything they scope. If a filter scopes only one panel, it lives in that panel's header.
- **Each panel:** a title that says what is measured and over what period ("Revenue, last 30 days"), an optional `⋯` menu (export, view details), the content, and a link to the full report or list.
- **Equal heights per row;** no panel half empty; no panel scrolls inside the page unless it is a feed.
- **Density:** desktop first. At 1024 drop to two columns; at 390 one column in priority order with the hero KPI first.

## KPI tiles

- **Anatomy:** label (what, sentence case, never wraps), the figure (28 to 36px, tabular), the comparison ("+4.2% vs previous 30 days") with a direction word or icon plus colour, and an optional sparkline (no axes, one colour).
- **Comparisons need a baseline you name.** "vs last month", "vs target 120". Never a bare green arrow.
- **Colour the delta by meaning, not by sign.** A rise in churn is bad; colour it as bad.
- **Units with the number:** "$48.2k", "312 ms", "4.1%". Abbreviate consistently (k, M) with one decimal at most.
- **3 to 5 tiles in a row.** Six tiles means nothing is important; demote some to the table.
- **Clickable when it leads somewhere:** the whole tile is the link, with hover and focus states.

Do: "Open tickets · 38 · 12 over SLA" in a calm tile with the "12 over SLA" in the warning colour and linked to the filtered list.
Don't: "Total users · 12,847 · ↑ 12%" in a gradient card with an icon in a tinted circle and no period.

## Charts on dashboards

- One chart argues per panel; one accent series, everything else neutral.
- Time series share the same date range and granularity across panels so they can be compared by eye.
- Mark the moment something changed (a deploy, a price change) with an annotation line and a short label.
- `drip_guide app/charts` for choosing and styling.

## Live and stale data

- Label data as live only when it is. Show the last update time; when updates stop, say so ("Data delayed, last update 4 min ago") and grey the stamp, not the whole panel.
- Updating values change in place (numbers roll or crossfade over ~200ms) without reflowing the layout or stealing focus.
- Give streaming panels a Pause control; pause when the tab is hidden.

## Drill-down

- Every figure answers "which ones?": a tile links to the list filtered to exactly those items; a chart point or bar opens the breakdown for that slice.
- Keep context: the filter appears as a removable chip on the destination; Back returns to the dashboard with its filters intact.

## Customisable dashboards

- Ship a good default first. Customisation (add, remove, reorder, resize widgets) is a second-order feature; users rarely use it.
- If you do it: a clear Edit mode with a Done button, drag handles plus move buttons (keyboard and non-drag alternative), a widget gallery with previews, reset to default.

## States

| State | Treatment |
|---|---|
| First use, no data yet | One panel explaining what will appear and the action that produces data (connect a source, import, create the first item); sample data only if clearly labelled as sample |
| Loading | Skeleton tiles with the real labels and empty figure slots; charts as a flat baseline, not a spinner |
| A panel failed | That panel alone shows the error and Retry; the rest of the dashboard works |
| Filter returns nothing | "No orders in this range" + Clear filters; keep the axes so the empty range reads as zero |
| No permission for a panel | Omit it, or a one-line note if its absence would confuse |

## Dashboard slop tells

| Tell | Fix |
|---|---|
| Greeting header + four stat cards + one area chart + "Recent activity" | Ask the dashboard's question; lead with its answer |
| KPIs with green arrows and no comparison period | Name the baseline; colour by meaning |
| Donut of 9 categories, gauge for every metric | Bars sorted by value; a bullet chart against target |
| Every panel a different chart type "for variety" | Same type for the same kind of data |
| Gradient area fills, glow, 3D bars | Flat marks, 1px grid, one accent |
| Fake real-time pulse dot on static data | Last-updated stamp |
| A sidebar, a top bar and a second tab bar all for the same level | One navigation for each level |

## Check

- [ ] The dashboard's question is written down and the top-left answers it.
- [ ] Every KPI has a unit, a period and a named comparison.
- [ ] Every figure links to the items behind it.
- [ ] Loading, empty and per-panel error states are built and screenshotted.
- [ ] At 1024 and 390 the order still answers the question first.

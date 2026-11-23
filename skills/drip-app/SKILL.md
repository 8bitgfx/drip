---
name: drip-app
description: Use when building, redesigning or reviewing app UI people work in: dashboards, admin panels, settings, data tables, forms, CRUD screens, internal tools, consoles, navigation (sidebars, tabs, breadcrumbs, command palettes), charts and KPI tiles, and empty, loading, error and permission states. Triggers on "dashboard", "admin", "table", "settings page", "form", "chart", "empty state", "skeleton". Part of Drip.
---

# App UI (Drip)

**Before you do anything: call `drip_guide` with topic `app`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. The screen serves the task. A fluent user of the category must find everything where they expect it: standard navigation, standard controls, no invented affordances.
2. One type family is enough. Fixed rem scale with a ratio of 1.125 to 1.2; no fluid `clamp()` headings and no display face on labels, buttons or data.
3. The accent marks the primary action, the current selection and state only. Never decoration, never on inactive items.
4. Every region that loads data ships four states: loading (a skeleton in the content's shape), empty (what goes here and the one action that fills it), error (what broke and what to do), and full.
5. Every interactive control has default, hover, focus-visible, active, disabled, loading and error states. Focus rings are visible, 2px, 3:1 contrast.
6. Controls are 32 to 40px tall on desktop with a 44px hit area on touch; two button sizes per screen at most; one filled primary per view.
7. Tables before cards for collections. Numbers right-aligned in tabular figures; text left-aligned; headers sentence case and never wrapping.
8. Charts start from the data's shape: one value is a stat, a series over time is a line, categories are bars, more than ~7 categories is a table. No pie walls, no gauge rows, no dual y-axes.
9. State lives in the URL: filters, sort, tabs, pagination and the open record are deep-linkable and survive reload and Back.
10. Hide what a role can never do; disable with a stated reason what it could do; never show an action that fails after the click.
11. Reversible actions run at once with Undo; irreversible ones confirm and name what will be destroyed. Modals are the last resort after inline editing and disclosure.
12. Motion conveys state only: 120 to 250ms, no orchestrated page loads. Check with `fitcheck_shot` at desktop and phone widths and finish with `fitcheck_done`.

## Tools
- `refs_search`, `refs_tag`, `refs_view` — study real products in the category (e.g. "admin dashboard", "billing settings", "data table") before laying out.
- `components_find`, `components_get`, `components_registries` — start from proven primitives: data table, command palette, combobox, date picker, sheet, toast. Restyle, don't hand-roll.
- `palette_generate`, `palette_check` — neutral ramps, state colours and chart series with contrast checked.
- `icons_search`, `icons_get` — one icon family at one size and stroke.
- `fitcheck_shot`, `fitcheck_lint`, `fitcheck_done` — screenshots of every state at real widths, slop lint, final verdict.

## Read deeper when
| Situation | Call |
|---|---|
| A dashboard, overview or KPI screen | `drip_guide app/dashboards` |
| Data tables, forms, settings, bulk actions, validation | `drip_guide app/tables-forms` |
| Any chart, sparkline, stat tile or legend | `drip_guide app/charts` |
| Empty, loading, skeleton, error, offline, permission states | `drip_guide app/states` |
| Hover, press, focus, popover and drag details | `drip_guide interaction` |
| The app on a phone | `drip_guide mobile` |

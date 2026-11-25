# App UI

Good app UI disappears into the task. Someone fluent in the category trusts it on sight: the navigation is where they expect, the controls behave like controls, the data is dense but calm, and every state (loading, empty, error, no permission) has been designed, not left to chance. Its personality lives in type, palette, density and one signature object the product is known by (the timeline, the ledger, the queue), never in reinvented buttons or a greeting over four stat cards. The finish bar is the best product in its category: Linear, Stripe Dashboard, Vercel, Notion, Figma's file browser. A screen that only works in its full, happy state is a quarter of a screen.

## The procedure

1. **Name the task and the user.** What job, how often (daily power use or monthly visit), on what device, with which data volume (10 rows or 10,000). Frequency decides density. If there is no Drip task, call `drip_start`.
2. **Read the project.** Existing tokens, components, shell, icon set, table and form library. Extend what exists; never restyle a working system without saying so.
3. **References.** `refs_search` and `refs_tag` for the category and the specific screen ("audit log", "team settings", "invoice list"); `refs_view` 6 to 10 shots. Note what each does with navigation, density, filters and states.
4. **Map the screen.** List the regions (shell, page header, filters, primary content, detail pane) and for each: the data it shows first, its states, its actions, who may use them.
5. **Pick components.** `components_find` for data table, command palette, combobox, date range picker, sheet or dialog, toast; `components_get` to read the code and install. Restyle to tokens.
6. **System.** Neutral ramp with a second neutral for chrome, one accent, state colours (success, warning, danger, info) and chart series: `palette_generate`, `palette_check`. Type scale fixed in rem. `drip_guide system` if tokens are missing.
7. **Build the full state, then every other state.** Loading, empty, error, partial, no-permission, overlong content. Wire URL state.
8. **Keyboard pass.** Tab through everything; add shortcuts for the frequent actions; make the command palette reach them.
9. **Fit check.** `fitcheck_shot` at 1440, 1280, 1024 and 390, once per state; `fitcheck_lint`; fix; `fitcheck_done`.

## The craft

### Typography

| Role | Size / line-height | Weight |
|---|---|---|
| Page title | 20-24 / 28-32px | 600 |
| Section title | 16-18 / 24px | 600 |
| Body, table cells, inputs | 14 / 20px (13 / 18 dense) | 400 |
| Labels, buttons | 13-14 / 20px | 500 |
| Meta, captions, helper | 12-13 / 16-18px | 400 |
| KPI figure | 28-36 / 1.1 | 500-600, tabular |

- One family (the product's, or a strong UI sans); a mono only for code, IDs and aligned numbers.
- `font-variant-numeric: tabular-nums` on every number that can change or align: tables, KPIs, timers, prices.
- Sentence case everywhere. No tracked uppercase on table heads or buttons.
- Prose (help text, docs panels) still keeps a 60 to 75ch measure; tables may run wide.
- Product UI sets a fixed rem scale on a ratio of 1.125 to 1.2: no fluid `clamp()` headings, and no display face on labels, buttons or data.

Do: 14px body, 13px meta, two weights. Don't: a display serif on the sidebar, 11px grey body text, five font sizes in one card.

### Colour and surfaces

- **Restrained by default:** tinted neutrals plus one accent. A second neutral layer (slightly cooler or warmer, 2 to 4% lighter or darker) for the sidebar, toolbars and panels.
- **Accent on:** the primary button, the selected nav item and row, focus rings, links, the one chart series that argues. **Not on:** icons at rest, headers, inactive tabs, decorative borders.
- **State colours mean state:** danger only for destructive actions and errors, warning for degraded, success for completed. Each pairs with an icon or a word, never colour alone.
- **Depth:** borders (1px, 8 to 12% ink) and surface steps; shadows only for overlays (popovers, menus, dialogs, toasts). On dark themes depth comes from lighter surfaces, not shadow.
- **Dark mode** is designed, not inverted: re-check every state colour and chart series against the dark ground (`palette_check`).

### Layout and density

| Density | Row height | Control height | Use |
|---|---|---|---|
| Compact | 32px | 28-32px | Power users, logs, spreadsheets, trading |
| Default | 40px | 32-36px | Most admin and SaaS screens |
| Comfortable | 48-56px | 40px | Occasional users, consumer settings, touch |

- **4px base grid**, spacing steps 4, 8, 12, 16, 24, 32, 48. Group with space before you group with borders: related items 8px apart, groups 24px, regions 32 to 48px.
- **Page header:** title on the left, primary action on the right, secondary actions in a menu (`⋯`) once there are more than two. Filters and view controls on the row below, directly over what they scope.
- **Content width:** forms and settings max 640 to 720px; tables and dashboards use the full width; detail panes 360 to 480px.
- **Responsive is structural:** the sidebar collapses to a rail or a menu under ~1024px, a list + detail becomes list then detail, tables restack or pin their first column. No fluid type.
- **Overlays escape their container.** Menus, popovers and tooltips render in a portal, the Popover API or `<dialog>`, never inside an `overflow: hidden` ancestor that clips them.
- **Charts start from the data's shape:** one value is a stat, a series over time a line, categories bars, more than about 7 categories a table. No pie walls, no gauge rows, no dual y-axes (`app/charts`).

### Navigation

| Pattern | Use when | Rules |
|---|---|---|
| **Top bar only** | ≤ 7 destinations, shallow hierarchy | Tabs-style links, the current one marked by weight + an underline or fill |
| **Sidebar** | > 7 destinations, sections, or workspace switching | 220 to 280px; collapsible to a 56 to 64px icon rail with tooltips; groups with small headings; the current item marked by a fill and weight, not colour alone; workspace/account switcher at the top, user menu at the bottom |
| **Tabs** | 2 to 7 sibling views of the same object | Below the page header; each tab is a URL; never for sequential steps; overflow scrolls sideways, never wraps |
| **Breadcrumbs** | 3+ levels deep | Every level a link except the current; truncate the middle on narrow screens |
| **Command palette** | Any app with more than a handful of actions | Cmd/Ctrl+K; fuzzy search over pages, records and actions; recent items first; each row shows its shortcut; Enter runs, Esc closes |
| **Detail pane / sheet** | Inspecting a record without losing the list | Opens on the right, 360 to 480px; its own URL; Esc closes; the list keeps scroll and selection |

- **Back always works.** Every view change that a user would want to return to updates the URL (`?status=open&sort=-created`), and Back restores scroll and selection.
- **The page title matches the nav label** that led there.
- **Don't** hide primary navigation behind a hamburger on desktop, mix tabs and sidebar items for the same level, or nest more than two sidebar levels.

### Controls and forms (summary; depth in `app/tables-forms`)

- **Buttons:** one filled primary per view; secondary outlined or ghost; destructive styled danger only where deleting is the main act of that dialog. Labels are verb + object ("Invite member", "Export CSV"). An icon-only button has an `aria-label` and a tooltip.
- **Inputs:** visible label above, constant border width, focus ring as `outline`, helper line reserved below so errors don't shift the layout.
- **Selection controls:** checkbox for independent choices, radio or segmented control for 2 to 5 exclusive ones, select for 6 to 15, combobox with search above that. A switch only for settings that apply immediately.
- **Saving model:** pick one per screen and say it. Settings that apply instantly confirm with a quiet inline "Saved"; multi-field edits use an explicit Save with a sticky bar that appears when the form is dirty, plus an unsaved-changes guard.
- **Sizes:** controls are 32 to 40px tall on desktop with a 44px hit area on touch; two button sizes per screen at most.

### Overlays

| Surface | Use for | Rules |
|---|---|---|
| Popover / menu | Choices and actions on one object | Opens from its trigger, flips at viewport edges, closes on Esc and outside click, arrow keys move |
| Tooltip | Naming an icon, showing a shortcut or a truncated value | 400 to 700ms delay on first hover, instant for neighbours after; never holds the only copy of important info; works on focus |
| Detail pane | Inspecting or editing one record beside the list | Non-modal, has a URL, list stays usable |
| Dialog | A short decision or a small focused form | Native `<dialog>` with `showModal()`, focus inside, Esc closes, background `inert`; max ~560px wide |
| Full page | Anything long, multi-step or worth linking | Its own route with breadcrumbs |
| Toast | Confirming something whose result is off screen | Bottom corner, 4 to 6s, Undo when reversible, pauses on hover; never for errors that need action |

Ask before each modal: could this be inline editing, a disclosure, a popover or a pane? A modal is the last answer. Reversible actions run at once with Undo; irreversible ones confirm and name what will be destroyed.

### Permissions-driven UI

| User can… | Show |
|---|---|
| Never do it (role lacks it) | Hide the control entirely; hide the nav item if nothing behind it is reachable |
| Do it after a state change (e.g. publish once required fields are filled) | Disabled, with the reason in a tooltip or helper line |
| Do it with a higher role | Disabled with "Only admins can change billing" and a "Request access" path, or a read-only view |
| Only view | Values as text, not disabled inputs; no Save button |

- Show the current role where it matters (workspace menu, a settings header).
- The server enforces every rule anyway; the UI only reflects it. Never show an action that returns 403 after the click.
- Ownership-scoped actions (edit your own comment) appear only on the user's own items.

### Keyboard

- **Everything reachable by Tab** in visual order; no traps; focus never lands behind an open dialog.
- **Standard keys:** Enter submits, Esc closes the top-most overlay, arrows move within menus, lists, tabs and grids, Space toggles.
- **Shortcuts for frequent actions:** shown in tooltips and menus as `<kbd>` (`C` create, `/` search, `J`/`K` next/previous, `E` edit, `?` the shortcut sheet). Single-key shortcuts fire only when focus is not in a text field. Never override browser or OS shortcuts (Cmd+W, Cmd+L, Cmd+F unless you provide a better in-app find).
- **Focus management:** opening a dialog focuses its first control; closing returns focus to the trigger; deleting a row moves focus to the next row.

### Motion

- 120 to 250ms, `ease-out` for entering, `ease-in` for leaving; menus and popovers grow from their trigger (`transform-origin` at the anchor).
- Motion only for state: a row inserted, a panel opening, a toast arriving, a value changing. No staggered page loads, no bouncing KPIs, no decorative loops.
- `drip_guide motion` and `drip_guide interaction` for the details.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| "Welcome back, Sarah 👋" over four identical KPI cards with icon tiles and green +12% arrows nobody measured | Lead with the object the user came for (the queue, the ledger); KPIs only with real comparisons |
| Donut chart wall, gauge row, a radar chart for four numbers | Choose by data shape (`app/charts`); one hero figure, one chart, one table |
| Cards for every record where a table would scan | A table with sorting and filters |
| Gradient sidebar, glass panels, glowing accent borders | Solid second neutral; depth from surface steps |
| Purple accent on every icon and heading | Accent on action, selection and state only |
| Spinner in the middle of a blank page | Skeleton in the shape of the content, inside the real shell |
| "No data" in grey in an empty box | What goes here, why it matters, one action to fill it |
| Toast for a failed save that disappears in 3s | An inline, persistent error with a retry |
| `Are you sure?` on every archive | Do it, show Undo for 5 to 10s |
| Disabled Save with no reason | Enabled Save that shows the errors; or a disabled one with the reason |
| Filters that reset on reload; Back exits the app | URL state |
| Tiny 12px text everywhere to "fit more" | 14px body, tighter spacing, fewer columns, a density toggle |
| Emoji as icons, three icon sets mixed | One family, one stroke weight, one size per context |

## Done when

- [ ] A category-fluent user would know where everything is; no invented controls.
- [ ] Every data region shows loading, empty, error and full states, each screenshotted.
- [ ] Every control shows hover, focus-visible, active and disabled; focus order matches the visual order.
- [ ] Numbers are right-aligned and tabular; headers don't wrap; nothing truncates without a way to see the full value.
- [ ] Filters, sort, tabs and the open record live in the URL; Back restores them.
- [ ] Actions a role can't take are hidden or disabled with a reason.
- [ ] Charts are chosen by data shape, start at zero where they are bars, and have a text or table fallback.
- [ ] The accent appears only on action, selection and state; `palette_check` passes in light and dark.
- [ ] At 390 wide the shell collapses and tables restack or pin; tap targets are 44px.
- [ ] `fitcheck_lint` is clean and `fitcheck_done` returns its verdict.

## Reference guides

- `app/dashboards` — what a dashboard is for, layout, KPI tiles, filters, live data.
- `app/tables-forms` — data tables, bulk actions, forms, validation, settings pages.
- `app/charts` — choosing the chart, styling marks, colour, honesty, accessibility.
- `app/states` — empty, loading, skeleton, error, partial, offline and permission states.

## Sources

Adapted and rewritten from: Impeccable (Apache-2.0): the Operate surface mode, product slop test, density and component-state rules. Hallmark (MIT): app-screen scope, data-viz forms, the eight states, field and table finish rules. UI UX Pro Max (MIT): UX guideline data (navigation, forms, feedback, accessibility) and chart selection data. Taste Skill (MIT): the app frame and real-product-subject principle.

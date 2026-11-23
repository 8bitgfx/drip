# Density: product UI, apps and dashboards

Product UI is where people work for hours. Density there is a feature: more information per screen, less
scrolling, consistent positions so the hand and eye learn the interface. It is not crowding. Dense UI that works
is small, consistent spacing with strong alignment, quiet chrome and one clear primary action per view.

## Choose a density

| Level | Use | Body | Control height | Table row | Panel padding | Group gap |
|---|---|---|---|---|---|---|
| Comfortable | consumer apps, onboarding, settings, phones | 16px | 40-48px | 52-56px | 24px | 32-48px |
| Default | most SaaS, admin, CRMs | 14-15px | 36-40px | 44-48px | 16-24px | 24-32px |
| Compact | data tools, trading, IDEs, power users | 13-14px | 28-32px | 32-36px | 12-16px | 16-24px |

- Pick one level per product and write it in DESIGN.md. Offer a compact toggle for tables if users ask, as a `[data-density="compact"]` token override, not by restyling components.
- Compact never goes below 12px text, never removes focus rings, and still gives touch layouts 44px targets.

## The app shell

| Region | Size | Notes |
|---|---|---|
| Top bar | 48-64px tall | product name or workspace, search or command palette, account |
| Sidebar | 220-280px expanded, 56-64px collapsed | primary navigation, 5-9 items before grouping; collapses to a sheet under 1024px |
| Content | fluid, padded 24-32px (16 on phones) | max text width still 65-75ch for prose inside |
| Detail panel / inspector | 320-420px | opens beside the list on wide screens, as a sheet or a new view on narrow ones |
| Toolbar | 40-48px | filters, view switches, the primary action on the right |

- One navigation pattern per level: sidebar *or* top tabs *or* bottom bar for the top level, never two at once.
- Keep regions in the same place on every screen. Navigation that moves is the fastest way to make an app feel broken.
- The page title sits in the same spot on every screen, with the page's primary action aligned to it on the right.
- Under 1024px: sidebar into a sheet or a bottom tab bar (apps with 3-5 top destinations), detail panels become full views.

## Spacing inside product UI

| Between | Value |
|---|---|
| Icon and its label | 6-8px |
| Label and its input | 4-8px |
| Fields in a form | 16-24px |
| Field groups (fieldsets) | 32-48px, with a group heading |
| Toolbar items | 8px; 16-24px between groups of tools |
| Cards on a dashboard | 16-24px |
| Page title to content | 24-32px |

The 2x rule still holds: groups are separated by at least twice their inner spacing.

## Tables

- **Rows:** 44-48px default, 32-36px compact, 52-56px comfortable. Cell padding 12-16px horizontal.
- **Lines:** horizontal hairlines only (border token), no vertical rules, no zebra stripes unless rows are very wide and dense (then a 2-3% L tint).
- **Header:** sentence case, the label size, muted colour or 500 weight, sticky when the table scrolls; never wraps.
- **Alignment:** text left, numbers right with `tabular-nums`, dates in one format, status as a dot plus a word.
- **The first column** names the row and is one weight heavier or the link; actions live at the row's end or in a row menu, revealed on hover *and* always reachable by keyboard.
- **Width:** tables may run wider than 75ch; that rule is for prose.
- **States:** loading as skeleton rows of the right height (not a spinner in the middle); empty as a message that explains and offers the first action; errors inline with retry.
- **Selection:** a checkbox column 40-48px wide; the selected row tinted with the accent-subtle token; a bulk-action bar replaces the toolbar when rows are selected.
- **Phones:** see `drip_guide layout/responsive` (tables).

## Forms

- One column. Two columns only for genuinely paired short fields (first/last name, city/postcode).
- Labels above fields, visible always (placeholders are not labels). 14px label, 16px input text on phones.
- Input height equals button height in the same row (40px default).
- Help text under the field in the small size; errors in the same spot, linked with `aria-describedby`.
- Width says the expected length: a postcode field is short, an address long. Max form width about 560-640px.
- The primary button at the end, left-aligned with the fields (or right-aligned in dialogs, consistently).
- Long settings pages: sections with a heading and description on the left (1/3) and fields on the right (2/3) on desktop, stacked on phones.

## Dashboards

- **Start from the questions** the user comes with, not from the data available. Two to four key numbers, then the charts and tables that explain them.
- **Grid:** 12 columns, 16-24px gaps; cards in rows of equal height; wide charts span 8, side lists span 4.
- **Stat cards:** label (small, muted) above the number (24-30px, tabular), change below it with an arrow and a word ("+12% vs last week"), no decorative icon. No sparkline unless it shows something the number does not.
- **Charts:** one accent series, the rest neutral; direct labels when there are few series; gridlines at the border token.
- **Above the fold:** the numbers that answer the main question. Everything else below.
- **Do not** fill space with placeholder charts, fake data or decorative progress rings. An empty state that teaches beats a pretty fake.

## Lists, inboxes, feeds

- Row height from content: one line 40-48px, two lines 56-72px; avatar 24-32px.
- Unread or new: weight and a small dot, not colour alone.
- Hover background on the whole row; the click target is the whole row.
- Keep metadata in fixed positions (time on the right, aligned) so the eye can scan down a column.

## Overlays

- **Popovers and menus:** 4-8px from their trigger, 8px inner padding, 32-36px items, max 320px wide.
- **Dialogs:** 400-560px wide for confirmations and short forms, 640-800px for content; 24px padding; title, body, actions (primary right or left, consistently).
- **Sheets/drawers:** 360-480px from the side on desktop, bottom sheets on phones with a drag handle and a close button.
- **Toasts:** bottom right or bottom centre, 360px max width, stacked, errors stay until dismissed.
- Prefer inline editing, expanding rows and side panels to modals. A modal is for decisions that must interrupt.
- Overlays render outside `overflow: hidden` parents (portal, `<dialog>`, popover API) and use the z ladder from the system.

## Slop tells in product UI

| Tell | Fix |
|---|---|
| Marketing-sized spacing in an app (96px gaps, 48px headings) | The density table; page titles 20-24px |
| Every section in its own card with shadow | Regions separated by hairlines or background steps; cards for things that are independently actionable |
| Dashboard of decorative stat cards with icons and fake sparklines | Two to four real numbers with comparison; charts that answer questions |
| Display font in labels, buttons and table cells | The text face for all UI |
| Sidebar + top tabs + bottom nav at the same level | One navigation pattern per level |
| Spinner in the middle of the content area | Skeleton rows/cards of the right size |
| Modal for every edit | Inline edit, side panel, expanding row |
| Actions only visible on hover | Also on focus, and in a row menu on touch |
| Table with vertical borders, zebra stripes and a card around it | Horizontal hairlines, no outer card, full width |
| Tiny 11px grey text to fit more in | 12px minimum, 4.5:1 contrast; fit more by removing columns |

## Checklist

- [ ] One density level, written in DESIGN.md; spacing values from the table.
- [ ] Shell regions stay in the same place on every screen; one nav pattern per level.
- [ ] Tables: hairlines only, numbers right-aligned and tabular, sticky header, skeleton loading, useful empty state.
- [ ] Forms one column, labels above, input height = button height, errors under fields.
- [ ] Dashboards lead with the few numbers that answer the user's question.
- [ ] Overlays escape clipping containers and use the z ladder.

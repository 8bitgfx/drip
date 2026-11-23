# App: tables, forms and settings

Tables and forms are most of the work in most apps. A good table scans in one pass: aligned columns, quiet rules, the row's name always in view, actions where the eye already is. A good form asks only what it needs, says what to type, catches mistakes kindly, and never throws the user's input away.

## Data tables

### Columns
- **Alignment:** text left, numbers and money right (so decimals line up), dates left in one fixed format, status centred only if it is an icon-only column (prefer left with a word).
- **Tabular figures** on every numeric column: `font-variant-numeric: tabular-nums`.
- **Headers:** sentence case, never wrapping (`white-space: nowrap`), units in the header ("Amount (EUR)") so cells hold plain numbers. Header weight one step above cells; no uppercase tracking.
- **The first column names the row** (customer, invoice number) and links to the record. It stays in view on narrow screens (sticky left).
- **Order columns by the question:** identity, status, the values people compare, dates, then actions.
- **Widths:** fixed tracks for status, dates and numbers; the name column flexes; long text truncates with an ellipsis and shows in full on hover, focus and in the detail view. Never truncate the value someone came to read.
- **Empty cells:** a muted em dash (—), never blank and never "null".

### Rows
| Density | Height | Padding |
|---|---|---|
| Compact | 32px | 6px / 8px |
| Default | 40-44px | 10px / 12px |
| Comfortable | 52-56px | 14px / 16px |

- Horizontal rules only (1px, 6 to 10% ink), no outer border, no zebra by default (zebra helps only very wide tables without rules).
- Row hover is a faint fill; the selected row uses the accent at low strength plus a left marker.
- **Row actions:** the most common one as an inline button or link on the right, the rest in a `⋯` menu. Show inline actions on hover and focus, and always on touch.
- Clicking a row opens the record (or a detail pane); checkboxes and inline controls stop propagation.

### Sort, filter, search
- **Sort:** click the header; the active column shows an arrow and `aria-sort`; a second click reverses; default sort stated (newest first).
- **Filters:** a filter row or a "Filter" button that adds chips above the table ("Status is Open ×"). Each chip removable; "Clear all" when two or more.
- **Search** in the toolbar scoped to this table, debounced 200 to 300ms, with the query shown in the empty result.
- **Saved views** (tabs over the table: All, Mine, Overdue) when users repeat the same filters.
- All of it in the URL.

### Selection and bulk actions
- Checkbox column on the left; header checkbox selects the visible page, then offers "Select all 1,284".
- When anything is selected, a bulk action bar replaces the toolbar (or floats at the bottom): "3 selected · Assign · Export · Delete · Clear".
- Shift+click selects a range; Esc clears.
- Bulk destructive actions say the count: "Delete 3 invoices".

### Pagination and volume
| Rows | Approach |
|---|---|
| < 100 | Render all; client-side sort and filter |
| 100 – 10,000 | Server-side pagination (25/50/100 per page) with total count, or virtualised scroll |
| Feeds and logs | Infinite scroll with a "Jump to latest" and position kept on Back |

Virtualise any list over ~200 rendered rows. Keep header and toolbar sticky inside the table's scroll area.

### Editing in tables
- Inline edit for single values people change often (status, assignee, a number): click or Enter to edit, Enter to save, Esc to cancel, a quiet saved tick.
- Anything with validation or multiple fields opens a detail pane or page.
- A changed value that feeds a total updates the total a beat later so the cause reads before the effect.

### Tables on phones
- Restack each row as a labelled block (name as the title, 2 to 4 key fields, the main action), or keep a table with the first column pinned and horizontal scroll inside the table only.
- Never shrink to 10px to fit 8 columns.

Use `components_find` for a headless data table (TanStack Table or the project's own) instead of writing sorting, selection and virtualisation by hand.

## Forms

### Structure
- **One column.** Two fields share a row only when they are one thing (first and last name, city and postcode, start and end date).
- **Label above the field,** 4 to 8px gap; helper text below in a line that reserves its height; the error replaces the helper, never adds a line.
- **Field width hints at length:** postcode short, email medium, address long. Don't stretch every input to 720px.
- **Group** related fields under a fieldset heading; long forms split into sections or steps with a progress indicator. Ask the easy, certain things first.
- **Mark the minority:** if most fields are required, mark the optional ones "(optional)"; otherwise mark required ones with a word or asterisk explained once.
- **Primary action bottom-left** aligned with the fields (or bottom-right in dialogs, following the platform), labelled with the result ("Create project", not "Submit"); Cancel as a quiet button or link.

### Inputs
- Correct `type`, `inputmode`, `autocomplete` and `name` on every field; `enterkeyhint` on mobile.
- Placeholder shows a format ("ana@company.com", "DD/MM/YYYY"), never the label.
- Native select for 6 to 15 options; a searchable combobox above that; radios or a segmented control for 2 to 5 visible options.
- Date pickers accept typed input as well as the calendar. Number inputs accept spaces, commas and pasted formats; normalise before validating.
- Never block paste. Support password managers and passkeys.

### Validation
- Validate a field on blur once the user has entered something; after an error shows, re-check on every input and clear it the moment it is fixed.
- Empty required fields are reported on submit, not when the user tabs past them.
- **Error copy** names the field and what to do: "Enter a date after the start date". Not "Invalid input".
- On a failed submit: focus moves to an error summary at the top (for long forms) linking to each field, or to the first invalid field.
- `aria-invalid="true"` and `aria-describedby` pointing at the error text; never colour alone.
- **Keep everything the user typed** after a failed submit or server error (except secrets).

### Submit
- Submit is enabled at rest; disabled only while the request is in flight, with a spinner replacing or beside the label and the width fixed.
- On success, show the result (the created record, an inline "Saved") rather than a toast alone. On failure, an inline error with Retry; the form stays filled.
- Unsaved changes: track dirty state and warn on navigation and tab close only when something changed.

## Settings pages

- **Navigation:** a left list of groups (General, Members, Billing, Security, Notifications, Integrations, Danger zone) when there are more than 5; tabs when there are 2 to 5. Each group is a URL.
- **Row anatomy:** label and one-line description on the left (max ~50ch), the control on the right, aligned to one column; 16 to 24px between rows; groups separated by headings and space.
- **Saving:** toggles and selects that apply instantly show a brief inline "Saved" by the control. Text fields and multi-field groups get an explicit Save per section, or a sticky save bar that appears when anything is dirty ("You have unsaved changes · Discard · Save").
- **Danger zone last,** visually separated: each action described ("Delete this workspace and all its projects. This cannot be undone."), a danger-styled button, and a confirm dialog where the user types the workspace name.
- **Read-only users** see values as text with a note on who can change them.

## Destructive and reversible actions

| Action | Pattern |
|---|---|
| Archive, move, remove from list, mark done | Do it now, toast with Undo for 5 to 10s |
| Delete a single item that can be restored from trash | Do it, Undo, item goes to trash |
| Permanent delete, delete account, revoke all keys | Confirm dialog naming the object and consequence; type-to-confirm for the biggest ones; danger button labelled with the action ("Delete workspace") |

## Slop tells

| Tell | Fix |
|---|---|
| Uppercase tracked 11px table headers | Sentence case, 13px, 500 weight |
| Centered numbers, proportional digits | Right-aligned, tabular |
| Every row has five icon buttons always visible | One inline action, the rest in `⋯` |
| Card grid for 300 invoices | A table |
| Placeholder as the only label | Visible label above |
| Red border with no message | A message under the field that says what to do |
| Submit disabled until the form is valid, with no hint why | Enabled; show errors on click |
| A wizard for a 4-field form | One short form |
| "Are you sure?" with Yes/No | Undo, or a confirm that names the action on its button |

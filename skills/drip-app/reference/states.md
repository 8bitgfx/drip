# App: states

Most of an app's life is spent outside the happy path: waiting, empty, failed, offline, forbidden, overfull. These states are where trust is won or lost. Each one is designed inside the real shell, says plainly what is going on, keeps the user's work safe, and offers the one next step.

## The state matrix

Every region that loads or holds data gets these. Screenshot each one with `fitcheck_shot`.

| State | When | Shows |
|---|---|---|
| Loading (first) | No data yet, request in flight | Skeleton in the content's shape, real chrome and labels around it |
| Loading (refresh) | Data shown, refetching | The old data stays; a subtle progress bar or spinner in the region header |
| Empty: first use | Nothing has ever been created | What goes here, why it matters, one primary action, optionally a template or import |
| Empty: no results | Filters or search return nothing | The query, "No invoices match 'acme' in Overdue", Clear filters / edit search |
| Empty: cleared | The user finished everything (inbox zero) | A short confirmation; no confetti |
| Partial | Some panels or rows failed | The failed piece alone shows an error with Retry |
| Error | The request failed | What happened, whether data is safe, what to do, Retry |
| Offline | No connection | A persistent banner; cached data marked; actions queued or disabled with reason |
| Stale | Data older than expected | "Last updated 14 min ago" and Refresh |
| No permission | Role can't see it | Why and who can grant it; "Request access" |
| Not found | Record deleted or wrong link | Say so, link to the list, search |
| Overflow | Long names, 10,000 items, 40 tags | Truncation with a full view, "+12 more", pagination |
| Success | An action completed | The result itself on screen; a quiet confirmation |

## Loading

- **Timing:** show nothing for the first ~200ms (most requests finish); then a skeleton. Once shown, keep it at least ~400ms so it doesn't flash. Over ~4s, add text ("Still loading invoices…"); over ~10s or for known long jobs, a determinate progress bar with what is happening.
- **Skeletons match geometry:** the real row height, the real number of columns, bars where text will be at varied widths (60%, 45%, 72%), avatar circles where avatars go. The page header, filters and nav render for real.
- **Shimmer** is optional and subtle (a slow 1.5 to 2s sweep at low contrast); under reduced motion the skeleton is static.
- **Spinners** belong in buttons (replacing the label or beside it, width fixed) and small region refreshes, never centred on a blank page.
- **Optimistic UI** for actions that almost always succeed (toggle, rename, reorder): apply instantly, roll back with an inline error if the server refuses.
- **No layout shift** when data arrives: reserve heights, fixed table column tracks, image dimensions set.
- Mark busy regions with `aria-busy="true"`; announce completion of long loads politely.

```tsx
function InvoiceTable() {
  const { data, isPending, isError, refetch } = useInvoices(filters);
  if (isPending) return <TableSkeleton rows={8} columns={columns} />;
  if (isError) return <RegionError title="Couldn't load invoices" onRetry={refetch} />;
  if (data.items.length === 0)
    return hasFilters(filters)
      ? <NoResults query={filters} onClear={clearFilters} />
      : <FirstUse title="No invoices yet" body="Invoices you send appear here with their status." action={<Button>Create invoice</Button>} />;
  return <Table rows={data.items} />;
}
```

## Empty states

- **First use** is onboarding in place. One line naming what belongs here, one line on why it matters or what happens next, one primary action. Optional: a template, an import, a link to docs, or a sample the user can delete (clearly marked as sample).
- **Size:** inside the region it replaces, aligned to its top or centre; not a full-page illustration for a small panel.
- **Illustration:** optional, small (≤ 120px), in the product's own style and palette; never generic stock art or a sad cloud.
- **No-results** keeps the filters visible and editable, states what was searched, and offers the fix. Never just "No results".
- Copy: "No projects yet" + "Projects group your tasks and files. Create one to get started." + [New project]. Not: "Nothing to see here! 🎉".

## Errors

- **Say what happened in plain words, then what to do.** "We couldn't save your changes. Check your connection and try again." Not "Error 500" or "Something went wrong".
- **Keep the user's data.** The form stays filled, the draft stays in the editor, the upload can resume.
- **Place the error where it happened:** a field error under the field; a region error in the region; a page-level banner only for page-wide problems; a full-page error only when nothing can render.
- **Persistent until resolved.** Errors never live only in a toast that vanishes.
- **Recovery path:** Retry, Undo, Contact support with the error reference copied for them. Technical details collapsed behind "Details", never the stack trace by default.
- **Never blame the user**; never make them guess which field.
- Use `role="alert"` for errors that appear after an action.

## Offline and sync

- A persistent, non-blocking banner: "You're offline. Changes will sync when you reconnect."
- Show which items are pending sync (a small icon or "Saving…" per item) and which failed.
- Disable only what truly needs the network, with the reason in a tooltip.
- On reconnect, sync and say "All changes saved" briefly.

## Permission states

- Hide what a role can never use; for pages reached by a shared link, show a clear "You don't have access to this project" with who owns it and a Request access button.
- Disabled controls near the user's focus say why ("Only owners can delete this workspace").
- Read-only mode renders values as text, not greyed inputs.

## Success and feedback

- The best confirmation is the result: the new row appears highlighted for a moment, the status pill changes, the counter rolls.
- Toasts confirm actions whose result is off screen ("Invite sent to ana@company.com"), carry Undo when reversible, auto-dismiss after 4 to 6s, pause on hover and focus, and stack at most 3. Errors don't go in auto-dismissing toasts.
- No success message for something that didn't hit the server.

## Overflow and edge content

- Test every component with: the longest real name, an empty value, 0, 1 and 10,000 items, a 40-character word with no spaces, right-to-left text if supported, and a user with no avatar.
- Long tokens wrap with `overflow-wrap: anywhere`; flex children that hold text get `min-width: 0`.
- Truncate only non-essential text, and always provide the full value (tooltip on hover and focus, the detail view).
- Chip lists wrap or collapse to "+n" with a disclosure; never a clipped row.

## State slop tells

| Tell | Fix |
|---|---|
| Centered spinner on a white page | Skeleton inside the real shell |
| Skeleton that doesn't match the content (three grey cards for a table) | Skeleton rows with the table's columns |
| "No data" in grey | What goes here and the action |
| Empty state with a giant generic illustration and "Oops!" | Small, on-brand, plain words |
| "Something went wrong." with no next step | Cause, safety of data, Retry |
| Error toast that vanishes in 3s | Inline, persistent error |
| Form cleared after a server error | Keep every value |
| Confetti for creating a record | The record itself, highlighted |

## Check

- [ ] Every data region has loading, first-use empty, no-results, error and full states, each screenshotted.
- [ ] Skeletons match the final layout; nothing shifts when data arrives.
- [ ] Error copy names the problem and the fix; user input survives failures.
- [ ] Permission and offline states are designed where the product has them.
- [ ] Longest-name, zero, one and many-item cases render without breaking.

# Polish: edge states

Designs made with perfect data are not finished. Real people arrive with nothing yet, with a thousand items, with a 90-character company name, on a train with no signal, without permission to edit. Each of those moments is a screen someone will see; design it as deliberately as the happy path. This file covers what each state needs and the values that make it feel intended.

## Empty

There are three different empties; don't use one component for all of them.

| Kind | Example | What to show |
|---|---|---|
| First use | No projects yet | What this place is for, the one action that fills it, optionally a sample or template |
| No results | Search or filter matched nothing | What was searched, a way to clear or broaden it ("Clear filters"), suggestions if you have them |
| Cleared | Inbox zero, all tasks done | A quiet confirmation; no call to action needed |

- Keep it short: a title (what), one line (why / what next), one button. A small icon or illustration at most, from the project's family or style; never a giant stock illustration that dwarfs the action.
- Keep the surrounding chrome (table header, filters, toolbar) so people stay oriented and can change what caused the empty.
- Copy in the product's voice; no "Oops!" (`drip_guide copy`).
- Partial empties count too: a dashboard card with no data says so inside the card at the card's normal size, not a collapsed card.

## Loading

| Expected wait | Show |
|---|---|
| under ~300ms | Nothing new (keep the old content or blank region at its size) |
| 300ms-1s | Skeleton in the shape of the content, or a small inline spinner for a button |
| 1-10s | Skeleton plus, for multi-step work, a line saying what is happening ("Importing 240 contacts") |
| over 10s | Determinate progress, the ability to leave and come back, a notification when done |

- Skeletons match the real boxes: same heights, widths that vary (60-90% for text lines), same radii. When content arrives nothing moves.
- Shimmer optional and subtle; off under reduced motion.
- Delay spinners ~150-300ms and keep them up at least ~300-500ms once shown so fast responses don't flicker.
- Pagination and infinite scroll: a loading row at the end, not a full-screen spinner. Keep scroll position on return.
- Refresh: keep the stale content visible with a small indicator; don't blank the screen.
- Optimistic updates: show the result immediately, mark it pending only if confirmation takes over ~1s, roll back with a message on failure.

## Error

- Say what happened in plain words, what it means for the person, and what they can do: "Couldn't load invoices. Check your connection and try again." + **Retry**.
- Put it where the failure is: inline for a field, in the card for a widget, top of the page only for whole-page failures. One failing widget never blanks the whole dashboard.
- Keep everything the person entered; never clear a form on error.
- Distinguish: validation (fix this field), permission (ask someone), not found (it moved or was deleted), server (not your fault, retry, contact), rate limit (wait N seconds), offline (will retry when back).
- Errors stay until fixed or dismissed; no auto-dismissing error toasts.
- Technical detail (error ID, status) available behind "Details" or copyable, not in the headline.

## Partial and mixed

- Bulk actions where some items fail: "18 of 20 moved. 2 couldn't be moved: [list] Retry".
- Lists where some items lack data: a consistent placeholder (an en dash `–` in muted ink) rather than empty cells or "N/A" in different forms.
- Images that fail: neutral placeholder surface at the correct aspect ratio, optionally an icon; never the browser's broken-image glyph.

## Long and short content

| Case | Handling |
|---|---|
| Long single-line labels (names, titles, file names) | `truncate` with `min-w-0` on the flex child; full value on hover/focus. For file names, truncate the middle so the extension stays (`quarterly-repo…final.pdf`) |
| Long multi-line text (descriptions in cards) | `line-clamp-2` or `3`, consistent per component; a "More" affordance if the rest matters |
| Long words, URLs, hashes in user content | `overflow-wrap: anywhere` |
| Very short content (one-word title, empty description) | Layout doesn't collapse awkwardly; no orphan separators (`·`, `,`, `|`) when a neighbour is missing |
| Translations | Budget +30-40% width; no fixed widths on text; test with German or Finnish strings |
| Mixed scripts, emoji, RTL | Fonts with fallbacks for CJK and Arabic; logical properties; `dir="auto"` on user-generated text |

## Numbers

- 0, 1 and many: correct plurals through `Intl.PluralRules` or the i18n library, not `count + "s"`.
- Large values: `Intl.NumberFormat` with grouping; compact notation in tight places (`12.4K`, `3.1M`) with the exact value on hover.
- Negative values with a real minus sign (`−`) or the locale's format; colour plus sign, never colour alone, for gains and losses.
- Currency with the locale's symbol position and decimals; never round money silently.
- Percentages: decide decimals per context (dashboards 1 decimal, marketing none) and keep it consistent.
- Changing values `tabular-nums` with reserved width so the layout doesn't wobble.
- Dates: relative for recent ("5 min ago", "Yesterday"), absolute beyond a week, full timestamp on hover, always in the viewer's locale and time zone.

## Many items

- Lists over a few hundred rows: virtualise (TanStack Virtual) or paginate; tables keep the header sticky.
- Selects with more than ~10 options become searchable comboboxes.
- Tags and chips overflow into "+5" with the full list in a popover.
- Avatars stack to 3-5 then "+N".
- Charts with too many series: group the tail into "Other" (`drip_guide app`).

## Permissions and roles

- Read-only: show the content at full contrast with no edit chrome, and say why where people would expect to edit ("Only admins can change billing").
- Hidden vs disabled: hide what someone can never use; disable (with an explanation) what they could use after an action (upgrade, ask an admin).
- Locked features: one clear path to unlock, not a padlock on every item.

## Offline and slow networks

- Detect offline and say it once, in a persistent but quiet place (a bar or a status chip), not a modal.
- Queue actions where possible and show them as pending; sync and confirm when back.
- Test with DevTools throttling ("Slow 4G") and offline: every action has a visible outcome.

## First-run and returning

- First visit: the empty state is the onboarding; one next step, not a tour of eight tooltips.
- Returning: restore scroll position, open tabs, filters and drafts.
- Long-idle sessions: if the session expired, keep the draft and re-authenticate in place, never drop work.

## Screenshots to take

For every data view touched, `fitcheck_shot` these and review them next to the happy path:

1. First-use empty
2. No results
3. Loading (throttle to see it)
4. Error (force it: block the request in DevTools)
5. One item, and many items
6. Longest realistic text and a translation-length string
7. Zero, negative and very large numbers
8. Read-only role
9. Offline

## Sources

Impeccable (Apache-2.0), *harden* and *polish*: extreme inputs, error kinds by status code, i18n expansion, partial failures, permission states, testing strategy. UI UX Pro Max (MIT): loading thresholds, skeletons over long spinners, persistent errors, undo. *Make Interfaces Feel Better* (MIT): tabular numbers for changing values. Vercel Web Interface Guidelines (paraphrased, no text reused): spinner delay and minimum time, locale-aware formatting, keep input on error. Taste Skill (MIT): final values present without script.

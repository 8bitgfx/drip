# Copy: microcopy

The small words decide whether a product feels finished. A hand-tuned hero over a stock "Something went wrong" gives the game away. Write microcopy for every state of every screen you touch, in the product's voice, at the tone the moment needs: plain under stress, brief on success, specific always.

## The message hierarchy

For every state decide, in order:
1. The one fact the user needs now.
2. The action available next.
3. Context that changes the decision (only if it does).
4. The tone: calm for errors and money, brief for success, warm for empty and first-run.

Say each idea once. If the heading explains the state, the body adds something new or goes.

## Buttons

| Situation | Pattern | Examples |
|---|---|---|
| Primary action | Verb + object | "Send invoice", "Create project", "Book a table" |
| Navigation to a page | "See" / "Read" / "Open" + the thing | "See pricing", "Read the guide" |
| Multi-step flow | "Continue" only for step 2+; last step names the outcome | "Continue" → "Pay €48" |
| Save | "Save" for settings; "Save changes" when there is a cancel beside it | |
| Destructive | Verb + object, secondary or danger style | "Delete project", "Remove member" |
| Cancel in a dialog | "Cancel", or "Keep editing" when cancel is ambiguous | |
| Loading | Keep the label, add a spinner; or the present participle | "Sending…", "Saving…" |
| Disabled | Explain why near it, never only greyed out | "Add a client first" under a disabled "Send invoice" |

- 1 to 4 words. Sentence case. No arrows, no emoji, no exclamation marks.
- The same action has the same label in the nav, the page, the dialog and the toast.
- A pair of buttons: the primary names the outcome, the secondary is the safe exit.

## Form fields

| Part | Rule | Example |
|---|---|---|
| Label | A noun for what goes in, always visible, above the field | "Work email", "Company name" |
| Placeholder | Only a format example, or nothing | "name@company.com", "DD/MM/YYYY" |
| Helper text | A constraint the user cannot guess | "At least 12 characters", "Shown on your invoices" |
| Optional/required | Mark the minority: "(optional)" if most are required | "Phone (optional)" |
| Why we ask | Only when it is not obvious | "For delivery updates only" |

Cut: a placeholder that repeats the label, helper text that restates it ("Enter your email"), helper that says what the field is obviously for ("We'll use this to contact you").

## Validation errors

Pattern: what is wrong + how to fix it, in the field's own words, without blame.

| Situation | Write | Not |
|---|---|---|
| Required empty | "Enter your company name." | "This field is required." |
| Wrong format | "Enter an email like name@company.com." | "Invalid email." |
| Too short | "Use at least 12 characters (8 so far)." | "Password too weak." |
| Out of range | "Pick a date from today onward." | "Invalid date." |
| Already taken | "That handle is taken. Try sam-studio or sam-design." | "Username unavailable." |
| Mismatch | "Passwords don't match." | "Error: password mismatch." |

Timing: validate a field when the user leaves it after typing; report empty required fields on submit; once a field shows an error, re-check on every keystroke and clear the error the moment it passes. Keep input after a failed submit. Never pre-disable the submit button. Details for assistive tech: `drip_guide a11y`.

## System errors

Pattern: what failed, why if known and useful, what to do now. Preserve the user's work and say so.

| Situation | Write |
|---|---|
| Network | "Couldn't connect. Check your internet and try again." [Try again] |
| Save failed | "Couldn't save your changes. Your draft is kept on this device." [Try again] |
| Server error | "Ledger isn't responding. Nothing was lost; try again in a minute." |
| Timeout | "This is taking longer than usual. We'll keep trying." [Cancel] |
| Permission | "Only workspace owners can delete clients. Ask Maria for access." |
| Not found | "This invoice was deleted or moved." [Go to invoices] |
| Rate limit | "Too many attempts. Try again in 5 minutes." |
| Payment declined | "Your card was declined. Try another card or contact your bank." |
| Session expired | "You were signed out after 30 minutes idle. Sign in to continue; your draft is saved." |

Never: "Oops", "Uh oh", "Something went wrong" alone, a raw code as the message (put codes in a quiet detail line for support), blaming the user, promising a cause you do not know, auto-dismissing an error before it can be read.

## Empty states

Distinguish the kind; each gets different words.

| Kind | Pattern | Example |
|---|---|---|
| First use | What will live here + the first action | "No invoices yet. Create one to bill your first client." [Create invoice] |
| No search results | What was searched + how to widen | "No clients match ‘Acme’. Check the spelling or search by email." |
| Filtered to nothing | Name the filter + clear it | "No paid invoices in March." [Clear filters] |
| Cleared / done | State it, no celebration | "No unread notifications." |
| No permission | Why + who can help | "You can't see billing. Ask a workspace owner." |
| Failed to load | Error pattern, not empty pattern | "Couldn't load invoices." [Try again] |

One line for what is empty, one optional line for why it matters, one action. No "Oops", no emoji, no exclamation.

## Loading and progress

- Under 300ms: show nothing. 300ms to 2s: a spinner or skeleton, no words. Over 2s: name the real work ("Importing 240 contacts…"). Over 10s: progress or a time estimate, and a way to leave ("We'll email you when it's done").
- Use a skeleton where the content's shape is known, a spinner only inside a button.
- Never invent progress (a bar that crawls to 90% and waits).
- Present participle plus the object: "Uploading receipt…", "Generating report…".

## Success

- If the result is visible (the item appears, the toggle flips), say nothing.
- If it is not visible, confirm the outcome in the button's words: "Invite sent to sam@studio.com".
- Mention the next consequence only when it changes what the user does: "Invoice sent. Ledger will remind Acme in 7 days if it's unpaid."
- No "Success!", no "successfully", no confetti for routine actions.

## Destructive actions and confirmations

- Prefer undo over confirm when the action can be reversed: act at once, show "Project archived. [Undo]" for 5 to 10 seconds.
- Confirm only what cannot be undone. Name the object and the consequence in the title; repeat the verb on the button.
  ```
  Delete "Q3 report"?
  The report and its 14 comments will be removed for everyone. This can't be undone.
  [Cancel]  [Delete report]
  ```
- For the most destructive actions (delete account, drop a database), ask the user to type the name.

## Toasts and notifications

- Toasts for invisible effects and failures, not for things the user already sees.
- One line, sentence case, no full stop if it is a fragment ("Copied", "Link copied"), an action if one helps ("Undo", "View").
- Success toasts dismiss after 4 to 6 seconds; errors stay until dismissed or fixed.
- Notifications name who did what to which thing: "Maria commented on INV-204", not "You have a new notification".

## Tooltips

- Name the control and, if useful, its shortcut: "Bold (Ctrl+B)".
- Never repeat the visible label; never explain the obvious ("Click to open").
- Never the only place for information the user needs.

## Numbers, dates and units

| Item | Rule | Example |
|---|---|---|
| Large numbers | Thousands separator from 1,000; abbreviate only in tight space | 12,480 / 12.5k in a chart axis |
| Money | Currency symbol and locale; no decimals for round prices on marketing | €48, $1,250.50 in an invoice |
| Percentages | Number + %, no space in English | 38% |
| Units | Non-breaking space between value and unit | 10 MB, 40 s |
| Relative time | Under 1 hour: "5 minutes ago"; under 7 days: "Tuesday"; then a date | "Updated 3 hours ago" |
| Dates | Locale-aware via `Intl.DateTimeFormat`; spell the month to avoid 01/02/03 ambiguity | 3 Feb 2026 |
| Ranges | En dash, no spaces | 9–5, 10–20 users |
| Counts | Real plural rules via the i18n library, never `item(s)` | "1 invoice", "2 invoices" |
| Comparable figures | `font-variant-numeric: tabular-nums` | Tables, prices, timers |

## Writing for translation and assistive tech

- Write whole messages, not fragments joined in code ("You have " + n + " items").
- Leave 30 to 40% room for longer languages; never fix a button's width to the English label.
- The accessible name of a control matches its visible label.
- Link text makes sense out of context ("Read the API docs", not "here").
- Never let colour, an icon or punctuation carry the meaning alone.

## Sources

Adapted and rewritten from Impeccable (Apache-2.0) clarify reference (message hierarchy, error anatomy, kinds of empty state, undo over confirm, localisation), Hallmark (MIT) craft and interaction references (button verbs, loading timings, the fake send, undo windows), unslop-ui (MIT) form-field and botsplaining rules, Taste Skill (MIT) copy-moves microcopy section, and UI UX Pro Max (MIT) form and feedback guidelines (validation timing, preserved input, persistent errors, never pre-disabled submit).

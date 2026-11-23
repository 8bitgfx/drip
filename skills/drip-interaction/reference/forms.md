# Interaction: forms that feel good

A good form asks for as little as possible, tells you what it wants before you type, accepts the way you naturally type it, catches mistakes at the right moment, keeps everything you entered, and makes the outcome obvious. Most form pain is timing: errors shown too early, buttons disabled for unexplained reasons, focus left behind.

## Structure

- One column. Fields in the order people think of the answers. Related short fields (city / postcode, expiry / CVC) may share a row.
- Every input has a visible `<label>` connected by `for`/`id` (or wrapping). Placeholder is never the label; use it for an example (`name@company.com`) or not at all.
- Helper text under the label or field, linked with `aria-describedby`; say the constraint before the error does ("At least 12 characters").
- Mark the minority: if most fields are required, mark the optional ones "(optional)"; otherwise mark required ones. Don't rely on a red asterisk alone.
- Group with `<fieldset>` and `<legend>` for radio sets, address blocks and anything with a shared question.
- Ask only what you use. Every field you remove raises completion more than any styling.
- Width hints the expected length: postcode short, email long. Full width on phones.

## Sizes and spacing

| Thing | Desktop | Touch |
|---|---|---|
| Input height | 36-40px | 44-48px |
| Input font size | 14-16px | 16px minimum (iOS zooms the page on focus below 16px) |
| Label to input | 6-8px | 6-8px |
| Field to field | 16-24px | 20-24px |
| Section to section | 32-48px | 32-40px |
| Checkbox / radio | 16-20px visual, 24px+ hit area with the label clickable | 20-24px visual, 44px row |

## Input types and keyboards

| Field | Attributes |
|---|---|
| Email | `type="email" autocomplete="email" spellcheck="false" autocapitalize="off"` |
| Password (new) | `type="password" autocomplete="new-password"` + show/hide toggle |
| Password (login) | `autocomplete="current-password"` |
| One-time code | `inputmode="numeric" autocomplete="one-time-code" pattern="\d*"` |
| Phone | `type="tel" autocomplete="tel"` |
| Name | `autocomplete="name"` (or `given-name` / `family-name`) |
| Address | `autocomplete="street-address"`, `postal-code`, `country-name` |
| Amount | `inputmode="decimal"`; format on blur, not while typing |
| URL | `type="url" autocomplete="url" spellcheck="false"` |
| Search | `type="search" enterkeyhint="search"` |

- Never block paste (passwords and codes included).
- Turn `spellcheck` off for codes, usernames, emails; leave it on for prose.
- Set `enterkeyhint` ("next", "done", "send") on mobile when it helps.
- Don't auto-advance between fields except split OTP inputs, and then support paste of the whole code.

## Validation timing

| Moment | What to check |
|---|---|
| While typing | Nothing that shows an error. Only positive hints (password strength meter, character count near the limit) |
| On blur, after the person typed something | Format errors for that field |
| On blur of an empty required field | Nothing yet |
| On submit | Everything, including empty required fields |
| After an error is shown | Re-validate on every keystroke so the error clears the moment it's fixed |

- Errors appear under the field, in the danger token plus an icon (never colour alone), with `aria-invalid="true"` and `aria-describedby` pointing to the message.
- Messages say how to fix it: "Enter a date like 14/03/2025", not "Invalid input".
- Don't validate what you can accept: trim spaces, accept phone numbers with spaces or dashes, accept lower-case postcodes, normalise on the server.

## Submit

- Enter submits single-line forms (use a real `<form>` with `onSubmit`; the button is `type="submit"`). In a textarea, Enter adds a line; Cmd/Ctrl+Enter submits.
- Keep the submit button enabled. On click, if anything is wrong: show all errors, focus the first invalid field (or a focusable error summary at the top for long forms, each item linking to its field).
- While the request is in flight: button in its loading state (`interaction/states`), repeat submits ignored, fields stay editable unless editing would conflict.
- Send an idempotency key with payment and create requests so a retry after a timeout doesn't double-charge or double-create.
- On server error: keep every value, show the error near the button (and inline when it's about a field), offer retry.
- On success: show the result (navigate, the item appears, the panel closes) or an inline "Saved" with a check for 2s. Don't reset a form the person may want to adjust.
- With IME input (Chinese, Japanese, Korean), Enter confirms composition: never submit on Enter while `event.isComposing` is true.

## Autosave and settings

- Toggles and selects in settings save immediately and show a quiet "Saved" near the control or in the header for 1.5-2s. No toast per change.
- Text settings save on blur or after ~800ms of no typing, with a visible state ("Saving...", "Saved", "Couldn't save. Retry").
- Leaving with unsaved changes: warn (`beforeunload` for the page, a confirm for in-app navigation and closing sheets).

## Choosing controls

| Choice | Control |
|---|---|
| On/off that applies immediately | Switch |
| On/off submitted with the form, or agreement | Checkbox |
| One of 2-5 visible options | Radio group or segmented control |
| One of 6-15 | Select |
| One of many, or searchable | Combobox (React Aria, shadcn Command) |
| Several of many | Checkbox list or multi-select combobox with chips |
| Date | Date picker that also accepts typing (React Aria DatePicker) |
| Number with a small range | Stepper or slider with the value visible and editable |

Never build these from `<div>`s: `components_find` for a primitive.

## Feel details

- Focus the first field on open only when the form is the point of the screen (sign-in, a dialog's form). Don't steal focus on content pages or on mobile, where it pops the keyboard.
- Show/hide on password fields: an icon button inside the field, `aria-label` that changes ("Show password" / "Hide password"), keeps cursor position.
- Character counters appear near the limit (at ~80%), not from the first keystroke.
- Long forms: save progress, show steps ("Step 2 of 4") only when there really are steps; never a progress bar for one page.
- Autofill styling: tame the browser's yellow with `input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px var(--surface) inset; -webkit-text-fill-color: var(--ink); }` so autofilled fields match the theme.
- Checkbox and radio labels are clickable over their whole row.
- `accent-color: var(--accent)` themes native checkboxes, radios and range inputs cheaply when you keep them native.

## Slop tells

| Tell | Fix |
|---|---|
| Labels missing, placeholders as labels | Visible label above each field |
| Red errors under every field on page load | Validate on blur/submit only |
| Submit greyed out until valid | Enabled; on submit, show and focus errors |
| "Invalid input" | Say the expected format |
| Error clears the field | Keep the value, highlight it |
| 12px inputs on mobile | 16px font, 44px height |
| Every field in a 2-column grid | One column; pair only short related fields |
| Paste blocked on confirm email / password | Allow paste; better, drop the confirm field |
| Success toast and the form resets | Show the result; keep values when it makes sense |

## Checklist

- [ ] Every field has a visible, connected label; helper text linked via `aria-describedby`.
- [ ] Types, `inputmode` and `autocomplete` set; paste works everywhere.
- [ ] Inputs 16px+ on touch; heights 44px+ on touch.
- [ ] No error before the person leaves a field they typed in; errors clear as soon as fixed.
- [ ] Enter submits; submit is enabled; failed submit focuses the first error.
- [ ] Loading state on submit, double-submit ignored, values kept on failure.
- [ ] Unsaved changes are protected on leave.

## Sources

UI UX Pro Max (MIT): inline validation timing, no premature validation, error summary and focus, allow paste, IME composition, keyboard types. Impeccable (Apache-2.0), *harden*: validation, preserving input, double-submit, i18n expansion. Emil Kowalski, *emil-design-eng* (MIT): good defaults over options. Vercel Web Interface Guidelines (paraphrased): keep submit enabled, Enter behaviour, autocomplete and spellcheck, 16px inputs on mobile, idempotency on retries, warn on unsaved changes.

# Landing: pricing, the close and honest conversion

Pricing is where the visitor decides, so it is the most honest section on the page. Every number is real, every period is stated, the recommended plan is chosen for the buyer the page targets, and the next step after the button is obvious. Conversion comes from clarity and removed doubt, never from pressure.

## Choose the layout

| Situation | Layout |
|---|---|
| Subscription with 3 tiers | **Three cards** side by side, the plan for the page's target buyer marked |
| Free + paid, or two fixed service prices | **Two cards** beside a column that says what every plan includes, once |
| One price | **Single offer**: the price, what's included, the button, the guarantee. No fake tiers to anchor. |
| Usage-based (API, storage, messages) | **Calculator or rate table**: unit price, free allowance, a worked example ("10,000 calls ≈ $12/mo") |
| Enterprise only | **Contact sales** with what the process is and how fast you reply |
| Physical products | **Prices "from" on product cards** or a table. Never a plan table or monthly switch for things that are not subscriptions. |
| Plans differ by many features | Cards for the top-level choice, then a **comparison table** below |

## The plan card

- **Contents, in order:** plan name; who it is for in one line ("For teams of 15 to 50"); the price with its period ("$59 / month"); the billing line ("Billed yearly at $708" or "Billed monthly"); one full-width button; 5 to 7 lines of what it includes, the first line "Everything in Team, plus:" for higher tiers.
- **Alignment:** cards share rows (CSS subgrid or fixed row tracks) so names, prices, buttons and first feature lines align across cards. Buttons sit on one line.
- **Emphasis:** the recommended plan gets the filled button and one word ("Recommended" or "Most teams choose this"), never a different card colour, a glow, a 1.1x scale or negative margins. Other plans get the quiet button.
- **Numbers:** tabular figures; currency symbol smaller or same size, never larger than the digits; uneven real prices (49, not "49.99" games unless that is the real price).
- **Price changes on the period switch** keep the card height fixed; the yearly saving shown equals what the arithmetic says ("Save 20%" only if 12 x monthly - yearly is 20%).

```tsx
<div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1" style={{ gridTemplateRows: "repeat(6, auto)" }}>
  {plans.map(p => (
    <article key={p.id} className="row-span-6 grid grid-rows-subgrid rounded-xl border border-line p-8">
      <h3 className="text-lg font-medium">{p.name}</h3>
      <p className="text-ink-2">{p.for}</p>
      <p className="text-5xl tabular-nums tracking-tight">{price(p, period)}<span className="text-base text-ink-2"> / month</span></p>
      <p className="text-sm text-ink-2">{billingLine(p, period)}</p>
      <a className={p.recommended ? "btn btn-primary w-full" : "btn btn-quiet w-full"} href={p.href}>{p.cta}</a>
      <ul className="space-y-2">{p.lines.map(l => <li key={l}>{l}</li>)}</ul>
    </article>
  ))}
</div>
```

## The period switch

- Two options as a segmented control (radio group with `role="radiogroup"` or two `aria-pressed` buttons), labelled "Monthly" and "Yearly", the saving stated on the yearly option as a percentage that matches the prices.
- The default is the period most buyers choose; if you default to yearly, the card says "billed yearly" next to the monthly-equivalent price.
- Every price stores both values (`data-monthly`, `data-yearly`); nothing reflows when switching.

## The comparison table

- Feature names on the left (sentence case, 4 columns of 12), plans as columns. A header row with each plan's name, price and button; the recommended plan's button filled.
- Group rows under small group headings ("Scheduling", "Payroll", "Security").
- Cells: a check with visually hidden "Included", a muted dash with hidden "Not included", or a short value ("5 seats", "30 days"). Never a red cross.
- Rows 44 to 48px, closed by 1px rules; horizontal rules only; no outer border.
- On phones: each plan as its own block of rows, or a plan picker that shows one column at a time. Never a sideways-scrolling table without a pinned feature column.
- Make the plan header sticky only within the table's own scroll on long tables; no page-level sticky bars stacking.

## Around the pricing

- **The FAQ follows pricing** and answers the money questions in plain words: What happens after the trial? Can I change plans? How do refunds work? Do you charge per seat? What counts as a seat? How do I cancel?
- **One real quote beside or under the pricing** from a customer on the plan most people buy.
- **Guarantees** only if real: "30-day refund, no questions" stated once near the buttons.
- **Taxes and currency:** say whether prices include VAT/sales tax; show the local currency when you can, never a currency the business cannot charge.
- **Enterprise:** a short row under the cards ("Over 200 staff? Talk to sales") with what changes (SSO, invoicing, SLA), not a fourth empty card that says "Custom".

## Forms that convert

| Form | Fields | After submit |
|---|---|---|
| Waitlist | Email only | "You're on the list. We'll email you when [product] opens to your team." |
| Newsletter | Email only, once, in or above the footer | Confirm what they will get and how often |
| Demo / contact sales | Name, work email, company, team size (select), optional message | When you will reply and who will reply, in the button's words |
| Booking | Date, time, party size or service, name, email or phone | A summary of the booking and how to change it |
| Trial sign-up | Email (+ password or SSO buttons) | Straight into the product, not a "check your email" wall unless verification is required |

Field rules (full detail in `drip_guide app/tables-forms`):
- Visible label above every field; placeholder only shows a format.
- One column; group name fields; the input width hints at the expected length.
- `type`, `inputmode` and `autocomplete` set on every field; paste never blocked; 16px text on phones.
- Validate on blur after the field was touched; errors under the field say what to type ("Enter your work email, like ana@company.com").
- Submit stays enabled until clicked; it shows a pending state while sending and never double-submits.
- Success replaces the form with the result. No success without a real send.
- No newsletter consent pre-ticked; no "I agree" buried in grey 10px text.

## The close

- The main action once more, word for word, after the last calm section. One button, large: 56 to 72px tall on desktop, full width on phones.
- One line of doubt removal beside it (trial length, no card, cancel anytime) if true.
- Never a second, different action here; never "Still not sure?" guilt copy.

## Conversion checklist

- [ ] The price, period, what's included and what happens next are visible without clicking.
- [ ] The recommended plan is marked by its button and one word, not by colour or size.
- [ ] Monthly/yearly figures add up; the saving shown is the real saving.
- [ ] Buttons align across cards; the card heights do not jump on the switch.
- [ ] The comparison table works at 390 without sideways scroll.
- [ ] Every form asks only for what the next step needs; errors and success are written, not stock.
- [ ] Cancelling is described in the FAQ in one sentence.

## Dark patterns: never ship

| Pattern | Why it fails | Honest version |
|---|---|---|
| Fake urgency: resetting countdowns, "offer ends tonight" every night | Erodes trust the moment it is noticed; illegal in some markets | A real deadline with its date, or none |
| Fake scarcity: "Only 2 seats left" with no inventory behind it | Same | Show stock only from a real source |
| Confirmshaming: "No thanks, I like wasting time" | Insults the visitor | "No thanks" |
| Pre-checked add-ons or consent | Illegal under GDPR for consent; feels like a trick | Unchecked by default |
| Drip pricing: fees revealed at checkout | Cart abandonment and chargebacks | Total price up front |
| Roach motel: easy sign-up, cancel by phone | Regulators increasingly require click-to-cancel | Cancel in settings, stated on the pricing page |
| Disguised ads or fake reviews | Deceptive | Real, sourced reviews only |
| Monthly price shown for a yearly-only plan without saying so | Bait | "$16/mo billed yearly ($192)" |
| Trick questions: double negatives in consent | Deceptive | One plain sentence, one checkbox |
| Nagging: newsletter modal on load, exit-intent, sticky chat bubble | Interrupts the job the visitor came to do | One field in the footer |

## Sources

Rewritten from: Taste Skill (MIT) pricing-three, pricing-two, comparison-table, FAQ and close recipes; Hallmark (MIT) pricing emphasis and field rules; UI UX Pro Max (MIT) pricing and conversion pattern notes and form guidelines. The dark-pattern list follows the commonly documented taxonomy (Brignull's deceptive.design).

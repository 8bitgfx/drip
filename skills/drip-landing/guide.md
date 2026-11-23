# Landing pages

A good landing page reads like the company knows exactly what it sells. In five seconds a stranger can say what it is, who it is for and what to do next. Every screen shows the real thing: the product's own interface, photographs of the place or the object, the work. The page has one system (one container, one grid, one button pair, one card style) and one voice, and it spends its boldness in one or two places: the hero and a signature moment. It does not look like a template, and it does not look like an art piece that forgot to sell. The bar is the homepage a good company would ship this year: Linear, Figma, Stripe, Vercel for software; Aesop, Teenage Engineering, a well-run independent hotel for everything else.

## The procedure

1. **Brief in four lines.** What is sold, who buys it, the one main action (the transaction: Start free trial, Book a table, Order, Join the waitlist), and the real material you have: logo, screens, photographs, prices, quotes, address. Missing material is listed, never invented. If there is no Drip task, call `drip_start`.
2. **Name the visitor's job** from the anatomy table below. It decides where the action lives, which sections the category expects and how the page ends.
3. **References.** `refs_search` with the category and two adjacent ones ("payroll app", "fintech landing", "hr software"), `refs_feed` for recent landing pages, then `refs_view` on 8 to 15 shots. Write one line per shot naming what it does (hero type, section order, how proof is shown, where the product appears), never "clean".
4. **Board and direction.** `board_create`, `board_add` with a specific note per item, `board_directions` for 2 to 3 named directions. Present them; let the user pick or pick with a reason.
5. **Write all the copy** before any markup: h1, sub-line, every h2, every button, the FAQ, the form's labels, errors and success line. `drip_guide copy` for the voice. Mark every fact you assumed.
6. **Plan the page in screens.** One line per section: id, its one idea, its picture and the kind of picture, its height (one or two viewports at 1440x900), where the signature moment lives. Check the plan against the rhythm rules below before you build.
7. **System.** `fonts_pair`, `palette_generate`, `palette_check`; write the tokens. `drip_guide type`, `drip_guide color` for depth.
8. **Assets.** Product UI first (`drip_guide productshots`), photographs second (`images_search`, `images_save`, one grade across the set), generated art only when the brief calls for it (`gen_image`). Icons from one family (`icons_search`).
9. **Build.** Start from proven primitives (`components_find`, `components_get`) restyled to the tokens. Hero first, then sections in order, then the close and footer.
10. **Fit check.** `fitcheck_shot` at 1440, 1024, 768, 390 and 320; `fitcheck_compare` against the chosen direction; `fitcheck_lint`; fix the largest visible fault first; finish with `fitcheck_done`.

## The craft

### Anatomy by the visitor's job

The category's own sections beat a generic feature list. Pick the row, then plan.

| Job | Main action | Hero shows | Category's own sections | Ends with |
|---|---|---|---|---|
| Sign up (SaaS, API, dev tool) | Start free / install command | The product at work, real UI | Named product moments, integrations, code sample, pricing with period switch, FAQ | The action again beside one last screen |
| Try (app, game) | Store or download buttons per platform | Key art, trailer or main screen | Features as named moments in screens, platforms | Download again |
| Buy (physical product) | Price and options, add to cart | The product big, whole | Range, in use, close-ups of parts, how it is made, delivery and guarantee, specs | The offer again |
| Book (restaurant, class, clinic) | Date/time picker or next free slots | The room or the food | Menu or timetable with prices, how to find it, hours | Hours, address, booking |
| Visit (shop, gallery, venue) | Today's hours and address | What is on now | What's coming as dated rows, getting there | Visit info, address |
| Attend (event, conference) | Tickets | Date and place as headline | Lineup, schedule, ticket tiers, venue, FAQ | Tickets again |
| Hire (studio, freelancer, firm) | Plain contact | The work | Project index with pictures, one case opened, what they do | Contact details |
| Subscribe (newsletter, podcast) | Email field | Name, one line, field | Sample issue, who writes it, archive | A second field or the archive |

### Plan in screens

- **The hero is alone on the first screen** at 1440x900 and at 390x844. Nothing of the next section's heading shows.
- **Each section holds one idea** and fills one viewport, or two on purpose. Content under about 55% of a screen merges into the section above (a quote, a logo row, a short FAQ) as its last element, with no heading of its own.
- **Rhythm:** a calmer section (quote, pricing, FAQ) after at most two visual ones; one contrasting band (a dark or brand-colour section) in the second half holding the strongest picture; the last third calms down before the close.
- **Separate sections by a ground change or space,** never hairlines or shadows between them.
- **Never** a strip section (a 120px band of logos or stats alone), a section half empty, or two sections built around the same picture.

Do: hero, app frame, three-feature bento, one quote merged into it, pricing, FAQ, close. Don't: hero, logo band, features, stats band, testimonials carousel, features again, CTA band, newsletter band, footer.

### Pictures are the work

| Page kind | Leads with | Never |
|---|---|---|
| Software | Its own UI as live HTML or crisp captures: one app window big, fragments on cards | Generic dashboards, stock people at laptops, abstract 3D |
| Physical product | Photographs: the product big and whole in the hero and at most two more sections; use, parts, people elsewhere | One render in every section, a mid-size product in a grey rounded panel |
| Place (cafe, hotel, shop) | 12 to 20 real photographs on a full page, the place in daylight in the hero | Mood shots, scenery that is not theirs, words on photographs |
| Service (studio, clinic, firm) | The work, the team at work, the rooms | Stock handshakes, invented client logos |
| Game | Key art, the world, the trailer; the name in the h1 | An abstract effect in place of the world |

- **Show every promise.** A headline that says "carries four crates" needs a picture with four crates in it, or the promise goes.
- **One object never carries the page.** The product whole appears in the hero and at most two more sections; its use, details, people and a diagram carry the rest.
- **No captions under pictures.** A heading names the set; credits go in one footer line.
- **Licensed stand-ins are labelled in your report, never on the page.** Use `images_search` and `images_save` so the licence is logged.

### The signature moment

Every page earns one thing a visitor would describe an hour later; two on a long page (eight sections or more), in different sections, never three. It lives in its own section and moves only there.

| Kind | Fits |
|---|---|
| Product demo that plays once in view (cursor does one satisfying thing) | Software |
| Statement whose words light up as it scrolls through | Any; strongest with 12 to 40 plain words from the brief |
| Photo chapters: full-width photographs, one short chapter at a time, pinned in its own section | Place, product, service |
| A type moment: the address, the name or one figure set at 100px+ | Place, service |
| A picture that develops (grain to sharp) as it enters | Product, place |
| One shader or 3D scene | Tech only, never a cafe or a law firm |

Do: one moment, built with care, with a still poster under reduced motion. Don't: parallax on text, scroll-jacking, a fade on every section, three competing effects.

### Copy hierarchy

- **h1:** the category plus the buyer or place, 2 to 8 words, at most three lines at every width. "Payroll for restaurant teams." Not "Every shift, sorted."
- **Sub-line:** how it works and the main benefit, 15 to 30 words. A place: what, where, today's hours.
- **h2s name a thing** ("Pricing", "Works with your tools") or make a short plain claim ("Pays staff the same day"). No questions as headings outside the FAQ, no colon headings, at most one two-fragment heading ("Fast. Simple.") per page.
- **Card titles** are a verb and an object ("Matches bank payments"), one line.
- **Buttons** are a verb plus what you get, 1 to 5 words: Start free trial, Book a table, See pricing. Never Learn more, Discover, Explore, Click here.
- **Words per screen** stay low: 40 to 80 outside UI mocks. Cut the second sentence before you shrink the type.
- **No eyebrows by default.** A small uppercase label over every heading is the most common template tell. Use one only where it carries information (a date, a category).

### Grid, edges and type

| Token | Desktop 1440 | Tablet 768 | Phone 390 |
|---|---|---|---|
| Container | min(100% - 160px, 1280px) | 100% - 96px | 100% - 48px |
| Columns / gutter | 12 / 24px | 8 / 24px | 4 / 16px |
| Section padding (top/bottom) | 120-160 / 96-120 | 96 / 80 | 72-96 / 56-72 |
| h1 | 56-80px, tracking -2% to -4% | 44-56px | 36-44px |
| h2 | 40-48px | 32-40px | 28-32px |
| Lead / card title | 20px | 18-20px | 18px |
| Body | 16-18px, line-height 1.5-1.6 | 16-18px | 16px |
| Measure | 45-65ch | 45-65ch | full column |

- **Two text lines only:** the left line and one split line (column 6, 7 or 8). Every split on the page uses the same pair. Text on the left, picture on the right, top-aligned, never alternating left/right down the page.
- **Display weight comes from size and tight tracking,** not 800 weight. Display at 400 to 600; body 400 and 500.
- **Each heading level at least 1.25 times the next.** Nothing under 13px. `drip_guide type` for pairing and scale.
- **One button pair** (filled primary, quiet secondary), one card style, one radius scale, one link style across the page.
- **Two boxes deep at most:** a card holds a panel, a panel holds UI. Never a card in a card in a card.

### Conversion basics

- **One primary action, repeated with identical words** in the nav, the hero, the close and a phone action bar that appears once the hero's button has scrolled away. A second action is quieter (outline or text) and goes somewhere different.
- **Remove the doubt at the button.** One small line under it: "Free for 14 days. No card needed." Only if true.
- **Proof sits next to the decision:** a named quote beside pricing, a customer result beside the feature it proves.
- **Answer objections in the FAQ** in the buyer's words: price, data, cancelling, setup time, formats.
- **Short forms.** Ask only what you need to deliver the next step. Email-only for a waitlist.
- **Every link lands.** Nav words go to sections that exist; no `#`, no "coming soon" unless the brief says so.

### No dark patterns

| Pattern | Do instead |
|---|---|
| Countdown that resets, "Only 3 left" without stock data | A real deadline as text with its date, or nothing |
| Pre-ticked marketing consent | Unticked, plainly worded |
| "No thanks, I hate saving money" | "No thanks" |
| Price revealed only at checkout, hidden fees | The full price, period and what's included on the page |
| Yearly plan shown as a monthly price without saying it bills yearly | "$16/mo, billed $192 yearly" |
| Cancel by phone only | Cancel in settings, said in the FAQ |
| Fake live counters ("1,204 people viewing") | Real, dated figures or none |
| Newsletter modal on load, chat bubble, exit-intent popup | One newsletter field in or above the footer |

### Motion

- **Hero entrance once on load:** words then picture, 400 to 800ms total, 60 to 80ms stagger, `ease-out`. Never hides words for more than a beat.
- **Hover layer everywhere it is interactive:** buttons step one colour shade and press 1px or `scale(0.98)`; linked cards lift 2px; linked photographs zoom 1.02 to 1.03 inside their frame; underlines draw. Gate hover in `@media (hover: hover)`.
- **Card loops** (a fragment that replays its action) cycle in 2.5 to 4s, one per card group, pause off screen.
- **Anything moving longer than 5s gets a pause control.** Under `prefers-reduced-motion` everything shows its final state.
- `drip_guide motion` for curves and choreography.

### Responsive

- **Plan screens again at 768 and 390.** Splits stack text first, picture second. Rows never leave half-empty lines. Nothing scrolls sideways at 320.
- **Hero on a phone:** text first; buttons full width when they don't fit one line; the first screen ends on a whole element or a deliberate bleed, never a card sliced by the fold.
- **Tap targets 44px** for every link and control outside running text, 8px apart.
- **Full-screen menu on a phone,** with the main action in it. `drip_guide mobile` for the platform layer.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Violet-to-blue gradient hero, gradient text h1 | The brand's own palette; one accent on the action; solid ink headline |
| Centred h1 + sub-line + two buttons over a floating dashboard with air on four sides | A dealt hero type (see `landing/heroes`); the product cropped by its frame, bleeding off an edge |
| Three equal cards, each an icon in a tinted square + title + two lines | A bento with one lead tile, or a split with the real UI; icons only from one family, no tinted squares |
| "Trusted by" row of grey wordmarks, or a logo marquee | Real customer logos with permission, still, in their own colours, or nothing |
| Stat strip: "10x faster · 99.9% uptime · 10k+ teams" | Each real number inside the sentence it proves, with its unit and source |
| Eyebrow label over every section | Delete it; the heading names the section |
| Testimonials carousel with stock faces and perfect three-sentence stories | One real, named quote with a face, merged into the section it supports |
| 01 / 02 / 03 numbering on features that are not steps | Numbers only for a real sequence |
| Glass cards and glow on a dark page | Depth from a lighter surface step; one soft neutral shadow |
| Sparkles, wands and purple for "AI" | Show what the AI does, in the product's UI |
| Every section fades up on scroll | Content visible on load; motion reserved for the hero and the signature moment |
| "Unlock", "seamless", "supercharge", "elevate", "Ready to transform your X?" | The plain fact the adjective stood in for |
| Footer pun or sign-off ("Made with love in Lisbon") | The legal row: name, year, Privacy, Terms, credits |
| Emoji as icons or bullets | One icon family, or no icons |

## Done when

- [ ] The first screen at 1440 and 390 says what is sold, for whom, with one hard fact, and both actions are above the fold.
- [ ] The hero picture is the product, place or work; nothing of the next section shows in the first screen.
- [ ] Every section has one h2, one idea and a real picture; no two picture-less sections touch; no card layout repeats back to back.
- [ ] Software pages show the real UI big once; product pages show the product whole in at most three sections.
- [ ] The main action reads the same in nav, hero and close; one filled button per screen; no "Learn more".
- [ ] Every proof element is real and attributable; nothing is invented; assumed facts are listed in your report.
- [ ] Left edges line up down the page at every width; nothing scrolls sideways at 320.
- [ ] Hero entrance runs once; one or two signature moments; reduced motion shows final states.
- [ ] Tap targets are 44px on phones; headings step one level at a time; contrast passes (`palette_check`).
- [ ] `fitcheck_lint` is clean and `fitcheck_done` returns its verdict.

## Reference guides

- `landing/heroes` — hero types, which to pick from the material you have, hero copy and the fold.
- `landing/sections` — every section type below the hero, with good and bad versions.
- `landing/pricing` — pricing layouts, comparison tables, the close, forms and honest conversion.

## Sources

Adapted and rewritten from: Taste Skill / design-taste-frontend (MIT): one section per screen, equal edges, real photographs and real product UI, the hero types, copy rules, the finish gate. Impeccable (Apache-2.0): the Persuade surface mode, "prove, don't claim", the first viewport as a thesis. Hallmark (MIT): page anatomy by the visitor's job, how pages end. UI UX Pro Max (MIT): landing pattern data and conversion notes. Stageshow (MIT): product UI framing for heroes.

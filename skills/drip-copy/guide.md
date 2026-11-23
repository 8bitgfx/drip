# Copy

Good interface copy is used, not read. A stranger knows in five seconds what the product is, who it is for and what to do next. Headlines name the thing in the product's own nouns, buttons say what will happen, errors say how to recover, and every sentence is one you could say out loud to a customer without wincing. Nothing is invented, nothing is said twice, and nothing on the screen narrates itself. Read only the headings and the buttons: if they tell the story, the rest is the right length.

## The procedure

1. **Build a fact sheet** before writing a word. From the brief, the code and the user: what the product does (verbs), who uses it, the one main action, real numbers (prices, counts, times, dates), real names (features, plans, places), what makes it different, real proof (quotes, customers) if any. Anything not on the sheet does not go on the page.
2. **Pick the voice** (below) and write it as a three-line voice card in `DESIGN.md`. The voice holds across the product; the tone shifts with the moment (calm in errors, plain in pricing).
3. **Pick the mode.** Selling (landing, pricing): one idea per screen, short. Operating (app UI): labels and states, almost no prose. Reading (docs, articles): full sentences, clear structure.
4. **Write headings and buttons first.** They carry the page. Draft the h1, every section heading and every button label as a list; read the list alone.
5. **Then the rest:** subheads, body, microcopy (`copy/microcopy`), empty and error states for every screen you touched.
6. **Cut.** Delete is the default fix. Remove every sentence that repeats a heading, narrates the UI or could sit on another product's page.
7. **De-slop.** Run `fitcheck_lint`, then read every string against the tells list below and `copy/slop-rewrites`.
8. **Read it aloud** in the `fitcheck_shot` screenshot, at phone width too. Where you stumble, shorten. Where nothing new is said, cut.

## The craft

### 1. Voice

Choose one register per product and keep it. Write the voice card as three lines: how it sounds, what it never does, one sample line.

| Register | Sounds like | Fits | Sample |
|---|---|---|---|
| Plain expert | Short, exact, confident, no adjectives | Dev tools, finance, B2B | "Deploys in 40 seconds. Rolls back in one click." |
| Warm neighbour | First person plural, concrete, local | Cafes, shops, small services | "We open at 7, and the rye is out of the oven by 8." |
| Precise editorial | Full sentences, measured, specific nouns | Agencies, studios, culture | "We design type and identity for publishers." |
| Playful | Short, a light joke in microcopy only | Consumer apps, games | Empty state: "Nothing here. Suspiciously tidy." |

- **Do:** the same register in the hero, the error and the footer.
- **Don't:** the default model voice everywhere: warm, wry, modest, a little literary, for every client.

### 2. Headlines

The h1 names the category and the buyer or the place, in 2 to 8 words.

| Form | Example | Use when |
|---|---|---|
| Category + buyer | "Payroll for restaurant teams" | Software, a new service |
| Category + place | "Bakery on Mill Street, Leith" | Any place |
| Category + a true surprise | "Tax returns in eleven questions" | The brief proves the twist |
| Category + scope | "Card payments for market stalls" | B2B, infrastructure |
| Name + genre | "Kelpmoor, a co-op sailing game" | Games, named products |

Three tests per line: can the reader picture it, could it be proven false, could only this business say it.

| Vague | Plain |
|---|---|
| "Every shift, sorted" | "Shift planning for restaurant teams" |
| "Where ideas take flight" | "Whiteboard for remote design teams" |
| "The future of finance is here" | "Business accounts with same-day transfers" |
| "Built different." | "Running shoes resoled by hand" |

- **Do:** the product's own nouns. **Don't:** a riddle, a mood, a slogan, a question, a two-fragment drumbeat.

### 3. Subhead

How it works and the one benefit, 12 to 25 words, one sentence or two short ones. It adds facts the headline lacks, never restates it.

- **Do:** "Forward an invoice by email. We read the total and the due date, and pay it on the day you pick."
- **Don't:** "The all-in-one platform that helps modern teams seamlessly manage their finances."

### 4. Section headings

Say what the visitor will see or get, 1 to 6 words, with a noun: "Rooms and prices", "Works with your tools", "Pays staff the same day". Never a category label ("Features", "Why us", "Our story"), never a bare command ("Get started"), never a question (FAQ entries aside).

### 5. Body

- One idea per sentence. Verbs over adjectives. Active voice: "The editor saves your changes", not "Your changes are saved".
- Paragraphs of two short sentences on marketing pages; card bodies 25 words or fewer.
- Selling pages: about 80 words per screen at most; the hero is a headline, one sentence and the actions.
- Spend words where the facts are; one section may run longer, one may be a single line. Perfect evenness reads as generated.

### 6. Buttons and links

| Rule | Do | Don't |
|---|---|---|
| Verb + object, 1-4 words | "Start free trial", "Send invite", "Export CSV" | "Submit", "OK", "Go" |
| Name the destination | "See pricing", "Read the API docs" | "Learn more", "Click here", "Read more" |
| Same label everywhere for one action | "Book a table" in nav, hero and footer | "Reserve", "Book now", "Get a table" for the same thing |
| Destructive names the object | "Delete project" | "Yes", "Confirm" |
| No arrow suffix | "See pricing" | "See pricing →" |
| One primary per screen | "Start free trial" + "See pricing" | Three filled buttons in a row |

### 7. Numbers

- Only real numbers, with units, in a sentence: "Deploys take 40 seconds on average", not a floating "40s".
- Odd true numbers beat round invented ones: 212 routes, 38% (from the user), never "10x faster", "99.9%", "10,000+ teams" unless the user gave them.
- Format: thousands separators (12,480), `tabular-nums` for figures that compare, a non-breaking space between number and unit (10 MB), locale-aware dates (`Intl.DateTimeFormat`).
- A row of three or four big numbers over one-word labels is a tell. Put each figure in the sentence it proves.

### 8. Proof

- Testimonials, logos, ratings and customer counts come only from the user, word for word, with name and role.
- None is fine. Facts, photos and the product carry a page without proof.
- If the code already holds a claim you cannot verify ("Trusted by 10,000+ teams"), do not delete or rewrite it: list it for the user to confirm.

### 9. Names and terms

- One name per thing. Pick "workspace" or "project" or "space", never all three.
- Use the user's words for their domain; define a term inline once if the audience may not know it.
- Keep a short glossary in `DESIGN.md` when a product has more than five named concepts.

### 10. Mechanics

| Item | Rule |
|---|---|
| Case | Sentence case for headings, buttons, labels, tabs, menus |
| Dashes | No em dashes in UI copy; use a full stop, a comma or a colon. En dash only in ranges (9–5, Jan–Mar) |
| Colons | For labels ("Status: Active") and lists, not to join two clauses ("Fast deploys: your code goes live") |
| Quotes and ellipsis | Curly quotes “ ” ‘ ’, real ellipsis …, true apostrophe ’ |
| Exclamation marks | None in UI. One in a celebration the user caused, at most |
| Full stops | On sentences; none on labels, buttons, list items or headings |
| Ampersand | Only in names; write "and" |
| Contractions | Yes ("you'll", "can't"), in every register but the most formal |

## The AI copy tells

One tell proves little. Clusters and repetition are the signal. Full before/after table: `copy/slop-rewrites`.

| Tell | Example | Fix |
|---|---|---|
| Eyebrow label | "FEATURES" over "Everything you need" | Delete; the heading says what the section is |
| Decorative numbering | "01 //", "02 //" on three feature cards | Delete the numbers; keep them only for real steps |
| Subtitle reflex | A subtitle under every heading | Keep only subtitles that add a fact |
| Reassurance footnote | "No credit card required" under every button | Once, near the signup, only if true |
| Botsplaining | "Click the button below to get started" | Delete |
| Leaked design notes | "(updates in real time)", "(powered by AI)" | Delete, or say it once next to the control it explains |
| Staccato slogan | "Fast. Simple. Powerful." | One sentence that names the thing |
| Ban words | unlock, seamless, elevate, empower, supercharge, robust | The fact the word stands for |
| Stock lines | "In today's fast-paced world", "Say goodbye to", "Whether you're X or Y" | Delete; start with the product |
| Contrast frame | "It's not just a tool, it's a partner" | State the positive fact alone |
| Rule of three | "Fast, simple and secure" | As many items as there really are |
| Fake stats | "10x faster", "99.9% uptime", "10,000+ users" | The user's figure with a source, or nothing |
| Invented specifics | "Batch No. 047", "6:12 a.m. from Room 9" | Only details from the brief |
| Default cast | Sarah Chen, Priya, Acme, Northwind, Lumen | Real names from the user, or none |
| Status strings | "Live · Synced · v2.4 · Updated just now" | The one fact the user acts on |
| Decorative badges | "NEW", "AI", "Beta", "🔥 Popular" fixed in markup | Only when rendered from real state |
| Status dots | Pulsing green dot before "All systems operational" | Only bound to a real live status, with `role="status"` |
| Arrow suffix | "Learn more →" | Name the destination, drop the arrow |
| Generic CTA | "Get started", "Learn more", "Submit" | Verb + object |
| Virtue words | honest, thoughtful, genuinely, simply, truly | Show it with a fact or an admission |
| Process talk | "Below you'll find", "This section shows" | Delete; the page never talks about itself |
| Puffery verbs | "serves as", "boasts", "stands as" | "is", "has" |
| -ing riders | "…, ensuring a smooth experience" | Delete the rider |
| Em dashes everywhere | "Fast — and reliable — always" | Full stops and commas |
| Title Case Everywhere | "Start Your Free Trial Today" | Sentence case |
| Exclamation marks | "You're all set!" | "You're all set." |
| Residue | "[Company Name]", lorem ipsum, `{{name}}`, "Certainly!" | Real words, or remove the element |

### Over-correction

Rules breed their own habits. Watch for these after a de-slop pass:

| Rule applied | Habit it breeds | Counter |
|---|---|---|
| No em dashes | Every sentence chopped into fragments | Commas, colons and one longer sentence where natural |
| No "not X but Y" | "rather than", "instead of", "without the" | Count them together; state the positive |
| No hype words | Calm words as hype: quietly, steady, honest | A fact in place of any adjective |
| No threes | Everything in pairs | List as many as exist |
| Be specific | Invented numbers and anecdotes | The fact sheet, or a plainer line |
| Add personality | A joke in every section | Humour only in microcopy, once or twice |

### Not tells (leave alone)

Plain "is" and "has". A list of three when there are three things. One true "No card needed" near the signup. A narrow superlative the user can prove. Copy the user wrote themselves. Persuasion on a sales page, as long as it stands on facts.

## Done when

- [ ] The h1 names the product category and the buyer or place; it fails the swap test with a competitor.
- [ ] Headings and buttons read alone tell the page's story.
- [ ] Every button is a verb + object; no "Submit", "Learn more", "Click here"; no arrow suffixes.
- [ ] No eyebrows, no decorative numbering, no subtitle under every heading.
- [ ] No ban words, stock lines, em dashes or exclamation marks in UI copy (`fitcheck_lint` clean).
- [ ] Every number, quote, logo and customer count comes from the user; unverifiable claims are listed for them.
- [ ] Badges and status dots render from real state, or are gone.
- [ ] Every error says what happened and what to do; every empty state names the state and one action.
- [ ] One name per concept across nav, headings, buttons and messages.
- [ ] Sentence case everywhere; curly quotes and real ellipses.

## Reference files

- `drip_guide copy/slop-rewrites`: before/after rewrites for every common AI copy tell, by place on the page.
- `drip_guide copy/microcopy`: buttons, forms, errors, empty, loading, success, confirmations, toasts, notifications, numbers and dates.

Related guides: `drip_guide type` (measure and heading size), `drip_guide a11y` (labels, names, announcements), `drip_guide landing` (section order), `drip_guide fitcheck` (the copy score).

## Sources

Ideas adapted and rewritten from: unslop-ui (MIT), including its writing rules from Lauren Tan's unslop skill in pstack (MIT): eyebrows, numbering, subtitle reflex, botsplaining, status strings, badges, arrows, generic links, the cut-first rule; Taste Skill (MIT) copy, copy-tells and copy-moves references (category-first headlines, the plain-versions table, second-generation tells, over-correction, what is not a tell); Hallmark (MIT) craft and gates (the swap test, the three tests per line, copy budget, punctuation); Impeccable (Apache-2.0) clarify reference (message hierarchy, actionable errors, empty-state kinds).

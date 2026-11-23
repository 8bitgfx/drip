# Logo concepts: cheap divergence, expensive builds

A concept is an idea, not a drawing. The cheapest moment to be bold is a sentence; the most expensive is a
polished SVG of the wrong idea. So write many sentences, from several minds that don't share context, cut hard,
and only then draw.

## The concept sentence

One sentence: **what the mark shows + why that is this brand and no other.**

| Weak (describes a category) | Strong (describes one brand) |
|---|---|
| "A modern abstract shape suggesting growth" | "The O of Orbit drawn as the single elliptical path the company's satellite flies" |
| "A paint drop for a design tool" | "Paint that won't stay inside the selection box: a frame whose fill spills over one edge" |
| "A friendly bear mascot for a kids' app" | "A bear whose ears are the two speech bubbles of the app's chat" |
| "Elegant serif wordmark" | "A wordmark whose R borrows the bookplate flourish of the founder's 1920s press" |

Tests for every sentence:
1. **Competitor swap.** Put a competitor's name in it. Still true? It's not a concept.
2. **Literalness.** Is it the dictionary picture of the name or category? Push it two steps or drop it.
3. **Style-free.** Does it still make sense with every style word removed ("flat", "minimal", "bold")? If the
   sentence is only style, it isn't an idea. Styling one literal pun twice is one concept, not two.
4. **Drawable in black.** Could it work as a solid silhouette? Ideas that need colour or gradients to read fail.

## Mark types (explore at least 2)

| Type | What it is | Good concept sources |
|---|---|---|
| Wordmark | The name, customised type | A letter that can carry the idea; the name's sound or rhythm; a ligature |
| Lettermark / monogram | 1-3 initials as a unit | Shared strokes between letters; negative space between them |
| Letterform symbol | One letter turned into a symbol | The first letter's structure meeting the product's behaviour |
| Pictorial | A recognisable object, simplified | Only when the object is unexpected for the category |
| Abstract | A form with no literal reading | A behaviour of the product (rotation, fold, split, stack) |
| Combination | Symbol + wordmark sharing DNA | Derive the symbol from a letter of the wordmark |
| Emblem | Mark and name inside one container | Heritage, sport, games, craft; needs a reduced form |
| Mascot | A character | Kids, games, community; must work as a head-only icon |

Spread the 8-12 concepts so no single type has more than half of them.

## Where ideas come from

Use 4-6 of these lenses per brief; each lens tends to give one or two concepts.

- **The name**: its letters, sound, etymology, a hidden word, the shape of its initial.
- **The product's behaviour**: what it does with its users' material (cuts, joins, sorts, grows, spills, locks).
- **The origin**: the place, the founder's trade, the first customer, the old name.
- **Tension**: two opposite attributes in one form (exact + warm; heavy + fast).
- **Negative space**: a second reading inside the first, only when both readings are good.
- **A subtle reference** to a world outside the category: signage, typewriters, maps, sports kit, printing.
- **The unexpected pairing**: the category crossed with a genre from another world (a law firm marked like a
  record label), with one line on why it beats the safe version.

## Parallel concept agents (divergence by construction)

Agents that share context converge. So split the work:

1. Write the brief block once: name and meaning, where it lives, competitors, avoid list, 3 attributes, what the
   audience gets too much of, the category clichés from `logo/cliches`, and the concept-sentence rules above.
2. Pick 3-4 **directions** that differ on the decision axis (what the mark leads with), e.g.
   A "the name's letters", B "the product's behaviour", C "the origin story", D "unexpected pairing".
3. Launch one Agent per direction **in a single message**, subagent type `general-purpose`, each with the brief
   block plus ONE direction. Each returns 3 concept sentences, a one-line risk per concept, and a rough black SVG
   per concept (256 viewBox, few nodes, no text elements) written to `brand/logo/concepts/<dir>-<n>.svg`.
4. Never show one agent another's output. Never let an agent "also try" other directions.
5. Merge: 9-12 concepts. Fold their SVGs into the concept module (one function per concept, see below).

Prompt shape for each agent (keep it short):
```
You are one of four identity designers working separately. Brief: <brief block>.
Your direction only: <direction + one line on what it leads with>.
Write 3 concepts. Each: one sentence (what it shows + why only this brand), one risk, and a rough black SVG
(viewBox 0 0 256 256, solid fills, ≤ 8 nodes per closed shape, no <text>, no filters, no gradients).
Organic shapes are one path, never primitives glued together. No clichés from this list: <list>.
Save to brand/logo/concepts/<dir>-<n>.svg and return the sentences and file paths.
```

## The concept module

From the first sketch, keep the concepts in code: `brand/logo/concepts.mjs` exports one function per concept,
each returning SVG markup, with shared helpers (grid constants, the outlined wordmark paths from `logo_outline`,
a `frame()` for the icon square). A tiny script writes every concept to `brand/logo/concepts/*.svg` and passes
the list to `logo_sheet`. Changing a concept is editing one function and rerendering; comparing two variants is
calling one function with two parameters. Hand-edited SVG files drift; code doesn't.

## Sheet format that decides fast

Per direction on the sheet: the wordmark or lockup on light, the same on dark, and the icon large and small.
`logo_sheet` already renders each concept large on light, on dark and tiny; for combination marks, pass the
lockup and the icon as two adjacent concepts with the same number prefix ("3a lockup", "3b icon"). Black only for
the first sheet: "colour triggers taste debates".

## Scoring and cutting (before the critic)

Score each concept 1-5 on five axes, then cut:

| Axis | 5 means |
|---|---|
| Idea | The sentence passes all four tests and is interesting |
| Distinction | Nothing in the category or peer set looks like it |
| Simplicity | Describable over the phone in one sentence; ≤ 3 elements |
| Relevance | Fits the brief's attributes and where it lives |
| Small-size strength | Still a clear silhouette at 32px on the sheet |

- Cut anything with a 1 or 2 on Idea or Small-size strength, whatever the total.
- Cut duplicates: two concepts with the same idea in different styles keep only the better one.
- Keep 8 for the sheet. The critic ranks those (`critic_prepare` kind `logo`).
- **Build the top 3 that differ most.** If the critic's top 3 are two variations of one idea, build the best of
  them plus the next distinct idea.
- For every cut concept that scored well, write one line: what it tested, why it lost, what would bring it back.
  Never graft a loser's feature onto the winner.

## Showing concepts

Show the user only after the critic ranked them, and only finalists, at equal fidelity (never a polished one
next to rough ones: polish decides instead of the idea). Format:
```
Logo finalists (greyscale): <sheet>
1. Spill: paint escaping the selection box. Critic 8/10. Risk: needs the frame to read at 16px.
2. Ligature: the D and p share one bowl. Critic 7/10. Risk: subtle at small sizes.
3. Press mark: ... Critic 6/10, "safe".
I'd go with Spill.
```
Then one AskUserQuestion with the finalists, your pick first.

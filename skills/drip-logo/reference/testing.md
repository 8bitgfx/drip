# Testing a logo

A mark that looks good at 512px on white has passed nothing. Logos live at 16px in a browser tab, in one colour
on a T-shirt, reversed on a dark app bar, next to competitors in an app store row. Test where it will live, fix,
and test again. Run the tests on every finalist and on every iteration that changed a shape.

## The order

1. **Every iteration**: render at 32px and 16px on light and dark (the concept module + `logo_sheet`, or
   `logo_test`). Cheap, and it catches most problems before they're polished.
2. **Each finalist**: `logo_test`, then the manual tests below.
3. **The finalists together**: peer test, then the critic.
4. **After colour and lockups**: `logo_test` again on the coloured primary, the favicon and the app icon.

## `logo_test` and what to do with its output

`logo_test` renders one SVG at 16/24/32/64/128px on light, dark, one colour, inverse and a busy ground, and
reports path stats: commands, curves, tiny segments and coordinate decimals.

| Hint | Meaning | Fix |
|---|---|---|
| "N tiny segments; curves will look lumpy" | Points placed by hand to fake a curve | Redraw: nodes on extremes, 3-6 per shape (`logo/construction`) |
| "N commands; rarely survives 32px" | Too complex | Remove an element; make a reduced version |
| "N-decimal coordinates" | Traced or noisy geometry | Snap to whole units, ≤ 2 decimals |
| "no path problems" but only `<text>` | Live text: not a logo | Outline with `logo_outline` |

A hint is a failure to fix, not a note to mention.

## The manual tests

| Test | How | Pass when |
|---|---|---|
| **16px squint** | Look at the 16px render, then blur your eyes (or blur 2px) | You can still tell it from a dot, a square and the competitors' marks. Details may blur below ~24px; the silhouette must not |
| **One colour** | The mono rows of `logo_test` | Reads without colour or gradients; no element disappears |
| **Reversed** | White on black; compare weight with black on white | Looks the same weight. If it looks bolder (irradiation), thin strokes 3-6% in a reversed variant |
| **Mirror** | Flip horizontally | No unintended reading (a letter, a symbol, a rude shape); still feels like the same mark |
| **180°** | Rotate | No unfortunate reading (swastika-adjacent, a body part, a different letter). Check 90° too for symbols |
| **Letter test** | Cover everything but each modified letter | Each still reads as itself |
| **Name test** | Show the wordmark for 1 second | The right name is read, first time |
| **Silhouette** | Fill the whole mark solid | Still recognisable as an outline; distinct from neighbours |
| **Busy ground** | Busy row in `logo_test`, or over a real photo | Holds, or a container/plate variant is defined |
| **Meaning check** | Name what it looks like to a stranger, in 3 words | None of the words are bad. "Blood", "legs", "octopus", "spill", "stain" killed real Drip concepts |
| **Resemblance check** | Search the category (`refs_search`, `refs_tag`) and think of famous marks with the same shape | Not confusable with an existing mark. If unsure, say so and recommend a trademark search |

## The peer test

Pick 3-4 exemplary marks from the peer set (top branding work found with `refs_tag` on branding tags or with
`refs_designer`, not keyword search, which returns generic logos). Put your finalists next to them at the same
size, in black, on one sheet (`logo_sheet` with the peers as extra entries, or a side-by-side image).

Ask, honestly:
- Does ours look like it belongs on this sheet, or like the one amateur entry?
- Is our curve quality, weight consistency and spacing at their level?
- Is our idea as clear, at 32px, as theirs?

If ours is the odd one out, name why in one sentence, fix that, and rerun. Peer marks are for comparison only:
never copy their forms.

## Fatal flaws

One fatal flaw outweighs any total. A finalist with one is cut or redrawn, even if it scores 9 elsewhere.
1. Illegible or a smudge at 16px (and no reduced version solves it).
2. Looks like an existing, known mark.
3. An unfortunate reading: blood, a body part, a weapon, a hate symbol, a rude word in a ligature or rotation.
4. A modified letter that no longer reads as itself, or a name that's misread.
5. Depends on colour, gradient or effects to be understood.

## The critic on finalists

Before the user sees anything:
1. One sheet: the 3 finalists (black, then the coloured candidate if colour is already in play) plus their
   `logo_test` renders and the 3 peer marks.
2. `critic_prepare({ kind: "logo", targets: [<sheet>, <test renders>] })`, with the context line "Would a brand
   studio ship this? Name the 3 amateur tells."
3. Launch Agent `drip:critic` with the prompt **unchanged**. No defence, no account of effort.
4. `critic_record` the verdict. Fix every S0/S1. If a finalist gets REJECT, replace it with the next distinct
   concept rather than polishing it.
5. Up to 3 rounds. Show the user the critic's own words next to your pick.

## Scorecard (self-check before the critic)

Score 1-5, then remember the fatal flaws override the total.

| Dimension | 5 means |
|---|---|
| Idea | One sentence, no competitor fits it |
| Distinction | Unlike anything in the category and peer set |
| Simplicity | ≤ 3 elements; describable on the phone |
| Craft | Clean curves, even weight, clean joins (no `logo_test` hints) |
| Small size | Clear at 16px |
| One colour | Works in black alone |
| Reversed | Same weight on dark |
| Versatility | Works as icon, lockup, favicon, embroidery |
| Typography | Kerned, customised, outlined |
| Durability | Will not look dated in 5 years (no trend effect carrying it) |

## Done when
- [ ] Every iteration checked at 32 and 16px on light and dark.
- [ ] No `logo_test` hints on any finalist.
- [ ] All manual tests passed, with corrections noted (reversed thinning, reduced version).
- [ ] Peer test done; ours is not the odd one out.
- [ ] No fatal flaw; the critic judged the finalists and its words are ready to show.

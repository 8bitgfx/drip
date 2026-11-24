# Ambition: beautiful first

Drip's default is **polished**: the page should be beautiful, the level of the best shots on Dribbble and the sites on
Awwwards that people save and send around. Safe, proven structure is fine; being different is not the goal. Being
**good** is. A familiar layout executed superbly beats a strange idea executed well.

What people save: rich, layered pictures (the product UI as crisp cards, a 3D render, real photography, soft depth and
light), a calm confident headline, generous space, one colour story, and motion that feels smooth and expensive.
What they scroll past: flat pages with nothing to look at, and posters that shout.

## The ambitions
- **polished** (default): proven structure, superb craft, eye candy that serves the product. Calm type, rich pictures, smooth motion.
- **bold**: only when the user asks for loud, playful, experimental, brutalist or "something nobody has seen". Then a signature risk is welcome.
- **conservative**: the category standard, done perfectly (the user asked for plain, safe or corporate).

## The test, before you show anything
1. **Save test.** Would a designer save this shot because it is beautifully made? Look at it next to the gold page (`drip_guide examples/gold`).
2. **Eye candy.** Is there something worth looking at in every screen: the product, a render, a visualisation, a photo, an interaction?
3. **Feel.** Do the hover, press, scroll and load states feel smooth and considered, not absent?
4. **Default check.** Is it a known slop combination (below)? Then fix that, not the whole idea.
5. **Real.** Real product, real copy, real numbers. Beauty never comes from fake content.

## The slop Drip refuses (unless the brief literally asks)
| Slop | Why | Go instead |
|---|---|---|
| Purple/indigo/pink "AI" gradients, blobs, sparkles | Generated-by-default tells (always refused) | Light and colour from a real picture: the product, a render, a photo |
| Cream/beige paper + terracotta + polite serif ("tasteful AI") | What every model makes for "warm" | A palette taken from the product or its pictures |
| Near-black where neon glow is the whole idea (orbs, outlines, nothing real) | The "AI startup" costume | Dark with something real on it: product UI, photography, a soft light |
| Glass on every card | Blur as decoration | One glass layer content passes under (a nav, a panel over a picture) |
| A hero plus three equal icon cards, then nothing to look at | The empty template | The same calm structure with real pictures: product cards, a bento of live UI, a render |
| Inter/Geist as the only voice, at one weight | No voice | A refined face with good details, set with care (fonts_pair) |
| A screaming poster: giant condensed caps on a drenched colour field | Loud is not the same as good | Calm headline, rich picture, colour from the imagery (unless the user asked for bold) |

Not slop: a polished SaaS or product page (white or dark ground, real product UI, soft depth, crisp type, a restrained
gradient or glow from the scene). That is the target genre for most briefs. The critic judges how well it is made.

## How to make it beautiful
- **The picture carries the page**: product UI as crisp layered cards, a 3D render, real photography, a visualisation of real data. Type supports it.
- **Calm, confident type**: a headline around 56-80px, a refined face, perfect spacing. Big is earned by the layout, never shouted.
- **Depth and light**: soft shadows, layered surfaces, a subtle gradient or glow that comes from the picture, crisp 1px borders.
- **One colour story**: a neutral or tinted ground, colour from the imagery, one accent on the action.
- **Motion that feels expensive**: entrance choreography for the hero, smooth hover and press states, scroll reveals with a reason, a live product demo. Plan it per section (board_plan `motion`).
- **Directions differ in idea**: three different ways to show the product (a live demo, a render, a bento of real UI), each polished. Not three posters.

## The critic enforces this
The drip:critic subagent scores appeal, polish and craft first, caps a known slop combination at 4/10, and checks
motion and interaction. It never rewards a risk for being a risk, and never marks good, familiar work down as "safe".

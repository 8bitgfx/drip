# Landing: heroes

The hero is the page's thesis. It answers three questions in the first screen: what is this, why should I care, what do I do now. It shows the thing itself at a scale that does it justice, with at most two actions, and nothing of the next section.

## Anatomy

| Part | Rule |
|---|---|
| Notice line (optional) | One 14px line above the h1 with a number: a launch date, changed hours, a delivery cut-off. Never a rotating banner or a bar above the nav. |
| h1 | Category + buyer or place, 2 to 8 words, at most three lines at every width. Never smaller than an h2. |
| Sub-line | 15 to 30 words: how it works and the main benefit. Max ~60 characters per line. |
| Actions | One filled primary (the main action) and at most one quiet secondary. Both above the fold at every width. |
| Doubt remover (optional) | One small line under the buttons: trial terms, "No card needed", install command. Only if true. |
| Picture | The product, place or work. Ends inside the hero. |
| Docked strip (optional, software/product) | One still row under the content, max ~96px: real customer logos with permission, a real rating line, or three plain facts. Hidden on phones unless it fits. |

## The hero types

Pick by the material you actually have, then by the job. Never pick by taste alone, and never use the same hero type on two consecutive projects without a reason.

| Type | Composition at 1440 | At 390 | Use when | Avoid when |
|---|---|---|---|---|
| **Split** | Text on 5 columns, picture on 6 starting at column 7, top-aligned with the h1, picture cropped by its frame | Text, then picture (240px+ tall) | Software or product with a strong UI or photo; the default safe choice | Product needs 80%+ width to read |
| **Full-bleed photo** | One photograph as the hero layer, words on its calm, dark side over 6 columns; nothing on the busy part | Photo cropped to the top, words below on the ground | Places, hotels, products in use, games with key art | You have no photograph that is truly theirs |
| **Place photo** | A full-width photograph under the nav with nothing on it; h1 and sub-line on the ground below in a 6/6 split | Photo 4:5 or 4:3, words stacked under | Cafes, shops, studios, guesthouses: the room from the door, the counter, the shopfront | The photo is a mood shot or not the place |
| **Product stage** | h1 on 7 columns with lead and buttons beside it; the product whole below, 80%+ of the container width, no box or gradient behind it | Stacked, product 86% of the column | Physical product with a cut-out, a studio photo or a render the brief asked for | You only have small or busy photos |
| **App window** | Short centred or left head, then one product window across the container, fading or cut at the bottom | Window minus its list column, or the open item alone | Software where the product is the argument (Linear, Vercel) | The UI is not ready or not good yet |
| **Statement** | One calm sentence at 56 to 72px over the ground, lead, buttons, three or four plain facts | 34 to 40px, three lines | No strong picture; a manifesto-led brand; a service with no visuals | You have a good product picture: show it |
| **Editorial** | The headline is the picture: 120 to 160px across the container, one or two photographs set inline in the line as pills | 56px on four lines | Studios, publications, fashion | Long product names; dense software |
| **Film** | A cinema frame with a poster, play control at its foot, h1 on a calm part | Frame, then words | A real trailer or product film exists | No film: never a fake play button |
| **Collage** | Text left, a composed frame right: one window cut by the frame's bottom plus one satellite card that changes once | The window alone | Software with two related views (dashboard + phone notification) | It turns into a pile of cards |
| **Action-first** | The h1 over a working control: a search field, a date picker, a booking widget, an email field | Same, field full width | Marketplaces, booking, newsletters, waitlists | The action needs explaining first |
| **Configurator** | The product with its options (colour, size) that change the picture beside an order card | Picture, then options | Products sold in variants | One SKU |

### Picking procedure

1. List the material: real photographs (of what?), real UI, a film, a cut-out or render, nothing.
2. Strike every type the material cannot fill. A place with no photo of itself cannot take a photo hero; it takes Statement on the brand colour.
3. Among the rest, take the type the visitor's job favours: Buy favours Product stage or Configurator, Sign up favours App window or Split, Book and Subscribe favour Action-first, Visit favours Place photo.
4. Check the reference board: if three of your references use the same type, choose it only if it is clearly best, and change something structural (crop, scale, side).
5. Write the choice and why on the page plan.

## Copy formulas

| Kind | h1 | Sub-line |
|---|---|---|
| Software | "[Category] for [buyer]" — "Shift planning for restaurant teams" | What it does + main benefit: "Build next week's rota in ten minutes, swap shifts from your phone, and pay staff the same day." |
| Developer tool | "[Category] for [stack]" or the verb: "Type-safe SQL for TypeScript" | The install line can sit under the buttons in mono. |
| Product | "[Product noun] that [one property]" — "A desk lamp that lights the whole desk" | Material, a number, the price from. |
| Place | "[Kind] on [street], [district]" — "Bakery on Mill Street, Leith" (40 chars max) | What they make and today's hours, 80 chars max. |
| Game | "[Name], a [genre]" — "Northline, a co-op survival game" | The status or date the brief gives: "Early access on Steam now." |
| Service | "[Service] for [who] in [where]" — "Physiotherapy for runners in Leeds" | What a first visit is and what it costs. |

Don't: "The future of work is here." "Where creativity meets code." "Unlock your potential." A question. A command with no object ("Get started"). A brand line with the meaning pushed into the sub-line.

## The fold

- **Hero height:** `min-height: 100svh` with content ending by about 64px above the fold on desktop and 24px plus any phone bar on mobile. `svh`, not `vh` or `dvh`, so the hero never jumps as the URL bar moves.
- **The picture ends inside the hero.** A layer behind the words, beside them, or below them only if the whole stack ends above the fold.
- **Never slice a card at the fold.** A window or card under the words either ends 24px+ above the fold or clearly bleeds with 96px+ of it cut under a soft fade, with the important part (the button, the comment, the result) above the fade. 1 to 95px of a box under the fold reads as a mistake.
- **Tablet (768 and 820 upright):** splits stack; check the first screen's foot ends on a whole element or a deliberate bleed.
- **Phone:** text first, picture second, unless the whole hero including a photo above still ends above the fold. Buttons stack full width when both don't fit one line.

## The entrance

- Once, on load. Words first (h1, sub-line, buttons), then the picture, 60 to 80ms apart, 400 to 800ms total, `ease-out`, translate 8 to 16px plus opacity.
- The h1 is readable from the first frame or within 200ms; never a typewriter that hides the headline.
- No loaders, intro gates, or sliders that rotate between products or screens.
- One hero motion at most besides the entrance (a card that changes once, a live word that changes twice then rests), off on touch and under reduced motion.

## Building it (React + Tailwind v4)

```tsx
<section className="relative min-h-svh pt-[calc(var(--nav-h)+48px)] pb-16">
  <div className="mx-auto grid w-[min(100%-160px,1280px)] grid-cols-12 gap-6 max-md:w-[calc(100%-48px)] max-md:grid-cols-4">
    <div className="col-span-5 max-md:col-span-4">
      <h1 className="text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.03em] text-balance">
        Shift planning for restaurant teams
      </h1>
      <p className="mt-6 max-w-[52ch] text-lg text-ink-2">Build next week's rota in ten minutes …</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn btn-primary" href="#start">Start free trial</a>
        <a className="btn btn-quiet" href="#pricing">See pricing</a>
      </div>
      <p className="mt-3 text-sm text-ink-3">Free for 14 days. No card needed.</p>
    </div>
    <figure className="col-span-6 col-start-7 max-md:col-span-4 max-md:col-start-1"> {/* product shot, cropped by its frame */} </figure>
  </div>
</section>
```

`text-balance` keeps h1 lines even; `clamp()` is fine on marketing headings (not in app UI).

## Hero slop tells

| Tell | Fix |
|---|---|
| Centred h1 over a floating dashboard screenshot with even air on all sides | Crop the window off an edge with one gutter (`drip_guide productshots/frames`) |
| A colour field, mesh gradient or 3D blob as the hero picture | The product, place or work; a gradient only as the ground behind it |
| Three buttons, or two filled buttons | One filled, one quiet |
| A badge pill above the h1 ("New: AI-powered ✨") on every page | A notice line only for a real, dated fact |
| Stock photo of people pointing at a laptop | The product's UI, or real people of the client |
| A rotating word in the h1 that never stops | It stops after two rounds and rests, or the h1 is static |
| Hero taller than the screen with the buttons below the fold on a laptop | Measure at 1440x900 and 1280x720 |
| Words over the busy part of a photo with a dark scrim over everything | Place words on the photo's calm side, or under it |

## Check

- [ ] At 1440x900, 1280x720, 820x1180, 768x1024 and 390x844: h1 ≤ 3 lines, both actions visible, nothing of the next section showing.
- [ ] The picture shows the real thing and is not sliced by the fold.
- [ ] The h1 passes the stranger test: someone who never heard of it can say what it is.
- [ ] Entrance plays once; reduced motion shows the settled hero.

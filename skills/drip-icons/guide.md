# Icons

Good icons are nearly invisible. They come from one family, sit at the same optical weight as the text beside them, line up on the text's first line, and appear only where they help someone recognise or operate something faster than words alone. A screen with good icons has fewer of them than you expect; each one is a control or a signpost, none is decoration. Remove any icon and you should lose a cue, not a sticker.

## The procedure

1. **Check what exists.** Search the project for an icon import (`lucide-react`, `@phosphor-icons/react`, `@tabler/icons-react`, `@heroicons/react`, `@radix-ui/react-icons`, inline SVG sprites). If one family is in use, that is the family. Do not add a second.
2. **Choose a family if there is none**, from the direction: geometry, stroke, corner style and feel must match the type and the radius (`icons/families` has the comparison). Write it in `DESIGN.md`: family, default size, stroke, style (outline/filled).
3. **List where icons go before adding any.** For each spot ask: is it the control itself, does it speed up recognition in a scan (nav, toolbar, file type, status), or does it carry meaning the text does not? If none, no icon.
4. **Find each glyph** with `icons_search` inside the family. Search by meaning ("delete", "settings", "external link"), check the names in `icons/families` for the common ones, and keep one glyph per meaning across the product.
5. **Fetch** with `icons_get` (or import from the package). Strip hard-coded fills and strokes so the SVG uses `currentColor`.
6. **Size and weight** to the text: the tables below.
7. **Wire access:** names on icon-only controls, `aria-hidden` on decorative ones, hit areas.
8. **Look:** `fitcheck_shot`; zoom on toolbars and buttons. Check alignment, weight against text, and that no two icons look like different families.

## The craft

### 1. One family

Mixing families shows at once: different stroke widths, corner radii, end caps and visual sizes. A filled Heroicon next to an outline Lucide looks like two products.

- **Do:** Lucide everywhere, Simple Icons only for the logos of real integrations.
- **Don't:** Lucide in the nav, Material icons in the settings page, a Font Awesome star in the reviews.

Brand logos (GitHub, Slack, Stripe) are not interface icons. They come from Simple Icons via `icons_search`, shown only for tools the product really works with, all in one treatment (all monochrome in the text colour, or all in brand colour).

### 2. Size on the grid

| Context | Text size | Icon size |
|---|---|---|
| Dense tables, inline meta, small badges | 12-13px | 14-16px |
| Body, buttons, inputs, menu items | 14-16px | 16-20px |
| Nav bars, toolbars, tabs | 14-16px | 20px |
| Large buttons, mobile tab bar | 16-18px | 24px |
| Empty states, feature spot icons | - | 32-48px (sparingly) |

- Render at the family's native grid (most are 24, Radix is 15, Heroicons also ship 20 and 16 versions). Scaling a 24 grid to 16 is fine; scaling to 19 blurs every line.
- Inline icons next to text: `1em` to `1.25em` of the text's size.
- Test every icon at its smallest render size. A detailed glyph at 16px becomes a smudge; choose the simpler one.

### 3. Stroke matches text weight

| Adjacent text | Stroke on a 24 grid |
|---|---|
| Regular (400), 14-16px | 1.5 |
| Medium or semibold (500-600) | 2 |
| Bold (700) or a standalone emphasised icon | 2-2.5 |

- One stroke width per surface. Lucide and Tabler accept `strokeWidth`; Phosphor uses weights (light ≈ 1.5, regular ≈ 2, bold); Heroicons outline is fixed at 1.5.
- When icons render smaller than 24, the stroke shrinks with them. If a 16px icon looks too thin next to 14px text, raise the stroke a step rather than the size.
- Use `absoluteStrokeWidth` (Lucide) when icons appear at several sizes on one screen and must keep the same visual weight.

### 4. Colour and state

- Icons inherit `currentColor`. In a button they take the button's text colour; in a muted row they take the muted colour.
- Hover and active change colour, not glyph. Selected may switch outline to filled (active tab, saved bookmark, liked item); everything else stays outline.
- Disabled icons dim with their control, never on their own.
- Coloured icons only for meaning: red for destructive or error, green/amber for status, always with text or a shape change too (`drip_guide a11y`).

```tsx
<button className="text-muted-foreground hover:text-foreground aria-pressed:text-primary" aria-pressed={saved}>
  {saved ? <BookmarkFilled aria-hidden /> : <Bookmark aria-hidden />}
  <span>Save</span>
</button>
```

### 5. Optical alignment

- Align the icon to the first line of text, not the centre of a multi-line block: `items-start` on the row plus a small top offset equal to `(line-height - icon size) / 2`.
- For a single line, `inline-flex items-center` works; check that glyphs with weight at the bottom (a download tray, a trash can) do not look low. Nudge 1px if they do.
- Play and arrow glyphs look off-centre in circles; shift them 1-2px toward their point.
- In a button with icon and label, the padding on the icon side equals the vertical padding (an 8px vertical pad means 8-10px on the icon side, 12-16px on the label side).
- Gap between icon and label: 6px at 14px text, 8px at 16px text.

### 6. When NOT to use an icon

Icons are for recognition and operation. They are slop when they decorate.

| Spot | Icon? | Why |
|---|---|---|
| Icon-only button (close, more, edit in a row) | Yes, with a name | It is the control |
| Nav items, toolbar actions | Yes, with labels on desktop | Speeds scanning; labels stop guessing |
| File types, integrations, statuses | Yes | Carries meaning text alone scans slower |
| Inputs (search magnifier, calendar on date) | Yes, one | Signals the input's kind |
| Feature cards on a landing page | Usually no | A tinted-square icon above every card is the top AI tell; use a product detail, a number or nothing |
| Every heading or section title | No | The heading is already the signpost |
| Bullets in a list of benefits | No | Checkmarks on every bullet add nothing |
| KPI and stat labels | No | The number is the content |
| Button labels like "Get started" | No | No arrow suffix; the label says where it goes |
| Footer links, legal text | No | Noise |

### 7. Labels with icons

- Desktop nav and toolbars: icon plus label. Icon-only toolbars are fine for expert tools only when every button has a tooltip (show after 500-800ms on hover, at once on focus) and an accessible name.
- Mobile tab bars: icon plus a short label (one word), 10-12px.
- Universal icons that may stand alone: search, close (x), menu, more (three dots), back, settings, share, play/pause, plus (in a clear "add" context). Everything else gets a label.
- The label and the accessible name say the same thing.

### 8. Icon buttons and accessibility

```tsx
<button type="button" aria-label="Delete invoice" className="relative inline-grid size-9 place-items-center rounded-md
  text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-[--focus] before:absolute before:-inset-1 before:content-['']">
  <Trash2 className="size-4" aria-hidden="true" />
</button>
```

- Name says the action and the object: "Delete invoice", not "Trash" or "Icon".
- Visible size can be 32-36px; the hit area reaches 44x44 on touch with a pseudo-element (`before:-inset-1` above, or larger) without changing the look. Never below 24x24.
- Decorative icons beside visible text: `aria-hidden="true"` so screen readers do not read "image".
- A meaningful standalone icon (a status icon with no text): `role="img"` and an `aria-label`, or visually hidden text next to it.
- Toggle buttons expose state with `aria-pressed`; menu buttons with `aria-expanded`.
- Focus ring on every icon button (`drip_guide a11y`).

### 9. Direction (RTL)

Flip: back/forward arrows, chevrons in navigation, send, undo/redo, text-align and indent glyphs. Do not flip: logos, checkmarks, clocks, media play controls, search magnifiers, most objects. In CSS: `[dir="rtl"] .icon-directional { scale: -1 1; }`.

## Slop tells and fixes

| Tell | Fix |
|---|---|
| Emoji as icons (🚀 ⚡ ✨ 🔒) in features, buttons or headings | Remove, or use the family's glyph if the icon carries meaning |
| Sparkles icon on anything "AI" | Pick an icon that names the action (wand for auto-fill only if that is the metaphor, or none) |
| Icon in a tinted rounded square above each of three feature cards | Delete the tiles; lead with the feature's own visual or just the heading |
| Two or more icon libraries on one screen | Re-pick every glyph from the one family |
| Arrow icon after every button and link label | Remove; keep only `↗` on external links and true next/previous |
| Checkmark before every bullet | Plain list, or a real comparison table |
| Icons at 18, 22, 26px | Snap to 16, 20, 24 |
| Thin 1px icons beside bold text, or heavy 2.5 icons beside light text | Match stroke to text weight |
| Icon-only nav with no labels or tooltips | Add labels (desktop) or tooltips plus names |
| `<div onClick>` with an SVG inside | A `<button type="button">` with an `aria-label` |
| Same meaning, different icon (gear and sliders both "settings") | One glyph per meaning, product-wide |
| Coloured icons in a rainbow across a feature grid | `currentColor`; colour only for meaning |
| Generic page glyph where a real file or brand icon exists | The real file-type or brand mark (Simple Icons for brands) |
| Hand-drawn look-alike of a real logo | The official mark from Simple Icons, or the name in text |
| Icon vertically centred on a two-line label | Align to the first line |

## Done when

- [ ] One family in the code (search the imports) plus at most brand marks for real integrations.
- [ ] No emoji or Unicode glyphs used as icons (`fitcheck_lint` clean).
- [ ] Every icon size is 16, 20, 24 or a 32-48 feature size; one stroke width per surface.
- [ ] Every icon-only control has an accessible name, a visible focus ring and a 24x24+ (44x44 touch) hit area.
- [ ] Decorative icons carry `aria-hidden="true"`.
- [ ] No feature-tile icons, no icons on headings, bullets or stat labels unless they carry meaning.
- [ ] In the screenshot, icons sit on the text's first line and read at the same weight as their labels.
- [ ] The family, size and stroke are written in `DESIGN.md`.

## Reference files

- `drip_guide icons/families`: the families compared, how to choose, and a name map for 40 common actions.

Related guides: `drip_guide a11y` (names, focus, targets), `drip_guide interaction` (button states), `drip_guide copy` (labels that go with icons).

## Sources

Ideas adapted and rewritten from: Make Interfaces Feel Better (MIT) icons reference (stroke matched to text weight, `currentColor` states, outline default and fill for active, render-size testing, RTL flips); unslop-ui (MIT) rules on decorative icons and arrows on links; Hallmark (MIT) gates on emoji icons, icon libraries and icon tiles; Taste Skill (MIT) icons reference (real brand marks, never drawn look-alikes); UI UX Pro Max (MIT) icon data (decorative, meaningful and interactive roles); Impeccable (Apache-2.0) craft floor (no glyphs standing in for an icon system).

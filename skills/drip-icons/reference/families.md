# Icons: families

Pick the family that matches the type and the shapes of the direction, then never mix. This file compares the common open families (all reachable through `icons_search` and `icons_get`), says when each fits, and maps 40 everyday meanings to their names so the same action gets the same glyph everywhere.

## The families

| Family (Iconify prefix) | Grid / default stroke | Styles | Size of set | Licence | Feel | Fits |
|---|---|---|---|---|---|---|
| Lucide (`lucide`) | 24 / 2, adjustable | Outline only | About 1,600 | ISC | Neutral, rounded caps, friendly-precise | Default for shadcn/React apps, SaaS, dashboards |
| Phosphor (`ph`) | 256 drawn, shown at 16-32 | Six weights: thin, light, regular, bold, fill, duotone | About 1,500 per weight | MIT | Soft, rounded, warm | Consumer apps, playful or warm directions; when you need fill for active states |
| Tabler (`tabler`) | 24 / 2, adjustable | Outline, plus filled for many | About 5,900 | MIT | Geometric, even, slightly technical | Admin tools, dense apps that need rare glyphs |
| Heroicons (`heroicons`) | 24 outline (1.5), 24 solid, 20 mini, 16 micro | Outline, solid, mini, micro | About 320 | MIT | Crisp, slightly formal | Tailwind projects, marketing sites, small sets |
| Radix Icons (`radix-icons`) | 15 / 1, crisp pixel grid | One style | About 330 | MIT | Tiny, sharp, technical | Dense developer tools at 15px |
| Iconoir (`iconoir`) | 24 / 1.5 | Outline, some solid | About 1,600 | MIT | Light, airy, editorial | Calm, premium, editorial directions |
| Hugeicons free (`hugeicons`) | 24 / 1.5 | Stroke rounded (free) | About 4,000 free | MIT (free set) | Rounded, modern | Consumer and mobile apps |
| Material Symbols (`material-symbols`) | Variable: fill 0-1, weight 100-700, optical size 20-48 | Outlined, rounded, sharp | About 3,500 | Apache-2.0 | Google-native | Android-feeling products, Material systems |
| Simple Icons (`simple-icons`) | 24, single colour brand marks | Brand logos | About 3,000 brands | CC0 (marks remain trademarks) | - | Integration rows, social links. Brands only |

Counts are approximate and grow with each release. Check the licence of the version you install.

## How to choose

1. **Already in the project?** Keep it. Switching families is a redesign, not a fix.
2. **Match the type.** Geometric grotesk (Inter, Geist, Söhne-likes): Lucide, Tabler, Radix. Humanist or rounded sans (Nunito, Manrope, SF Rounded): Phosphor, Hugeicons. Editorial serif with a light sans: Iconoir or Heroicons outline at 1.5.
3. **Match the corners.** Rounded radius scale (12px+ cards, pill buttons): rounded caps (Lucide, Phosphor). Sharp radius (0-4px): Tabler or Radix, or Material Symbols Sharp.
4. **Match the density.** Dense tables at 13-14px: Radix (15 grid) or Lucide at 16. Spacious marketing: 20-24.
5. **Need filled active states?** Phosphor (regular to fill), Heroicons (outline to solid), Material Symbols (fill axis). Lucide has no filled variants; use colour or a background for active instead.
6. **Need rare glyphs** (specific devices, finance, medical)? Tabler's breadth, then Material Symbols.

Write the choice in `DESIGN.md`:

```md
## Icons
Family: Lucide (lucide-react). Default 16px in body and buttons, 20px in nav and toolbars.
Stroke: 1.5 beside 14-16px regular text, 2 in buttons (semibold labels). absoluteStrokeWidth on.
Style: outline only; active state by colour, not fill. Brand marks: Simple Icons, monochrome.
```

## Install and use

| Family | React package | Import |
|---|---|---|
| Lucide | `lucide-react` | `import { Search } from "lucide-react"` |
| Phosphor | `@phosphor-icons/react` | `import { MagnifyingGlass } from "@phosphor-icons/react"` |
| Tabler | `@tabler/icons-react` | `import { IconSearch } from "@tabler/icons-react"` |
| Heroicons | `@heroicons/react` | `import { MagnifyingGlassIcon } from "@heroicons/react/24/outline"` |
| Radix | `@radix-ui/react-icons` | `import { MagnifyingGlassIcon } from "@radix-ui/react-icons"` |

Outside React, or for one-off glyphs, `icons_get` returns the SVG to inline. Strip `fill="#..."` and `stroke="#..."` and set `currentColor`. Keep the `viewBox`.

## Name map: one meaning, one glyph

Names change between releases; confirm with `icons_search` before use. Lucide names are kebab-case (`lucide-react` exports PascalCase: `trash-2` becomes `Trash2`).

| Meaning | Lucide | Phosphor | Tabler | Heroicons |
|---|---|---|---|---|
| Search | search | MagnifyingGlass | search | magnifying-glass |
| Close, dismiss | x | X | x | x-mark |
| Menu | menu | List | menu-2 | bars-3 |
| More actions | ellipsis / ellipsis-vertical | DotsThree / DotsThreeVertical | dots / dots-vertical | ellipsis-horizontal / ellipsis-vertical |
| Back | arrow-left | ArrowLeft | arrow-left | arrow-left |
| Expand, open select | chevron-down | CaretDown | chevron-down | chevron-down |
| Next in a list or step | chevron-right | CaretRight | chevron-right | chevron-right |
| Add, create | plus | Plus | plus | plus |
| Edit | pencil | PencilSimple | pencil | pencil |
| Delete | trash-2 | Trash | trash | trash |
| Copy | copy | Copy | copy | document-duplicate |
| Done, success | check | Check | check | check |
| Settings | settings | Gear | settings | cog-6-tooth |
| Filter | list-filter | Funnel | filter | funnel |
| Sort | arrow-up-down | ArrowsDownUp | arrows-sort | arrows-up-down |
| Download | download | DownloadSimple | download | arrow-down-tray |
| Upload | upload | UploadSimple | upload | arrow-up-tray |
| External link | external-link / arrow-up-right | ArrowSquareOut / ArrowUpRight | external-link | arrow-top-right-on-square |
| Link | link | Link | link | link |
| Share | share-2 | ShareNetwork | share | share |
| User, account | user | User | user | user |
| Team | users | Users | users | user-group |
| Notifications | bell | Bell | bell | bell |
| Mail | mail | Envelope | mail | envelope |
| Calendar, date | calendar | Calendar | calendar | calendar |
| Time | clock | Clock | clock | clock |
| Info | info | Info | info-circle | information-circle |
| Warning | triangle-alert | Warning | alert-triangle | exclamation-triangle |
| Error | circle-alert | WarningCircle | alert-circle | exclamation-circle |
| Help | circle-help | Question | help-circle | question-mark-circle |
| Lock, private | lock | Lock | lock | lock-closed |
| Visible / hidden | eye / eye-off | Eye / EyeSlash | eye / eye-off | eye / eye-slash |
| Home | house | House | home | home |
| File | file | File | file | document |
| Folder | folder | Folder | folder | folder |
| Image | image | Image | photo | photo |
| Refresh, retry | refresh-cw | ArrowClockwise | refresh | arrow-path |
| Log out | log-out | SignOut | logout | arrow-right-on-rectangle |
| Play / pause | play / pause | Play / Pause | player-play / player-pause | play / pause |
| Favourite | star / heart | Star / Heart | star / heart | star / heart |
| Drag handle | grip-vertical | DotsSixVertical | grip-vertical | (none: use bars-2) |

### Choosing between near-synonyms

- **Close vs delete:** `x` dismisses (a dialog, a chip, a toast); trash deletes data. Never use `x` for delete in a list row.
- **Chevron vs arrow:** chevrons open, expand and step through; arrows move you somewhere (back, external, next page).
- **Settings vs filter vs sliders:** gear for settings pages, funnel for filtering a list, sliders for adjusting values. Pick one per meaning.
- **Info vs help:** info explains this thing; help opens documentation or support.
- **Warning vs error:** triangle for "check this", circle-alert for "this failed".

## Brand marks

- Only for tools, platforms or social accounts the product really uses or the user named.
- From Simple Icons via `icons_search`. Never draw a look-alike, never put a letter in a circle where a real mark exists.
- One treatment per row: all monochrome in `currentColor` (most pages), or all in their own brand colour (integration grids). Same optical height (adjust per mark: wide wordmarks sit lower than square marks).
- 20-32px in an integration row, 16-20px in footer social links, always with an accessible name ("GitHub").
- Marks remain their owners' trademarks: name only real integrations, never imply endorsement.

## Sources

Family data from the projects' own documentation (Lucide, Phosphor, Tabler, Heroicons, Radix, Iconoir, Hugeicons, Material Symbols, Simple Icons), summarised by Drip. Choosing guidance adapted from Make Interfaces Feel Better (MIT) icons reference and UI UX Pro Max (MIT) icon data; brand-mark rules adapted from Taste Skill (MIT) icons reference.

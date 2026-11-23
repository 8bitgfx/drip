# What may ship

| Asset | OK to ship | Not OK | How Drip helps |
|---|---|---|---|
| Fonts | Open licences (OFL, Apache) from Fontsource / Google Fonts; fonts the user licensed | Commercial fonts copied from another site | `fonts_search` shows each font's licence |
| Icons | Open icon sets (Lucide ISC, Phosphor MIT, Tabler MIT, Heroicons MIT…) | Icons ripped from another product | `icons_search` / `icons_get` via Iconify |
| Photos | Unsplash / Pexels licence (free, credit appreciated), CC licences with their conditions (CC BY needs credit, CC BY-SA needs share-alike), the user's own | Images found on Google with unknown licence; Dribbble shots | `images_save` logs source, author and licence in `.drip/assets.json` |
| Generated images | Images from the user's own provider account, within that provider's terms | Prompts that copy a living artist's style by name or a trademark | `gen_image` logs prompt and provider |
| References (Dribbble etc.) | Studying them: layout ideas, ratios, techniques | Copying a shot's design, illustrations or assets into the product | Board notes describe what to *learn*, not what to copy |
| Components | Libraries with permissive licences (MIT etc.); check paid "pro" terms | Paid templates without a licence | `components_catalogue` lists licences (some marked "check") |

When a licence is unknown, mark it in the hand-off and ask the user before it ships.
Credit authors where the licence asks for it (a credits page or the footer).

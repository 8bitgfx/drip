# Slop tells: how AI-made UI gives itself away

Look for these in code AND in screenshots. Each one is a reason to drop a fit-check score. The
static ones are also checked by `fitcheck_lint` (data/slop.json).

## Colour
1. Purple-to-pink or indigo-to-cyan gradients, especially on headline text. → One accent from the direction; solid ink headlines.
2. Gradient text anywhere. → Solid colour; hierarchy from size and weight.
3. Glowing blurred "orbs" behind the hero for no reason. → A real image, product UI, or a deliberate mesh gradient from the palette.
4. Several accents competing (blue buttons, green badges, purple links). → One accent; semantic colours only for status.
5. Pure #000 on pure #FFF, or grey-on-grey body text that fails contrast. → Tinted neutrals from the ramp; check contrast.
6. Dark mode that is just inverted (pure black, saturated accents vibrating). → Raised dark surfaces (not #000), desaturated accent steps.

## Layout
7. The template stack: centered hero → logo strip → 3 equal feature cards → testimonial carousel → pricing → FAQ → CTA. → Choose sections for this product; vary rhythm and width.
8. Three identical cards with an icon, a two-word title and one line each. → Fewer, deeper features with real UI, or an asymmetric layout.
9. Everything centered. → Left-aligned text for anything longer than two lines; centered only for short heroes.
10. Uniform padding everywhere, no rhythm. → Group related things tight, separate sections generously.
11. Cards inside cards inside cards. → Flatten; use spacing and dividers.
12. Bento grid for content that isn't bento-shaped. → Use bento only for a set of peer features with visual payloads.
13. Hero with no product: abstract shapes, stock "team" photo. → Show the product or a real, specific photo.
14. Full-width text lines (>80 characters). → Measure 45-75ch.

## Typography
15. Inter/system font at one weight everywhere. → A pairing with contrast (display + text), 2-3 weights.
16. Too many sizes (7+ on a page). → A scale of 4-5 sizes used consistently.
17. Small uppercase tracked "eyebrow" labels over every section. → Rarely; let headings stand.
18. Huge headline with tiny, low-contrast subtext. → Subtext ≥ 18px on marketing, ≥ 4.5:1.
19. Proportional numbers in prices, tables and stats. → `font-variant-numeric: tabular-nums`.
20. Orphaned single words on headline lines. → `text-wrap: balance` for headings, `pretty` for paragraphs.

## Copy
21. "Unlock", "Elevate", "Seamless", "Supercharge", "Revolutionize", "Next-gen", "Effortless". → Say what it does.
22. Made-up stats ("10x faster", "99.9%", "10,000+ teams"). → Real numbers or none.
23. Fake testimonials and logos ("Acme Corp"). → Real ones from the user, or no section.
24. Numbered section labels ("01 — Features") with no reason. → Plain headings.
25. Generic buttons: "Get Started", "Learn More", "Submit". → Name the action.
26. Botsplaining: sentences that explain the UI ("Click the button below to…"). → Let the UI speak.
27. Emoji in headings, buttons and bullet points. → Icons from the project family, or nothing.

## Components and detail
28. Sparkles icon for anything "AI". → An icon that means something here.
29. Decorative icons on every list item and card. → Icons only where they help scanning.
30. Status dots and "New" badges sprinkled for decoration. → Only on real status.
31. Glassmorphism (backdrop blur) on many layers. → Glass is fine as one deliberate layer where content passes under it (a nav, a panel over a photo); the tell is blur on every card.
32. Heavy drop shadows on everything (`shadow-2xl`). → Subtle, consistent elevation from one light source.
33. Mixed corner radii with no system. → 2-3 radii; nested = outer − padding.
34. Library defaults untouched (stock shadcn look). → Restyle to tokens.
35. Buttons without hover/press/focus states; focus outline removed. → All states, visible focus ring.
36. Inputs without labels (placeholder as label). → Visible labels.
37. Icon buttons without accessible names. → `aria-label`.
38. Empty, loading and error states missing. → Design them.

## Motion
39. Everything fades/slides in on scroll. → Animate one or two meaningful things.
40. `transition: all`, long durations (>400ms for UI), bouncy easing on everything. → Specific properties, 150-300ms, ease-out for entrances.
41. Infinite marquee of logos/testimonials by reflex. → Only when there are many real logos.
42. Parallax and 3D tilt cards on product UI. → Save effects for one signature moment on marketing pages.
43. No reduced-motion handling. → `prefers-reduced-motion: reduce`.

## Imagery
44. Placeholder grey rectangles or Unsplash-random "abstract" images. → Directed imagery.
45. Generated images with mismatched styles across a page. → One prompt recipe for the set.
46. Low-resolution or stretched screenshots of the product. → Crisp, cropped, framed product shots.
47. Photos with text placed over the busiest part. → Composition with negative space where text goes.

## Responsive
48. Desktop layout squeezed onto a phone: tiny text, horizontal scroll, side-by-side cards. → Real phone layout.
49. `100vh` heroes that jump on mobile. → `100dvh` / `100svh`.
50. Hover-only interactions on touch screens. → Visible affordances and tap targets.

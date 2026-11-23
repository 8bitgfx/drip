# DESIGN.md template

`DESIGN.md` sits at the project root. It is the brief every later screen is built from, by you, by other agents
and by people. It follows the open DESIGN.md format (YAML frontmatter with machine-readable tokens, then up to
eight markdown sections in a fixed order), so tools that read the format can lint it. The token file stays the
single source of values; DESIGN.md names them, says where they go and why, and states the rules.

## Before you write

- **An existing `DESIGN.md` or `design.md`:** do not overwrite it. Show it to the user and ask: refresh (update values, keep the words), merge (add your new roles and rules), or replace (only for an agreed redesign).
- **No code yet** (seed): write the direction, the palette strategy and the type character; mark unknown values `[to be set during build]`. Fill them in after the first screen exists.
- **Code exists** (scan): extract the real tokens first (see `drip_guide system`, step 1). Document only what is reused; one-offs pollute the spec.

## Writing rules

- **Frontmatter is normative.** A value lives there once. Prose names the token and gives the value in brackets, never a different value.
- **Describe, then give the number:** "Gently rounded controls (8px)", not "rounded-lg".
- **Where and why, not only what:** "Accent: the primary button, links, focus ring and the selected nav item. Nothing else."
- **Named rules** are the most useful lines in the file. Format: `**The [Name] Rule.** One forceful sentence.` Aim for 1-3 per section. They are easy to cite in a review ("this breaks the One Voice Rule").
- **Exact section headings**, in this order. Tools parse them: `Overview`, `Colors`, `Typography`, `Layout`, `Elevation & Depth`, `Shapes`, `Components`, `Do's and Don'ts`. Omit a section that does not apply; do not rename one.
- **Only real things.** No components that do not exist yet. No rules the direction did not decide.
- **Short.** 80-200 lines. Long enough to build a new screen from, short enough that people keep it current.
- **Frontmatter groups** are limited to `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`. Motion, shadows, z-index and breakpoints go in prose (Elevation & Depth, Layout, Components) and in the token file.
- **Component entries** use only these props: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. Refer to tokens as `{colors.accent}`. Variants are sibling keys: `button-primary`, `button-primary-hover`.

## The template

Copy, then replace every bracket. Delete guidance comments.

````markdown
---
name: [Product name]
description: [One line: what it is, for whom]
colors:
  # one entry per semantic role actually used; same format as the token file (oklch or hex)
  bg: "oklch(98.5% 0.004 [hue])"
  surface: "oklch(100% 0 0)"
  surface-raised: "oklch(97% 0.006 [hue])"
  text: "oklch(22% 0.015 [hue])"
  text-muted: "oklch(45% 0.015 [hue])"
  border: "oklch(91% 0.008 [hue])"
  accent: "oklch([L]% [C] [H])"
  accent-hover: "oklch([L-5]% [C] [H])"
  on-accent: "oklch(99% 0 0)"
  focus: "oklch([L]% [C] [H])"
  success: "oklch(58% 0.14 150)"
  warning: "oklch(75% 0.15 75)"
  danger: "oklch(56% 0.19 27)"
typography:
  display:
    fontFamily: "[Display face], [fallback], serif"
    fontSize: "clamp(2.75rem, 2.134rem + 2.63vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "[Display face], [fallback]"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "[Body face], [fallback], sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "[Body face], [fallback], sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "[Body face], [fallback], sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
  2xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: [Product name]

## Overview

**Creative North Star: "[A named metaphor, e.g. The Field Notebook]"**

[2-3 short paragraphs. Who it is for and the scene they use it in (desk, phone on the move, a dark control room).
The personality in three adjectives from the chosen direction. Density (airy / balanced / dense) and why.
What it deliberately is not.]

Direction: [board name / direction name], chosen [date]. Mode: [sell / operate / read / play].

**Key characteristics:**
- [e.g. Warm paper neutrals carry 90% of every screen]
- [e.g. One rust accent, used only for action and selection]
- [e.g. Serif headlines, sans everything else]
- [e.g. Flat surfaces, depth from hairlines]

## Colors

[One sentence on the palette character, e.g. "Warm stone neutrals with a single rust accent; colour means action."]

### Primary
- **[Descriptive name, e.g. Rust]** ({colors.accent}): [exactly where it is used: primary button, links, focus ring, active nav item, the one chart series that matters]

### Neutral
- **[Paper]** ({colors.bg}): page background.
- **[Card white]** ({colors.surface}): cards, inputs, menus.
- **[Ink]** ({colors.text}): all body text and headings ([contrast]:1 on bg).
- **[Pencil]** ({colors.text-muted}): metadata, help text, table secondary columns ([contrast]:1, never below 4.5).
- **[Hairline]** ({colors.border}): dividers, input outlines, table rules.

### State
- **Success / Warning / Danger** ({colors.success} / {colors.warning} / {colors.danger}): always with an icon or a word, never colour alone. Subtle fills for banners, text tones for inline messages.

### Dark theme
[One line on how dark differs: e.g. "Surfaces step lighter with elevation; accent lifted to L 70% and chroma -0.03; no shadows." Values live in the token file under `.dark`.]

**The One Voice Rule.** The accent covers under [5-10]% of any screen. Its rarity is what makes it a signal.
**The [Name] Rule.** [Another rule the direction decided, e.g. "Grey text never sits on a coloured surface; it takes a tint of that surface's hue."]

## Typography

**Display:** [Face] (fallback [face]), [weights loaded]
**Body:** [Face] (fallback [face]), [weights loaded]
**Mono:** [Face], only for code and tabular IDs [or omit]

**Character:** [One sentence, e.g. "A literary serif for headlines over a plain grotesk that disappears in the UI."]

### Hierarchy
- **Display** ([weight], [size or clamp], [line-height], [tracking]): hero headline only, once per page.
- **Heading** (...): section titles.
- **Title** (...): card and dialog titles.
- **Body** (...): everything people read; measure [60-70]ch.
- **Label** (...): buttons, form labels, table heads; sentence case.
- **Small** (...): captions and meta; never under 12px.

Numbers in tables, prices and counters use tabular figures.

**The [Name] Rule.** [e.g. "Hierarchy comes from size and weight, never from colour or capitals."]

## Layout

[The spatial model in words: container width ([value]), gutter ([phone] / [desktop]), grid ([12] columns, [24px] gap),
spacing rhythm (tight 8-12px inside groups, 24-32px between groups, 64-128px between sections), density,
breakpoints ([640 / 768 / 1024 / 1280]) and what changes at each (sidebar collapses at [1024], tables restack at [640]).]

**The [Name] Rule.** [e.g. "Everything starts on the left edge of the container; nothing is centred wider than 640px."]

## Elevation & Depth

[Shadows, tonal layers or hairlines: say which, and how depth works in dark mode.]

- **Hairline** (`--shadow-hairline: [value]`): resting cards and inputs.
- **Raised** (`--shadow-raised: [value]`): hovered cards, sticky header after scroll.
- **Overlay** (`--shadow-overlay: [value]`): menus, popovers.
- **Modal** (`--shadow-modal: [value]`): dialogs, sheets.

Layers: base 0, raised 10, dropdown 100, sticky 200, overlay 300, modal 400, toast 500, tooltip 600.

**The [Name] Rule.** [e.g. "Flat at rest. Shadow appears only to show something floats above the page."]

## Shapes

[Corner family ([sm]/[md]/[lg]), concentric nesting (outer = inner + padding), border width (1px), focus ring
([2px] [accent] at [2px] offset), image corners, any recurring silhouette.]

## Components

### Buttons
- **Shape:** [description] ({rounded.md}), heights [32 / 40 / 48]px.
- **Primary:** [fill + text]; one per view.
- **Secondary:** [outline or tonal]; same height and radius as primary.
- **States:** hover [change], active [change, e.g. scale 0.98], focus [ring], disabled [opacity 0.5 + not-allowed + `disabled`], loading [spinner replaces label, width kept].
- **Motion:** [property] over [--dur-fast] with [--ease-out].

### Inputs
- **Style:** [border, background, radius, height = button height].
- **Focus:** [ring, never a border-width change]. **Error:** [border + message below, linked by aria-describedby].

### Cards
- **Surface:** [bg + border or shadow, not both]. **Padding:** [value]. **Radius:** [value].

### Navigation
- [Height, active state, mobile treatment.]

### [Signature component, if any]
- [What makes it this product's own.]

## Do's and Don'ts

### Do:
- **Do** [specific prescription with value, e.g. "use the accent on one primary button per view"].
- **Do** [...]

### Don't:
- **Don't** [specific prohibition, e.g. "use gradients on UI surfaces; gradients live only in the hero art"].
- **Don't** [...]
````

## After writing

- Read it as a stranger: could you build a settings page from this file alone? If not, add the missing rule.
- Check every value against the token file. One mismatch and people stop trusting the file.
- When behaviour changes later, update DESIGN.md in the same change. A stale DESIGN.md is worse than none.
- Tell the user the two or three non-obvious choices (the North Star, the named rules) and offer to adjust them.

# Tokens: structure, naming and the file

How to lay out the token file so it is easy to read, easy to theme and maps cleanly onto Tailwind v4, shadcn/ui
and token pipelines. Values here are a sound default; the chosen direction overrides them.

## Order inside the file

1. Primitives (ramps, font stacks, raw scales). Never change with theme.
2. Semantic tokens on `:root` (light), referencing primitives.
3. Theme overrides (`.dark`, `[data-theme="dark"]`, brand themes): semantic tokens only.
4. The Tailwind `@theme` mapping, so utilities exist for the semantic roles.
5. Base element rules (in `@layer base`).

## Naming rules

- **Semantic colour tokens use short role names**: `--bg`, `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-subtle`, `--on-accent`, `--focus`, `--danger`, `--success`, `--warning`, `--overlay`. `palette_generate` prints exactly these names for both themes (plus the raw ramps); add `--focus`, the state roles and `--overlay` yourself.
- **Tailwind exposes them as `--color-*`** in `@theme inline` (`--color-bg: var(--bg)`). The two names must differ: `--color-bg: var(--color-bg)` is a cycle and the colour silently disappears.
- **Other families keep a category prefix**: `--font-`, `--text-` (sizes, in `@theme`), `--radius-`, `--shadow-`, `--z-`, `--dur-`, `--ease-`.
- **Role before variant before state**: `--accent-subtle-hover`.
- **Shadows are named by role** (`--shadow-hairline`, `--shadow-raised`, `--shadow-overlay`, `--shadow-modal`), not size. Tailwind owns `--shadow-sm` and friends and inlines its own values into `shadow-sm`, so a same-named override in `.dark` would not reach the utility.
- Lowercase, hyphens, no abbreviations a newcomer cannot guess (`bg` is fine; `clr-prm` is not).
- Primitives may describe value (`--stone-200`, `--rust-600`); semantic tokens never do.
- One format per family. If the project's colours are OKLCH, new ones are OKLCH. If it stores bare HSL channels (`220 14% 96%`, older shadcn), so do you.

## A complete token file (CSS variables + Tailwind v4)

Replace hues and the accent with the direction's values (`palette_generate` prints ramps you can paste into the
primitive block). `--hue` is the page's anchor hue, used to tint neutrals and shadows.

```css
@import "tailwindcss";

/* Dark mode follows a class or data attribute, not only the OS */
@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));

/* 1. Primitives */
:root {
  --hue: 60;
  --stone-50:  oklch(98.5% 0.004 var(--hue));
  --stone-100: oklch(96.5% 0.006 var(--hue));
  --stone-200: oklch(92% 0.008 var(--hue));
  --stone-300: oklch(86% 0.010 var(--hue));
  --stone-400: oklch(71% 0.012 var(--hue));
  --stone-500: oklch(56% 0.014 var(--hue));
  --stone-600: oklch(46% 0.014 var(--hue));
  --stone-700: oklch(37% 0.013 var(--hue));
  --stone-800: oklch(27% 0.012 var(--hue));
  --stone-900: oklch(21% 0.011 var(--hue));
  --stone-950: oklch(16% 0.010 var(--hue));
  --rust-300: oklch(78% 0.10 40);
  --rust-400: oklch(70% 0.14 40);
  --rust-500: oklch(62% 0.17 40);
  --rust-600: oklch(55% 0.17 40);
  --rust-700: oklch(48% 0.15 40);
}

/* 2. Semantic tokens, light */
:root {
  color-scheme: light;
  --bg: var(--stone-50);
  --surface: oklch(100% 0 0);
  --surface-raised: var(--stone-100);
  --text: var(--stone-900);
  --text-muted: var(--stone-600);
  --border: var(--stone-200);
  --border-strong: var(--stone-300);
  --accent: var(--rust-600);
  --accent-hover: var(--rust-700);
  --accent-subtle: oklch(95% 0.03 40);
  --on-accent: oklch(99% 0 0);
  --focus: var(--rust-500);
  --danger: oklch(55% 0.19 27);
  --success: oklch(56% 0.13 150);
  --warning: oklch(76% 0.15 75);
  --overlay: oklch(16% 0.01 var(--hue) / 0.5);

  --shadow-hairline: 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.08);
  --shadow-raised: 0 1px 2px oklch(20% 0.01 var(--hue) / 0.06), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);
  --shadow-overlay: 0 4px 12px -2px oklch(20% 0.01 var(--hue) / 0.10), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);
  --shadow-modal: 0 16px 40px -8px oklch(20% 0.01 var(--hue) / 0.18), 0 0 0 1px oklch(20% 0.01 var(--hue) / 0.06);

  --z-raised: 10; --z-dropdown: 100; --z-sticky: 200; --z-overlay: 300;
  --z-modal: 400; --z-toast: 500; --z-tooltip: 600;
  /* motion: the same set drip_guide motion uses */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-press: 140ms; --dur-fast: 150ms; --dur-base: 200ms; --dur-modal: 240ms; --dur-sheet: 420ms;
}

/* 3. Dark: semantic tokens only */
.dark, [data-theme="dark"] {
  color-scheme: dark;
  --bg: var(--stone-950);
  --surface: var(--stone-900);
  --surface-raised: var(--stone-800);
  --text: var(--stone-50);
  --text-muted: var(--stone-400);
  --border: oklch(30% 0.012 var(--hue));
  --border-strong: oklch(38% 0.012 var(--hue));
  --accent: var(--rust-400);
  --accent-hover: var(--rust-300);
  --accent-subtle: oklch(30% 0.05 40);
  --on-accent: var(--stone-950);
  --focus: var(--rust-400);
  --shadow-hairline: 0 0 0 1px oklch(100% 0 0 / 0.08);
  --shadow-raised: 0 0 0 1px oklch(100% 0 0 / 0.10);
  --shadow-overlay: 0 8px 24px oklch(0% 0 0 / 0.4), 0 0 0 1px oklch(100% 0 0 / 0.10);
  --shadow-modal: 0 20px 48px oklch(0% 0 0 / 0.5), 0 0 0 1px oklch(100% 0 0 / 0.12);
}

/* 4. Tailwind mapping: utilities for semantic roles (bg-surface, text-fg, border-border, bg-accent...) */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-fg: var(--text);
  --color-fg-muted: var(--text-muted);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-subtle: var(--accent-subtle);
  --color-on-accent: var(--on-accent);
  --color-focus: var(--focus);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-warning: var(--warning);
}

@theme {
  --font-display: "<Display Face> Variable", ui-serif, Georgia, serif;
  --font-sans: "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;

  --text-display: clamp(2.75rem, 2.134rem + 2.63vw, 4.5rem);
  --text-display--line-height: 1.05;
  --text-display--letter-spacing: -0.03em;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* utilities ease-out-strong, ease-drawer...; Tailwind's own ease-out is left alone */
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out-strong: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);

  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
}

/* 5. Base */
@layer base {
  html { background: var(--bg); color: var(--text); font-family: var(--font-sans); }
  ::selection { background: var(--accent-subtle); color: var(--text); }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
}
/* Reduced motion is handled per component (drop transforms, keep short fades): drip_guide motion */
```

Using the non-colour tokens from Tailwind v4 markup: `shadow-(--shadow-raised)`, `z-(--z-modal)`,
`duration-(--dur-base)`, `ease-out-strong`, `ease-drawer`, `rounded-lg` (yours), `font-display`, `text-display`.

## Tailwind v4 notes

- **`@theme inline`** when the value is a `var()` of a token that changes with theme: the utility then writes `var(--bg)` itself, so theme switching works. Plain `@theme` for literal values (fonts, sizes, radius, easings, breakpoints).
- **Names Tailwind already owns** (`--text-lg`, `--radius-md`, `--ease-out`, `--font-sans`, `--breakpoint-md`) are replaced by yours. In a new project that is the point. In an existing project, check no other page relies on the old value before overriding.
- **Never `--spacing-<name>`.** Tailwind derives `w-*`, `max-w-*`, `p-*` and `gap-*` from the spacing namespace; `--spacing-xl: 40px` silently turns `max-w-xl` into 40px. Keep Tailwind's `--spacing: 0.25rem` unit: `p-1` 4px, `p-2` 8px, `p-3` 12px, `p-4` 16px, `p-6` 24px, `p-8` 32px, `p-12` 48px, `p-16` 64px, `p-24` 96px, `p-32` 128px.
- **Type tokens carry their line-height and tracking**: `--text-title--line-height`, `--text-title--letter-spacing`, `--text-title--font-weight`. One utility then sets the whole role.
- **`@custom-variant dark`** decides what `dark:` means. Prefer class or data attribute over the default media query so a toggle works. With semantic tokens you should rarely need `dark:` at all.
- **Base rules go in `@layer base`.** Unlayered element rules beat every utility.
- **`@import` order:** imports first, then `@custom-variant`, then `@theme`, then rules. An `@import` after a rule is dropped silently.
- **Tailwind v3 projects:** keep the CSS variables and point `theme.extend.colors` at `var(--bg)` and friends. Do not migrate the project to v4 as a side effect.

## shadcn/ui projects

shadcn already has a semantic layer. Use it; do not add a second one.

| Drip role | shadcn variable | Watch out |
|---|---|---|
| bg | `--background` | |
| text | `--foreground` | |
| surface | `--card`, `--popover` | |
| accent (brand action) | `--primary`, `--primary-foreground` | shadcn's `--accent` is a *hover surface*, not the brand colour |
| surface-raised / hover | `--accent`, `--secondary` | |
| text-muted | `--muted-foreground` | `--muted` is a background |
| border | `--border`, `--input` | |
| focus | `--ring` | |
| danger | `--destructive` | add `--success`, `--warning` in the same format |
| radius-lg | `--radius` | shadcn derives sm/md from it (`calc(var(--radius) - 4px)`) |

Before restyling a component pulled with `components_get`, read which variables it uses; theme through those.

## DTCG `tokens.json` (only when asked)

For Style Dictionary or Tokens Studio. Path-based, `$type` on every token, OKLCH as a string, fluid sizes export
their maximum (the `clamp()` stays in CSS).

```json
{
  "color": {
    "bg": { "$value": "oklch(98.5% 0.004 60)", "$type": "color" },
    "accent": { "$value": "oklch(55% 0.17 40)", "$type": "color" }
  },
  "radius": { "md": { "$value": "8px", "$type": "dimension" } },
  "duration": { "base": { "$value": "200ms", "$type": "duration" } }
}
```

## What does not become a token

- A value used once (a hero illustration's offset, an optical 1px nudge). Leave it inline with a comment.
- Two values that look alike but serve different intents. Similar is not the same.
- Every Tailwind default you happen to use. Tokens are the decisions that make this product look like itself.

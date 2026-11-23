# Theming: light, dark and brand themes

How to wire themes so components never know which one is on. What the dark colours should *be* is a colour
question (`drip_guide color/dark-mode`); this file is the plumbing.

## The model

- A theme is a set of overrides of **semantic tokens only**. Primitives (ramps) stay the same in every theme.
- `:root` holds the default theme (usually light). Other themes are selectors that redefine the same names.
- Components and pages use semantic tokens or the utilities mapped from them. No `dark:bg-zinc-900` in a component; if a component needs a dark-specific value, the system is missing a role.
- Ship dark mode only when the brief, the platform or the existing app asks for it. A half-done dark mode is worse than none.

## Selectors

Support both an explicit choice and the OS preference. The explicit choice wins.

```css
:root { color-scheme: light; /* light semantic tokens */ }

/* explicit choice */
.dark, [data-theme="dark"] { color-scheme: dark; /* dark overrides */ }

/* OS preference when the user has not chosen */
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme="light"]) { color-scheme: dark; /* same dark overrides */ }
}
```

To avoid writing the overrides twice, keep them in one place and use the explicit selector only, letting the
no-flash script (below) set the attribute from the OS preference. That is the usual approach in React apps.

- **`color-scheme`** makes native controls, scrollbars and the default canvas follow the theme. Set it in every theme block.
- **`<meta name="theme-color">`** colours the mobile browser bar. Give one per scheme:
  `<meta name="theme-color" content="#f7f5f2" media="(prefers-color-scheme: light)">` and the dark twin, or update it from the toggle.
- **Tailwind v4:** `@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));` so `dark:` follows your selector instead of only the media query.

## The toggle

- Three states: **System**, Light, Dark. System is the default and the first option.
- Store the choice in `localStorage` (key like `theme`), never in a cookie the server must read unless you render per user.
- Put it where settings live (a settings menu, the footer, the user menu). On marketing pages a small icon button in the header is fine; give it an `aria-label` that names the action ("Switch to dark theme") or use a menu with three options.
- Changing theme must not animate every colour. Disable transitions for one frame while switching:

```js
function setTheme(choice) {               // "system" | "light" | "dark"
  const root = document.documentElement;
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.add("theme-switching");  // .theme-switching * { transition: none !important; }
  root.dataset.theme = dark ? "dark" : "light";
  try { localStorage.setItem("theme", choice); } catch {}
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}
```

## No flash of the wrong theme

Set the attribute before first paint with a tiny blocking script in `<head>`, before any stylesheet that depends on it:

```html
<script>
  (function () {
    try {
      var c = localStorage.getItem("theme") || "system";
      var dark = c === "dark" || (c === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch (e) {}
  })();
</script>
```

- **Next.js App Router:** use `next-themes` (`attribute="data-theme"` or `"class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`) and put `suppressHydrationWarning` on `<html>`. Do not hand-roll a second mechanism next to it.
- Listen for OS changes while on System: `matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ...)`.

## Brand themes and sub-themes

- **Brand or product themes** (white-label, per-workspace accent): a `[data-brand="x"]` selector that overrides only `--accent`, `--accent-hover`, `--accent-subtle`, `--on-accent`, `--focus`. Check each brand accent with `palette_check` against both themes' surfaces.
- **Inverted sections** (a dark band on a light page): put `data-theme="dark"` on the section. Because components read semantic tokens, everything inside re-themes for free. This is the cleanest way to do a dark footer or a dark feature band.
- **Density themes** (compact tables): a `[data-density="compact"]` selector that overrides control heights and padding tokens. Same idea, different family.

## Things that must change with the theme

| Thing | Light | Dark |
|---|---|---|
| Elevation | shadows | lighter surfaces + 1px light ring; shadows only for overlays, deeper and darker |
| Card vs page | card can be lighter or white on tinted page | card always lighter than page; a darker card reads as a hole |
| Accent | as designed | L +5 to 10%, chroma -0.02 to -0.04 so it does not glare |
| Text on accent | usually white | re-check; often near-black on a lighter accent |
| Images and logos | as is | never CSS `invert()` a photo; provide a dark logo variant; put light images in a slightly lighter well |
| Charts | as is | re-derive series colours like the accent; gridlines from the dark border token |
| Body weight | 400 | consider 350-380 on a variable font: light-on-dark reads heavier |
| Focus ring | accent | lifted accent, 3:1 against dark surface |
| Scrim | `oklch(16% 0.01 hue / 0.4-0.5)` | darker, 0.6-0.7 |

## Accessibility settings

- **`prefers-contrast: more`:** bump `--text-muted` toward `--text`, borders to `--border-strong`, drop translucent surfaces.
- **`forced-colors: active`** (Windows High Contrast): do not fight it. Make sure focus uses `outline` (survives) not only `box-shadow` (removed), and icons use `currentColor`.
- **`prefers-reduced-transparency`:** replace frosted/translucent panels with solid surfaces.

## Testing

- Render the same screen in light and dark and compare side by side; dark must look designed, not inverted.
- Run `palette_check` for every text/surface pair in dark separately. Light-mode passes say nothing about dark.
- Switch themes on a page with a focused input, an open menu and a toast; nothing should flash or animate colour.
- Reload in each state with the cache cleared: no flash of the wrong theme.
- `fitcheck_shot` both themes when the fit check comes; the critique covers both.

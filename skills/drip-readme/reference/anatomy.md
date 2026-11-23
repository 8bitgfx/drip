# README anatomy: order, budget and the parts GitHub gives you

The README has one reading order: proof first, then how to start, then how it works, then everything else. Each section earns its place by answering a question a visitor actually has at that point. This file is the skeleton, the first screen in real Markdown, and the rules for the GitHub-specific parts.

## The order

| # | Section | Answers | Form |
|---|---|---|---|
| 1 | Name + one-liner | what is this, is it for me? | `<h1>` or logo, one sentence |
| 2 | Badges | is it alive, what version, what licence? | 3-5 shields in one row |
| 3 | Hero visual | does it actually work, what does it look like? | screenshot, GIF, terminal render or diagram |
| 4 | Install / try | how fast can I see it myself? | 2 lines in a code block |
| 5 | What it does | 3-5 capabilities | each one shown: image, code + output, or table row |
| 6 | Usage | how do I do the common thing? | runnable examples, shortest first |
| 7 | How it works | what happens under the hood? | `flowchart TD` + 3-5 lines |
| 8 | Configuration | what can I change? | a table: key, default, what it does |
| 9 | FAQ / troubleshooting | what goes wrong? | `<details>` per question |
| 10 | Contributing, licence, credits | can I help, can I use it? | one line each, linking out |

Skip any section the project doesn't need. A small library may be 1-6 and 10.

## The first screen in Markdown

````markdown
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-dark.png">
    <img alt="Tally" src="docs/brand/logo-light.png" width="200">
  </picture>
</p>

<p align="center">Tally turns your bank exports into one monthly ledger, offline, in a single command.</p>

<p align="center">
  <a href="…"><img alt="version" src="https://img.shields.io/…"></a>
  <a href="…"><img alt="CI" src="https://img.shields.io/…"></a>
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/…"></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/hero-dark.png">
    <img alt="Tally's ledger view for March with categories and totals" src="docs/readme/hero-light.png" width="830">
  </picture>
</p>

```sh
npm install -g tally-ledger
tally import ~/Downloads/*.csv
```
````

That is the whole first screen. If anything else is above the install, move it down.

## Badges

- 3-5, one row, one style (`?style=flat` or the default, never mixed).
- Order: version, CI status, licence, then at most one usage number.
- Each is a link to the thing it reports.
- `alt` text says what it is ("CI status"), not "badge".

## Alerts

GitHub renders five: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`.

```markdown
> [!WARNING]
> Version 2 renames `--out` to `--output`. Old scripts fail without it.
```

- At most 2 per README. One per section at most.
- Only for things that cost the reader time or data if missed. Never "> [!TIP] Star the repo!".

## `<details>`

```markdown
<details>
<summary>Installing on Windows without WSL</summary>

Steps…

</details>
```

- Leave a blank line after `<summary>` and before `</details>` so the Markdown inside renders.
- Good for: FAQ entries, per-platform installs, the full option list, long logs, older versions.
- Never hide the main install or the hero inside one.

## Headings, anchors, TOC

- Headings say what's below: "Install", "Use it in CI", "How it works". No emoji, no "Features ✨".
- GitHub generates anchors (lowercase, spaces → hyphens, punctuation dropped): `## How it works` → `#how-it-works`. Link to them from other sections and docs.
- GitHub shows an outline menu on every README. Add a manual TOC only when the README runs past ~6 screens, and keep it to the `##` level.

## Code blocks

- Always set the language (` ```sh `, ` ```ts `) for highlighting.
- Commands are runnable as pasted: no `$` prompt, no placeholders without saying so.
- Show output under the command when the output is the proof.

## Skeletons by project type

| Type | Hero | Second screen | Must have |
|---|---|---|---|
| App / web tool | screenshot or ≤ 8 s GIF of the main flow | 3 feature crops | live demo link, self-host install |
| CLI | rendered terminal (PNG/SVG with outlined text) of one real command and its output | 3 commands, each with output | install for each platform, `--help` summary as a table |
| Library | code sample beside what it produces (image or output block) | the 3 most common calls | install, supported versions table, API link |
| Plugin / integration | `flowchart TD` of where it sits + one screenshot in the host app | what it adds, as a table | the host's install command, compatibility |
| Design system / UI kit | a grid of real components, light and dark | tokens table, one component in code | install, theming |

## Repo settings checklist

```sh
gh repo edit --description "A design director for Claude Code" \
  --homepage https://example.com \
  --add-topic claude-code --add-topic design --add-topic plugin
```

- Description ≤ 120 characters, the one-liner without a period.
- 5-10 topics people actually search for.
- Social preview: tell the user to upload a 1280×640 PNG (min 640×320, under 1 MB) in Settings → General → Social preview. There is no API or `gh` command for it.
- These change public settings: confirm with the user before running them.

## Sources

Drip's own work, from GitHub's documented Markdown features (alerts, `<details>`, `<picture>`, heading anchors, the README outline) and the `gh repo edit` command.

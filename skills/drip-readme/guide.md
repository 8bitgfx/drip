# README: a landing page in a narrow column

A good README is judged in the first screen. A visitor lands from a link, a search or a star list, sees the name, one sentence that says what this is and who it's for, and immediately sees it working: a screenshot, a short GIF, a diagram of what happens. Under that sits a two-line install or "try it" and nothing they must read before it. The rest of the page is depth for people who already decided to care: usage by example, a table that compares options, a flowchart of how it fits together, longer material folded into `<details>` or linked docs. It looks right in light and dark mode, on a phone and on a desktop, and it reads like a person wrote it about a specific thing. A README that is a wall of text with emoji bullets and a badge wall is rejected the way a template landing page is: it tells, it doesn't show.

---

## The procedure

1. **Read the repo first.** What the project does (code, existing docs, `package.json`/`pyproject`/`Cargo.toml`), how it's installed and run, what it looks like when it works, who it's for. Read the current README if there is one and list what's true in it.
2. **Write the one-liner** (`drip_guide copy`): what it is + for whom + the one thing it does differently. Under 15 words. The swap test: put a competitor's name on it; if it still works, rewrite.
3. **Decide the hero visual** (`drip_guide readme/visuals`): the single picture that proves the one-liner. Running UI → a screenshot or a ≤ 8 s GIF. CLI → a rendered terminal capture. Library → a code sample next to its output. Plugin/tool chain → a mermaid `flowchart TD`. Capture or stage it (`drip_guide productshots`).
4. **Draft the first screen** to the budget (below). Then everything else, in the anatomy order (`drip_guide readme/anatomy`).
5. **Cut.** Every paragraph over 3 lines: shorten, turn into a list or table, show it as an image, or fold it into `<details>`. Every section a visitor doesn't need on day one: move to `docs/`.
6. **Make every image theme-safe**: `<picture>` with a dark source, or a transparent/neutral image that works on both grounds. Text that needs a webfont: pre-render PNG at 2x, or outline it in the SVG.
7. **Set the repo's presence**: `gh repo edit --description "<one-liner>" --homepage <url> --add-topic <t1> --add-topic <t2>`. Tell the user to upload the 1280×640 social preview in Settings → General → Social preview (there is no API for it). Ask before changing repo settings; they are visible to everyone.
8. **Render it.** Push to a branch and open its GitHub page (only github.com renders alerts, `<picture>`, mermaid and anchors exactly). `fitcheck_shot` at desktop and phone. Look at both themes.
9. **Self-critique** with the slop table below, fix, re-shoot.
10. **The critic**: `critic_prepare({ kind: "any", targets: ["<branch README URL>"], context: "GitHub README for <project>; audience <who>" })` → `Agent drip:critic` with that prompt unchanged → `critic_record`. Fix S0/S1, repeat until PASS (max 3 rounds). Show the user its words.

---

## The craft

### 1. The length budget

| Zone | Budget | Holds |
|---|---|---|
| First screen (~900px tall on desktop) | name, one-liner, ≤ 5 badges, 1 visual, 2-line install | nothing else; no TOC, no "Table of contents", no history |
| Second screen | 3-5 things it does, each shown (image, code, table row), not described | the proof |
| Rest | usage by example, how it works (diagram), configuration (table), FAQ in `<details>`, contributing, licence | depth for the decided |
| Whole README | read in under 3 minutes; ~150-400 lines of Markdown for most projects | longer material lives in `docs/` and is linked |

- Do: "Install: `npm i drip` · Run: `npx drip`" in a code block right under the visual.
- Don't: open with a "Why" essay, a changelog, or a list of every feature.

### 2. Visual first

- **The hero is the product working**, at a size where its text is readable in the README column (about 830 px wide on desktop). A cropped, real capture beats a full-window screenshot shrunk to illegibility.
- **One visual per claim.** Each feature in the second screen gets its proof: a screenshot crop, a code-and-output pair, or a table.
- **Diagrams over architecture prose**: mermaid `flowchart TD`, 5-12 nodes, real names. `LR` squeezes into a strip of tiny boxes in the column; top-down reads.
- **Tables for comparisons** (vs. alternatives, plans, options, config keys). Never a paragraph comparing three things.
- Full detail: `drip_guide readme/visuals`.

### 3. GitHub's rendering, in short

| Feature | Use for | Rule |
|---|---|---|
| `<picture>` + `prefers-color-scheme` | any image with a background or text | light and dark sources, `<img>` fallback with `alt` |
| Alerts `> [!NOTE]` `[!TIP]` `[!IMPORTANT]` `[!WARNING]` `[!CAUTION]` | something that will bite (a breaking change, a required key) | at most 2 per README; never for marketing |
| `<details><summary>` | FAQ, long options, platform-specific installs, logs | the summary is a full question or label |
| Mermaid code block | flows, architecture, state | `flowchart TD`; short labels |
| Tables | comparisons, config, commands | ≤ 5 columns so it fits the column |
| Heading anchors | linking sections | generated automatically; GitHub also shows an outline menu, so a manual TOC only past ~6 screens |
| `align="center"` on `<p>`/`<img>` | a centred hero block | GitHub strips `style`, classes and scripts; `align`, `width` and `height` survive |

### 4. Badges

3-5, in one row, from one source (shields.io) in one style. Each answers a question the visitor has: is it maintained (CI), what version, what licence, how many people use it (downloads, only if the number helps). Never: "made with love", "PRs welcome", social follower counts, a row of every language and tool used.

### 5. Copy

The README is copy (`drip_guide copy`): specific nouns, verbs that do things, numbers only when they're real and sourced. Headings say what's under them ("Install", "Use it from the CLI", "How it works"), not "✨ Features". Code blocks are runnable as pasted, with the language set for highlighting.

### 6. Repo presence

| Where | What | How |
|---|---|---|
| Description | the one-liner, ≤ 120 characters | `gh repo edit --description "…"` |
| Homepage | the site or docs | `gh repo edit --homepage https://…` |
| Topics | 5-10 real search terms people type | `gh repo edit --add-topic cli --add-topic design` |
| Social preview | 1280×640 PNG (min 640×320, under 1 MB): name, one-liner, the hero visual | manual: Settings → General → Social preview; no API |

---

## Slop tells in READMEs (and the fix)

| Tell | Fix |
|---|---|
| Wall of text before any visual | First screen = one-liner + visual + install |
| Emoji bullets, "🚀 Features", "✨ Highlights", "📦 Installation" | Plain headings that say what's below |
| Badge wall (10+ badges, two rows) | 3-5 that answer real questions |
| Fake or unsourced stats ("10x faster", "used by 1000s") | Real benchmark with a link, or nothing |
| Generic tagline ("A blazing-fast, modern, lightweight…") | One-liner with what, for whom, what's different |
| Feature list of 20 bullets, nothing shown | 3-5 features, each with its proof |
| Screenshot of the whole desktop, text unreadable | Crop to the part that matters, 2x, readable at column width |
| Dark screenshot with a white box around it in dark mode | `<picture>` with a dark source, or transparent edges |
| Mermaid `flowchart LR` with 12 nodes in a thin strip | `flowchart TD`, fewer nodes |
| A banner whose text renders in Times (SVG with a webfont) | Pre-rendered 2x PNG, or outlined SVG text |
| A 40 s, 20 MB GIF of someone typing | ≤ 8 s, cropped, ≤ 5 MB, starts on the payoff |
| Alerts on every section | ≤ 2, only for what bites |
| Manual TOC on a 2-screen README | Delete it; GitHub's outline menu covers it |
| "Contributions welcome! ❤️" as the longest section | One line linking CONTRIBUTING.md |

---

## Done when

- [ ] The first screen holds only name, one-liner, ≤ 5 badges, one visual of the product working, and a 2-line install.
- [ ] No prose paragraph over 3 lines; comparisons are tables; architecture is a `flowchart TD`.
- [ ] Every image works in light and dark; text in images is pre-rendered PNG at 2x or outlined.
- [ ] GIFs are ≤ 8 s, cropped, ≤ 5 MB.
- [ ] No slop tells from the table remain.
- [ ] Description, topics and homepage are set (with the user's OK); the user was told to upload the 1280×640 social preview.
- [ ] The rendered page was shot at desktop and phone, in both themes, and the critic passed it (or 3 rounds ran and what's left is listed).

---

## Reference files

- `readme/anatomy` — section order, the first screen in Markdown, badges, alerts, `<details>`, TOC rules, worked skeletons for an app, a CLI, a library and a plugin.
- `readme/visuals` — hero choices per project type, capturing and sizing, `<picture>` light/dark, GIF recipe, mermaid, rendering text into images, the social preview.

Related guides: `drip_guide productshots` (capturing and staging the product), `drip_guide copy` (the one-liner and every heading), `drip_guide fitcheck` (the rendered check and the critic).

## Sources

Drip's own work, written from GitHub's documented Markdown features (alerts, `<picture>` with `prefers-color-scheme`, mermaid, `<details>`, the social preview settings) and the `gh` CLI. Craft rules shared with Drip's **copy** and **productshots** guides, which credit their own sources.

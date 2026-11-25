---
name: drip-readme
description: README rules for GitHub - first screen, length budget, light and dark images, badges, diagrams, GIFs, social preview and repo description. Use when writing, redesigning or reviewing a README or a repo's public presence ("make the repo look good", "our README is a wall of text").
user-invocable: false
---

# README (Drip)

Applies to any README or repo front page. Call `drip_guide readme` for the full rules; it records the read. (Not in your tools? ToolSearch `select:mcp__plugin_drip_drip__drip_guide`.)

- The first screen holds the name with a one-line "what it is", one visual of the product working, and a 2-line install or try-it.
- Show, don't tell: a screenshot, GIF or diagram replaces any paragraph that describes what it looks like or does.
- Every image with a background ships as a `<picture>` with a dark source; badges 3-5; diagrams are mermaid `flowchart TD`.
- No slop: no emoji bullets, fake stats or generic taglines. Look at the rendered GitHub page, never the Markdown source.

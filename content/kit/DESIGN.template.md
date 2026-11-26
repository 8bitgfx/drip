# DESIGN.md — <project name>

<!-- Drip's DESIGN.md template (playbook P22). About 150-250 words above the tokens. The critic reads this
     file as the LOCKED DIRECTION: write rules it can check. fitcheck_lint compares the colours and fonts
     below with the CSS, so keep them in sync (one source of truth: the tokens). -->

**THESIS** — one sentence a competitor could not say. (e.g. "A ceramics studio that shows every glaze test, failed ones first.")

**WORLD** — the material the page is made of. (paper and pencil marks / product UI / photographs of the workshop / ...)

**STORY** — the 6-9 sections in order, one line each, with what each SHOWS (a picture in every section).

**FIRST VIEWPORT** — h1 at the Display role (~127px at 1440) over N columns; picture over N columns, ~N px tall; where the action sits.

**SIGNATURE** — the one move people will remember (a drag, a reveal, a scale, a material).

**REFUSES** — what this direction never does (e.g. "no second accent", "no cards with shadows", "no mono labels").

## Colour (roles)

| Role | Hex | Share |
|---|---|---|
| ground | #...... | ~60% |
| ink | #...... | text |
| accent | #...... | actions and one signal only |
| band | #...... | the contrasting band in the second half |

## Type

- Display: <family> <weight>, the 7 roles from `drip-base.css` (Display 127 · Statement 72 · Section 56 · Item 26 · Lead 21 · Body 18 · Small 14 at 1440)
- Text: <family> <weights>
- Never: an eighth size, mono outside code, tracked caps labels.

## Motion

- One entrance on load (`.enter`, 3-5 hero elements). <the signature interaction, if any>. Respect reduced motion.

## Pivots and centring

- The mark centres on its BODY, not its bounding box (optical_center): <offset, transform-origin>.

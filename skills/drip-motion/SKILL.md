---
name: drip-motion
description: Use when adding, tuning or reviewing motion of any kind - animate, transition, enter/exit, stagger, spring, easing, duration, AnimatePresence, Motion (Framer Motion), GSAP, @starting-style, view transitions, scroll effects, "feels janky", "feels slow", reduced motion. Part of Drip; covers whether something should move at all, which property, which curve, how groups move together, and keeping it inside the frame budget.
---

# Motion (Drip)

**Before you do anything: call `drip_guide` with topic `motion`.** It returns the full guide and records the read;
the Drip hooks block writing UI files until it is read. No Drip task yet? Call `drip_start` first.

## Rules you must not break
1. Decide whether it should move before choosing a curve. Anything used 100+ times a day, and anything a keyboard shortcut triggers, gets no animation.
2. Name the purpose in one word (feedback, continuity, state, relationship, explanation, delight) or do not build it. Delight only on rare, first-time moments.
3. Animate `transform` and `opacity`. `clip-path` and small `filter` blurs are allowed; never `width`, `height`, `top`, `left`, `margin`, `padding` (accordion height is the one tolerated exception).
4. Never `transition: all` / `transition-all`. Name the properties.
5. Never `ease-in` on UI and never the browser's built-in `ease-out` for authored motion: use `cubic-bezier(0.23, 1, 0.32, 1)` for enter/exit, `cubic-bezier(0.77, 0, 0.175, 1)` for on-screen travel, `linear` only for progress and loops.
6. UI motion stays at 100-300ms (press 100-160, tooltip 125-200, menu 150-250). Modals 200-300, sheets and drawers up to 500, toasts ~400. Exits are faster than enters (about 75%).
7. Never enter from `scale(0)`. Start at `scale(0.95-0.97)` + `opacity: 0`. Popovers scale from their trigger (`transform-origin` at the anchor); modals stay centred.
8. Rapidly re-triggered UI (toggles, toasts, hover) uses transitions or springs, never keyframes: it must reverse from where it is.
9. One entrance per container. Do not animate a panel in and then stagger its children. Stagger 30-80ms in product UI, non-uniform, whole group done in about 300ms.
10. No scroll reveals, parallax or scroll-jacking in product UI. Marketing pages get at most one scroll-tied moment, fired once, with content readable without it.
11. Ship `prefers-reduced-motion` with the animation: drop movement and stagger, keep opacity and colour changes that carry meaning.
12. Hover motion only under `(hover: hover) and (pointer: fine)`; never move the hovered element out from under the pointer.

## Numbers at a glance
| What | Value |
|---|---|
| Press / hover / tooltip | 100-160ms / 100-150ms / 125-150ms |
| Menu, popover / modal / sheet / toast | 150-200ms / 200-250ms / 300-500ms / ~400ms |
| Enter-from | `opacity: 0` + `scale(0.96)` or `translateY(6-8px)` |
| UI spring (Motion) | `{ type: "spring", duration: 0.35, bounce: 0 }`; drag release bounce 0.1-0.25 |
| Stagger | 30-80ms product, 80-120ms marketing hero; cap after item 6 |

## Tools
- `components_find` — before hand-building a toast, drawer, dialog or animated text: a library (Sonner, Vaul, Animate UI, Motion Primitives) usually already moves correctly.
- `components_get` — read the motion code of a candidate before installing; reject anything with `transition-all`, `scale(0)` or bounce on UI.
- `fitcheck_lint` — static check for `transition: all`, layout-property animation, missing reduced-motion blocks.
- `fitcheck_shot` — capture states before and after the motion; judge the resting frames too.
- `fitcheck_done` — required before ending a turn that changed UI.

## Read deeper when
| Situation | Call |
|---|---|
| Picking a curve, duration or spring config; Tailwind v4 / Motion tokens | `drip_guide motion/easing` |
| Several things move on one event: lists, hero entrance, view swap, removal | `drip_guide motion/choreography` |
| Jank, dropped frames, `will-change`, CSS vs JS, Motion under load | `drip_guide motion/performance` |
| Building a common piece: dropdown, modal, sheet, toast, accordion, tab indicator, number change | `drip_guide motion/recipes` |
| Press, hover, focus and overlay timing (not motion as such) | `drip_guide interaction` |

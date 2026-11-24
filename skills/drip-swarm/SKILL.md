---
name: drip-swarm
description: Use when a Drip task runs in Swarm Mode (drip_start with mode "swarm", or swarm on in the config): you are the director and cheap subagents scout references, build sections and measure the page while you keep the decisions. Covers who does what, how to brief each agent with scout_prepare, build_prepare and checker_prepare, and what to do on hosts without subagents. Part of Drip.
user-invocable: false
---

# Swarm Mode (Drip)

**Before you do anything: call `drip_guide` with topic `swarm`.** It has the roles, the order and the rules for each brief.
If the Drip tools are not loaded: ToolSearch `+drip scout`, `+drip build_prepare` and `+drip checker`.

You are the **director**: brief, thesis, picks, direction specs, choosing, triaging the critic's fixes, the final look. Everything that is
reading, typing or measuring goes to an agent: `drip:scout` (Haiku), `drip:builder` (Sonnet), `drip:checker` (Haiku). The critic stays the critic.

## Rules you must not break
1. Every subagent gets exactly the prompt its `*_prepare` tool returned. Never edit it, never add your own taste or defence to it.
2. Scouts run in parallel, one per role, in one message. They study through `refs_study`, so the research gates count their work; you still read their three and decide what to take.
3. Directions, the choice, the system and every section spec are yours. A builder gets a spec with real copy and layout; never "make a nice pricing section".
4. After each built section run the checker, fix its blockers, then move on. Taste is the critic's job, measuring is the checker's.
5. Never let an agent review its own work in the critic's place.
6. On a host without Drip's named subagents, do the same steps yourself in order (see the guide).

## Tools
`scout_prepare` · `build_prepare` · `checker_prepare` · then the usual `critic_prepare`.

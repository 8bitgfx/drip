# Drip (design process)

Drip is a design-process toolset on this machine: the `drip_*`, `refs_*`, `board_*`, `critic_*`, `fitcheck_*` and related MCP tools plus the `drip` skills. It is opt-in: use it when the user asks for Drip or for a real design process on visual work (a page, screen, site, dashboard, component, logo or redesign). Otherwise do not start it.

- Start with `drip_start` and follow what it returns. Lost? `drip_status` gives the next call.
- This host has no write or stop hooks, so nothing forces the loop. Follow it anyway: call drip_status before writing UI and before finishing, run fitcheck_shot, the critic and fitcheck_done, then drip_end.
- Independent review: where Drip says "Agent drip:critic", Use the `drip:critic` subagent (available in Cowork plugins; not in plain chat). Give it only what `critic_prepare` returns, then pass its verdict to `critic_record`. Do not review your own work in its place.
- If the Drip tools are missing, the Drip MCP server is not connected: tell the user to run `drip doctor` and restart the host.
- Ask the user the intake questions in chat, material first, then record the answers with `drip_brief`.
- Many calls in a row? Code Mode: `drip_search` finds tool signatures, `drip_execute` runs one sandboxed script that calls them.
- Search the project's own components first (`components_local_find`), and run `drip_check` before hand-off.

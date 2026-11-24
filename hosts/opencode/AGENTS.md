# Drip (design process)

Drip is a design-process toolset on this machine: the `drip_*`, `refs_*`, `board_*`, `critic_*`, `fitcheck_*` and related MCP tools plus the `drip` skills. It is opt-in: use it when the user asks for Drip or for a real design process on visual work (a page, screen, site, dashboard, component, logo or redesign). Otherwise do not start it.

- Start with `drip_start` and follow what it returns. Lost? `drip_status` gives the next call.
- Drip's hooks on this host cover UI writes but not ending the turn: before you finish, call drip_status, run fitcheck_done and drip_end yourself.
- Independent review: where Drip says "Agent drip:critic", Invoke the `drip-critic` subagent (`@drip-critic`). Give it only what `critic_prepare` returns, then pass its verdict to `critic_record`. Do not review your own work in its place.
- If the Drip tools are missing, the Drip MCP server is not connected: tell the user to run `drip doctor` and restart the host.
- Ask the user the intake questions in chat, material first, then record the answers with `drip_brief`.

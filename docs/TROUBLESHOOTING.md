# Troubleshooting

Check the Drip server first: run `/mcp` in Claude Code. `plugin:drip:drip` should be **connected**.

| Symptom | Cause | Fix |
|---|---|---|
| "Drip tools aren't available" / `plugin:drip:drip` failed, and its log says `'node' is not recognized` | The session was started with a PATH that doesn't contain Node.js (seen in some Claude desktop scratch sessions) | Install Node 20+ so `node` is on the system PATH, then fully quit and reopen the Claude app. Open a project folder rather than a scratch session. |
| Drip disconnected right after updating the plugin | Updating replaces the plugin files under running sessions | Restart Claude Code (or `/reload-plugins`), or reconnect `plugin:drip:drip` in `/mcp`. A failed connection is cached for ~15 minutes; reconnecting from `/mcp` skips the wait. |
| Two Drip servers, one stuck "pending approval" (Drip 0.2.0 and earlier, inside the Drip repo) | The plugin's root `.mcp.json` was also read as a project config | Fixed in 0.2.1 (the server is declared inside `plugin.json`). Update the plugin. |
| Claude says it can't find `drip_start` although `/mcp` shows Drip connected | Plugin tools load on demand under their full names | Drip's skills and commands tell Claude to run ToolSearch `select:mcp__plugin_drip_drip__drip_start,…`. If an agent still guesses wrong, tell it: "load the Drip tools with ToolSearch `+drip`". |
| `refs_view` shows only the cover image, or Dribbble results stop | Dribbble rate-limits shot pages after a few views a minute | Drip backs off and falls back to the image; space out heavy research runs. |
| No screenshots or previews | No Chrome or Edge found | Install Chrome or Edge, or set `fitcheck.chromePath` in `.drip/config.json`. |
| Drip blocked a write you wanted | A Drip task is open and its requirements aren't met | `/drip:settings` shows what's missing and can turn the checks off or end the task. |

## Checking from a terminal

```
claude mcp list          # plugin:drip:drip should say Connected
claude plugin validate <path-to-drip>
```

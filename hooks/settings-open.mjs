// /drip:settings without the model: the prompt hook catches the command, starts the settings page in its own background
// process (the Drip CLI, which stops by itself after an hour) and answers with the link. Nothing reaches the model.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "mcp", "dist", "drip-mcp.mjs");

/** True when the prompt is the settings command (with or without the plugin prefix). */
export const isSettingsCommand = (prompt) => /^\s*\/drip:settings\s*$/i.test(String(prompt || "")) || /<command-name>\/?drip:settings<\/command-name>/i.test(String(prompt || ""));

/** Starts the page, opens the browser, and returns its URL (or null if it didn't come up within a few seconds). */
export async function openSettingsInBackground(projectDir, { waitMs = 8000 } = {}) {
  const log = path.join(os.tmpdir(), `drip-settings-${Date.now().toString(36)}.log`);
  const fd = fs.openSync(log, "w");
  const child = spawn(process.execPath, [CLI, "settings", "--ttl", process.env.DRIP_SETTINGS_TTL || "60", ...(projectDir ? ["--project", projectDir] : [])], { detached: true, stdio: ["ignore", fd, fd], windowsHide: true, env: { ...process.env } });
  child.unref();
  fs.closeSync(fd);
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 150));
    const m = fs.existsSync(log) && fs.readFileSync(log, "utf8").match(/https?:\/\/127\.0\.0\.1:\d+\/\?t=[0-9a-f]+/);
    if (m) return m[0];
  }
  return null;
}

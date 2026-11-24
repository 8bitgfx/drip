// API keys. Looked up in this order: environment variable, then ~/.drip/keys.json (outside every repo,
// readable only by you). Values are never returned to Claude or written to logs.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, homeDripDir } from "./paths.mjs";

export const KEY_ENV = {
  openai: ["OPENAI_API_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
  unsplash: ["UNSPLASH_ACCESS_KEY"],
  pexels: ["PEXELS_API_KEY"],
  openverse: ["OPENVERSE_TOKEN"],
  pixabay: ["PIXABAY_API_KEY"],
};

const file = path.join(homeDripDir, "keys.json");

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export function getKey(name) {
  for (const env of KEY_ENV[name] || [`${name.toUpperCase()}_API_KEY`]) if (process.env[env]) return process.env[env];
  return readFile()[name] || null;
}

export function setKey(name, value) {
  ensureDir(homeDripDir);
  const keys = readFile();
  if (value) keys[name] = value.trim();
  else delete keys[name];
  fs.writeFileSync(file, JSON.stringify(keys, null, 2), { mode: 0o600 });
}

/** Which keys are set and where from (never the values). */
export function keyStatus(names) {
  const stored = readFile();
  return names.map((n) => {
    const env = (KEY_ENV[n] || []).find((e) => process.env[e]);
    return { name: n, set: !!(env || stored[n]), from: env ? `env ${env}` : stored[n] ? "~/.drip/keys.json" : null };
  });
}

export function logUsage(entry) {
  ensureDir(homeDripDir);
  fs.appendFileSync(path.join(homeDripDir, "usage.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

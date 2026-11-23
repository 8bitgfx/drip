// Settings, merged in this order (later wins):
//   built-in defaults  <  ~/.drip/config.json  <  <project>/.drip/config.json
// No dependencies: hooks import this file directly. See docs/CUSTOMISE.md.
import fs from "node:fs";
import path from "node:path";
import { homeDripDir, projectDripDir } from "./paths.mjs";

export const DEFAULTS = {
  // Turn whole tool groups on or off.
  modules: { refs: true, board: true, components: true, assets: true, gen: true, fitcheck: true },

  // What the hooks enforce. Set enforce:false to make Drip advisory only.
  gates: {
    enforce: true,
    minRefsViewed: 6,        // shots opened full size (refs_view) before UI is written, full loop
    minBoardItems: 8,        // items on the moodboard before a direction can be chosen
    requireDirection: true,  // a direction must be chosen before UI is written, full loop
    requireFitcheck: true,   // Claude can't end its turn after UI changes without a fit check
  },

  // Which files count as UI. Matched against the file path.
  uiFiles: "\\.(tsx|jsx|vue|svelte|astro|html|css|scss|sass|less)$",
  // Paths that are never gated (tests, stories, generated files).
  ignoreFiles: "(node_modules|\\.drip|dist|build|\\.next|__tests__|\\.test\\.|\\.spec\\.|\\.stories\\.)",

  // Words in a prompt that mean "this is design work" (the prompt hook reminds Claude to start Drip).
  designWords: "\\b(design|redesign|landing|hero|page|screen|component|ui|ux|layout|dashboard|navbar|header|footer|pricing|onboarding|modal|card|form|theme|style|restyle|look|polish|pretty|beautiful|ugly|mid)\\b",

  refs: { delayMs: 1100, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" },

  board: { port: 4567 },

  gen: {
    defaultProvider: "openai",
    providers: {
      openai: { model: "gpt-image-1" },
      gemini: { model: "gemini-2.5-flash-image" },
    },
  },

  fitcheck: {
    sizes: [
      { name: "phone", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 900 },
    ],
    chromePath: "",
  },
};

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function merge(base, over) {
  if (Array.isArray(over) || typeof over !== "object" || over === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : v;
  return out;
}

export function loadConfig(cwd) {
  const global = readJson(path.join(homeDripDir, "config.json"));
  const project = readJson(path.join(projectDripDir(cwd), "config.json"));
  return merge(merge(DEFAULTS, global), project);
}

// Settings, merged in this order (later wins):
//   built-in defaults  <  ~/.drip/config.json  <  <project>/.drip/config.json
// No dependencies: hooks import this file directly. See docs/CUSTOMISE.md.
import path from "node:path";
import { readJson } from "./jsonstore.mjs";
import { homeDripDir, projectDripDir } from "./paths.mjs";

export const DEFAULTS = {
  // Turn whole tool groups on or off.
  modules: { refs: true, board: true, components: true, assets: true, gen: true, fitcheck: true, critic: true, logo: true, packs: true, project: true },

  // What the hooks enforce.
  //   mode "task"   (default) Drip only acts while a Drip task is active (/drip:ui or drip_start).
  //                 Without a task the hooks stay silent: no blocking, no nudges, no lint.
  //   mode "always" every UI write needs a Drip task (strict; for teams that want it on every change).
  //   enforce:false advisory only: the tools and guides work, nothing is blocked.
  gates: {
    mode: "task",
    enforce: true,
    requireBrief: true,      // full loop: the user's answers recorded with drip_brief
    minRefsStudied: 4,       // full loop: references studied with refs_study before UI is written
    minDesigners: 3,         // ...from at least this many different designers
    minStyle: 2,             // full loop: studied references for the look you're aiming for (role "style")
    minCompetitors: 2,       // full loop: similar products' shipped sites (role "competitor")
    minPage: 2,              // full loop: the same kind of page you're making (role "page")
    freshLooks: true,        // board_directions refuses faces and palettes Drip just used in other projects
    minOnSurface: 3,         // ...and at least this many must show the thing being built (real landing pages, app screens), not print or objects
    minBoardItems: 4,        // items on the moodboard before directions can be formed
    requireDirection: true,  // a direction must be chosen before UI is written, full loop
    requireCritic: true,     // full loop: one drip:critic reality check on the final build (directions are ranked by the director)
    maxCriticRounds: 1,      // the critic is slow: one round at the final version, then hand off with what's left
    fastCritic: false,       // fast loop: the critic is optional (the user asks for it); true makes drip_end wait for one review
    requireFitcheck: true,   // Claude can't end its turn after UI changes without a fit check
  },

  // Which files count as UI. Matched against the file path.
  uiFiles: "(\\.(tsx|jsx|vue|svelte|astro|html|css|scss|sass|less)$|(^|/)README\\.md$)",
  // Paths that are never gated (tests, stories, generated files).
  ignoreFiles: "(node_modules|\\.drip|dist|build|\\.next|__tests__|\\.test\\.|\\.spec\\.|\\.stories\\.)",

  // Words in a prompt that mean "this is design work" (the prompt hook reminds Claude to start Drip).
  designWords: "\\b(design|redesign|landing|hero|page|screen|component|ui|ux|layout|dashboard|navbar|header|footer|pricing|onboarding|modal|card|form|theme|style|restyle|look|polish|pretty|beautiful|ugly|mid)\\b",

  refs: { delayMs: 800, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" },

  board: { port: 4567 },

  // Swarm Mode: the main agent directs; cheap subagents scout, build and re-check (drip_start swarm: true per task).
  swarm: true,
  // fast: look, deal, build, check once, critic once. full: the old process (intake, roles, comps, plan) for big brand work.
  loop: "fast",
  // core: the fast loop's tools are listed, every other tool through drip_search / drip_execute. all: list every tool.
  tools: "core",

  // Project design memory (docs/PROJECT_MEMORY.md).
  //   freshDays      a study older than this is not carried into a new task as inherited evidence
  //   contextChars   size of the compact project context drip_start and session start print
  memory: { freshDays: 90, contextChars: 1800 },

  // Opt-in Git sharing of the design memory (boards, decisions, project skill, patterns metadata, packs).
  //   boards:true   track board metadata, boards/index.json, memory/decisions.json, the project skill, packs, patterns metadata
  //   feedback:true also track memory/feedback.jsonl (personal by default)
  //   assets:true   also track small images saved under boards/<id>/assets
  // Apply it with board_project({ share: true }) or by editing .drip/config.json; both rewrite .drip/.gitignore.
  share: { boards: false, feedback: false, assets: false },

  gen: {
    defaultProvider: "openai",
    providers: {
      openai: { model: "gpt-image-1" },
      gemini: { model: "gemini-2.5-flash-image" },
    },
  },

  fitcheck: {
    sizes: [
      { name: "phone", width: 375, height: 812 },
      { name: "desktop", width: 1440, height: 900 },
    ],
    chromePath: "",
  },
};

/** Merges `over` into `base` key by key (objects recursively; arrays and scalars replace). */
export function merge(base, over) {
  if (Array.isArray(over) || typeof over !== "object" || over === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : v;
  return out;
}

export function loadConfig(cwd) {
  const global = readJson(path.join(homeDripDir, "config.json"), {});
  const project = readJson(path.join(projectDripDir(cwd), "config.json"), {});
  return merge(merge(DEFAULTS, global), project);
}

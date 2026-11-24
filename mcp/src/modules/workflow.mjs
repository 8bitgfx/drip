// The process tools: start a task, read guides, see what is left, skip, finish.
// These are what make Drip enforce the designer loop instead of hoping Claude reads a skill.
import { z } from "zod";
import { listGuides, normalizeTopic, readGuide, subTopics } from "../core/guides.mjs";
import { checklist, loadState, missingBeforeUi, newTask, otherTasks, updateState } from "../core/state.mjs";
import { serveDir } from "../core/serve.mjs";
import { warmBrowser } from "../core/browser.mjs";
import { relevantSkills } from "../core/skills.mjs";
import { getKey } from "../core/keys.mjs";
import { text } from "../core/result.mjs";
import { matchPacks } from "../core/packs.mjs";
import fs from "node:fs";
import path from "node:path";
import { kitDir, projectDir } from "../core/paths.mjs";

const SURFACE_WORDS = {
  landing: /\b(landing|marketing|homepage|home page|hero|website|site|pricing page|waitlist|portfolio|company)\b/i,
  app: /\b(dashboard|admin|app|table|settings|crm|analytics|panel|console|inbox|editor|tool)\b/i,
  mobile: /\b(mobile|phone|ios|android|pwa|app screen|bottom sheet)\b/i,
  component: /\b(component|button|card|modal|dialog|navbar|nav|header|footer|form|input|dropdown|menu|tooltip|toast|tabs|sidebar)\b/i,
};

const TOPIC_WORDS = {
  color: /\b(colou?r|palette|dark mode|theme|gradient|contrast)\b/i,
  type: /\b(font|type|typography|heading|text size)\b/i,
  layout: /\b(layout|spacing|grid|align|responsive|breakpoint|density)\b/i,
  motion: /\b(anim|motion|transition|stagger|scroll effect)\b/i,
  interaction: /\b(hover|press|focus|drag|popover|tooltip|interaction)\b/i,
  icons: /\b(icon)\b/i,
  copy: /\b(copy|text|headline|wording|microcopy|label)\b/i,
  imagery: /\b(image|photo|illustration|picture|hero image|3d)\b/i,
  a11y: /\b(a11y|accessib|screen reader|keyboard)\b/i,
  components: /\b(component|library|shadcn)\b/i,
};

const FULL_WORDS = /\b(new|design|redesign|build|create|make|landing|page|screen|site|dashboard|from scratch|revamp|overhaul)\b/i;
const QUICK_WORDS = /\b(tweak|fix|adjust|nudge|small|slightly|change the|bump|align|rename|padding|margin)\b/i;

function guess(task) {
  const surface = Object.entries(SURFACE_WORDS).find(([, re]) => re.test(task))?.[0] || "other";
  const size = QUICK_WORDS.test(task) && !/\b(new|redesign|from scratch)\b/i.test(task) ? "quick" : FULL_WORDS.test(task) ? "full" : "quick";
  return { surface, size };
}

const LOGO_WORDS = /\b(logo|logotype|wordmark|lettermark|monogram|brand mark|brandmark|icon for|app icon|identity|branding)\b/i;
const REFS_ONLY = /\b(just|only)\b.{0,20}\b(refs|references|inspiration)\b|^\s*(find|show|get)\b.{0,30}\b(references|inspiration)\b/i;
const BOARD_ONLY = /\b(just|only)\b.{0,20}\bmood ?board\b|^\s*(make|build|create)\b.{0,15}\bmood ?board\b/i;

function guessMode(task) {
  if (BOARD_ONLY.test(task)) return "board";
  if (REFS_ONLY.test(task)) return "refs";
  if (LOGO_WORDS.test(task)) return "logo";
  return null;
}

const PERSUADE = (surface, mode) => ["landing", "other"].includes(surface) && !["logo", "refs", "board"].includes(mode);

// What must be read before UI is written. Kept small on purpose: the playbook carries the numbers; deep guides are on demand.
function requiredGuides(size, surface, task, mode, packs) {
  const g = [];
  if (mode === "refs") g.push("refs");
  else if (mode === "board") g.push("refs", "moodboard");
  else if (mode === "logo") g.push("logo");
  else if (PERSUADE(surface, mode)) g.push("playbook");
  else if (size === "full") g.push("rules/hard-rules", { app: "app", mobile: "mobile", component: "components" }[surface] || "layout");
  else {
    const topics = Object.entries(TOPIC_WORDS).filter(([, re]) => re.test(task)).map(([t]) => t);
    g.push("rules/hard-rules", ...(topics.length ? topics.slice(0, 2) : ["polish"]));
  }
  for (const p of packs) g.push(`pack:${p}`);
  return [...new Set(g)];
}

export function nextStep(task, config) {
  if (task.size === "full" && config.gates.requireBrief && !task.brief) return "NEXT: ask the intake questions (AskUserQuestion, up to 4, material first; see INTAKE), then drip_brief with the answers.";
  const missing = missingBeforeUi(task, config);
  if (missing.length) return `NEXT: ${missing[0].how}.`;
  if (task.mode === "refs") return "NEXT: summarise what the studied references have in common and where they differ (6-10 lines), then offer a moodboard.";
  if (task.mode === "board") return "NEXT: board_open, present the critic-ranked directions with your pick, ask the user to choose with buttons. Then drip_end.";
  if (task.size === "full" && !task.system)
    return task.mode === "logo"
      ? "NEXT: sketch 12-20 concepts and render them with logo_sheet."
      : PERSUADE(task.surface, task.mode)
        ? "NEXT: drip_kit (copies kit/base.css), fill in faces and colours from the direction, write DESIGN.md (playbook P22), drip_mark system."
        : "NEXT: write DESIGN.md + tokens from the chosen direction (drip_kit for the type roles and floor), then drip_mark system.";
  if (PERSUADE(task.surface, task.mode) && task.size === "full" && !task.fitcheck?.heroPassedAt)
    return "NEXT: plan the sections (playbook P23), then build the nav + hero ONLY and run fitcheck_shot({ url, hero: true }). No section before the hero gate passes.";
  return "NEXT: build the sections in plan order. Then fitcheck_shot (the page gate), fix every blocker, the critic once (critic_prepare kind 'build' -> Agent drip:critic -> critic_record), one confirming round, fitcheck_done.";
}

const INTAKE = `INTAKE (do this now): read the project first, then ask ONE round of up to 4 questions with AskUserQuestion, options specific to this request (never generic), your recommendation first.
1. MATERIAL (always): what can the page show? e.g. "Real screenshots/photos I'll give you" / "The work itself, rebuilt in HTML" / "Generate pictures" / "Nothing yet: leave labelled slots".
2. The one action, or who it's for, only if unclear: 2-4 concrete readings.
3. Feel: 3-4 OPPOSED options, each a vivid one-liner of what the first screen looks like. Add "Surprise me (bold)".
4. Anything they love or hate (sites, colours, fonts) when it would change the direction.
Skip what the request already answers. "Just do it" / "decide for me": skip all and state assumptions. Then drip_brief. Default ambition is BOLD unless they asked for plain.`;

/** A concrete research plan: shipped sites first (measured), Dribbble only for gaps. */
function refPlan(task, surface, mode) {
  const subject =
    task
      .toLowerCase()
      .replace(/\b(design|redesign|make|build|create|me|my|our|a|an|the|for|please|new|site|website|web|page|landing|homepage|portfolio|app|screen|logo|for an?)\b/g, " ")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "product";
  if (mode === "logo")
    return `REFERENCE PLAN (logo): refs_tag "logo design" and "wordmark", refs_tag "${subject.split(" ")[0]} logo", then refs_designer on the 2-3 best identity designers you find. Keyword search is weak for logos; tags and designers are strong.`;
  if (PERSUADE(surface, mode))
    return (
      `REFERENCE PLAN (fast, ~2 calls): refs_site with 3-4 SHIPPED sites in this category or a notch above it (${/portfolio/i.test(task) ? "studio, designer and artist portfolios you know are strong" : "the best product and brand sites in this space you know"}), ` +
      "in one call; it measures their h1, h2 and body px. Then refs_study them all in one call. Only if a gap remains (a section type, a motion idea): refs_tag one Dribbble tag, refs_view 1-2, refs_study."
    );
  const kind = surface === "app" ? "dashboard" : surface === "mobile" ? "mobile app" : surface === "component" ? "ui component" : "website";
  return (
    `REFERENCE PLAN: refs_site on 1-2 shipped products with a strong ${kind} (real screens, measured), then refs_tag "${kind}" and refs_search "${subject} ${kind}" category "product-design"; ` +
    "refs_view the 2-3 best in one call and refs_study them in one call. Refer to shots by their tagged number (L3-7)."
  );
}

const TALK = `TALK: decisions first, 3-6 short lines per message; show (board link, screenshots) instead of describing; one question at a time with buttons; never paste tool output.`;

export function register(server, ctx) {
  server.registerTool(
    "drip_start",
    {
      title: "Start a design task",
      description:
        "Start a Drip design task (the user ran /drip:design or asked for Drip / a proper design process): a new page, screen, component, redesign, or a polish pass. " +
        "It decides the loop (full for new/redesigned UI, quick for tweaks) and returns the one guide you need (the playbook for pages) in full, so no extra reads. " +
        "While the task is open, the plugin blocks writing UI files until its requirements are met; close it with drip_end.",
      inputSchema: {
        task: z.string().describe("What you are designing, in the user's words plus context. e.g. 'portfolio site for Claude', 'logo for a bakery called Crumb', 'polish the pricing cards'"),
        mode: z.enum(["design", "logo", "refs", "board", "polish"]).optional().describe("design = new UI/redesign; logo = logo/wordmark/identity; refs = references only; board = moodboard only; polish = tweak existing UI. Omit to let Drip decide."),
        size: z.enum(["full", "quick"]).optional().describe("Overrides the loop size. Omit normally."),
        surface: z.enum(["landing", "app", "mobile", "component", "brand", "other"]).optional(),
        packs: z.array(z.string()).optional().describe("Niche pack ids to use (pack_list). Omit: packs matching the task are picked automatically."),
      },
    },
    async ({ task, mode, size, surface, packs }) => {
      const g = guess(task);
      const m = mode || guessMode(task) || (g.size === "quick" ? "polish" : "design");
      const s = size || (m === "polish" ? "quick" : "full");
      const sf = surface || (m === "logo" ? "brand" : g.surface);
      const pk = packs || matchPacks(task).map((p) => p.id);
      const guides = requiredGuides(s, sf, task, m, pk);
      const t = newTask({ title: task, size: s, surface: sf, guides, mode: m, packs: pk });
      // Every required guide is short now, so all of them come inline: zero extra calls.
      const bodies = guides.map((x) => [x, readGuide(x)]).filter(([, b]) => b);
      for (const [x] of bodies) t.guidesRead.push(x);
      const others = otherTasks();
      if (["design", "logo", "board", "polish"].includes(m)) warmBrowser(ctx.config()); // ready before the first shot
      const skills = relevantSkills(t);
      const redesignUrl = /redesign|rework|refresh|revamp/i.test(task) ? (task.match(/\b(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:io|com|dev|app|co|net|org|ai|so|xyz|design|studio)\b[^\s,)]*/i) || [])[0] : null;
      updateState((st) => {
        if (st.task) st.history.push({ ...st.task, endedAt: new Date().toISOString(), endedBy: "new task" });
        st.task = t;
      });
      const config = ctx.config();
      return text(
        `Drip task started (task id ${t.id}): mode ${m}, ${s} loop, surface ${sf}${pk.length ? `, niche packs: ${pk.join(", ")}` : ""}.\n` +
          (others.length ? `Other sessions are working on Drip tasks in this folder (${others.map((o) => `"${o.title}"`).join(", ")}). They are separate: never drip_end, edit or judge them.\n` : "") +
          (skills.length ? `The workspace has its own rules for this: ${skills.map((k) => `${k.name} (${k.file})`).join("; ")}. Load them now (Skill tool, or Read the file); the critic judges against them too.\n` : "") +
          (redesignUrl ? `Redesign of a live site: first refs_site({ urls: ["${redesignUrl}"], before: true }) to shoot the before and pull its logo, fonts and colours.\n` : "") +
          (s === "full" && ["landing", "other"].includes(sf) && !getKey("unsplash") && !getKey("pexels") ? "No photo keys yet (Unsplash/Pexels): if the page needs photos, ask the user to add one now (keys_open, free, 2 minutes); without them use images_search (openverse, wikimedia, cleveland for public-domain art), or gradient_mesh.\n" : "") +
          (m === "polish" ? "Quick loop: a change to existing UI. If it's really new UI or a redesign, call drip_start again with mode \"design\".\n" : "") +
          `Guides included below (read them now; deeper ones on demand with drip_guide <topic>): ${bodies.map(([x]) => x).join(", ")}.\n\n` +
          (s === "full" && config.gates.requireBrief ? `${INTAKE}\n\n` : "") +
          (s === "full" ? `${refPlan(task, sf, m)}\n\n` : "") +
          `${TALK}\n\n${nextStep(t, config)}\n\n` +
          bodies.map(([x, b]) => `=================== GUIDE: ${x} ===================\n${b}`).join("\n\n"),
      );
    },
  );

  server.registerTool(
    "drip_kit",
    {
      title: "Copy the base kit into the project",
      description:
        "Writes Drip's kit/base.css into the project: the seven type roles (Display ~127px at 1440 down to Small 14px), the 12-column grid and container, the spacing scale, .button with every state, " +
        "focus, reduced motion and overflow-x: clip. Fill in --font-display, --font-text and the colour roles from the chosen direction; never add an eighth size. Example: drip_kit({ out: \"src/styles/base.css\" }). " +
        "Other templates: template \"design-md\" (DESIGN.md skeleton the critic and fitcheck_lint check against), \"comp\" (a first-viewport comp to copy into .drip/comps/ for board_tile custom comps), \"brand-board\" (the HTML board_brand fills).",
      inputSchema: {
        template: z.enum(["base-css", "design-md", "comp", "brand-board"]).optional().describe("Default base-css"),
        out: z.string().optional().describe("Path in the project (default styles/drip-base.css or src/styles/drip-base.css; DESIGN.md; .drip/comps/comp.html; .drip/brand/brand-board.html)"),
        overwrite: z.boolean().optional(),
      },
    },
    async ({ template = "base-css", out, overwrite }) => {
      const root = projectDir();
      const SRC = { "base-css": "base.css", "design-md": "DESIGN.template.md", comp: "comp.html", "brand-board": "brand-board.html" };
      const DEF = { "base-css": fs.existsSync(path.join(root, "src")) ? "src/styles/drip-base.css" : "styles/drip-base.css", "design-md": "DESIGN.md", comp: ".drip/comps/comp.html", "brand-board": ".drip/brand/brand-board.html" };
      const rel = out || DEF[template];
      const dest = path.resolve(root, rel);
      if (fs.existsSync(dest) && !overwrite) return text(`${rel} already exists. Pass overwrite: true to replace it, or edit it.`, true);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(kitDir, SRC[template]), dest);
      if (template === "design-md") return text(`Wrote ${rel}: fill every section (THESIS ... REFUSES, the colour roles, the type). The critic judges the build against it; fitcheck_lint checks it matches the CSS. Then drip_mark system.`);
      if (template === "comp") return text(`Wrote ${rel}: one direction's first viewport at 1440x1000. Copy per direction (.drip/comps/<name>.html), set faces, colours, the real headline and picture, then board_tile({ custom: [{ direction, file }] }).`);
      if (template === "brand-board") return text(`Wrote ${rel}: the brand board template. board_brand fills it for you; edit this copy only for a custom layout.`);
      return text(
        `Wrote ${rel}. Now: set --font-display / --font-text (load them), the colour roles (--ground --ink --accent --band) from the direction, --w-display. ` +
          "Use the classes (.display/h1, .statement, h2, h3, .lead, p, .small, .container, .grid, .button, .band, data-visual, .enter) instead of new sizes. Then DESIGN.md and drip_mark system.",
      );
    },
  );

  server.registerTool(
    "drip_brief",
    {
      title: "Record the brief",
      description:
        "Record the user's answers to the intake questions (or your stated assumptions when they said 'decide for me'). Required before research on full loops. " +
        "Example: drip_brief({ what: 'portfolio site for Claude', audience: 'developers and curious people meeting Claude', job: 'show what Claude makes and how it works', feel: ['loud & playful', 'crafted'], loves: ['kinetic type'], hates: ['corporate SaaS look'], ambition: 'bold' })",
      inputSchema: {
        what: z.string(),
        audience: z.string(),
        job: z.string().describe("What the visitor should do or feel"),
        feel: z.array(z.string()).min(1).describe("The chosen feel words / options"),
        loves: z.array(z.string()).optional(),
        hates: z.array(z.string()).optional(),
        ambition: z.enum(["bold", "balanced", "conservative"]).optional().describe("Default bold. Conservative ONLY if the user asked for plain / safe / corporate."),
        constraints: z.string().optional(),
        assumptions: z.string().optional().describe("What you assumed without asking"),
      },
    },
    async (brief) => {
      const b = { ...brief, ambition: brief.ambition || "bold", at: new Date().toISOString() };
      const st = updateState((s) => {
        if (s.task) s.task.brief = b;
      });
      if (!st.task) return text("No Drip task is active. Call drip_start first.", true);
      return text(
        `Brief recorded: ${b.what} · for ${b.audience} · feel: ${b.feel.join(", ")} · ambition: ${b.ambition}.\n` +
          (b.ambition === "bold" ? "Ambition BOLD: every direction must be distinctive enough that someone would screenshot it. The critic rejects safe defaults (rules/ambition).\n" : "") +
          `${nextStep(st.task, ctx.config())}`,
      );
    },
  );

  server.registerTool(
    "drip_guide",
    {
      title: "Read a Drip guide",
      description:
        "Returns the full text of a design guide (on demand: drip_start already gave you the one you need). Read a deep guide when a step needs it " +
        "(e.g. 'motion' before a signature animation, 'landing/pricing', 'productshots'). Topics: playbook, loop, brief, refs, moodboard, direction, system, color, type, layout, landing, app, mobile, " +
        "components, interaction, motion, imagery, productshots, icons, copy, a11y, fitcheck, polish, logo, adapt, readme, rules/ambition, rules/communication, rules/hard-rules, rules/slop-tells, rules/per-surface, rules/licences, examples/portfolio, examples/logo, examples/adapt, examples/lazy-run, pack:<id>. " +
        "Sub-guides look like 'color/dark-mode'. Pass topic 'index' for the full list.",
      inputSchema: { topic: z.string().describe("Guide topic, e.g. 'color' or 'color/dark-mode' or 'rules/slop-tells' or 'index'") },
    },
    async ({ topic }) => {
      if (topic === "index") return text(listGuides().map((g) => `- ${g.topic}: ${g.title}`).join("\n"));
      const t = normalizeTopic(topic);
      const body = readGuide(t);
      if (!body) return text(`No guide called "${topic}". Call drip_guide with topic "index" to list them.`, true);
      const state = updateState((st) => {
        if (st.task && !st.task.guidesRead.includes(t)) st.task.guidesRead.push(t);
      });
      const subs = subTopics(t);
      const task = state.task;
      const tail = task ? `\n\n---\n${nextStep(task, ctx.config())}` : "\n\n---\nNo Drip task is active: call drip_start before writing UI.";
      return text(`=================== GUIDE: ${t} ===================\n${body}${subs.length ? `\n\nDeeper guides for this topic: ${subs.join(", ")}` : ""}${tail}`);
    },
  );

  server.registerTool(
    "drip_status",
    {
      title: "What is done and what is next",
      description: "Shows the active task's checklist (guides read, references studied, board, direction, system, fit check) and the exact next call. Use it whenever you are unsure what to do next, or when a hook blocked you.",
      inputSchema: {},
    },
    async () => {
      const { task } = loadState();
      if (!task) return text("No Drip task is active. Call drip_start with what you are designing.");
      return text(`${checklist(task, ctx.config())}\n\n${nextStep(task, ctx.config())}`);
    },
  );

  server.registerTool(
    "drip_serve",
    {
      title: "Preview a static build",
      description:
        "Serves a folder of plain HTML/CSS/JS on a free local port (no dev server, no port clashes) and returns the URL for fitcheck_shot, critic_prepare and the user. " +
        "fitcheck_shot and critic_prepare also accept a local .html path directly. Example: drip_serve({ dir: \"site\" }) -> http://127.0.0.1:53121/",
      inputSchema: { dir: z.string().optional().describe("Folder to serve (default: the project)") },
    },
    async ({ dir }) => {
      const url = await serveDir(dir);
      return text(`Serving ${dir || "the project"} at ${url}/ (stays up while this session runs).`);
    },
  );

  server.registerTool(
    "drip_mark",
    {
      title: "Mark a step done",
      description: "Record a step that has no tool of its own. Use 'system' after writing DESIGN.md / tokens for the chosen direction.",
      inputSchema: { step: z.enum(["system"]), note: z.string().optional() },
    },
    async ({ step }) => {
      const st = updateState((s) => {
        if (s.task && step === "system") s.task.system = true;
      });
      if (!st.task) return text("No Drip task is active. Call drip_start first.", true);
      return text(`Marked ${step} done.\n${nextStep(st.task, ctx.config())}`);
    },
  );

  server.registerTool(
    "drip_skip",
    {
      title: "Skip the process (user asked)",
      description:
        "Turns off the gates for the active task. ONLY when the user explicitly said to skip the design process (quote their words in `reason`). Never call it to get past a block on your own.",
      inputSchema: { reason: z.string().describe("The user's words asking to skip, quoted") },
    },
    async ({ reason }) => {
      const st = updateState((s) => {
        if (!s.task) s.task = newTask({ title: "skipped", size: "quick", surface: "other", guides: [] });
        s.task.skipped = reason;
      });
      return text(`Gates off for this task ("${st.task.skipped}"). Hard rules still apply: call drip_guide rules/hard-rules if you have not.`);
    },
  );

  server.registerTool(
    "drip_end",
    {
      title: "Finish the task",
      description: "Close the active task once the work is done and fit-checked. Starts a clean slate for the next design task.",
      inputSchema: { summary: z.string().optional() },
    },
    async ({ summary }) => {
      const st = updateState((s) => {
        if (s.task) s.history.push({ ...s.task, endedAt: new Date().toISOString(), summary });
        s.task = null;
        s.history = s.history.slice(-30);
      });
      return text(`Task closed. ${st.history.length} tasks in history.`);
    },
  );
}

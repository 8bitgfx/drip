// The process tools: start a task, read guides, see what is left, skip, finish.
// These are what make Drip enforce the designer loop instead of hoping Claude reads a skill.
import { z } from "zod";
import { listGuides, normalizeTopic, readGuide, subTopics } from "../core/guides.mjs";
import { checklist, loadState, missingBeforeUi, newTask, updateState } from "../core/state.mjs";
import { text } from "../core/result.mjs";
import { matchPacks } from "../core/packs.mjs";

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

function requiredGuides(size, surface, task, mode, packs) {
  const g = ["rules/hard-rules"];
  if (mode === "refs") g.push("refs");
  else if (mode === "board") g.push("refs", "moodboard", "rules/ambition");
  else if (size === "full") {
    g.push("rules/ambition", "loop", "refs", "moodboard", "direction");
    g.push(mode === "logo" ? "logo" : { landing: "landing", app: "app", mobile: "mobile", component: "components", brand: "logo", other: "layout" }[surface]);
  } else {
    const topics = Object.entries(TOPIC_WORDS).filter(([, re]) => re.test(task)).map(([t]) => t);
    g.push(...(topics.length ? topics.slice(0, 3) : ["polish"]));
  }
  for (const p of packs) g.push(`pack:${p}`);
  return [...new Set(g)];
}

export function nextStep(task, config) {
  if (task.size === "full" && config.gates.requireBrief && !task.brief) return "NEXT: ask the intake questions (AskUserQuestion, up to 4, see INTAKE), then drip_brief with the answers.";
  const missing = missingBeforeUi(task, config);
  if (missing.length) return `NEXT: ${missing[0].how}.`;
  if (task.mode === "refs") return "NEXT: summarise what the studied references have in common and where they differ (6-10 lines), then offer a moodboard.";
  if (task.mode === "board") return "NEXT: board_open, present the critic-ranked directions with your pick, ask the user to choose with buttons. Then drip_end.";
  if (task.size === "full" && !task.system) return task.mode === "logo" ? "NEXT: drip_guide logo, then sketch 12-20 concepts and render them with logo_sheet." : "NEXT: write the system (DESIGN.md + tokens) from the chosen direction: drip_guide system, then drip_mark system.";
  return "NEXT: build. Prefer a library component (components_find). Then fitcheck_shot, critic review of the build (critic_prepare kind 'build' -> Agent drip:critic -> critic_record), fix, fitcheck_done.";
}

const INTAKE = `INTAKE (do this now, before any research): ask ONE round of up to 4 questions with AskUserQuestion. Make every option specific to this request, never generic.
1. "What is it / what's it for?" only if unclear: 2-4 concrete readings of the request.
2. "Who is it for and what should they feel/do?": 3-4 audience+goal options you infer.
3. "Which feel?": 3-4 OPPOSED pairs turned into options, each a vivid one-liner (e.g. "Loud & playful — big type, saturated colour, motion" vs "Quiet & precise — monochrome, grids, restraint" vs "Editorial & crafted" vs "Raw & experimental"). Add "Surprise me (bold)".
4. "Anything you love or hate?": common answers for this kind of work (e.g. "Love: brutalist sites", "Hate: dark mode", "No preference").
Skip questions the request already answers. If the user said "just do it"/"decide for me", skip all and state assumptions.
Then call drip_brief with the answers. Default ambition is BOLD: distinctive and memorable, never the safe default, unless the user asked for plain/conservative.`;

/** A concrete research plan: mostly real examples of the surface, then 1-2 outside-the-category angles. */
function refPlan(task, surface, mode) {
  const subject =
    task
      .toLowerCase()
      .replace(/\b(design|redesign|make|build|create|me|my|our|a|an|the|for|please|new|site|website|web|page|landing|homepage|portfolio|app|screen|logo|for an?)\b/g, " ")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "product";
  const kind = /portfolio/i.test(task) ? "portfolio website" : surface === "landing" ? "landing page" : surface === "app" ? "dashboard" : surface === "mobile" ? "mobile app" : surface === "component" ? "ui component" : mode === "logo" ? "logo" : "website";
  if (mode === "logo")
    return `REFERENCE PLAN (logo): refs_tag "logo design" and "wordmark" (pages 1-3), refs_tag "${subject.split(" ")[0]} logo", refs_search "${subject} branding" category "branding", then refs_designer on the 2-3 best identity designers you find. Keyword search is weak for logos; tags and designers are strong.`;
  const cat = surface === "app" || surface === "mobile" ? "product-design" : "web-design";
  return (
    `REFERENCE PLAN (most studied refs must BE ${kind}s, the gate counts them):\n` +
    `1. refs_search "${kind}" category "${cat}"  ·  2. refs_tag "${kind}" pages 1-3  ·  3. refs_tag "${surface === "landing" ? "hero section" : kind}"  ·  ` +
    `4. refs_search "${subject} ${kind}" category "${cat}"  ·  5. refs_designer on 2 designers whose pages are strongest.\n` +
    `Then ONE or TWO outside-the-category angles for ideas (posters, editorial, the subject's own world), never more than a third of what you study.\n` +
    "Run searches one after another (they share a rate limit) and refer to shots by their tagged number (L3-7) or id."
  );
}

const TALK =`HOW TO TALK TO THE USER (whole task): decisions first; 3-6 short lines per message; show (board link, screenshots, renders) instead of describing; one question at a time with buttons (AskUserQuestion); never paste tool output walls; at milestones say what changed and what's next in one line each.`;

export function register(server, ctx) {
  server.registerTool(
    "drip_start",
    {
      title: "Start a design task",
      description:
        "Start a Drip design task (the user ran /drip:design or asked for Drip / a proper design process): a new page, screen, component, redesign, or a polish pass. " +
        "It decides the loop (full for new/redesigned UI, quick for tweaks), lists the guides you must read and returns the first one. " +
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
      const first = s === "full" && !["refs", "board"].includes(m) ? "loop" : guides[1] || "rules/hard-rules";
      const body = readGuide(first);
      if (body) t.guidesRead.push(first);
      updateState((st) => {
        if (st.task) st.history.push({ ...st.task, endedAt: new Date().toISOString(), endedBy: "new task" });
        st.task = t;
      });
      const config = ctx.config();
      return text(
        `Drip task started: mode ${m}, ${s} loop, surface ${sf}${pk.length ? `, niche packs: ${pk.join(", ")}` : ""}.\n` +
          (m === "polish" ? "Quick loop: a change to existing UI. If it's really new UI or a redesign, call drip_start again with mode \"design\".\n" : "") +
          `\nREQUIRED GUIDES (read each with drip_guide; UI writes are blocked until then):\n${guides.map((x) => `- ${x}${x === first ? "  (included below)" : ""}`).join("\n")}\n\n` +
          (s === "full" && config.gates.requireBrief ? `${INTAKE}\n\n` : "") +
          (s === "full" ? `${refPlan(task, sf, m)}\n\n` : "") +
          `${TALK}\n\n${nextStep(t, config)}\n\n` +
          (body ? `=================== GUIDE: ${first} ===================\n${body}` : ""),
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
        "Returns the full text of a design guide and records that you read it. Read every guide drip_start lists, and the guide of any craft before you do it " +
        "(e.g. 'color' before picking colours, 'motion' before animating). Topics: loop, brief, refs, moodboard, direction, system, color, type, layout, landing, app, mobile, " +
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

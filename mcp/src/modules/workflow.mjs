// The process tools: start a task, read guides, see what is left, skip, finish.
// These are what make Drip enforce the designer loop instead of hoping Claude reads a skill.
import { z } from "zod";
import { listGuides, normalizeTopic, readGuide, subTopics } from "../core/guides.mjs";
import { checklist, evidenceStale, loadState, missingBeforeUi, needsFitcheck, newTask, otherTasks, reconcileWorkspace, updateState } from "../core/state.mjs";
import { takeSnapshot } from "../core/evidence.mjs";
import { graphOf, indexProject } from "../core/indexer/index.mjs";
import { subjectWords } from "./inspire/contract.mjs";
import { buildTaskMemory, hasMemory, projectContext } from "../core/project.mjs";
import { writeProjectSkill } from "../core/memory.mjs";
import { serveDir } from "../core/serve.mjs";
import { warmBrowser } from "../core/browser.mjs";
import { relevantSkills } from "../core/skills.mjs";
import { getKey } from "../core/keys.mjs";
import { text } from "../core/result.mjs";
import { isProjectPack, matchPacks } from "../core/packs.mjs";
import fs from "node:fs";
import path from "node:path";
import { kitDir, projectDir } from "../core/paths.mjs";

const SURFACE_WORDS = {
  readme: /\b(readme|github page|repo page|repository page|github profile)\b/i,
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

const FULL_WORDS = /\b(new|design|redesign|redo|rewrite|build|create|make|landing|page|screen|site|dashboard|from scratch|revamp|overhaul)\b/i;
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
  else if (size === "full") g.push("rules/hard-rules", { app: "app", mobile: "mobile", component: "components", readme: "readme" }[surface] || "layout");
  else {
    const topics = Object.entries(TOPIC_WORDS).filter(([, re]) => re.test(task)).map(([t]) => t);
    g.push("rules/hard-rules", ...(topics.length ? topics.slice(0, 2) : ["polish"]));
  }
  for (const p of packs) if (!isProjectPack(p)) g.push(`pack:${p}`); // a project's own style pack reaches the agent through project_context, not pasted in full
  return [...new Set(g)];
}

export function nextStep(task, config) {
  if (task.size === "full" && config.gates.requireBrief && !task.brief) return `NEXT: ${task.intake?.max === 0 ? "no questions needed: drip_brief with your assumptions" : `ask at most ${task.intake?.max ?? 2} intake question(s) (AskUserQuestion; see INTAKE), then drip_brief with the answers.`}`;
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

// Intake asks only what the request (and the project) leave open. Agents pad a "up to 4" round to 4 every time,
// so drip_start works out which slots are answered and hands over a short numbered list with a cap.
const MATERIAL_WORDS = /\b(screenshot|screenshots|photo|photos|photograph|mockup|mockups|3d|render|renders|illustration|illustrations|generate|generated|own tools|my (app|product|work|screens)|real (screens|data|work)|images?|video|the work)\b/i;
const FEEL_WORDS = /\b(cool|bold|loud|minimal|minimalist|clean|playful|fun|dark|light|premium|luxury|calm|quiet|editorial|brutal|brutalist|retro|elegant|showcase|wow|fancy|serious|corporate|plain|simple|warm|techy|futuristic|cute|weird|experimental|crazy|insane|polished|sleek|gritty|vibrant|colorful|colourful|moody)\b/i;
const AUDIENCE_WORDS = /\b(for (my|our|a|an|the)?\s*[a-z-]+s\b|for (developers|devs|designers|kids|teens|gamers|investors|customers|users|clients|teams|startups|agencies|creators|artists|musicians|players)|audience|users? (are|is))\b/i;
const DECIDE = /\b(just do it|decide for me|you (pick|choose|decide)|surprise me|no questions|don'?t ask)\b/i;

export function intakePlan(taskText, t = {}) {
  const has = (re) => re.test(taskText);
  const brand = !!(t.memory && t.memory.mode !== "fresh");
  const open = [];
  const answered = [];
  if (has(MATERIAL_WORDS) || (brand && /\b(brand|logo|sheet|board|identity|kit)\b/i.test(taskText))) answered.push("material (the request or the project's brand says what to show)");
  else open.push("MATERIAL: what can it show? e.g. \"Real screenshots/photos I'll give you\" / \"The work itself, rebuilt in HTML\" / \"Generate pictures\" / \"Leave labelled slots\"");
  if (has(FEEL_WORDS) || (brand && t.memory?.mode === "fidelity")) answered.push(brand && t.memory?.mode === "fidelity" ? "feel (the approved direction)" : "feel (the request's own words; default ambition bold)");
  else open.push("FEEL: 3-4 OPPOSED options, each a vivid one-liner of the first screen, plus \"Surprise me (bold)\"");
  if (has(AUDIENCE_WORDS) || ["logo", "polish"].includes(t.mode) || t.surface === "readme") answered.push("audience and action (clear enough from the request)");
  else open.push("ONLY IF two readings would build different things: who it's for / the one action, as 2-4 concrete readings");
  const max = has(DECIDE) ? 0 : Math.min(open.length, 2);
  return { open, answered, max };
}

function intakeText(plan) {
  if (plan.max === 0)
    return (
      `INTAKE: ask NOTHING. ${plan.answered.length ? `Already answered: ${plan.answered.join("; ")}. ` : ""}Read the project, then drip_brief right away with your assumptions (assumptions field) and say them to the user in one line.` +
      (plan.open.some((q) => q.startsWith("MATERIAL"))
        ? " MATERIAL is unknown: don't invent pictures of the product. Build labelled slots at their real size for the photos, CAD renders or screenshots the user surely has, and end the hand-off with the exact list of files to send (\"hero: a 3/4 photo of the product on a plain ground, 2400px\"…). drip_guide imagery covers products with no photos."
        : "")
    );
  return (
    `INTAKE: read the project first (never ask what you can look up), then ask AT MOST ${plan.max} question${plan.max > 1 ? "s" : ""} in one AskUserQuestion round, options specific to this request, your recommendation first. ` +
    `Fewer is better; zero is fine when the project answers them. Never pad the round.\n` +
    plan.open.map((q, i) => `${i + 1}. ${q}`).join("\n") +
    (plan.answered.length ? `\nDon't ask about: ${plan.answered.join("; ")}.` : "") +
    "\nThen drip_brief (asked: the number you asked). Default ambition is BOLD unless they asked for plain."
  );
}


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
  if (surface === "readme")
    return (
      `REFERENCE PLAN (README): TASTE first: refs_gallery({ query: "${subject} landing page" }) and refs_tag "landing page" (popular): the hero art, bentos and diagrams worth stealing ideas from; refs_view the 3-4 best, refs_study them. ` +
      "REALITY: refs_site on 1 GitHub README known for its design (it shows the 830px column and what GitHub strips). Judge the README's images, not GitHub's own type."
    );
  if (PERSUADE(surface, mode) || ["app", "mobile"].includes(surface)) {
    const words = subjectWords(task, 2).join(" ");
    const redesign = /(redesign|rework|refresh|revamp)/i.test(task) || /[a-z0-9-]+\.[a-z]{2,}/i.test(task);
    const subj = words || "<what the product is, 1-2 words>";
    const pageKind = surface === "app" ? "dashboard" : surface === "mobile" ? "mobile app" : "landing page";
    return (
      "REFERENCE PLAN: three roles, each its own searches (never mix a style word into a subject search). Set role on every refs_study. " +
      (redesign ? "First refs_site({ urls: [<the current site>], before: true }) (role \"before\") and name what the product is in 1-2 words. " : "") +
      `1) COMPETITORS (role "competitor"): name the 3-4 products people compare this with (direct rivals and the best-designed similar tools) and refs_site their shipped sites. ` +
      `2) THE PAGE (role "page"): the same kind of page you're making: refs_search("${subj} ${pageKind}"), refs_tag "${pageKind}", refs_gallery({ query: "${subj}" }). ` +
      "3) STYLE (role \"style\"): the look you're aiming for, from the brief's feel: refs_search / refs_tag / refs_gallery with style words only (\"playful 3d\", \"brutalist\", \"editorial dark\"). " +
      "Never docs, wikis or GitHub pages. Each direction later names which style and page references it builds on."
    );
  }
  const kind = surface === "app" ? "dashboard" : surface === "mobile" ? "mobile app" : surface === "component" ? "ui component" : "website";
  return (
    `REFERENCE PLAN: refs_site on 1-2 shipped products with a strong ${kind} (real screens, measured), then refs_tag "${kind}" and refs_search "${subject} ${kind}" category "product-design"; ` +
    "refs_view the 2-3 best in one call and refs_study them in one call. Refer to shots by their tagged number (L3-7)."
  );
}

/** The first half of the playbook: everything before "## System", plus "## Never" and "## Talk". */
export function playbookFloor(pb) {
  if (!pb) return pb;
  const cut = (from, to) => {
    const a = pb.indexOf(from);
    if (a < 0) return "";
    const b = to ? pb.indexOf(to, a + from.length) : -1;
    return pb.slice(a, b < 0 ? undefined : b);
  };
  const head = pb.slice(0, pb.indexOf("## System") > 0 ? pb.indexOf("## System") : undefined);
  return `${head.trimEnd()}\n\n${cut("## Never", "## Finish").trimEnd()}\n\n${cut("## Talk").trimEnd()}\n\n(The build half: system, plan, build, finish, comes with board_choose; drip_guide playbook has the whole text.)\n`;
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
        memory: z.enum(["fidelity", "redesign", "fresh"]).optional().describe("How to treat the project's approved design (when it has one). fidelity (default): extend the existing system, new content only. redesign: explore a new direction as a proposal; the approved one stays until the user approves. fresh: ignore it (a new brand inside this repo)."),
      },
    },
    async ({ task, mode, size, surface, packs, memory }) => {
      const g = guess(task);
      const m = mode || guessMode(task) || (g.size === "quick" ? "polish" : "design");
      const s = size || (m === "polish" ? "quick" : "full");
      const sf = surface || (m === "logo" ? "brand" : g.surface);
      const pk = packs || matchPacks(task).map((p) => p.id);
      const guides = requiredGuides(s, sf, task, m, pk);
      const t = newTask({ title: task, size: s, surface: sf, guides, mode: m, packs: pk });
      // Design tasks load the project's design memory (compact) and remember which revision they started from. Reusing it
      // never passes this task's own gates: research gaps, the critic and the fit check still run.
      const designTask = ["design", "logo", "board", "polish"].includes(m);
      if (designTask && memory !== "fresh") t.memory = buildTaskMemory({ taskText: task, mode: memory });
      const memCtx = t.memory ? projectContext({ task: t }) : null;
      // Required guides come inline. The playbook comes in two halves: what the first steps need now (the bar, material,
      // references, direction, comps, the never-list, how to talk); the build half (system, plan, build, finish) arrives once,
      // with board_choose, when it is used. Less to carry while thinking about the design.
      const bodies = guides.map((x) => [x, x === "playbook" ? playbookFloor(readGuide(x)) : readGuide(x)]).filter(([, b]) => b);
      for (const [x] of bodies) t.guidesRead.push(x);
      const others = otherTasks();
      if (["design", "logo", "board", "polish"].includes(m)) warmBrowser(ctx.config()); // ready before the first shot
      const skills = relevantSkills(t);
      const redesignUrl = /redesign|rework|refresh|revamp/i.test(task) ? (task.match(/\b(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:io|com|dev|app|co|net|org|ai|so|xyz|design|studio)\b[^\s,)]*/i) || [])[0] : null;
      if (["app", "mobile", "component", "landing"].includes(sf) && m !== "logo") {
        try {
          const comps = graphOf(indexProject({}).index).components.length;
          if (comps) t.components = { count: comps };
        } catch {
          /* no index: nothing to reuse */
        }
      }
      t.intake = intakePlan(task, { ...t, memory: t.memory });
      updateState((st) => {
        if (st.task) st.history.push({ ...st.task, endedAt: new Date().toISOString(), endedBy: "new task" });
        st.task = t;
      });
      if (["design", "logo", "polish"].includes(m)) {
        try {
          takeSnapshot(t); // the UI files as they are now: edits no hook sees show up at the end (drip_end, the Stop hook)
        } catch {
          /* a read-only project must not stop the task */
        }
      }
      const config = ctx.config();
      return text(
        `Drip task started (task id ${t.id}): mode ${m}, ${s} loop, surface ${sf}${pk.length ? `, niche packs: ${pk.join(", ")}` : ""}.\n` +
          (others.length ? `Other sessions are working on Drip tasks in this folder (${others.map((o) => `"${o.title}"`).join(", ")}). They are separate: never drip_end, edit or judge them.\n` : "") +
          (memCtx
            ? `PROJECT MEMORY (${t.memory.mode} mode: ${t.memory.mode === "redesign" ? "propose a new direction; the approved one stays until the user approves the change" : t.memory.mode === "fresh" ? "no inherited direction" : "extend the approved system, new content only"}):\n${memCtx.text}\nInherited: ${t.memory.inherited.join(", ") || "nothing yet"}. Still needed from this task: ${t.memory.needed.join("; ")}.\n`
            : designTask && memory !== "fresh" && !hasMemory()
              ? "No project design memory yet: board_project({ action: \"bootstrap\" }) can build the master board from this repo; the first approved direction becomes the project's identity.\n"
              : "") +
          (skills.length ? `The workspace has its own rules for this: ${skills.map((k) => `${k.name} (${k.file})`).join("; ")}. Load them now (Skill tool, or Read the file); the critic judges against them too.\n` : "") +
          (redesignUrl ? `Redesign of a live site: first refs_site({ urls: ["${redesignUrl}"], before: true }) to shoot the before and pull its logo, fonts and colours.\n` : "") +
          (s === "full" && ["landing", "other"].includes(sf) && !getKey("unsplash") && !getKey("pexels") ? "No photo keys yet (Unsplash/Pexels): if the page needs photos, ask the user to add one now (keys_open, free, 2 minutes); without them use images_search (openverse, wikimedia, cleveland for public-domain art), or gradient_mesh.\n" : "") +
          (m === "polish" ? "Quick loop: a change to existing UI. If it's really new UI or a redesign, call drip_start again with mode \"design\".\n" : "") +
          `Guides included below (read them now; deeper ones on demand with drip_guide <topic>): ${bodies.map(([x]) => x).join(", ")}.\n\n` +
          (s === "full" && config.gates.requireBrief ? `${intakeText(t.intake)}\n\n` : "") +
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
        "Other templates: template \"design-md\" (DESIGN.md skeleton the critic and fitcheck_lint check against), \"comp\" (a first-viewport comp to copy into .drip/comps/ for board_tile custom comps), \"brand-board\" (the HTML board_brand fills), \"readme-art\" (a neutral script that renders a README hero banner and light/dark bento grid to PNG; see drip_guide readme/art).",
      inputSchema: {
        template: z.enum(["base-css", "design-md", "comp", "brand-board", "readme-art"]).optional().describe("Default base-css"),
        out: z.string().optional().describe("Path in the project (default styles/drip-base.css or src/styles/drip-base.css; DESIGN.md; .drip/comps/comp.html; .drip/brand/brand-board.html; assets/readme/src/readme-art.mjs)"),
        overwrite: z.boolean().optional(),
      },
    },
    async ({ template = "base-css", out, overwrite }) => {
      const root = projectDir();
      if (template === "base-css" && loadState().task?.surface === "readme")
        return text("GitHub strips CSS from READMEs, so base.css does nothing there. For README art use drip_kit({ template: \"readme-art\" }), render it with render_html (scale 2), and check it with readme_check.", true);
      const SRC = { "base-css": "base.css", "design-md": "DESIGN.template.md", comp: "comp.html", "brand-board": "brand-board.html", "readme-art": "readme-art.mjs" };
      const DEF = { "base-css": fs.existsSync(path.join(root, "src")) ? "src/styles/drip-base.css" : "styles/drip-base.css", "design-md": "DESIGN.md", comp: ".drip/comps/comp.html", "brand-board": ".drip/brand/brand-board.html", "readme-art": "assets/readme/src/readme-art.mjs" };
      const rel = out || DEF[template];
      const dest = path.resolve(root, rel);
      if (fs.existsSync(dest) && !overwrite) return text(`${rel} already exists. Pass overwrite: true to replace it, or edit it.`, true);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(kitDir, SRC[template]), dest);
      if (template === "design-md") return text(`Wrote ${rel}: fill every section (THESIS ... REFUSES, the colour roles, the type). The critic judges the build against it; fitcheck_lint checks it matches the CSS. Then drip_mark system.`);
      if (template === "comp") return text(`Wrote ${rel}: one direction's first viewport at 1440x1000. Copy per direction (.drip/comps/<name>.html), set faces, colours, the real headline and picture, then board_tile({ custom: [{ direction, file }] }).`);
      if (template === "readme-art") return text(`Wrote ${rel}: a TEMPLATE (greys, [bracketed] copy, dashed art slots). Set the CHANGE ME tokens to the brand, replace every [bracket] and slot with real words and objects, then run node ${rel}. It writes hero.png and bento-light/dark.png next to its folder. Guide: drip_guide readme/art.`);
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
        asked: z.number().int().min(0).max(4).optional().describe("How many questions you asked (drip_start gives the cap; often 0-2)"),
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
          (st.task.intake && b.asked > st.task.intake.max ? `You asked ${b.asked} questions; this request needed at most ${st.task.intake.max}. Next time ask only what the request and the project leave open.
` : "") +
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
      const config = ctx.config();
      const unseen = reconcileWorkspace();
      const cur = loadState().task;
      const ctxLine = cur.memory || hasMemory() ? `\n\nProject context: ${projectContext({ task: cur, maxChars: 600 }).text.split("\n").join(" | ")}` : "";
      const stale = evidenceStale(cur);
      const warn = (unseen.length ? `\nUI edits Drip never saw (counted as changes after your last fit check): ${unseen.slice(0, 6).map((u) => u.file).join(", ")}.` : "") + (stale.length ? `\nStale evidence: ${stale.join("; ")}. Shoot and review again.` : "");
      return text(`${checklist(cur, config)}${warn}${ctxLine}\n\n${nextStep(cur, config)}`);
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
      description:
        "Close the active task once the work is done and fit-checked. Starts a clean slate for the next design task. " +
        "It first checks the workspace: UI files changed without Drip seeing it (a shell edit, a host without write hooks) count as changes, and a fit check or critic verdict that reviewed an earlier version is stale; " +
        "either blocks the close until it is reviewed again, unless the user accepts the open points (acceptOpen, their words). Closing a task never deletes its board or the project's memory; it refreshes the project skill.",
      inputSchema: { summary: z.string().optional(), acceptOpen: z.string().optional().describe("The user's words accepting the open points (stale or missing checks), quoted. Never your own decision.") },
    },
    async ({ summary, acceptOpen }) => {
      const config = ctx.config();
      const unseen = reconcileWorkspace();
      const cur = loadState().task;
      // "Decide for me" is the user's standing acceptance: close with the open points listed rather than ask.
      if (cur?.intake?.max === 0 && !acceptOpen) acceptOpen = "the user said: decide for me (open points listed in the hand-off)";
      if (cur && !cur.skipped && config.gates.enforce && !acceptOpen) {
        const open = [];
        if (needsFitcheck(cur, config)) open.push("the UI changed after the last passing fit check (or the critic has not passed the latest build)");
        for (const s of evidenceStale(cur)) open.push(s);
        if (unseen.length) open.push(`UI edits Drip never saw: ${unseen.slice(0, 6).map((u) => u.file).join(", ")}`);
        if (open.length) return text(`Not closed: ${[...new Set(open)].join("; ")}.\nShoot the page again (fitcheck_shot), fix, review, fitcheck_done; or, if the user accepts shipping as is, drip_end with acceptOpen quoting their words.`, true);
      }
      const st = updateState((s) => {
        if (s.task) s.history.push({ ...s.task, endedAt: new Date().toISOString(), summary, ...(acceptOpen ? { acceptedOpen: acceptOpen } : {}) });
        s.task = null;
        s.history = s.history.slice(-30);
      });
      let skill = "";
      if (hasMemory()) {
        try {
          const r = writeProjectSkill({});
          if (r.changed) skill = ` Project skill updated (v${r.version}).`;
        } catch {
          /* the skill is regenerated on the next approval */
        }
      }
      return text(`Task closed. ${st.history.length} tasks in history. The project's boards and memory are kept.${skill}`);
    },
  );
}

// Swarm Mode: the director (the session's own model) keeps the decisions and a small context; cheap subagents
// (agents/scout.md, builder.md, checker.md) do the reading, building and measuring. These tools return the exact
// prompt for a subagent, the way critic_prepare does; the director launches it and passes the prompt unchanged.
// Gates are untouched: scouts call refs_study with a role, so state records studies as always.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { projectDir } from "../../core/paths.mjs";
import { designDoc } from "../../core/skills.mjs";
import { loadState } from "../../core/state.mjs";
import { text, safe } from "../../core/result.mjs";

export const ROLES = ["style", "competitor", "page", "before"];

/** True when this host launches Drip's named subagents (drip:scout ...). Hosts set DRIP_HOST; Claude Code sets nothing. */
export function hostHasSubagents(env = process.env) {
  const h = String(env.DRIP_HOST || "").toLowerCase();
  return h === "" || h === "claude-code";
}

/** Swarm mode is on by config (swarm: true) or because this task was started with mode "swarm". */
export function swarmOn(config, task) {
  if (task?.swarm === false) return false;
  return task?.swarm === true || config?.swarm !== false;
}

const ROLE_ASK = {
  style: "the look the director is aiming for: shipped pages and gallery work with this feel, on the surface being built",
  competitor: "same-product-type rivals: their SHIPPED sites (use refs_site with their real URLs); work out who they are from the subject",
  page: "the same kind of page being made (a landing page, an app home screen), from any product, with the best structure",
  before: "the current version being redesigned (refs_site on its URL)",
};

const QUOTA = { style: 2, competitor: 2, page: 2, before: 1 };

function briefBlock(task) {
  const b = task?.brief;
  if (!b) return task ? `Request: ${task.title}` : "No brief given.";
  return [
    `Request: ${task.title}`,
    `What: ${b.what}`,
    `For: ${b.audience}`,
    `Job: ${b.job}`,
    `Feel: ${(b.feel || []).join(", ")}`,
    b.loves?.length ? `Loves: ${b.loves.join(", ")}` : "",
    b.hates?.length ? `Hates: ${b.hates.join(", ")}` : "",
    `Ambition: ${b.ambition}`,
    b.constraints ? `Constraints: ${b.constraints}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const launch = (type, desc, id) => `Agent({ subagent_type: "drip:${type}", description: "${desc}", prompt: <the text between the lines> })${id ? ` (${id})` : ""}`;

function wrap(type, desc, prompt, tail) {
  return (
    `NOW: launch the ${type} with exactly this prompt (do not edit it, do not add your opinion):\n${launch(type, desc)}\n\n` +
    `----------------------------------------\n${prompt}\n----------------------------------------\n\n${tail}`
  );
}

export function scoutPrompt({ role, subject, style, task }) {
  const studied = (task?.refs?.studied || []).filter((s) => s.role === role).map((s) => s.key);
  return [
    `DRIP SCOUT · role: ${role}`,
    `Your role: ${role} = ${ROLE_ASK[role]}.`,
    `Subject: ${subject || task?.title || "(see the brief)"}`,
    style ? `Style words (keep them OUT of the subject searches; search the subject and the style separately): ${style}` : "",
    "",
    "THE BRIEF",
    briefBlock(task),
    "",
    studied.length ? `Already studied for this role (do not repeat): ${studied.join(", ")}` : "",
    `Quota: the gate needs at least ${QUOTA[role]} studied "${role}" references; return the best 3.`,
    "",
    "Do this: use refs_site / refs_search / refs_gallery for this role only; refs_view every candidate and drop cookie walls, country pickers, bot checks, error and login pages; then call refs_study ONCE for your three with " +
      `role: "${role}" and real measured values. Answer in your standard format: the three, five lines each, then the dropped candidates.`,
  ]
    .filter((x) => x !== "")
    .join("\n");
}

export function buildPrompt({ section, spec, files, url, task }) {
  const doc = designDoc();
  const chosen = task?.board?.chosen;
  return [
    `DRIP BUILDER · section: ${section}`,
    "",
    "THE BRIEF",
    briefBlock(task),
    chosen ? `Chosen direction: ${chosen}` : "",
    "",
    "THE SECTION SPEC (from the director; build exactly this)",
    spec,
    "",
    doc
      ? `THE LOCKED DIRECTION AND SYSTEM (${doc.rel}; follow it, change nothing in it):\n${doc.text.slice(0, 5000)}`
      : "No DESIGN.md yet: use the project's existing tokens and the kit's base.css (drip_kit) as the system.",
    "",
    `KIT: the project's base stylesheet from drip_kit (type roles, 12-column grid, spacing scale, .button states). Use its classes and variables; never add a new size or colour.`,
    files?.length
      ? `YOU MAY TOUCH ONLY: ${files.join(", ")}`
      : `WRITE ONLY: sections/${String(section).replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.html (the <section> element alone, no <html>/<head>) and styles/sections/${String(section).replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.css, next to the page. Other builders are writing the other sections at the same time; the director stitches them in with page_stitch. Use the page's tokens and classes; add the hover layer (cards lift 2px, photos zoom 1.02, buttons step) and the section's motion.`,
    url ? `PAGE TO CHECK: ${url} (shoot only your section: fitcheck_shot with section set to its CSS selector)` : "",
    "",
    "Answer in your standard format: changed files, the one-section screenshot path, open points.",
  ]
    .filter((x) => x !== "")
    .join("\n");
}

export function checkerPrompt({ url, sections, imagesOnRequest }) {
  return [
    "DRIP CHECKER",
    `URL: ${url}`,
    sections?.length ? `Sections (one fitcheck_shot with numbersOnly: true and section: <selector> each): ${sections.join(", ")}` : "Whole page: one fitcheck_shot with numbersOnly: true.",
    imagesOnRequest ? "Images on request only: say which section and size needs a look, do not open images yourself." : "No images.",
    "",
    "Answer in your standard format: BLOCKERS, NUMBERS, CHECKED. Nothing else.",
  ].join("\n");
}

/** The short block drip_start shows in swarm mode. */
export function swarmInstructions(task, { env = process.env } = {}) {
  const lines = ["SWARM MODE: you are the director. You decide; cheap agents read, build and measure."];
  if (!hostHasSubagents(env)) {
    lines.push(
      `This host (${env.DRIP_HOST}) does not launch Drip's named subagents, so work the single-agent loop: the same gates, the same tools, you do the scouting, building and checking yourself. ` +
        "scout_prepare, build_prepare and checker_prepare still return the exact briefs, so you can follow them in order. See docs/HOSTS.md.",
    );
    return lines.join("\n");
  }
  lines.push(
    "- Research: scout_prepare once per role (style, competitor, page; before when redesigning) and launch the scouts IN PARALLEL in one message. They study through refs_study, so the gates count their work.",
    "- Decide: brief, thesis, directions and the choice stay with you. Write each section's spec yourself.",
    "- Build: build_prepare per section, launch the drip:builder, one section at a time (or independent sections in parallel when they touch different files).",
    "- Measure: checker_prepare, launch the drip:checker after each section and before the critic; fix blockers before asking for taste.",
    "- Judge: critic_prepare as always. The critic is never a scout, builder or checker.",
    "Details: drip_guide swarm.",
  );
  return lines.join("\n");
}

export function register(server, ctx) {
  const taskNow = () => loadState().task;

  server.registerTool(
    "scout_prepare",
    {
      title: "Prepare a reference scout",
      description:
        "Swarm Mode. Returns the exact prompt for a drip:scout subagent (Haiku) that finds and studies references for ONE role and returns the top 3 with a five-line study each. " +
        'Launch one per role in parallel: Agent({ subagent_type: "drip:scout", description: "Scout <role>", prompt: <returned prompt> }). The scout calls refs_study with the role, so the gates count it. ' +
        'Example: scout_prepare({ role: "competitor", subject: "modular baby stroller" }) · scout_prepare({ role: "style", subject: "premium kids hardware", style: "warm, playful, soft shadows" })',
      inputSchema: {
        role: z.enum(ROLES),
        subject: z.string().optional().describe("What to look for, the thing itself (product type, page kind). Defaults to the task title."),
        style: z.string().optional().describe("The look in words (bold, dark, playful...). Kept apart from the subject in the scout's searches."),
      },
    },
    safe(async ({ role, subject, style }) => {
      const task = taskNow();
      const prompt = scoutPrompt({ role, subject, style, task });
      return text(wrap("scout", `Scout ${role}`, prompt, "Then read the scout's three, pick what you take from each, and carry on. If it reports fewer than the quota, run another scout with a different subject wording."));
    }),
  );

  server.registerTool(
    "build_prepare",
    {
      title: "Prepare a section builder",
      description:
        "Swarm Mode. Returns the exact prompt for a drip:builder subagent (Sonnet) that builds ONE section from your spec, the locked DESIGN.md and the kit, and returns the changed files plus a one-section screenshot. " +
        'Launch: Agent({ subagent_type: "drip:builder", description: "Build <section>", prompt: <returned prompt> }). ' +
        'Example: build_prepare({ section: "hero", spec: "h1 \'Strolls that fold in one move\' at the Display role, left-aligned in cols 1-7; product photo bleeding off the right; one button \'Pre-order\'", files: ["index.html", "styles/hero.css"], url: "http://localhost:3000" })',
      inputSchema: {
        section: z.string().describe("The section's name or id, e.g. hero, pricing, footer"),
        spec: z.string().min(20).describe("What it contains and how it looks, in the director's words: real copy, layout by columns, which roles and colours"),
        files: z.array(z.string()).optional().describe("The only files the builder may touch"),
        url: z.string().optional().describe("The running page, so the builder can shoot its section"),
      },
    },
    safe(async ({ section, spec, files, url }) => {
      const task = taskNow();
      const prompt = buildPrompt({ section, spec, files, url, task });
      return text(wrap("builder", `Build ${section}`, prompt, "Then run checker_prepare for the section, fix blockers, and move to the next section."));
    }),
  );

  server.registerTool(
    "checker_prepare",
    {
      title: "Prepare a measuring checker",
      description:
        "Swarm Mode. Returns the exact prompt for a drip:checker subagent (Haiku) that runs fitcheck_shot in numbersOnly mode (per section when asked) and returns blockers and numbers only. " +
        'Launch: Agent({ subagent_type: "drip:checker", description: "Check <url>", prompt: <returned prompt> }). ' +
        'Example: checker_prepare({ url: "http://localhost:3000", sections: ["#hero", "#pricing"] })',
      inputSchema: {
        url: z.string().optional().describe("Page to measure; defaults to the project's index.html path"),
        sections: z.array(z.string()).optional().describe("CSS selectors, one fitcheck_shot each"),
        imagesOnRequest: z.boolean().optional(),
      },
    },
    safe(async ({ url, sections, imagesOnRequest }) => {
      let target = url;
      if (!target) {
        const f = `${projectDir()}/index.html`;
        if (fs.existsSync(f)) target = f;
      }
      if (!target) return text("No page URL. Pass url (the running page).", true);
      return text(wrap("checker", "Check build", checkerPrompt({ url: target, sections, imagesOnRequest }), "Fix every blocker it lists, then check again; only then ask for the critic."));
    }),
  );

  server.registerTool(
    "page_stitch",
    {
      title: "Stitch section files into the page",
      description:
        "Swarm Mode. Builders each write sections/<id>.html (the <section> only) and styles/sections/<id>.css, so several can work at once without touching the same file. " +
        "This puts the sections into the page in the order given, between <!-- drip:sections --> and <!-- /drip:sections --> (added before </main>, the footer or </body> the first time), and links each section's stylesheet in the <head>. Run it again after any builder finishes.",
      inputSchema: {
        page: z.string().describe("The page, e.g. saas-award/index.html"),
        sections: z.array(z.string()).min(1).max(20).describe("Section ids in page order, e.g. ['features', 'proof', 'pricing', 'footer']"),
      },
    },
    safe(async ({ page, sections }) => {
      const abs = path.resolve(projectDir(), page);
      if (!fs.existsSync(abs)) return text(`No page at ${page}. Write the page (nav + hero) first.`, true);
      const dir = path.dirname(abs);
      let html = fs.readFileSync(abs, "utf8");
      const found = [];
      const missing = [];
      const parts = sections.map((id) => {
        const f = path.join(dir, "sections", `${id}.html`);
        if (!fs.existsSync(f)) {
          missing.push(id);
          return "";
        }
        found.push(id);
        return fs.readFileSync(f, "utf8").trim();
      });
      const block = `<!-- drip:sections -->\n${parts.filter(Boolean).join("\n\n")}\n<!-- /drip:sections -->`;
      if (/<!-- drip:sections -->[\s\S]*?<!-- \/drip:sections -->/.test(html)) html = html.replace(/<!-- drip:sections -->[\s\S]*?<!-- \/drip:sections -->/, () => block);
      else {
        const at = ["</main>", "<footer", "</body>"].map((t) => html.lastIndexOf(t)).find((i) => i >= 0);
        html = at >= 0 ? `${html.slice(0, at)}${block}\n${html.slice(at)}` : `${html}\n${block}\n`;
      }
      const links = found
        .filter((id) => fs.existsSync(path.join(dir, "styles", "sections", `${id}.css`)) && !html.includes(`styles/sections/${id}.css`))
        .map((id) => `<link rel="stylesheet" href="styles/sections/${id}.css">`);
      if (links.length) html = html.replace("</head>", `${links.join("\n")}\n</head>`);
      fs.writeFileSync(abs, html);
      return text(`Stitched ${found.length} section(s) into ${page}${found.length ? `: ${found.join(", ")}` : ""}.${missing.length ? ` Not written yet: ${missing.join(", ")} (sections/<id>.html).` : ""}${links.length ? ` Linked ${links.length} stylesheet(s).` : ""} Next: fitcheck_shot({ url: "${page}" }).`);
    }),
  );
}

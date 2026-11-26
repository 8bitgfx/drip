// Swarm Mode: the director (the session's own model) keeps the decisions and a small context; cheap subagents
// (agents/scout.md, builder.md, checker.md) do the reading, building and measuring. These tools return the exact
// prompt for a subagent, the way critic_prepare does; the director launches it and passes the prompt unchanged.
// Gates are untouched: scouts call refs_study with a role, so state records studies as always.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { projectDir } from "../../core/paths.mjs";
import { designDoc } from "../../core/skills.mjs";
import { loadState, updateState } from "../../core/state.mjs";
import { text, safe } from "../../core/result.mjs";
import { launchLine, writeBrief } from "../../core/briefs.mjs";
import { slug as slugOf } from "../../core/util.mjs";

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

export const slug = (s) => slugOf(s, { max: Infinity });
export const pascal = (s) => slug(s).split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Section";

/** The page this task builds: { dir, stack } from layout_deal, or worked out from a folder. */
export function pageOf(task, page) {
  const dir = page ? path.resolve(projectDir(), page) : task?.page?.dir ? path.resolve(projectDir(), task.page.dir) : null;
  if (!dir) return null;
  const root = fs.existsSync(dir) && fs.statSync(dir).isFile() ? path.dirname(dir) : dir;
  const react = fs.existsSync(path.join(root, "src", "App.tsx")) && fs.existsSync(path.join(root, "package.json"));
  return { root, rel: path.relative(projectDir(), root) || ".", stack: react ? "react" : "html" };
}

/** Where a section's files go on this page. Hero and nav and footer live in fixed files. */
const WHOLE = ["page", "whole-page", "index", "app"];
const OWN = ["nav", "hero", "footer"];

export function sectionFiles(section, stack) {
  const id = slug(section);
  if (WHOLE.includes(id)) return stack === "react" ? ["src/"] : ["index.html", "styles/", "scripts/", "assets/"];
  if (stack === "react") return [`src/sections/${pascal(id)}.tsx`];
  if (["nav", "hero", "footer"].includes(id)) return ["index.html"];
  return [`sections/${id}.html`, `styles/sections/${id}.css`];
}

/** What the director must have done before builders start (fast loop): looked at real work, looked at the pieces, and
 *  said what each big section takes from which reference. Rules live in the tool, not only in the guide. */
export function buildGaps(task, list) {
  const gaps = [];
  const seen = new Set([...(task.refs?.viewed || []), ...(task.refs?.studied || []).map((s) => s.key)].filter((k) => !task.before?.url || !String(task.before.url).replace(/^https?:\/\/(www\.)?/, "").startsWith(String(k).replace(/^site:(www\.)?/, "").split("/")[0])));
  if (seen.size < 4)
    gaps.push(`References: ${seen.size} looked at, 4 needed (the client's own site doesn't count). refs_site({ urls: [3-4 shipped sites people compare this with or the best in the category] }) and refs_gallery for the pattern; then take two or three decisions from them.`);
  // Looking is not studying: a screenshot sheet scrolled past leaves nothing behind. Three written studies (what it does,
  // in numbers, what to take and leave, how it moves) are what the build follows; their takes go into every builder's prompt.
  const studied = (task.refs?.studied || []).filter((s) => s.role !== "before");
  if (seen.size >= 4 && studied.length < 3)
    gaps.push(`Study: ${seen.size} references looked at, ${studied.length} studied (3 needed). refs_study({ studies: [...] }) on the 3 best you saw, in ONE call: each one's layout, type, colour and density in numbers, the one move worth stealing, what you take and leave, and motion (what hover, scroll and load do). The builders get what you take.`);
  const used = task.toolUse || {};
  const pieces = list.filter((s) => s.piece && !/^custom/i.test(s.piece));
  if (pieces.length && !used.pieces_preview && !used.parts_preview)
    gaps.push("Pieces: you haven't looked at any. pieces_preview({ items: [...] }) the candidates (several per section, one sheet) and choose by eye; components_find({ need }) when the shortlist has nothing good.");
  // Pieces before homemade: a custom section names why, from a short list, and "searched" needs a real search behind it.
  for (const s of list.filter((x) => /^custom/i.test(x.piece || ""))) {
    const why = String(s.piece).replace(/^custom\s*:?\s*/i, "").trim().toLowerCase();
    const reason = (why.match(/^(product-ui|data|brand-art|tiny|searched)\b/) || [])[1];
    if (!reason)
      gaps.push(`${s.section}: "custom" needs one of the reasons homemade is allowed: product-ui (the product's own screens), data (a chart of real numbers), brand-art (the client's own art), tiny (a label row), or searched <what you searched for>. Otherwise use a piece: components_find({ need }) and pieces_preview.`);
    else if (reason === "searched") {
      // The search named has to have happened: some components_find for (roughly) this need.
      const what = (why.replace(/^searched\s*:?\s*/, "").match(/[a-z]{4,}/g) || []).filter((w) => !["with", "that", "this", "from", "into", "nothing", "found", "none", "fits"].includes(w));
      const searched = (task.searches || []).some((q) => what.some((w) => q.toLowerCase().includes(w)));
      if (!used.components_find) gaps.push(`${s.section}: "custom: searched" but no components_find has run in this task. Search for the need in words first.`);
      else if (!what.length || !searched) gaps.push(`${s.section}: "custom: searched ${what.join(" ") || "…"}" doesn't match any search you ran (${(task.searches || []).slice(-5).map((q) => `"${q}"`).join(", ") || "none"}). Search for this section's need with components_find, preview what comes back, then decide.`);
    }
  }
  // "from" names a reference you studied, not a phrase: its site or designer has to be one you looked at.
  const refNames = new Set(
    [...(task.refs?.studied || []).flatMap((r) => [r.source, r.key, r.designer]), ...(task.refs?.viewed || [])]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase().replace(/^site:/, "").replace(/^https?:\/\/(www\.)?/, "").split(/[/?#]/)[0].split(".")[0])
      .filter((x) => x && x.length >= 3 && !/^[a-z]\d+-\d+$/.test(x)),
  );
  const big = list.filter((s) => ["hero", "page", "whole-page", "index", "app"].includes(slug(s.section)));
  for (const s of big) {
    if (!s.from || s.from.length < 12) gaps.push(`${s.section}: say what it takes from which reference (from: "linear.app: the product shot rising out of a soft light; cosmos.so: the wall of real outputs").`);
    else if (refNames.size && ![...refNames].some((n) => s.from.toLowerCase().includes(n))) gaps.push(`${s.section}: "from" has to name a reference you looked at (${[...refNames].slice(0, 6).join(", ")}…) and what this section takes from it.`);
  }
  return gaps;
}

/** What the director studied, for the builders: the craft to match, not a look to copy. */
export function studiedTakes(task) {
  const st = (task?.refs?.studied || []).filter((s) => s.take && s.role !== "before").slice(-5);
  if (!st.length) return "";
  return `\nWHAT THE DIRECTOR STUDIED (match this level of craft; never copy a reference's colours or surface):\n${st.map((s) => `- ${s.source || s.key}: take ${s.take}${s.motion ? `; motion: ${s.motion}` : ""}`).join("\n")}`;
}

/** At most this many builders per build_prepare: the director directs one or two builders, never a swarm. */
export const MAX_BUILDERS = 2;
const PER_BUILDER = 3;

/** Split the sections over the builders, in page order: one builder up to 3 sections, two beyond. Sections that write
 *  the page's own index.html (nav, hero, footer) or the whole page stay with one builder, so two never edit one file. */
export function groupSections(list, max = MAX_BUILDERS) {
  const n = Math.min(max, Math.max(1, Math.ceil(list.length / PER_BUILDER)));
  if (n === 1 || list.some((s) => WHOLE.includes(slug(s.section)))) return [list];
  const shared = new Set(list.filter((s) => OWN.includes(slug(s.section))));
  const groups = [[...shared], []];
  for (const s of list) {
    if (shared.has(s)) continue;
    (groups[0].length <= groups[1].length ? groups[0] : groups[1]).push(s);
  }
  // Keep page order inside each group.
  return groups.filter((g) => g.length).map((g) => list.filter((s) => g.includes(s)));
}

/** One section's part of a builder's brief: its spec, piece and files. */
function sectionBlock({ section, spec, files, piece }, pg, stack, many) {
  const id = slug(section);
  const mine = files?.length ? files : sectionFiles(section, stack);
  const pieceLine = piece
    ? /^custom/i.test(piece)
      ? `PIECE: none (${piece}). Build it yourself, to the level of the library pieces around it, inside a piece's frame (window, device, card) when one is installed.`
      : stack === "react"
        ? `THE PIECE: ${piece}. It is installed (pieces_install) under src/components/: find it, import it and use it AS IT IS: keep its motion, structure and craft; change only colours (to the tokens: replace its hard-coded zinc/slate/blue with bg-background, text-foreground, the brand colour), radius, font and content (the client's words, numbers, pictures). Never rewrite or "simplify" it, and never swap it for something you made: if it won't install or breaks the build, fix that (a dependency, an import path) or say so in your answer. Some registries (Aceternity) leave out the keyframes: if it uses an animate-* class that isn't defined, add the keyframes and --animate-* to src/index.css from the library's page. If it is not installed yet, run: npx shadcn@latest add --yes ${/^https?:/.test(piece) ? piece : "<its registry url>"}`
        : `THE PIECE: ${piece}. Copy it in (parts_get for a taste part; a plain-HTML library piece: download its file into assets/) and use it as it is; restyle only colours, radius, font and content.`
    : "";
  const placement =
    stack === "react"
      ? [...OWN, ...WHOLE].includes(id)
        ? ""
        : `Export the section as the default export of ${mine[0]}, wrapped in <section id="${id}">.`
      : WHOLE.includes(id)
        ? "You build the whole page: index.html and its own styles and scripts."
        : OWN.includes(id)
          ? "Edit the page's own nav / hero / footer in index.html (and its <style>)."
          : `${mine[0]} holds the <section id="${id}"> element alone (no <html>/<head>), ${mine[1]} its styles.`;
  return [
    many ? `=== SECTION: ${section} ===` : "",
    "THE SECTION SPEC (from the director; build exactly this)",
    spec,
    pieceLine,
    stack === "react" && id === "hero" && pg && fs.existsSync(path.join(pg.root, "src", "sections", "hero.recipe.html"))
      ? "THE HERO LAYOUT: src/sections/hero.recipe.html is the dealt layout (its grid, sizes and entrance). Follow it in Tailwind; its copy is a demo, never ship it."
      : "",
    `Files: ${mine.join(", ")}. ${placement}`,
  ].filter((x) => x !== "");
}

/** The brief for one builder: one section (section, spec, piece, files) or several (items: [...]). */
export function buildPrompt({ section, spec, files, url, task, piece, page, items }) {
  const list = items?.length ? items : [{ section, spec, files, piece }];
  const chosen = task?.board?.chosen;
  const pg = page || pageOf(task);
  // The system of THIS page: its own DESIGN.md (a page in a subfolder never inherits the repo's), else its tokens.
  const doc = pg && pg.rel !== "." ? designDoc(pg.root) : designDoc(undefined, task);
  const stack = pg?.stack || "html";
  const many = list.length > 1;
  const mine = [...new Set(list.flatMap((s) => (s.files?.length ? s.files : sectionFiles(s.section, stack))))];
  const where = pg ? `The page: ${pg.rel}/ (${stack === "react" ? "React + Vite + Tailwind v4" : "one static HTML page"}).` : "";
  const system =
    stack === "react"
      ? "THE SYSTEM (src/index.css, taste-skill's numbers): colours bg-background, text-foreground, bg-card, text-muted-foreground, bg-primary text-primary-foreground, text-brand, border-border; type roles ONLY text-display, text-h1, text-h2, text-h3, text-lead, text-body, text-small, text-label, text-stat with font-display for headings (never text-5xl / text-[68px]); layout: wrap for the column (same edges as every section), section-pad for a section's rhythm, head-gap under a section heading; the hover layer: lift on cards, press on buttons, photo-zoom on framed pictures; enter on hero children (style={{ \"--i\": n }} orders them). rounded-[var(--radius)]. Never add a colour, size or font. Images in public/ (or remote URLs). Icons: lucide-react."
      : doc
        ? `THE LOCKED DIRECTION AND SYSTEM (${doc.rel}; follow it, change nothing in it):\n${doc.text.slice(0, 5000)}`
        : "THE SYSTEM: the page's own head: the :root tokens (--p-bg, --p-surface, --p-ink, --p-muted, --p-accent, --p-action; --font-display, --font-text) and the kit in assets/ (system.css type roles and spacing, .button, the motion layer). Use its classes and variables; never add a size or a colour.";
  const ids = list.map((s) => s.section);
  return [
    `DRIP BUILDER · ${many ? `sections: ${ids.join(", ")}` : `section: ${ids[0]}`}`,
    "",
    "THE BRIEF",
    briefBlock(task),
    chosen ? `Chosen direction: ${chosen}` : "",
    "",
    many ? `You build ${list.length} sections, in this order, one after another; they share one system, so keep their rhythm and detail consistent with each other.` : "",
    ...list.flatMap((s) => [...sectionBlock(s, pg, stack, many), ""]),
    studiedTakes(task),
    "",
    where,
    system,
    `YOU MAY TOUCH ONLY: ${mine.join(", ")}${stack === "react" ? " (and new files under src/components/ for these sections)" : ""}.`,
    list.some((s) => ![...OWN, ...WHOLE].includes(slug(s.section)))
      ? `Another builder may write other sections at the same time; the director stitches them into ${stack === "react" ? "App.tsx" : "the page"}.`
      : "",
    "Add the hover layer (cards lift 2px, photos zoom 1.02, buttons step and press) and the section's motion; respect prefers-reduced-motion. 375px and 1440px must both hold.",
    "No screenshots and no fit checks: the director checks the whole page once. Real copy only (from the spec), never lorem, never invented logos, numbers, times or quotes: a number the spec doesn't give is a [bracket].",
    url ? `The page runs at ${url} if you need to look at it.` : "",
    "",
    "Answer in your standard format: changed files, the piece used, open points.",
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
    "Every call you make re-reads your whole context, so the run's cost is your calls x your context: few calls, few pictures, and the long briefs live in files.",
    "- Look and decide yourself: references, the deal, the pieces and each section's spec. No scouts or checkers in the fast loop.",
    `- Build: ONE build_prepare with every section (each names its library piece); it groups them over one or two drip:builder agents (Sonnet, never more than ${MAX_BUILDERS}). You are the director: you write specs, not code (small fixes only), and you never hand the task to another session.`,
    "- Fixes: ONE list after the page check. Small ones in one edit of yours; the rest in one SendMessage to the builder that wrote the section (it keeps its context). Never relaunch a builder for a fix.",
    "- Mechanical jobs (installs, downloads, renames) are tools: pieces_install, images_save, drip_execute. A drip:helper (Haiku) only for a long job whose output you shouldn't read.",
    "- Measure: fitcheck_shot of the whole page; after the first look it returns numbers only.",
    "- The critic (Sonnet) only when the user wants a second opinion.",
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

  const SECTION = z.object({
    section: z.string().describe("id: hero, nav, footer, features, pricing..."),
    spec: z.string().min(20).describe("Its idea, real copy, layout, picture and motion, in the director's words"),
    piece: z.string().optional().describe("The library piece it is built on (a registry URL or name from PIECES ON OFFER / components_find / parts_list), or 'custom: <why no piece fits>'"),
    from: z.string().optional().describe("What it takes from which studied reference ('linear.app: product shot rising out of light'). Required for the hero"),
    files: z.array(z.string()).optional(),
  });

  server.registerTool(
    "build_prepare",
    {
      title: "Prepare section builders",
      description:
        `Swarm Mode. Pass EVERY section in one call (sections: [...]); it groups them over at most ${MAX_BUILDERS} drip:builder subagents (Sonnet; one builder up to ${PER_BUILDER} sections) and returns each builder's exact prompt. Launch them in ONE message. ` +
        "Each section names its piece (a library component it is built on) or says why it is custom. The builders write code; you direct. " +
        'Example: build_prepare({ page: "saas-award-4", sections: [{ section: "features", spec: "Bento of four live features...", piece: "https://magicui.design/r/bento-grid.json" }, { section: "proof", spec: "...", piece: "custom: a single quote with the founder photo" }] })',
      inputSchema: {
        sections: z.array(SECTION).min(1).max(12).optional().describe("Every section to build now"),
        page: z.string().optional().describe("The page folder (default: the one layout_deal wrote)"),
        url: z.string().optional().describe("The running page, if the builders need to look"),
        section: z.string().optional().describe("Old form: one section"),
        spec: z.string().optional(),
        files: z.array(z.string()).optional(),
        piece: z.string().optional(),
      },
    },
    safe(async ({ sections, page, url, section, spec, files, piece }) => {
      const task = taskNow();
      const list = sections?.length ? sections : section && spec ? [{ section, spec, files, piece }] : [];
      if (!list.length) return text("Pass sections: [{ section, spec, piece }, ...].", true);
      const fast = task?.loop === "fast";
      if (fast && !task.skipped) {
        const gaps = buildGaps(task, list);
        if (gaps.length) return text(`Not yet: fast is no excuse to skip looking.\n${gaps.map((g) => `- ${g}`).join("\n")}\nThen build_prepare again.`, true);
      }
      const bare = list.filter((s) => !s.piece);
      if (fast && bare.length)
        return text(
          `Every section names its piece: ${bare.map((s) => s.section).join(", ")} has none. Pick one from PIECES ON OFFER (layout_deal), components_find({ kind }) or parts_list, or write piece: "custom: <why no piece fits>". Proven pieces are already tuned; use them.`,
          true,
        );
      const pg = pageOf(task, page);
      const withFrom = list.map((s) => ({ ...s, spec: s.from ? `${s.spec}\nTAKES FROM: ${s.from}` : s.spec }));
      const prompts = groupSections(withFrom).map((items) => ({ ids: items.map((s) => s.section), prompt: buildPrompt({ items, url, task, page: pg }) }));
      updateState((st) => {
        if (!st.task) return;
        st.task.built = [...new Set([...(st.task.built || []), ...list.map((s) => slug(s.section))])];
        st.task.directorLines = 0; // the builders take over: the director's running total starts again
        st.task.directorEdits = 0;
        // What each section is meant to do: the critic sees stills, so it gets the pieces and specs in words.
        st.task.sections ||= {};
        for (const s of list) st.task.sections[slug(s.section)] = { piece: s.piece || "", spec: String(s.spec || "").slice(0, 300), from: s.from ? String(s.from).slice(0, 200) : undefined };
      });
      const react = pg?.stack === "react";
      const toInstall = react ? list.map((s) => s.piece).filter((p) => p && /^https?:/.test(p) && !(task?.pieces || []).includes(p)) : [];
      const head =
        (toInstall.length ? `FIRST: pieces_install({ page: "${pg.rel}", urls: ${JSON.stringify(toInstall)} }) (one run; then launch).\n\n` : "") +
        `NOW: launch ${prompts.length === 1 ? "ONE builder" : `the ${prompts.length} builders in ONE message`} with exactly ${prompts.length === 1 ? "this call" : "these calls"} (each brief is in its file; you don't need to read it; never split them into more agents):\n`;
      // Briefs go to files: the builders read them; the director's context keeps only the launch lines.
      const body = prompts.map(({ ids, prompt }) => launchLine("builder", `Build ${ids.join(", ")}`.slice(0, 60), prompt, writeBrief(`build-${ids.join("-")}`, prompt))).join("\n");
      const stitchable = list.map((s) => slug(s.section)).filter((id) => ![...OWN, ...WHOLE].includes(id));
      const tail = stitchable.length
        ? `\n\nWhen they finish: page_stitch({ page: "${pg?.rel || "<page folder>"}", sections: [<every section id in page order>] }) (fitcheck_shot re-stitches by itself after that), then fitcheck_shot once. Small fixes you make yourself; anything bigger goes back to its builder (SendMessage to it) or a drip:helper.`
        : `\n\nWhen it finishes: fitcheck_shot once. Small fixes you make yourself; anything bigger goes back to the builder (SendMessage to it).`;
      return text(head + body + tail);
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
        "Swarm Mode. Builders each write their own section file so several work at once. This puts the sections into the page in the order given: a static page gets sections/<id>.html between <!-- drip:sections --> markers and each styles/sections/<id>.css linked; a React page gets src/sections/<Id>.tsx imported into App.tsx. " +
        "Run it once when the builders finish; fitcheck_shot re-stitches by itself after a section file changes.",
      inputSchema: {
        page: z.string().describe("The page, e.g. saas-award/index.html"),
        sections: z.array(z.string()).min(1).max(20).describe("Section ids in page order, e.g. ['features', 'proof', 'pricing', 'footer']"),
      },
    },
    safe(async ({ page, sections }) => {
      const r = stitchPage(page, sections);
      if (r.error) return text(r.error, true);
      updateState((st) => {
        if (st.task) st.task.stitch = { page, sections };
      });
      return text(`${r.summary} fitcheck_shot re-stitches by itself when a section file changes. Next: fitcheck_shot({ url: "${page}" }).`);
    }),
  );
}

/** Put section files into the page (static: sections/<id>.html between markers; React: imports + elements in App.tsx). */
export function stitchPage(page, sections) {
  const pg = pageOf(null, page);
  if (!pg || !fs.existsSync(pg.root)) return { error: `No page at ${page}. Write the page (nav + hero) first.` };
  const found = [];
  const missing = [];
  if (pg.stack === "react") {
    const app = path.join(pg.root, "src", "App.tsx");
    let src = fs.readFileSync(app, "utf8");
    for (const id of sections) (fs.existsSync(path.join(pg.root, "src", "sections", `${pascal(id)}.tsx`)) ? found : missing).push(id);
    const imports = found.map((id) => `import ${pascal(id)} from "./sections/${pascal(id)}";`).join("\n");
    const els = found.map((id) => `        <${pascal(id)} />`).join("\n");
    if (!/\/\/ drip:imports[\s\S]*?\/\/ \/drip:imports/.test(src) || !/\{\/\* drip:sections \*\/\}[\s\S]*?\{\/\* \/drip:sections \*\/\}/.test(src))
      return { error: `${path.relative(projectDir(), app)} has no drip markers (// drip:imports … // /drip:imports and {/* drip:sections */} … {/* /drip:sections */}). Add them, or import the sections by hand.` };
    src = src.replace(/\/\/ drip:imports[\s\S]*?\/\/ \/drip:imports/, () => `// drip:imports\n${imports}${imports ? "\n" : ""}// /drip:imports`);
    src = src.replace(/\{\/\* drip:sections \*\/\}[\s\S]*?\{\/\* \/drip:sections \*\/\}/, () => `{/* drip:sections */}\n${els}${els ? "\n" : ""}        {/* /drip:sections */}`);
    fs.writeFileSync(app, src);
    return { summary: `Stitched ${found.length} section(s) into ${pg.rel}/src/App.tsx${found.length ? `: ${found.join(", ")}` : ""}.${missing.length ? ` Not written yet: ${missing.join(", ")} (src/sections/<Id>.tsx).` : ""}`, found, missing };
  }
  const abs = fs.statSync(path.resolve(projectDir(), page)).isFile() ? path.resolve(projectDir(), page) : path.join(pg.root, "index.html");
  if (!fs.existsSync(abs)) return { error: `No page at ${page}. Write the page (nav + hero) first.` };
  const dir = path.dirname(abs);
  let html = fs.readFileSync(abs, "utf8");
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
  return { summary: `Stitched ${found.length} section(s) into ${path.relative(projectDir(), abs)}${found.length ? `: ${found.join(", ")}` : ""}.${missing.length ? ` Not written yet: ${missing.join(", ")} (sections/<id>.html).` : ""}${links.length ? ` Linked ${links.length} stylesheet(s).` : ""}`, found, missing };
}

/** Re-stitch a static page when a section file changed after the page was last written (fitcheck_shot calls this). */
export function restitchIfStale(task) {
  const s = task?.stitch;
  if (!s) return null;
  const pg = pageOf(null, s.page);
  if (!pg || pg.stack === "react") return null; // React pages import the files: nothing to copy
  const abs = fs.existsSync(path.resolve(projectDir(), s.page)) && fs.statSync(path.resolve(projectDir(), s.page)).isFile() ? path.resolve(projectDir(), s.page) : path.join(pg.root, "index.html");
  if (!fs.existsSync(abs)) return null;
  const pageAt = fs.statSync(abs).mtimeMs;
  const newer = s.sections.some((id) => {
    const f = path.join(path.dirname(abs), "sections", `${id}.html`);
    return fs.existsSync(f) && fs.statSync(f).mtimeMs > pageAt;
  });
  if (!newer) return null;
  return stitchPage(s.page, s.sections).summary || null;
}

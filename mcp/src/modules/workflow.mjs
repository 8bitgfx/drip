// The process tools: start a task, read guides, see what is left, skip, finish.
// These are what make Drip enforce the designer loop instead of hoping Claude reads a skill.
import { z } from "zod";
import { listGuides, normalizeTopic, readGuide, subTopics } from "../core/guides.mjs";
import { checklist, loadState, missingBeforeUi, newTask, updateState } from "../core/state.mjs";
import { text } from "../core/result.mjs";

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

function requiredGuides(size, surface, task) {
  const g = ["rules/hard-rules", "rules/slop-tells"];
  if (size === "full") {
    g.push("loop", "brief", "refs", "moodboard", "direction");
    g.push({ landing: "landing", app: "app", mobile: "mobile", component: "components", other: "layout" }[surface]);
  } else {
    const topics = Object.entries(TOPIC_WORDS).filter(([, re]) => re.test(task)).map(([t]) => t);
    g.push(...(topics.length ? topics.slice(0, 3) : ["polish"]));
  }
  return [...new Set(g)];
}

function nextStep(task, config) {
  const missing = missingBeforeUi(task, config);
  if (missing.length) return `NEXT: ${missing[0].how}.`;
  if (task.size === "full" && !task.system) return "NEXT: write the system (DESIGN.md + tokens) from the chosen direction: drip_guide system, then drip_mark system.";
  return "NEXT: build. Prefer a library component (components_find). After building, run fitcheck_shot and fitcheck_done before you finish.";
}

export function register(server, ctx) {
  server.registerTool(
    "drip_start",
    {
      title: "Start a design task",
      description:
        "Start a Drip design task (the user ran /drip:start or asked for Drip / a proper design process): a new page, screen, component, redesign, or a polish pass. " +
        "It decides the loop (full for new/redesigned UI, quick for tweaks), lists the guides you must read and returns the first one. " +
        "While the task is open, the plugin blocks writing UI files until its requirements are met; close it with drip_end.",
      inputSchema: {
        task: z.string().describe("What you are designing, in the user's words plus context. e.g. 'pricing page for a dev-tools SaaS, dark, technical audience'"),
        size: z.enum(["full", "quick"]).optional().describe("full = new page/component/redesign (references, moodboard, direction). quick = tweak to existing UI. Omit to let Drip decide."),
        surface: z.enum(["landing", "app", "mobile", "component", "other"]).optional(),
      },
    },
    async ({ task, size, surface }) => {
      const g = guess(task);
      const s = size || g.size;
      const sf = surface || g.surface;
      const guides = requiredGuides(s, sf, task);
      const t = newTask({ title: task, size: s, surface: sf, guides });
      const first = s === "full" ? "loop" : guides[2] || "rules/hard-rules";
      const body = readGuide(first);
      if (body) t.guidesRead.push(first);
      updateState((st) => {
        if (st.task) st.history.push({ ...st.task, endedAt: new Date().toISOString(), endedBy: "new task" });
        st.task = t;
      });
      return text(
        `Drip task started: ${s.toUpperCase()} loop, surface: ${sf}.\n` +
          (s === "full"
            ? "Full loop because this is new or redesigned UI. If it is really a small tweak, call drip_start again with size: \"quick\".\n"
            : "Quick loop because this is a change to existing UI. If it is new UI or a redesign, call drip_start again with size: \"full\".\n") +
          `\nREQUIRED GUIDES (the plugin blocks UI writes until each is read with drip_guide):\n${guides.map((x) => `- ${x}${x === first ? "  (included below)" : ""}`).join("\n")}\n\n` +
          `${nextStep(t, ctx.config())}\n\n` +
          (body ? `=================== GUIDE: ${first} ===================\n${body}` : ""),
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
        "components, interaction, motion, imagery, productshots, icons, copy, a11y, fitcheck, polish, rules/hard-rules, rules/slop-tells, rules/per-surface, rules/licences. " +
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

// Niche packs (/drip:adapt): Drip specialised for a niche. See core/packs.mjs for the layout.
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { PACK_FILES, WORKFLOW_GATES, createPack, exportPack, importPack, listPacks, readPackFile, writePackFile } from "../../core/packs.mjs";
import { get } from "../../core/http.mjs";
import { projectDir } from "../../core/paths.mjs";
import { safe, text } from "../../core/result.mjs";

export function register(server) {
  server.registerTool(
    "pack_export",
    {
      title: "Export a niche pack to share",
      description:
        "Writes a pack as ONE portable file (<id>.drip-pack.json: its guide, critic rubric, references, slop list, what it learned) to send however the user likes: a DM, a drive, a gist they choose. Nothing is published. " +
        "It lists anything that looks private first (emails, keys, local paths); pass redact: true to strip them. Someone else adds it with pack_import, and Drip then knows the niche without running /drip:adapt.",
      inputSchema: { id: z.string(), out: z.string().optional().describe("Folder for the file (default: the project)"), redact: z.boolean().optional() },
    },
    safe(async ({ id, out, redact }) => {
      const { pack, found } = exportPack(id, { redact });
      if (found.length && !redact)
        return text(`Not exported: this pack holds things that may be private:\n${found.slice(0, 12).map((f) => `- ${f.file}: ${f.what} (${f.sample}…)`).join("\n")}\nAsk the user, then pack_export({ id: "${id}", redact: true }) to strip them (or edit the pack first).`, true);
      const dir = path.resolve(projectDir(), out || ".");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${pack.meta.id}.drip-pack.json`);
      fs.writeFileSync(file, JSON.stringify(pack, null, 1));
      return text(`Exported ${pack.meta.name} to ${path.relative(projectDir(), file)} (${Object.keys(pack.files).length} files, ${Math.round(fs.statSync(file).size / 1024)} KB). Send the file; the other person runs pack_import with its path or a raw link.`);
    }),
  );

  server.registerTool(
    "pack_import",
    {
      title: "Add a niche pack someone shared",
      description: "Adds a .drip-pack.json (a file path or a raw https link) as a personal pack (every project on this machine) or shared: true for this project's team. Packs are data only: nothing in one ever runs.",
      inputSchema: { file: z.string().optional(), url: z.string().url().optional(), shared: z.boolean().optional(), replace: z.boolean().optional() },
    },
    safe(async ({ file, url, shared, replace }) => {
      let raw;
      if (url) raw = (await get(url, { ttlMs: 0, timeoutMs: 30000 })).body;
      else if (file) raw = fs.readFileSync(path.resolve(projectDir(), file), "utf8");
      else return text("Pass file or url.", true);
      const pack = importPack(JSON.parse(raw), { shared, replace });
      return text(`Added "${pack.name}" (${pack.dir}). It switches on when a task mentions ${(pack.keywords || []).slice(0, 6).join(", ") || "this project"}.`);
    }),
  );

  server.registerTool(
    "pack_create",
    {
      title: "Create a niche pack",
      description:
        "Create (or update the metadata of) a niche pack: a specialised Drip for one niche, used automatically when a task mentions its keywords. Follow the drip-adapt skill. " +
        'Example: pack_create({ id: "roblox-ui", name: "Roblox UI", niche: "in-experience game UI for Roblox", keywords: ["roblox", "rbx", "obby", "simulator ui"], summary: "Touch-first, chunky, readable game UI…" }). ' +
        "type \"project\" makes this project's own style pack (saved in .drip/packs, applies to every design task here, no keywords needed; style_update fills it from the approved decisions). " +
        "workflow adds declarative, versioned stages and criteria (data only, never executed).",
      inputSchema: {
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string(),
        niche: z.string(),
        keywords: z.array(z.string()).optional().describe("Words that, when they appear in a task, activate this pack (required for niche packs)"),
        type: z.enum(["niche", "project"]).optional().describe("niche (default) or project: this project's own style pack"),
        workflow: z
          .object({
            stages: z.array(z.object({ id: z.string(), title: z.string().optional(), requires: z.array(z.string()).optional(), gate: z.enum(WORKFLOW_GATES).optional(), criteria: z.array(z.string()).optional(), sources: z.array(z.string()).optional() })),
            criteria: z.array(z.string()).optional(),
          })
          .optional()
          .describe("Declarative stages the critic and the agent follow for this pack; a stage may name an existing Drip gate. Changing it bumps workflowVersion and keeps the old one."),
        summary: z.string(),
        shared: z.boolean().optional().describe("true = save in this project's .drip/packs (share with the team); default personal (~/.drip/packs)"),
      },
    },
    safe(async (p) => {
      if (p.type !== "project" && !(p.keywords || []).length) return text("A niche pack needs at least one keyword (the words that activate it).", true);
      const pack = createPack(p);
      return text(`Pack "${pack.name}" ready at ${pack.dir}${pack.type === "project" ? " (project style pack)" : ""}${pack.workflowVersion ? `, workflow v${pack.workflowVersion}` : ""}.\nWrite its files with pack_write: ${PACK_FILES.join(", ")}. guide.md and critic.md are required; then get it reviewed: critic_prepare({ kind: "pack", targets: ["${pack.id}"] }).`);
    }),
  );

  server.registerTool(
    "pack_write",
    {
      title: "Write a pack file",
      description: `Write one file of a niche pack. Files: ${PACK_FILES.join(", ")}. Markdown files are guides (served as drip_guide pack:<id>/<name>); JSON files must be valid (refs.json: [{ title, url, designer, note }]; slop.json: { rules: [...] } like Drip's; catalogue.json: { entries: [...] }).`,
      inputSchema: { id: z.string(), file: z.enum(PACK_FILES), content: z.string() },
    },
    safe(async ({ id, file, content }) => text(`Wrote ${writePackFile(id, file, content)}.`)),
  );

  server.registerTool(
    "pack_list",
    { title: "List niche packs", description: "Niche packs available here (project-shared first, then personal), with the keywords that activate them.", inputSchema: {} },
    safe(async () => {
      const packs = listPacks();
      return text(packs.length ? packs.map((p) => `- ${p.id}: ${p.name} — ${p.summary?.slice(0, 120) || ""}\n  keywords: ${(p.keywords || []).join(", ")} · ${p.type === "project" ? "project style pack" : p.shared ? "shared (project)" : "personal"} · updated ${p.updatedAt?.slice(0, 10)}`).join("\n") : "No niche packs yet. Create one with /drip:adapt <niche>.");
    }),
  );

  server.registerTool(
    "pack_show",
    { title: "Show a niche pack", description: "A pack's metadata and which files it has (read files with drip_guide pack:<id>/<name>).", inputSchema: { id: z.string() } },
    safe(async ({ id }) => {
      const p = listPacks().find((x) => x.id === id);
      if (!p) return text(`No pack "${id}".`, true);
      const files = PACK_FILES.map((f) => `${readPackFile(id, f) ? "[x]" : "[ ]"} ${f}`);
      return text(`${p.name} (${p.niche})${p.type === "project" ? " · project style pack" : ""}\n${p.summary}\nKeywords: ${(p.keywords || []).join(", ")}${p.workflow ? `\nWorkflow v${p.workflowVersion || 1}: ${p.workflow.stages.map((x) => x.id + (x.gate ? `[${x.gate}]` : "")).join(" -> ")}` : ""}\n${files.join("\n")}\nRead: drip_guide pack:${id} (guide), pack:${id}/genres, pack:${id}/artists, pack:${id}/critic`);
    }),
  );
}

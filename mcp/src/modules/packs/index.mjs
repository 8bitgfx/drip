// Niche packs (/drip:adapt): Drip specialised for a niche. See core/packs.mjs for the layout.
import { z } from "zod";
import { PACK_FILES, createPack, listPacks, readPackFile, writePackFile } from "../../core/packs.mjs";
import { safe, text } from "../../core/result.mjs";

export function register(server) {
  server.registerTool(
    "pack_create",
    {
      title: "Create a niche pack",
      description:
        "Create (or update the metadata of) a niche pack: a specialised Drip for one niche, used automatically when a task mentions its keywords. Follow the drip-adapt skill. " +
        'Example: pack_create({ id: "roblox-ui", name: "Roblox UI", niche: "in-experience game UI for Roblox", keywords: ["roblox", "rbx", "obby", "simulator ui"], summary: "Touch-first, chunky, readable game UI…" })',
      inputSchema: {
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string(),
        niche: z.string(),
        keywords: z.array(z.string()).min(1).describe("Words that, when they appear in a task, activate this pack"),
        summary: z.string(),
        shared: z.boolean().optional().describe("true = save in this project's .drip/packs (share with the team); default personal (~/.drip/packs)"),
      },
    },
    safe(async (p) => {
      const pack = createPack(p);
      return text(`Pack "${pack.name}" ready at ${pack.dir}.\nWrite its files with pack_write: ${PACK_FILES.join(", ")}. guide.md and critic.md are required; then get it reviewed: critic_prepare({ kind: "pack", targets: ["${pack.id}"] }).`);
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
      return text(packs.length ? packs.map((p) => `- ${p.id}: ${p.name} — ${p.summary?.slice(0, 120) || ""}\n  keywords: ${(p.keywords || []).join(", ")} · ${p.shared ? "shared (project)" : "personal"} · updated ${p.updatedAt?.slice(0, 10)}`).join("\n") : "No niche packs yet. Create one with /drip:adapt <niche>.");
    }),
  );

  server.registerTool(
    "pack_show",
    { title: "Show a niche pack", description: "A pack's metadata and which files it has (read files with drip_guide pack:<id>/<name>).", inputSchema: { id: z.string() } },
    safe(async ({ id }) => {
      const p = listPacks().find((x) => x.id === id);
      if (!p) return text(`No pack "${id}".`, true);
      const files = PACK_FILES.map((f) => `${readPackFile(id, f) ? "[x]" : "[ ]"} ${f}`);
      return text(`${p.name} (${p.niche})\n${p.summary}\nKeywords: ${(p.keywords || []).join(", ")}\n${files.join("\n")}\nRead: drip_guide pack:${id} (guide), pack:${id}/genres, pack:${id}/artists, pack:${id}/critic`);
    }),
  );
}

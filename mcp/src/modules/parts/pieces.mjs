// Pieces: finished components from proven free libraries (content/data/pieces.json), dealt per section so a page is assembled
// from crafted parts (their motion, their detail) instead of hand-rolled from scratch. React pages install them with the
// shadcn CLI; plain pages get taste-skill parts (and the few plain-HTML libraries).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dataDir } from "../../core/paths.mjs";

const read = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return d;
  }
};

export function loadPieces() {
  return read(path.join(dataDir, "pieces.json"), { pieces: [] }).pieces || [];
}

/** Registry item patterns by library id, from the catalogue. */
export function registryPatterns() {
  const cat = read(path.join(dataDir, "catalogue.json"), { entries: [] });
  return Object.fromEntries((cat.entries || []).filter((e) => e.registry).map((e) => [e.id, e.registry.item]));
}

export const pieceStack = (p) => p.stack || "react";
export function pieceUrl(p, patterns = registryPatterns()) {
  const pat = patterns[p.lib];
  return pat ? pat.replace("{name}", p.name) : null;
}

// Which roles a page wants, in order, by kind. Grounds (shaders) only where taste-skill allows them: software, gaming, tech.
const ROLES = {
  software: ["nav", "ground", "headline", "showcase", "logos", "features", "features", "numbers", "proof", "pricing", "faq", "cta", "footer"],
  gaming: ["nav", "ground", "headline", "showcase", "features", "features", "proof", "cta", "footer"],
  tech: ["nav", "ground", "headline", "showcase", "features", "scroll", "proof", "cta", "footer"],
  product: ["nav", "headline", "showcase", "features", "scroll", "proof", "cta", "footer"],
  service: ["nav", "headline", "features", "proof", "faq", "cta", "footer"],
  place: ["nav", "headline", "features", "proof", "footer"],
};
const SHADER_OK = new Set(["software", "gaming", "tech"]);
// App screens (dashboards, tools, settings, editors): the shell first, then data, input, feedback.
const APP_ROLES = ["shell", "auth", "chart", "table", "board", "input", "media", "feedback", "status", "command"];

/** A page where you can SEE the piece: its docs page, its live block page, or React Bits' page from its llms.txt. */
export function previewUrl(p, { cats = null, reactbitsPaths = null } = {}) {
  const cat = cats || read(path.join(dataDir, "catalogue.json"), { entries: [] }).entries;
  const e = cat.find((x) => x.id === p.lib);
  const pat = e?.preview;
  if (!pat) return e?.url || null;
  const base = String(p.name).replace(/-(JS|TS)-(CSS|TW)$/i, "");
  if (pat.startsWith("llms:")) {
    const kebab = base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    return (reactbitsPaths || []).find((u) => u.endsWith(`/${kebab}`)) || e.url;
  }
  return pat.replace("{name}", base).replace("{group}", base.replace(/-\d+$/, ""));
}

// Plain pages: taste-skill families stand in for the roles.
const HTML_ROLE = { ground: "effect", showcase: "ui", features: "component", scroll: "moment", numbers: "moment", logos: "moment" };

/** Owned paid kits the user told Drip about (once per machine). */
export function ownedKits(home = process.env.DRIP_HOME || path.join(os.homedir(), ".drip")) {
  return read(path.join(home, "kits.json"), { owned: null }).owned;
}
export function saveKits(owned, home = process.env.DRIP_HOME || path.join(os.homedir(), ".drip")) {
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, "kits.json"), JSON.stringify({ owned, at: new Date().toISOString() }, null, 2));
}

function shuffle(a, rnd) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * Deal pieces for a page: for each role, two options (one for nav/footer/cta), never repeating what the last pages got.
 * Returns [{ role, options: [{ lib, name, look, url, heavy, stack }] }].
 */
export function dealPieces({ kind, stack = "react", surface = "landing", historyFile, rnd = Math.random, htmlParts = null }) {
  const app = surface === "app";
  const roles = app ? APP_ROLES : ROLES[kind] || ROLES.product;
  const hist = historyFile ? read(historyFile, []) : [];
  const recent = new Set(hist.slice(-30));
  const patterns = registryPatterns();
  const used = new Set();
  const all = loadPieces()
    .filter((p) => (app ? p.surface === "app" : p.surface !== "app"))
    .filter((p) => (stack === "react" ? true : pieceStack(p) === "html"))
    .filter((p) => app || SHADER_OK.has(kind) || !p.heavy);
  const out = [];
  const seenRole = {};
  for (const role of roles) {
    seenRole[role] = (seenRole[role] || 0) + 1;
    const n = ["nav", "footer", "cta", "headline", "auth", "command", "table"].includes(role) ? 1 : 2;
    let pool = all.filter((p) => p.role === role && !used.has(`${p.lib}/${p.name}`));
    if (stack !== "react" && htmlParts && HTML_ROLE[role]) pool = pool.concat((htmlParts[HTML_ROLE[role]] || []).map((it) => ({ lib: "taste", name: it.id, role, look: it.about.slice(0, 90), stack: "html", family: HTML_ROLE[role] })));
    if (!pool.length) continue;
    const fresh = pool.filter((p) => !recent.has(`${p.lib}/${p.name}`));
    const pick = shuffle(fresh.length >= n ? fresh : pool, rnd).slice(0, n);
    for (const p of pick) used.add(`${p.lib}/${p.name}`);
    out.push({ role: seenRole[role] > 1 ? `${role} ${seenRole[role]}` : role, options: pick.map((p) => ({ ...p, url: p.family ? null : pieceUrl(p, patterns) })) });
  }
  if (historyFile) {
    const next = [...hist, ...out.flatMap((r) => r.options.map((p) => `${p.lib}/${p.name}`))].slice(-90);
    try {
      fs.mkdirSync(path.dirname(historyFile), { recursive: true });
      fs.writeFileSync(historyFile, JSON.stringify(next));
    } catch {
      /* history is a nicety */
    }
  }
  return out;
}

export function formatPieces(dealt, { stack, owned } = {}) {
  const line = (p) =>
    p.family
      ? `[taste ${p.family}] ${p.name}: ${p.look} · parts_get({ items: [{ kind: "${p.family}", id: "${p.name}" }] })`
      : `[${p.lib}] ${p.name}: ${p.look}${p.heavy ? " (WebGL: lazy-load, still fallback, pause off-screen)" : ""} · ${pieceStack(p) === "html" ? `download ${p.url}, load with a script tag` : p.url}`;
  const own = owned?.length ? `\nThe user owns: ${owned.join(", ")}. Their Pro pieces are fair game too (installed with the user's own login or registry token; never print it).` : "";
  return (
    `PIECES ON OFFER: a starting shortlist, not a cage. A few proven pieces per section, varied from page to page. You pick: one of these, or anything better from components_find({ need: "image comparison" }), which searches ~3,300 components across 14 free libraries. pieces_preview shows several on one sheet before you choose. Every section is built on a piece, or its spec says why it is custom.\n` +
    dealt.map((r) => `- ${r.role}: ${r.options.map(line).join("\n    or ")}`).join("\n") +
    (stack === "react" ? `\nInstall the chosen ones in ONE call before the builders start: pieces_install({ page, urls: [...] }) (shadcn CLI; parallel installs would fight over npm).` : `\nCopy the chosen taste parts with one parts_get; more: parts_list, components_find.`) +
    own
  );
}

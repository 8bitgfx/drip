// SnapCN pieces in a Drip film. A SnapCN piece is a Remotion React component (MIT, installed shadcn-style as source).
// motion_piece fetches it with its registry dependencies, writes the source into <film>/pieces/src, and bundles it
// with esbuild into one plain script (<film>/pieces/<name>.js) that registers window.DripPieces.<name>. Remotion's API
// is replaced by Drip's clean-room stand-in (content/kit/snapcn/remotion.mjs), driven by the film's clock, so the
// piece seeks like everything else and any renderer can play it. The bundler and React are installed by the agent
// into ~/.drip/vendor on first use, like the renderers.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { get } from "../../core/http.mjs";
import { kitDir } from "../../core/paths.mjs";
import { vendorDir } from "../../core/vendor.mjs";

export const REGISTRY = "https://snapcn.dev/r";
const TOOLS = { esbuild: "esbuild@0.25", react: "react@18.3.1", "react-dom": "react-dom@18.3.1", culori: "culori@4" };
const isWin = process.platform === "win32";

/** The bundler and libraries pieces need, in ~/.drip/vendor (installed once, by the agent). */
export async function ensurePieceTools() {
  const vdir = vendorDir();
  fs.mkdirSync(vdir, { recursive: true });
  if (!fs.existsSync(path.join(vdir, "package.json"))) fs.writeFileSync(path.join(vdir, "package.json"), JSON.stringify({ name: "drip-vendor", private: true }, null, 2));
  const missing = Object.entries(TOOLS).filter(([n]) => !fs.existsSync(path.join(vdir, "node_modules", n, "package.json")));
  if (missing.length)
    await new Promise((res, rej) =>
      execFile(isWin ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund", "--save", ...missing.map(([, spec]) => spec)], { cwd: vdir, timeout: 10 * 60e3, windowsHide: true, shell: isWin, maxBuffer: 16 << 20 }, (err, so, se) =>
        err ? rej(new Error(`npm install failed: ${`${so}\n${se}`.trim().split("\n").slice(-3).join(" ")}`)) : res(),
      ),
    );
  return createRequire(path.join(vdir, "package.json"))("esbuild");
}

/** A registry item and everything it depends on, in dependency order. */
export async function fetchItem(name, seen = new Map()) {
  const url = /^https?:/.test(name) ? name : `${REGISTRY}/${name}.json`;
  if (seen.has(url)) return [...seen.values()];
  const { body } = await get(url, { as: "json", ttlMs: 7 * 24 * 3600e3 });
  seen.set(url, body);
  for (const dep of body.registryDependencies || []) await fetchItem(dep, seen);
  return [...seen.values()];
}

/** "InstrumentSerif" -> "Instrument Serif". */
export const familyName = (s) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");

/** The piece's component and a look at its props (for the director). Pure (tested). */
export function describePiece(source, name) {
  const pascal = name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  const exportsFound = [...source.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]);
  const component = exportsFound.includes(pascal) ? pascal : exportsFound.find((e) => !/^[A-Z0-9_]+$/.test(e)) || null;
  const propsType = source.match(new RegExp(`(?:type|interface)\\s+${component || pascal}Props\\b[^{]*\\{[\\s\\S]*?\\n\\}`))?.[0] || source.match(/(?:type|interface)\s+\w*Props\b[^{]*\{[\s\S]*?\n\}/)?.[0] || "";
  return { component, exports: exportsFound, props: propsType.slice(0, 1500) };
}

/**
 * Install and bundle a SnapCN piece into <filmDir>/pieces. Returns { file, component, exports, props, licence }.
 */
export async function installPiece(name, { filmDir, component } = {}) {
  const items = await fetchItem(name);
  const main = items[0];
  const src = path.join(filmDir, "pieces", "src", name);
  fs.mkdirSync(src, { recursive: true });
  let mainFile = null;
  for (const it of items)
    for (const f of it.files || []) {
      const dest = path.join(src, f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, f.content || "");
      if (it === main && /\.(t|j)sx?$/.test(f.path) && !mainFile) mainFile = dest;
    }
  if (!mainFile) throw new Error(`${name}: no source file in the registry item`);
  const uiIndex = (() => {
    for (const it of items) for (const f of it.files || []) if (/snap-cn-ui\/core\/index\.tsx?$/.test(f.path)) return path.join(src, f.path);
    return null;
  })();
  const info = describePiece(fs.readFileSync(mainFile, "utf8"), name);
  const comp = component || info.component || "";
  // The entry: Drip's mount around the piece.
  const entry = path.join(src, "__drip_entry.jsx");
  fs.writeFileSync(
    entry,
    fs
      .readFileSync(path.join(kitDir, "snapcn", "mount.jsx"), "utf8")
      .replace("__PIECE__", `./${path.relative(src, mainFile).replace(/\\/g, "/")}`)
      .replaceAll("__NAME__", name)
      .replace("__COMPONENT__", comp),
  );
  const esbuild = await ensurePieceTools();
  const vmods = path.join(vendorDir(), "node_modules");
  const fontsTpl = fs.readFileSync(path.join(kitDir, "snapcn", "google-fonts.mjs"), "utf8");
  const plugin = {
    name: "drip-snapcn",
    setup(b) {
      b.onResolve({ filter: /^remotion$/ }, () => ({ path: path.join(kitDir, "snapcn", "remotion.mjs") }));
      b.onResolve({ filter: /^@remotion\/google-fonts\/[A-Za-z0-9]+$/ }, (a) => ({ path: a.path, namespace: "gfont" }));
      b.onLoad({ filter: /.*/, namespace: "gfont" }, (a) => ({ contents: fontsTpl.replace("__FAMILY__", familyName(a.path.split("/").pop())), loader: "js" }));
      b.onResolve({ filter: /^@\/lib\/snap-cn-ui/ }, () => {
        if (!uiIndex) throw new Error(`${name} imports @/lib/snap-cn-ui but the registry gave no snap-cn-ui files`);
        return { path: uiIndex };
      });
      // React, react-dom and culori come from the vendored copies (one React for the whole film).
      b.onResolve({ filter: /^(react|react-dom|culori)(\/.*)?$/ }, (a) => ({ path: createRequire(path.join(vmods, "x.js")).resolve(a.path) }));
    },
  };
  const out = path.join(filmDir, "pieces", `${name}.js`);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    outfile: out,
    jsx: "automatic",
    minify: true,
    legalComments: "inline",
    define: { "process.env.NODE_ENV": '"production"' },
    loader: { ".ts": "ts", ".tsx": "tsx", ".js": "jsx" },
    plugins: [plugin],
    logLevel: "silent",
    nodePaths: [vmods],
  });
  return { file: out, component: comp, exports: info.exports, props: info.props, licence: main.license || "MIT (SnapCN free components)", title: main.title || name, description: main.description || "" };
}

/** Search SnapCN's registry by words in names, titles and descriptions. */
export async function searchPieces(query, limit = 12) {
  const { body } = await get(`${REGISTRY}/registry.json`, { as: "json", ttlMs: 24 * 3600e3 });
  const items = (body.items || body).filter((i) => i.type === "registry:component");
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const scored = items.map((i) => {
    const hay = `${i.name} ${i.title || ""} ${i.description || ""} ${(i.categories || []).join(" ")}`.toLowerCase();
    return [words.reduce((s, w) => s + (i.name.includes(w) ? 3 : 0) + (hay.includes(w) ? 1 : 0), 0), i];
  });
  return scored
    .filter(([s]) => !words.length || s > 0)
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([, i]) => ({ name: i.name, title: i.title, description: i.description, categories: i.categories || [] }));
}

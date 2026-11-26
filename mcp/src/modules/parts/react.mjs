// A React page for pieces from React libraries: Vite + Tailwind v4 + the shadcn CLI config with the free registries,
// the dealt palette and type as tokens (mapped to the names shadcn-style pieces expect), and empty Nav / Hero / Footer
// for the builders. npm install starts in the background straight away; drip_serve waits for it.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { luminance } from "../assets/color.mjs";

export const REGISTRIES = {
  "@magicui": "https://magicui.design/r/{name}.json",
  "@reactbits": "https://reactbits.dev/r/{name}.json",
  "@cult": "https://www.cult-ui.com/r/{name}.json",
  "@smoothui": "https://smoothui.dev/r/{name}.json",
  "@eldora": "https://eldoraui.site/r/{name}.json",
  "@aceternity": "https://ui.aceternity.com/registry/{name}.json",
  "@animate-ui": "https://animate-ui.com/r/{name}.json",
  "@efferd": "https://efferd.com/r/new-york/{name}.json",
  "@spell": "https://spell.sh/r/{name}.json",
  "@bencho": "https://bencho.dev/r/{name}.json",
};

const installs = new Map(); // folder -> Promise<void>

/** Run a shell command line (npm / npx are .cmd files on Windows, which need a shell); resolves with the output. */
export function sh(line, cwd, timeoutMs = 300000) {
  return new Promise((res, rej) => {
    let log = "";
    const p = spawn(line, { cwd, windowsHide: true, shell: true });
    const t = setTimeout(() => p.kill(), timeoutMs);
    p.stdout.on("data", (d) => (log += d));
    p.stderr.on("data", (d) => (log += d));
    p.on("error", (e) => (clearTimeout(t), rej(e)));
    p.on("close", (code) => (clearTimeout(t), code === 0 ? res(log) : rej(new Error(`${line.split(" ").slice(0, 3).join(" ")} failed (${code}): ${log.slice(-800)}`))));
  });
}

/** npm install in `dir` once; resolves when done (rejects with the tail of the log). */
export function ensureInstalled(dir) {
  if (fs.existsSync(path.join(dir, "node_modules", "vite"))) return Promise.resolve();
  if (!installs.has(dir))
    installs.set(
      dir,
      sh("npm install --no-audit --no-fund --loglevel=error", dir).then(() => {}).finally(() => installs.delete(dir)),
    );
  return installs.get(dir);
}

export const isReactPage = (dir) => fs.existsSync(path.join(dir, "vite.config.ts")) && fs.existsSync(path.join(dir, "src", "App.tsx"));

/** Relative luminance of a #rrggbb colour (0 dark .. 1 light). */
function lum(hex) {
  const m = String(hex || "").match(/#([0-9a-f]{6})/i);
  return m ? luminance(`#${m[1]}`) : 1;
}

/**
 * Write the React page. head = what taste-skill's start.mjs css printed (font links + a :root block).
 * Returns a one-paragraph summary.
 */
export function scaffoldReact({ dir, rel, title = "Page", head = "", radius = "soft", heroRecipe = null, install = process.env.DRIP_NO_INSTALL !== "1" }) {
  fs.mkdirSync(path.join(dir, "src", "sections"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src", "lib"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src", "components", "ui"), { recursive: true });
  const fonts = (head.match(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g) || []).join("\n    ");
  const root = (head.match(/:root\s*\{[\s\S]*?\}/) || [":root {}"])[0];
  const bg = (root.match(/--p-bg:\s*(#[0-9a-f]{6})/i) || [])[1];
  const dark = lum(bg) < 0.2;
  const r = { sharp: "6px", soft: "12px", round: "20px" }[radius] || "12px";
  const w = (f, s) => fs.writeFileSync(path.join(dir, f), s);
  w(
    "package.json",
    JSON.stringify(
      {
        name: path.basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "page",
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", motion: "^12.0.0", clsx: "^2.1.1", "tailwind-merge": "^3.0.0", "class-variance-authority": "^0.7.1", "lucide-react": "^0.500.0" },
        devDependencies: { vite: "^7.0.0", "@vitejs/plugin-react": "^5.0.0", tailwindcss: "^4.1.0", "@tailwindcss/vite": "^4.1.0", "tw-animate-css": "^1.3.0", typescript: "^5.8.0", "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", "@types/node": "^22.0.0" },
      },
      null,
      2,
    ),
  );
  w("vite.config.ts", `import path from "node:path";\nimport react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\nimport { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  resolve: {\n    alias: {\n      // Next.js-only imports in registry blocks (efferd, shadcn blocks) work here through small stand-ins.\n      "next/link": path.resolve(__dirname, "./src/shims/next-link.tsx"),\n      "next/image": path.resolve(__dirname, "./src/shims/next-image.tsx"),\n      "next/navigation": path.resolve(__dirname, "./src/shims/next-navigation.ts"),\n      "@": path.resolve(__dirname, "./src"),\n    },\n  },\n});\n`);
  // Its own (empty) PostCSS config: without it Vite walks up and loads the parent project's (a Tailwind 3 setup in the
  // repo around the page broke the first React page with a blank screen). Tailwind v4 runs through its Vite plugin.
  w("postcss.config.mjs", "// Tailwind v4 runs through @tailwindcss/vite; this file stops a parent project's PostCSS config from applying here.\nexport default { plugins: {} };\n");
  const ts = { compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: false, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true, baseUrl: ".", paths: { "@/*": ["./src/*"], "next/link": ["./src/shims/next-link.tsx"], "next/image": ["./src/shims/next-image.tsx"], "next/navigation": ["./src/shims/next-navigation.ts"] } }, include: ["src"] };
  fs.mkdirSync(path.join(dir, "src", "shims"), { recursive: true });
  w("src/shims/next-link.tsx", `// Stand-in for next/link so Next.js registry blocks run in this Vite page.\nimport type { AnchorHTMLAttributes, ReactNode } from "react";\n\nexport default function Link({ href, children, prefetch, replace, scroll, shallow, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname?: string }; children?: ReactNode; prefetch?: boolean; replace?: boolean; scroll?: boolean; shallow?: boolean }) {\n  const to = typeof href === "string" ? href : href?.pathname || "#";\n  return <a href={to} {...rest}>{children}</a>;\n}\n`);
  w("src/shims/next-image.tsx", `// Stand-in for next/image so Next.js registry blocks run in this Vite page.\nimport type { ImgHTMLAttributes } from "react";\n\nexport default function Image({ src, alt, fill, priority, quality, placeholder, blurDataURL, loader, unoptimized, style, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | { src: string }; alt: string; fill?: boolean; priority?: boolean; quality?: number; placeholder?: string; blurDataURL?: string; loader?: unknown; unoptimized?: boolean }) {\n  const url = typeof src === "string" ? src : src.src;\n  return <img src={url} alt={alt} loading={priority ? "eager" : "lazy"} style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style} {...rest} />;\n}\n`);
  w("src/shims/next-navigation.ts", `// Stand-in for next/navigation so Next.js registry blocks run in this Vite page.\nexport const usePathname = () => (typeof window === "undefined" ? "/" : window.location.pathname);\nexport const useRouter = () => ({ push: (u: string) => window.location.assign(u), replace: (u: string) => window.location.replace(u), back: () => history.back(), forward: () => history.forward(), refresh: () => window.location.reload(), prefetch: () => {} });\nexport const useSearchParams = () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);\nexport const useParams = () => ({});\nexport const redirect = (u: string) => window.location.assign(u);\nexport const notFound = () => {};\n`);
  w("tsconfig.json", JSON.stringify(ts, null, 2));
  w("components.json", JSON.stringify({ $schema: "https://ui.shadcn.com/schema.json", style: "new-york", rsc: false, tsx: true, tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true, prefix: "" }, aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" }, iconLibrary: "lucide", registries: REGISTRIES }, null, 2));
  w(
    "index.html",
    `<!doctype html>\n<html lang="en"${dark ? ' class="dark"' : ""} data-radius="${radius}">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>${title}</title>\n    ${fonts}\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
  );
  w("src/main.tsx", `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./index.css";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n`);
  w("src/lib/utils.ts", `import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n`);
  w(
    "src/App.tsx",
    `import Nav from "./sections/Nav";\nimport Hero from "./sections/Hero";\nimport Footer from "./sections/Footer";\n// drip:imports\n// /drip:imports\n\nexport default function App() {\n  return (\n    <>\n      <Nav />\n      <main>\n        <Hero />\n        {/* drip:sections */}\n        {/* /drip:sections */}\n      </main>\n      <Footer />\n    </>\n  );\n}\n`,
  );
  w("src/sections/Nav.tsx", `export default function Nav() {\n  return (\n    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">\n      <div className="wrap flex h-[var(--nav)] items-center justify-between">\n        <a href="#" className="font-display text-lg">[Brand]</a>\n        <a href="#" className="press rounded-[var(--radius)] bg-primary px-4 py-2 text-small text-primary-foreground">[Start]</a>\n      </div>\n    </header>\n  );\n}\n`);
  w("src/sections/Hero.tsx", `export default function Hero() {\n  return (\n    <section id="hero" className="wrap flex min-h-[80vh] flex-col justify-center">\n      <h1 className="enter font-display text-display">[The hero headline]</h1>\n    </section>\n  );\n}\n`);
  w("src/sections/Footer.tsx", `export default function Footer() {\n  return (\n    <footer className="border-t border-border/60 py-12">\n      <div className="wrap text-small text-muted-foreground">[Brand] · [year]</div>\n    </footer>\n  );\n}\n`);
  if (heroRecipe) w("src/sections/hero.recipe.html", heroRecipe);
  w(
    "src/index.css",
    `@import "tailwindcss";\n@import "tw-animate-css";\n\n@custom-variant dark (&:is(.dark *));\n\n/* The dealt palette and type (taste-skill start.mjs). Change colours here only. */\n${root}\n\n/* The names shadcn-style pieces use, mapped to the dealt palette. */\n:root {\n  --background: var(--p-bg);\n  --foreground: var(--p-ink);\n  --card: var(--p-surface);\n  --card-foreground: var(--p-ink);\n  --popover: var(--p-surface);\n  --popover-foreground: var(--p-ink);\n  --primary: var(--p-action);\n  --primary-foreground: var(--p-action-ink);\n  --secondary: var(--p-surface);\n  --secondary-foreground: var(--p-ink);\n  --muted: var(--p-surface);\n  --muted-foreground: var(--p-muted);\n  --accent: var(--p-surface);\n  --accent-foreground: var(--p-ink);\n  --brand: var(--p-accent);\n  --brand-foreground: var(--p-accent-ink);\n  --destructive: #e5484d;\n  --border: color-mix(in oklab, var(--p-ink) 12%, transparent);\n  --input: color-mix(in oklab, var(--p-ink) 16%, transparent);\n  --ring: var(--p-accent);\n  --radius: ${r};\n}\n\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-brand: var(--brand);\n  --color-brand-foreground: var(--brand-foreground);\n  --color-destructive: var(--destructive);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n  --font-sans: var(--font-text);\n}\n\n/* font-mono picks up the dealt --font-mono above (same name); font-display is ours. */\n@utility font-display {\n  font-family: var(--font-display);\n}\n\n/* ---- Drip's system (taste-skill's numbers): the only sizes, spacing and motion on the page ---- */\n:root {\n  --t-label: 13px; --t-small: 14px; --t-body: 16px; --t-lead: 18px; --t-h3: 24px;\n  --t-h2: clamp(30px, 1.72vw + 23.3px, 48px);\n  --t-h1: clamp(38px, 3.24vw + 25.4px, 72px);\n  --t-display: clamp(48px, 6.2vw + 24px, 112px);\n  --t-stat: clamp(28px, .952vw + 24.29px, 38px);\n  --nav: 72px; --padt: 120px; --padb: 72px; --hgap: 48px;\n  --container: 1280px; --gut: 80px; --gutter: 24px; --head-gap: 48px; --card-gap: 24px;\n  --ease: cubic-bezier(.2, .8, .2, 1); --ease-enter: cubic-bezier(.22, 1, .36, 1);\n  --m-in: 150ms; --m-out: 120ms; --m-press: 90ms; --m-image: 600ms;\n}\n@media (max-width: 639px) { :root { --nav: 56px; --padt: 96px; --padb: 48px; --hgap: 40px; --gut: 24px; --gutter: 12px; --card-gap: 12px; --head-gap: 32px; --t-lead: 17px; } }\n@media (min-width: 640px) and (max-width: 1023px) { :root { --gut: 48px; } }\n@media (min-width: 1024px) { :root { --t-lead: 20px; --t-h3: 28px; } }\n\n@theme inline {\n  --text-label: var(--t-label); --text-label--line-height: 1.35;\n  --text-small: var(--t-small); --text-small--line-height: 1.45;\n  --text-body: var(--t-body); --text-body--line-height: 1.55;\n  --text-lead: var(--t-lead); --text-lead--line-height: 1.5;\n  --text-h3: var(--t-h3); --text-h3--line-height: 1.2;\n  --text-h2: var(--t-h2); --text-h2--line-height: 1.1;\n  --text-h1: var(--t-h1); --text-h1--line-height: 1.04;\n  --text-display: var(--t-display); --text-display--line-height: 0.98;\n  --text-stat: var(--t-stat); --text-stat--line-height: 1;\n}\n\n/* one column for header, sections and footer: the same edges everywhere */\n@utility wrap { width: 100%; max-width: calc(var(--container) + 2 * var(--gut)); margin-inline: auto; padding-inline: var(--gut); }\n/* one section rhythm: padded --padt above and --padb below */\n@utility section-pad { padding-top: var(--padt); padding-bottom: var(--padb); }\n@utility head-gap { margin-bottom: var(--head-gap); }\n/* the hover layer: cards lift 2px, buttons step 1px and press, photos scale 1.02 inside their frame */\n@utility lift { transition: transform var(--m-out) var(--ease), box-shadow var(--m-out) var(--ease); @media (hover: hover) { &:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -16px color-mix(in oklab, var(--p-ink) 30%, transparent); transition-duration: var(--m-in); } } }\n@utility press { transition: transform var(--m-press) var(--ease), background-color var(--m-out) var(--ease); @media (hover: hover) { &:hover { transform: translateY(-1px); } } &:active { transform: translateY(1px) scale(.985); } }\n@utility photo-zoom { overflow: hidden; & img, & video { transition: transform var(--m-image) var(--ease); } @media (hover: hover) { &:hover img, &:hover video { transform: scale(1.02); } } }\n/* the hero enters once: children rise in order (style={{ "--i": n }} sets the order) */\n@utility enter { animation: drip-enter 700ms var(--ease-enter) both; animation-delay: calc(var(--i, 0) * 90ms); }\n@keyframes drip-enter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }\n@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; } }\n\n@layer base {\n  * { border-color: var(--border); }\n  html { scroll-behavior: smooth; }\n  body { background: var(--background); color: var(--foreground); font-family: var(--font-text); -webkit-font-smoothing: antialiased; }\n  h1, h2, h3 { font-family: var(--font-display); font-weight: var(--display-weight, 500); letter-spacing: var(--display-tracking, -0.02em); }\n}\n`,
  );
  w(".gitignore", "node_modules\ndist\n");
  if (install) ensureInstalled(dir).catch(() => {}); // starts now; drip_serve and pieces_install wait for it
  return `Scaffolded a React page in ${rel}/ (Vite + Tailwind v4 + motion; components.json knows the free registries ${Object.keys(REGISTRIES).join(", ")}): the dealt palette and type as tokens in src/index.css (bg-background, text-foreground, bg-card, text-muted-foreground, bg-primary, text-brand, font-display), ${dark ? "dark" : "light"} ground. src/sections/Nav.tsx, Hero.tsx and Footer.tsx are placeholders for the builders${heroRecipe ? "; src/sections/hero.recipe.html is the dealt hero layout (markup + CSS) to follow" : ""}. npm install is running in the background; drip_serve({ dir: "${rel}" }) starts Vite when it is done.`;
}

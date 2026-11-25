// A React page for pieces from React libraries: Vite + Tailwind v4 + the shadcn CLI config with the free registries,
// the dealt palette and type as tokens (mapped to the names shadcn-style pieces expect), and empty Nav / Hero / Footer
// for the builders. npm install starts in the background straight away; drip_serve waits for it.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const REGISTRIES = {
  "@magicui": "https://magicui.design/r/{name}.json",
  "@reactbits": "https://reactbits.dev/r/{name}.json",
  "@cult": "https://www.cult-ui.com/r/{name}.json",
  "@smoothui": "https://smoothui.dev/r/{name}.json",
  "@eldora": "https://eldoraui.site/r/{name}.json",
  "@aceternity": "https://ui.aceternity.com/registry/{name}.json",
  "@animate-ui": "https://animate-ui.com/r/{name}.json",
  "@efferd": "https://efferd.com/r/{name}.json",
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
  if (!m) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
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
  w("vite.config.ts", `import path from "node:path";\nimport react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\nimport { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },\n});\n`);
  const ts = { compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: false, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true, baseUrl: ".", paths: { "@/*": ["./src/*"] } }, include: ["src"] };
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
  w("src/sections/Nav.tsx", `export default function Nav() {\n  return (\n    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">\n      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">\n        <a href="#" className="font-display text-lg">[Brand]</a>\n        <a href="#" className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm text-primary-foreground">[Start]</a>\n      </div>\n    </header>\n  );\n}\n`);
  w("src/sections/Hero.tsx", `export default function Hero() {\n  return (\n    <section id="hero" className="mx-auto flex min-h-[80vh] max-w-[1280px] flex-col justify-center px-6">\n      <h1 className="font-display text-6xl tracking-tight">[The hero headline]</h1>\n    </section>\n  );\n}\n`);
  w("src/sections/Footer.tsx", `export default function Footer() {\n  return (\n    <footer className="border-t border-border/60 py-12">\n      <div className="mx-auto max-w-[1280px] px-6 text-sm text-muted-foreground">[Brand] · [year]</div>\n    </footer>\n  );\n}\n`);
  if (heroRecipe) w("src/sections/hero.recipe.html", heroRecipe);
  w(
    "src/index.css",
    `@import "tailwindcss";\n@import "tw-animate-css";\n\n@custom-variant dark (&:is(.dark *));\n\n/* The dealt palette and type (taste-skill start.mjs). Change colours here only. */\n${root}\n\n/* The names shadcn-style pieces use, mapped to the dealt palette. */\n:root {\n  --background: var(--p-bg);\n  --foreground: var(--p-ink);\n  --card: var(--p-surface);\n  --card-foreground: var(--p-ink);\n  --popover: var(--p-surface);\n  --popover-foreground: var(--p-ink);\n  --primary: var(--p-action);\n  --primary-foreground: var(--p-action-ink);\n  --secondary: var(--p-surface);\n  --secondary-foreground: var(--p-ink);\n  --muted: var(--p-surface);\n  --muted-foreground: var(--p-muted);\n  --accent: var(--p-surface);\n  --accent-foreground: var(--p-ink);\n  --brand: var(--p-accent);\n  --brand-foreground: var(--p-accent-ink);\n  --destructive: #e5484d;\n  --border: color-mix(in oklab, var(--p-ink) 12%, transparent);\n  --input: color-mix(in oklab, var(--p-ink) 16%, transparent);\n  --ring: var(--p-accent);\n  --radius: ${r};\n}\n\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-card: var(--card);\n  --color-card-foreground: var(--card-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-secondary: var(--secondary);\n  --color-secondary-foreground: var(--secondary-foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-brand: var(--brand);\n  --color-brand-foreground: var(--brand-foreground);\n  --color-destructive: var(--destructive);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --radius-sm: calc(var(--radius) - 4px);\n  --radius-md: calc(var(--radius) - 2px);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) + 4px);\n  --font-sans: var(--font-text);\n}\n\n/* font-mono picks up the dealt --font-mono above (same name); font-display is ours. */\n@utility font-display {\n  font-family: var(--font-display);\n}\n\n@layer base {\n  * { border-color: var(--border); }\n  html { scroll-behavior: smooth; }\n  body { background: var(--background); color: var(--foreground); font-family: var(--font-text); -webkit-font-smoothing: antialiased; }\n  h1, h2, h3 { font-family: var(--font-display); font-weight: var(--display-weight, 500); letter-spacing: var(--display-tracking, -0.02em); }\n}\n`,
  );
  w(".gitignore", "node_modules\ndist\n");
  if (install) ensureInstalled(dir).catch(() => {}); // starts now; drip_serve and pieces_install wait for it
  return `Scaffolded a React page in ${rel}/ (Vite + Tailwind v4 + motion; components.json knows the free registries ${Object.keys(REGISTRIES).join(", ")}): the dealt palette and type as tokens in src/index.css (bg-background, text-foreground, bg-card, text-muted-foreground, bg-primary, text-brand, font-display), ${dark ? "dark" : "light"} ground. src/sections/Nav.tsx, Hero.tsx and Footer.tsx are placeholders for the builders${heroRecipe ? "; src/sections/hero.recipe.html is the dealt hero layout (markup + CSS) to follow" : ""}. npm install is running in the background; drip_serve({ dir: "${rel}" }) starts Vite when it is done.`;
}

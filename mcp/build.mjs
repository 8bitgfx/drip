// Bundles the server into one file (dist/drip-mcp.mjs) so the plugin runs with plain `node`,
// no `npm install` on the user's machine. Run `npm run build` after changing anything in src/.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.mjs"],
  outfile: "dist/drip-mcp.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  legalComments: "none",
  // Some bundled CommonJS deps call require(); give the ESM bundle a real one.
  banner: { js: "import { createRequire as __dripRequire } from 'node:module'; const require = __dripRequire(import.meta.url);" },
  logLevel: "info",
});

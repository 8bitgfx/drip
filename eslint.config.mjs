// Lint for the MCP server, its tests and the plugin's hooks. Run: cd mcp && npm run lint (CI runs it on every push).
// The tools live in mcp/node_modules (the repo root has no package.json), so load them from there.
import { createRequire } from "node:module";

const require = createRequire(new URL("./mcp/package.json", import.meta.url));
const js = require("@eslint/js");
const globals = require("globals");

const FILES = ["mcp/src/**/*.mjs", "mcp/test/**/*.mjs", "mcp/*.mjs", "hooks/**/*.mjs"];

export default [
  { ignores: ["mcp/dist/**", "**/node_modules/**", "portfolio-claude/**", "tapin-landing/**", "assets/**", "site/**", "examples/**"] },
  { ...js.configs.recommended, files: FILES },
  {
    files: FILES,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node, WebSocket: "readonly" },
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-constant-condition": ["error", { checkLoops: false }],
      "prefer-const": ["error", { destructuring: "all" }],
      "no-var": "error",
      eqeqeq: ["error", "smart"],
      "no-control-regex": "off",
      "no-useless-escape": "off",
    },
  },
];

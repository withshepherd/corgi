import { defineConfig } from "tsup";

// Properly configure tsup to generate declarations correctly
export default defineConfig({
  entry: [
    "lib/index.ts",
    "lib/browser.ts",
    "lib/cli.ts",
    // "lib/db/browser-adapter.ts",
    // "lib/db/d1-adapter.ts",
  ],
  format: ["esm", "cjs"],
  dts: {
    entry: {
      index: "lib/index.ts",
      browser: "lib/browser.ts",
      // cli: "lib/cli.ts",
      // "browser-adapter": "lib/db/browser-adapter.ts",
      // "d1-adapter": "lib/db/d1-adapter.ts",
    },
  },
  clean: true,
  minify: true,
  treeshake: true,
  platform: "node",
  target: "node16",
  // Ensure proper ESM/CJS handling
  splitting: false,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});

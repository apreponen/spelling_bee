import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative paths, so the built game works in any folder
  // (e.g. https://<user>.github.io/<repository>/).
  base: "./",
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        // Put the word list and puzzle schedule in their own file. Browsers keep it
        // cached when only the game code changes.
        codeSplitting: {
          groups: [{ name: "words", test: /src[\\/]data[\\/]/ }],
        },
      },
    },
    // The word list alone is about 0.5 MB (≈150 kB compressed); that is expected.
    chunkSizeWarningLimit: 800,
    // Browsers preload the word list file natively; no extra polyfill code is needed.
    modulePreload: { polyfill: false },
  },
  test: {
    environment: "happy-dom",
  },
});

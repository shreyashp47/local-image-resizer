import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["vitest-canvas-mock"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/presets.ts"],
    },
  },
});

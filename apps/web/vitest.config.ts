import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const CLIENT_TESTS = "tests/unit/features/*/client/**/*.test.{ts,tsx}";

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: [CLIENT_TESTS],
        },
      },
      {
        test: {
          name: "dom",
          environment: "jsdom",
          include: [CLIENT_TESTS],
          setupFiles: ["tests/setup.ts"],
        },
      },
    ],
  },
});

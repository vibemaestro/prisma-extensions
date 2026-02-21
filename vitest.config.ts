import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "generated/prisma/client": "./src/generated/prisma/client",
    },
  },
  test: {
    environment: "node",
    globalSetup: "./test/bootstrap/setup.ts",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: 'istanbul',
      exclude: ['src/generated/**/*.ts'],
      reporter: ['lcov']
    },
  },
});
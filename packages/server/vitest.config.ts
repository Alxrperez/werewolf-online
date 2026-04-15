import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 10000,
    // Run integration tests sequentially — each test starts its own server
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});

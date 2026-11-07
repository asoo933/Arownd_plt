import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const mobileRoot = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@": mobileRoot,
      "react-native": resolve(mobileRoot, "test/react-native.ts")
    }
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true
  }
});

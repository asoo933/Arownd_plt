import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const mobileRoot = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@": mobileRoot,
      "react-native": resolve(mobileRoot, "test/react-native.ts"),
      "react-native-url-polyfill/auto": resolve(mobileRoot, "test/url-polyfill.ts"),
      "@react-native-async-storage/async-storage": resolve(mobileRoot, "test/async-storage.ts")
    }
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true
  }
});

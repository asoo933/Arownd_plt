import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mobileRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": mobileRoot,
      "react-native": fileURLToPath(new URL("./test/react-native.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    clearMocks: true
  }
});

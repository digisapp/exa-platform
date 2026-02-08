import { defineConfig } from "vitest/config";
import path from "path";
import crypto from "crypto";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      BANK_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
    },
  },
});

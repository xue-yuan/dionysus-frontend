import { defineConfig, lazyPlugins } from "vite-plus";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  // The suite covers the pure logic — request shaping, dictionary lookups — so
  // it runs in node. Testing components would mean adding jsdom.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  plugins: lazyPlugins(() => [tailwindcss(), solid() as any]),
  server: {
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});

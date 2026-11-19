import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // The API is the `api` Cloud Function. During local work it is served
      // by the Firebase emulators (npm run emulators), whose Hosting emulator
      // applies the same /api/** rewrite as production.
      "/api": { target: "http://127.0.0.1:5000" },
    },
  },
  build: {
    outDir: "dist",
  },
});

import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // During local work the Firebase emulators (npm run emulators) serve
      // the Firebase web config at /__/firebase/init.json, as Hosting does
      // in production.
      "/__": { target: "http://127.0.0.1:5000" },
    },
  },
  build: {
    outDir: "dist",
  },
});

import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // The API is served by the Go process over HTTPS on 8443, from the same
      // origin as the built app. Its certificate comes from the private CA in
      // ./pki, which this proxy has no reason to know about, so skip the check
      // on the loopback hop.
      "/api": { target: "https://localhost:8443", secure: false },
    },
  },
  build: {
    outDir: "dist",
  },
});

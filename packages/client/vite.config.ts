import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@werewolf/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // NOTE: /socket.io is intentionally NOT proxied. The client connects
      // directly to http://localhost:3000 (see useSocket.ts). Vite's WS proxy
      // throws ECONNABORTED under load and causes constant disconnect cycles.
    },
  },
});

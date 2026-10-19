import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { pastelModules } from "./vite/pastel-modules";

export default defineConfig({
  plugins: [react(), tailwindcss(), pastelModules()],
  resolve: { alias: { "@": "/src" } },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5080",
        changeOrigin: false,
        secure: false,
      },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@tanstack/react-table")) return "vendor-table";
          if (id.includes("@radix-ui")) return "vendor-ui";
          if (id.includes("react-router-dom")) return "vendor-router";
          if (id.includes("react-dom")) return "vendor-react";
          if (id.includes("react")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
});

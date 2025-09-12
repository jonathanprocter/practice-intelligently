import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ).catch(() => {
            console.warn("Cartographer plugin not available");
            return null;
          }).then(p => p ? [p] : [])
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    hmr: {
      overlay: false,
    },
    fs: {
      strict: false, // Changed to false
      allow: ['.'], // Allow everything
    },
    // Maximum permissiveness for Replit
    host: '0.0.0.0', // Listen on all interfaces
    strictPort: false,
    cors: true, // Enable CORS
    allowedHosts: "all", // Allow ALL hosts
  },
});
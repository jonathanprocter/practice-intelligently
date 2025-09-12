import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Replit plugins conditionally
const replitPlugins = [];
if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
  try {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    replitPlugins.push(cartographer());
  } catch (e) {
    console.warn("Cartographer plugin not available");
  }
}

export default defineConfig({
  plugins: [react(), ...replitPlugins],
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
      strict: false,
      allow: ['.'],
    },
    // CRITICAL: Allow all hosts for Replit
    host: true,
    allowedHosts: "all",
    cors: true,
  },
});
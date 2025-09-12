import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to load Replit plugins
async function loadReplitPlugins() {
  const plugins = [];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID) {
    try {
      // Try to load cartographer plugin
      const { cartographer } = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer());
      console.log("✓ Loaded Replit cartographer plugin");
    } catch (error) {
      console.warn("⚠ Could not load @replit/vite-plugin-cartographer:", error.message);
      console.warn("  Continuing without it...");
    }

    try {
      // Try to load runtime error overlay if available
      const runtimeErrorModule = await import("@replit/vite-plugin-runtime-error-modal");
      if (runtimeErrorModule.default) {
        plugins.push(runtimeErrorModule.default());
        console.log("✓ Loaded Replit runtime error overlay");
      }
    } catch (error) {
      // Silent fail for optional plugin
    }
  }

  return plugins;
}

export default defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();

  return {
    plugins: [
      react(),
      ...replitPlugins,
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
      sourcemap: process.env.NODE_ENV === 'development',
    },
    server: {
      hmr: {
        overlay: false,
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    optimizeDeps: {
      // Exclude Replit plugins from optimization if they cause issues
      exclude: process.env.REPL_ID ? ['@replit/vite-plugin-cartographer'] : [],
    },
  };
});
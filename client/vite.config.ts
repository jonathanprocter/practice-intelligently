import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load React plugin safely
let react;
try {
  const reactPlugin = await import("@vitejs/plugin-react");
  react = reactPlugin.default;
} catch (e) {
  console.warn("React plugin not available, proceeding without it");
  react = () => {};
}

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
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "..", "dist/public"),
    emptyOutDir: true,
  },
  server: {
    hmr: {
      overlay: false,
      port: 3001,
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
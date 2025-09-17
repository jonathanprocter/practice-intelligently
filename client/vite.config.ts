import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      // Remove explicit host to let HMR use relative connections
      // This prevents SSL errors when connecting to wss://0.0.0.0
    },
    fs: {
      strict: false,
      allow: ['.'],
    },
    host: "0.0.0.0", // Listen on all network interfaces
    cors: true,
    // Note: allowedHosts is not needed when host is "0.0.0.0"
    // The 0.0.0.0 host binding automatically allows access from any hostname
  },
});
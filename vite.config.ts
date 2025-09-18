import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(rootDir, "./client"),
  plugins: [react()],
  build: {
    outDir: path.resolve(rootDir, "./dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    minify: false, // Disable minification to reduce memory usage
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "./client/index.html"),
      },
      output: {
        // Disable code splitting to reduce memory usage
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./client/src"),
      "@shared": path.resolve(rootDir, "./shared"),
    },
  },
});

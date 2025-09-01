import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, './client'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, './dist/public'),
    emptyOutDir: true,
    sourcemap: false,
    minify: false, // Disable minification to reduce memory usage
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, './client/index.html')
      },
      output: {
        // Disable code splitting to reduce memory usage
        manualChunks: undefined,
        inlineDynamicImports: true
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    }
  }
});
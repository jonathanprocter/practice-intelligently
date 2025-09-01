import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Simplified config without Tailwind Vite plugin
export default defineConfig({
  root: path.resolve(__dirname, './client'),
  plugins: [
    react(),
  ],
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
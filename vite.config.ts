// vite.config.ts (in ROOT directory, not in client/)
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    allowedHosts: 'all',
    cors: true,
    hmr: {
      port: 3001
    }
  }
});
// server/vite.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Polyfill for import.meta.dirname in Node.js 18
if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    get() { return dirname(fileURLToPath(import.meta.url)); },
    configurable: true
  });
}

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { type Server } from "http";

let vite: ViteDevServer | null = null;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  try {
    log("Starting Vite setup...", "vite");

    // Create Vite server with your existing config
    vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: {
        middlewareMode: true,
        hmr: { server },
      },
    });

    log("Vite server created successfully", "vite");

    // CRITICAL: Apply Vite middleware FIRST
    // This handles all module requests like /src/main.tsx, /@vite/client, etc.
    app.use(vite.middlewares);

    log("Vite middleware applied", "vite");

    // DO NOT add any catch-all HTML handler here in development!
    // Vite's middleware already handles serving index.html for SPA routes

  } catch (error) {
    console.error("Failed to setup Vite:", error);
    throw error;
  }
}

export async function serveStatic(app: Express) {
  // For production only - your config outputs to dist/public
  const distPath = path.resolve(process.cwd(), "dist", "public");

  try {
    await fs.promises.access(distPath);
    log(`Serving production build from: ${distPath}`, "express");

    app.use(express.static(distPath));

    // SPA fallback for production
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } catch {
    throw new Error(
      `Production build not found at: ${distPath}\n` +
      `Please run 'npm run build' first.`
    );
  }
}
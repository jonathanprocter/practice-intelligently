// Polyfill for import.meta.dirname in Node.js 18
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

  // Use structured logging instead of console.log in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${formattedTime} [${source}] ${message}`);
  }
}

export async function setupVite(app: Express, server: Server) {
  try {
    log("Starting Vite setup...", "vite");

    // Import and use the vite config directly, only modifying what's needed for middleware mode
    const viteConfig = (await import("../vite.config.js")).default;

    // Create Vite server merging configs properly
    vite = await createViteServer({
      ...viteConfig,
      configFile: false, // We're using the imported config
      server: {
        ...viteConfig.server, // Keep all server settings from config including allowedHosts
        middlewareMode: true,
        hmr: { 
          ...viteConfig.server?.hmr,
          server,
        },
      },
    });

    log("Vite server created successfully", "vite");

    // Apply Vite middleware
    app.use(vite.middlewares);

    log("Vite middleware applied", "vite");

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
  } catch {
    throw new Error(
      `Production build not found at: ${distPath}\n` +
      `Please run 'npm run build' first.`
    );
  }

  // Serve static files
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // SPA fallback for production
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("Internal Server Error: index.html not found");
    }
  });
}

// Optional: Cleanup function for graceful shutdown
export async function closeVite() {
  if (vite) {
    await vite.close();
    vite = null;
  }
}
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

  if (process.env.NODE_ENV !== 'production') {
    console.log(`${formattedTime} [${source}] ${message}`);
  }
}

export async function setupVite(app: Express, server: Server) {
  try {
    log("Starting Vite setup...", "vite");

    // Import the vite config - it already has the correct root and paths
    const viteConfig = (await import("../vite.config")).default;

    // Create Vite server with middleware mode
    vite = await createViteServer({
      ...viteConfig,
      configFile: false, // We're using the imported config directly
      server: {
        ...viteConfig.server,
        middlewareMode: true,
        hmr: {
          ...viteConfig.server?.hmr,
          server,
        },
      },
      // Override appType for middleware mode
      appType: "custom",
    });

    log("Vite server created, applying middleware...", "vite");

    // Apply Vite middleware first - handles all module transformation
    app.use(vite.middlewares);

    // Only handle HTML serving for SPA navigation routes
    // This MUST come after vite.middlewares
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      // Skip API routes
      if (url.startsWith("/api")) {
        return next();
      }

      // CRITICAL: Skip Vite internal routes and assets
      // This is what was causing your blank page issue
      if (
        url.startsWith("/@") ||           // Vite internals (@vite/client, @react-refresh, etc.)
        url.startsWith("/src") ||         // Source files
        url.startsWith("/node_modules") || // Dependencies
        url.startsWith("/__") ||          // Vite special routes
        /\.[a-zA-Z0-9]+$/.test(url)       // Files with extensions (.js, .css, .png, etc.)
      ) {
        // Let Vite handle these
        return next();
      }

      try {
        // The root is already set to 'client' in vite.config.ts
        const indexPath = path.resolve(viteConfig.root || process.cwd(), "index.html");

        if (!fs.existsSync(indexPath)) {
          log(`index.html not found at: ${indexPath}`, "vite");
          return res.status(404).send("index.html not found");
        }

        let html = await fs.promises.readFile(indexPath, "utf-8");

        // Let Vite transform the HTML (inject HMR client, process modules, etc.)
        html = await vite.transformIndexHtml(url, html);

        res.status(200).set({ "Content-Type": "text/html" }).send(html);
      } catch (error) {
        log(`Error serving HTML: ${error}`, "vite");
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });

    log("Vite middleware setup complete", "vite");
  } catch (error) {
    console.error("Failed to setup Vite:", error);
    throw error;
  }
}

export async function serveStatic(app: Express) {
  // Note: Your vite.config.ts outputs to dist/public, not just dist
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
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // SPA fallback
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
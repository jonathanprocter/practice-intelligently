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
import react from "@vitejs/plugin-react";

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

    // Create Vite server without host restrictions
    vite = await createViteServer({
      configFile: false,
      root: path.resolve(process.cwd(), "client"),
      server: {
        middlewareMode: true,
        hmr: { 
          server,
        },
        host: '0.0.0.0',
        cors: true,
        // Try to disable host check in every possible way
        allowedHosts: "all",
        proxy: {},
      },
      resolve: {
        alias: {
          "@": path.resolve(process.cwd(), "client", "src"),
          "@shared": path.resolve(process.cwd(), "shared"),
          "@assets": path.resolve(process.cwd(), "attached_assets"),
        },
      },
      plugins: [react()],
      build: {
        outDir: path.resolve(process.cwd(), "dist/public"),
      },
    });

    log("Vite server created", "vite");

    // BYPASS VITE FOR HTML - Serve index.html directly for root requests
    app.get('/', async (req, res) => {
      try {
        const indexPath = path.resolve(process.cwd(), "client", "index.html");
        let html = await fs.promises.readFile(indexPath, "utf-8");

        // Manually inject Vite client for HMR
        html = html.replace(
          '<head>',
          `<head>
            <script type="module">
              import RefreshRuntime from '/@react-refresh'
              RefreshRuntime.injectIntoGlobalHook(window)
              window.$RefreshReg$ = () => {}
              window.$RefreshSig$ = () => (type) => type
              window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script type="module" src="/@vite/client"></script>`
        );

        // Make sure the main script tag is correct
        html = html.replace(
          /src="\/src\/main\.tsx"/,
          'type="module" src="/src/main.tsx"'
        );

        res.status(200).set({ "Content-Type": "text/html" }).send(html);
      } catch (error) {
        console.error("Error serving index.html:", error);
        res.status(500).send("Error loading application");
      }
    });

    // Apply Vite middleware for everything else (modules, HMR, etc.)
    app.use(vite.middlewares);

    // Fallback for SPA routes
    app.get('*', async (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }

      // Skip asset requests
      if (req.path.includes('.') || req.path.startsWith('/@')) {
        return next();
      }

      try {
        const indexPath = path.resolve(process.cwd(), "client", "index.html");
        let html = await fs.promises.readFile(indexPath, "utf-8");
        html = await vite.transformIndexHtml(req.url, html);
        res.status(200).set({ "Content-Type": "text/html" }).send(html);
      } catch (error) {
        next(error);
      }
    });

    log("Vite setup complete with HTML bypass", "vite");

  } catch (error) {
    console.error("Failed to setup Vite:", error);
    throw error;
  }
}

export async function serveStatic(app: Express) {
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

  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

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

export async function closeVite() {
  if (vite) {
    await vite.close();
    vite = null;
  }
}
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

    // IMPORTANT: Set configFile to false to prevent loading vite.config.ts
    vite = await createViteServer({
      configFile: false, // THIS IS CRITICAL - don't load any config file
      root: path.resolve(process.cwd(), "client"),
      server: {
        middlewareMode: true,
        hmr: { 
          server,
          port: 443,
          protocol: 'wss',
        },
        // Force allow all hosts
        host: '0.0.0.0',
        allowedHosts: "all", // This MUST work with configFile: false
        cors: true,
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

    log("Vite server created with allowedHosts='all' and configFile=false", "vite");

    // Apply Vite middleware
    app.use(vite.middlewares);

    log("Vite middleware applied", "vite");

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
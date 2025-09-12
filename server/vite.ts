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
import { createServer as createViteDevServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

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
  const vite = await createViteDevServer({
    server: { 
      middlewareMode: true,
      hmr: {
        port: 5173,
        host: "0.0.0.0",
      }
    },
    appType: "spa",
    root: path.resolve(__dirname, "../client"),
  });

  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  // serve the SPA for all non-API routes
  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }

    try {
      const url = req.originalUrl;
      const indexPath = path.resolve(__dirname, "../client/index.html");
      let html = await fs.promises.readFile(indexPath, "utf-8");
      let template = await vite.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  // setup vite's websocket server for HMR with better error handling
  server.on("upgrade", (request, socket, head) => {
    try {
      if (request.url === "/" || request.url?.includes("vite")) {
        vite.ws.handleUpgrade(request, socket as any, head, (ws) => {
          vite.ws.emit("connection", ws, request);
        });
      }
    } catch (error) {
      console.warn("WebSocket upgrade failed:", error);
      socket.destroy();
    }
  });

  // Handle WebSocket errors gracefully
  server.on('error', (error: any) => {
    if (error.code !== 'EADDRINUSE') {
      console.warn('Vite server error:', error);
    }
  });
}

export async function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  try {
    await fs.promises.access(distPath);
  } catch {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
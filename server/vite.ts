// server/vite.ts - COMPLETE FIXED VERSION
import { ViteDevServer } from 'vite';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Polyfill for import.meta.dirname in Node.js 18
if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    get() {
      return dirname(fileURLToPath(import.meta.url));
    },
    configurable: true
  });
}

// Simple log function
export function log(message: string, source = "vite") {
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

// Main function
export async function setupVite(app: express.Express, server?: any): Promise<ViteDevServer | null> {
  if (process.env.NODE_ENV === 'production') {
    // In production, serve static files properly
    const distPath = path.resolve(process.cwd(), 'dist');

    if (fs.existsSync(distPath)) {
      log('Serving production build from dist/');

      // Serve static files from dist
      app.use(express.static(distPath));

      // Handle client-side routing - serve index.html for all non-API routes
      app.get('*', (req, res, next) => {
        // Skip API routes and WebSocket routes
        if (req.path.startsWith('/api') || 
            req.path.startsWith('/auth') || 
            req.path.startsWith('/socket.io')) {
          return next();
        }

        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
    } else {
      log('Warning: dist directory not found', 'error');
    }
    return null;
  }

  // Development mode
  try {
    const { createServer: createViteServer } = await import('vite');

    // IMPORTANT: Tell Vite to use the config file from the client folder
    const viteServer = await createViteServer({
      configFile: path.resolve(process.cwd(), 'client/vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: {
          port: 3001
        }
      }
    });

    // Use Vite middleware
    app.use(viteServer.middlewares);

    log('Vite development server initialized with client config');
    return viteServer;
  } catch (error) {
    log(`Failed to initialize Vite server: ${error}`, 'error');
    return null;
  }
}

// Keep the old function name for backward compatibility if needed
export const installVite = setupVite;
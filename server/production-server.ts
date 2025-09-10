// Production server with proper API routing
// This server properly handles API routes in production mode

// Global __dirname for compatibility
globalThis.__dirname = import.meta.dirname || process.cwd();

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from "./routes";
import { setupWebSocketServer } from './websocket/websocket.server';
import { exec } from 'child_process';

// Set server timezone to Eastern Time
process.env.TZ = 'America/New_York';

// Add graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Only exit on critical errors, not network issues
  if (!error.message?.includes('EADDRINUSE') && !error.message?.includes('fetch')) {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on fetch errors or network issues
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    if (!message?.includes('fetch') && !message?.includes('ECONNREFUSED')) {
      process.exit(1);
    }
  }
});

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Add CORS headers for module scripts
app.use((req, res, next) => {
  // Set proper CORS headers for module scripts
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = createServer(app);
    const wsManager = setupWebSocketServer(server);

    // Make wsManager available to routes
    app.set('wsManager', wsManager);

    // Register API routes FIRST (before static files)
    await registerRoutes(app);

    // Error handler for API routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error for debugging
      console.error('Express error handler:', {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method
      });

      // Send error response but don't re-throw to prevent crash
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Serve static files (after API routes)
    const distPath = path.resolve(process.cwd(), "dist/public");
    
    // Check if dist directory exists
    try {
      await fs.promises.access(distPath);
    } catch {
      console.error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
      process.exit(1);
    }

    // Configure static file serving with proper MIME types
    // IMPORTANT: We exclude index.html so we can transform it in the catch-all route
    app.use(express.static(distPath, {
      etag: true,
      lastModified: true,
      index: false,  // Disable automatic index.html serving
      setHeaders: (res, filePath) => {
        // Set correct MIME types based on file extension
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        } else if (filePath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        } else if (filePath.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filePath.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.woff2')) {
          res.setHeader('Content-Type', 'font/woff2');
        } else if (filePath.endsWith('.woff')) {
          res.setHeader('Content-Type', 'font/woff');
        }
        
        // Set cache headers for assets
        if (filePath.includes('/assets/') || filePath.includes('/fonts/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    // Serve assets directory explicitly with correct MIME types
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }));

    // Catch-all route for SPA (but ONLY for non-API routes and non-asset routes)
    app.get("*", (req, res, next) => {
      // Skip API routes - they should have already been handled
      if (req.path.startsWith("/api")) {
        // If we reach here, the API route doesn't exist
        return res.status(404).json({ message: "API endpoint not found" });
      }
      
      // Skip asset files - return 404 if they don't exist
      if (req.path.startsWith('/assets/') || 
          req.path.startsWith('/src/') ||
          req.path.endsWith('.js') || 
          req.path.endsWith('.mjs') ||
          req.path.endsWith('.css') || 
          req.path.endsWith('.json') ||
          req.path.endsWith('.png') ||
          req.path.endsWith('.jpg') ||
          req.path.endsWith('.svg')) {
        return res.status(404).send('File not found');
      }
      
      // Serve index.html for all other routes (SPA routing)
      const indexPath = path.resolve(distPath, "index.html");
      
      // Serve the index.html file as-is without any modifications
      // Add no-cache headers to prevent caching issues
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(indexPath);
    });

    // Use port 5000 for frontend (Replit's expected preview port)
    const port = parseInt(process.env.PORT || '5000', 10);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Attempting to kill existing process...`);
        // Try to kill existing process
        exec(`pkill -f "server/production-server.ts" || fuser -k ${port}/tcp || true`, () => {
          setTimeout(() => {
            server.listen({
              port,
              host: "0.0.0.0",
            }, () => {
              log(`🚀 Production server running at http://0.0.0.0:${port}`);
              log(`🌐 Access your app via the Replit webview or external URL`);
            });
          }, 2000);
        });
      } else {
        console.error('Server error:', err);
        console.log('Server will continue running...');
      }
    });

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`🚀 Production server running at http://0.0.0.0:${port}`);
      log(`🌐 Access your app via the Replit webview or external URL`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})().catch((error) => {
  console.error('Unhandled error in server startup:', error);
  process.exit(1);
});
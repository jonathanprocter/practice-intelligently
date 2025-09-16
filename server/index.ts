// server/index.ts - FIXED VERSION
// Polyfill for import.meta.dirname and __dirname in Node.js 18
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname globally for compatibility with CJS modules
globalThis.__dirname = dirname(fileURLToPath(import.meta.url));

if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    get() {
      return dirname(fileURLToPath(import.meta.url));
    },
    configurable: true
  });
}

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import router from "./routes";
import { setupVite, log } from "./vite";
import { setupWebSocketServer } from './websocket/websocket.server';

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

const app = express();

(async () => {
  try {
    const server = createServer(app);

    // FIRST add body parsing middleware (needed for API routes)
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: false }));

    // Add logging middleware
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

    // Setup WebSocket server
    const wsManager = setupWebSocketServer(server);
    app.set('wsManager', wsManager);

    // THEN register API routes BEFORE Vite (so API routes are handled first)
    app.use('/api', router);

    // Add health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        viteStatus: app.get('viteStatus') || 'initializing'
      });
    });

    // Error handler (register before Vite but don't block on it)
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

    // Start the server FIRST (before Vite initialization)
    const port = parseInt(process.env.PORT || '5000', 10);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Server will exit.`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        console.log('Server will continue running...');
      }
    });

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server listening on port ${port} - HTTP endpoints ready`);
      
      // NOW setup Vite in the background (non-blocking)
      // This allows the server to respond to requests immediately
      log('Starting Vite initialization in background...');
      app.set('viteStatus', 'initializing');
      
      // Create a timeout promise
      const viteTimeout = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Vite initialization timeout after 10 seconds')), 10000);
      });
      
      // Setup Vite with timeout
      Promise.race([
        setupVite(app, server),
        viteTimeout
      ])
      .then((viteServer) => {
        if (viteServer) {
          log('Vite development server initialized successfully');
          app.set('viteStatus', 'ready');
        } else {
          log('Vite server running in production mode or disabled');
          app.set('viteStatus', 'production');
        }
      })
      .catch((err) => {
        console.error('Failed to initialize Vite (server continues running):', err.message);
        app.set('viteStatus', 'failed');
        
        // Add fallback middleware for serving static files if Vite fails
        const distPath = path.resolve(process.cwd(), 'dist');
        const clientPath = path.resolve(process.cwd(), 'client/dist');
        
        // Try to serve from dist folders as fallback
        [distPath, clientPath].forEach(fallbackPath => {
          if (fs.existsSync(fallbackPath)) {
            app.use(express.static(fallbackPath));
            log(`Serving static files from ${fallbackPath} as fallback`);
          }
        });
        
        // Fallback for client-side routes
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api') || 
              req.path.startsWith('/auth') || 
              req.path.startsWith('/socket.io')) {
            return next();
          }
          
          const indexPaths = [
            path.join(distPath, 'index.html'),
            path.join(clientPath, 'index.html')
          ];
          
          for (const indexPath of indexPaths) {
            if (fs.existsSync(indexPath)) {
              res.sendFile(indexPath);
              return;
            }
          }
          
          res.status(503).json({
            message: 'Frontend unavailable - Vite initialization failed',
            status: 'vite_failed'
          });
        });
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})().catch((error) => {
  console.error('Unhandled error in server startup:', error);
  process.exit(1);
});
// Simplified server focusing on Vite middleware initialization
import express from "express";
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import router from "./routes";
import { setupWebSocketServer } from './websocket/websocket.server';
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

// Set server timezone to Eastern Time
process.env.TZ = 'America/New_York';

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
const wsManager = setupWebSocketServer(server);
app.set('wsManager', wsManager);

// Logging function
function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [server] ${message}`);
}

// Initialize server
async function initializeServer() {
  try {
    // Setup Vite in development mode
    if (process.env.NODE_ENV !== 'production') {
      log('[VITE] Setting up Vite middleware...');
      try {
        console.log('[VITE] Importing vite module...');
        const vite = await import('vite');
        console.log('[VITE] Creating Vite server...');
        
        const viteServer = await vite.createServer({
          configFile: path.resolve(process.cwd(), 'client/vite.config.ts'),
          server: {
            middlewareMode: true,
            host: true,
            cors: true,
            hmr: {
              port: 3001
            }
          },
          appType: 'spa',
          root: path.resolve(process.cwd(), 'client')
        });
        
        console.log('[VITE] Attaching Vite middleware to Express...');
        // CRITICAL: Use Vite middleware BEFORE any other routes
        app.use(viteServer.middlewares);
        app.set('viteServer', viteServer);
        log('[VITE] ✅ Vite middleware attached successfully');
      } catch (error) {
        log('[VITE] ❌ Vite initialization failed, continuing without HMR');
        console.error('[VITE ERROR]', error);
        console.error('[VITE ERROR] Stack:', (error as Error).stack);
      }
    } else {
      log('[VITE] Running in production mode, skipping Vite');
    }

    // Health check endpoint - register BEFORE other routes
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        viteEnabled: !!app.get('viteServer'),
        port: port
      });
    });

    // API routes AFTER health check
    app.use('/api', router);

    // Serve index.html for client-side routes (MUST be LAST)
    app.get('*', async (req, res, next) => {
      // Skip API routes, Vite requests, and file requests
      if (req.path.startsWith('/api') || 
          req.path.startsWith('/socket.io') ||
          req.path === '/health' ||
          req.path.startsWith('/@') ||  // Vite modules like /@vite/client
          req.path.startsWith('/src') || // Source files
          req.path.startsWith('/node_modules') || // Node modules
          req.path.includes('.')) {      // Files with extensions
        return next();
      }

      try {
        const indexPath = path.resolve(process.cwd(), 'client', 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');
        
        // Transform HTML with Vite if available
        const viteServer = app.get('viteServer');
        if (viteServer && typeof viteServer.transformIndexHtml === 'function') {
          try {
            html = await viteServer.transformIndexHtml(req.url, html);
          } catch (e) {
            console.log('Vite transform failed:', e.message);
          }
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        console.error('Error serving index.html:', e);
        res.status(404).send('Not Found');
      }
    });

    // Error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Express error:', err);
      res.status(err.status || 500).json({ 
        message: err.message || 'Internal Server Error' 
      });
    });

    log('Server middleware initialized');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

// Server error handling
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Handle process signals gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  // Completely ignore SIGTERM in development to prevent tsx watch from killing the server
  if (process.env.NODE_ENV === 'development') {
    console.log('Ignoring SIGTERM in development mode');
    return;
  }
  console.log('Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Prevent multiple server instances in watch mode
let serverStarted = false;

// Start the server with proper error handling
console.log('[STARTUP] Beginning server initialization...');

// Wrap in an async function to handle initialization properly
(async () => {
  // Prevent multiple initializations
  if (serverStarted) {
    console.log('[STARTUP] Server already started, skipping initialization');
    return;
  }
  
  try {
    console.log('[STARTUP] Initializing middleware...');
    await initializeServer();
    console.log('[STARTUP] Middleware initialized, starting server...');
    
    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        serverStarted = true;
        const viteStatus = app.get('viteServer') ? 'enabled' : 'disabled';
        console.log(`
  ➜  Server: http://localhost:${port}/
  ➜  Health: http://localhost:${port}/health
  ➜  Vite: ${viteStatus}
  ${viteStatus === 'enabled' ? '➜  HMR: Port 3001' : ''}
        `);
        console.log('[STARTUP] Server successfully started!');
        resolve();
      });
      
      server.on('error', reject);
    });
  } catch (error) {
    console.error('[STARTUP ERROR] Failed to start server:', error);
    console.error('[STARTUP ERROR] Stack trace:', (error as Error).stack);
    // Don't exit immediately in watch mode
    if (!process.env.npm_lifecycle_event?.includes('watch')) {
      process.exit(1);
    }
  }
})();
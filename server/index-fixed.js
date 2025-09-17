import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration for Replit
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in development for Replit preview
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, origin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Trust proxy - important for Replit
app.set('trust proxy', true);

// Create HTTP server
const server = createServer(app);

// Health check - always available
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'practice-intelligence',
    port: PORT
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Setup API routes
async function setupApiRoutes() {
  try {
    // Try different route file locations
    let routesModule;
    try {
      routesModule = await import('./routes.js');
    } catch {
      try {
        routesModule = await import('./routes.ts');
      } catch {
        try {
          routesModule = await import('./routes-fallback.js');
        } catch (err) {
          console.log('⚠️ No API routes available, using basic endpoints only');
          return;
        }
      }
    }
    
    const router = routesModule.default || routesModule;
    app.use('/api', router);
    console.log('✅ API routes loaded at /api');
  } catch (err) {
    console.log('⚠️ Could not load API routes:', err.message);
  }
}

// Setup WebSocket with fallback
async function setupWebSocket() {
  try {
    let wsModule;
    try {
      wsModule = await import('./websocket/websocket.server.js');
    } catch {
      try {
        wsModule = await import('./websocket-fallback.js');
      } catch {
        console.log('⚠️ WebSocket not available');
        return;
      }
    }
    
    if (wsModule.setupWebSocketServer) {
      wsModule.setupWebSocketServer(server);
      console.log('✅ WebSocket server enabled');
    } else if (wsModule.setupWebSocketFallback) {
      wsModule.setupWebSocketFallback(server);
      console.log('✅ WebSocket fallback enabled');
    }
  } catch (err) {
    console.log('⚠️ Could not setup WebSocket:', err.message);
  }
}

// Setup client serving with Vite for development
async function setupClientServing() {
  const clientPath = path.join(__dirname, '../client');
  const indexPath = path.join(clientPath, 'index.html');
  const distPath = path.join(__dirname, '../dist/public');
  const distIndexPath = path.join(distPath, 'index.html');
  
  // Check if we have built files (production)
  if (fs.existsSync(distIndexPath)) {
    console.log('✅ Serving production build from /dist');
    app.use(express.static(distPath));
    
    // Catch-all for client-side routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
        res.sendFile(distIndexPath);
      }
    });
    return;
  }
  
  // Development mode - setup Vite
  if (fs.existsSync(indexPath) && process.env.NODE_ENV !== 'production') {
    try {
      const vite = await import('vite');
      
      // Create Vite server in middleware mode
      const viteServer = await vite.createServer({
        configFile: path.join(clientPath, 'vite.config.ts'),
        server: {
          middlewareMode: true,
          cors: true,
          hmr: {
            port: 3001,
            host: 'localhost', // Use localhost to avoid WebSocket issues
            protocol: 'ws'
          }
        },
        appType: 'spa',
        root: clientPath
      });
      
      // Use Vite middleware
      app.use(viteServer.middlewares);
      console.log('✅ Vite development server enabled');
      
      // Serve static assets from public
      const publicPath = path.join(clientPath, 'public');
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath));
      }
      
    } catch (viteError) {
      console.log('⚠️ Vite not available, using static file serving');
      console.log('   Error:', viteError.message);
      
      // Fallback to static serving
      app.use(express.static(clientPath));
      if (fs.existsSync(path.join(clientPath, 'public'))) {
        app.use(express.static(path.join(clientPath, 'public')));
      }
    }
  } else if (fs.existsSync(indexPath)) {
    // Production mode without dist - serve source files
    console.log('✅ Serving source files from /client');
    app.use(express.static(clientPath));
    if (fs.existsSync(path.join(clientPath, 'public'))) {
      app.use(express.static(path.join(clientPath, 'public')));
    }
  }
  
  // Catch-all route for client-side routing
  app.get('*', (req, res) => {
    // Skip API and health routes
    if (req.path.startsWith('/api') || req.path === '/health' || req.path.includes('.')) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback HTML
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Practice Intelligence</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              }
              h1 { color: #2d3748; margin-bottom: 1rem; }
              .status { 
                display: inline-block;
                padding: 0.5rem 1rem;
                background: #48bb78;
                color: white;
                border-radius: 6px;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Practice Intelligence</h1>
              <div class="status">Server Running</div>
              <p>The application is starting up...</p>
            </div>
          </body>
        </html>
      `);
    }
  });
}

// Initialize everything
async function initialize() {
  await setupApiRoutes();
  await setupWebSocket();
  await setupClientServing();
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(err.status || 500).json({ 
      message: err.message || 'Internal Server Error' 
    });
  });
}

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at http://localhost:${PORT}/health`);
  
  // Initialize features
  await initialize();
  
  console.log('📱 Server ready for Replit preview');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
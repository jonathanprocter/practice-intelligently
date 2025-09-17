import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Create HTTP server
const server = createServer(app);

// Start listening immediately - don't wait for optional setup
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at http://localhost:${PORT}/health`);
  
  // Set up optional features after binding
  Promise.resolve().then(() => setupOptionalFeatures()).catch((err) => {
    console.log('⚠️ Error setting up optional features:', err.message);
  });
});

// Health check - always available
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    server: 'practice-intelligence',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API running',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Load fallback routes immediately to prevent 404 errors
(async () => {
  try {
    const fallbackRoutes = await import('./routes-fallback.js');
    const router = fallbackRoutes.default || fallbackRoutes;
    app.use('/api', router);
    console.log('✅ Fallback API routes loaded at /api');
  } catch (err) {
    console.log('⚠️ Could not load fallback routes:', err.message);
  }
})();

// Optional feature setup (runs after server is already listening)
async function setupOptionalFeatures() {
  try {
    // Try to load API routes (simplified)
    try {
      let routesModule;
      let usingFallback = false;
      
      try {
        // First try to import compiled JS version
        routesModule = await import('./routes.js');
        console.log('Using compiled routes.js');
      } catch (jsErr) {
        try {
          // Try TypeScript version
          routesModule = await import('./routes.ts');
          console.log('Using TypeScript routes');
        } catch (tsErr) {
          try {
            // Use fallback routes to prevent errors
            routesModule = await import('./routes-fallback.js');
            usingFallback = true;
            console.log('Using fallback routes for basic functionality');
          } catch (fallbackErr) {
            throw new Error(`Could not load any routes: ${jsErr.message}`);
          }
        }
      }
      
      const router = routesModule.default || routesModule;
      app.use('/api', router);
      console.log(usingFallback ? 
        '✅ Fallback API routes loaded at /api (basic functionality)' : 
        '✅ Full API routes loaded at /api');
    } catch (err) {
      console.log('⚠️ API routes not available, using basic endpoints only');
      console.log('   Error:', err.message);
    }

    // Try to setup WebSocket
    try {
      let wsModule;
      try {
        wsModule = await import('./websocket/websocket.server.js');
      } catch {
        try {
          wsModule = await import('./websocket/websocket.server.ts');
        } catch {
          // Use fallback to prevent client errors
          wsModule = await import('./websocket-fallback.js');
        }
      }
      
      if (wsModule.setupWebSocketServer || wsModule.setupWebSocketFallback) {
        const setupFn = wsModule.setupWebSocketServer || wsModule.setupWebSocketFallback;
        setupFn(server);
        console.log('✅ WebSocket support enabled (or fallback)');
      }
    } catch (err) {
      console.log('⚠️ WebSocket not available');
    }

    // Setup client serving - prioritize built assets if they exist
    const builtAssetsPath = path.join(__dirname, '../dist/public');
    const sourceAssetsPath = path.join(__dirname, '../client');
    const builtIndexExists = fs.existsSync(path.join(builtAssetsPath, 'index.html'));
    const sourceIndexExists = fs.existsSync(path.join(sourceAssetsPath, 'index.html'));
    
    let clientPath, indexPath;
    let useBuiltAssets = false;
    
    if (builtIndexExists) {
      // Use built assets if available (production-ready)
      clientPath = builtAssetsPath;
      indexPath = path.join(builtAssetsPath, 'index.html');
      useBuiltAssets = true;
      console.log('✅ Built assets found, using production build from /dist');
    } else if (sourceIndexExists) {
      // Fall back to source files for development
      clientPath = sourceAssetsPath;
      indexPath = path.join(sourceAssetsPath, 'index.html');
      console.log('✅ Source files found, using development setup from /client');
    } else {
      console.error('❌ No client files found in /dist or /client');
      clientPath = null;
      indexPath = null;
    }
    
    if (clientPath && fs.existsSync(indexPath)) {
      console.log(`✅ Client files found at ${clientPath}, setting up serving...`);
      
      // Always serve static files first
      app.use(express.static(clientPath));
      
      if (useBuiltAssets) {
        console.log('✅ Production static asset serving enabled');
      } else {
        // In development with source files, also serve public directory
        const publicPath = path.join(clientPath, 'public');
        if (fs.existsSync(publicPath)) {
          app.use(express.static(publicPath));
        }
        
        // Only try Vite if explicitly enabled via environment variable
        if (process.env.ENABLE_VITE === 'true' && !useBuiltAssets) {
          console.log('Setting up development server...');
          
          try {
            const vite = await import('vite');
            const viteConfigPath = path.join(clientPath, 'vite.config.ts');
          
          // Create Vite server with proper config
          const viteServer = await vite.createServer({
            configFile: fs.existsSync(viteConfigPath) ? viteConfigPath : undefined,
            server: {
              middlewareMode: true,
              hmr: { 
                port: 3001,
                host: '0.0.0.0'
              },
              fs: {
                strict: false,
                allow: ['.']
              }
            },
            appType: 'spa',
            root: clientPath
          });
          
          // Use Vite middleware
          app.use(viteServer.middlewares);
          console.log('✅ Vite development server enabled with HMR on port 3001');
          
        } catch (viteError) {
          console.log('⚠️ Vite not available, using static file serving');
          console.log('   Error:', viteError.message);
        }
        }
      }
      
      // Catch-all route for client-side routing (always needed)
      app.get('*', (req, res, next) => {
        // Skip API and static file requests
        if (req.path.startsWith('/api') || 
            req.path.startsWith('/socket.io') ||
            req.path === '/health' ||
            req.path.includes('.')) {
          return next();
        }

        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error sending index.html:', err.message);
            res.status(500).send('Error loading app');
          }
        });
      });
      
    } else {
      console.error('❌ Client files not found at:', clientPath);
      // Provide a simple app interface as fallback
      app.get('*', (req, res, next) => {
        if (!req.path.startsWith('/api') && req.path !== '/health') {
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Practice Intelligence</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #f8fafc;
                    color: #1a202c;
                  }
                  .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 12px;
                    padding: 2rem;
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
                    margin-bottom: 1rem;
                  }
                  .links { margin-top: 2rem; }
                  .links a {
                    display: inline-block;
                    margin-right: 1rem;
                    padding: 0.5rem 1rem;
                    background: #4299e1;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-bottom: 0.5rem;
                  }
                  .links a:hover { background: #3182ce; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🏥 Practice Intelligence</h1>
                  <div class="status">Server Running</div>
                  <p>Your Practice Intelligence server is running successfully!</p>
                  <p>The client application is starting up. If this message persists, try refreshing the page.</p>
                  <div class="links">
                    <a href="/health">Health Check</a>
                    <a href="/api/status">API Status</a>
                  </div>
                </div>
              </body>
            </html>
          `);
        } else {
          return next();
        }
      });
    }
    
    // Function to setup static file serving
    function setupStaticServing() {
      // Serve static files
      app.use(express.static(clientPath));
      
      const publicPath = path.join(clientPath, 'public');
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath));
      }
      
      // Catch-all route for client-side routing
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && 
            !req.path.startsWith('/socket.io') &&
            req.path !== '/health') {
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err.message);
              res.status(404).send('Page not found');
            }
          });
        }
      });
      
      console.log('✅ Static file serving configured');
    }

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Express error:', err);
      res.status(err.status || 500).json({ 
        message: err.message || 'Internal Server Error' 
      });
    });

    // Server is already listening (started at line 24)

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('Please stop the other process or use a different port');
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors (but don't exit in development)
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

// Optional features are set up after server starts listening (see line 29)
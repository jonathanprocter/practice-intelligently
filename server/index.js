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

// Main server initialization
async function startServer() {
  try {
    // Try to load API routes with tsx/ts-node
    try {
      // First try to import compiled JS version
      let routesModule;
      try {
        routesModule = await import('./routes.js');
      } catch {
        // Fallback to using tsx for TypeScript
        const { spawn } = await import('child_process');
        const { promisify } = await import('util');
        
        // Use dynamic import with tsx for TypeScript files
        const tsx = await import('tsx/esm');
        routesModule = await import('./routes.ts');
      }
      
      const router = routesModule.default || routesModule;
      app.use('/api', router);
      console.log('✅ API routes loaded at /api');
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
        wsModule = await import('./websocket/websocket.server.ts');
      }
      
      if (wsModule.setupWebSocketServer) {
        wsModule.setupWebSocketServer(server);
        console.log('✅ WebSocket support enabled');
      }
    } catch (err) {
      console.log('⚠️ WebSocket not available');
    }

    // Setup client serving
    const clientPath = path.join(__dirname, '../client');
    const indexPath = path.join(clientPath, 'index.html');
    
    // Check if client files exist
    if (fs.existsSync(indexPath)) {
      console.log('✅ Client files found, setting up serving...');
      
      // Always serve static files first
      app.use(express.static(clientPath));
      const publicPath = path.join(clientPath, 'public');
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath));
      }
      
      // In development, try to use Vite
      if (process.env.NODE_ENV !== 'production') {
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
      
      // Catch-all route for client-side routing (always needed)
      app.get('*', (req, res) => {
        // Skip API and static file requests
        if (req.path.startsWith('/api') || 
            req.path.startsWith('/socket.io') ||
            req.path === '/health' ||
            req.path.includes('.')) {
          return;
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
      app.get('*', (req, res) => {
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

    // Start listening
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════╗
║     Practice Intelligence Server          ║
╠═══════════════════════════════════════════╣
║  ✅ Status: Running                       ║
║  🌐 URL: http://localhost:${PORT}            ║
║  🏥 Environment: ${process.env.NODE_ENV || 'development'}           ║
║  📊 Node: ${process.version}                     ║
║  ❤️  Health: http://localhost:${PORT}/health ║
╚═══════════════════════════════════════════╝
      `);
    });

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

// Start the server
startServer().catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});
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
    // Try to load API routes
    try {
      const routesModule = await import('./routes.ts');
      const router = routesModule.default || routesModule;
      app.use('/api', router);
      console.log('✅ API routes loaded at /api');
    } catch (err) {
      console.log('⚠️ API routes not available, using basic endpoints only');
      console.log('   Error:', err.message);
    }

    // Try to setup WebSocket
    try {
      const wsModule = await import('./websocket/websocket.server.ts');
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
      // In development, try to use Vite
      if (process.env.NODE_ENV !== 'production') {
        console.log('Setting up development server...');
        
        try {
          const vite = await import('vite');
          const viteConfigPath = path.join(clientPath, 'vite.config.ts');
          
          // Create Vite server
          const viteServer = await vite.createServer({
            configFile: fs.existsSync(viteConfigPath) ? viteConfigPath : undefined,
            server: {
              middlewareMode: true,
              hmr: { 
                port: 3001,
                host: 'localhost'
              }
            },
            appType: 'spa',
            root: clientPath
          });
          
          // Use Vite middleware
          app.use(viteServer.middlewares);
          console.log('✅ Vite development server enabled with HMR on port 3001');
          
          // Serve index.html for client routes through Vite
          app.get('*', async (req, res, next) => {
            // Skip API and static file requests
            if (req.path.startsWith('/api') || 
                req.path.startsWith('/socket.io') ||
                req.path === '/health' ||
                req.path.includes('.')) {
              return next();
            }

            try {
              let html = fs.readFileSync(indexPath, 'utf-8');
              html = await viteServer.transformIndexHtml(req.url, html);
              res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
            } catch (e) {
              console.error('Error serving HTML through Vite:', e.message);
              // Fallback to sending raw HTML
              res.sendFile(indexPath);
            }
          });
          
        } catch (viteError) {
          console.log('⚠️ Vite not available, using static file serving');
          console.log('   Error:', viteError.message);
          setupStaticServing();
        }
      } else {
        // Production mode
        console.log('Running in production mode');
        setupStaticServing();
      }
    } else {
      console.error('❌ Client files not found at:', clientPath);
      // Provide a simple fallback page
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && req.path !== '/health') {
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Practice Intelligence - Setup Required</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  }
                  .container {
                    text-align: center;
                    padding: 3rem;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                  }
                  h1 { color: #1a202c; }
                  .status { 
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    background: #f59e0b;
                    color: white;
                    border-radius: 9999px;
                    font-weight: 600;
                    margin: 1rem 0;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🚀 Practice Intelligence Server</h1>
                  <div class="status">Client Setup Required</div>
                  <p>Server is running but client files are not found.</p>
                  <p>API Status: <a href="/api/status">/api/status</a></p>
                  <p>Health Check: <a href="/health">/health</a></p>
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
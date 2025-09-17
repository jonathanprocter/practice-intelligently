import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware with proper CORS for Replit
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Health check endpoint - always first
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API running'
  });
});

// Simple fallback API routes
app.use('/api', (req, res, next) => {
  // Try to load real routes
  import('./routes.js')
    .then((module) => {
      const router = module.default || module;
      router(req, res, next);
    })
    .catch(() => {
      // Fallback response if routes not available
      res.json({ message: 'API endpoint not configured', path: req.path });
    });
});

// Serve client files
const clientPath = path.join(__dirname, '../client');
const indexPath = path.join(clientPath, 'index.html');

// In development, use Vite
if (process.env.NODE_ENV !== 'production' && fs.existsSync(indexPath)) {
  import('vite').then(async ({ createServer: createViteServer }) => {
    const viteServer = await createViteServer({
      configFile: path.join(clientPath, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false // Disable HMR to avoid WebSocket issues
      }
    });
    
    app.use(viteServer.middlewares);
    console.log('✅ Vite middleware attached (HMR disabled)');
  }).catch(() => {
    console.log('⚠️ Vite not available, serving static files');
    app.use(express.static(clientPath));
  });
} else {
  // Production or no client files - serve static
  const distPath = path.join(__dirname, '../dist/public');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    console.log('✅ Serving production build from dist/');
  } else if (fs.existsSync(indexPath)) {
    app.use(express.static(clientPath));
    console.log('✅ Serving static files from client/');
  }
}

// Catch-all for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    res.status(404).json({ error: 'Not found' });
  } else {
    const distIndex = path.join(__dirname, '../dist/public/index.html');
    const clientIndex = indexPath;
    
    if (fs.existsSync(distIndex)) {
      res.sendFile(distIndex);
    } else if (fs.existsSync(clientIndex)) {
      res.sendFile(clientIndex);
    } else {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Practice Intelligence</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                padding: 20px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <h1>Practice Intelligence</h1>
            <p>Server is running. Client files are being loaded...</p>
          </body>
        </html>
      `);
    }
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Ready for Replit preview`);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});
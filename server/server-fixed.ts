import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { initializeDatabase } from './db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes FIRST (before any catch-all routes)
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Initialize database
initializeDatabase().then(() => {
  console.log('✅ Database initialized');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Serve static files and setup Vite
async function setupApp() {
  if (process.env.NODE_ENV === 'production') {
    // Production: serve built files
    app.use(express.static(path.join(__dirname, '../dist')));

    // Catch-all route for client-side routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      }
    });

    console.log('📦 Running in production mode');
  } else {
    // Development: setup Vite middleware
    try {
      const vite = await import('vite');
      const viteServer = await vite.createServer({
        server: { 
          middlewareMode: true,
          hmr: {
            port: 3001,
            host: 'localhost'
          }
        },
        appType: 'spa',
        root: path.resolve(__dirname, '..'),
        base: '/'
      });

      // Use Vite middleware
      app.use(viteServer.middlewares);

      console.log('✅ Vite development server attached');
      console.log('🔥 HMR enabled on port 3001');
    } catch (error) {
      console.error('❌ Vite setup failed:', error);

      // Fallback: serve static files directly
      const clientPath = path.join(__dirname, '../client');
      app.use(express.static(clientPath));

      // Serve index.html for client routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          const indexPath = path.join(clientPath, 'index.html');
          res.sendFile(indexPath);
        }
      });

      console.log('⚠️ Falling back to static file serving');
    }
  }
}

// Start the server
async function startServer() {
  await setupApp();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Practice Intelligence Server Started!');
    console.log('==========================================');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 API Routes: http://localhost:${PORT}/api`);
    console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
    console.log('==========================================\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
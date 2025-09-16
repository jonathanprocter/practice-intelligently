
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import router from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', router);

// Simple static file serving for development
if (process.env.NODE_ENV !== 'production') {
  // In development, just serve a simple landing page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Practice Intelligence</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
          .status { color: #22c55e; font-weight: bold; }
          .api-link { color: #3b82f6; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>Practice Intelligence Server</h1>
        <p class="status">✅ Server is running on port ${PORT}</p>
        <p>API endpoints available at <a href="/api" class="api-link">/api</a></p>
        <p>Health check: <a href="/health" class="api-link">/health</a></p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
      </body>
      </html>
    `);
  });
} else {
  // Production static files
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Practice Intelligence server running on port ${PORT}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}`);
  console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});


import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    server: 'index-simple',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    running: true,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Serve client files
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Catch-all for client routing
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ 
        error: 'Client not found',
        path: indexPath,
        message: err.message 
      });
    }
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
==================================
✅ Simple Server Started
==================================
🚀 Port: ${PORT}
🏥 Environment: ${process.env.NODE_ENV || 'development'}
📡 Health: http://localhost:${PORT}/health
==================================
  `);
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
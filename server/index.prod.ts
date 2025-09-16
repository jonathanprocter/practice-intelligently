// Simplified production server entry point
import express from "express";
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  process.exit(0);
});

const app = express();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Serve static files (built frontend)
app.use(express.static(path.join(__dirname, '../dist/client')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client/index.html'));
});

// Start the server
const port = parseInt(process.env.PORT || '5000', 10);

const server = createServer(app);

server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`🚀 Production server running on port ${port}`);
  console.log(`📊 Health check available at http://0.0.0.0:${port}/api/health`);
});

export default app;
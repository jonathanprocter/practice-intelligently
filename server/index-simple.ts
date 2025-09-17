// Simple server to test basic functionality
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

const app = express();
const port = 5000;

// Body parsing
app.use(express.json({ limit: '50mb' }));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Simple server running'
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return res.status(404).send('Not found');
  }
  
  const indexPath = path.resolve(process.cwd(), 'client', 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.send(html);
  } else {
    res.status(404).send('Index.html not found');
  }
});

const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Simple server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
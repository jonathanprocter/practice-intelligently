// Debug version to test Vite setup
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import router from "./routes";
import { setupWebSocketServer } from './websocket/websocket.server';

const app = express();
const port = 5000;

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

const server = createServer(app);

// Setup WebSocket
const wsManager = setupWebSocketServer(server);
app.set('wsManager', wsManager);

// Try to setup Vite
async function trySetupVite() {
  try {
    console.log('Attempting to setup Vite...');
    const { createServer: createViteServer } = await import('vite');
    
    const viteServer = await createViteServer({
      configFile: path.resolve(process.cwd(), 'client/vite.config.ts'),
      server: {
        middlewareMode: true,
        host: true,
        cors: true,
        hmr: {
          port: 3001
        }
      }
    });
    
    // Use Vite middleware
    app.use(viteServer.middlewares);
    console.log('✅ Vite middleware attached successfully');
    return viteServer;
  } catch (error) {
    console.error('❌ Failed to setup Vite:', error);
    return null;
  }
}

// Setup routes and server
async function startServer() {
  // Try to setup Vite first
  const viteServer = await trySetupVite();
  app.set('viteServer', viteServer);
  
  // API routes
  app.use('/api', router);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      viteEnabled: !!app.get('viteServer'),
      port: port
    });
  });
  
  // Catch-all for client-side routes
  app.get('*', async (req, res, next) => {
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/socket.io') ||
        req.path === '/health' ||
        req.path.includes('.')) {
      return next();
    }
    
    try {
      const indexPath = path.resolve(process.cwd(), 'client', 'index.html');
      let html = fs.readFileSync(indexPath, 'utf-8');
      
      const viteServer = app.get('viteServer');
      if (viteServer && typeof viteServer.transformIndexHtml === 'function') {
        html = await viteServer.transformIndexHtml(req.url, html);
      }
      
      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    } catch (e) {
      console.error('Error serving index.html:', e);
      res.status(404).send('Not Found');
    }
  });
  
  // Start server
  server.listen(port, '0.0.0.0', () => {
    console.log(`
  ➜  Server: http://localhost:${port}/
  ➜  Health: http://localhost:${port}/health
  ➜  Vite: ${viteServer ? 'enabled' : 'disabled'}
    `);
  });
}

// Start the server
startServer().catch(console.error);
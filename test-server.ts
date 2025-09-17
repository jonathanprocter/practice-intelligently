import express from 'express';

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());

// Test routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Server</title>
        <style>
          body { 
            font-family: Arial; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
          }
          .status { 
            background: #4CAF50; 
            color: white; 
            padding: 10px; 
            border-radius: 5px; 
          }
        </style>
      </head>
      <body>
        <h1>✅ Test Server is Working!</h1>
        <div class="status">
          <p>Server is running on port ${PORT}</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
        <h2>Test Endpoints:</h2>
        <ul>
          <li><a href="/health">/health</a> - Health check</li>
          <li><a href="/api/test">/api/test</a> - API test</li>
        </ul>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test server is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API endpoint working',
    data: {
      server: 'test-server',
      version: '1.0.0'
    }
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║   ✅ Test Server Started Successfully   ║
╠════════════════════════════════════════╣
║   URL: http://localhost:${PORT}           ║
║   Status: Running                      ║
║   PID: ${process.pid}                     ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
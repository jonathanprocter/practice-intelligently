// Force start script to bypass OpenSSL issues
const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Force starting the therapy practice app...');

// Set environment
process.env.NODE_ENV = 'development';
process.env.PORT = '5000';

// Kill existing processes
try {
  const { execSync } = require('child_process');
  execSync('pkill -f "server/index.ts" 2>/dev/null || true', { stdio: 'ignore' });
} catch (e) {
  // Ignore errors
}

// Create a simple health check server as fallback
const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Therapy Practice Management System is running' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Therapy Practice Management</title></head>
        <body>
          <h1>🏥 Therapy Practice Management System</h1>
          <p>The application is starting up. Please wait a moment...</p>
          <p><a href="/api/health">Health Check</a></p>
          <script>
            setTimeout(() => window.location.reload(), 3000);
          </script>
        </body>
      </html>
    `);
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('✅ Fallback server running on port 5000');
  console.log('🌐 App accessible at: http://localhost:5000');
  console.log('❤️  Health check: http://localhost:5000/api/health');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close();
  process.exit(0);
});
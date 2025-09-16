#!/usr/bin/env node

// Simple Node.js wrapper to run the server without tsx watch mode issues
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Practice Intelligence Application...');

const serverPath = path.join(__dirname, 'server', 'index.ts');

// Start the server with tsx
const server = spawn('tsx', [serverPath], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});
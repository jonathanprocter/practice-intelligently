#!/usr/bin/env node

// Simple Node.js script to start the development server
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting development server...');

// Set environment variables
process.env.NODE_ENV = 'development';

// Start the server using tsx without watch mode
const serverProcess = spawn('tsx', ['server/index.ts'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nTerminating server...');
  serverProcess.kill('SIGTERM');
});
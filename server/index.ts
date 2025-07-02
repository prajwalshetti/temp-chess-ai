// Temporary redirect to JavaScript version
// This file exists to redirect the TypeScript tsx command to the JavaScript version
import { spawn } from 'child_process';

console.log('Redirecting to JavaScript version...');

const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

server.on('error', (err: any) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code: number | null) => {
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
});
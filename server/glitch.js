
// This file serves as the entry point for Glitch
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Use the appropriate command
const command = isProduction 
  ? 'node' 
  : 'tsx';

const args = isProduction 
  ? [path.join(__dirname, 'index.js')] 
  : [path.join(__dirname, 'index.ts')];

// Spawn the process
const proc = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '5000'
  }
});

proc.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

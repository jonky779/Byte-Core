
// This file serves as the entry point for Glitch
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Find the node executable path
const nodeBin = process.env.NODE || 'node';
const npmBin = process.env.NPM_PATH || '/opt/nvm/versions/node/v16/bin/npm';

// Check if we need to install dependencies first
if (!fs.existsSync(path.join(__dirname, '../node_modules'))) {
  console.log('Installing dependencies first...');
  const install = spawn(npmBin, ['install'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  install.on('close', (code) => {
    if (code !== 0) {
      console.error(`npm install exited with code ${code}`);
      process.exit(code);
    }
    startApp();
  });
} else {
  startApp();
}

function startApp() {
  // Use the appropriate command
  const command = isProduction 
    ? nodeBin 
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
}

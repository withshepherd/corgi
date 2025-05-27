import { copyFileSync, existsSync } from 'fs';
import path from 'path';

// Different possible paths for sql-wasm.wasm file
const possiblePaths = [
  path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  path.join(__dirname, '..', '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  // Add more possible paths if needed
];

const wasmDest = path.join(__dirname, 'sql-wasm.wasm');

// Skip if the destination file already exists
if (!existsSync(wasmDest)) {
  let copied = false;
  
  // Try each possible path
  for (const wasmSource of possiblePaths) {
    if (existsSync(wasmSource)) {
      try {
        copyFileSync(wasmSource, wasmDest);
        console.log(`Successfully copied wasm file from ${wasmSource}`);
        copied = true;
        break;
      } catch (error) {
        console.warn(`Could not copy from ${wasmSource}:`, error);
      }
    }
  }
  
  if (!copied) {
    console.warn('Warning: Could not copy sql-wasm.wasm file from any known location. Browser tests might fail.');
  }
} 
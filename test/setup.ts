import { copyFileSync, existsSync, createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import path from 'path';

// Database download setup
const TEST_DB_URL = 'https://corgi.cardog.io/test.db.gz';
const TEST_DB_PATH = path.join(__dirname, 'test.db');

async function downloadTestDatabase() {
  if (existsSync(TEST_DB_PATH)) {
    console.log('Test database already exists, skipping download');
    return;
  }

  console.log('Downloading test database from remote...');

  try {
    const response = await fetch(TEST_DB_URL);
    if (!response.ok) {
      throw new Error(`Failed to download test database: ${response.status}`);
    }

    const gunzip = createGunzip();
    const fileStream = createWriteStream(TEST_DB_PATH);

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Convert Web ReadableStream to Node.js Readable stream
    const nodeStream = response.body as any;
    await pipeline(nodeStream, gunzip, fileStream);

    console.log('Test database downloaded and decompressed successfully');
  } catch (error) {
    console.error('Failed to download test database:', error);
    throw error;
  }
}

// Download database before tests (this runs immediately when setup.ts is imported)
await downloadTestDatabase();

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
    console.warn(
      'Warning: Could not copy sql-wasm.wasm file from any known location. Browser tests might fail.',
    );
  }
}

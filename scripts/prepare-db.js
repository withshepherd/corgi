#!/usr/bin/env node

/**
 * Script to prepare the database for distribution
 * Compresses the database file and copies it to the dist directory
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Paths
const DB_PATH = path.join(__dirname, '..', 'db', 'vpic.lite.db');
const DIST_DIR = path.join(__dirname, '..', 'dist', 'db');
const DIST_DB_PATH = path.join(DIST_DIR, 'vpic.lite.db.gz');

async function main() {
  console.log('Preparing database for distribution...');

  try {
    // Ensure the dist directory exists
    if (!fs.existsSync(DIST_DIR)) {
      console.log(`Creating directory: ${DIST_DIR}`);
      mkdirSync(DIST_DIR, { recursive: true });
    }

    // Check if the source database exists
    if (!fs.existsSync(DB_PATH)) {
      console.error(`Source database not found: ${DB_PATH}`);
      process.exit(1);
    }

    // Compress the database
    console.log(`Compressing database: ${DB_PATH} -> ${DIST_DB_PATH}`);

    const gzip = zlib.createGzip({ level: 9 }); // Maximum compression
    const source = createReadStream(DB_PATH);
    const dest = createWriteStream(DIST_DB_PATH);

    await pipeline(source, gzip, dest);

    // Get file sizes for reporting
    const sourceSize = fs.statSync(DB_PATH).size;
    const destSize = fs.statSync(DIST_DB_PATH).size;
    const compressionRatio = (destSize / sourceSize * 100).toFixed(2);

    console.log(`Compression complete!`);
    console.log(`Original size: ${(sourceSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compressed size: ${(destSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Compression ratio: ${compressionRatio}%`);

    console.log('Database preparation complete!');
  } catch (error) {
    console.error('Error preparing database:', error);
    process.exit(1);
  }
}

main();
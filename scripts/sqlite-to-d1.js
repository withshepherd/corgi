#!/usr/bin/env node

/**
 * SQLite to D1 Conversion Script
 * 
 * This script converts a SQLite database to a D1-compatible format
 * for use with Cloudflare Workers.
 * 
 * Usage:
 *   node scripts/sqlite-to-d1.js ./db/vpic.lite.db my-d1-database
 * 
 * Requirements:
 *   - wrangler must be installed globally or via npx
 *   - You must be authenticated with Cloudflare (`wrangler login`)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse arguments
const [,, sourcePath, d1Name] = process.argv;

if (!sourcePath || !d1Name) {
  console.error('Usage: node scripts/sqlite-to-d1.js <sqlite-db-path> <d1-database-name>');
  process.exit(1);
}

// Resolve full path
const dbPath = path.resolve(process.cwd(), sourcePath);

// Check if the source file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Error: SQLite database not found at ${dbPath}`);
  process.exit(1);
}

console.log(`Converting ${dbPath} to D1 database ${d1Name}...`);

// Check if database already exists
const listCommand = spawn('wrangler', ['d1', 'list']);

listCommand.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes(d1Name)) {
    console.log(`D1 database ${d1Name} already exists.`);
    uploadData();
  } else {
    console.log(`Creating new D1 database ${d1Name}...`);
    createDatabase();
  }
});

listCommand.stderr.on('data', (data) => {
  console.error(`Error checking existing databases: ${data}`);
});

listCommand.on('error', (error) => {
  console.error(`Failed to run wrangler: ${error.message}`);
  console.error('Make sure wrangler is installed and you are logged in to Cloudflare.');
  process.exit(1);
});

// Create D1 database
function createDatabase() {
  const createCommand = spawn('wrangler', ['d1', 'create', d1Name]);
  
  createCommand.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  createCommand.stderr.on('data', (data) => {
    console.error(`Error creating database: ${data}`);
  });
  
  createCommand.on('close', (code) => {
    if (code === 0) {
      console.log(`Successfully created D1 database ${d1Name}.`);
      uploadData();
    } else {
      console.error(`Failed to create D1 database. Exit code: ${code}`);
      process.exit(1);
    }
  });
}

// Upload data to D1
function uploadData() {
  console.log('Uploading data to D1...');
  console.log('This may take several minutes depending on the database size.');
  
  const uploadCommand = spawn(
    'wrangler', 
    ['d1', 'execute', d1Name, '--file', dbPath, '--local', 'false'],
    { stdio: 'inherit' }
  );
  
  uploadCommand.on('close', (code) => {
    if (code === 0) {
      console.log('\nSuccessfully uploaded data to D1 database.');
      showBindingInfo();
    } else {
      console.error(`\nFailed to upload data to D1 database. Exit code: ${code}`);
      process.exit(1);
    }
  });
}

// Show binding information
function showBindingInfo() {
  console.log('\n=====================================================================');
  console.log('D1 DATABASE CREATED AND DATA UPLOADED SUCCESSFULLY');
  console.log('=====================================================================');
  console.log('\nTo use this database in your Cloudflare Worker, add the following to your wrangler.toml:');
  console.log(`
[[d1_databases]]
binding = "DB" # JavaScript variable name
database_name = "${d1Name}"
database_id = "<your-database-id>" # Find this in the Cloudflare dashboard
`);
  console.log('\nAnd then in your worker:');
  console.log(`
import { initD1Adapter, createDecoder } from '@crdg/corgi';

export default {
  async fetch(request, env, ctx) {
    // Initialize the D1 adapter
    initD1Adapter(env.DB);
    
    // Create a decoder
    const decoder = await createDecoder({
      databasePath: 'D1',
      runtime: 'cloudflare'
    });
    
    // Decode VIN
    const result = await decoder.decode('KM8K2CAB4PU001140');
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
`);
  console.log('\n=====================================================================');
}
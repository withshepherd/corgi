#!/usr/bin/env node

/**
 * Prepare Package Script
 * 
 * This script prepares the package for publication by:
 * 1. Creating necessary directories
 * 2. Copying examples to the package
 * 3. Ensuring license and readme are present
 * 
 * Run this before publishing with npm run prepare-package
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get script directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy files recursively
function copyDir(src, dest) {
  ensureDir(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Main function
async function preparePackage() {
  console.log('Preparing package for publication...');
  
  // Ensure dist directory exists
  const distDir = path.join(rootDir, 'dist');
  ensureDir(distDir);
  
  // Copy examples directory
  const examplesDir = path.join(rootDir, 'examples');
  if (fs.existsSync(examplesDir)) {
    console.log('Copying examples directory...');
    copyDir(examplesDir, path.join(rootDir, 'dist', 'examples'));
  }
  
  // Ensure scripts directory exists
  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    console.log('Copying scripts directory...');
    ensureDir(path.join(rootDir, 'dist', 'scripts'));
    
    // Copy specific scripts
    const sqliteToD1 = path.join(scriptsDir, 'sqlite-to-d1.js');
    if (fs.existsSync(sqliteToD1)) {
      fs.copyFileSync(sqliteToD1, path.join(rootDir, 'dist', 'scripts', 'sqlite-to-d1.js'));
      console.log('Copied sqlite-to-d1.js script');
    }
  }
  
  // Check if README and LICENSE exist
  const readmePath = path.join(rootDir, 'README.md');
  const licensePath = path.join(rootDir, 'LICENSE');
  
  if (!fs.existsSync(readmePath)) {
    console.warn('WARNING: README.md not found!');
  }
  
  if (!fs.existsSync(licensePath)) {
    console.warn('WARNING: LICENSE not found!');
  }
  
  console.log('Package preparation complete!');
}

// Run the function
preparePackage().catch(error => {
  console.error('Error preparing package:', error);
  process.exit(1);
});
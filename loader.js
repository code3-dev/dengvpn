const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Determine if we're in development or production
const isDev = !app.isPackaged;

// In development mode, run the original main.js
// In production mode, run the obfuscated main.js from dist/
const mainPath = isDev 
  ? path.join(__dirname, 'main.js')
  : path.join(__dirname, 'dist', 'main.js');

// Define global variables for asset paths to be used throughout the app
global.__basedir = __dirname;
global.__assetsdir = isDev
  ? path.join(__dirname, 'assets')
  : path.join(__dirname, 'dist', 'assets');

// Define global variable for core directory path
global.__coredir = isDev
  ? path.join(__dirname, 'core')
  : path.join(process.resourcesPath, 'core');

// Try to ensure the core directory exists
if (!fs.existsSync(global.__coredir)) {
  // Try finding core in other potential locations
  const potentialCoreDirs = [
    path.join(__dirname, 'core'),
    path.join(process.resourcesPath, 'core'),
    path.join(__dirname, 'dist', 'core'),
    path.join(__dirname, '..', 'core')
  ];
  
  for (const dir of potentialCoreDirs) {
    if (fs.existsSync(dir)) {
      global.__coredir = dir;
      console.log(`Found core directory at: ${global.__coredir}`);
      break;
    }
  }
}

// Check if the file exists
if (!fs.existsSync(mainPath)) {
  console.error(`Error: Main file not found at ${mainPath}`);
  app.quit();
}

// Load and run the actual application code
require(mainPath); 
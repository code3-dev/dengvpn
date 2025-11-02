const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Determine if we're in development or production
const isDev = !app.isPackaged;

// In development mode, run the original main.js
// In production mode, run the obfuscated main.js from dist/
let mainPath = isDev 
  ? path.join(__dirname, 'main.js')
  : path.join(__dirname, 'dist', 'main.js');

// Define global variables for asset paths to be used throughout the app
global.__basedir = __dirname;
global.__assetsdir = isDev
  ? path.join(__dirname, 'assets')
  : path.join(process.resourcesPath, 'assets');

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

// In production, if the main.js file doesn't exist in dist, try to load it directly
if (!isDev && !fs.existsSync(mainPath)) {
  console.log('Obfuscated main.js not found, trying direct load...');
  mainPath = path.join(__dirname, 'main.js');
}

// Additional check for packaged app - try alternative paths
if (!isDev && !fs.existsSync(mainPath)) {
  console.log('Trying alternative paths for main.js...');
  // Try loading main.js directly from app root in packaged app
  const alternativePaths = [
    path.join(__dirname, 'main.js'),
    path.join(process.resourcesPath, 'app.asar', 'main.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'main.js')
  ];
  
  for (const altPath of alternativePaths) {
    if (fs.existsSync(altPath)) {
      mainPath = altPath;
      console.log(`Found main.js at alternative path: ${mainPath}`);
      break;
    }
  }
}

// Check if the file exists
if (!fs.existsSync(mainPath)) {
  console.error(`Error: Main file not found at ${mainPath}`);
  
  // List available files for debugging
  try {
    const files = fs.readdirSync(__dirname);
    console.log('Files in app directory:', files);
    
    if (fs.existsSync(path.join(__dirname, 'dist'))) {
      const distFiles = fs.readdirSync(path.join(__dirname, 'dist'));
      console.log('Files in dist directory:', distFiles);
    }
  } catch (err) {
    console.log('Could not list directory contents:', err);
  }
  
  app.quit();
}

// Load and run the actual application code
try {
  require(mainPath);
} catch (error) {
  console.error('Failed to load main process:', error);
  app.quit();
}
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Files to obfuscate
const filesToObfuscate = [
  'main.js',
  'preload.js'
];

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Obfuscation options - high level of protection
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.8,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.5,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: true,
  rotateStringArray: true,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

console.log('Starting JavaScript obfuscation process...');

// Copy HTML/CSS/asset files to dist
// Copy assets folder
const assetsDir = path.join(__dirname, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

// Copy assets folder (only if it exists)
if (fs.existsSync(assetsDir)) {
  try {
    copyDirectory(assetsDir, distAssetsDir);
    console.log('Assets directory copied successfully');
  } catch (error) {
    console.error('Error copying assets directory:', error);
  }
}

// Copy core folder to dist directory
const coreDir = path.join(__dirname, 'core');
const distCoreDir = path.join(distDir, 'core');

// Copy core folder (only if it exists)
if (fs.existsSync(coreDir)) {
  try {
    copyDirectory(coreDir, distCoreDir);
    console.log('Core directory copied successfully');
  } catch (error) {
    console.error('Error copying core directory:', error);
  }
} else {
  console.warn('Core directory not found at:', coreDir);
  // Create an empty core directory in dist
  if (!fs.existsSync(distCoreDir)) {
    fs.mkdirSync(distCoreDir, { recursive: true });
    console.log('Created empty core directory in dist');
  }
}

// Process each file
filesToObfuscate.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  const distFilePath = path.join(distDir, filename);
  
  try {
    // Read the source file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Obfuscate the code
    console.log(`Obfuscating ${filename}...`);
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      fileContent,
      obfuscationOptions
    ).getObfuscatedCode();
    
    // Write the obfuscated code to the dist directory
    fs.writeFileSync(distFilePath, obfuscatedCode, 'utf8');
    console.log(`Successfully obfuscated ${filename}`);
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
  }
});

console.log('JavaScript obfuscation completed!');

// Recursive directory copy function
function copyDirectory(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read contents of source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
  }
} 
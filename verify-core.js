const fs = require('fs');
const path = require('path');

// Required Xray core files
const requiredFiles = [
  'xray.exe',
  'geoip.dat',
  'geosite.dat',
  'config.json',
  'disable_proxy.bat',
  'run.bat',
];

// Core directory path
const coreDir = path.join(__dirname, 'core');

console.log('Verifying Xray core files...');

// Check if core directory exists
if (!fs.existsSync(coreDir)) {
  console.log('Core directory does not exist. Creating it...');
  fs.mkdirSync(coreDir, { recursive: true });
}

// Check for each required file
const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(coreDir, file)));

if (missingFiles.length > 0) {
  console.error('⚠️ MISSING CORE FILES ⚠️');
  console.error('The following Xray core files are missing:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  console.error('\nPlease download the Xray core files from the official repository:');
  console.error('https://github.com/XTLS/Xray-core/releases');
  console.error('\nExtract the files and place them in the following directory:');
  console.error(coreDir);
  
  // Create placeholder files in development to prevent build errors
  console.log('\nCreating placeholder files for build process...');
  missingFiles.forEach(file => {
    const filePath = path.join(coreDir, file);
    fs.writeFileSync(filePath, '// This is a placeholder file. Please replace with the actual Xray core file.');
    console.log(`Created placeholder for ${file}`);
  });
  
  console.log('\nWarning: The application will not function correctly without the actual Xray core files.');
} else {
  console.log('✅ All required Xray core files are present!');
}

console.log('\nVerification complete.'); 
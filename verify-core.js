const fs = require('fs');
const path = require('path');

// Required V2Ray core files
const requiredFiles = [
  'v2ray.exe',
  'geoip.dat',
  'geosite.dat',
  'v2ctl.exe',
  'config.json',
  'disable_proxy.bat',
  'wv2ray.exe'
];

// Core directory path
const coreDir = path.join(__dirname, 'core');

console.log('Verifying V2Ray core files...');

// Check if core directory exists
if (!fs.existsSync(coreDir)) {
  console.log('Core directory does not exist. Creating it...');
  fs.mkdirSync(coreDir, { recursive: true });
}

// Check for each required file
const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(coreDir, file)));

if (missingFiles.length > 0) {
  console.error('⚠️ MISSING CORE FILES ⚠️');
  console.error('The following V2Ray core files are missing:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  console.error('\nPlease download the V2Ray core files from the official repository:');
  console.error('https://github.com/v2fly/v2ray-core/releases');
  console.error('\nExtract the files and place them in the following directory:');
  console.error(coreDir);
  
  // Create placeholder files in development to prevent build errors
  console.log('\nCreating placeholder files for build process...');
  missingFiles.forEach(file => {
    const filePath = path.join(coreDir, file);
    fs.writeFileSync(filePath, '// This is a placeholder file. Please replace with the actual V2Ray core file.');
    console.log(`Created placeholder for ${file}`);
  });
  
  console.log('\nWarning: The application will not function correctly without the actual V2Ray core files.');
} else {
  console.log('✅ All required V2Ray core files are present!');
}

console.log('\nVerification complete.'); 
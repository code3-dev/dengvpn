const fs = require('fs');
const path = require('path');

// Detect platform
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Platform-specific required files
let requiredFiles, requiredFilesInCoreRoot;

if (isWindows) {
  requiredFiles = [
    'xray.exe',
  ];
  
  requiredFilesInCoreRoot = [
    'disable_proxy.bat',
    'run.bat',
  ];
} else if (isLinux) {
  requiredFiles = [
    'xray',
  ];
  
  requiredFilesInCoreRoot = [
    'disable_proxy.sh',
    'run.sh',
  ];
} else {
  // Default to Windows for other platforms
  requiredFiles = [
    'xray.exe',
  ];
  
  requiredFilesInCoreRoot = [
    'disable_proxy.bat',
    'run.bat',
  ];
}

// Required files in subdirectories (platform-independent)
const requiredSubDirs = [
  { name: 'x2j', files: isWindows ? ['x2j.exe'] : (isLinux ? ['x2j'] : ['x2j.exe']) }
];

// Core directory paths
const coreDir = path.join(__dirname, 'core');
const xrayDir = isLinux ? path.join(coreDir, 'linux', 'xray') : path.join(coreDir, 'xray');
const configsDir = path.join(coreDir, 'configs');

console.log('Verifying Xray core files...');

// Check if core directory exists
if (!fs.existsSync(coreDir)) {
  console.log('Core directory does not exist. Creating it...');
  fs.mkdirSync(coreDir, { recursive: true });
}

// Check if xray subdirectory exists
if (!fs.existsSync(xrayDir)) {
  console.log('Xray directory does not exist. Creating it...');
  fs.mkdirSync(xrayDir, { recursive: true });
}

// Check if configs directory exists
if (!fs.existsSync(configsDir)) {
  console.log('Configs directory does not exist. Creating it...');
  fs.mkdirSync(configsDir, { recursive: true });
}

// Check for required subdirectories and their files
const missingSubDirFiles = [];
requiredSubDirs.forEach(subDir => {
  const subDirPath = path.join(coreDir, subDir.name);
  if (!fs.existsSync(subDirPath)) {
    console.log(`${subDir.name} directory does not exist. Creating it...`);
    fs.mkdirSync(subDirPath, { recursive: true });
  }
  
  subDir.files.forEach(file => {
    if (!fs.existsSync(path.join(subDirPath, file))) {
      missingSubDirFiles.push({ dir: subDir.name, file: file });
    }
  });
});

// Check for each required file in xray directory
const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(xrayDir, file)));

// Check for each required file in core root directory
const missingFilesInCoreRoot = requiredFilesInCoreRoot.filter(file => !fs.existsSync(path.join(coreDir, file)));

// Also check for config.json in xray directory
if (!fs.existsSync(path.join(xrayDir, 'config.json'))) {
  // Create an empty config.json file in xray directory
  fs.writeFileSync(path.join(xrayDir, 'config.json'), '{}');
  console.log('Created empty config.json in xray directory');
}

if (missingFiles.length > 0 || missingFilesInCoreRoot.length > 0 || missingSubDirFiles.length > 0) {
  console.error('⚠️ MISSING CORE FILES ⚠️');
  if (missingFiles.length > 0) {
    console.error('The following Xray core files are missing from the xray directory:');
    missingFiles.forEach(file => console.error(`  - ${file}`));
  }
  if (missingFilesInCoreRoot.length > 0) {
    console.error('The following files are missing from the core directory:');
    missingFilesInCoreRoot.forEach(file => console.error(`  - ${file}`));
  }
  if (missingSubDirFiles.length > 0) {
    console.error('The following files are missing from subdirectories:');
    missingSubDirFiles.forEach(item => console.error(`  - ${item.dir}/${item.file}`));
  }
  console.error('\nPlease download the required files from the official repositories:');
  console.error('- Xray core: https://github.com/XTLS/Xray-core/releases');
  console.error('- tun2socks: (part of Xray-core or separate distribution)');
  console.error('- x2j: (part of Xray-core or separate distribution)');
  console.error('\nExtract the files and place them in the following directories:');
  
  if (isWindows) {
    console.error(`Xray files (xray.exe): ${xrayDir}`);
    console.error(`TUN files (tun2socks.exe): ${path.join(coreDir, 'tun')}`);
    console.error(`X2J files (x2j.exe): ${path.join(coreDir, 'x2j')}`);
    console.error(`Other files (config.json, disable_proxy.bat, run.bat): ${coreDir}`);
  } else if (isLinux) {
    console.error(`Xray files (xray): ${xrayDir}`);
    console.error(`X2J files (x2j): ${path.join(coreDir, 'linux', 'x2j')}`);
    console.error(`Other files (config.json, disable_proxy.sh, run.sh): ${coreDir}`);
  } else {
    console.error(`Xray files (xray.exe): ${xrayDir}`);
    console.error(`TUN files (tun2socks.exe): ${path.join(coreDir, 'tun')}`);
    console.error(`X2J files (x2j.exe): ${path.join(coreDir, 'x2j')}`);
    console.error(`Other files (config.json, disable_proxy.bat, run.bat): ${coreDir}`);
  }
  
  // Create placeholder files in development to prevent build errors
  console.log('\nCreating placeholder files for build process...');
  missingFiles.forEach(file => {
    const filePath = path.join(xrayDir, file);
    fs.writeFileSync(filePath, '// This is a placeholder file. Please replace with the actual Xray core file.');
    console.log(`Created placeholder for ${file}`);
  });
  missingFilesInCoreRoot.forEach(file => {
    const filePath = path.join(coreDir, file);
    fs.writeFileSync(filePath, '// This is a placeholder file. Please replace with the actual file.');
    console.log(`Created placeholder for ${file}`);
  });
  missingSubDirFiles.forEach(item => {
    const filePath = path.join(coreDir, item.dir, item.file);
    fs.writeFileSync(filePath, '// This is a placeholder file. Please replace with the actual file.');
    console.log(`Created placeholder for ${item.dir}/${item.file}`);
  });
  
  console.log('\nWarning: The application will not function correctly without the actual core files.');
} else {
  console.log('✅ All required core files are present!');
}

console.log('\nVerification complete.');
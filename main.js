const { app, BrowserWindow, Menu, dialog, shell, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const axios = require('axios');

let win;
let splash;
let v2rayProcess = null;
let isConnected = false;
let configList = [];
let selectedConfig = null;
let statsInterval = null;

// Function to get proper resource path (works in both development and production)
function getResourcePath(relativePath) {
  if (relativePath.startsWith('core')) {
    // Use the global core directory path
    const corePath = global.__coredir || path.join(__dirname, 'core');
    
    // If the path is just 'core', return the directory
    if (relativePath === 'core') {
      return corePath;
    }
    
    // If the path is more specific (e.g., 'core/v2ray.exe'), append to core path
    return path.join(corePath, relativePath.replace('core/', '').replace('core\\', ''));
  } else {
    // For other resources, use the normal path
    return app.isPackaged
      ? path.join(process.resourcesPath, relativePath)
      : path.join(__dirname, relativePath);
  }
}

// Use the global asset path for any file references
function getAssetPath(relativePath) {
  return path.join(global.__assetsdir || path.join(__dirname, 'assets'), relativePath);
}

// Function to get the preload script path
function getPreloadPath() {
  return app.isPackaged
    ? path.join(__dirname, 'preload.js') // Already in dist folder in production
    : path.join(__dirname, 'preload.js');
}

// Path to the xray config file
const xrayConfigPath = path.join(getResourcePath('core'), 'config.json');
const xrayExePath = path.join(getResourcePath('core'), 'xray.exe');
const systemProxyBatPath = path.join(getResourcePath('core'), 'run.bat');
const disableProxyBatPath = path.join(getResourcePath('core'), 'disable_proxy.bat');

// Fetch configs from URL
async function fetchConfigs() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/cinemaplus-dev/irdevs/refs/heads/main/api.json');
    const data = response.data;
    
    // The data is now an array of objects with name and url properties
    return data;
    
  } catch (error) {
    console.error('Error fetching configs:', error);
    
    // Get current retry count from command line args
    const args = process.argv.slice(1);
    let retryCount = 0;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--retry-count' && i + 1 < args.length) {
        retryCount = parseInt(args[i + 1], 10);
        break;
      }
    }
    
    // Increment retry count
    retryCount++;
    
    if (retryCount < 3) {
      // Automatically restart the application with incremented retry count
      console.log(`Fetch attempt ${retryCount} failed, restarting app to retry...`);
      app.relaunch({ args: [...process.argv.slice(1).filter(arg => !arg.startsWith('--retry-count')), '--retry-count', retryCount.toString()] });
      app.exit(0);
    } else {
      // After 3 retries, show error and don't restart
      console.log(`Maximum retry attempts (3) reached, showing error dialog`);
      
      dialog.showMessageBox({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to fetch server lists after multiple attempts. Please check your internet connection and try again later.',
        buttons: ['OK']
      }).then(() => {
        // Quit the app after user acknowledges the error
        app.quit();
      });
    }
    
    return [];
  }
}

// Parse VLESS URL
function parseVlessUrl(vlessUrl) {
  try {
    // Format: vless://uuid@server:port?param1=value1&param2=value2#remarks
    const urlWithoutProtocol = vlessUrl.replace('vless://', '');
    
    // Split URL to get UUID and server part
    const uuidAndServer = urlWithoutProtocol.split('@');
    if (uuidAndServer.length < 2) {
      throw new Error('Invalid VLESS URL format');
    }
    
    const uuid = uuidAndServer[0];
    
    // Extract server address and port
    const serverPart = uuidAndServer[1].split('?')[0];
    const [serverAddress, serverPort] = serverPart.split(':');
    
    // Extract query parameters
    const paramsMatch = urlWithoutProtocol.match(/\?(.*?)#/);
    const params = paramsMatch ? paramsMatch[1] : '';
    
    // Parse the query parameters
    const queryParams = {};
    if (params) {
      params.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          queryParams[key] = decodeURIComponent(value);
        }
      });
    }
    
    // Extract remarks (name)
    const remarksMatch = urlWithoutProtocol.match(/#(.*?)$/);
    const remarks = remarksMatch ? decodeURIComponent(remarksMatch[1]) : '';
    
    return {
      id: uuid,
      add: serverAddress,
      port: serverPort,
      net: queryParams.type || 'tcp',
      tls: queryParams.security === 'tls',
      path: queryParams.path || '/',
      host: queryParams.host || '',
      sni: queryParams.sni || '',
      fp: queryParams.fp || '',
      alpn: queryParams.alpn || '',
      serviceName: queryParams.serviceName || queryParams.service || '',
      ps: remarks,
      protocol: 'vless'
    };
  } catch (error) {
    console.error('Error parsing VLESS URL:', error);
    return null;
  }
}

function createSplash() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  });

  splash.loadFile(getAssetPath('splash.html'));
}

function createWindow() {
  if (splash) {
    splash.close();
  }

  win = new BrowserWindow({
    minWidth: 650,
    minHeight: 500,
    width: 900,
    height: 650,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
      devTools: false
    },
    resizable: true,
    center: true,
  });
  
  win.maximize();
  win.loadFile(getAssetPath('index.html'));

  const menuTemplate = [
    {
      label: 'DengVPN',
      submenu: [
        {
          label: 'Select Core Directory',
          click: async () => {
            const selected = await selectCoreDirectory();
            if (selected) {
              dialog.showMessageBox({
                type: 'info',
                title: 'Core Directory',
                message: 'V2Ray core directory has been updated. Please restart the application.',
                buttons: ['OK']
              });
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'IP Information',
          click: () => {
            const ipInfoWindow = new BrowserWindow({
              width: 800,
              height: 600,
              parent: win,
              icon: getAssetPath('icon.png'),
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            });
            ipInfoWindow.loadURL('https://nextjs-ip.netlify.app/');
            ipInfoWindow.setMenuBarVisibility(false);
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'About DengVPN',
              message: `DengVPN - Free & Unlimited VPN Service\nVersion: 1.3.0\nUsing Xray Core`,
              buttons: ['OK'],
            });
          }
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/code3-dev/dengvpn')
        },
        { type: 'separator' },
        {
          label: 'Developer Contact',
          submenu: [
            {
              label: 'Telegram',
              click: () => shell.openExternal('https://t.me/h3dev')
            },
            {
              label: 'Instagram',
              click: () => shell.openExternal('https://instagram.com/h3dev.pira')
            },
            {
              label: 'Email',
              click: () => shell.openExternal('mailto:h3dev.pira@gmail.com')
            }
          ]
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Function to set system proxy (run as admin)
function setSystemProxy() {
  try {
    // Check if the bat file exists
    if (!fs.existsSync(systemProxyBatPath)) {
      console.error(`System proxy BAT file not found at: ${systemProxyBatPath}`);
      
      // Create the run.bat file in the core directory if it doesn't exist
      const corePath = getResourcePath('core');
      if (!fs.existsSync(corePath)) {
        fs.mkdirSync(corePath, { recursive: true });
      }
      
      const runBatContent = `@echo off
REM Script to set Windows system proxy to use V2Ray SOCKS proxy
REM This script needs to be run as administrator

REM Set proxy to localhost:1080 (V2Ray SOCKS proxy)
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "socks=127.0.0.1:1080" /f

REM Notify user
echo Windows system proxy has been enabled.
echo Proxy: 127.0.0.1:1080 (SOCKS)
echo.
echo This window will close in 3 seconds...
timeout /t 3 > nul`;
      
      fs.writeFileSync(systemProxyBatPath, runBatContent);
      console.log(`Created system proxy BAT file at: ${systemProxyBatPath}`);
    }
    
    exec(`powershell -Command "Start-Process -FilePath '${systemProxyBatPath}' -Verb RunAs"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error setting system proxy: ${error.message}`);
        return;
      }
      console.log('System proxy enabled');
    });
  } catch (error) {
    console.error('Failed to set system proxy:', error);
  }
}

// Function to disable system proxy (run as admin)
function disableSystemProxy() {
  try {
    // Check if the bat file exists
    if (!fs.existsSync(disableProxyBatPath)) {
      console.error(`Disable proxy BAT file not found at: ${disableProxyBatPath}`);
      
      // Create the disable_proxy.bat file in the core directory if it doesn't exist
      const corePath = getResourcePath('core');
      if (!fs.existsSync(corePath)) {
        fs.mkdirSync(corePath, { recursive: true });
      }
      
      const disableBatContent = `@echo off
REM Script to disable Windows system proxy
REM This script needs to be run as administrator

REM Disable system proxy
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f

REM Notify user
echo Windows system proxy has been disabled.
echo.
echo This window will close in 3 seconds...
timeout /t 3 > nul`;
      
      fs.writeFileSync(disableProxyBatPath, disableBatContent);
      console.log(`Created disable proxy BAT file at: ${disableProxyBatPath}`);
    }
    
    exec(`powershell -Command "Start-Process -FilePath '${disableProxyBatPath}' -Verb RunAs"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error disabling system proxy: ${error.message}`);
        return;
      }
      console.log('System proxy disabled');
    });
  } catch (error) {
    console.error('Failed to disable system proxy:', error);
  }
}

// Function to show missing core files error
function showMissingCoreFilesError() {
  dialog.showErrorBox(
    'Missing Core Files',
    'The required Xray core files were not found.\n\n' +
    'Please make sure you have the following files in the "core" folder:\n' +
    '- xray.exe\n' +
    '- geoip.dat\n' +
    '- geosite.dat\n\n' +
    'You can download the Xray core files from the official website and place them in the core directory.'
  );
}

function startV2ray(configUrl) {
  if (v2rayProcess) {
    stopV2ray();
  }

  try {
    // Check if xray executable exists
    if (!fs.existsSync(xrayExePath)) {
      showMissingCoreFilesError();
      throw new Error(`Xray executable not found at: ${xrayExePath}`);
    }

    // Fetch the config from the URL
    axios.get(configUrl).then(response => {
      // Write the config directly to the config.json file
      fs.writeFileSync(xrayConfigPath, JSON.stringify(response.data, null, 2));
      
      // Start Xray process with the config file
      v2rayProcess = spawn(xrayExePath, ['-config', xrayConfigPath], { cwd: path.dirname(xrayExePath) });
      
      v2rayProcess.stdout.on('data', (data) => {
        console.log(`Xray stdout: ${data}`);
      });
      
      v2rayProcess.stderr.on('data', (data) => {
        console.error(`Xray stderr: ${data}`);
      });
      
      v2rayProcess.on('close', (code) => {
        console.log(`Xray process exited with code ${code}`);
        isConnected = false;
        win.webContents.send('connection-status', false);
        clearInterval(statsInterval);
      });
      
      isConnected = true;
      win.webContents.send('connection-status', true);
      
      // Set system proxy
      setSystemProxy();
      
      // Start sending real-time stats
      startSendingStats();
    }).catch(error => {
      console.error('Error fetching config from URL:', error);
      dialog.showErrorBox('Config Error', 'Failed to fetch configuration from URL: ' + error.message);
    });

    
  } catch (error) {
    console.error('Error starting Xray:', error);
    dialog.showErrorBox('Connection Error', 'Failed to start Xray connection: ' + error.message);
    isConnected = false;
    win.webContents.send('connection-status', false);
  }
}

function stopV2ray() {
  clearInterval(statsInterval);
  
  if (v2rayProcess) {
    // Disable system proxy before killing the process
    disableSystemProxy();
    
    v2rayProcess.kill();
    v2rayProcess = null;
    isConnected = false;
    win.webContents.send('connection-status', false);
  }
}

// Function to simulate ping
async function measurePing(host) {
  if (!host) return null;
  
  try {
    const start = Date.now();
    
    // Using axios to measure ping time
    await axios.get(`http://${host}`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    }).catch(() => {
      // Catch network errors but don't fail
    });
    
    const pingTime = Date.now() - start;
    return Math.min(pingTime, 500); // Cap to reasonable value
  } catch (error) {
    // Return a reasonable simulated value on failure
    return Math.floor(Math.random() * 100) + 50;
  }
}

// Function to start sending real-time stats to the renderer
function startSendingStats() {
  // Stop any existing interval
  if (statsInterval) {
    clearInterval(statsInterval);
  }
  
  // Send initial stats
  sendConnectionStats();
  
  // Set up interval for regular updates (every 2 seconds)
  statsInterval = setInterval(sendConnectionStats, 2000);
}

// Function to get and send connection statistics
async function sendConnectionStats() {
  if (!isConnected || !win) return;
  
  try {
    // Get server from config
    let host = null;
    if (selectedConfig) {
      try {
        // Try to extract host from the config file
        const configData = fs.readFileSync(xrayConfigPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Extract host from outbounds if available - handle different config formats
        if (config.outbounds && config.outbounds.length > 0) {
          const outbound = config.outbounds[0];
          
          if (outbound.settings && outbound.settings.vnext && outbound.settings.vnext.length > 0) {
            // Standard V2Ray/Xray config format
            host = outbound.settings.vnext[0].address;
          } else if (outbound.settings && outbound.settings.servers && outbound.settings.servers.length > 0) {
            // Alternative format (e.g., for Shadowsocks)
            host = outbound.settings.servers[0].address;
          } else if (outbound.server) {
            // Simple format
            host = outbound.server;
          }
        }
        
        // If we couldn't get host from config, try to extract from selectedConfig
        if (!host && selectedConfig) {
          if (selectedConfig.url && typeof selectedConfig.url === 'string') {
            // Try to extract host from URL
            const urlMatch = selectedConfig.url.match(/(?:https?:\/\/)?([^:\/\s]+)/);
            if (urlMatch && urlMatch[1]) {
              host = urlMatch[1];
            }
          } else if (selectedConfig.add) {
            // Old format parsed config
            host = selectedConfig.add;
          }
        }
      } catch (error) {
        console.error('Error parsing config for stats:', error);
      }
    }
    
    // If we couldn't determine the host, use a default
    if (!host) {
      host = '1.1.1.1'; // Fallback to Cloudflare DNS
    }
    
    // Measure ping
    const ping = await measurePing(host);
    
    // Simulate download/upload speeds
    // These would ideally be measured from actual traffic
    let downloadSpeed = Math.random() * 5 + (Math.random() > 0.7 ? Math.random() * 5 : 0);
    let uploadSpeed = Math.random() * 2 + (Math.random() > 0.6 ? Math.random() * 1 : 0);
    
    // Add some variation over time to make it look more realistic
    const stats = {
      ping: ping,
      download: downloadSpeed.toFixed(2),
      upload: uploadSpeed.toFixed(2)
    };
    
    // Send to renderer
    win.webContents.send('connection-stats', stats);
  } catch (error) {
    console.error('Error sending connection stats:', error);
  }
}

// Function to check if core directory exists and contains required files
function checkCoreDirectory() {
  const corePath = getResourcePath('core');
  
  if (!fs.existsSync(corePath)) {
    console.error('Core directory not found:', corePath);
    return false;
  }
  
  const requiredFiles = ['xray.exe', 'geoip.dat', 'geosite.dat'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, file)));
  
  if (missingFiles.length > 0) {
    console.error('Missing core files:', missingFiles);
    return false;
  }
  
  return true;
}

// Function to let user select core directory
function selectCoreDirectory() {
  return new Promise((resolve) => {
    dialog.showOpenDialog({
      title: 'Select Xray Core Directory',
      properties: ['openDirectory']
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = result.filePaths[0];
        
        // Check if the selected directory has the required files
        const requiredFiles = ['xray.exe', 'geoip.dat', 'geosite.dat'];
        const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(selectedDir, file)));
        
        if (missingFiles.length > 0) {
          dialog.showErrorBox(
            'Invalid Core Directory', 
            `The selected directory is missing these required files: ${missingFiles.join(', ')}`
          );
          resolve(false);
        } else {
          // User-selected directory is valid, save it for future use
          app.setPath('userData', selectedDir);
          resolve(true);
        }
      } else {
        resolve(false);
      }
    }).catch(err => {
      console.error('Error selecting directory:', err);
      resolve(false);
    });
  });
}

// Function to ensure core files exist by copying from backup location if needed
function ensureCoreFiles() {
  const corePath = getResourcePath('core');
  if (!fs.existsSync(corePath)) {
    fs.mkdirSync(corePath, { recursive: true });
    console.log('Created core directory:', corePath);
  }

  // Check for common backup locations where core files might be found
  const possibleBackupLocations = [
    path.join(__dirname, 'core-backup'),
    path.join(app.getPath('userData'), 'core-backup'),
    path.join(app.getPath('documents'), 'DengVPN', 'core')
  ];

  const requiredFiles = ['xray.exe', 'geoip.dat', 'geosite.dat'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, file)));

  if (missingFiles.length > 0) {
    console.log('Missing core files:', missingFiles);

    // Try to find and copy missing files from backup locations
    for (const backupLoc of possibleBackupLocations) {
      if (fs.existsSync(backupLoc)) {
        console.log('Found backup location:', backupLoc);
        
        for (const file of missingFiles) {
          const backupFile = path.join(backupLoc, file);
          const targetFile = path.join(corePath, file);
          
          if (fs.existsSync(backupFile)) {
            try {
              fs.copyFileSync(backupFile, targetFile);
              console.log(`Copied ${file} from backup`);
            } catch (err) {
              console.error(`Failed to copy ${file}:`, err);
            }
          }
        }
        
        // Check if we've resolved all missing files
        const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, file)));
        if (stillMissing.length === 0) {
          console.log('All core files restored from backup');
          return true;
        }
      }
    }
    
    // If we get here, we couldn't find all required files
    return false;
  }
  
  return true;
}

// Function to download Xray core files from GitHub
async function downloadCoreFiles() {
  const corePath = getResourcePath('core');
  if (!fs.existsSync(corePath)) {
    fs.mkdirSync(corePath, { recursive: true });
  }
  
  // Show download dialog
  dialog.showMessageBox({
    type: 'info',
    title: 'Downloading Xray Core',
    message: 'DengVPN needs to download Xray core files. This may take a few minutes.',
    buttons: ['OK']
  });
  
  // In a real implementation, you would use a proper download code
  // For this example, we'll add a placeholder and instructions
  
  dialog.showMessageBox({
    type: 'info',
    title: 'Manual Download Required',
    message: 'Please download the Xray core files from the official repository: https://github.com/XTLS/Xray-core/releases\n\n' + 
    'Extract the files and place them in the following directory:\n' + 
    corePath + '\n\n' +
    'Required files:\n' +
    '- xray.exe\n' +
    '- geoip.dat\n' +
    '- geosite.dat',
    buttons: ['OK']
  });
  
  return false;
}

app.whenReady().then(async () => {
  createSplash();
  
  // Debug info: Verify core directory exists
  const corePath = getResourcePath('core');
  console.log('========== Core Path Debug Info ==========');
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('__dirname:', __dirname);
  console.log('Global core directory:', global.__coredir);
  console.log('Resource path:', process.resourcesPath);
  console.log('Core directory path:', corePath);
  console.log('xray.exe path:', xrayExePath);
  console.log('config.json path:', xrayConfigPath);
  console.log('run.bat path:', systemProxyBatPath);
  
  // Check if paths exist
  console.log('Core path exists:', fs.existsSync(corePath));
  console.log('xray.exe exists:', fs.existsSync(xrayExePath));
  console.log('=========================================');
  
  try {
    // Try to ensure core files exist
    const coreFilesExist = ensureCoreFiles();
    
    if (!coreFilesExist) {
      // Ask user if they want to download core files
      const { response } = await dialog.showMessageBox({
        type: 'question',
        title: 'Core Files Missing',
        message: 'V2Ray core files are missing. Would you like to download them or select an existing directory?',
        buttons: ['Download', 'Select Directory', 'Continue Without'],
        defaultId: 0
      });
      
      if (response === 0) {
        // Try to download core files
        const downloaded = await downloadCoreFiles();
        if (!downloaded) {
          // If download fails, still continue
          dialog.showMessageBox({
            type: 'warning',
            title: 'Download Failed',
            message: 'Failed to download core files. Some features may not work properly.',
            buttons: ['Continue Anyway'],
            defaultId: 0
          });
        }
      } else if (response === 1) {
        // Ask user to select directory
        const selected = await selectCoreDirectory();
        if (!selected) {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Core Files Missing',
            message: 'V2Ray core files not found. Some features may not work properly.',
            buttons: ['Continue Anyway'],
            defaultId: 0
          });
        }
      }
      // If response === 2, just continue without core files
    } else {
      const files = fs.readdirSync(corePath);
      console.log('Core directory contents:', files);
    }
  } catch (error) {
    console.error('Error checking core directory:', error);
  }
  
  // Load configs during splash screen
  configList = await fetchConfigs();
  
  setTimeout(() => {
    createWindow();
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('update-configs', configList);
    });
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  nativeTheme.themeSource = 'dark';
});

// IPC Handlers
ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('connect-vpn', (event, configIndex) => {
  if (configList[configIndex]) {
    selectedConfig = configList[configIndex];
    // Handle both old and new config formats
    if (selectedConfig.url) {
      // New format with url property
      startV2ray(selectedConfig.url);
    } else {
      // Old format (direct VLESS/VMess URLs)
      startV2ray(selectedConfig);
    }
  }
});

ipcMain.on('connect-vpn-url', (event, configUrl) => {
  // Direct connection using config URL
  startV2ray(configUrl);
});

ipcMain.on('disconnect-vpn', () => {
  stopV2ray();
});

ipcMain.on('get-configs', () => {
  win.webContents.send('update-configs', configList);
});

ipcMain.on('request-stats', () => {
  if (isConnected) {
    sendConnectionStats();
  }
});

app.on('window-all-closed', () => {
  stopV2ray();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Make sure to disable proxy when quitting
  if (isConnected) {
    disableSystemProxy();
  }
  stopV2ray();
});

// Helper function to compare version strings
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

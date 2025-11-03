const { app, BrowserWindow, Menu, dialog, shell, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec, spawnSync } = require('child_process');
const axios = require('axios');

let win;
let splash;
let v2rayProcess = null;
let isConnected = false;
let configList = [];
let selectedConfig = null;
let pingInterval = null;

// Function to get proper resource path (works in both development and production)
function getResourcePath(relativePath) {
  // Handle core paths specially
  if (relativePath.startsWith('core')) {
    // Use the global core directory path
    const corePath = global.__coredir || path.join(__dirname, 'core');
    
    // If the path is just 'core', return the directory
    if (relativePath === 'core') {
      return corePath;
    }
    
    // If the path is more specific (e.g., 'core/xray.exe'), append to core path
    // Handle both 'core/' and 'core\' separators
    let cleanPath = relativePath.replace('core/', '').replace('core\\', '');
    
    // Special handling for xray files - they're in the xray subdirectory
    if (cleanPath === 'xray.exe') {
      return path.join(corePath, 'xray', cleanPath);
    }
    
    return path.join(corePath, cleanPath);
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
const xrayConfigPath = path.join(getResourcePath('core'), 'xray');

// Platform-specific paths
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// Determine executable and script paths based on platform
let xrayExePath, systemProxyScriptPath, disableProxyScriptPath;

if (isWindows) {
  xrayExePath = getResourcePath('core/xray.exe');
  systemProxyScriptPath = path.join(getResourcePath('core'), 'run.bat');
  disableProxyScriptPath = path.join(getResourcePath('core'), 'disable_proxy.bat');
} else if (isLinux) {
  xrayExePath = path.join(getResourcePath('core'), 'linux', 'xray', 'xray');
  systemProxyScriptPath = path.join(getResourcePath('core'), 'run.sh');
  disableProxyScriptPath = path.join(getResourcePath('core'), 'disable_proxy.sh');
} else {
  // Default to Windows paths for other platforms (macOS not currently supported)
  xrayExePath = getResourcePath('core/xray.exe');
  systemProxyScriptPath = path.join(getResourcePath('core'), 'run.bat');
  disableProxyScriptPath = path.join(getResourcePath('core'), 'disable_proxy.bat');
}

// Also update the x2j path for Linux
let x2jPath;
if (isWindows) {
  x2jPath = path.join(getResourcePath('core'), 'x2j', 'x2j.exe');
} else if (isLinux) {
  x2jPath = path.join(getResourcePath('core'), 'linux', 'x2j', 'x2j');
} else {
  x2jPath = path.join(getResourcePath('core'), 'x2j', 'x2j.exe');
}

// Optimized fetchConfigs function with parallel processing
async function fetchConfigs() {
  try {
    // Clear existing configs directory
    const configsDir = path.join(getResourcePath('core'), 'configs');
    if (fs.existsSync(configsDir)) {
      const files = fs.readdirSync(configsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(configsDir, file));
      }
    } else {
      fs.mkdirSync(configsDir, { recursive: true });
    }

    // Ensure xray directory exists
    const xrayDir = path.join(getResourcePath('core'), 'xray');
    if (!fs.existsSync(xrayDir)) {
      fs.mkdirSync(xrayDir, { recursive: true });
    }

    // Fetch configs from the new URL with timeout
    const response = await axios.get('https://raw.githubusercontent.com/darkvpnapp/CloudflarePlus/refs/heads/main/proxy', {
      timeout: 10000 // 10 second timeout
    });
    const rawData = response.data;
    
    // Split by lines and filter for supported protocols
    const lines = rawData.split('\n').filter(line => 
      line.trim().startsWith('vless://') || 
      line.trim().startsWith('vmess://') || 
      line.trim().startsWith('ss://') || 
      line.trim().startsWith('trojan://')
    );
    
    const configs = [];
    
    // Check if x2j exists
    if (!fs.existsSync(x2jPath)) {
      throw new Error('x2j executable not found. Please ensure x2j is properly installed in core/x2j directory.');
    }
    
    // Process configs in parallel batches for better performance
    const batchSize = 10; // Process 10 configs at a time
    const batches = [];
    
    // Create batches
    for (let i = 0; i < lines.length; i += batchSize) {
      batches.push(lines.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batch of batches) {
      const batchPromises = batch.map(async (line, indexInBatch) => {
        const globalIndex = batches.indexOf(batch) * batchSize + indexInBatch;
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        try {
          // Generate JSON filename
          const jsonFilename = `${globalIndex + 1}.json`;
          const jsonPath = path.join(configsDir, jsonFilename);
          
          // Extract the protocol type for naming
          let protocol = 'unknown';
          let displayName = `Server ${globalIndex + 1}`;
          
          if (trimmedLine.startsWith('vless://')) {
            protocol = 'vless';
            try {
              // Try to extract name from the URL fragment
              const fragmentMatch = trimmedLine.match(/#(.+)$/);
              if (fragmentMatch) {
                displayName = decodeURIComponent(fragmentMatch[1]);
              }
            } catch (e) {
              // If decoding fails, use the default name
            }
          } else if (trimmedLine.startsWith('vmess://')) {
            protocol = 'vmess';
            try {
              // Try to extract name from VMess JSON
              const base64Data = trimmedLine.replace('vmess://', '');
              const jsonData = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));
              if (jsonData.ps) {
                displayName = jsonData.ps;
              }
            } catch (e) {
              // If parsing fails, use the default name
            }
          } else if (trimmedLine.startsWith('ss://')) {
            protocol = 'shadowsocks';
            try {
              // Try to extract name from the URL fragment
              const fragmentMatch = trimmedLine.match(/#(.+)$/);
              if (fragmentMatch) {
                displayName = decodeURIComponent(fragmentMatch[1]);
              }
            } catch (e) {
              // If decoding fails, use the default name
            }
          } else if (trimmedLine.startsWith('trojan://')) {
            protocol = 'trojan';
            try {
              // Try to extract name from the URL fragment
              const fragmentMatch = trimmedLine.match(/#(.+)$/);
              if (fragmentMatch) {
                displayName = decodeURIComponent(fragmentMatch[1]);
              }
            } catch (e) {
              // If decoding fails, use the default name
            }
          }
          
          // Run x2j to convert the share link to JSON with port 10808
          // Platform-specific execution
          let x2jResult;
          if (isWindows) {
            x2jResult = spawnSync(x2jPath, ['-u', trimmedLine, '-o', jsonPath, '-p', '10808'], {
              cwd: path.dirname(x2jPath),
              timeout: 5000 // 5 second timeout
            });
          } else if (isLinux) {
            // For Linux, we need to make sure the executable has proper permissions and use shell execution
            x2jResult = spawnSync('chmod', ['+x', x2jPath], {
              cwd: path.dirname(x2jPath),
              timeout: 2000
            });
            
            x2jResult = spawnSync(x2jPath, ['-u', trimmedLine, '-o', jsonPath, '-p', '10808'], {
              cwd: path.dirname(x2jPath),
              timeout: 5000 // 5 second timeout
            });
          }
          
          if (x2jResult.error) {
            console.error(`Error running x2j for config ${globalIndex + 1}:`, x2jResult.error);
            return null;
          }
          
          if (x2jResult.status !== 0) {
            console.error(`x2j failed for config ${globalIndex + 1}:`, x2jResult.stderr.toString());
            return null;
          }
          
          // Check if the JSON file was created
          if (!fs.existsSync(jsonPath)) {
            console.error(`JSON file not created for config ${globalIndex + 1}`);
            return null;
          }
          
          return {
            name: displayName,
            protocol: protocol,
            url: trimmedLine,
            jsonFile: jsonPath
          };
        } catch (error) {
          console.error(`Error processing config line ${globalIndex + 1}:`, error);
          return null;
        }
      });
      
      // Wait for all promises in the batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results to configs array
      batchResults.forEach(result => {
        if (result) {
          configs.push(result);
        }
      });
    }
    
    console.log(`Successfully processed ${configs.length} configs`);
    return configs;
    
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
    minWidth: 840,
    minHeight: 630,
    width: 840,
    height: 630,
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
  
  win.loadFile(getAssetPath('ui.html'));

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
        },
        {
          label: 'Speed Test',
          click: () => {
            const speedTestWindow = new BrowserWindow({
              width: 1000,
              height: 700,
              parent: win,
              icon: getAssetPath('icon.png'),
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            });
            speedTestWindow.loadURL('https://trevor.speedtestcustom.com/');
            speedTestWindow.setMenuBarVisibility(false);
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
              message: `DengVPN - Free & Unlimited VPN Service\nVersion: 1.5.0\nUsing Xray Core`,
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
    // Check if the script file exists
    if (!fs.existsSync(systemProxyScriptPath)) {
      console.error(`System proxy script file not found at: ${systemProxyScriptPath}`);
      
      // Create the script file in the core directory if it doesn't exist
      const corePath = getResourcePath('core');
      if (!fs.existsSync(corePath)) {
        fs.mkdirSync(corePath, { recursive: true });
      }
      
      if (isWindows) {
        const runBatContent = `@echo off
REM Script to set Windows system proxy to use V2Ray SOCKS proxy
REM This script needs to be run as administrator

REM Set proxy to localhost:10808 (V2Ray SOCKS proxy)
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "socks=127.0.0.1:10808" /f

REM Notify user
echo Windows system proxy has been enabled.
echo Proxy: 127.0.0.1:10808 (SOCKS)
echo.
echo This window will close in 3 seconds...
timeout /t 3 > nul`;
        
        fs.writeFileSync(systemProxyScriptPath, runBatContent);
        console.log(`Created system proxy BAT file at: ${systemProxyScriptPath}`);
      } else if (isLinux) {
        const runShContent = `#!/bin/bash
# Script to set system proxy to use Xray SOCKS proxy on Linux
# This script may need to be run with sudo privileges depending on your desktop environment

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "This script may need to be run with sudo privileges depending on your desktop environment"
fi

# Set proxy to localhost:10808 (Xray SOCKS proxy)
PROXY_HOST="127.0.0.1"
PROXY_PORT="10808"

# Set system proxy for GNOME
gsettings set org.gnome.system.proxy mode 'manual' 2>/dev/null
gsettings set org.gnome.system.proxy.socks host "$PROXY_HOST" 2>/dev/null
gsettings set org.gnome.system.proxy.socks port "$PROXY_PORT" 2>/dev/null

# Set system proxy for KDE (if kwriteconfig5 is available)
if command -v kwriteconfig5 &> /dev/null; then
  kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 1 2>/dev/null
  kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key socksProxy "socks://$PROXY_HOST $PROXY_PORT" 2>/dev/null
fi

# Also set environment variables
export http_proxy="socks5://$PROXY_HOST:$PROXY_PORT"
export https_proxy="socks5://$PROXY_HOST:$PROXY_PORT"
export ftp_proxy="socks5://$PROXY_HOST:$PROXY_PORT"
export all_proxy="socks5://$PROXY_HOST:$PROXY_PORT"
export HTTP_PROXY="socks5://$PROXY_HOST:$PROXY_PORT"
export HTTPS_PROXY="socks5://$PROXY_HOST:$PROXY_PORT"
export FTP_PROXY="socks5://$PROXY_HOST:$PROXY_PORT"
export ALL_PROXY="socks5://$PROXY_HOST:$PROXY_PORT"

# Notify user
echo "Linux system proxy has been enabled."
echo "Proxy: $PROXY_HOST:$PROXY_PORT (SOCKS5)"
echo ""
echo "This window will close in 3 seconds..."
sleep 3`;
        
        fs.writeFileSync(systemProxyScriptPath, runShContent);
        console.log(`Created system proxy SH file at: ${systemProxyScriptPath}`);
      }
    }
    
    // Platform-specific execution
    if (isWindows) {
      exec(`powershell -Command "Start-Process -FilePath '${systemProxyScriptPath}' -Verb RunAs"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error setting system proxy: ${error.message}`);
          return;
        }
        console.log('System proxy enabled');
      });
    } else if (isLinux) {
      // Make script executable and run it
      exec(`chmod +x "${systemProxyScriptPath}" && "${systemProxyScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error setting system proxy: ${error.message}`);
          return;
        }
        console.log('System proxy enabled');
      });
    }
  } catch (error) {
    console.error('Failed to set system proxy:', error);
  }
}

// Function to disable system proxy (run as admin)
function disableSystemProxy() {
  try {
    // Check if the script file exists
    if (!fs.existsSync(disableProxyScriptPath)) {
      console.error(`Disable proxy script file not found at: ${disableProxyScriptPath}`);
      
      // Create the script file in the core directory if it doesn't exist
      const corePath = getResourcePath('core');
      if (!fs.existsSync(corePath)) {
        fs.mkdirSync(corePath, { recursive: true });
      }
      
      if (isWindows) {
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
        
        fs.writeFileSync(disableProxyScriptPath, disableBatContent);
        console.log(`Created disable proxy BAT file at: ${disableProxyScriptPath}`);
      } else if (isLinux) {
        const disableShContent = `#!/bin/bash
# Script to disable system proxy on Linux
# This script may need to be run with sudo privileges depending on your desktop environment

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "This script may need to be run with sudo privileges depending on your desktop environment"
fi

# Disable system proxy for GNOME
gsettings set org.gnome.system.proxy mode 'none' 2>/dev/null

# Disable system proxy for KDE (if kwriteconfig5 is available)
if command -v kwriteconfig5 &> /dev/null; then
  kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 0 2>/dev/null
fi

# Also unset environment variables that might be set
unset http_proxy
unset https_proxy
unset ftp_proxy
unset all_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
unset FTP_PROXY
unset ALL_PROXY

# Notify user
echo "Linux system proxy has been disabled."
echo ""
echo "This window will close in 3 seconds..."
sleep 3`;
        
        fs.writeFileSync(disableProxyScriptPath, disableShContent);
        console.log(`Created disable proxy SH file at: ${disableProxyScriptPath}`);
      }
    }
    
    // Platform-specific execution
    if (isWindows) {
      exec(`powershell -Command "Start-Process -FilePath '${disableProxyScriptPath}' -Verb RunAs"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error disabling system proxy: ${error.message}`);
          return;
        }
        console.log('System proxy disabled');
      });
    } else if (isLinux) {
      // Make script executable and run it
      exec(`chmod +x "${disableProxyScriptPath}" && "${disableProxyScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error disabling system proxy: ${error.message}`);
          return;
        }
        console.log('System proxy disabled');
      });
    }
  } catch (error) {
    console.error('Failed to disable system proxy:', error);
  }
}

// Function to show missing core files error
function showMissingCoreFilesError() {
  if (isWindows) {
    dialog.showErrorBox(
      'Missing Core Files',
      'The required Xray core files were not found.\n\n' +
      'Please make sure you have the following files in the "core/xray" folder:\n' +
      '- xray.exe\n' +
      'You can download the Xray core files from the official website and place them in the core/xray directory.'
    );
  } else if (isLinux) {
    dialog.showErrorBox(
      'Missing Core Files',
      'The required Xray core files were not found.\n\n' +
      'Please make sure you have the following files in the "core/linux/xray" folder:\n' +
      '- xray\n' +
      'You can download the Xray core files from the official website and place them in the core/linux/xray directory.'
    );
  } else {
    dialog.showErrorBox(
      'Missing Core Files',
      'The required Xray core files were not found.\n\n' +
      'Please make sure you have the Xray core files in the appropriate directory.'
    );
  }
}

// Optimized startV2ray function with better process management
function startV2ray(configUrl, isSwitching = false) {
  console.log(`startV2ray called with configUrl: ${configUrl}, isSwitching: ${isSwitching}`);
  
  if (v2rayProcess && !isSwitching) {
    stopV2ray();
  }

  try {
    // Check if xray executable exists
    if (!fs.existsSync(xrayExePath)) {
      showMissingCoreFilesError();
      throw new Error(`Xray executable not found at: ${xrayExePath}`);
    }

    // Check if configUrl is a local file path (JSON file from our configs directory)
    if (configUrl.endsWith('.json') && fs.existsSync(configUrl)) {
      // Use the specific config file directly with the exact path format
      // ./xray.exe --config ../configs/{id}.json
      const relativeConfigPath = path.relative(path.dirname(xrayExePath), configUrl).replace(/\\/g, '/');
      
      console.log(`Starting Xray with config: ${relativeConfigPath}`);
      
      // Platform-specific execution
      if (isWindows) {
        // Start Xray process with optimized settings
        v2rayProcess = spawn(xrayExePath, ['--config', relativeConfigPath], { 
          cwd: path.dirname(xrayExePath),
          stdio: ['ignore', 'pipe', 'pipe'] // Optimize stdio
        });
      } else if (isLinux) {
        // Make sure the executable has proper permissions
        execSync(`chmod +x "${xrayExePath}"`, { cwd: path.dirname(xrayExePath) });
        
        // Start Xray process with optimized settings
        v2rayProcess = spawn(xrayExePath, ['--config', relativeConfigPath], { 
          cwd: path.dirname(xrayExePath),
          stdio: ['ignore', 'pipe', 'pipe'] // Optimize stdio
        });
      }
      
      v2rayProcess.stdout.on('data', (data) => {
        // Only log important messages to reduce overhead
        const dataStr = data.toString();
        if (dataStr.includes('started') || dataStr.includes('error') || dataStr.includes('failed')) {
          console.log(`Xray stdout: ${dataStr}`);
        }
      });
      
      v2rayProcess.stderr.on('data', (data) => {
        // Only log error messages
        console.error(`Xray stderr: ${data}`);
      });
      
      v2rayProcess.on('close', (code) => {
        console.log(`Xray process exited with code ${code}`);
        // Only set isConnected to false and send disconnect status if we're not switching servers
        if (!global.isSwitching) {
          isConnected = false;
          if (win) {
            win.webContents.send('connection-status', false);
          }
        }
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
      });
      
      // Set the global switching flag
      global.isSwitching = isSwitching;
      
      isConnected = true;
      if (win) {
        win.webContents.send('connection-status', true);
        // Start connection timer
        global.connectionStartTime = Date.now();
      }
      
      // Set system proxy only if not switching servers
      if (!isSwitching) {
        setSystemProxy();
      } else {
        // Reset the switching flag after a short delay to ensure the previous process has fully closed
        setTimeout(() => {
          global.isSwitching = false;
        }, 100);
      }
    } else if (configUrl.startsWith('http://') || configUrl.startsWith('https://')) {
      // For HTTP/HTTPS URLs
      console.log(`Fetching config from URL: ${configUrl}`);
      axios.get(configUrl, { timeout: 5000 }).then(response => {
        fs.writeFileSync(xrayConfigPath, JSON.stringify(response.data, null, 2));
        
        // Platform-specific execution
        if (isWindows) {
          // Start Xray process with the default config file
          v2rayProcess = spawn(xrayExePath, ['--config'], { 
            cwd: path.dirname(xrayExePath),
            stdio: ['ignore', 'pipe', 'pipe'] // Optimize stdio
          });
        } else if (isLinux) {
          // Make sure the executable has proper permissions
          execSync(`chmod +x "${xrayExePath}"`, { cwd: path.dirname(xrayExePath) });
          
          // Start Xray process with the default config file
          v2rayProcess = spawn(xrayExePath, ['--config'], { 
            cwd: path.dirname(xrayExePath),
            stdio: ['ignore', 'pipe', 'pipe'] // Optimize stdio
          });
        }
        
        v2rayProcess.stdout.on('data', (data) => {
          // Only log important messages to reduce overhead
          const dataStr = data.toString();
          if (dataStr.includes('started') || dataStr.includes('error') || dataStr.includes('failed')) {
            console.log(`Xray stdout: ${dataStr}`);
          }
        });
        
        v2rayProcess.stderr.on('data', (data) => {
          // Only log error messages
          console.error(`Xray stderr: ${data}`);
        });
        
        v2rayProcess.on('close', (code) => {
          console.log(`Xray process exited with code ${code}`);
          isConnected = false;
          if (win) {
            win.webContents.send('connection-status', false);
          }
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
        });
        
        isConnected = true;
        if (win) {
          win.webContents.send('connection-status', true);
        }
        
        // Set system proxy only if not switching servers
        if (!isSwitching) {
          setSystemProxy();
        }
      }).catch(error => {
        console.error('Error fetching config from URL:', error);
        dialog.showErrorBox('Config Error', 'Failed to fetch configuration from URL: ' + error.message);
        isConnected = false;
        if (win) {
          win.webContents.send('connection-status', false);
        }
      });
    } else {
      // Unsupported config format
      console.log(`Error: Unsupported config format: ${configUrl}`);
      throw new Error(`Unsupported config format: ${configUrl}`);
    }
    
  } catch (error) {
    console.error('Error starting Xray:', error);
    dialog.showErrorBox('Connection Error', 'Failed to start Xray connection: ' + error.message);
    isConnected = false;
    if (win) {
      win.webContents.send('connection-status', false);
    }
  }
}

function stopV2ray(keepProxy = false) {
  // Clear ping interval when disconnecting
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  if (v2rayProcess) {
    // Disable system proxy before killing the process, unless we're keeping it
    if (!keepProxy) {
      disableSystemProxy();
    }
    
    v2rayProcess.kill();
    v2rayProcess = null;
    isConnected = false;
    if (win) {
      win.webContents.send('connection-status', false);
    }
  }
}

// Add a function to switch servers without full disconnect/connect cycle
function switchServer(newConfigIndex) {
  console.log(`Switching server to index: ${newConfigIndex}`);
  
  // Don't call stopV2ray here, just kill the process directly
  if (v2rayProcess) {
    v2rayProcess.kill();
    v2rayProcess = null;
  }
  
  // Set the new selected config
  if (configList[newConfigIndex]) {
    selectedConfig = configList[newConfigIndex];
    console.log(`New selected config:`, selectedConfig);
    
    // Handle the new config format with local JSON file
    if (selectedConfig.jsonFile) {
      // New format with local JSON file - this is what we want
      console.log(`Starting Xray with local JSON file: ${selectedConfig.jsonFile}`);
      startV2ray(selectedConfig.jsonFile, true); // true indicates server switching
    } else if (selectedConfig.url) {
      // Old format with URL property
      console.log(`Starting Xray with URL: ${selectedConfig.url}`);
      if (selectedConfig.url.startsWith('vless://') || 
          selectedConfig.url.startsWith('vmess://') || 
          selectedConfig.url.startsWith('ss://') || 
          selectedConfig.url.startsWith('trojan://')) {
        // This is a share link, we need to convert it to JSON first
        console.log('Error: Share link detected, showing error dialog');
        dialog.showErrorBox('Connection Error', 'This configuration format is not supported. Please refresh the server list.');
      } else {
        // This should be a JSON config URL
        startV2ray(selectedConfig.url, true); // true indicates server switching
      }
    }
  } else {
    console.log(`Error: Config at index ${newConfigIndex} not found`);
    // Send connection status false if config not found
    if (win) {
      win.webContents.send('connection-status', false);
    }
  }
}

// Optimized measurePing function with better error handling
async function measurePing() {
  if (!isConnected || !win) return;
  
  try {
    const startTime = Date.now();
    // Using axios with optimized settings
    await axios.get('https://www.gstatic.com/generate_204', { 
      timeout: 5000, // Reduced timeout for faster response
      validateStatus: () => true, // Accept any status code
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const endTime = Date.now();
    const pingTime = endTime - startTime;
    
    // Send ping to renderer only if there's a significant change or first measurement
    if (!global.lastPing || Math.abs(global.lastPing - pingTime) > 5) {
      global.lastPing = pingTime;
      win.webContents.send('connection-stats', {
        ping: pingTime,
        download: null,
        upload: null
      });
    }
  } catch (error) {
    console.error('Ping error:', error);
    // Send error ping to renderer only if state changed
    if (global.lastPing !== -1) {
      global.lastPing = -1;
      win.webContents.send('connection-stats', {
        ping: -1, // Indicate error
        download: null,
        upload: null
      });
    }
  }
}

// Function to start ping interval
function startPingInterval() {
  // Clear any existing interval
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  // Start new interval to ping every 5 seconds
  pingInterval = setInterval(measurePing, 5000);
  
  // Also do an initial ping
  setTimeout(measurePing, 100);
}

// Function to get and send connection statistics
async function sendConnectionStats() {
  if (!isConnected || !win) return;
  
  // Just trigger a ping measurement
  measurePing();
}

// Function to check if core directory exists and contains required files
function checkCoreDirectory() {
  const corePath = getResourcePath('core');
  
  if (!fs.existsSync(corePath)) {
    console.error('Core directory not found:', corePath);
    return false;
  }
  
  // Platform-specific file checking
  if (isWindows) {
    // Check for files in the xray subdirectory
    const requiredFiles = ['xray.exe'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, 'xray', file)));
    
    if (missingFiles.length > 0) {
      console.error('Missing core files:', missingFiles);
      return false;
    }
  } else if (isLinux) {
    // Check for files in the linux/xray subdirectory
    const requiredFiles = ['xray'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, 'linux', 'xray', file)));
    
    if (missingFiles.length > 0) {
      console.error('Missing core files:', missingFiles);
      return false;
    }
  } else {
    // Default to Windows check for other platforms
    const requiredFiles = ['xray.exe'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(corePath, 'xray', file)));
    
    if (missingFiles.length > 0) {
      console.error('Missing core files:', missingFiles);
      return false;
    }
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
        
        // Platform-specific file checking
        if (isWindows) {
          // Check if the selected directory has the required files in the xray subdirectory
          const requiredFiles = ['xray.exe'];
          const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(selectedDir, 'xray', file)));
          
          if (missingFiles.length > 0) {
            dialog.showErrorBox(
              'Invalid Core Directory', 
              `The selected directory is missing these required files in the xray subdirectory: ${missingFiles.join(', ')}`
            );
            resolve(false);
          } else {
            // User-selected directory is valid, save it for future use
            app.setPath('userData', selectedDir);
            resolve(true);
          }
        } else if (isLinux) {
          // Check if the selected directory has the required files in the linux/xray subdirectory
          const requiredFiles = ['xray'];
          const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(selectedDir, 'linux', 'xray', file)));
          
          if (missingFiles.length > 0) {
            dialog.showErrorBox(
              'Invalid Core Directory', 
              `The selected directory is missing these required files in the linux/xray subdirectory: ${missingFiles.join(', ')}`
            );
            resolve(false);
          } else {
            // User-selected directory is valid, save it for future use
            app.setPath('userData', selectedDir);
            resolve(true);
          }
        } else {
          // Default to Windows check for other platforms
          const requiredFiles = ['xray.exe'];
          const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(selectedDir, 'xray', file)));
          
          if (missingFiles.length > 0) {
            dialog.showErrorBox(
              'Invalid Core Directory', 
              `The selected directory is missing these required files in the xray subdirectory: ${missingFiles.join(', ')}`
            );
            resolve(false);
          } else {
            // User-selected directory is valid, save it for future use
            app.setPath('userData', selectedDir);
            resolve(true);
          }
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
  const xrayPath = path.join(corePath, 'xray');
  
  if (!fs.existsSync(corePath)) {
    fs.mkdirSync(corePath, { recursive: true });
    console.log('Created core directory:', corePath);
  }
  
  if (isWindows) {
    if (!fs.existsSync(xrayPath)) {
      fs.mkdirSync(xrayPath, { recursive: true });
      console.log('Created xray directory:', xrayPath);
    }

    // Check for common backup locations where core files might be found
    const possibleBackupLocations = [
      path.join(__dirname, 'core-backup'),
      path.join(app.getPath('userData'), 'core-backup'),
      path.join(app.getPath('documents'), 'DengVPN', 'core')
    ];

    const requiredFiles = ['xray.exe'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));

    if (missingFiles.length > 0) {
      console.log('Missing core files:', missingFiles);

      // Try to find and copy missing files from backup locations
      for (const backupLoc of possibleBackupLocations) {
        if (fs.existsSync(backupLoc)) {
          console.log('Found backup location:', backupLoc);
          
          // Also check for xray subdirectory in backup location
          const backupXrayPath = path.join(backupLoc, 'xray');
          const actualBackupPath = fs.existsSync(backupXrayPath) ? backupXrayPath : backupLoc;
          
          for (const file of missingFiles) {
            const backupFile = path.join(actualBackupPath, file);
            const targetFile = path.join(xrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
        
        // Also check for xray subdirectory in backup location
        const backupXrayLoc = path.join(backupLoc, 'xray');
        if (fs.existsSync(backupXrayLoc)) {
          console.log('Found backup xray location:', backupXrayLoc);
          
          for (const file of missingFiles) {
            const backupFile = path.join(backupXrayLoc, file);
            const targetFile = path.join(xrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
      }
      
      // If we get here, we couldn't find all required files
      return false;
    }
  } else if (isLinux) {
    const linuxXrayPath = path.join(corePath, 'linux', 'xray');
    if (!fs.existsSync(linuxXrayPath)) {
      fs.mkdirSync(linuxXrayPath, { recursive: true });
      console.log('Created linux/xray directory:', linuxXrayPath);
    }

    // Check for common backup locations where core files might be found
    const possibleBackupLocations = [
      path.join(__dirname, 'core-backup'),
      path.join(app.getPath('userData'), 'core-backup'),
      path.join(app.getPath('documents'), 'DengVPN', 'core')
    ];

    const requiredFiles = ['xray'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(linuxXrayPath, file)));

    if (missingFiles.length > 0) {
      console.log('Missing core files:', missingFiles);

      // Try to find and copy missing files from backup locations
      for (const backupLoc of possibleBackupLocations) {
        if (fs.existsSync(backupLoc)) {
          console.log('Found backup location:', backupLoc);
          
          // Also check for linux/xray subdirectory in backup location
          const backupLinuxXrayPath = path.join(backupLoc, 'linux', 'xray');
          const actualBackupPath = fs.existsSync(backupLinuxXrayPath) ? backupLinuxXrayPath : path.join(backupLoc, 'linux');
          
          for (const file of missingFiles) {
            const backupFile = path.join(actualBackupPath, file);
            const targetFile = path.join(linuxXrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(linuxXrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
        
        // Also check for linux/xray subdirectory in backup location
        const backupLinuxXrayLoc = path.join(backupLoc, 'linux', 'xray');
        if (fs.existsSync(backupLinuxXrayLoc)) {
          console.log('Found backup linux/xray location:', backupLinuxXrayLoc);
          
          for (const file of missingFiles) {
            const backupFile = path.join(backupLinuxXrayLoc, file);
            const targetFile = path.join(linuxXrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(linuxXrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
      }
      
      // If we get here, we couldn't find all required files
      return false;
    }
  } else {
    // Default to Windows behavior for other platforms
    if (!fs.existsSync(xrayPath)) {
      fs.mkdirSync(xrayPath, { recursive: true });
      console.log('Created xray directory:', xrayPath);
    }

    // Check for common backup locations where core files might be found
    const possibleBackupLocations = [
      path.join(__dirname, 'core-backup'),
      path.join(app.getPath('userData'), 'core-backup'),
      path.join(app.getPath('documents'), 'DengVPN', 'core')
    ];

    const requiredFiles = ['xray.exe'];
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));

    if (missingFiles.length > 0) {
      console.log('Missing core files:', missingFiles);

      // Try to find and copy missing files from backup locations
      for (const backupLoc of possibleBackupLocations) {
        if (fs.existsSync(backupLoc)) {
          console.log('Found backup location:', backupLoc);
          
          // Also check for xray subdirectory in backup location
          const backupXrayPath = path.join(backupLoc, 'xray');
          const actualBackupPath = fs.existsSync(backupXrayPath) ? backupXrayPath : backupLoc;
          
          for (const file of missingFiles) {
            const backupFile = path.join(actualBackupPath, file);
            const targetFile = path.join(xrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
        
        // Also check for xray subdirectory in backup location
        const backupXrayLoc = path.join(backupLoc, 'xray');
        if (fs.existsSync(backupXrayLoc)) {
          console.log('Found backup xray location:', backupXrayLoc);
          
          for (const file of missingFiles) {
            const backupFile = path.join(backupXrayLoc, file);
            const targetFile = path.join(xrayPath, file);
            
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
          const stillMissing = requiredFiles.filter(file => !fs.existsSync(path.join(xrayPath, file)));
          if (stillMissing.length === 0) {
            console.log('All core files restored from backup');
            return true;
          }
        }
      }
      
      // If we get here, we couldn't find all required files
      return false;
    }
  }
  
  return true;
}

// Function to download Xray core files from GitHub
async function downloadCoreFiles() {
  const corePath = getResourcePath('core');
  
  if (!fs.existsSync(corePath)) {
    fs.mkdirSync(corePath, { recursive: true });
  }
  
  // Platform-specific download
  if (isWindows) {
    const xrayPath = path.join(corePath, 'xray');
    
    if (!fs.existsSync(xrayPath)) {
      fs.mkdirSync(xrayPath, { recursive: true });
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
      xrayPath + '\n\n' +
      'Required files:\n' +
      '- xray.exe\n',
      buttons: ['OK']
    });
  } else if (isLinux) {
    const linuxXrayPath = path.join(corePath, 'linux', 'xray');
    
    if (!fs.existsSync(linuxXrayPath)) {
      fs.mkdirSync(linuxXrayPath, { recursive: true });
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
      linuxXrayPath + '\n\n' +
      'Required files:\n' +
      '- xray\n',
      buttons: ['OK']
    });
  } else {
    // Default to Windows behavior for other platforms
    const xrayPath = path.join(corePath, 'xray');
    
    if (!fs.existsSync(xrayPath)) {
      fs.mkdirSync(xrayPath, { recursive: true });
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
      xrayPath + '\n\n' +
      'Required files:\n' +
      '- xray.exe\n',
      buttons: ['OK']
    });
  }
  
  return false;
}

app.whenReady().then(async () => {
  createSplash();
  
  // Debug info: Verify core directory exists
  const corePath = getResourcePath('core');
  const xrayPath = path.join(corePath, 'xray');
  const linuxXrayPath = path.join(corePath, 'linux', 'xray');
  console.log('========== Core Path Debug Info ==========');
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('__dirname:', __dirname);
  console.log('Global core directory:', global.__coredir);
  console.log('Resource path:', process.resourcesPath);
  console.log('Core directory path:', corePath);
  console.log('Xray directory path:', xrayPath);
  console.log('Linux Xray directory path:', linuxXrayPath);
  console.log('xray.exe path:', xrayExePath);
  console.log('run.bat path:', systemProxyScriptPath);
  console.log('Platform:', process.platform);
  console.log('Is Windows:', isWindows);
  console.log('Is Linux:', isLinux);
  
  // Check if paths exist
  console.log('Core path exists:', fs.existsSync(corePath));
  console.log('Xray path exists:', fs.existsSync(xrayPath));
  console.log('Linux Xray path exists:', fs.existsSync(linuxXrayPath));
  console.log('xray executable exists:', fs.existsSync(xrayExePath));
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
  console.log(`Connect VPN request received for index: ${configIndex}`);
  
  // If already connected, this is a server switch
  if (isConnected && selectedConfig) {
    console.log('Switching server instead of connecting');
    switchServer(configIndex);
    return;
  }
  
  if (configList[configIndex]) {
    selectedConfig = configList[configIndex];
    console.log(`Selected config:`, selectedConfig);
    
    // Handle the new config format with local JSON file
    if (selectedConfig.jsonFile) {
      // New format with local JSON file - this is what we want
      console.log(`Starting Xray with local JSON file: ${selectedConfig.jsonFile}`);
      startV2ray(selectedConfig.jsonFile);
    } else if (selectedConfig.url) {
      // Old format with URL property - check if it's a share link or JSON URL
      console.log(`Starting Xray with URL: ${selectedConfig.url}`);
      if (selectedConfig.url.startsWith('vless://') || 
          selectedConfig.url.startsWith('vmess://') || 
          selectedConfig.url.startsWith('ss://') || 
          selectedConfig.url.startsWith('trojan://')) {
        // This is a share link, we need to convert it to JSON first
        // For now, we'll show an error since we should be using the pre-converted JSON files
        console.log('Error: Share link detected, showing error dialog');
        dialog.showErrorBox('Connection Error', 'This configuration format is not supported. Please refresh the server list.');
      } else {
        // This should be a JSON config URL
        startV2ray(selectedConfig.url);
      }
    } else {
      // Direct config string - this should be a share link
      // We need to convert it to JSON first
      console.log(`Starting Xray with direct config: ${selectedConfig}`);
      if (typeof selectedConfig === 'string' && 
          (selectedConfig.startsWith('vless://') || 
           selectedConfig.startsWith('vmess://') || 
           selectedConfig.startsWith('ss://') || 
           selectedConfig.startsWith('trojan://'))) {
        // This is a share link, we need to convert it to JSON first
        // For now, we'll show an error since we should be using the pre-converted JSON files
        console.log('Error: Direct share link detected, showing error dialog');
        dialog.showErrorBox('Connection Error', 'This configuration format is not supported. Please refresh the server list.');
      } else {
        startV2ray(selectedConfig);
      }
    }
  } else {
    console.log(`Error: Config at index ${configIndex} not found`);
  }
});

ipcMain.on('connect-vpn-url', (event, configUrl) => {
  // Direct connection using config URL
  // Check if it's a share link or a JSON URL
  if (configUrl.startsWith('vless://') || 
      configUrl.startsWith('vmess://') || 
      configUrl.startsWith('ss://') || 
      configUrl.startsWith('trojan://')) {
    // This is a share link, we need to convert it to JSON first
    // For now, we'll show an error since we should be using the pre-converted JSON files
    dialog.showErrorBox('Connection Error', 'Direct share link connections are not supported. Please refresh the server list.');
  } else {
    // This should be a JSON config URL
    startV2ray(configUrl);
  }
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

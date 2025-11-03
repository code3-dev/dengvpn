# Core Components Structure

## Overview

DengVPN's core components are organized in separate subdirectories under `/core`, each containing their respective binaries and assets for different platforms.

## Directory Structure

```
core/
├── configs/              # Generated JSON configuration files
├── linux/                # Linux-specific components
│   ├── xray/             # Xray core for Linux
│   │   ├── xray          # Linux executable
│   │   package.json
│   │   └── geoip.dat     # GeoIP database
│   └── x2j/              # x2j tool for Linux
│       ├── x2j           # Linux executable
│       └── LICENSE
├── xray/                 # Xray core for Windows
│   ├── xray.exe          # Windows executable
│   └── geoip.dat         # GeoIP database
├── x2j/                  # x2j tool for Windows
│   ├── x2j.exe           # Windows executable
│   └── LICENSE
├── run.bat               # Windows Xray execution script
├── run.sh                # Linux Xray execution script
├── disable_proxy.bat     # Windows proxy disabling script
└── disable_proxy.sh      # Linux proxy disabling script
```

## Component Functions

### configs/

Stores generated JSON configuration files that are created by the x2j tool and loaded by Xray core. This directory is cleared upon application startup to ensure fresh configuration state.

### xray/

Contains the Xray core executables for different platforms:
- Windows: xray.exe
- Linux: xray

Also includes supporting files like the GeoIP database for routing rules.

### x2j/

Contains the x2j tool executables for different platforms:
- Windows: x2j.exe
- Linux: x2j

Used to convert Xray links to Xray-compatible JSON configurations.

### Scripts

#### run.bat (Windows)

Executes the Xray core with the specified configuration:
```batch
@echo off
cd /d "%~dp0"
cd xray
xray.exe --config ..\configs\%1.json
```

#### run.sh (Linux)

Executes the Xray core with the specified configuration:
```bash
#!/bin/bash
cd "$(dirname "$0")"
cd xray
./xray --config ../configs/$1.json
```

#### disable_proxy.bat (Windows)

Disables the Windows system proxy settings:
```batch
@echo off
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f
```

#### disable_proxy.sh (Linux)

Disables the Linux system proxy settings for GNOME and KDE:
```bash
#!/bin/bash
# Disable system proxy for GNOME
gsettings set org.gnome.system.proxy mode 'none' 2>/dev/null

# Disable system proxy for KDE (if kwriteconfig5 is available)
if command -v kwriteconfig5 &> /dev/null; then
  kwriteconfig5 --file kioslaverc --group "Proxy Settings" --key ProxyType 0 2>/dev/null
fi
```

## Platform Support

- **Windows**: Full support with NSIS installer
- **Linux**: Full support with AppImage, DEB, RPM, and tar.gz packages

## ASAR Unpacking

Core files in `/core` are unpacked using `asarUnpack` for runtime access, as specified in package.json
```json
"asarUnpack": [
  "core/**/*"
]
```

This ensures that executables can run properly when the application is packaged.

## Security Considerations

- All core components are verified at startup using `verify-core.js`
- Binaries are stored separately from application code
- Configuration files are isolated in their own directory
- Platform-specific scripts are executed with appropriate permissions
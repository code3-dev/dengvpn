# Core Components Structure

## Overview

DengVPN's core components are organized in separate subdirectories under `/core`, each containing their respective binaries and assets.

## Directory Structure

```
core/
├── configs/          # Generated JSON configuration files
├── xray/             # Xray core binaries and assets
│   ├── xray.exe      # Windows executable
│   ├── xray          # Linux executable
│   └── geoip.dat     # GeoIP database
├── x2j/              # x2j conversion tool
│   ├── x2j.exe       # Windows executable
│   └── x2j           # Linux executable
├── run.bat           # Xray execution script
└── disable_proxy.bat # Proxy disabling script
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

Used to convert VMESS links to Xray-compatible JSON configurations.

### Scripts

#### run.bat

Executes the Xray core with the specified configuration:
```batch
@echo off
cd /d "%~dp0"
cd xray
xray.exe --config ..\configs\%1.json
```

#### disable_proxy.bat

Disables the Windows system proxy settings:
```batch
@echo off
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f
```

## Platform Support

- **Windows**: Full support with NSIS installer
- **Linux**: Support with AppImage and DEB packages

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
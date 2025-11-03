# Development Guide

## Overview

This guide provides information for developers who want to contribute to or modify DengVPN.

## Prerequisites

- Node.js 22
- pnpm 10+
- Git

## Project Setup

### Clone the Repository

```bash
git clone https://github.com/code3-dev/dengvpn.git
cd dengvpn
```

### Install Dependencies

```bash
pnpm install
```

## Project Structure

```
dengvpn/
├── assets/           # HTML templates and icons
├── core/             # Core binaries and scripts
│   ├── linux/        # Linux-specific binaries and scripts
│   │   ├── xray/     # Xray core for Linux
│   │   └── x2j/      # x2j tool for Linux
│   ├── configs/      # Generated JSON configuration files
│   ├── xray/         # Xray core for Windows
│   ├── x2j/          # x2j tool for Windows
│   ├── run.bat       # Windows Xray execution script
│   ├── run.sh        # Linux Xray execution script
│   ├── disable_proxy.bat # Windows proxy disabling script
│   └── disable_proxy.sh  # Linux proxy disabling script
├── dist/             # Compiled frontend assets
├── docs/             # Documentation files
├── release/          # Generated installers
├── scripts/          # Utility scripts
├── loader.js         # Application entry point
├── main.js           # Main Electron process
├── preload.js        # Secure IPC preloader
├── verify-core.js    # Core components validator
└── obfuscate.js      # Code protection utility
```

## Development Scripts

### Start Development Mode

```bash
pnpm start
```

This runs `electron .` to start the application in development mode.

### Verify Core Components

```bash
pnpm verify-core
```

Executes `verify-core.js` to validate that all core components are present and functional.

### Obfuscate Code

```bash
pnpm obfuscate
```

Runs `obfuscate.js` to protect the source code using javascript-obfuscator.

### Build Commands

#### Build for Windows

```bash
pnpm build:win
```

Verifies core, obfuscates code, and builds Windows installer using electron-builder.

#### Build for Linux

```bash
pnpm build:linux
```

Verifies core, obfuscates code, and builds Linux packages using electron-builder.

#### Full Production Build

```bash
pnpm build
```

Runs verification, obfuscation, and builds for all platforms.

## Core Components

### loader.js

The entry point of the application that initializes the Electron environment.

### main.js

The main Electron process that handles:
- Window creation
- IPC communication
- Core process management
- System proxy configuration
- Cross-platform support

### preload.js

Secure IPC preloading script that exposes only necessary APIs to the renderer process.

### verify-core.js

Validates that all core components are present and functional:
- Checks for Xray binaries (platform-specific)
- Validates x2j tool (platform-specific)
- Verifies platform-specific scripts
- Ensures proper directory structure

### obfuscate.js

Protects source code using javascript-obfuscator:
- Obfuscates JavaScript files
- Maintains functionality
- Reduces reverse engineering risk

## IPC Communication

The application uses secure IPC communication between the renderer and main processes:

1. Renderer sends commands via `window.api.send()`
2. Main process receives via `ipcMain.on()`
3. Main process responds via `event.reply()`
4. Renderer receives via `window.api.receive()`

## Core Process Management

### Starting Xray

1. Fetch Xary URL
2. Convert to JSON using x2j
3. Execute Xray with configuration
4. Monitor process status

### Stopping Xray

1. Terminate Xray process
2. Disable system proxy
3. Clean up temporary files

## System Integration

### Windows Proxy Configuration

Uses PowerShell scripts to:
- Enable system proxy
- Set proxy address (127.0.0.1:10808)
- Disable proxy when disconnecting

### Linux Proxy Configuration

Uses shell scripts to:
- Enable system proxy for GNOME and KDE
- Set proxy address (127.0.0.1:10808)
- Disable proxy when disconnecting

### Cross-Platform Support

- Windows: PowerShell scripts and .exe binaries
- Linux: Shell scripts and ELF binaries

## Environment Configuration

### Build Tool

pnpm scripts defined in `package.json`

### Build Outputs

Configured via electron-builder to output installers in `/release` folder

### Platform Targets

- Windows: NSIS installer
- Linux: AppImage, DEB, RPM, and tar.gz packages

## GitHub Actions

The project uses GitHub Actions for CI/CD:

1. Build on Windows and Ubuntu runners
2. Create release artifacts for both platforms
3. Publish to GitHub Releases

## Code Protection

The application uses javascript-obfuscator to protect the source code:

- String obfuscation
- Variable renaming
- Dead code injection
- Control flow flattening

## Testing

### Manual Testing

1. Connect/Disconnect functionality
2. Proxy configuration
3. Process management
4. UI responsiveness
5. Cross-platform compatibility

### Automated Testing

Planned for future releases.

## Debugging

### Logs

Check the console output in development mode or use:
```bash
pnpm start -- --debug
```

### Common Issues

1. **Xray not starting**: Check core components verification
2. **Proxy not working**: Verify system proxy settings
3. **Connection issues**: Validate Xray URL and configuration
4. **Permission issues (Linux)**: Ensure scripts have execute permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Xray Core](https://github.com/XTLS/Xray-core)
- [x2j Tool](https://github.com/code3-dev/x2j)
# DengVPN 🛡️

<div align="center">
  
![DengVPN Logo](assets/icon.png)

**Fast, Secure & Unlimited Free VPN Service**

*Powered by V2Ray technology | Electron-based desktop application*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows-brightgreen.svg)](https://github.com/code3-dev/dengvpn)
[![Version](https://img.shields.io/badge/Version-1.2.0-orange.svg)](https://github.com/code3-dev/dengvpn)

</div>

## ✨ Overview

DengVPN is a sophisticated yet user-friendly desktop VPN client that leverages the powerful V2Ray protocol to provide secure, anonymous, and unrestricted internet access. Built with Electron, it offers a seamless experience with automatic configuration fetching, one-click connectivity, and real-time performance monitoring.

Unlike traditional VPN services that require paid subscriptions, DengVPN connects you to free public V2Ray servers that are regularly updated, ensuring reliable and continuous access without any cost.

## 🚀 Key Features

- **🆓 100% Free & Unlimited**: No subscriptions, no hidden fees, no bandwidth limitations
- **🔄 Auto-Configuration**: Automatically fetches and updates working VMESS configurations
- **🖱️ One-Click Connect**: Simple interface with instant connection capability
- **⚙️ Integrated System Proxy**: Automatically configures Windows system proxy settings
- **📊 Live Statistics**: Real-time monitoring of connection status, ping, and uptime
- **🔒 Enhanced Privacy**: V2Ray's advanced tunneling protects your online identity
- **🔄 Auto-Restart**: Seamlessly reconnects if connection is interrupted
- **💻 Windows Optimized**: Specifically designed and tested for Windows environments

## 📥 Installation

### Option 1: Download Release (Recommended)

1. Download the latest installer from [GitHub Releases](https://github.com/code3-dev/dengvpn/releases)
2. Run the installer and follow the on-screen instructions
3. Launch DengVPN from your Start menu

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/code3-dev/dengvpn.git

# Navigate to project directory
cd dengvpn

# Install dependencies
npm install

# Start the application in development mode
npm start

# Build for production (creates installer in 'release' folder)
npm run build:win
```

## 🛠️ Architecture

DengVPN operates through a multi-layered architecture:

1. **Frontend Layer**: Electron-based UI for user interaction
2. **Integration Layer**: Bidirectional IPC communication between UI and system
3. **Core Engine**: V2Ray binary executing VPN tunneling protocols
4. **System Integration**: Automatic proxy configuration for seamless system-wide VPN


## 🔄 How It Works

1. **Configuration Retrieval**: On startup, DengVPN fetches the latest VMESS configurations from a regularly updated repository
2. **Connection Setup**: When you click "Connect", the application:
   - Selects the optimal server based on availability
   - Generates a V2Ray configuration file
   - Launches the V2Ray process with the appropriate parameters
3. **System Integration**: Windows proxy settings are automatically configured to route all traffic through the V2Ray tunnel
4. **Monitoring**: The application constantly monitors connection health, providing real-time statistics
5. **Cleanup**: When disconnecting, all processes are properly terminated and system settings are restored

## 🛡️ Privacy & Security

DengVPN is designed with privacy as a priority:

- No logs of your browsing activity
- No personal information collected
- Obfuscated traffic using V2Ray's advanced protocols
- Automatic IP masking

## ⚙️ Development Commands

```bash
# Start in development mode
npm start

# Verify core components
npm run verify-core

# Obfuscate code for protection
npm run obfuscate

# Build production installer for Windows
npm run build:win
```

## ❓ Troubleshooting

**Q: V2Ray fails to start**  
A: Check if your antivirus is blocking v2ray.exe. Add an exception or temporarily disable your antivirus.

**Q: Cannot connect to any server**  
A: Your ISP might be blocking VPN connections. Try using the application on a different network.

**Q: System proxy doesn't work**  
A: Make sure you're running the application as Administrator.

## 👨‍💻 Developer Contact

- **Telegram**: [@h3dev](https://t.me/h3dev)
- **Instagram**: [@h3dev.pira](https://instagram.com/h3dev.pira)
- **Email**: h3dev.pira@gmail.com

## ⚠️ Disclaimer

DengVPN is provided for educational and research purposes only. Users are responsible for complying with all applicable laws and regulations regarding internet use, privacy, and data transmission in their respective countries. The developers assume no liability for any misuse of this software or any damages arising from its use.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <sub>Built with ❤️ by Hossein Pira</sub>
</div> 
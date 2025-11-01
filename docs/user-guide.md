# User Guide

## Getting Started

### System Requirements

- **Windows**: Windows 7 or later (64-bit)
- **Linux**: Ubuntu 18.04+, Debian 10+, or equivalent distributions
- At least 100MB of available disk space

### Installation

1. Download the latest release from [GitHub Releases](https://github.com/code3-dev/dengvpn/releases)
2. For Windows, download `DengVPN-{version}-x64.exe`
3. Run the installer and follow the installation wizard
4. Launch DengVPN from your desktop shortcut or start menu

### Initial Setup

1. Obtain a VMESS configuration URL from your VPN provider
2. The application will automatically fetch and configure the connection

## Using DengVPN

### Main Interface

The DengVPN interface consists of:

1. **Connection Status**: Shows whether you're connected or disconnected
2. **Connect/Disconnect Button**: Primary control for establishing/closing VPN connections
3. **Statistics Panel**: Displays real-time connection information
4. **Settings Menu**: Access to configuration options

### Connecting to VPN

1. Ensure you have a valid VMESS URL configured
2. Click the **Connect** button
3. Wait for the connection to establish (usually takes 1-3 seconds)
4. The status will change to "Connected" when successful

### Disconnecting from VPN

1. Click the **Disconnect** button
2. Wait for the connection to close
3. The system proxy will be automatically disabled

### Connection Statistics

The statistics panel displays real-time information:
- **Ping**: Latency to the VPN server
- **Uptime**: Duration of the current connection
- **Data Transferred**: Amount of data sent and received

## Configuration

### VMESS URL

DengVPN automatically fetches VMESS configuration from a predefined URL. To change this:

1. Close the application
2. Set the `VMESS_URL` environment variable to your configuration URL
3. Restart the application

### Proxy Settings

The application automatically configures your system proxy settings:
- **Proxy Address**: 127.0.0.1
- **Port**: 10808

These settings are automatically reverted when disconnecting.

## Troubleshooting

### Common Issues

#### Unable to Connect

1. Check your internet connection
2. Verify the VMESS URL is valid and accessible
3. Ensure no firewall is blocking the connection
4. Try restarting the application

#### Slow Connection

1. Try connecting at a different time
2. Check if other applications are consuming bandwidth
3. Verify the VPN server location is optimal for your region

#### Connection Drops

1. The application will automatically attempt to reconnect
2. If reconnection fails, manually disconnect and reconnect
3. Check your internet stability

### Error Messages

#### "Failed to start Xray core"

This indicates an issue with the core VPN engine:
1. Verify the application was installed correctly
2. Check that Windows Defender or antivirus software isn't blocking the core files
3. Reinstall the application if the problem persists

#### "Invalid configuration"

This suggests an issue with the VMESS URL:
1. Verify the URL is correct and accessible
2. Contact your VPN provider to confirm the configuration is valid
3. Try with a different VMESS URL if available

### Logs

For advanced troubleshooting, check the application logs:
- **Windows**: `%APPDATA%\dengvpn\logs`
- **Linux**: `~/.config/dengvpn/logs`

## Security

### Data Privacy

DengVPN does not collect or transmit any personal data. All VPN traffic is encrypted using industry-standard protocols.

### Encryption

The application uses Xray core with strong encryption:
- AES-128-GCM for VMess
- ChaCha20-Poly1305 for alternative cipher

### No Logging Policy

DengVPN does not log any browsing activity, connection logs, or personal information.

## Advanced Features

### Automatic Reconnection

If the VPN connection drops unexpectedly, DengVPN will automatically attempt to reconnect to maintain your privacy.

### System Integration

The application seamlessly integrates with your operating system:
- Automatically configures proxy settings
- Runs in the system tray for easy access
- Provides notifications for connection status changes

## Updates

### Checking for Updates

The application automatically checks for updates on startup. Update notifications will appear in the interface.

### Manual Update

1. Visit [GitHub Releases](https://github.com/code3-dev/dengvpn/releases)
2. Download the latest version
3. Install over the existing installation

## Uninstallation

### Windows

1. Open "Apps & features" in Settings
2. Find "DengVPN" in the list
3. Click "Uninstall" and follow the prompts

Alternatively, use the uninstaller in the installation directory.

## Support

For support, please:
1. Check this documentation
2. Review existing issues on [GitHub](https://github.com/code3-dev/dengvpn/issues)
3. Create a new issue if your problem isn't addressed

## FAQ

### Is DengVPN really free?

Yes, DengVPN is completely free and open-source with no hidden costs or premium features.

### Does DengVPN work in China?

Due to the nature of internet restrictions, VPN reliability can vary. We recommend testing with your specific configuration.

### Can I use my own Xray configuration?

Currently, the application only supports VMESS URLs. Direct Xray configuration support is planned for future releases.

### How many devices can I use?

This depends on your VPN provider's policy. DengVPN itself doesn't impose device limits.

### Does DengVPN bypass all restrictions?

While VPNs can help with accessing restricted content, no solution is 100% effective against all restrictions.
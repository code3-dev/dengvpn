# Xray Core Integration

## Overview

DengVPN utilizes [Xray](https://github.com/XTLS/Xray-core) as its core VPN engine. Xray is a versatile platform for building proxies with multiple protocols support.

## Integration Details

### Core Location

The Xray binaries are located in platform-specific directories:
```
core/xray/                # Windows binaries
├── xray.exe              # Windows executable
└── geoip.dat             # GeoIP database

core/linux/xray/          # Linux binaries
├── xray                  # Linux executable
└── geoip.dat             # GeoIP database
```

### Configuration

Xray is executed with the command:
```
# Windows
xray.exe --config ../configs/{id}.json

# Linux
./xray --config ../configs/{id}.json
```

This directly loads the specific generated configuration file by ID, rather than copying it to the default config.json location.

### Configuration File Storage

Generated JSON configuration files are stored in the `/core/configs` subdirectory, which is cleared upon application startup to ensure fresh configuration state.

## Protocol Support

Xray core supports multiple protocols including:
- Xray
- VLESS
- Trojan
- Shadowsocks
- Dokodemo-door
- HTTP
- SOCKS

## Performance

Xray core provides:
- Low latency connections
- High throughput
- Traffic camouflage capabilities
- Multiple routing rules support

## Security Features

- TLS 1.3 support
- AEAD encryption
- Traffic padding
- Domain fronting capabilities

## Cross-Platform Support

Xray core is available for multiple platforms:
- Windows (x86_64)
- Linux (x86_64)

## Customization

Advanced users can customize Xray behavior by modifying the configuration template in `verify-core.js`.

## Resources

- [Official Xray Documentation](https://xtls.github.io/)
- [Xray GitHub Repository](https://github.com/XTLS/Xray-core)
- [Xray Configuration Examples](https://github.com/XTLS/Xray-examples)
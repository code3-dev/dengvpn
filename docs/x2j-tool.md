# x2j Tool Integration

## Overview

DengVPN uses the [x2j](https://github.com/code3-dev/x2j) tool to convert VMESS links to Xray JSON configuration files.

## Integration Details

### Tool Location

The x2j binaries are located in the `core/x2j/` directory:
```
core/x2j/
├── x2j.exe           # Windows executable
└── x2j               # Linux executable
```

### Usage

The x2j tool is executed with the following parameters:
```
x2j -p 10808 -o ../configs/{id}.json {vmess_url}
```

Where:
- `-p 10808` sets the inbound proxy port
- `-o ../configs/{id}.json` specifies the output JSON file path
- `{vmess_url}` is the VMESS configuration URL

### Conversion Process

1. Application fetches VMESS configuration URL
2. x2j converts VMESS link to Xray-compatible JSON
3. JSON is saved to `/core/configs` directory
4. Xray core loads the configuration for connection

## Supported Formats

- VMESS links
- Multiple VMESS configurations in a single URL

## Error Handling

The tool includes error handling for:
- Invalid VMESS URLs
- Network connectivity issues
- Malformed configuration data

## Customization

The proxy port can be customized by modifying the `-p` parameter in `main.js`.

## Resources

- [x2j GitHub Repository](https://github.com/code3-dev/x2j)
- [VMESS Protocol Documentation](https://www.v2ray.com/en/configuration/protocols/vmess.html)
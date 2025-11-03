# x2j Tool Integration

## Overview

DengVPN uses the [x2j](https://github.com/code3-dev/x2j) tool to convert Xray links to Xray JSON configuration files.

## Integration Details

### Tool Location

The x2j binaries are located in platform-specific directories:
```
core/x2j/                 # Windows binaries
└── x2j.exe               # Windows executable

core/linux/x2j/           # Linux binaries
└── x2j                   # Linux executable
```

### Usage

The x2j tool is executed with the following parameters:
```
# Windows
x2j.exe -p 10808 -o ../configs/{id}.json {xray_url}

# Linux
./x2j -p 10808 -o ../configs/{id}.json {xray_url}
```

Where:
- `-p 10808` sets the inbound proxy port
- `-o ../configs/{id}.json` specifies the output JSON file path
- `{xray_url}` is the Xray configuration URL

### Conversion Process

1. Application fetches Xray configuration URL
2. x2j converts Xray link to Xray-compatible JSON
3. JSON is saved to `/core/configs` directory
4. Xray core loads the configuration for connection

## Supported Formats

- Xray links
- Multiple Xray configurations in a single URL

## Error Handling

The tool includes error handling for:
- Invalid Xray URLs
- Network connectivity issues
- Malformed configuration data

## Cross-Platform Support

x2j tool is available for multiple platforms:
- Windows (x86_64)
- Linux (x86_64)

## Customization

The proxy port can be customized by modifying the `-p` parameter in `main.js`.

## Resources

- [x2j GitHub Repository](https://github.com/code3-dev/x2j)
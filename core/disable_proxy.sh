#!/bin/bash
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
sleep 3
#!/bin/bash
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
sleep 3
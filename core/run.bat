@echo off
REM Script to set Windows system proxy to use V2Ray SOCKS proxy
REM This script needs to be run as administrator

REM Set proxy to localhost:1080 (V2Ray SOCKS proxy)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer /t REG_SZ /d "socks=127.0.0.1:1080" /f

REM Notify user
echo Windows system proxy has been enabled.
echo Proxy: 127.0.0.1:1080 (SOCKS)
echo.
echo This window will close in 3 seconds...
timeout /t 3 > nul 
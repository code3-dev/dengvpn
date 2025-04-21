@echo off
REM Script to disable Windows system proxy
REM This script needs to be run as administrator

REM Disable system proxy
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f

REM Notify user
echo Windows system proxy has been disabled.
echo.
echo This window will close in 3 seconds...
timeout /t 3 > nul 
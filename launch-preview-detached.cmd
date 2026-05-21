@echo off
set "PATH=C:\Program Files\nodejs;C:\Windows\System32;C:\Windows"
cd /d "%~dp0"
start "Plakaty preview" /D "%~dp0" "C:\Program Files\nodejs\node.exe" preview.js

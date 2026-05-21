@echo off
cd /d "%~dp0"
if not exist ".preview-staging" mkdir ".preview-staging"
"C:\Program Files\nodejs\node.exe" preview.js >> ".preview-staging\preview.log" 2>&1

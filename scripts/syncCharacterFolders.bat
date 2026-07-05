@echo off
setlocal

chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%syncCharacterFolders.ps1" %*

exit /b %ERRORLEVEL%

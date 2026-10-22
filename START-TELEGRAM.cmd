@echo off
setlocal
cd /d "%~dp0"
call npm.cmd run bot
if errorlevel 1 pause

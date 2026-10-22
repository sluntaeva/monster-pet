@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS, then run START.cmd again.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Installing Monster Pet dependencies. Internet access is required...
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and the error above.
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:5173 in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop.
call npm.cmd run dev
if errorlevel 1 pause

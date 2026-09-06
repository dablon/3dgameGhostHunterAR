@echo off
REM ===================================================================
REM  RUNME.bat — boot the 3D game in your browser.
REM  Requirements: Node.js 20+ on PATH (https://nodejs.org).
REM ===================================================================
setlocal ENABLEDELAYEDEXPANSION

cd /d "%~dp0"

set "NODE_BIN=node"
set "NPM_BIN=npm"
set "PORT=5173"
set "URL=http://localhost:%PORT%"

echo.
echo [RUNME] Working directory: %CD%
echo.

REM ---- 1. Sanity check Node ----
where %NODE_BIN% >nul 2>nul
if errorlevel 1 (
  echo [RUNME] FATAL: 'node' is not on PATH. Install Node.js 20+ and try again.
  pause
  exit /b 1
)
echo [RUNME] Node version:
%NODE_BIN% --version

REM ---- 2. Install dependencies on first run ----
if not exist "node_modules\" (
  echo [RUNME] First run detected. Installing dependencies via npm install ...
  call %NPM_BIN% install --no-audit --no-fund
  if errorlevel 1 (
    echo [RUNME] FATAL: npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [RUNME] node_modules present. Skipping install.
)

REM ---- 3. Start dev server in background ----
echo [RUNME] Starting Vite dev server on port %PORT% ...
start "vite-dev" /B %NPM_BIN% run dev

REM ---- 4. Wait for the server to respond ----
echo [RUNME] Waiting for server to be reachable ...
set /a tries=0
:waitloop
set /a tries+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :ready
if !tries! geq 30 (
  echo [RUNME] Server did not start within 60s. Check the 'vite-dev' window.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto :waitloop

:ready
echo [RUNME] Server is up at %URL%

REM ---- 5. Open browser ----
echo [RUNME] Opening default browser ...
start "" "%URL%"

echo.
echo [RUNME] ==========================================================
echo [RUNME]  Game is running. Close this window or the 'vite-dev'
echo [RUNME]  window to stop the server.
echo [RUNME] ==========================================================
echo.
pause
endlocal

@echo off
title POLO SHOP - Cloudflare Tunnel ^& Deployment Helper
color 0B

cd /d "%~dp0"

REM --- Detect cloudflared binary ---
set "CF_BIN="
if exist "%~dp0cloudflared.exe" (
    set "CF_BIN=%~dp0cloudflared.exe"
) else (
    where cloudflared >nul 2>&1
    if not errorlevel 1 set "CF_BIN=cloudflared"
)

:menu
cls
echo ================================================================
echo    POLO SHOP - Cloudflare Tunnel ^& Deployment Helper
echo ================================================================
echo.
echo  [1] Quick Tunnel: Full App (Frontend + Backend on Docker: Port 8081)
echo      * Recommended: Generates an instant public HTTPS link to test!
echo.
echo  [2] Start Cloudflare Tunnel for Backend Only (Port 3000)
echo.
echo  [3] Full Deploy: Tunnel Backend + Build ^& Deploy to Cloudflare Pages
echo.
echo  [4] Build ^& Deploy Frontend to Cloudflare Pages Only
echo.
echo  [5] Run Frontend Locally (Vite Dev Server)
echo  [6] Open Cloudflare Dashboard
echo  [7] Exit
echo.
echo ================================================================
set /p choice="Please enter your choice (1-7) [Default: 1]: "

if "%choice%"=="" set choice=1
set choice=%choice: =%
if "%choice%"=="1" goto tunnel_full_app
if "%choice%"=="2" goto tunnel_backend_only
if "%choice%"=="3" goto full_deploy
if "%choice%"=="4" goto build_deploy
if "%choice%"=="5" goto run_local
if "%choice%"=="6" goto open_dashboard
if "%choice%"=="7" goto exit_script

echo Invalid choice. Please try again.
ping 127.0.0.1 -n 3 >nul
goto menu

REM ================================================================
:check_cloudflared
REM ================================================================
if not defined CF_BIN (
    echo [ERROR] cloudflared was not found!
    echo Please make sure cloudflared.exe is in the project folder or installed in PATH.
    pause
    goto menu
)
exit /b 0

REM ================================================================
:check_docker
REM ================================================================
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first.
    echo.
    pause
    goto menu
)
echo [OK] Docker is running.
echo Starting Docker containers...
docker compose up -d
echo.
exit /b 0

REM ================================================================
:tunnel_full_app
REM ================================================================
cls
echo ================================================================
echo    Option 1: Quick Tunnel Full App (Port 8081)
echo ================================================================
echo.
call :check_cloudflared
call :check_docker

echo [INFO] Starting Cloudflare Tunnel for Frontend + Backend (Port 8081)...
echo [INFO] Anyone with this link can test the entire web application!
echo.

"%CF_BIN%" tunnel --url http://localhost:8081
pause
goto menu

REM ================================================================
:tunnel_backend_only
REM ================================================================
cls
echo ================================================================
echo    Option 2: Cloudflare Tunnel for Backend Only (Port 3000)
echo ================================================================
echo.
call :check_cloudflared
call :check_docker

set BACKEND_PORT=3000
set /p BACKEND_PORT="Enter backend port [Default: 3000]: "
if "%BACKEND_PORT%"=="" set BACKEND_PORT=3000

echo [INFO] Starting tunnel for http://localhost:%BACKEND_PORT%...
"%CF_BIN%" tunnel --url http://localhost:%BACKEND_PORT%
pause
goto menu

REM ================================================================
:full_deploy
REM ================================================================
cls
echo ================================================================
echo    STEP 1/4 - Checking Docker ^& Backend...
echo ================================================================
echo.
call :check_cloudflared
call :check_docker

echo Waiting 3 seconds for backend to be ready...
ping 127.0.0.1 -n 4 >nul

echo.
echo ================================================================
echo    STEP 2/4 - Starting Cloudflare Tunnel for Backend...
echo ================================================================
echo.
set BACKEND_PORT=3000
set /p BACKEND_PORT="Enter backend port [Default: 3000]: "
if "%BACKEND_PORT%"=="" set BACKEND_PORT=3000

echo [INFO] Opening Cloudflare Tunnel on port %BACKEND_PORT% in a new window...
echo [INFO] Wait for the tunnel URL to appear...
echo.

if exist "%TEMP%\cf_tunnel.log" del "%TEMP%\cf_tunnel.log"

start "Cloudflare Tunnel - DO NOT CLOSE" cmd /c "\"%CF_BIN%\" tunnel --url http://localhost:%BACKEND_PORT% > \"%TEMP%\cf_tunnel.log\" 2>&1"

echo [INFO] Waiting for Tunnel URL (up to 45 seconds)...
set TUNNEL_URL=
set /a counter=0

:wait_tunnel
ping 127.0.0.1 -n 3 >nul
set /a counter+=2
if %counter% gtr 45 (
    echo [ERROR] Timeout waiting for Tunnel URL!
    echo Check the Cloudflare Tunnel window for errors.
    pause
    goto menu
)

set LINE=
for /f "tokens=*" %%i in ('findstr "trycloudflare.com" "%TEMP%\cf_tunnel.log" 2^>nul') do set LINE=%%i
if not defined LINE goto wait_tunnel

for /f "tokens=*" %%a in ('powershell -Command "if (('%LINE%' -match 'https://[a-z0-9\-]+\.trycloudflare\.com')) { $matches[0] }"') do set TUNNEL_URL=%%a
if not defined TUNNEL_URL goto wait_tunnel

echo.
echo ================================================================
echo    TUNNEL ACTIVE!
echo    Backend Public URL: %TUNNEL_URL%
echo ================================================================
echo.

echo ================================================================
echo    STEP 3/4 - Building Frontend with Tunnel URL...
echo ================================================================
echo.

cd /d "%~dp0frontend"
echo VITE_API_URL=%TUNNEL_URL%> .env.production
echo [OK] Created .env.production:
type .env.production
echo.

echo [INFO] Building frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    goto menu
)

echo.
echo ================================================================
echo    STEP 4/4 - Deploying to Cloudflare Pages...
echo ================================================================
echo.

set PROJECT_NAME=polo-shop
set /p PROJECT_NAME="Enter Cloudflare Pages project name [Default: polo-shop]: "
if "%PROJECT_NAME%"=="" set PROJECT_NAME=polo-shop

call npx --yes wrangler pages deploy dist --project-name %PROJECT_NAME%
if errorlevel 1 (
    echo [ERROR] Deployment failed! Run: npx wrangler login
    pause
    goto menu
)

echo.
echo ================================================================
echo    DEPLOYMENT COMPLETE!
echo ================================================================
echo.
echo    Frontend URL : https://%PROJECT_NAME%.pages.dev
echo    Backend URL  : %TUNNEL_URL%
echo.
echo    [IMPORTANT] Keep the Cloudflare Tunnel window OPEN!
echo ================================================================
echo.
pause
goto menu

REM ================================================================
:build_deploy
REM ================================================================
cls
echo ================================================================
echo    Build ^& Deploy Frontend to Cloudflare Pages
echo ================================================================
echo.
set /p CUSTOM_URL="Enter your Backend Tunnel URL (e.g. https://xxxx.trycloudflare.com): "

if "%CUSTOM_URL%"=="" (
    echo [ERROR] URL cannot be empty!
    pause
    goto menu
)

cd /d "%~dp0frontend"
echo VITE_API_URL=%CUSTOM_URL%> .env.production
echo [OK] VITE_API_URL=%CUSTOM_URL%
echo.

echo [INFO] Building frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    goto menu
)

echo.
set PROJECT_NAME=polo-shop
set /p PROJECT_NAME="Enter Cloudflare Pages project name [Default: polo-shop]: "
if "%PROJECT_NAME%"=="" set PROJECT_NAME=polo-shop

echo [INFO] Deploying to Cloudflare Pages (%PROJECT_NAME%)...
call npx --yes wrangler pages deploy dist --project-name %PROJECT_NAME%
if errorlevel 1 (
    echo [ERROR] Deployment failed! Run: npx wrangler login
    pause
    goto menu
)

echo.
echo ================================================================
echo    DONE!
echo    Frontend : https://%PROJECT_NAME%.pages.dev
echo    API      : %CUSTOM_URL%
echo ================================================================
echo.
pause
goto menu

REM ================================================================
:run_local
REM ================================================================
cls
echo ================================================================
echo    Run Frontend Locally (Development)
echo ================================================================
echo.
cd /d "%~dp0frontend"
echo [INFO] Starting Vite dev server...
call npm run dev
pause
goto menu

REM ================================================================
:open_dashboard
REM ================================================================
start https://dash.cloudflare.com
goto menu

REM ================================================================
:exit_script
REM ================================================================
echo.
echo Goodbye!
ping 127.0.0.1 -n 2 >nul
exit /b 0

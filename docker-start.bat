@echo off
title Start Docker Containers - POLO SHOP
cd /d "%~dp0"

echo ===================================================
echo   Starting POLO SHOP on Docker...
echo ===================================================

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first and try again.
    echo.
    pause
    exit /b 1
)

docker compose up -d

echo.
echo ===================================================
echo   POLO SHOP Containers Started!
echo ===================================================
echo   - Frontend:    http://localhost:8081
echo   - Backend API: http://localhost:3000
echo   - phpMyAdmin:  http://localhost:8080 (root / rootpassword123)
echo   - MySQL:       localhost:3306
echo ===================================================
echo.
pause

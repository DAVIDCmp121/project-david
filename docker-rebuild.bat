@echo off
title Rebuild ^& Restart Docker Containers - POLO SHOP
cd /d "%~dp0"

echo ===================================================
echo   Rebuilding and Updating Docker Containers...
echo ===================================================

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first and try again.
    echo.
    pause
    exit /b 1
)

docker compose up -d --build

echo.
echo ===================================================
echo   Update Complete!
echo ===================================================
echo   - Frontend:    http://localhost:8081
echo   - Backend API: http://localhost:3000
echo   - phpMyAdmin:  http://localhost:8080
echo ===================================================
echo.
pause

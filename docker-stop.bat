@echo off
title Stop Docker Containers - POLO SHOP
cd /d "%~dp0"

echo Stopping POLO SHOP containers...
docker compose down

echo.
echo All containers stopped.
pause

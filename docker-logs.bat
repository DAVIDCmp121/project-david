@echo off
title View Docker Logs - POLO SHOP
cd /d "%~dp0"

echo Viewing Docker container logs (Ctrl+C to exit)...
docker compose logs -f

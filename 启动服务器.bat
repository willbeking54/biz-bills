@echo off
chcp 65001 >nul
title 经营账单管理系统 - 服务器
echo.
echo ╔══════════════════════════════════════╗
echo ║    📒 经营账单管理系统 - 启动中...  ║
echo ╚══════════════════════════════════════╝
echo.
cd /d "%~dp0"
node server.js
pause

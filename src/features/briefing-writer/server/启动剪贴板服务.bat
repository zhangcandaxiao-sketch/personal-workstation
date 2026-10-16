@echo off
chcp 65001 >nul
title 简讯写作助手 - 剪贴板服务
echo ========================================
echo   简讯写作助手 - 剪贴板路径识别服务
echo ========================================
echo.
echo 服务启动后请保持本窗口开着。
echo 在资源管理器复制文件，回到网页按 Ctrl+V 即可自动识别路径。
echo 关闭本窗口即停止服务。
echo.
node "%~dp0clipboard-server.mjs"
pause

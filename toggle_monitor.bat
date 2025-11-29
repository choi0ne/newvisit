@echo off
setlocal
title FirstVisit Monitor Toggle

if not exist "C:\Newvisit\logs" mkdir "C:\Newvisit\logs"

echo ========================================
echo   FirstVisit Monitor Toggle
echo ========================================
echo(

:: 1) 기존 watch-visit.js 프로세스 있으면 모두 종료
powershell -NoP -C "Get-CimInstance Win32_Process | ? { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'watch-visit\.js' } | % { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

:: 2) 새로 시작
echo [ACTION] Starting monitor (force restart)...
cd /d C:\Newvisit
start /min cmd /c "node watch-visit.js >> logs\monitor.log 2>&1"
echo [DONE] Monitor start command sent.
echo %date% %time% - Monitor Restarted >> "C:\Newvisit\logs\monitor.log"

echo(
timeout /t 2 >nul
endlocal

@echo off
title FirstVisit Morning Startup
echo ========================================
echo   FirstVisit System Startup
echo ========================================
echo(

:: Step 1: Fetch initial patient data
echo [1/2] Fetching patient data from Dongbo...
powershell -ExecutionPolicy Bypass -File "C:\Newvisit\visit_today.ps1"
if %errorlevel% equ 0 (
    echo [OK] Patient data fetched successfully
) else (
    echo [WARNING] Failed to fetch patient data
)
echo(

:: Step 2: Start monitoring process
echo [2/2] Starting real-time monitor...
call "C:\Newvisit\toggle_monitor.bat"

echo(
echo ========================================
echo   Startup Complete
echo ========================================
pause

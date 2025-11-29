@echo off
setlocal
title Setup FirstVisit Schedulers

echo [INFO] Creating Schedulers...

:: 1. Data Fetch Task (Every 10 minutes)
schtasks /create /tn "firstvisit_data_fetch" /tr "powershell -ExecutionPolicy Bypass -File C:\Newvisit\visit_today.ps1" /sc minute /mo 10 /f /rl highest
echo [OK] firstvisit_data_fetch created (Every 10 minutes).

:: 2. Monitor Task (Enabled - starts at 08:00)
schtasks /create /tn "firstvisit_monitor" /tr "node C:\Newvisit\watch-visit.js" /sc daily /st 08:00 /f /rl highest
echo [OK] firstvisit_monitor created (ENABLED at 08:00).

:: 3. Daily Excel Task 1: OfficeCall (7 PM)
:: officecall-export.js now handles data fetching internally
schtasks /create /tn "firstvisit_daily_excel_officecall" /tr "node C:\Newvisit\officecall-export.js" /sc daily /st 19:00 /f /rl highest
echo [OK] firstvisit_daily_excel_officecall created (19:00).

:: 4. Daily Excel Task 2: Revisit Upload (7:05 PM)
schtasks /create /tn "firstvisit_daily_excel_revisit" /tr "node C:\Newvisit\revisit-export.js" /sc daily /st 19:05 /f /rl highest
echo [OK] firstvisit_daily_excel_revisit created (19:05).

:: 5. Monthly Excel Task (1st of Month)
schtasks /create /tn "firstvisit_monthly_excel" /tr "node C:\Newvisit\merge_monthly.js" /sc monthly /d 1 /st 09:00 /f /rl highest
echo [OK] firstvisit_monthly_excel created (Monthly 1st 09:00).

echo [SUCCESS] All tasks registered.
pause

@echo off
chcp 65001 >nul
set TASK=OLDVISIT_WATCHER

echo ================================
echo   Revisit 자동등록 토글 스위치
echo ================================
echo.

:: 상태 확인
schtasks /query /tn "%TASK%" | findstr /i "준비 실행" >nul
if %errorlevel%==0 (
    goto :DISABLE
) else (
    goto :ENABLE
)

:ENABLE
echo 🔵 자동등록: ON
schtasks /change /tn "%TASK%" /enable >nul 2>&1
echo [INFO] OLDVISIT_WATCHER → ENABLE
pause
exit

:DISABLE
echo 🔴 자동등록: OFF
schtasks /change /tn "%TASK%" /disable >nul 2>&1
echo [INFO] OLDVISIT_WATCHER → DISABLE
pause
exit

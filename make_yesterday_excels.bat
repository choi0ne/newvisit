@echo off
setlocal

REM 1) 어제 날짜 YYMMDD 계산
for /f %%A in ('powershell -NoProfile -Command "(Get-Date).AddDays(-1).ToString(\"yyMMdd\")"') do set YESTERDAY_YYMMDD=%%A

echo Yesterday (YYMMDD): %YESTERDAY_YYMMDD%

REM 2) 구글드라이브(KTcall) 목적지 폴더 (실제 경로)
set "DEST=I:\내 드라이브\KTcall"
if not exist "%DEST%" (
  echo DEST folder not found. Creating: "%DEST%"
  mkdir "%DEST%"
)

REM 3) 어제자 기준으로 visit_today.csv 생성 (PowerShell + sqlcmd)
cd /d C:\Newvisit
powershell -ExecutionPolicy Bypass -File "C:\Newvisit\visit_today.ps1" -DaysAgo 1

REM 4) CSV → visit_new.txt 분리 (초진만 JSON으로)
node split_today.js

REM 5) 어제 날짜 기준 엑셀 2개 생성/추가
node create_revisit_files_prevday.js

REM 6) 어제자 엑셀 2개를 구글드라이브(I:)로 복사 (있을 때만)
if exist "C:\Newvisit\revisit_upload_%YESTERDAY_YYMMDD%.xlsx" (
  copy /Y "C:\Newvisit\revisit_upload_%YESTERDAY_YYMMDD%.xlsx" "%DEST%\revisit_upload_%YESTERDAY_YYMMDD%.xlsx"
)

if exist "C:\Newvisit\officecall_ready_%YESTERDAY_YYMMDD%.xlsx" (
  copy /Y "C:\Newvisit\officecall_ready_%YESTERDAY_YYMMDD%.xlsx" "%DEST%\officecall_ready_%YESTERDAY_YYMMDD%.xlsx"
)

echo Done.
pause
endlocal

@echo off
cd /d C:\Oldvisit

:: 1) 오늘자 환자 CSV → visit_new, revisit_queue 생성
powershell -ExecutionPolicy Bypass -File "C:\Oldvisit\visit_today.ps1"
node "C:\Oldvisit\split_today.js"

:: 2) 자동으로 리비짓 등록
node "C:\Oldvisit\revisit_dom_register.js"

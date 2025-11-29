@echo off
powershell -ExecutionPolicy Bypass -File "C:\Oldvisit\visit_today.ps1"
node "C:\Oldvisit\split_today.js"

@echo off
cd /d C:\Newvisit

for %%D in (
    20251101 20251102 20251103 20251104 20251105
    20251106 20251107 20251108 20251109 20251110
    20251111 20251112 20251113 20251114 20251115
    20251116 20251117 20251118 20251119 20251120
) do (
    node split_by_date.js %%D
    node revisit-export2.js %%D
    node officecall-export2.js %%D
)

echo 완료!
pause

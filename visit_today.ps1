# ---------------------------------------------------------
# C:\Oldvisit\visit_today.ps1 (최종본)
# ---------------------------------------------------------

$csvPath = "C:\Oldvisit\visit_today.csv"

# 오늘 날짜 기준 쿼리
$sql = @"
SET NOCOUNT ON;
SELECT 
    D.da_CustID   AS CustID,
    C.cm_CustName AS Name,
    C.cm_Sex      AS Sex,
    C.cm_Birth    AS Birth,
    C.cm_HP       AS Mobile,
    C.cm_Tel      AS Tel
FROM DigAccept D
LEFT JOIN CustMast C ON D.da_CustID = C.cm_CustID
WHERE D.da_AccDate = CONVERT(char(8), GETDATE(), 112)
ORDER BY D.da_AccTime;
"@

# 1. 헤더 생성 (UTF8)
"CustID,Name,Sex,Birth,Mobile,Tel" | Out-File -Encoding UTF8 $csvPath

# 2. 데이터 추가 (쉼표 분리)
sqlcmd -S "MAINNN\SQLEXPRESS" -d BogamDB -W -s"," -h -1 -Q $sql | Out-File -Encoding UTF8 -Append $csvPath

Write-Host "Generated: $csvPath"
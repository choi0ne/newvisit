param(
    [string]$Date   # YYYYMMDD
)

$sql = @"
SET NOCOUNT ON;

SELECT 
    D.da_CustID       AS CustID,
    C.cm_CustName     AS Name,
    C.cm_Sex          AS Sex,
    C.cm_Birth        AS Birth,
    D.da_AccDate      AS VisitDate,
    D.da_AccTime      AS VisitTime,
    C.cm_Tel          AS Tel,
    C.cm_HP           AS Mobile,
    C.cm_InsuName     AS Insurance,
    CASE 
        WHEN (SELECT COUNT(*) FROM DigAccept WHERE da_CustID = D.da_CustID) = 1 THEN '1'
        ELSE CASE
            WHEN (
                SELECT TOP 1 Sub.da_AccDate 
                FROM DigAccept Sub 
                WHERE Sub.da_CustID = D.da_CustID 
                  AND Sub.da_AccDate < D.da_AccDate
                ORDER BY Sub.da_AccDate DESC
            ) <= CONVERT(char(8), DATEADD(month, -3, GETDATE()), 112)
            THEN '3'
            ELSE '2'
        END
    END AS VisitType
FROM DigAccept D
LEFT JOIN CustMast C ON D.da_CustID = C.cm_CustID
WHERE D.da_AccDate = '$Date'
ORDER BY D.da_AccTime;
"@

$csv = "C:\Newvisit\visit_$Date.csv"

"CustID,Name,Sex,Birth,VisitDate,VisitTime,Tel,Mobile,Insurance,VisitType" | Out-File -Encoding UTF8 $csv
sqlcmd -S "MAINNN\SQLEXPRESS" -d BogamDB -W -s"," -h -1 -Q $sql | Out-File -Encoding UTF8 -Append $csv

Write-Host "✔ CSV 생성: $csv"

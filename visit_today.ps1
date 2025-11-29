# C:\revisit\visit_today.ps1
# 동의보감 DB에서 오늘 방문자 리스트를 CSV로 저장
# VisitType: 1 = 초진, 2 = 재진

param(
    [int]$DaysAgo = 0   # 0 = 오늘, 1 = 어제, 2 = 그제 ...
)

# 기준 날짜 (yyyyMMdd)
$targetDate = (Get-Date).AddDays(-$DaysAgo).ToString("yyyyMMdd")

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

    -- ★ 초진/재진/재초진 구분
    -- 1 = 초진 (생애 첫 방문)
    -- 2 = 재진 (3개월 이내 재방문)
    -- 3 = 재초진 (마지막 방문 후 3개월 경과)
    CASE 
        -- 1. 생애 첫 방문 (Count = 1)
        WHEN (
            SELECT COUNT(*) 
            FROM DigAccept 
            WHERE da_CustID = D.da_CustID
        ) = 1 THEN '1'
        
        ELSE 
            -- 2. 과거 방문 기록이 있는 경우, 마지막 방문일 확인
            CASE 
                WHEN (
                    SELECT TOP 1 Sub.da_AccDate 
                    FROM DigAccept Sub 
                    WHERE Sub.da_CustID = D.da_CustID 
                      AND Sub.da_AccDate < D.da_AccDate -- 오늘 이전의 방문 기록
                    ORDER BY Sub.da_AccDate DESC
                ) <= CONVERT(char(8), DATEADD(month, -3, GETDATE()), 112) THEN '3' -- 3개월 지남 -> 재초진
                ELSE '2' -- 3개월 이내 -> 재진
            END
    END AS VisitType

FROM DigAccept D
LEFT JOIN CustMast C ON D.da_CustID = C.cm_CustID

-- 오늘 날짜 기준
WHERE D.da_AccDate = '$targetDate'

ORDER BY D.da_AccTime;
"@

$csvPath = "C:\Newvisit\visit_today.csv"

# 헤더 1줄
"CustID,Name,Sex,Birth,VisitDate,VisitTime,Tel,Mobile,Insurance,VisitType" |
Out-File -Encoding UTF8 $csvPath

# 데이터 (쉼표 CSV)
sqlcmd -S "MAINNN\SQLEXPRESS" -d BogamDB -W -s"," -h -1 -Q $sql |
Out-File -Encoding UTF8 -Append $csvPath

# ---------------------------------------------------------
# 추가: auto_ready_upload.csv (고정폭 텍스트 형식, 헤더 포함)
# ---------------------------------------------------------
$fixedSql = @"
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
    C.cm_InsuName     AS Insurance
FROM DigAccept D
LEFT JOIN CustMast C ON D.da_CustID = C.cm_CustID
WHERE D.da_AccDate = CONVERT(char(8), GETDATE(), 112)
ORDER BY D.da_AccTime;
"@

$fixedPath = "C:\Newvisit\auto_ready_upload.csv"

# sqlcmd 기본 출력 (고정폭) 사용. -W 옵션 제거(또는 조정)하여 포맷 유지
# -Y 30: 텍스트 컬럼 최대폭 제한 (필요시)
sqlcmd -S "MAINNN\SQLEXPRESS" -d BogamDB -Y 30 -Q $fixedSql |
Out-File -Encoding UTF8 $fixedPath

Write-Host "Generated: $csvPath"
Write-Host "Generated: $fixedPath"


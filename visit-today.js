/**
 * visit_today.csv 생성기 (Node.js 버전)
 * 동보(DB)에서 특정 날짜 방문 환자를 읽어서 CSV로 저장
 *
 * 사용법:
 *   오늘 기준:   node visit-today.js
 *   어제 기준:   node visit-today.js 1
 *   그제 기준:   node visit-today.js 2
 */

const fs = require("fs");
const sql = require("mssql");
const dayjs = require("dayjs");

// 📌 SQL Server 설정 (원장님 병원 DB 정보 그대로)
const config = {
  user: "sa",
  password: "3867B72847154718D748F7E7B69518",
  server: "192.168.0.198",
  database: "BogamDB",
  options: { encrypt: false, trustServerCertificate: true },
};

// DaysAgo 인자 처리 (기본 0 = 오늘)
const arg = process.argv[2];
let daysAgo = parseInt(arg, 10);
if (isNaN(daysAgo)) daysAgo = 0;

// 기준 날짜 (YYYYMMDD)
const targetDate = dayjs().subtract(daysAgo, "day").format("YYYYMMDD");
const CSV_PATH = "C:\\Newvisit\\visit_today.csv";

(async () => {
  try {
    console.log(
      `▶ visit-today.js 실행 - 기준 날짜: ${targetDate} (DaysAgo=${daysAgo})`
    );

    await sql.connect(config);

    // ❗ 중요: 아래 쿼리는 오늘방문자 뷰/테이블에
    //  - 이름, 전화번호, 주민번호, 차트번호, 재진구분, 접수일자, 최초내원일 컬럼이 있다는 가정
    //  - 접수일자를 기준으로 targetDate 필터
    const query = `
      SELECT 
        이름       AS name,
        전화번호   AS phone,
        주민번호   AS jumin,
        차트번호   AS chart,
        재진구분   AS type,
        접수일자   AS date,
        최초내원일 AS first_visit
      FROM 오늘방문자
      WHERE CONVERT(char(8), 접수일자, 112) = '${targetDate}'
    `;

    const result = await sql.query(query);
    const rows = result.recordset;

    // CSV 헤더: split_today.js가 기대하는 컬럼명
    const header = "name,phone,jumin,chart,type,date,first_visit\n";

    if (!rows || rows.length === 0) {
      console.log(
        `⚠ ${targetDate} 기준 방문자 없음 → 헤더만 있는 CSV 저장: ${CSV_PATH}`
      );
      fs.writeFileSync(CSV_PATH, header, "utf8");
      process.exit(0);
    }

    let csv = header;
    for (const r of rows) {
      // null/undefined 방지
      const name = (r.name || "").trim();
      const phone = (r.phone || "").trim();
      const jumin = (r.jumin || "").trim();
      const chart = (r.chart || "").trim();
      const type = (r.type || "").trim();

      // 날짜 포맷팅 (YYYYMMDD)
      let dateStr = "";
      if (r.date) {
        dateStr = dayjs(r.date).format("YYYYMMDD");
      }

      // 최초내원일 포맷팅
      let firstVisitStr = "";
      if (r.first_visit) {
        firstVisitStr = dayjs(r.first_visit).format("YYYYMMDD");
      }

      csv += `${name},${phone},${jumin},${chart},${type},${dateStr},${firstVisitStr}\n`;
    }

    fs.writeFileSync(CSV_PATH, csv, "utf8");
    console.log(`✔ visit_today.csv 생성 완료 (${rows.length}명) → ${CSV_PATH}`);
  } catch (err) {
    console.error("❌ DB 연결 또는 쿼리 오류:", err);
    // 에러 나도 빈 파일은 만들어둠 (후속 스크립트 에러 방지)
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(
        CSV_PATH,
        "name,phone,jumin,chart,type,date,first_visit\n",
        "utf8"
      );
    }
  } finally {
    try {
      await sql.close();
    } catch (e) {
      /* ignore */
    }
  }
})();

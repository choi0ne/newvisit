// 사용법: node revisit-export.js 20251110
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const BASE = "C:/Newvisit";
const OUT_DRIVE = "F:/내 드라이브/KTcall";  // 자동탐색 버전 가능하면 나중에 넣음

const day = process.argv[2];
if (!day) {
    console.error("❌ 날짜 필요: node revisit-export.js 20251110");
    process.exit(1);
}

// 날짜 → YYMMDD
const yy = day.slice(2, 4);
const mm = day.slice(4, 6);
const dd = day.slice(6, 8);
const target = `${yy}${mm}${dd}`;

const NEW_FILE = `${BASE}/visit_new.txt`;

if (!fs.existsSync(NEW_FILE)) {
    console.error(`❌ visit_new.txt 없음`);
    process.exit(1);
}

let patients = JSON.parse(fs.readFileSync(NEW_FILE, "utf8"));

// 주민번호 변환 함수
function formatResidentId(birth, sex) {
    if (!birth) return "";
    const digits = String(birth).replace(/\D/g, "");
    if (digits.length !== 8) return "";

    const year = parseInt(digits.slice(0,4));
    const yy = digits.slice(2,4);
    const mmdd = digits.slice(4);

    const male = sex === "남";
    let code;

    if (year < 2000) code = male ? "1" : "2";
    else code = male ? "3" : "4";

    return `${yy}${mmdd}-${code}`;
}

// Revisit 파일 생성
const rows = patients.map(p => ({
    차트번호: p.CustID,
    이름: p.Name,
    전화번호: p.Mobile,
    주민등록번호: formatResidentId(p.Birth, p.Sex),
    주소: p.Address,
    최종내원일: "",
    보험유형: p.Insurance,
    태그: "",
}));

const fileLocal = `${BASE}/revisit_upload_${target}.xlsx`;
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(rows), "Sheet1");
xlsx.writeFile(workbook, fileLocal);

console.log("✔ Revisit 생성:", fileLocal);

// 구글 드라이브 이동
const fileDrive = `${OUT_DRIVE}/revisit_upload_${target}.xlsx`;
try {
    fs.copyFileSync(fileLocal, fileDrive);
    console.log("✔ KTcall 이동:", fileDrive);
} catch (e) {
    console.log("⚠ 이동 실패:", e.message);
}

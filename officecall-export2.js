// 사용법: node officecall-export.js 20251110
const fs = require("fs");
const xlsx = require("xlsx");

const BASE = "C:/Newvisit";
const OUT_DRIVE = "F:/내 드라이브/KTcall";

const day = process.argv[2];
if (!day) {
    console.error("❌ 날짜 필요: node officecall-export.js 20251110");
    process.exit(1);
}

const yy = day.slice(2,4);
const mm = day.slice(4,6);
const dd = day.slice(6,8);
const target = `${yy}${mm}${dd}`;

const NEW_FILE = `${BASE}/visit_new.txt`;
const SRC_FILE = `${BASE}/visit_${day}.csv`;

let newIDs = JSON.parse(fs.readFileSync(NEW_FILE,"utf8"));
let csv = fs.readFileSync(SRC_FILE,"utf8").trim().split("\n");

const header = ["이름","전화번호","생년월일","성별","메모"];
let rows = [header];

csv.forEach(line => {
    const cols = line.split(",");
    const chart = cols[0];
    if (!newIDs.includes(chart)) return;

    const name = cols[1];
    const sex = cols[2];
    const birth = cols[3].slice(2); // YYMMDD
    const mobile = cols[7];

    rows.push([name,mobile,birth,sex,""]);
});

// 엑셀 저장
const out = `${BASE}/officecall_ready_${target}.xlsx`;
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(rows), "KT_OfficeCall");
xlsx.writeFile(wb, out);

console.log("✔ KTCall 생성:", out);

// 이동
try {
    fs.copyFileSync(out, `${OUT_DRIVE}/officecall_ready_${target}.xlsx`);
} catch (e) {
    console.log("⚠ 이동 실패:", e.message);
}

const fs = require("fs");
const path = require("path");

const day = process.argv[2]; // YYYYMMDD
if (!day) {
    console.error("❌ 날짜 필요: node split_by_date.js 20251110");
    process.exit(1);
}

const BASE = "C:/Newvisit";
const CSV_FILE = `${BASE}/visit_${day}.csv`;
const NEW_FILE = `${BASE}/visit_new.txt`;
const LIST_FILE = `${BASE}/visit_list.txt`;

if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV 없음: ${CSV_FILE}`);
    process.exit(1);
}

const lines = fs.readFileSync(CSV_FILE, "utf8").trim().split("\n");
let newPatients = [];
let listPatients = [];

lines.forEach(line => {
    const cols = line.split(",");
    const CustID = cols[0];
    const VisitType = cols[9];

    if (!CustID || CustID === "CustID") return;

    if (VisitType === "1") newPatients.push(CustID);
    listPatients.push(CustID);
});

fs.writeFileSync(NEW_FILE, JSON.stringify(newPatients, null, 2));
fs.writeFileSync(LIST_FILE, JSON.stringify(listPatients, null, 2));

console.log(`✔ split_by_date 완료: ${day}`);

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const dayjs = require("dayjs");

// 📂 원본 폴더
const SRC_DIR = "C:\\Revisit";

// 📌 구글 드라이브 자동 탐색
function findGoogleDriveKTcallMonthly() {
    const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    for (const letter of driveLetters) {
        const base = `${letter}:\\`;
        if (!fs.existsSync(base)) continue;

        const candidates = [
            path.join(base, "My Drive", "KTcall", "Monthly"),
            path.join(base, "내 드라이브", "KTcall", "Monthly"),
        ];

        for (const dir of candidates) {
            if (fs.existsSync(dir)) {
                console.log(`✔ Monthly 폴더 감지됨: ${dir}`);
                return dir;
            }
        }
    }

    return null;
}

// 📌 Monthly 폴더를 자동 찾거나 없으면 생성
function getOrCreateMonthlyDir() {
    let dir = findGoogleDriveKTcallMonthly();

    if (!dir) {
        console.log("⚠ Monthly 폴더를 찾지 못했습니다.");
        console.log("➡ 자동 생성 위치 탐색 중…");

        const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

        for (const letter of driveLetters) {
            const base = `${letter}:\\`;
            if (!fs.existsSync(base)) continue;

            // My Drive 기준 우선 생성
            const candidate1 = path.join(base, "My Drive", "KTcall", "Monthly");
            const candidate2 = path.join(base, "내 드라이브", "KTcall", "Monthly");

            try {
                fs.mkdirSync(candidate1, { recursive: true });
                console.log(`✔ Monthly 폴더 생성됨: ${candidate1}`);
                return candidate1;
            } catch {}

            try {
                fs.mkdirSync(candidate2, { recursive: true });
                console.log(`✔ Monthly 폴더 생성됨: ${candidate2}`);
                return candidate2;
            } catch {}
        }

        throw new Error("❌ Monthly 폴더를 생성할 수 있는 위치를 찾지 못했습니다.");
    }

    return dir;
}

const MONTHLY_DIR = getOrCreateMonthlyDir();

// 지난달 계산
const now = dayjs();
const targetMonth = now.subtract(1, "month").format("YYYY-MM");
const targetYM = now.subtract(1, "month").format("YYMM");

console.log(`▶ 월간 병합 시작: ${targetMonth}`);

// 파일 패턴
const KT_PREFIX = "officecall_ready_";
const RV_PREFIX = "revisit_upload_";

// 병합 함수
function mergeFiles(prefix, outputName) {
    const rows = [];
    const files = fs.readdirSync(SRC_DIR);

    files.forEach((file) => {
        if (!file.startsWith(prefix)) return;

        const datePart = file.replace(prefix, "").substring(0, 4);
        if (datePart !== targetYM) return;

        const fullPath = path.join(SRC_DIR, file);
        const wb = xlsx.readFile(fullPath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(ws);

        rows.push(...json);
        console.log(`  ✔ 포함: ${file} (${json.length}행)`);
    });

    if (rows.length === 0) {
        console.log(`  ⚠ ${outputName} : 지난달 데이터 없음`);
        return;
    }

    const wbOut = xlsx.utils.book_new();
    const wsOut = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wbOut, wsOut, "Data");

    const outPath = path.join(MONTHLY_DIR, outputName);
    xlsx.writeFile(wbOut, outPath);

    console.log(`  ▶ 저장 완료 → ${outPath}`);
}

// 🔵 KTCall 월간 파일 생성
mergeFiles(KT_PREFIX, `officecall_monthly_${targetMonth}.xlsx`);

// 🔵 Revisit 월간 파일 생성
mergeFiles(RV_PREFIX, `revisit_monthly_${targetMonth}.xlsx`);

console.log("🎉 월간 병합 완료!");

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const BASE_DIR = "C:\\Newvisit";
const NEW_PATIENT_FILE = path.join(BASE_DIR, "visit_new.txt");

// 오늘 날짜 → YYMMDD
function getTodayYYMMDD() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
}

const target = getTodayYYMMDD();

// ───────── 유틸 함수 ─────────
function formatResidentId(birth, sex) {
    if (!birth) return "";
    const digits = String(birth).replace(/\D/g, "");
    if (digits.length !== 8) return "";

    const year = parseInt(digits.slice(0, 4), 10);
    const yy = digits.slice(2, 4);
    const mmdd = digits.slice(4, 8);

    const male = sex === "남" || sex === "M" || sex === "m";
    const female = sex === "여" || sex === "F" || sex === "f";
    if (!male && !female) return "";

    let code = year < 2000 ? (male ? "1" : "2") : (male ? "3" : "4");

    return `${yy}${mmdd}-${code}`;
}

function saveXlsx(filePath, sheetName, rows) {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
    xlsx.writeFile(wb, filePath);
}

// ───────── 구글 드라이브 자동 탐색 ─────────
function findGoogleDriveKTcall() {
    const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    for (const letter of driveLetters) {
        const base = `${letter}:\\`;
        if (!fs.existsSync(base)) continue;

        // 1) My Drive / 내 드라이브 모두 체크
        const candidates = [
            path.join(base, "My Drive", "KTcall"),
            path.join(base, "내 드라이브", "KTcall"),
        ];

        for (const dir of candidates) {
            if (fs.existsSync(dir)) {
                console.log(`✔ 구글 드라이브 경로 자동 감지됨: ${dir}`);
                return dir;
            }
        }
    }

    return null;
}

// ───────── 메인 ─────────
(function main() {
    console.log("=== revisit-export.js (자동 구글드라이브 탐색 버전) 시작 ===");

    if (!fs.existsSync(NEW_PATIENT_FILE)) {
        console.log(`❌ 초진 파일 없음: ${NEW_PATIENT_FILE}`);
        return;
    }

    const raw = fs.readFileSync(NEW_PATIENT_FILE, "utf8").trim();
    if (!raw) {
        console.log("❌ visit_new.txt 비어 있음");
        return;
    }

    let allNewPatients;
    try {
        allNewPatients = JSON.parse(raw);
    } catch (e) {
        console.error("❌ JSON 파싱 실패:", e.message);
        return;
    }

    if (!Array.isArray(allNewPatients) || allNewPatients.length === 0) {
        console.log("❌ 초진 목록 없음");
        return;
    }

    console.log(`▶ 오늘자 Revisit 업로드 파일 생성: ${allNewPatients.length}명`);

    const revisitRows = allNewPatients.map((p) => {
        const jumin = formatResidentId(p.Birth, p.Sex);
        return {
            차트번호: p.CustID,
            이름: (p.Name || "").trim(),
            전화번호: (p.Mobile || p.Tel || "").replace(/-/g, ""),
            주민등록번호: jumin,
            주소: p.Address || "",
            최종내원일: "",
            보험유형: p.Insurance || "",
            태그: "",
        };
    });

    const revisitFile = path.join(BASE_DIR, `revisit_upload_${target}.xlsx`);
    saveXlsx(revisitFile, "Sheet1", revisitRows);
    console.log(`✔ 로컬 생성 완료: ${revisitFile}`);

    // ───── 자동 탐색 후 복사 ─────
    const drivePath = findGoogleDriveKTcall();

    if (!drivePath) {
        console.log("⚠️ 구글 드라이브 KTcall 폴더를 찾지 못했습니다.");
        return;
    }

    const destPath = path.join(drivePath, `revisit_upload_${target}.xlsx`);

    try {
        fs.copyFileSync(revisitFile, destPath);
        console.log(`✔ 구글 드라이브 복사 완료: ${destPath}`);
    } catch (e) {
        console.error("❌ 복사 실패:", e.message);
    }

    console.log("✅ 실행 완료");
})();

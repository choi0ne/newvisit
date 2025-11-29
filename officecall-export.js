const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");
const { execSync } = require("child_process");

const BASE_DIR = "C:/Newvisit";
const NEW_PATIENT_FILE = `${BASE_DIR}/new_patients.json`;
const SRC = `${BASE_DIR}/visit_today.csv`;

// ───────────────────── 날짜 생성 (YYMMDD) ─────────────────────
const today = new Date();
const yy = String(today.getFullYear()).slice(2);
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const dateStr = `${yy}${mm}${dd}`;

// Newvisit에 저장되는 temp 파일
const LOCAL_FILE = `${BASE_DIR}/officecall_ready_${dateStr}.xlsx`;

// ───────────────────── 구글드라이브 자동 탐색 ─────────────────────
function findGoogleDriveKTcall() {
    const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    for (const letter of driveLetters) {
        const base = `${letter}:\\`;
        if (!fs.existsSync(base)) continue;

        const candidates = [
            path.join(base, "My Drive", "KTcall"),
            path.join(base, "내 드라이브", "KTcall")
        ];

        for (const dir of candidates) {
            if (fs.existsSync(dir)) {
                console.log(`✔ 구글드라이브 경로 자동 감지됨: ${dir}`);
                return dir;
            }
        }
    }
    return null;
}

// ───────────────────── 외부 스크립트 실행 ─────────────────────
function runScript(command, desc) {
    try {
        console.log(`▶ [${desc}] 실행 중...`);
        execSync(command, { stdio: "inherit", cwd: __dirname });
        console.log(`✔ [${desc}] 완료`);
    } catch (error) {
        console.error(`❌ [${desc}] 실패:`, error.message);
        process.exit(1);
    }
}

// ───────────────────── 메인 실행 ─────────────────────
(async () => {
    // 1. 데이터 업데이트
    runScript('powershell -ExecutionPolicy Bypass -File "C:\\Newvisit\\visit_today.ps1"', "데이터 가져오기");

    // 2. 신규 환자 분리
    runScript('node split_today.js', "초진 분리");

    try {
        // 신규 환자 파일 존재 여부
        if (!fs.existsSync(NEW_PATIENT_FILE)) {
            console.log("new_patients.json 없음 → 신규 없음으로 처리");
            fs.writeFileSync(NEW_PATIENT_FILE, JSON.stringify([]));
        }

        const newPatients = JSON.parse(fs.readFileSync(NEW_PATIENT_FILE, "utf8"));
        console.log("▶ 신규 환자 차트번호:", newPatients.join(", "));

        if (!fs.existsSync(SRC)) throw new Error("visit_today.csv 없음");
        const content = fs.readFileSync(SRC, "utf8").trim();
        if (!content) throw new Error("visit_today.csv 내용 없음");

        const lines = content.split("\n");
        const header = ["이름", "전화번호", "생년월일", "성별", "메모"];
        const rows = [header];

        for (const line of lines) {
            const cols = line.split(",");

            const chart = cols[0]?.trim();
            const name = cols[1]?.trim();
            const sex = cols[2]?.trim();
            const birth = cols[3]?.trim();
            const mobile = cols[7]?.trim();

            if (!chart || chart === "CustID") continue;
            if (!newPatients.includes(chart)) continue;

            const birthShort = birth?.slice(2, 8) || "";
            rows.push([name, mobile, birthShort, sex, ""]);
        }

        // 3. Newvisit 폴더에 먼저 생성
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "KT_OfficeCall");

        XLSX.writeFile(wb, LOCAL_FILE);
        console.log(`✔ 로컬 생성 완료: ${LOCAL_FILE}`);

        // 4. 구글드라이브 자동 탐색 → 이동
        const drivePath = findGoogleDriveKTcall();

        if (!drivePath) {
            console.log("⚠ 구글드라이브(KTcall) 폴더를 찾지 못했습니다.");
            console.log("⚠ 파일은 Newvisit에 그대로 보관됩니다.");
        } else {
            const destFile = path.join(drivePath, `officecall_ready_${dateStr}.xlsx`);

            try {
                fs.copyFileSync(LOCAL_FILE, destFile);
                console.log(`✔ 구글드라이브로 이동 완료: ${destFile}`);

                // 원본 삭제
                fs.unlinkSync(LOCAL_FILE);
                console.log("✔ 로컬 파일 삭제 완료");
            } catch (e) {
                console.error("❌ 이동 중 오류:", e.message);
            }
        }

        // 5. 신규 환자 초기화
        fs.writeFileSync(NEW_PATIENT_FILE, JSON.stringify([]));
        console.log("✔ new_patients.json 초기화 완료");

    } catch (err) {
        console.error("❌ officecall-export.js 오류:", err);
        process.exit(1);
    }
})();

const fs = require("fs");
const path = require("path");
const archiver = require("archiver"); // zip 생성 패키지
const dayjs = require("dayjs");

// 구글 드라이브 KTcall 자동 탐색
function findKTcallDir() {
    const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    for (const letter of driveLetters) {
        const base = `${letter}:\\`;
        if (!fs.existsSync(base)) continue;

        const candidates = [
            path.join(base, "My Drive", "KTcall"),
            path.join(base, "내 드라이브", "KTcall"),
        ];

        for (const dir of candidates) {
            if (fs.existsSync(dir)) return dir;
        }
    }
    return null;
}

const KT_DIR = findKTcallDir();
if (!KT_DIR) {
    console.log("❌ KTcall 폴더 탐색 실패");
    process.exit(1);
}

console.log("✔ KTcall 폴더:", KT_DIR);

// 지난달 계산
const now = dayjs();
const ym = now.subtract(1, "month").format("YYMM");
const ymFull = now.subtract(1, "month").format("YYYY-MM");

// ZIP 파일 이름
const zipName = `DailyBackup_${ymFull}.zip`;
const zipPath = path.join(KT_DIR, zipName);

// 압축 대상 파일 스캔
const files = fs.readdirSync(KT_DIR);
const targets = files.filter(f =>
    (f.startsWith("officecall_ready_" + ym) ||
     f.startsWith("revisit_upload_" + ym)) &&
    f.endsWith(".xlsx")
);

if (targets.length === 0) {
    console.log(`⚠ 지난달(${ymFull}) Daily 파일 없음`);
    process.exit(0);
}

console.log(`▶ 압축할 파일 ${targets.length}개 발견:`);

// ZIP 생성
const output = fs.createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
    console.log(`✔ ZIP 생성 완료: ${zipName}`);

    // 압축 성공 후 원본 삭제
    targets.forEach(f => {
        fs.unlinkSync(path.join(KT_DIR, f));
    });
    console.log("✔ Daily 원본 파일 삭제 완료");
});

archive.on("error", err => { throw err; });

archive.pipe(output);

// 파일 zip에 추가
targets.forEach(f => {
    console.log("  +", f);
    archive.file(path.join(KT_DIR, f), { name: f });
});

archive.finalize();

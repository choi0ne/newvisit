// C:\Newvisit\create_revisit_files_prevday.js
// "어제 날짜" 기준으로
// 1. C:\Newvisit\ 에 두 파일 생성
//    - revisit_upload_YYMMDD.xlsx
//    - officecall_ready_YYMMDD.xlsx
// 2. 생성된 두 파일을 (자동 탐색한) 구글드라이브 KTcall 폴더로 이동
// 3. C:\Newvisit\ 에 있는 원본 파일 삭제 (이동 성공 시에만)

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const BASE_DIR = "C:\\Newvisit";
const NEW_PATIENT_FILE = path.join(BASE_DIR, "visit_new.txt");

// 어제 날짜 → YYMMDD
function getPrevYYMMDD() {
  const now = new Date();
  const y = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 어제
  const yy = String(y.getFullYear()).slice(2);
  const mm = String(y.getMonth() + 1).padStart(2, "0");
  const dd = String(y.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

const target = getPrevYYMMDD();
const PROCESSED_FILE = path.join(BASE_DIR, `processed_new_${target}.json`);

// ───────── 유틸 함수 ─────────
function loadJsonSafe(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const txt = fs.readFileSync(filePath, "utf8").trim();
    if (!txt) return defaultValue;
    return JSON.parse(txt);
  } catch (e) {
    console.error("JSON 로드 실패:", filePath, e.message);
    return defaultValue;
  }
}

function saveJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function formatResidentId(birth, sex) {
  if (!birth) return "";
  const digits = String(birth).replace(/\D/g, "");
  if (digits.length !== 8) return "";

  const year = parseInt(digits.slice(0, 4), 10);
  const yy = digits.slice(2, 4);
  const mmdd = digits.slice(4, 8);

  const male = sex === "남" || sex === "M" || sex === "m";
  let code;
  if (year < 2000) {
    code = male ? "1" : "2";
  } else {
    code = male ? "3" : "4";
  }
  return `${yy}${mmdd}-${code}`;
}

function formatBirth6(birth) {
  if (!birth) return "";
  const digits = String(birth).replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return digits.slice(2); // YYMMDD
}

function appendJsonToXlsx(filePath, sheetName, newRows, headerOrder = null) {
  let allRows = [];
  if (fs.existsSync(filePath)) {
    try {
      const oldWb = xlsx.readFile(filePath);
      const oldWs = oldWb.Sheets[sheetName] || oldWb.Sheets[oldWb.SheetNames[0]];
      allRows = xlsx.utils.sheet_to_json(oldWs, { defval: "" });
    } catch (e) {
      console.error(`⚠ 기존 엑셀 읽기 실패, 새로 생성: ${filePath}`);
    }
  }

  allRows = allRows.concat(newRows);
  const wb = xlsx.utils.book_new();
  const options = headerOrder ? { header: headerOrder } : {};
  const ws = xlsx.utils.json_to_sheet(allRows, options);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  xlsx.writeFile(wb, filePath);
}

// ───────── 구글드라이브 KTcall 자동 탐색 ─────────
// C~Z 드라이브 순회 → My Drive/내 드라이브 → KTcall 폴더 찾기
function findGoogleDriveKTcall() {
  const driveLetters = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (const letter of driveLetters) {
    const base = `${letter}:\\`;
    if (!fs.existsSync(base)) continue;

    const candidates = [
      path.join(base, "My Drive", "KTcall"),
      path.join(base, "내 드라이브", "KTcall"),
    ];

    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        console.log(`✔ 구글 드라이브 KTcall 폴더 자동 감지: ${dir}`);
        return dir;
      }
    }
  }

  return null;
}

// [핵심] 파일 이동 함수 (드라이브 간 이동 고려: 복사 후 삭제)
function moveFile(srcPath, destDir) {
  try {
    const fileName = path.basename(srcPath);
    const destPath = path.join(destDir, fileName);

    // 목적지 폴더가 없으면 생성
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // 복사
    fs.copyFileSync(srcPath, destPath);

    // 원본 삭제
    fs.unlinkSync(srcPath);

    console.log(`✔ 이동 완료: ${fileName} -> ${destDir}`);
  } catch (err) {
    console.error(`❌ 파일 이동 실패 (${srcPath}):`, err.message);
  }
}

// ───────── 메인 ─────────
(function main() {
  console.log("=== create_revisit_files_prevday (어제 날짜용) 시작 ===");
  console.log("  대상 날짜(YYMMDD):", target);

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
    console.error("❌ visit_new.txt JSON 파싱 실패:", e.message);
    return;
  }

  const processedIds = loadJsonSafe(PROCESSED_FILE, []);
  const processedSet = new Set(processedIds.map(String));

  const newOnes = allNewPatients.filter((p) => {
    const id = String(p.CustID || "").trim();
    if (!id) return false;
    return !processedSet.has(id);
  });

  if (newOnes.length === 0) {
    console.log("▶ 새로 추가할 초진 없음");
    return;
  }

  console.log(`▶ 추가 대상: ${newOnes.length}명 (날짜: ${target})`);

  // 데이터 매핑
  const revisitRows = newOnes.map((p) => ({
    차트번호: p.CustID,
    이름: p.Name,
    전화번호: p.Mobile || p.Tel || "",
    주민등록번호: formatResidentId(p.Birth, p.Sex),
    주소: p.Address || "",
    최종내원일: "",
    보험유형: p.Insurance || "",
    태그: "",
  }));

  const ktRows = newOnes.map((p) => ({
    "성명": p.Name || "",
    "그룹": "/2층환자분",
    "휴대폰 전화번호": p.Mobile || p.Tel || "",
    "사무실 전화번호": p.Tel || "",
    "집 전화번호": "",
    "팩스 전화번호": "",
    "회사명": "",
    "부서": "",
    "직책": "",
    "담당업무": "",
    "우편번호": "",
    "주소": p.Address || "",
    "이메일": "",
    "인물메모": String(p.CustID || ""),
    "생년월일": formatBirth6(p.Birth),
    "양(1)/음(0)": "",
    "인맥분류": "",
    "만난상황": "",
    "추천인": "",
    "관심사": "",
  }));

  const KT_HEADER = [
    "성명", "그룹", "휴대폰 전화번호", "사무실 전화번호", "집 전화번호",
    "팩스 전화번호", "회사명", "부서", "직책", "담당업무", "우편번호",
    "주소", "이메일", "인물메모", "생년월일", "양(1)/음(0)",
    "인맥분류", "만난상황", "추천인", "관심사",
  ];

  // 1. 파일 이름 정의
  const fileNameRevisit = `revisit_upload_${target}.xlsx`;
  const fileNameKT = `officecall_ready_${target}.xlsx`;

  // 2. 생성 경로 (C드라이브)
  const srcRevisit = path.join(BASE_DIR, fileNameRevisit);
  const srcKT = path.join(BASE_DIR, fileNameKT);

  // 3. 파일 생성 (C드라이브에 먼저 생성)
  appendJsonToXlsx(srcRevisit, "Sheet1", revisitRows);
  console.log(`✔ 생성됨 (C:): ${fileNameRevisit}`);

  appendJsonToXlsx(srcKT, "Addressbook Sheet", ktRows, KT_HEADER);
  console.log(`✔ 생성됨 (C:): ${fileNameKT}`);

  // 4. 구글드라이브 KTcall 폴더 자동 탐색 후 이동
  const destDir = findGoogleDriveKTcall();

  if (!destDir) {
    console.log("⚠ 구글 드라이브 KTcall 폴더를 찾지 못했습니다.");
    console.log("⚠ 파일은 C:\\Newvisit 에 그대로 남겨둡니다.");
  } else {
    console.log("▶ 구글 드라이브로 파일 이동 시작...");
    moveFile(srcRevisit, destDir);
    moveFile(srcKT, destDir);
  }

  // 처리 완료 기록
  newOnes.forEach((p) => {
    const id = String(p.CustID || "").trim();
    if (id && !processedSet.has(id)) processedIds.push(id);
  });
  saveJson(PROCESSED_FILE, processedIds);

  console.log("✅ 모든 작업 완료");
})();

const fs = require('fs');

// CSV 소스 / 출력 경로
const SRC = 'C:\\Newvisit\\visit_today.csv';
const OUT_NEW = 'C:\\Newvisit\\visit_new.txt';
// const OUT_LIST = 'C:\\Newvisit\\visit_list.txt'; // 재진 리스트는 사용 안 함

// 디버그 로그 파일
try {
  fs.writeFileSync('debug_log.txt', '');
} catch (e) { /* 무시 */ }

const log = (msg) => {
  try {
    fs.appendFileSync('debug_log.txt', msg + '\n');
  } catch (e) { /* 무시 */ }
};

// 파일 읽기 유틸
function read(p) {
  if (!fs.existsSync(p)) return "";
  const b = fs.readFileSync(p);
  return b.toString('utf8');
}

// 헤더에서 컬럼 인덱스 찾기
function pick(header, cands) {
  const L = header.map(h => (h || '').toLowerCase());
  for (const c of cands) {
    // 1) 완전 일치
    let i = L.findIndex(h => h === c);
    if (i >= 0) return i;
    // 2) 부분 일치
    i = L.findIndex(h => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

// CSV 파싱
function parse(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(',').map(s => s.trim());
  log(`[DEBUG] CSV Header: ${header.join(',')}`);

  // 필수 컬럼 인덱스
  const iChart = pick(header, ['custid', 'chart', '차트', '환자번호', 'no']);
  const iName  = pick(header, ['name', '이름', '환자명']);
  const iPhone = pick(header, ['mobile', '휴대폰', 'phone', '전화', 'tel']);
  const iType  = pick(header, ['visittype', '재진', '구분', 'type', 'visit']);
  const iDate  = pick(header, ['visitdate', '날짜', '일자', 'date']);
  const iFirst = pick(header, ['first_visit', '최초', 'first', '초진일']);

  // 추가 필드
  const iBirth = pick(header, ['birth', '생년월일']);
  const iSex   = pick(header, ['sex', '성별']);
  const iJumin = pick(header, ['resident', '주민', 'jumin']);
  const iAddr  = pick(header, ['address', '주소', 'addr']);
  const iIns   = pick(header, ['insurance', '보험', 'ins']);
  const iTel   = pick(header, ['tel', '유선', 'home']);

  log(`[DEBUG] Indices: Chart=${iChart}, Name=${iName}, Phone=${iPhone}, Type=${iType}, Date=${iDate}, First=${iFirst}, Birth=${iBirth}, Sex=${iSex}`);

  if (iChart < 0 || iType < 0 || iPhone < 0) {
    console.error(
      `[split_today] 필수 컬럼 누락! (chart=${iChart}, type=${iType}, phone=${iPhone}) CSV 헤더: ${header.join(',')}`
    );
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    log(`[DEBUG] Raw Line ${i}: ${lines[i]}`);
    const c = lines[i].split(',');
    const v = k => (k >= 0 && k < c.length ? c[k].trim() : '');

    const pPhone = v(iPhone);

    rows.push({
      chart:       v(iChart),
      name:        v(iName),
      phone:       pPhone,
      type:        v(iType),
      date:        v(iDate),
      first_visit: v(iFirst),
      birth:       v(iBirth),
      sex:         v(iSex),
      jumin:       v(iJumin),
      addr:        v(iAddr),
      ins:         v(iIns),
      tel:         v(iTel)
    });
  }
  return rows;
}

// 재진 여부 판별
function isRe(r) {
  const t = (r.type || '').toLowerCase();

  // 1 = 초진, 2 = 재진, 3 = 재초진(=초진 취급)
  if (t === '1' || t === '3') return false; // 초진
  if (t === '2') return true;              // 재진

  // 텍스트 패턴
  const isExplicitRe =
    t.includes('재진') ||
    t.includes('revisit') ||
    t === 'r' ||
    t.includes('재');

  if (isExplicitRe) return true;

  // 모호한 경우: 보험명 == 이름이면 재진으로 간주
  if (r.ins && r.name && r.ins.trim() === r.name.trim()) {
    return true;
  }

  return false;
}

function fmt(r) {
  return [r.chart, r.name, r.phone].join(',');
}

// visit_new.txt 에 들어갈 JSON 포맷
function fmtJson(r) {
  let birth = r.birth || "";
  let sex   = r.sex   || "";

  // Birth/Sex 없고 주민번호(######-#######) 있으면 거기서 파생
  if ((!birth || !sex) && r.jumin && r.jumin.includes('-')) {
    const parts = r.jumin.split('-');
    if (parts.length === 2) {
      const front = parts[0];
      const back  = parts[1];
      if (front.length === 6 && back.length >= 1) {
        const genderDigit = back[0];
        const yearPrefix =
          (genderDigit === '1' || genderDigit === '2' ||
           genderDigit === '5' || genderDigit === '6')
            ? "19"
            : "20";

        if (!birth) birth = yearPrefix + front;
        if (!sex) {
          sex =
            (genderDigit === '1' || genderDigit === '3' ||
             genderDigit === '5' || genderDigit === '7')
              ? "M"
              : "F";
        }
      }
    }
  }

  return {
    CustID:    r.chart,
    Name:      r.name,
    Mobile:    r.phone,
    Tel:       r.tel || "",
    Birth:     birth,
    Sex:       sex,
    Address:   r.addr || "",
    Insurance: r.ins || ""
  };
}

// 메인 실행부
try {
  if (!fs.existsSync(SRC)) {
    console.log("[split_today] 소스 파일 없음:", SRC);
    // fs.writeFileSync(OUT_LIST, '');
    fs.writeFileSync(OUT_NEW, '');
    process.exit(0);
  }

  const rawData = read(SRC);
  const rows = parse(rawData);

  // 날짜 필터 없이, CSV에 들어있는 행 전체 사용
  const usedRows = rows;

  log(`[DEBUG] Total rows: ${rows.length}`);
  if (rows.length > 0) {
    log(`[DEBUG] First row date: ${rows[0].date}, Now: ${new Date().toISOString()}`);
  }
  log(`[DEBUG] Used rows: ${usedRows.length}`);

  // 재진 제외 → 초진만
  const newPatients = usedRows.filter(r => !isRe(r));

  // visit_new.txt (JSON) 저장
  fs.writeFileSync(
    OUT_NEW,
    JSON.stringify(newPatients.map(fmtJson), null, 2),
    'utf8'
  );

  // officecall-export.js 용 차트번호 리스트 저장
  const chartNumbers = newPatients.map(r => r.chart);
  fs.writeFileSync(
    'C:\\Newvisit\\new_patients.json',
    JSON.stringify(chartNumbers, null, 2),
    'utf8'
  );

  console.log(
    `[split_today] 완료: 신규 환자 ${newPatients.length}명 (차트번호: ${chartNumbers.join(', ')})`
  );

} catch (e) {
  // fs.writeFileSync(OUT_LIST, '');
  fs.writeFileSync(OUT_NEW, '');
  console.error("[split_today] 에러 발생:", e);
}

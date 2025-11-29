// ============================================================
// C:\Oldvisit\split_today.js (최원장님 최종 통합 완성본)
// 기능 1: 데이터 유실 원천 차단 (Append 모드)
// 기능 2: 날짜 변경 시 지난 장부 자동 백업 및 초기화
// ============================================================

const fs = require('fs');
const path = require('path');

const SRC       = 'C:\\Oldvisit\\visit_today.csv';
const OUT_QUEUE = 'C:\\Oldvisit\\revisit_queue.txt';
// OUT_PROCESSING 제거됨 (심플 버전 유지)
const OUT_DONE  = 'C:\\Oldvisit\\revisit_done.txt';
const OUT_UNDONE= 'C:\\Oldvisit\\revisit_undone.txt';

// ------------------------------------------------------------
// [신규 기능] 날짜가 바뀌면 장부(Done/Undone)를 자동으로 백업하고 비움
// ------------------------------------------------------------
function checkAndResetDaily(filePath) {
    if (!fs.existsSync(filePath)) return;

    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime; // 마지막 수정 시간
    const now = new Date();

    // 날짜(일)가 다르면 '지난 장부'로 판단
    if (lastModified.getDate() !== now.getDate() || 
        lastModified.getMonth() !== now.getMonth() ||
        lastModified.getFullYear() !== now.getFullYear()) {
        
        // 백업 파일명 생성 (예: revisit_done_2023-10-25.txt)
        const yyyy = lastModified.getFullYear();
        const mm = String(lastModified.getMonth() + 1).padStart(2, '0');
        const dd = String(lastModified.getDate()).padStart(2, '0');
        const backupName = filePath.replace('.txt', `_${yyyy}-${mm}-${dd}.txt`);

        try {
            fs.renameSync(filePath, backupName);
            console.log(`[System] 날짜 변경 감지! 지난 장부를 백업했습니다: ${path.basename(backupName)}`);
        } catch (e) {
            console.log(`[System] 백업 중 오류 (무시됨): ${e.message}`);
        }
    }
}

// ============================================================
// 유틸리티 함수
// ============================================================
function readLines(path) {
  if (!fs.existsSync(path)) return [];
  return fs.readFileSync(path, 'utf8')
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function birthToYYMMDD(b) {
  if (!b) return '';
  const d = b.replace(/\D/g, '');
  return (d.length === 8) ? d.slice(2) : '';
}

// ============================================================
// 메인 로직
// ============================================================
(function main() {
  // 1. 실행하자마자 '오래된 장부'인지 검사 (자동 초기화)
  checkAndResetDaily(OUT_DONE);
  checkAndResetDaily(OUT_UNDONE);
  checkAndResetDaily(OUT_QUEUE); 

  if (!fs.existsSync(SRC)) return;

  const raw = fs.readFileSync(SRC, 'utf8').replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return; 

  // 헤더 파싱
  const header = lines[0].split(',').map(s => s.trim().toLowerCase());
  const findIdx = (keywords) => header.findIndex(h => keywords.some(k => h.includes(k)));

  const iChart  = findIdx(['custid', 'chart']);
  const iName   = findIdx(['name']);
  const iPhone  = findIdx(['mobile', 'hp', 'phone']); 
  const iBirth  = findIdx(['birth']);
  const iSex    = findIdx(['sex']);

  // 2. 이미 알거나(대기), 처리 완료된 환자 명단 로드
  const known = new Set();
  const loadKeys = (p) => readLines(p).forEach(l => {
      const parts = l.split(',');
      if (parts.length >= 3) known.add(parts[0]+','+parts[2]); // 차트번호+전화번호
  });
  
  loadKeys(OUT_QUEUE);  // 현재 대기 중인 사람
  loadKeys(OUT_DONE);   // 이미 처리된 사람 (중복 방지 핵심)
  loadKeys(OUT_UNDONE); // 실패한 사람

  const toAppend = []; // 파일에 추가할 '진짜 새 환자'들

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(s => s.trim());
    
    let rawPhone = cols[iPhone] || '';
    let cleanPhone = rawPhone.replace(/\D/g, ''); 

    if (!cols[iChart] || cleanPhone.length < 9) continue;

    const key = `${cols[iChart]},${cleanPhone}`;
    
    // 이미 큐에 있거나 완료된 사람이면 패스
    if (known.has(key)) continue;

    const j6 = birthToYYMMDD(cols[iBirth]);
    const sex = cols[iSex] || "";

    const newLine = `${cols[iChart]},${cols[iName]},${cleanPhone},${j6},${sex}`;
    toAppend.push(newLine);
    
    // 이번 루프 내 중복 방지
    known.add(key); 
  }

  // 3. 변경사항이 있을 때만 '이어붙이기(Append)' 수행
  // 파일을 덮어쓰지 않고 뒤에 추가만 하므로 데이터 유실 원천 차단
  if (toAppend.length > 0) {
    fs.appendFileSync(OUT_QUEUE, toAppend.join('\n') + '\n', 'utf8');
    console.log(`[split_today] 신규 환자 ${toAppend.length}명 대기열 추가.`);
  }
})();
// --------------------------------------------------------
//  C:\Oldvisit\revisit_dom_register.js — 안정버전 (오류 → undone)
// --------------------------------------------------------

const fs = require("fs");
const { chromium } = require("playwright");

// 파일 경로
const QUEUE_PATH  = "C:\\Oldvisit\\revisit_queue.txt";
const DONE_PATH   = "C:\\Oldvisit\\revisit_done.txt";
const UNDONE_PATH = "C:\\Oldvisit\\revisit_undone.txt";

// 로그인 셀렉터
const LOGIN_ID = '#root div.sc-iUrBwK.dezOTV > div:nth-child(1) input';
const LOGIN_PW = '#root div.sc-iUrBwK.dezOTV > div:nth-child(2) input';

// 버튼/필드 셀렉터
const SEL_BTN_VISIT   = 'button:has-text("내원등록")';
const SEL_SEARCH_BOX  = 'input[placeholder="이름, 전화번호, 차트번호를 입력해주세요."]';
const SEL_AUTOCOMP_1  = '#autocomplete-results > li:nth-child(1)';
const SEL_BTN_PATIENT_INFO = 'button:has-text("환자 정보 입력")';
const SEL_BTN_SAVE    = 'button:has-text("등록완료")';

const SEL_INPUT_NAME        = 'input[placeholder="이름을 입력해주세요"]';
const SEL_INPUT_JUMIN_FRONT = 'input[name="dateOfBirth"]';
const SEL_INPUT_PHONE_MID   = 'input[name="phone"]';
const SEL_INPUT_PHONE_LAST  = 'input[tabindex="5"]';
const SEL_INPUT_CHART       = 'input[name="chartNumber"]';
const SEL_INPUT_GENDER      = 'input[name="registerNumber"]';

// 성별코드
function getGenderCode(jumin6, sex) {
  if (!jumin6 || jumin6.length !== 6) return "1";
  const yy = parseInt(jumin6.slice(0, 2), 10);
  const year = (yy <= 24 ? 2000 : 1900) + yy;
  const male = !sex || sex === "남" || sex === "M" || sex === "m";
  if (year < 2000) return male ? "1" : "2";
  return male ? "3" : "4";
}

// 전화번호 분할
function splitPhone(phone) {
  const p = (phone || "").replace(/\D/g, "");
  if (p.length === 11) return { mid: p.slice(3,7), last: p.slice(7) };
  if (p.length === 10) return { mid: p.slice(3,6), last: p.slice(6) };
  return { mid:"", last:"" };
}

// 큐 읽기
function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  return fs.readFileSync(QUEUE_PATH,"utf8")
    .replace(/^\uFEFF/,"")
    .split(/\r?\n/)
    .map(s=>s.trim())
    .filter(Boolean)
    .map(line=>{
      const [chart,name,phone,jumin6,sex] = line.split(',').map(x=>x.trim());
      return { chart,name,phone,jumin6,sex, raw:line };
    });
}

// queue/done/undone 저장
function saveResults(done, undone) {
  if (done.length)
    fs.appendFileSync(DONE_PATH, done.map(r=>r.raw).join("\r\n")+"\r\n");

  if (undone.length)
    fs.appendFileSync(UNDONE_PATH, undone.map(r=>r.raw).join("\r\n")+"\r\n");

  // queue 는 모두 처리 후 비움
  fs.writeFileSync(QUEUE_PATH, "");
}

// 안전 클릭
async function safeClick(page, selector) {
  const btn = page.locator(selector);
  await btn.waitFor({ state:"visible", timeout:20000 });
  await btn.click({ force:true });
}

// 로그인
async function ensureLoggedIn(page) {
  console.log("로그인 페이지 이동…");
  await page.goto("https://re-visit.kr/login");

  await page.fill(LOGIN_ID, "dongjedang");
  await page.fill(LOGIN_PW, "dongjedang123");
  await page.click('button:has-text("로그인")',{force:true});

  await page.waitForURL("**/hospital/**", { timeout:30000 });
  console.log("로그인 성공");
}

// 접수 리스트
async function openReception(page) {
  await page.goto("https://re-visit.kr/dongjedang/hospital/reception/list");
  console.log("접수 리스트 진입 완료");
}

// 환자 처리
async function processRevisit(page, p) {
  console.log(`▶ 처리: ${p.name} (${p.chart}) / ${p.phone}`);

  try {
    await safeClick(page, SEL_BTN_VISIT);
    await page.waitForTimeout(300);

    await page.fill(SEL_SEARCH_BOX, "");
    await page.fill(SEL_SEARCH_BOX, p.phone);
    await page.waitForTimeout(1000);

    const first = page.locator(SEL_AUTOCOMP_1);
    if (await first.isVisible().catch(()=>false)) {
      await first.click({force:true});
      await page.waitForTimeout(200);
      await safeClick(page, SEL_BTN_SAVE);
      console.log("→ 재진 등록");
      return true;
    }

    // 신환
    await safeClick(page, SEL_BTN_PATIENT_INFO);
    await page.waitForTimeout(500);

    await page.fill(SEL_INPUT_NAME, p.name);

    if (p.jumin6) {
      await page.fill(SEL_INPUT_JUMIN_FRONT, p.jumin6);
      await page.fill(SEL_INPUT_GENDER, getGenderCode(p.jumin6,p.sex));
    }

    const {mid,last} = splitPhone(p.phone);
    if (mid)  await page.fill(SEL_INPUT_PHONE_MID, mid);
    if (last) await page.fill(SEL_INPUT_PHONE_LAST, last);

    await page.fill(SEL_INPUT_CHART, p.chart);
    await safeClick(page, SEL_BTN_SAVE);

    console.log("→ 신환 등록");
    return true;

  } catch (e) {
    console.log("❌ 처리 실패:", e);
    return false;
  }
}

// 메인 실행
(async () => {
  const queue = readQueue();
  if (!queue.length) {
    console.log("큐 비어있음.");
    process.exit(0);
  }

  const browser = await chromium.launch({ headless:false });
  const page = await browser.newPage();

  const done   = [];
  const undone = [];

  try {
    await ensureLoggedIn(page);
    await openReception(page);

    for (const p of queue) {
      const ok = await processRevisit(page,p);
      if (ok) done.push(p);
      else    undone.push(p);
    }

    saveResults(done, undone);
    console.log(`완료 ${done.length} / 실패 ${undone.length}`);

  } finally {
    await browser.close();
  }
})();

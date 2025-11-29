//----------------------------------------------------------
// watch-revisit.js
// revisit_queue.txt 실시간 감시 → 자동 등록 실행
//----------------------------------------------------------

const fs = require("fs");
const { exec } = require("child_process");

const QUEUE = "C:\\Oldvisit\\revisit_queue.txt";

console.log("=========================================================");
console.log("[watch-revisit] 실시간 Queue 감시 시작:", QUEUE);
console.log("=========================================================");

let lastSize = 0;
let isRunning = false; // 중복 실행 방지

function runRegister() {
    if (isRunning) {
        console.log("[watch-revisit] 이미 자동등록 동작 중 → 대기");
        return;
    }
    isRunning = true;

    console.log("[watch-revisit] ▶ 자동등록 실행 시작...");

    exec(`node C:\\Oldvisit\\revisit_dom_register.js`, (err, stdout) => {
        if (err) {
            console.log("[watch-revisit] ❌ 오류:", err.message);
            isRunning = false;
            return;
        }

        console.log(stdout.trim());
        console.log("[watch-revisit] ✔ 자동등록 완료");
        console.log("------------------------------------------------");

        isRunning = false;
    });
}

// Queue 파일 감시
fs.watchFile(QUEUE, { interval: 500 }, (curr, prev) => {
    if (curr.size !== lastSize) {
        lastSize = curr.size;
        console.log("[watch-revisit] Queue 변경 감지 → 자동등록 시작");
        runRegister();
    }
});

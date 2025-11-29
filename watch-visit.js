// ★ 모니터가 에러 나도 죽지 않게 전역 에러 핸들러 추가
process.on('uncaughtException', (err) => {
  console.error('[watch-visit] Uncaught error:', err.message);
  // 여기서 프로세스를 죽이지 않고, 그냥 로그만 남기고 계속 감시 유지
});

process.on('unhandledRejection', (reason) => {
  console.error('[watch-visit] Unhandled promise rejection:', reason);
});

const fs = require('fs');
const { exec } = require('child_process');

const CSV_PATH = 'C:\\Newvisit\\visit_today.csv';
const SPLIT_SCRIPT = 'C:\\Newvisit\\split_today.js';

console.log("[watch-visit] Monitoring started for:", CSV_PATH);

let lastSize = 0;

function check() {
    try {
        if (!fs.existsSync(CSV_PATH)) return;

        const stat = fs.statSync(CSV_PATH);
        if (stat.size !== lastSize) {
            console.log(`[watch-visit] Change detected (Size: ${lastSize} -> ${stat.size}). Running split_today.js...`);
            lastSize = stat.size;

            exec(`node "${SPLIT_SCRIPT}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[watch-visit] Error executing split_today.js: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`[watch-visit] split_today.js stderr: ${stderr}`);
                }
                console.log(`[watch-visit] split_today.js output: ${stdout}`);
            });
        }
    } catch (e) {
        console.error("[watch-visit] Error checking file:", e);
    }
}

// Check every 5 seconds
setInterval(check, 5000);

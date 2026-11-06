// Chạy đồng thời cả Frontend (Next.js :3000) và Backend (Node.js :5000)
const { spawn } = require("child_process");
const path = require("path");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const rootDir = path.resolve(__dirname, "..");

console.log("\x1b[36m%s\x1b[0m", "=======================================================");
console.log("\x1b[32m%s\x1b[0m", "  Khởi động SortiX Dashboard (Frontend + Backend)  ");
console.log("\x1b[36m%s\x1b[0m", "=======================================================");
console.log("  Frontend: http://localhost:3000");
console.log("  Backend:  http://localhost:5000");
console.log("  Telegram: Bot Poller tự động chạy ngầm lắng nghe tin nhắn 2 chiều");
console.log("\x1b[36m%s\x1b[0m", "-------------------------------------------------------");

const backend = spawn(npmCmd, ["run", "dev", "--workspace=backend"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

const frontend = spawn(npmCmd, ["run", "dev", "--workspace=frontend"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

const telegramPoller = spawn("node", ["scripts/telegram-poller.cjs"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  console.log("\nĐang dừng toàn bộ dịch vụ...");
  try { backend.kill("SIGINT"); } catch {}
  try { frontend.kill("SIGINT"); } catch {}
  try { telegramPoller.kill("SIGINT"); } catch {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

backend.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[Backend] Tiến trình kết thúc với mã lỗi: ${code}`);
  }
});

frontend.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`[Frontend] Tiến trình kết thúc với mã lỗi: ${code}`);
  }
});

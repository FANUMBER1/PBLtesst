// scripts/free-port.cjs
// Tự động giải phóng cổng (mặc định 3000) trước khi khởi chạy Next.js
const { execSync } = require("child_process");

const targetPort = process.argv[2] || 3000;

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -and $_ -ne $PID) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`;
      execSync(cmd, { stdio: "ignore" });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
    }
  } catch {
    // Port đã trống hoặc không có quyền can thiệp
  }
}

freePort(targetPort);

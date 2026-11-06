/**
 * telegram-poller.cjs
 * Bộ lắng nghe tin nhắn Long-Polling cho Telegram Bot SortiX-Med khi chạy ở môi trường Local/Dev
 * Tự động chuyển tiếp tin nhắn và nút bấm vào Next.js Webhook (/api/telegram/webhook)
 */

const fs = require("fs");
const path = require("path");

// 1. Nạp biến môi trường từ frontend/.env.local nếu chưa có
const envLocalPath = path.resolve(__dirname, "..", "frontend", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const WEBHOOK_TARGET = process.env.LOCAL_WEBHOOK_URL || "http://localhost:3000/api/telegram/webhook";

if (!BOT_TOKEN) {
  console.log("\x1b[33m%s\x1b[0m", "[Telegram Poller] ⚠️ Chưa cấu hình TELEGRAM_BOT_TOKEN trong .env.local. Bỏ qua poller.");
  process.exit(0);
}

console.log("\x1b[36m%s\x1b[0m", `[Telegram Poller] 🤖 Đang khởi động Bot Poller (Token: ${BOT_TOKEN.slice(0, 10)}...)...`);
console.log("\x1b[32m%s\x1b[0m", `[Telegram Poller] 🎯 Mục tiêu chuyển tiếp: ${WEBHOOK_TARGET}`);

let isRunning = true;
let offset = 0;

async function prepareBot() {
  try {
    // Xóa webhook nếu có để kích hoạt chế độ getUpdates Long-Polling
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      console.log("\x1b[32m%s\x1b[0m", "[Telegram Poller] ✅ Đã dọn dẹp Webhook cũ, sẵn sàng lắng nghe tin nhắn trực tiếp!");
    }
  } catch (err) {
    console.warn("[Telegram Poller] Cảnh báo khi chuẩn bị bot:", err.message);
  }
}

async function forwardUpdate(update) {
  try {
    const res = await fetch(WEBHOOK_TARGET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await res.json().catch(() => ({}));
    
    const sender = update.message?.from?.username || update.callback_query?.from?.username || "Ẩn danh";
    const text = update.message?.text || update.callback_query?.data || "[Dữ liệu khác]";
    
    console.log(
      "\x1b[32m%s\x1b[0m",
      `[Telegram Poller] 💬 Nhận từ @${sender}: "${text}" -> Phản hồi: ${JSON.stringify(result)}`
    );
  } catch (err) {
    console.error(`[Telegram Poller] ❌ Lỗi chuyển tiếp tới ${WEBHOOK_TARGET}:`, err.message);
  }
}

async function poll() {
  await prepareBot();

  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`;
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      
      if (!res.ok) {
        if (res.status === 409) {
          // Xung đột Webhook hoặc có poller khác đang chạy
          await new Promise((r) => setTimeout(r, 4000));
          await prepareBot();
          continue;
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await forwardUpdate(update);
        }
      }
    } catch (err) {
      if (err.name !== "TimeoutError") {
        // console.error("[Telegram Poller] Lỗi polling:", err.message);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

process.on("SIGINT", () => {
  isRunning = false;
  process.exit(0);
});

process.on("SIGTERM", () => {
  isRunning = false;
  process.exit(0);
});

poll();

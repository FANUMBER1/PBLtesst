// Tiện ích phía máy khách gọi các tuyến API (/api/telegram-alert, /api/email-alert)
// Tích hợp thời gian chờ và chống lặp để tránh gửi quá nhiều cảnh báo
import { AlertEvent } from "./types";
import { saveAlertHistory } from "./history";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Bảng lưu thời gian gửi gần nhất theo từng loại sự kiện
const lastSentTimestamps: Record<string, number> = {};
const COOLDOWN_MS = 30000; // 30 giây chờ giữa các thông báo cùng loại

export async function sendTelegramAlert(
  alert: AlertEvent,
  force = false
): Promise<{ success: boolean; message: string }> {
  const now = Date.now();
  const lastTime = lastSentTimestamps[`tg_${alert.event_type}`] || 0;

  if (!force && now - lastTime < COOLDOWN_MS) {
    return {
      success: false,
      message: `Đang trong thời gian giãn cách (cooldown ${(
        (COOLDOWN_MS - (now - lastTime)) /
        1000
      ).toFixed(0)}s)`,
    };
  }

  try {
    const res = await fetch("/api/telegram-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      lastSentTimestamps[`tg_${alert.event_type}`] = now;
      saveAlertHistory(alert);
      return { success: true, message: "Đã gửi cảnh báo Telegram thành công!" };
    } else {
      return {
        success: false,
        message: data.message || "Không thể gửi cảnh báo Telegram (chưa cấu hình Bot/ChatID)",
      };
    }
  } catch (err: unknown) {
    return { success: false, message: `Lỗi mạng khi gọi Telegram API: ${getErrorMessage(err)}` };
  }
}

export async function sendEmailAlert(
  alert: AlertEvent,
  force = false
): Promise<{ success: boolean; message: string }> {
  const now = Date.now();
  const lastTime = lastSentTimestamps[`email_${alert.event_type}`] || 0;

  if (!force && now - lastTime < COOLDOWN_MS) {
    return {
      success: false,
      message: `Đang trong thời gian giãn cách (cooldown ${(
        (COOLDOWN_MS - (now - lastTime)) /
        1000
      ).toFixed(0)}s)`,
    };
  }

  try {
    const res = await fetch("/api/email-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      lastSentTimestamps[`email_${alert.event_type}`] = now;
      saveAlertHistory(alert);
      return { success: true, message: "Đã gửi email cảnh báo SMTP thành công!" };
    } else {
      return {
        success: false,
        message: data.message || "Không thể gửi email (chưa cấu hình SMTP credentials)",
      };
    }
  } catch (err: unknown) {
    return { success: false, message: `Lỗi mạng khi gọi Email API: ${getErrorMessage(err)}` };
  }
}

export async function triggerAlertDispatch(alert: AlertEvent) {
  saveAlertHistory(alert);

  // Đối với mức độ nghiêm trọng hoặc Báo cáo 1 ngày làm việc (shift_summary), chủ động gửi đồng thời cả Telegram và Email
  if (alert.severity === "critical" || alert.event_type === "shift_summary") {
    void Promise.allSettled([sendTelegramAlert(alert, true), sendEmailAlert(alert, true)]);
  } else {
    // Với cảnh báo thường, ưu tiên gửi Telegram
    sendTelegramAlert(alert).catch((e) => console.warn(e));
  }
}

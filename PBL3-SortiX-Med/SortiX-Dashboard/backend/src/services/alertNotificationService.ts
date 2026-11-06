import nodemailer from "nodemailer";
import { AlertPayload, escapeHtml } from "../utils/alertPayload";
import { ENV } from "../config/env";

export async function sendEmailNotification(payload: AlertPayload): Promise<{
  success: boolean;
  message: string;
  messageId?: string;
}> {
  const { event_type, severity, description, device_id, timestamp, mode } = payload;
  const host = ENV.SMTP_HOST;
  const port = ENV.SMTP_PORT;
  const secure = ENV.SMTP_SECURE;
  const user = ENV.SMTP_USER;
  const pass = ENV.SMTP_PASS;
  const to = ENV.ALERT_EMAIL_TO || user;

  if (!user || !pass || user.includes("your_email") || !to || !Number.isInteger(port) || port < 1 || port > 65535) {
    return {
      success: false,
      message: "Chưa cấu hình thông tin SMTP hợp lệ trong .env",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const isCritical = severity === "critical";
  const statusColor = isCritical ? "#ef4444" : "#f59e0b";
  const statusTitle = isCritical ? "CẢNH BÁO NGUY HIỂM - MỨC NGHIÊM TRỌNG" : "CẢNH BÁO VẬN HÀNH - CẢNH BÁO";
  const isSim = mode === "simulation";
  const modeBadge = isSim
    ? `<span style="background:#0284c7;color:#ffffff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block">🧪 MÔ PHỎNG (Simulation)</span>`
    : `<span style="background:#10b981;color:#ffffff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block">🏭 THỰC TẾ (Real-time IoT)</span>`;
  const modePrefix = isSim ? "[MÔ PHỎNG]" : "[THỰC TẾ]";
  const formattedTime = new Date(timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const safeDeviceId = escapeHtml(device_id);
  const safeEventType = escapeHtml(event_type);
  const safeDescription = escapeHtml(description);

  const htmlContent = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;color:#f8fafc">
      <div style="background:${statusColor};padding:18px 24px;text-align:center">
        <h2 style="margin:0;color:#fff">${statusTitle}</h2>
        <div style="margin-top:8px">${modeBadge}</div>
      </div>
      <div style="padding:24px">
        <p style="color:#94a3b8">Hệ thống phân loại IoT ghi nhận một sự kiện cần chú ý:</p>
        <table style="width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#94a3b8;width:140px">Môi Trường:</td><td style="padding:6px 0">${modeBadge}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">Mã Thiết Bị:</td><td style="padding:6px 0">${safeDeviceId}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">Loại Sự Kiện:</td><td style="padding:6px 0">${safeEventType}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">Mô Tả Chi Tiết:</td><td style="padding:6px 0">${safeDescription}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">Thời Gian:</td><td style="padding:6px 0">${formattedTime}</td></tr>
        </table>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Cảnh báo bộ phân loại IoT PBL3" <${user}>`,
    to,
    subject: `${modePrefix} [${statusTitle}] ${event_type} - ${device_id}`,
    html: htmlContent,
  });

  return {
    success: true,
    message: "Đã gửi email cảnh báo thành công",
    messageId: info.messageId,
  };
}

export async function sendTelegramNotification(payload: AlertPayload): Promise<{
  success: boolean;
  message: string;
  data?: unknown;
}> {
  const { event_type, severity, description, device_id, timestamp, mode } = payload;
  const token = ENV.TELEGRAM_BOT_TOKEN;
  const chatId = ENV.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "your_telegram_bot_token_here") {
    return {
      success: false,
      message: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID hợp lệ trong .env",
    };
  }

  const severityLabel = severity === "critical" ? "🚨 KHẨN CẤP" : severity === "warning" ? "⚠️ CẢNH BÁO" : "ℹ️ THÔNG TIN";
  const modeLabel = mode === "simulation" ? "🧪 MÔ PHỎNG (Simulation)" : "🏭 THỰC TẾ (Real-time IoT)";
  const formattedTime = new Date(timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const message = [
    "<b>[HỆ THỐNG PHÂN LOẠI IOT - PBL3]</b>",
    `Trạng thái: <b>${severityLabel}</b>`,
    `Môi trường: <b>${modeLabel}</b>`,
    "━━━━━━━━━━━━━━━━━━━━",
    `📦 <b>Mã Thiết Bị:</b> <code>${escapeHtml(device_id)}</code>`,
    `⚙️ <b>Loại Sự Kiện:</b> <code>${escapeHtml(event_type)}</code>`,
    `📝 <b>Chi Tiết:</b> ${escapeHtml(description)}`,
    `⏰ <b>Thời Gian:</b> ${escapeHtml(formattedTime)}`,
    "━━━━━━━━━━━━━━━━━━━━",
    "<i>Khuyến cáo: Người vận hành vui lòng kiểm tra hiện trường băng chuyền.</i>",
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  let result: { ok?: boolean; result?: unknown; description?: string } = {};
  try {
    result = await response.json();
  } catch {
    // Upstream error
  }

  if (response.ok && result.ok) {
    return {
      success: true,
      message: "Đã gửi thông báo Telegram thành công",
      data: result.result,
    };
  }

  return {
    success: false,
    message: result.description || "Telegram không thể nhận cảnh báo",
  };
}

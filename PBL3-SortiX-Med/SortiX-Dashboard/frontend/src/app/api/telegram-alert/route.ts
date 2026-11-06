import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { allowRequest, clientAddress, hasValidInternalSecret, readAlertPayload } from "../_lib/alertPayload";

const rateLimitCache = new Map<string, number>();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (match) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[match]!);
}

export async function POST(req: NextRequest) {
  if (!hasValidInternalSecret(req)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!allowRequest(rateLimitCache, clientAddress(req))) return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
  try {
    const { event_type, severity, description, device_id, timestamp, mode } = await readAlertPayload(req);
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId || token === "your_telegram_bot_token_here") return NextResponse.json({ success: false, message: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID hợp lệ trong file .env.local" }, { status: 400 });
    const severityLabel = severity === "critical" ? "🚨 KHẨN CẤP" : severity === "warning" ? "⚠️ CẢNH BÁO" : "ℹ️ THÔNG TIN";
    const modeLabel = mode === "simulation" ? "🧪 MÔ PHỎNG (Simulation)" : "🏭 THỰC TẾ (Real-time IoT)";
    const formattedTime = new Date(timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const isShiftSummary = event_type === "shift_summary";
    const message = isShiftSummary
      ? [
          "<b>📋 [BÁO CÁO 1 NGÀY LÀM VIỆC - HỆ THỐNG SORTIX IOT]</b>",
          `Môi trường: <b>${modeLabel}</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          `🏢 <b>Trạm Giám Sát:</b> <code>${escapeHtml(device_id)}</code>`,
          `📝 <b>Nội Dung Báo Cáo:</b>`,
          `${escapeHtml(description)}`,
          `⏰ <b>Thời Gian Báo Cáo:</b> ${escapeHtml(formattedTime)}`,
          "━━━━━━━━━━━━━━━━━━━━",
          "✅ <i>Báo cáo 1 ngày làm việc được hệ thống tự động tổng hợp và gửi khi chuyển sang ngày mới.</i>",
        ].join("\n")
      : [
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    let result: { ok?: boolean; result?: unknown; description?: string } = {};
    try { result = await response.json(); } catch { /* handled as upstream failure */ }
    if (response.ok && result.ok) return NextResponse.json({ success: true, message: "Đã gửi thông báo Telegram thành công", data: result.result });
    console.error("[Telegram API]", response.status, result.description);
    return NextResponse.json({ success: false, message: "Telegram không thể nhận cảnh báo" }, { status: 502 });
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "CONTENT_TYPE")) return NextResponse.json({ success: false, message: "Dữ liệu cảnh báo không hợp lệ" }, { status: 400 });
    console.error("[Lỗi cảnh báo Telegram]:", error);
    return NextResponse.json({ success: false, message: "Không thể gửi cảnh báo Telegram" }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405, headers: { Allow: "POST" } });
}

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
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
    const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const to = process.env.ALERT_EMAIL_TO?.trim() || user;
    if (!user || !pass || user.includes("your_email") || !to || !Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ success: false, message: "Chưa cấu hình thông tin SMTP hợp lệ trong .env.local" }, { status: 400 });
    }
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 });
    const isShiftSummary = event_type === "shift_summary";
    const isCritical = severity === "critical";
    const statusColor = isShiftSummary ? "#10b981" : isCritical ? "#ef4444" : "#f59e0b";
    const statusTitle = isShiftSummary
      ? "BÁO CÁO 1 NGÀY LÀM VIỆC - TỔNG KẾT SẢN XUẤT"
      : isCritical
      ? "CẢNH BÁO NGUY HIỂM - MỨC NGHIÊM TRỌNG"
      : "CẢNH BÁO VẬN HÀNH - CẢNH BÁO";
    const isSim = mode === "simulation";
    const modeBadge = isSim
      ? `<span style="background:#0284c7;color:#ffffff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block">🧪 MÔ PHỎNG (Simulation)</span>`
      : `<span style="background:#3b82f6;color:#ffffff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:bold;display:inline-block">🏭 THỰC TẾ (Real-time IoT)</span>`;
    const modePrefix = isSim ? "[MÔ PHỎNG]" : "[THỰC TẾ]";
    const formattedTime = new Date(timestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const safeDeviceId = escapeHtml(device_id), safeEventType = escapeHtml(event_type), safeDescription = escapeHtml(description);
    const emailSubject = isShiftSummary
      ? `${modePrefix} [BÁO CÁO 1 NGÀY LÀM VIỆC] Tổng kết ngày sản xuất SortiX IoT (${formattedTime})`
      : `${modePrefix} [${statusTitle}] ${event_type} - ${device_id}`;
    const introText = isShiftSummary
      ? "Hệ thống tự động tổng hợp và gửi báo cáo sản xuất 1 ngày làm việc (chuyển sang ngày mới):"
      : "Hệ thống phân loại IoT ghi nhận một sự kiện cần chú ý:";
    const footnote = isShiftSummary
      ? "Báo cáo tổng kết 1 ngày làm việc được hệ thống SortiX IoT tự động gửi qua Email và Telegram mỗi khi qua ngày mới."
      : "Khuyến cáo: Người vận hành vui lòng kiểm tra hiện trường băng chuyền.";

    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;color:#f8fafc"><div style="background:${statusColor};padding:18px 24px;text-align:center"><h2 style="margin:0;color:#fff">${statusTitle}</h2><div style="margin-top:8px">${modeBadge}</div></div><div style="padding:24px"><p style="color:#94a3b8">${introText}</p><table style="width:100%;font-size:14px"><tr><td style="padding:6px 0;color:#94a3b8;width:140px">Môi Trường:</td><td style="padding:6px 0">${modeBadge}</td></tr><tr><td style="padding:6px 0;color:#94a3b8">Trạm Giám Sát:</td><td style="padding:6px 0">${safeDeviceId}</td></tr><tr><td style="padding:6px 0;color:#94a3b8">Loại Sự Kiện:</td><td style="padding:6px 0">${safeEventType}</td></tr><tr><td style="padding:6px 0;color:#94a3b8">Mô Tả Chi Tiết:</td><td style="padding:6px 0;font-weight:bold;color:${isShiftSummary ? "#34d399" : "#f8fafc"}">${safeDescription}</td></tr><tr><td style="padding:6px 0;color:#94a3b8">Thời Gian:</td><td style="padding:6px 0">${formattedTime}</td></tr></table><div style="margin-top:20px;padding-top:16px;border-top:1px solid #334155;font-size:12px;color:#94a3b8;font-style:italic">${footnote}</div></div></div>`;
    const info = await transporter.sendMail({ from: `"Hệ thống SortiX IoT PBL3" <${user}>`, to, subject: emailSubject, html: htmlContent });
    return NextResponse.json({ success: true, message: "Đã gửi email cảnh báo thành công", messageId: info.messageId });
  } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "CONTENT_TYPE")) return NextResponse.json({ success: false, message: "Dữ liệu cảnh báo không hợp lệ" }, { status: 400 });
    console.error("[Lỗi cảnh báo email]:", error);
    return NextResponse.json({ success: false, message: "Không thể gửi email cảnh báo" }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405, headers: { Allow: "POST" } });
}

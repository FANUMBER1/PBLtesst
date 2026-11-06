import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[match]!);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, title } = body as { text?: string; title?: string };

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, message: "Nội dung tin nhắn không được để trống" },
        { status: 400 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

    if (!token || !chatId || token === "your_telegram_bot_token_here") {
      return NextResponse.json(
        {
          success: false,
          message: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID hợp lệ trong .env.local",
        },
        { status: 400 }
      );
    }

    const nowFormatted = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    const header = title
      ? `<b>🤖 [SORTIX-MED] ${escapeHtml(title.toUpperCase())}</b>`
      : "<b>🤖 [BÁO CÁO SORTIX-MED AI COPILOT]</b>";

    const formattedMessage = [
      header,
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      escapeHtml(text),
      "━━━━━━━━━━━━━━━━━━━━━━━━━",
      `⏰ <i>Gửi từ AI Copilot Dashboard: ${escapeHtml(nowFormatted)}</i>`,
      "🏥 <i>Hệ thống tự động phân loại dụng cụ y tế SortiX-Med (PBL3)</i>",
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.ok) {
      return NextResponse.json({
        success: true,
        message: "Đã gửi báo cáo AI vào Telegram thành công!",
        data: result.result,
      });
    }

    console.error("[Telegram Chatbot API Error]:", response.status, result);
    return NextResponse.json(
      {
        success: false,
        message: result.description || "Máy chủ Telegram từ chối gửi tin nhắn",
      },
      { status: 502 }
    );
  } catch (error: unknown) {
    console.error("[Lỗi gửi Telegram từ AI Chatbot]:", error);
    const errMessage = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json(
      { success: false, message: `Lỗi kết nối Telegram: ${errMessage}` },
      { status: 500 }
    );
  }
}

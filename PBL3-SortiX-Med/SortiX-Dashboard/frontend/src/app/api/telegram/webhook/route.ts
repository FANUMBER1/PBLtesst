import { NextRequest, NextResponse } from "next/server";
import { TelegramBotService, TelegramUpdate } from "@/lib/telegramBotService";

export const dynamic = "force-dynamic";

/**
 * =============================================================================
 * Route: /api/telegram/webhook
 * Tiếp nhận Webhook từ Telegram Bot API (@SortiX_Med_Bot)
 * Hỗ trợ:
 * 1. Hỏi đáp AI thông minh dựa trên Telemetry thực tế (Google Gemini 2.5 Flash)
 * 2. Menu Inline Keyboard điều khiển SCADA từ xa an toàn (/status, /temp, /estop, ...)
 * =============================================================================
 */

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // 1. Xử lý sự kiện bấm nút Inline Keyboard (Callback Query)
    if (update.callback_query) {
      const cq = update.callback_query;
      const callbackId = cq.id;
      const chatId = cq.message?.chat.id || cq.from.id;
      const action = cq.data || "";
      const senderName = cq.from.username || cq.from.first_name || "Kỹ sư";

      // Thực thi lệnh SCADA tương ứng
      const result = await TelegramBotService.executeScadaCommand(action, chatId, senderName);

      // Phản hồi Toast nhanh trên Telegram
      await TelegramBotService.answerCallbackQuery(
        callbackId,
        result.success ? "✅ Đã thực thi lệnh" : "⚠️ Cảnh báo lệnh"
      );

      // Gửi tin nhắn cập nhật trạng thái mới kèm bàn phím điều khiển
      await TelegramBotService.sendMessage(
        chatId,
        result.text,
        TelegramBotService.getScadaKeyboard()
      );

      return NextResponse.json({ ok: true, handled: "callback_query" });
    }

    // 2. Xử lý tin nhắn văn bản từ người dùng (Message)
    if (update.message?.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const senderName = msg.from.username || msg.from.first_name || "Kỹ sư";

      // Trường hợp 2A: Lệnh điều khiển trực tiếp (bắt đầu bằng "/" hoặc lệnh nhanh)
      const isCommand =
        text.startsWith("/") ||
        ["trạng thái", "nhiệt độ", "dừng khẩn cấp", "chạy", "tạm dừng", "dọn khay 1"].includes(
          text.toLowerCase()
        );

      if (isCommand) {
        // Lệnh đặc biệt /start của Telegram: Chào mừng và gửi bàn phím SCADA
        if (text === "/start") {
          const welcomeText =
            `👋 <b>Chào mừng bạn đến với SortiX-Med Copilot Bot!</b>\n\n` +
            `Hệ thống phân loại dụng cụ y tế tự động (PBL3 Biomedical & Industrial IoT).\n\n` +
            `🩺 <b>Bạn có thể:</b>\n` +
            `• Gõ bất kỳ câu hỏi nào để AI phân tích telemetry (VD: <i>"Nhiệt độ chip thế nào?", "Khay 2 có đầy chưa?"</i>)\n` +
            `• Sử dụng bàn phím SCADA bên dưới để điều khiển từ xa an toàn.\n\n` +
            `🔒 <i>Lưu ý: Các lệnh điều khiển yêu cầu tài khoản Quản trị viên liên kết Chat ID.</i>`;

          await TelegramBotService.sendMessage(
            chatId,
            welcomeText,
            TelegramBotService.getScadaKeyboard()
          );
          return NextResponse.json({ ok: true, handled: "welcome_command" });
        }

        // Lệnh đặc biệt /help: Hướng dẫn cú pháp
        if (text === "/help") {
          const helpText =
            `📖 <b>DANH SÁCH LỆNH SCADA SORTIX-MED:</b>\n\n` +
            `• <code>/status</code>: Xem trạng thái hệ thống, tốc độ và 3 khay chứa.\n` +
            `• <code>/temp</code>: Kiểm tra nhiệt độ cảm biến nội vi ESP32-C5.\n` +
            `• <code>/estop</code>: 🛑 <b>Dừng khẩn cấp toàn bộ băng tải</b> (0.2s).\n` +
            `• <code>/start</code>: ▶️ Khởi động lại băng tải (Yêu cầu Admin).\n` +
            `• <code>/stop</code>: ⏸️ Tạm dừng băng tải (Yêu cầu Admin).\n` +
            `• <code>/clear_bin 1</code>: 📦 Reset số đếm Khay 1 về 0.\n\n` +
            `💡 <i>Hoặc bạn chỉ cần bấm các nút điều khiển nhanh bên dưới!</i>`;

          await TelegramBotService.sendMessage(
            chatId,
            helpText,
            TelegramBotService.getScadaKeyboard()
          );
          return NextResponse.json({ ok: true, handled: "help_command" });
        }

        // Thực thi lệnh SCADA
        const result = await TelegramBotService.executeScadaCommand(text, chatId, senderName);
        await TelegramBotService.sendMessage(
          chatId,
          result.text,
          TelegramBotService.getScadaKeyboard()
        );
        return NextResponse.json({ ok: true, handled: "scada_command" });
      }

      // Trường hợp 2B: Hỏi đáp AI thông minh (Google Gemini 2.5 Flash)
      const aiResponse = await TelegramBotService.queryGeminiAI(text);
      await TelegramBotService.sendMessage(
        chatId,
        aiResponse,
        TelegramBotService.getScadaKeyboard()
      );

      return NextResponse.json({ ok: true, handled: "ai_inquiry" });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Telegram Webhook] Lỗi xử lý:", errorMsg);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * Endpoint GET để kiểm tra tình trạng Webhook và hỗ trợ cấu hình tự động
 */
export async function GET(req: NextRequest) {
  const token = TelegramBotService.getBotToken();
  const hasToken = Boolean(token && token !== "your_telegram_bot_token_here");
  const defaultChatId = TelegramBotService.getDefaultChatId();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const webhookUrl = searchParams.get("url");

  // Hỗ trợ đăng ký Webhook với Telegram qua query param: ?action=setWebhook&url=https://...
  if (action === "setWebhook" && webhookUrl && hasToken) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(token)}/setWebhook?url=${encodeURIComponent(
          webhookUrl
        )}`
      );
      const data = await res.json();
      return NextResponse.json({
        success: data.ok,
        description: data.description,
        registeredUrl: webhookUrl,
      });
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Network error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    status: "online",
    bot_configured: hasToken,
    default_chat_id: defaultChatId || "Chưa cấu hình",
    info: "SortiX-Med Dual-Platform Telegram Bot Webhook Gateway",
    endpoint: "/api/telegram/webhook",
  });
}

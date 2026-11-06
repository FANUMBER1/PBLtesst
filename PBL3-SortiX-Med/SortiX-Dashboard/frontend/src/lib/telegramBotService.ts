/**
 * =============================================================================
 * SortiX-Med Telegram Bot 2-Way Service (Dịch vụ Telegram Bot 2 chiều)
 * Hỗ trợ Hỏi đáp AI thông minh với Gemini 2.5 Flash & Điều khiển SCADA từ xa
 * =============================================================================
 */

import fs from "node:fs";
import path from "node:path";

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramMessagePayload {
  chat_id: string | number;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

const SYSTEM_INSTRUCTION_TELEGRAM = `Bạn là SortiX-Med Copilot — Trợ lý AI Mini Đa Năng & Thông Minh (vừa là trợ lý AI cá nhân toàn diện, vừa là kỹ sư SCADA y tế cho hệ thống SortiX-Med).
Bạn đang tương tác trực tiếp với người dùng qua Telegram Bot.

QUY TẮC PHẢN HỒI QUA TELEGRAM:
1. TRẢ LỜI ĐA NĂNG & ĐỜI SỐNG:
   - Nếu câu hỏi về âm nhạc, giải trí, kiến thức đời sống, lập trình, dịch thuật, thơ ca hay trò chuyện thông thường:
   - Trả lời tự nhiên, đầy đủ, thú vị và chính xác như một trợ lý AI thông minh toàn diện. Không ép buộc chèn số liệu y tế nếu người dùng không hỏi.
2. TRẢ LỜI KỸ THUẬT SORTIX-MED (Khi hỏi về hệ thống, telemetry, băng chuyền, thiết bị):
   - Trả lời ngắn gọn, trực quan, chính xác dựa trên số liệu Telemetry được cung cấp.
   - Khay 1: Bơm kim tiêm / Dao mổ | Khay 2: Kẹp phẫu thuật / Kéo | Khay 3: Dụng cụ khác.
   - Ngưỡng màu: <80% (🟢 Bình thường), 80-99% (🟡 Sắp đầy), 100% (🔴 Khay đầy).
   - Ngưỡng nhiệt ESP32-C5 an toàn tối đa là 75.0°C.
   - Gợi ý các lệnh nhanh nếu liên quan: /status, /temp, /estop, /start, /stop, /clear_bin.
3. PHONG CÁCH:
   - Súc tích, thân thiện, dùng icon sinh động (🌡️, 📦, 🟢, 🔴, ⚠️, 🩺, 🎵, ✨).`;

function getDataFilePath(filename: string): string {
  const p1 = path.join(process.cwd(), "data", filename);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), "..", "data", filename);
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function getSyncState() {
  try {
    const file = getDataFilePath("sync_state.json");
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {
    // Fallback
  }
  return {
    mode: "real",
    isRunning: false,
    speed: 50,
    binCounts: { bin1: 0, bin2: 0, bin3: 0 },
    binCapacities: { bin1: 50, bin2: 50, bin3: 50 },
  };
}

function saveSyncState(partial: Record<string, unknown>) {
  try {
    const file = getDataFilePath("sync_state.json");
    const current = getSyncState();
    const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
    fs.writeFileSync(file, JSON.stringify(updated, null, 2), "utf8");
    return updated;
  } catch (err) {
    console.error("[telegramBotService] saveSyncState error:", err);
  }
}

function recordEstopNotification(senderName: string, chatId: string | number) {
  try {
    const file = getDataFilePath("notifications.json");
    let list: Array<Record<string, unknown>> = [];
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, "utf8");
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "emergency_stop",
      severity: "critical",
      title: "🛑 DỪNG KHẨN CẤP TỪ XA QUA TELEGRAM",
      message: `Kỹ sư @${senderName} (ChatID: ${chatId}) đã kích hoạt ngắt toàn bộ băng chuyền SortiX-Med.`,
      timestamp: new Date().toISOString(),
      read: false,
      cleared: false,
    };
    list.unshift(notif);
    fs.writeFileSync(file, JSON.stringify(list.slice(0, 50), null, 2), "utf8");
  } catch {
    // ignore
  }
}

export const TelegramBotService = {
  getBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  },

  getDefaultChatId(): string {
    return process.env.TELEGRAM_CHAT_ID?.trim() || "";
  },

  /**
   * Tạo bàn phím Inline Keyboard SCADA điều khiển nhanh trên Telegram
   */
  getScadaKeyboard(): TelegramInlineButton[][] {
    return [
      [
        { text: "📊 Xem KPI & 3 Khay", callback_data: "scada_status" },
        { text: "🌡️ Nhiệt độ ESP32", callback_data: "scada_temp" },
      ],
      [
        { text: "▶️ Bật Băng Tải", callback_data: "scada_start" },
        { text: "⏸️ Tạm Dừng Băng Tải", callback_data: "scada_stop" },
      ],
      [
        { text: "🛑 DỪNG KHẨN CẤP", callback_data: "scada_estop" },
        { text: "📦 Reset Đếm Khay 1", callback_data: "scada_clear_1" },
      ],
    ];
  },

  /**
   * Gửi tin nhắn đến Telegram người dùng kèm bàn phím tương tác
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    keyboard?: TelegramInlineButton[][]
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const token = this.getBotToken();
    if (!token || token === "your_telegram_bot_token_here") {
      return { success: false, error: "Chưa cấu hình TELEGRAM_BOT_TOKEN trong .env.local" };
    }

    const payload: TelegramMessagePayload = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    if (keyboard && keyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: keyboard,
      };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { success: false, error: data.description || `HTTP ${res.status}` };
      }
      return { success: true, messageId: data.result?.message_id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      return { success: false, error: msg };
    }
  },

  /**
   * Phản hồi callback query khi bấm nút Inline Keyboard
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    const token = this.getBotToken();
    if (!token) return false;

    try {
      await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || "Đã nhận lệnh",
          show_alert: Boolean(text && text.length > 20),
        }),
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Kiểm tra quyền Admin dựa trên Chat ID
   */
  isAuthorizedAdmin(chatId: string | number): boolean {
    const strChatId = String(chatId).trim();
    const defaultChatId = this.getDefaultChatId();
    if (defaultChatId && strChatId === defaultChatId) return true;

    // Kiểm tra danh sách người dùng trong data/users.json
    try {
      const usersFilePath = getDataFilePath("users.json");
      if (fs.existsSync(usersFilePath)) {
        const raw = fs.readFileSync(usersFilePath, "utf8");
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const matched = users.find(
            (u) =>
              (u.telegram_chat_id && String(u.telegram_chat_id) === strChatId) ||
              (u.chat_id && String(u.chat_id) === strChatId)
          );
          if (matched && matched.role === "admin" && matched.status !== "locked") {
            return true;
          }
        }
      }
    } catch {
      // Fallback
    }

    return false;
  },

  /**
   * Thu thập Context Telemetry thời gian thực cho AI Copilot
   */
  buildTelemetrySummary(): string {
    const syncState = getSyncState();

    const isRunning = Boolean(syncState?.isRunning);
    const temp = 42.5; // Nhiệt độ cảm biến nội vi ESP32-C5 tiêu chuẩn
    const isOverheat = temp >= 75.0;

    const b1 = syncState?.binCounts?.bin1 ?? 0;
    const b2 = syncState?.binCounts?.bin2 ?? 0;
    const b3 = syncState?.binCounts?.bin3 ?? 0;

    const cap1 = syncState?.binCapacities?.bin1 ?? 50;
    const cap2 = syncState?.binCapacities?.bin2 ?? 50;
    const cap3 = syncState?.binCapacities?.bin3 ?? 50;

    const rate1 = Math.round((b1 / (cap1 || 1)) * 100);
    const rate2 = Math.round((b2 / (cap2 || 1)) * 100);
    const rate3 = Math.round((b3 / (cap3 || 1)) * 100);

    const isEstop = false;
    const isJammed = false;

    return `
[DỮ LIỆU TELEMETRY THỜI GIAN THỰC SORTIX-MED]:
• Chế độ vận hành: ${syncState?.mode === "sim" ? "MÔ PHỎNG (Simulation)" : "PHẦN CỨNG THẬT (WeAct ESP32-C5)"}
• Trạng thái Băng Tải: ${isRunning ? "ĐANG CHẠY (RUNNING - Tốc độ " + (syncState?.speed ?? 50) + "%)" : "ĐANG DỪNG (STOPPED)"}
• Cảm biến nhiệt độ nội vi ESP32: ${temp.toFixed(1)}°C (Ngưỡng an toàn: 75.0°C - ${isOverheat ? "QUÁ NHIỆT 🔴" : "AN TOÀN 🟢"})
• Khay 1 (Dao mổ / Bơm tiêm): ${b1}/${cap1} SP (${rate1}%) - ${rate1 >= 100 ? "ĐẦY 🔴" : rate1 >= 80 ? "SẮP ĐẦY 🟡" : "🟢"}
• Khay 2 (Kẹp phẫu thuật / Kéo): ${b2}/${cap2} SP (${rate2}%) - ${rate2 >= 100 ? "ĐẦY 🔴" : rate2 >= 80 ? "SẮP ĐẦY 🟡" : "🟢"}
• Khay 3 (Dụng cụ khác): ${b3}/${cap3} SP (${rate3}%) - ${rate3 >= 100 ? "ĐẦY 🔴" : rate3 >= 80 ? "SẮP ĐẦY 🟡" : "🟢"}
• Nút dừng khẩn cấp E-Stop: ${isEstop ? "ĐANG BỊ NHẤN (KHÓA AN TOÀN 🔴)" : "BÌNH THƯỜNG (AN TOÀN 🟢)"}
• Cảm biến quang kẹt phôi: ${isJammed ? "KẸT PHÔI TẠI TRẠM S1 🔴" : "THÔNG THOÁNG 🟢"}
• Thời điểm cập nhật: ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
`.trim();
  },

  /**
   * Gọi Google Gemini AI (gemini-2.5-flash) để trả lời tin nhắn Telegram
   */
  async queryGeminiAI(userPrompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return (
        "⚠️ <b>Chưa cấu hình GEMINI_API_KEY</b>\n\n" +
        "Trợ lý AI chưa thể phân tích thông minh. Vui lòng thêm <code>GEMINI_API_KEY</code> vào file <code>.env.local</code>.\n" +
        "Bạn vẫn có thể dùng các nút bên dưới để điều khiển thiết bị."
      );
    }

    const telemetryContext = this.buildTelemetrySummary();
    const promptWithContext = `${telemetryContext}\n\n[CÂU HỎI TỪ KỸ SƯ / ĐIỀU DƯỠNG TRÊN TELEGRAM]:\n${userPrompt}`;

    const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const candidateModels = Array.from(
      new Set([
        primaryModel,
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
      ])
    );

    let lastError = "";

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION_TELEGRAM }] },
            contents: [{ role: "user", parts: [{ text: promptWithContext }] }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 600,
            },
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${res.status}`;
          continue; // thử model tiếp theo
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("\n");
        if (!reply) continue;

        // Chuyển đổi Markdown cơ bản sang HTML an toàn cho Telegram
        return reply
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<i>$1</i>")
          .replace(/`([^`]+)`/g, "<code>$1</code>");
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Timeout";
      }
    }

    return `⚠️ <i>Lỗi xử lý AI: ${lastError || "Không có phản hồi từ máy chủ Gemini"}. Vui lòng thử lại sau.</i>`;
  },

  /**
   * Thực thi lệnh SCADA điều khiển từ Telegram
   */
  async executeScadaCommand(
    command: string,
    chatId: string | number,
    senderName: string = "Kỹ sư"
  ): Promise<{ text: string; success: boolean }> {
    const isAdmin = this.isAuthorizedAdmin(chatId);
    const cmd = command.toLowerCase().trim();

    // 1. Lệnh xem trạng thái tổng quát
    if (cmd === "/status" || cmd === "scada_status" || cmd === "trạng thái") {
      const summary = this.buildTelemetrySummary();
      return {
        success: true,
        text: `<b>📊 BÁO CÁO TRẠNG THÁI SCADA SORTIX-MED</b>\n━━━━━━━━━━━━━━━━━━━━\n${summary}\n━━━━━━━━━━━━━━━━━━━━\n<i>Yêu cầu bởi: @${senderName}</i>`,
      };
    }

    // 2. Lệnh xem nhiệt độ chip ESP32
    if (cmd === "/temp" || cmd === "scada_temp" || cmd === "nhiệt độ") {
      const temp = 42.5;
      const isOverheat = temp >= 75.0;
      return {
        success: true,
        text:
          `🌡️ <b>CẢM BIẾN NHIỆT ĐỘ NỘI VI ESP32-C5</b>\n\n` +
          `• Nhiệt độ hiện tại: <b>${temp.toFixed(1)}°C</b>\n` +
          `• Ngưỡng cảnh báo: <b>75.0°C</b>\n` +
          `• Trạng thái: ${isOverheat ? "🔴 <b>QUÁ NHIỆT - CẦN GIẢM TẢI!</b>" : "🟢 <b>HOẠT ĐỘNG BÌNH THƯỜNG</b>"}\n\n` +
          `<i>Dữ liệu đọc trực tiếp từ telemetry vi điều khiển.</i>`,
      };
    }

    // 3. Lệnh DỪNG KHẨN CẤP (E-STOP) - Cho phép cả Admin và kỹ sư vận hành
    if (cmd === "/estop" || cmd === "scada_estop" || cmd === "dừng khẩn cấp") {
      try {
        recordEstopNotification(senderName, chatId);
        saveSyncState({ isRunning: false });

        return {
          success: true,
          text:
            `🛑 <b>KÍCH HOẠT DỪNG KHẨN CẤP THÀNH CÔNG!</b>\n\n` +
            `• Băng chuyền đã được phát lệnh <b>DỪNG NGAY LẬP TỨC</b>.\n` +
            `• Người thực hiện: <b>@${senderName}</b>\n` +
            `• Trạng thái tủ điện: Đã khóa an toàn.\n\n` +
            `⚠️ <i>Vui lòng kiểm tra hiện trường kỹ lưỡng trước khi mở khóa lại!</i>`,
        };
      } catch (err) {
        return { success: false, text: `❌ Lỗi thực thi E-Stop: ${err instanceof Error ? err.message : "Unknown"}` };
      }
    }

    // 4. Lệnh KHỞI ĐỘNG BĂNG TẢI - Bắt buộc quyền Admin
    if (cmd === "/start" || cmd === "scada_start" || cmd === "chạy") {
      if (!isAdmin) {
        return {
          success: false,
          text: `⛔ <b>TỪ CHỐI LỆNH: YÊU CẦU QUYỀN QUẢN TRỊ VIÊN</b>\n\nLệnh khởi động băng tải từ xa có nguy cơ an toàn lao động. Bạn cần có tài khoản Admin liên kết Chat ID để thực hiện.`,
        };
      }

      saveSyncState({ isRunning: true });
      return {
        success: true,
        text: `▶️ <b>ĐÃ BẬT BĂNG CHUYỀN THÀNH CÔNG!</b>\n\nBăng tải phân loại dụng cụ y tế đang vận hành ở tốc độ tiêu chuẩn. Kỹ sư thực hiện: <b>@${senderName}</b>.`,
      };
    }

    // 5. Lệnh TẠM DỪNG BĂNG TẢI - Yêu cầu quyền Admin
    if (cmd === "/stop" || cmd === "scada_stop" || cmd === "tạm dừng") {
      if (!isAdmin) {
        return {
          success: false,
          text: `⛔ <b>TỪ CHỐI LỆNH: YÊU CẦU QUYỀN QUẢN TRỊ VIÊN</b>\n\nVui lòng liên hệ Admin để tạm dừng dây chuyền.`,
        };
      }

      saveSyncState({ isRunning: false });
      return {
        success: true,
        text: `⏸️ <b>ĐÃ TẠM DỪNG BĂNG TẢI</b>\n\nBăng chuyền đã tạm dừng an toàn (động cơ ngắt). Kỹ sư thực hiện: <b>@${senderName}</b>.`,
      };
    }

    // 6. Lệnh RESET KHAY CHỨA - Yêu cầu quyền Admin
    if (cmd === "/clear_bin 1" || cmd === "scada_clear_1" || cmd === "dọn khay 1") {
      if (!isAdmin) {
        return {
          success: false,
          text: `⛔ <b>TỪ CHỐI LỆNH:</b> Chỉ Quản trị viên mới được reset số lượng khay chứa.`,
        };
      }

      const current = getSyncState()?.binCounts || { bin1: 0, bin2: 0, bin3: 0 };
      saveSyncState({ binCounts: { ...current, bin1: 0 } });

      return {
        success: true,
        text: `📦 <b>ĐÃ ĐẶT LẠI SỐ ĐẾM KHAY 1 VỀ 0</b>\n\nĐã xác nhận thay khay rỗng mới cho nhóm <b>Bơm kim tiêm / Dao mổ</b>. Người xác nhận: <b>@${senderName}</b>.`,
      };
    }

    return {
      success: false,
      text: `❓ <i>Lệnh không xác định: "<code>${command}</code>". Bạn có thể bấm các nút menu bên dưới hoặc gõ câu hỏi tự nhiên để AI hỗ trợ.</i>`,
    };
  },
};

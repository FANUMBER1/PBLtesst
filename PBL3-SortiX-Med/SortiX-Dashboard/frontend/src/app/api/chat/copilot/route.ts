import { NextRequest, NextResponse } from "next/server";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
      role?: string;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

const SYSTEM_INSTRUCTION = `Bạn là SortiX-Med Copilot — Trợ lý AI Mini Đa Năng & Thông Minh (kết hợp hoàn hảo giữa vai trò Trợ lý AI Cá Nhân Đa Năng như ChatGPT/Gemini và Chuyên gia Kỹ thuật Y sinh / IoT SCADA cho hệ thống SortiX-Med).

🎯 NGUYÊN TẮC HOẠT ĐỘNG TOÀN DIỆN (MINI AI ĐA NĂNG):

1. TRẢ LỜI CÂU HỎI TỔNG QUÁT, KIẾN THỨC & ĐỜI SỐNG (AI Mini Đa Năng):
   - Khi người dùng hỏi về kiến thức chung, âm nhạc, nghệ sĩ (ví dụ: Jack - J97, lời bài hát, ca khúc...), khoa học đời sống, công nghệ, lập trình, dịch thuật, giải trí hay trò chuyện thường ngày:
   - Bạn HÃY TRẢ LỜI ĐẦY ĐỦ, CHÍNH XÁC, TỰ NHIÊN, THÂN THIỆN VÀ CHI TIẾT như một trợ lý AI thông minh toàn diện.
   - Trong trường hợp này: KHÔNG bắt buộc phải chèn thông tin y tế, KHÔNG tự động báo cáo khay hay số liệu kỹ thuật nếu người dùng không hỏi đến.

2. CHUYÊN MÔN HỆ THỐNG SORTIX-MED & SCADA IOT (Khi người dùng hỏi về thiết bị, ca trực hoặc hệ thống):
   - Nhận diện chế độ vận hành: Nếu người dùng hỏi về trạng thái hệ thống và ngữ cảnh có [CHẾ ĐỘ MÔ PHỎNG] hoặc [CHẾ ĐỘ THỰC TẾ], hãy gắn nhãn này ở đầu câu trả lời.
   - Nhận diện tài khoản & Người phụ trách ca trực: Khi được hỏi về admin hiện tại là ai, ai đang đăng nhập, tôi là ai, ca trực này của ai... hãy trích xuất chính xác họ tên từ [THÔNG TIN TÀI KHOẢN & NGƯỜI ĐANG TRỰC CA] trong ngữ cảnh (ví dụ: Quản trị viên Nguyễn Tá Duy Phong).
   - Kiểm tra an toàn thiết bị y tế:
     * Cảm biến nhiệt ESP32-C5: Ngưỡng an toàn tối đa 75.0°C. Nếu >= 75°C, lập tức cảnh báo quá nhiệt 🔴.
     * Cảm biến quang #02 Zone A: Kiểm tra cờ kẹt phôi (jam_detected).
     * Nút dừng khẩn cấp E-Stop: Báo rõ trạng thái và hướng dẫn mở khóa an toàn (yêu cầu quyền Admin).
   - Thống kê 3 khay chứa:
     * Khay 1 (Dao mổ & Kéo phẫu thuật), Khay 2 (Kẹp panh cầm máu), Khay 3 (Dụng cụ đặc biệt).
     * Quy chuẩn 3 màu: 🟢 <80% (An toàn, phân loại bình thường), 🟡 80-99% (Cảnh báo sắp đầy), 🔴 100% (Khay đầy, cần thay khay ngay).
     * Dùng bảng Markdown chuẩn (| Cột 1 | Cột 2 |...) khi bóc tách số liệu dụng cụ.
     * Luôn kết luận rõ: "Hệ thống ĐỦ ĐIỀU KIỆN hay KHÔNG ĐỦ ĐIỀU KIỆN an toàn để tiếp tục vận hành?".

3. PHONG CÁCH GIAO TIẾP:
   - Thân thiện, tôn trọng, thông minh, đúng trọng tâm câu hỏi. Luôn dùng icon sinh động (✨, 🩺, 🎵, 📦, 🟢, 🔴).`;

async function queryGemini(
  model: string,
  apiKey: string,
  promptText: string
): Promise<{ text: string; error?: string; status?: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload: Record<string, unknown> = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1500,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as GeminiResponse;
    const msg = errorData?.error?.message || `HTTP ${res.status}`;
    return { text: "", error: msg, status: res.status };
  }

  const data = (await res.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const reply = candidate?.content?.parts?.map((p) => p.text).join("\n") || "";

  return { text: reply };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const chatInput =
      typeof body.chatInput === "string"
        ? body.chatInput
        : typeof body.message === "string"
        ? body.message
        : "";

    if (!chatInput.trim()) {
      return NextResponse.json(
        { success: false, output: "Vui lòng nhập câu hỏi hoặc chọn một gợi ý." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // Nếu chưa cấu hình API Key, trả về thông báo hướng dẫn cụ thể
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        output: `### ⚠️ Chưa thiết lập GEMINI_API_KEY trong hệ thống

Hệ thống **SortiX-Med Copilot** đã sẵn sàng hoạt động ở chế độ API trực tiếp (không cần mở n8n). Để kích hoạt, bạn chỉ cần cấu hình khóa API miễn phí:

1. Truy cập **[Google AI Studio](https://aistudio.google.com/)** và tạo **API Key** miễn phí.
2. Mở file \`.env.local\` trong thư mục \`SortiX-Dashboard\` và thêm:
\`\`\`env
GEMINI_API_KEY=AIzaSy...của_bạn
GEMINI_MODEL=gemini-3.5-flash-lite
\`\`\`
3. Sau khi lưu, bạn có thể chat trực tiếp với AI Agent với tốc độ cao và ổn định 100%!`,
        model: "unconfigured",
      });
    }

    const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const candidateModels = [
      primaryModel,
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
    ];
    // Loại bỏ các model trùng lặp
    const uniqueModels = Array.from(new Set(candidateModels));

    let result: { text: string; error?: string; status?: number } = {
      text: "",
      error: "Chưa thử gọi model",
      status: 500,
    };
    let activeModel = primaryModel;

    // Thử lần lượt các model cho đến khi thành công
    for (const modelToTry of uniqueModels) {
      const callResult = await queryGemini(modelToTry, apiKey, chatInput);
      if (!callResult.error && callResult.text) {
        result = callResult;
        activeModel = modelToTry;
        break;
      } else {
        console.warn(
          `[SortiX Copilot] Model ${modelToTry} không phản hồi (${callResult.error}), đang chuyển sang model tiếp theo...`
        );
        result = callResult;
      }
    }

    if (result.error) {
      return NextResponse.json({
        success: false,
        output: `⚠️ **Không thể tạo câu trả lời từ Google Gemini** (\`${result.error}\`)\n\n*Kiểm tra nhanh*:\n• API Key trong \`.env.local\` có chính xác và còn quota không.\n• Kết nối Internet từ máy tính đến \`generativelanguage.googleapis.com\`.`,
        model: activeModel,
      });
    }

    return NextResponse.json({
      success: true,
      output: result.text || "Hệ thống đã ghi nhận nhưng không nhận được nội dung từ mô hình.",
      model: activeModel,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Lỗi xử lý yêu cầu AI";
    return NextResponse.json(
      {
        success: false,
        output: `⚠️ **Lỗi máy chủ nội bộ:** \`${errorMsg}\``,
      },
      { status: 500 }
    );
  }
}

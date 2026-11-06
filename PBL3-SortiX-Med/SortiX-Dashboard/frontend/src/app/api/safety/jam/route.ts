import { NextResponse } from "next/server";
import { SafetyService } from "@/services/safetyService";
import { JamDetectedPayloadSchema } from "@shared/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = JamDetectedPayloadSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu sự kiện Kẹt Phôi không đúng định dạng",
          errors: validated.error.format(),
        },
        { status: 400 }
      );
    }

    if (validated.data.duration_seconds < 5) {
      return NextResponse.json(
        { success: false, message: "Cảnh báo kẹt phôi chỉ hợp lệ sau ít nhất 5 giây che khuất liên tục." },
        { status: 422 }
      );
    }

    const result = SafetyService.triggerJamAlert(validated.data);
    return NextResponse.json({
      success: true,
      message: "Đã phát hiện và ghi nhận sự cố kẹt phôi trên băng chuyền",
      data: result,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi xử lý request Jam Alert" }, { status: 500 });
  }
}

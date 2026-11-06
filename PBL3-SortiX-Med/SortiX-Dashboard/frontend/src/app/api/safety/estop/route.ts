import { NextResponse } from "next/server";
import { SafetyService } from "@/services/safetyService";
import { EmergencyStopPayloadSchema } from "@shared/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = EmergencyStopPayloadSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu sự kiện Emergency Stop không đúng định dạng",
          errors: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const result = SafetyService.triggerEmergencyStop(validated.data);
    return NextResponse.json({
      success: true,
      message: "Đã kích hoạt ngắt khẩn cấp và khóa toàn hệ thống",
      data: result,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi xử lý request E-Stop" }, { status: 500 });
  }
}

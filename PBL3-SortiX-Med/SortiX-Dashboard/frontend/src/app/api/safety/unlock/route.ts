import { NextResponse } from "next/server";
import { SafetyService } from "@/services/safetyService";
import { UnlockSystemSchema } from "@shared/schemas";
import { DEFAULT_MQTT_TOPICS } from "@shared/constants";
import { getAdminUser } from "../../auth/session";
import mqtt from "mqtt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminUser = getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Từ chối truy cập: Chỉ tài khoản Quản trị viên (Admin) mới có quyền mở khóa an toàn hệ thống.",
        },
        { status: 403 }
      );
    }

    let note: string | undefined;
    try {
      const body = await request.json();
      const validated = UnlockSystemSchema.safeParse(body);
      if (validated.success) {
        note = validated.data.note;
      }
    } catch {
      // Body may be empty
    }

    if (!note?.trim() || note.trim().length > 255) {
      return NextResponse.json(
        { success: false, message: "Bắt buộc nhập ghi chú xác nhận an toàn (1–255 ký tự)." },
        { status: 400 }
      );
    }

    const controlSecret = process.env.SORTIX_CONTROL_SECRET || process.env.MQTT_CONTROL_SECRET;
    if (!controlSecret || controlSecret.length < 16) {
      return NextResponse.json(
        {
          success: false,
          message: "Lỗi cấu hình bảo mật máy chủ: SORTIX_CONTROL_SECRET / MQTT_CONTROL_SECRET phải dài ít nhất 16 ký tự.",
        },
        { status: 500 }
      );
    }

    const brokerUrl = process.env.MQTT_BROKER_URL?.trim() || "";
    if (!brokerUrl.startsWith("mqtts://") && !brokerUrl.startsWith("wss://")) {
      return NextResponse.json(
        { success: false, message: "Lỗi cấu hình: MQTT_BROKER_URL phải dùng TLS (mqtts:// hoặc wss://)." },
        { status: 500 }
      );
    }
    const mqttUsername = process.env.MQTT_USERNAME?.trim() || "";
    const mqttPassword = process.env.MQTT_PASSWORD || "";
    if ((mqttUsername === "") !== (mqttPassword === "")) {
      return NextResponse.json(
        { success: false, message: "Lỗi cấu hình: cần đặt đồng thời MQTT_USERNAME và MQTT_PASSWORD." },
        { status: 500 }
      );
    }
    const releasePayload = JSON.stringify({
      command: "ESTOP_RELEASE",
      timestamp: new Date().toISOString(),
      released_by: adminUser.username || adminUser.id,
      auth_token: controlSecret,
      note: note.trim(),
    });

    // Xuất bản lệnh mở khóa ESTOP_RELEASE tới phần cứng qua MQTT với cơ chế Fail-Secure
    try {
      await new Promise<void>((resolve, reject) => {
        const client = mqtt.connect(brokerUrl, {
          clientId: `next_unlock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          connectTimeout: 8000,
          ...(mqttUsername ? { username: mqttUsername, password: mqttPassword } : {}),
        });

        const timer = setTimeout(() => {
          try { client.end(true); } catch {}
          reject(new Error("Timeout kết nối hoặc gửi lệnh mở khóa tới MQTT broker"));
        }, 8000);

        client.on("connect", () => {
          client.publish(DEFAULT_MQTT_TOPICS.CONTROL, releasePayload, { qos: 1 }, (err) => {
            clearTimeout(timer);
            try { client.end(true); } catch {}
            if (err) reject(err);
            else resolve();
          });
        });

        client.on("error", (err) => {
          clearTimeout(timer);
          try { client.end(true); } catch {}
          reject(err);
        });
      });
    } catch (mqttErr) {
      console.error("[Unlock Route] Thất bại khi gửi MQTT ESTOP_RELEASE tới phần cứng:", mqttErr);
      return NextResponse.json(
        {
          success: false,
          message: "Không thể kết nối hoặc gửi lệnh mở khóa tới MQTT broker phần cứng. Hệ thống duy trì khóa an toàn để đảm bảo tính mạng và thiết bị.",
        },
        { status: 503 }
      );
    }

    const result = SafetyService.unlockSystem(adminUser.username || adminUser.id, note.trim());
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Lỗi xử lý request mở khóa" }, { status: 500 });
  }
}

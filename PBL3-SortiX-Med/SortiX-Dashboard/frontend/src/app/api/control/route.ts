import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../auth/session";
import { DEFAULT_MQTT_TOPICS } from "@shared/constants";
import mqtt from "mqtt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "401 Unauthorized: Vui lòng đăng nhập để gửi lệnh điều khiển" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const command = typeof body?.command === "string" ? body.command.trim() : "";
    const value = typeof body?.value === "number" && Number.isFinite(body.value) ? body.value : null;

    if (!command) {
      return NextResponse.json({ success: false, message: "Lệnh command không được để trống" }, { status: 400 });
    }

    // Lệnh nhả E-Stop yêu cầu quyền Admin
    if (command === "ESTOP_RELEASE" && authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền mở khóa an toàn" },
        { status: 403 }
      );
    }

    const controlSecret = process.env.SORTIX_CONTROL_SECRET || process.env.MQTT_CONTROL_SECRET;
    if (!controlSecret || controlSecret.length < 16) {
      return NextResponse.json(
        { success: false, message: "Lỗi cấu hình: SORTIX_CONTROL_SECRET / MQTT_CONTROL_SECRET phải dài ít nhất 16 ký tự." },
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
    const topic = process.env.MQTT_TOPIC_CONTROL || DEFAULT_MQTT_TOPICS.CONTROL || "sorter/sorter_01/control";

    const payload = JSON.stringify({
      command,
      value,
      timestamp: new Date().toISOString(),
      auth_token: controlSecret,
      sender_id: authUser.id,
      sender_role: authUser.role,
    });

    // Xuất bản lệnh điều khiển qua MQTT Broker từ phía Server
    await new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(brokerUrl, {
        clientId: `next_control_pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        connectTimeout: 5000,
        ...(mqttUsername ? { username: mqttUsername, password: mqttPassword } : {}),
      });

      const timer = setTimeout(() => {
        try { client.end(true); } catch {}
        reject(new Error("Timeout kết nối tới MQTT Broker khi gửi lệnh điều khiển"));
      }, 5000);

      client.on("connect", () => {
        client.publish(topic, payload, { qos: 1 }, (err) => {
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

    return NextResponse.json({
      success: true,
      message: `Lệnh '${command}' đã được gửi an toàn tới thiết bị qua server`,
      command,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi server khi phát lệnh điều khiển";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

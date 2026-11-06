import { NextResponse } from "next/server";
import { getServerConfig, updateServerConfig, resetServerConfig } from "@/services/configService";
import { getAdminUser } from "../auth/session";
import { DEFAULT_MQTT_TOPICS } from "@shared/constants";
import mqtt from "mqtt";

async function publishConfigToHardware(config: unknown): Promise<boolean> {
  const controlSecret = process.env.SORTIX_CONTROL_SECRET || process.env.MQTT_CONTROL_SECRET;
  const brokerUrl = process.env.MQTT_BROKER_URL?.trim() || "";
  if (!controlSecret || controlSecret.length < 16 || !config || typeof config !== "object" ||
      (!brokerUrl.startsWith("mqtts://") && !brokerUrl.startsWith("wss://"))) return false;
  const mqttUsername = process.env.MQTT_USERNAME?.trim() || "";
  const mqttPassword = process.env.MQTT_PASSWORD || "";
  if ((mqttUsername === "") !== (mqttPassword === "")) return false;

  const conf = config as Record<string, unknown>;
  const mqttPayload = JSON.stringify({
    config_version: conf.config_version,
    bins: conf.bins,
    apply_mode: conf.apply_mode || "when_line_empty",
    auth_token: controlSecret,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(brokerUrl, {
        clientId: `next_cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        connectTimeout: 4000,
        ...(mqttUsername ? { username: mqttUsername, password: mqttPassword } : {}),
      });

      const timer = setTimeout(() => {
        try { client.end(true); } catch {}
        reject(new Error("Timeout connecting to the configured TLS MQTT broker"));
      }, 4000);

      client.on("connect", () => {
        client.publish(DEFAULT_MQTT_TOPICS.CONFIG_SET, mqttPayload, { qos: 1 }, (err) => {
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
    return true;
  } catch (err) {
    console.warn("[Config Route] Lỗi xuất bản config_set tới phần cứng qua MQTT:", err);
    return false;
  }
}

export async function GET(request: Request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }
  const config = getServerConfig();
  return NextResponse.json({ success: true, data: config });
}

export async function POST(request: Request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (body && body.action === "reset") {
      const reset = resetServerConfig();
      const hardwareSync = await publishConfigToHardware(reset);
      return NextResponse.json({ success: true, hardware_sync: hardwareSync, message: "Reset to default config", data: reset });
    }

    const result = updateServerConfig(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const hardwareSync = await publishConfigToHardware(result.config);

    return NextResponse.json({
      success: true,
      hardware_sync: hardwareSync,
      message: `Config updated to v${result.config?.config_version}`,
      data: result.config,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}

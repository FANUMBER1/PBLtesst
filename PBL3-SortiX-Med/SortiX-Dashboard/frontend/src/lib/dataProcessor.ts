// Bộ chuẩn hóa dữ liệu thô và phát hiện cảnh báo từ IoT / nhận diện ảnh
import { TelemetryData, VisionDetection, SorterConfig, AlertEvent, CATALOG_BRANDS } from "./types";
import { TelemetrySchema, VisionDetectionSchema } from "./schemas";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function cleanTelemetryPayload(raw: unknown, prev: TelemetryData): TelemetryData {
  if (!isRecord(raw)) return prev;

  // Ignore malformed individual fields instead of dropping an otherwise valid
  // heartbeat. Devices in the field occasionally serialize numbers/booleans as
  // strings, so accept the unambiguous forms first.
  const candidate: Record<string, unknown> = { ...raw };

  // Chuẩn hóa cảm biến quang / hồng ngoại (S1) từ ESP32 HTTP POST / MQTT
  const rawOptical = candidate.optical_sensor ?? candidate.sensor_optical;
  if (rawOptical !== undefined) {
    const isBlocked =
      rawOptical === "BLOCKED" ||
      rawOptical === 1 ||
      rawOptical === "1" ||
      rawOptical === true;
    candidate.s1_entry = isBlocked;

    // QUY TẮC CỐT LÕI (FE): CÒN VẬT THÌ CHẠY, HẾT VẬT DỪNG NGAY
    // Băng tải chỉ chạy khi có vật cản trước cảm biến S1. Không có vật cản -> Băng tải dừng ngay!
    candidate.conveyor_running = isBlocked;
    if (!isBlocked) {
      candidate.conveyor_speed = 0;
    }
  }
  if (candidate.temperature !== undefined && candidate.cpu_temp === undefined) {
    candidate.cpu_temp = typeof candidate.temperature === "number" ? candidate.temperature : Number(candidate.temperature);
  }
  if (candidate.is_running !== undefined && candidate.conveyor_running === undefined) {
    candidate.conveyor_running = Boolean(candidate.is_running);
  }

  const numericKeys = [
    "uptime", "cpu_temp", "wifi_rssi", "conveyor_speed", "encoder_count",
    "active_config_version",
  ] as const;
  for (const key of numericKeys) {
    if (!(key in candidate)) continue;
    const value = candidate[key];
    if (typeof value === "string" && value.trim() !== "") {
      const parsedNumber = Number(value);
      if (Number.isFinite(parsedNumber)) candidate[key] = parsedNumber;
    }
    if (typeof candidate[key] !== "number" || !Number.isFinite(candidate[key])) {
      delete candidate[key];
    }
  }
  const booleanKeys = [
    "online", "conveyor_running", "s1_entry", "s2_sorter1", "s3_sorter2",
    "arm1_active", "arm2_active", "estop_pressed",
  ] as const;
  for (const key of booleanKeys) {
    if (!(key in candidate)) continue;
    const value = candidate[key];
    if (value === "true") candidate[key] = true;
    else if (value === "false") candidate[key] = false;
    else if (typeof value !== "boolean") delete candidate[key];
  }

  const parsed = TelemetrySchema.safeParse(candidate);
  if (parsed.success) {
    const merged = { ...prev } as TelemetryData;
    const telemetryKeys: (keyof TelemetryData)[] = [
      "device_id", "online", "uptime", "cpu_temp", "wifi_rssi", "wifi_band",
      "conveyor_running", "conveyor_speed", "s1_entry", "s2_sorter1", "s3_sorter2",
      "arm1_active", "arm2_active", "estop_pressed", "encoder_count", "active_config_version",
    ];
    for (const key of telemetryKeys) {
      if (Object.prototype.hasOwnProperty.call(candidate, key) && parsed.data[key] !== undefined) {
        (merged as unknown as Record<string, unknown>)[key] = parsed.data[key];
      }
    }
    return {
      ...merged,
      device_id: merged.device_id || prev.device_id,
      last_heartbeat: new Date().toISOString(),
    } as TelemetryData;
  }
  
  return prev;
}

export function normalizeBrandId(rawBrand: string): string {
  const lower = String(rawBrand || "").toLowerCase().trim();
  if (lower.includes("coca") || lower === "brand_c") return "brand_c";
  if (lower.includes("pepsi") || lower === "brand_a") return "brand_a";
  if (lower.includes("red") || lower.includes("bull") || lower === "brand_b") return "brand_b";
  if (lower.includes("aqua") || lower === "brand_d") return "brand_d";
  return lower;
}

export function cleanVisionPayload(raw: unknown): VisionDetection | null {
  if (!isRecord(raw)) return null;

  const rawBrand = [raw.brand_id, raw.brand, raw.itemType, raw.item_type, raw.class_name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!rawBrand) return null;
  const brandId = normalizeBrandId(rawBrand);
  if (!brandId) return null;

  const confidenceValue = Number(raw.confidence ?? 0.95);
  if (!Number.isFinite(confidenceValue)) return null;

  const payload = {
    product_id: String(raw.product_id || raw.id || `pkg_${Math.floor(1000 + Math.random() * 9000)}`).trim(),
    brand_id: brandId,
    confidence: confidenceValue,
    catalog_version: String(raw.catalog_version || "catalog_01"),
    timestamp: typeof raw.timestamp === "string" && raw.timestamp.trim()
      ? raw.timestamp
      : new Date().toISOString(),
  };

  if (!payload.product_id) return null;

  const parsed = VisionDetectionSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data as VisionDetection;
  }
  return null;
}

export function determineTargetBin(brandId: string, config: SorterConfig, confidence?: number): number {
  // Fail-safe AI: Độ tin cậy thấp (< 60%) tự động chuyển về Khay 3 để kiểm tra thủ công, tránh gạt nhầm vào khay tiệt trùng
  if (confidence !== undefined && confidence < 0.6) {
    return config?.default_bin || 3;
  }

  if (!config || !Array.isArray(config.bins)) return 3;

  for (const binRule of config.bins) {
    if (binRule.brand_ids && binRule.brand_ids.includes(brandId)) {
      return binRule.bin_id;
    }
  }

  // Khay mặc định (Khay 3)
  return config.default_bin || 3;
}

export function detectAnomalies(telemetry: TelemetryData): AlertEvent[] {
  const alerts: AlertEvent[] = [];

  // 1. Cảnh báo Nút Dừng Khẩn Cấp (E-stop)
  if (telemetry.estop_pressed) {
    alerts.push({
      event_id: `estop_${Date.now()}`,
      event_type: "emergency_stop",
      severity: "critical",
      device_id: telemetry.device_id,
      description: "CẢNH BÁO NGUY HIỂM: Nút Dừng Khẩn Cấp (E-Stop IO10) đã bị nhấn! Băng tải đã dừng ngắt.",
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Cảnh báo Nhiệt độ vi xử lý ESP32-C5 quá cao
  if (telemetry.cpu_temp >= 75) {
    alerts.push({
      event_id: `temp_${Date.now()}`,
      event_type: "temperature_warning",
      severity: "warning",
      device_id: telemetry.device_id,
      description: `Nhiệt độ ESP32-C5 đạt ${telemetry.cpu_temp.toFixed(1)}°C (vượt ngưỡng an toàn 75°C trong tủ điện).`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

export function formatUptime(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function getBrandName(brandId: string): string {
  return CATALOG_BRANDS[brandId]?.name || brandId;
}

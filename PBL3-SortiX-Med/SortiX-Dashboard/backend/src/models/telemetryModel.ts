import fs from "node:fs";
import path from "node:path";

export interface TelemetryRecord {
  id: string;
  device_id: string;
  temperature: number;
  optical_sensor: string | number | boolean;
  conveyor_speed: number;
  is_running: boolean;
  estop_pressed: boolean;
  unit: string;
  timestamp: string;
  received_at: string;
  time_vn?: string;
  protocol: "HTTP_POST" | "MQTT";
  raw?: unknown;
}

let telemetryLogsStore: TelemetryRecord[] = [];
const MAX_LOGS = 1000;

function resolveStorageFilePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), "..", "data", "telemetry_logs.json"),
    path.join(process.cwd(), "data", "telemetry_logs.json"),
    path.join(process.cwd(), "telemetry_logs.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    if (fs.existsSync(dir)) {
      return p;
    }
  }

  return path.join(process.cwd(), "data", "telemetry_logs.json");
}

function loadFromFile(): void {
  try {
    const filePath = resolveStorageFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          telemetryLogsStore = parsed;
          return;
        }
      }
    }
  } catch (err) {
    console.warn("[TelemetryModel] Không thể nạp dữ liệu từ file:", err);
  }
  telemetryLogsStore = [];
}

function saveToFile(): void {
  try {
    const filePath = resolveStorageFilePath();
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(telemetryLogsStore, null, 2), "utf-8");
      fs.renameSync(temporaryPath, filePath);
    } finally {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      } catch {
        // Atomic rename completed
      }
    }
  } catch (err) {
    console.error("[TelemetryModel] Lỗi lưu file telemetry_logs.json:", err);
  }
}

// Khởi tạo nạp dữ liệu lúc start backend
loadFromFile();

export const TelemetryModel = {
  addRecord(input: Partial<TelemetryRecord> & { raw?: unknown }): TelemetryRecord {
    const record: TelemetryRecord = {
      id: input.id || `telem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      device_id: String(input.device_id || "ESP32_MAIN_CONTROLLER"),
      temperature: typeof input.temperature === "number" ? input.temperature : Number(input.temperature) || 0,
      optical_sensor: input.optical_sensor !== undefined ? input.optical_sensor : "CLEAR",
      conveyor_speed: typeof input.conveyor_speed === "number" ? input.conveyor_speed : Number(input.conveyor_speed) || 0,
      is_running: Boolean(input.is_running),
      estop_pressed: Boolean(input.estop_pressed),
      unit: input.unit || "°C",
      timestamp: input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString(),
      received_at: new Date().toISOString(),
      time_vn:
        new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) +
        " " +
        new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      protocol: input.protocol || "HTTP_POST",
      raw: input.raw,
    };

    telemetryLogsStore.unshift(record);
    if (telemetryLogsStore.length > MAX_LOGS) {
      telemetryLogsStore = telemetryLogsStore.slice(0, MAX_LOGS);
    }

    saveToFile();
    return record;
  },

  getAll(limit?: number): TelemetryRecord[] {
    if (limit && limit > 0) {
      return telemetryLogsStore.slice(0, limit);
    }
    return [...telemetryLogsStore];
  },

  getLatest(): TelemetryRecord | null {
    return telemetryLogsStore[0] || null;
  },

  getCount(): number {
    return telemetryLogsStore.length;
  },

  clear(): void {
    telemetryLogsStore = [];
    saveToFile();
  },
};

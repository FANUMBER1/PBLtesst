import { TelemetryModel, TelemetryRecord } from "../models/telemetryModel";
import { SafetyService } from "../services/safetyService";
import { SSEService } from "../services/sseService";
import { TelemetryIngestionSchema } from "@shared/schemas";
import { SyncService } from "../services/syncService";

export const TelemetryController = {
  handlePostTelemetry(body: unknown, headers?: Record<string, string | string[] | undefined>) {
    if (!body || typeof body !== "object") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Payload telemetry không hợp lệ. Yêu cầu định dạng JSON object.",
        },
      };
    }

    // Check payload size
    try {
      const payloadStr = JSON.stringify(body);
      if (payloadStr.length > 32768) {
        return {
          status: 413,
          body: {
            success: false,
            message: "Payload telemetry vượt quá kích thước cho phép (tối đa 32KB).",
          },
        };
      }
    } catch {
      return {
        status: 400,
        body: { success: false, message: "Payload JSON không thể tuần tự hóa." },
      };
    }

    // 1. Validate payload schema using shared Zod schema
    const parseResult = TelemetryIngestionSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return {
        status: 400,
        body: {
          success: false,
          message: `Dữ liệu telemetry không hợp lệ: ${errorMsg}`,
        },
      };
    }

    const validData = parseResult.data;

    // 2. Validate device authentication / mode
    const syncState = SyncService.getState();
    const isSimMode = syncState.mode === "sim";

    if (!isSimMode) {
      const expectedToken = process.env.DEVICE_TOKEN || process.env.SORTIX_DEVICE_TOKEN;
      if (!expectedToken) {
        return {
          status: 500,
          body: {
            success: false,
            message: "Lỗi cấu hình bảo mật máy chủ: DEVICE_TOKEN chưa được thiết lập.",
          },
        };
      }

      const rawHeaderToken = headers?.["x-device-token"] || headers?.["authorization"];
      const headerToken = Array.isArray(rawHeaderToken) ? rawHeaderToken[0] : rawHeaderToken;
      const cleanHeaderToken = headerToken ? headerToken.replace(/^Bearer\s+/i, "").trim() : undefined;

      if (!cleanHeaderToken || cleanHeaderToken !== expectedToken) {
        return {
          status: 401,
          body: {
            success: false,
            message: "Từ chối truy cập: Yêu cầu Header 'X-Device-Token' hoặc 'Authorization' hợp lệ của thiết bị phần cứng.",
          },
        };
      }
    }

    // 3. Extract and strictly validate temperature (Reject missing / NaN / Infinity)
    const rawTemp =
      validData.temperature ??
      validData.cpu_temp ??
      validData.current_temp ??
      validData.temp;

    if (rawTemp === undefined || !Number.isFinite(rawTemp) || Number.isNaN(rawTemp)) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu nhiệt độ bị thiếu hoặc không phải số thực hữu hạn. Không chấp nhận giá trị mặc định giả lập.",
        },
      };
    }
    const temperature = rawTemp;

    // 4. Optical sensor extraction
    const rawOptical =
      validData.optical_sensor ??
      validData.sensor_optical ??
      validData.optical_sensor_02 ??
      validData.s2 ??
      validData.s1 ??
      (validData.s1_entry !== undefined ? (validData.s1_entry ? "BLOCKED" : "CLEAR") : "CLEAR");

    const optical_sensor =
      (rawOptical as unknown) === "1" || rawOptical === 1 || rawOptical === true || rawOptical === "BLOCKED"
        ? "BLOCKED"
        : "CLEAR";

    // 5. Conveyor speed extraction
    const rawSpeed =
      validData.conveyor_speed ??
      validData.motor_speed ??
      validData.speed;

    const hasObjectOnSensor = optical_sensor === "BLOCKED";
    const hasExplicitOptical =
      validData.optical_sensor !== undefined ||
      validData.sensor_optical !== undefined ||
      validData.s1_entry !== undefined;

    // Prefer the device's motor state. S1 only reports whether an item blocks
    // the sensor; a clear sensor does not mean the conveyor has stopped.
    const is_running =
      validData.conveyor_running !== undefined
        ? Boolean(validData.conveyor_running)
        : validData.is_running !== undefined
          ? Boolean(validData.is_running)
          : hasExplicitOptical
            ? hasObjectOnSensor
            : false;

    const conveyor_speed = is_running
      ? typeof rawSpeed === "number" && Number.isFinite(rawSpeed)
        ? rawSpeed
        : 50
      : 0;

    const estop_pressed = Boolean(validData.estop_pressed);
    const device_id = validData.device_id || "ESP32_MAIN_CONTROLLER";
    const unit = validData.unit || "°C";
    const timestamp = validData.timestamp || new Date().toISOString();

    // 6. Persist to TelemetryModel
    const record = TelemetryModel.addRecord({
      device_id,
      temperature,
      optical_sensor,
      conveyor_speed,
      is_running,
      estop_pressed,
      unit,
      timestamp,
      protocol: "HTTP_POST",
      raw: validData,
    });

    // 7. Synchronize SafetyService state
    SafetyService.updateTelemetry({
      device_id,
      current_temp: temperature,
      motor_speed: conveyor_speed,
      is_running,
      estop_pressed,
      optical_sensor_02: optical_sensor,
      is_overheat: temperature >= 75.0,
      status: estop_pressed ? "EMERGENCY_STOP" : temperature >= 75.0 ? "OVERHEAT_WARNING" : "NORMAL",
      safety_conclusion:
        temperature >= 75.0
          ? "CẢNH BÁO: Nhiệt độ vượt ngưỡng an toàn 75°C!"
          : estop_pressed
          ? "HỆ THỐNG ĐANG BỊ DỪNG KHẨN CẤP (E-STOP)"
          : "Hệ thống ĐỦ ĐIỀU KIỆN an toàn để tiếp tục vận hành.",
      updated_at: new Date().toISOString(),
    });

    // 8. Broadcast via SSE
    SSEService.broadcast("telemetry", record);
    SSEService.broadcast("status", SafetyService.getStatus());

    return {
      status: 200,
      body: {
        success: true,
        message: "Dữ liệu cảm biến đã được xác thực và lưu trữ thành công qua HTTP POST",
        protocol: "HTTP_POST",
        record,
        total_logs: TelemetryModel.getCount(),
      },
    };
  },

  handleGetTelemetryHistory(query?: { limit?: string }) {
    const limit = query?.limit ? parseInt(query.limit, 10) : 100;
    const logs = TelemetryModel.getAll(isNaN(limit) ? 100 : limit);
    const now = Date.now();

    const formattedLogs = logs.map((r, index) => {
      const recTime = Date.parse(r.received_at || r.timestamp) || now;
      const secondsAgo = Math.max(0, Math.round((now - recTime) / 1000));
      let statusDesc = "vừa xong";
      if (secondsAgo < 5) statusDesc = `${secondsAgo} giây trước (vừa nhận)`;
      else if (secondsAgo < 60) statusDesc = `${secondsAgo} giây trước`;
      else statusDesc = `${Math.floor(secondsAgo / 60)} phút trước`;

      return {
        ...r,
        order: index === 0 ? "👉 [BẢN GHI MỚI NHẤT]" : `#${index + 1}`,
        time_ago: statusDesc,
        seconds_ago: secondsAgo,
      };
    });

    const latest = formattedLogs[0] || null;

    return {
      status: 200,
      body: {
        success: true,
        count: formattedLogs.length,
        huong_dan: "Bản ghi ĐẦU TIÊN (trên cùng) là dữ liệu MỚI NHẤT từ ESP32. F5 (Reload) trang web này sau 5 giây để thấy bản ghi mới tiếp theo!",
        thoi_gian_hien_tai_server: new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) + " (Giờ VN)",
        ban_ghi_moi_nhat_cach_day: latest ? `${latest.seconds_ago} giây trước (${latest.temperature}°C, Quang: ${latest.optical_sensor})` : "Chưa có",
        tong_so_ban_ghi: TelemetryModel.getCount(),
        latest,
        data: formattedLogs,
      },
    };
  },

  handleDeleteTelemetryHistory() {
    TelemetryModel.clear();
    return {
      status: 200,
      body: {
        success: true,
        message: "Đã xóa toàn bộ lịch sử telemetry database",
      },
    };
  },
};

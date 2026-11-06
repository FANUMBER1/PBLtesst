import { EmergencyStopPayloadSchema, JamDetectedPayloadSchema, BinFullPayloadSchema, TemperatureWarningPayloadSchema, DeviceOfflinePayloadSchema, HeartbeatPayloadSchema, ShiftSummaryPayloadSchema, MqttDisconnectedPayloadSchema, UnlockSystemSchema } from "@shared/schemas";
import { SafetyService } from "../services/safetyService";
import { NotificationModel } from "../models/notificationModel";
import { publishEstopSimulation, publishJamSimulation, publishBinFullSimulation, publishTemperatureWarningSimulation, publishDeviceOfflineSimulation } from "../services/mqttService";

export const SafetyController = {
  getTelemetry() {
    return {
      status: 200,
      body: {
        success: true,
        ...SafetyService.getTelemetry(),
      },
    };
  },

  getStatus() {
    return {
      status: 200,
      body: SafetyService.getStatus(),
    };
  },

  triggerEmergencyStop(body: unknown) {
    const validated = EmergencyStopPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện Emergency Stop không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const result = SafetyService.triggerEmergencyStop(validated.data);
    // Nếu là simulation, publish ra MQTT để các client khác cùng bắt được
    if (validated.data.mode === "simulation") {
      publishEstopSimulation(validated.data);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã kích hoạt ngắt khẩn cấp và khóa toàn hệ thống",
        data: result,
      },
    };
  },

  triggerJamAlert(body: unknown) {
    const validated = JamDetectedPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện Kẹt Phôi không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const result = SafetyService.triggerJamAlert(validated.data);
    if (validated.data.mode === "simulation") {
      publishJamSimulation(validated.data);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận sự cố kẹt phôi trên băng chuyền",
        data: result,
      },
    };
  },

  triggerBinFullAlert(body: unknown) {
    const validated = BinFullPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện Đầy Khay không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    if (validated.data.max_capacity < 5 || validated.data.max_capacity > 50 ||
      validated.data.current_count < validated.data.max_capacity) {
      return {
        status: 422,
        body: { success: false, message: "Sự kiện đầy khay chỉ hợp lệ khi current_count >= max_capacity và sức chứa trong [5, 50]." },
      };
    }

    const result = SafetyService.triggerBinFull(validated.data);
    if (validated.data.mode === "simulation") {
      publishBinFullSimulation(validated.data);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận sự cố đầy khay phân loại",
        data: result,
      },
    };
  },

  triggerTemperatureWarningAlert(body: unknown) {
    const validated = TemperatureWarningPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện Quá Nhiệt không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    if (validated.data.current_temp <= validated.data.threshold_temp) {
      return {
        status: 422,
        body: { success: false, message: "Cảnh báo quá nhiệt chỉ hợp lệ khi nhiệt độ vượt ngưỡng an toàn." },
      };
    }

    const result = SafetyService.triggerTemperatureWarning(validated.data);
    if (validated.data.mode === "simulation") {
      publishTemperatureWarningSimulation(validated.data);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận cảnh báo quá nhiệt thiết bị",
        data: result,
      },
    };
  },

  triggerDeviceOfflineAlert(body: unknown) {
    const validated = DeviceOfflinePayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện mất kết nối thiết bị không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const result = SafetyService.triggerDeviceOffline(validated.data);
    if (validated.data.mode === "simulation") {
      publishDeviceOfflineSimulation(validated.data);
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận sự cố mất kết nối vi điều khiển",
        data: result,
      },
    };
  },

  recordHeartbeat(body: unknown) {
    const validated = HeartbeatPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu heartbeat không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const deviceId = validated.data.device_id;
    SafetyService.recoverDeviceOnline(deviceId);

    return {
      status: 200,
      body: {
        success: true,
        message: "Heartbeat ghi nhận thành công",
        device_id: deviceId,
      },
    };
  },

  triggerShiftSummaryAlert(body: unknown) {
    const validated = ShiftSummaryPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện báo cáo tổng kết ca không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const result = SafetyService.triggerShiftSummary(validated.data);

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận báo cáo 1 ngày làm việc thành công",
        data: result,
      },
    };
  },

  triggerMqttDisconnectedAlert(body: unknown) {
    const validated = MqttDisconnectedPayloadSchema.safeParse(body);
    if (!validated.success) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Dữ liệu sự kiện mất kết nối MQTT Broker không đúng định dạng",
          errors: validated.error.format(),
        },
      };
    }

    const result = SafetyService.triggerMqttDisconnected(validated.data);

    return {
      status: 200,
      body: {
        success: true,
        message: "Đã ghi nhận cảnh báo mất kết nối MQTT Broker",
        data: result,
      },
    };
  },

  recoverMqttConnectedAlert(body?: unknown) {
    let brokerUrl = "not configured";
    if (body !== undefined) {
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return { status: 400, body: { success: false, message: "Dữ liệu MQTT recovery không hợp lệ" } };
      }
      const candidate = (body as Record<string, unknown>).broker_url;
      if (candidate !== undefined) {
        if (typeof candidate !== "string" || !candidate.trim()) {
          return { status: 400, body: { success: false, message: "broker_url không hợp lệ" } };
        }
        try {
          const parsed = new URL(candidate);
          if (!["mqtt:", "mqtts:", "ws:", "wss:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
        } catch {
          return { status: 400, body: { success: false, message: "broker_url không hợp lệ" } };
        }
        brokerUrl = candidate.trim();
      }
    }
    const result = SafetyService.recoverMqttConnected(brokerUrl);

    return {
      status: 200,
      body: {
        success: true,
        message: result.message,
        data: result,
      },
    };
  },


  unlockSystem(adminUser: { userId: string; username: string; role: string }, body: unknown) {
    if (adminUser.role !== "admin") {
      return {
        status: 403,
        body: {
          success: false,
          message: "Từ chối truy cập: Chỉ tài khoản Quản trị viên (Admin) mới có quyền mở khóa an toàn hệ thống.",
        },
      };
    }

    const validated = UnlockSystemSchema.safeParse(body);
    if (!validated.success || !validated.data.note?.trim()) {
      return { status: 400, body: { success: false, message: "Bắt buộc nhập ghi chú xác nhận an toàn." } };
    }
    const note = validated.data.note.trim();

    const result = SafetyService.unlockSystem(adminUser.username || adminUser.userId, note);

    return {
      status: 200,
      body: {
        success: true,
        message: result.message,
        data: result,
      },
    };
  },

  getNotifications(filterStatus?: string) {
    let list = NotificationModel.getAll();
    if (filterStatus) {
      list = list.filter((n) => n.status === filterStatus);
    }
    return {
      status: 200,
      body: {
        success: true,
        data: list,
        total: list.length,
      },
    };
  },
};

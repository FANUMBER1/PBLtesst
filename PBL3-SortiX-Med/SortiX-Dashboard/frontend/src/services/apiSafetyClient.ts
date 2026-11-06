import { EmergencyStopPayload, JamDetectedPayload, BinFullPayload, TemperatureWarningPayload, DeviceOfflinePayload, ShiftSummaryPayload, SafetyStatusResponse, NotificationRecord, UnlockSystemInput } from "@shared/types";
import { fetchWithTimeout } from "./apiFetch";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
const endpoint = (path: string) => `${API_BASE_URL}${path}`;

export const ApiSafetyClient = {
  async getStatus(): Promise<SafetyStatusResponse> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/status"));
      if (res.ok) {
        const json = (await res.json()) as SafetyStatusResponse;
        if (json && json.status === "OPERATIONAL" && json.updated_at) {
          const ageMs = Date.now() - new Date(json.updated_at).getTime();
          if (ageMs > 30000) {
            return {
              ...json,
              status: "STALE",
            };
          }
        }
        return json;
      }
    } catch {
      // Network failure / timeout
    }

    return {
      success: false,
      status: "UNAVAILABLE",
      is_locked: false,
      unprocessed_count: 0,
    };
  },

  async triggerEmergencyStop(payload: EmergencyStopPayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/estop"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã kích hoạt E-Stop", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi kích hoạt E-Stop";
      return { success: false, message: msg };
    }
  },

  async triggerJamAlert(payload: JamDetectedPayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/jam"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã ghi nhận sự cố kẹt phôi", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi báo kẹt phôi";
      return { success: false, message: msg };
    }
  },

  async triggerBinFullAlert(payload: BinFullPayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/bin-full"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã ghi nhận cảnh báo đầy khay", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi báo đầy khay";
      return { success: false, message: msg };
    }
  },

  async triggerTemperatureWarningAlert(payload: TemperatureWarningPayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/temp-warning"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã ghi nhận cảnh báo quá nhiệt", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi báo quá nhiệt";
      return { success: false, message: msg };
    }
  },

  async triggerDeviceOfflineAlert(payload: DeviceOfflinePayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/device-offline"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã ghi nhận sự cố mất kết nối", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi báo mất kết nối";
      return { success: false, message: msg };
    }
  },

  async sendHeartbeat(deviceId = "ESP32_MAIN_CONTROLLER"): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/heartbeat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Heartbeat sent" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi gửi heartbeat";
      return { success: false, message: msg };
    }
  },

  async triggerShiftSummary(payload: ShiftSummaryPayload): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const res = await fetchWithTimeout(endpoint("/api/safety/shift-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Đã ghi nhận báo cáo 1 ngày làm việc", data: data.data };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi ghi nhận báo cáo 1 ngày làm việc";
      return { success: false, message: msg };
    }
  },

  async unlockSystem(
    _adminInfo: { userId?: string; role?: string },
    input?: UnlockSystemInput
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("pbl3_auth_user");
        if (raw) {
          const parsed = JSON.parse(raw) as { sessionToken?: string };
          if (parsed.sessionToken) headers.Authorization = `Bearer ${parsed.sessionToken}`;
        }
      }

      const res = await fetchWithTimeout(endpoint("/api/safety/unlock"), {
        method: "POST",
        headers,
        body: JSON.stringify(input || {}),
      });

      const data = await res.json();
      return {
        success: res.ok && data.success,
        message: data.message || (res.ok ? "Đã mở khóa an toàn thành công" : "Mở khóa thất bại"),
        data: data.data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng khi mở khóa";
      return { success: false, message: msg };
    }
  },

  async getNotifications(status?: string): Promise<NotificationRecord[]> {
    try {
      const url = endpoint(status ? `/api/notifications?status=${encodeURIComponent(status)}` : "/api/notifications");
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },
};

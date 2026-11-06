"use client";

export interface HardwareAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  category: "actuator" | "sensor" | "alarm" | "system";
  status: "success" | "warning" | "error";
  details?: string;
}

const STORAGE_KEY = "sortix_hardware_audit_trail";

export const DEFAULT_HARDWARE_AUDIT_LOGS: HardwareAuditEntry[] = [
  {
    id: "hw-log-1",
    timestamp: "Vừa xong",
    actor: "admin1",
    action: "Đồng bộ sơ đồ GPIO & Khai báo tải",
    target: "WeAct ESP32-C5 N8R8 Subsystem",
    category: "system",
    status: "success",
    details: "Đồng bộ 9 kênh GPIO linh kiện BOM thật từ Dashboard",
  },
  {
    id: "hw-log-2",
    timestamp: "09:00:15",
    actor: "Hệ thống tự động",
    action: "Hiệu chuẩn góc ban đầu Servo MG996R 1 & 2",
    target: "GPIO 6, 24 (LEDC PWM)",
    category: "actuator",
    status: "success",
    details: "Tự động thiết lập góc gốc 0° (trả về) khi khởi động line",
  },
  {
    id: "hw-log-3",
    timestamp: "08:45:20",
    actor: "Edge AI Box",
    action: "Kiểm tra cảm biến IR S1 & Encoder 2 pha",
    target: "GPIO 0 (IR S1), GPIO 1 & 4 (Encoder A/B)",
    category: "sensor",
    status: "success",
    details: "Đo độ trễ phản hồi IR < 2.0ms, hệ số Encoder 31.5 xung/mm",
  },
  {
    id: "hw-log-4",
    timestamp: "08:30:10",
    actor: "Kỹ sư vận hành",
    action: "Kiểm thử Đèn LED Báo Trạng Thái",
    target: "GPIO 10 (LED Status Indicator)",
    category: "alarm",
    status: "success",
    details: "Phát xung sáng LED báo Run/Cảnh báo hệ thống bình thường",
  },
  {
    id: "hw-log-5",
    timestamp: "08:15:00",
    actor: "Hệ thống an toàn",
    action: "Kiểm tra cơ chế mạch ngắt khẩn Fail-safe",
    target: "Tiếp điểm NC cắt bus 12V (Hardware E-STOP)",
    category: "system",
    status: "success",
    details: "Mạch ngắt thường đóng NC cắt thẳng nguồn 12V bảo vệ an toàn",
  },
];

export function getHardwareAuditLogs(): HardwareAuditEntry[] {
  if (typeof window === "undefined") return DEFAULT_HARDWARE_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_HARDWARE_AUDIT_LOGS));
      return DEFAULT_HARDWARE_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HARDWARE_AUDIT_LOGS;
  } catch {
    return DEFAULT_HARDWARE_AUDIT_LOGS;
  }
}

export function logHardwareTestAction(
  action: string,
  target: string,
  actor: string = "admin1",
  category: "actuator" | "sensor" | "alarm" | "system" = "actuator",
  status: "success" | "warning" | "error" = "success",
  details?: string
): HardwareAuditEntry {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const newEntry: HardwareAuditEntry = {
    id: `hw-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    actor,
    action,
    target,
    category,
    status,
    details,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getHardwareAuditLogs();
      const updated = [newEntry, ...existing.slice(0, 99)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("sortix_hardware_log_added", { detail: newEntry }));
    } catch (err) {
      console.warn("Could not save hardware audit log:", err);
    }
  }

  return newEntry;
}

export function clearHardwareAuditLogs(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("sortix_hardware_logs_cleared"));
    } catch (err) {
      console.warn("Could not clear hardware audit logs:", err);
    }
  }
}

export function exportHardwareAuditToCSV(
  logs: HardwareAuditEntry[],
  filename = "SortiX_Hardware_Audit_Trail.csv"
): boolean {
  if (!logs || logs.length === 0) return false;
  const headers = [
    "STT",
    "Thời Gian",
    "Kỹ Thuật Viên / Tiến Trình",
    "Lệnh Can Thiệp",
    "Đối Tượng Chân GPIO / Mạch",
    "Phân Loại",
    "Kết Quả",
    "Chi Tiết Thao Tác",
  ];
  const rows = logs.map((l, idx) => [
    idx + 1,
    `"${l.timestamp}"`,
    `"${l.actor}"`,
    `"${l.action.replace(/"/g, '""')}"`,
    `"${l.target.replace(/"/g, '""')}"`,
    `"${l.category}"`,
    `"${l.status === "success" ? "Thành công" : l.status === "warning" ? "Cảnh báo" : "Lỗi"}"`,
    `"${(l.details || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}


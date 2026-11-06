// Kiểu dữ liệu và giao diện trung tâm cho hệ thống SortiX Dashboard
// Dùng chung cho cả Frontend, Backend và IoT Gateway

export type ThemeMode = "dark" | "light";
export type DashboardTab = "conveyor" | "analytics" | "history" | "config";

export interface VisualItem {
  id: string;
  brandKey: string;
  progress: number; // 0% - 100%
  targetBin: number;
  yOffset?: number; // Độ lệch Y khi gạt vào máng (0px -> 60px)
  opacity?: number;
  deflected?: boolean;
  sorted?: boolean;
  s1Triggered?: boolean;
  s2Triggered?: boolean;
  s3Triggered?: boolean;
  isSim: boolean; // true = phôi mô phỏng, false = phôi thực từ Camera AI
  confidence?: number;
  timestamp?: string;
  isJammed?: boolean; // Đánh dấu phôi bị kẹt tại trạm cảm biến
  isRemote?: boolean; // true = phôi nhận từ thiết bị khác qua mạng
  waitingForBin?: number; // Khay đích đang đầy, phôi tạm giữ trước máng
}

export interface BrandInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  packaging?: string;
  icon?: string;
}

export const CATALOG_BRANDS: Record<string, BrandInfo> = {
  med_syringe: {
    id: "med_syringe",
    name: "Bơm kim tiêm / Dao mổ",
    code: "SYRINGE",
    color: "#EAB308", // Vàng y tế #EAB308
    badgeBg: "bg-amber-500/20",
    borderColor: "border-amber-500/50",
    textColor: "text-amber-500 dark:text-amber-400",
    packaging: "Vật sắc nhọn lây nhiễm dùng 1 lần",
    icon: "💉",
  },
  med_forceps: {
    id: "med_forceps",
    name: "Kẹp phẫu thuật (Pean)",
    code: "FORCEPS",
    color: "#0284C7", // Xanh dương y tế #0284C7
    badgeBg: "bg-sky-500/20",
    borderColor: "border-sky-500/50",
    textColor: "text-sky-600 dark:text-sky-400",
    packaging: "Thép y tế không gỉ (Inox 316L)",
    icon: "🩺",
  },
  med_scissors: {
    id: "med_scissors",
    name: "Kéo phẫu thuật",
    code: "SCISSORS",
    color: "#6366F1", // Xanh tím tiệt trùng #6366F1
    badgeBg: "bg-indigo-500/20",
    borderColor: "border-indigo-500/50",
    textColor: "text-indigo-600 dark:text-indigo-400",
    packaging: "Dụng cụ mổ tái sử dụng Autoclave",
    icon: "✂️",
  },
  med_vial: {
    id: "med_vial",
    name: "Lọ thuốc / Ống nghiệm",
    code: "VIAL",
    color: "#10B981", // Xanh ngọc Emerald #10B981
    badgeBg: "bg-emerald-500/20",
    borderColor: "border-emerald-500/50",
    textColor: "text-emerald-600 dark:text-emerald-400",
    packaging: "Thủy tinh borosilicate / Nhựa y tế",
    icon: "🧪",
  },
};

// Bí danh tương thích ngược (Backward-compatible legacy aliases)
Object.defineProperties(CATALOG_BRANDS, {
  brand_c: { get: () => CATALOG_BRANDS.med_syringe, enumerable: false, configurable: true },
  brand_a: { get: () => CATALOG_BRANDS.med_forceps, enumerable: false, configurable: true },
  brand_b: { get: () => CATALOG_BRANDS.med_scissors, enumerable: false, configurable: true },
  brand_d: { get: () => CATALOG_BRANDS.med_vial, enumerable: false, configurable: true },
});

export interface BinRule {
  bin_id: 1 | 2;
  brand_ids: string[];
}

export interface SorterConfig {
  schema_version: number;
  config_version: number;
  device_id: string;
  catalog_version: string;
  bins: BinRule[];
  default_bin: 3;
  apply_mode: "when_line_empty" | "immediate";
  timestamp: string;
  servo_routes?: Record<string, { io: string; angle: number }>;
}

export interface TelemetryData {
  device_id: string;
  online: boolean;
  uptime: number; // giây
  cpu_temp: number; // độ C (cảm biến nội vi ESP32-C5)
  wifi_rssi: number; // dBm
  wifi_band: "2.4 GHz" | "5.0 GHz (Wi-Fi 6)";
  conveyor_running: boolean;
  conveyor_speed: number; // 0 - 100% motor drive command
  conveyor_speed_mm_s?: number; // Encoder measured belt speed
  s1_entry: boolean; // GPIO0 - Cảm biến vật cản hồng ngoại LM393 (Active Low)
  ldr_active?: boolean; // GPIO5 - Cảm biến quang trở ánh sáng buồng quét LM393
  arm1_active: boolean; // GPIO6 - Servo 1 (MG996R Khay 1)
  arm2_active: boolean; // GPIO7 - Servo 2 (MG996R Khay 2)
  start_btn_pressed?: boolean; // GPIO23 - Nút nhấn Khởi Động Start (PBS-110)
  estop_pressed: boolean; // Firmware E-stop latch state; no separate physical contact feedback
  encoder_count: number; // GPIO1 (Phase A) & GPIO4 (Phase B) - Xung Encoder JGB37-520
  active_config_version: number;
  last_heartbeat: string;
  // Cờ tương thích ngược (deprecated - không dùng cho logic vật lý)
  s2_sorter1?: boolean | null; // null when no destination sensor is installed
  s3_sorter2?: boolean | null; // null when no destination sensor is installed
}

export interface VisionDetection {
  product_id: string;
  brand_id: string;
  confidence: number;
  catalog_version?: string;
  timestamp: string;
}

export interface ClassificationRecord {
  id: string;
  product_id: string;
  brand_id: string;
  brand_name: string;
  confidence: number;
  target_bin: number;
  routed_bin?: number;
  actual_bin: number;
  status: "success" | "diverted_default" | "rejected" | "jammed" | "unverified" | "held_timeout" | "servo_failed";
  timestamp: string;
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertEvent {
  event_id: string;
  event_type:
    | "emergency_stop"
    | "jam_detected"
    | "motor_stall"
    | "sensor_fault"
    | "camera_disconnected"
    | "vision_service_down"
    | "config_rejected"
    | "mqtt_disconnected"
    | "device_offline"
    | "temperature_warning"
    | "bin_full"
    | "shift_summary";
  severity: AlertSeverity;
  device_id: string;
  description: string;
  timestamp: string;
  resolved?: boolean;
  mode?: "simulation" | "realtime";
}

export interface ThroughputPoint {
  time: string;
  ppm: number;
  total: number;
  bin1: number;
  bin2: number;
  bin3: number;
  speed: number;
}

// User & Account Domain Types
export type UserRole = "admin" | "user" | "maintenance";
export type UserStatus = "active" | "locked";

export interface UserAccount {
  id: string;
  username: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  is_online?: boolean;
  last_login_at?: string | null;
  reset_otp?: string | null;
  reset_otp_expires_at?: string | null;
  reset_otp_attempts?: number | null;
  created_at: string;
  updated_at: string;
  must_change_password?: boolean;
}

export type SafeUser = Omit<UserAccount, "password_hash" | "reset_otp" | "reset_otp_expires_at" | "reset_otp_attempts">;

export interface UpdateProfileInput {
  username?: string;
  full_name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface RegisterInput {
  full_name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginInput {
  identifier: string; // username hoặc email
  password: string;
}

export interface ForgotPasswordInput {
  identifier: string; // username hoặc email
}

export interface ResetPasswordInput {
  identifier: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  demo_otp?: string;
  expires_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: SafeUser;
  token?: string;
}

export interface AdminCreateUserInput {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface AdminUpdateUserInput {
  full_name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  new_password?: string;
}

// Emergency Stop (E-Stop) & Safety Domain Types
export type SystemSafetyStatus = "OPERATIONAL" | "SYSTEM_LOCKED" | "HALTED" | "UNKNOWN" | "UNAVAILABLE" | "STALE";

export interface EmergencyStopPayload {
  event: "emergency_stop";
  station_id: string;
  triggered_by: string;
  timestamp: string;
  mode: "realtime" | "simulation";
}

export interface EmergencyStopAckPayload {
  event: "estop_ack";
  device_id: string;
  hardware_state: string;
  actuators_stopped: boolean;
  measured_speed?: number;
  timestamp: string;
}

export type NotificationStatus = "unprocessed" | "acknowledged" | "resolved";

export interface NotificationRecord {
  id: string;
  event: string;
  severity: "critical" | "warning" | "info" | "error";
  station_id: string;
  triggered_by: string;
  description: string;
  timestamp: string;
  mode: "realtime" | "simulation";
  status: NotificationStatus;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface SafetyStatusResponse {
  success: boolean;
  status: SystemSafetyStatus;
  is_locked: boolean;
  active_incident?: EmergencyStopPayload | null;
  last_notification?: NotificationRecord | null;
  unprocessed_count: number;
  updated_at?: string;
}

export interface UnlockSystemInput {
  note?: string;
}

export interface JamDetectedPayload {
  event: "jam_detected";
  section: string;
  duration_seconds: number;
  sensor_id: string;
  mode: "realtime" | "simulation";
  timestamp?: string;
}

export interface BinFullPayload {
  event: "bin_full";
  bin_id: string;
  category: string;
  current_count: number;
  max_capacity: number;
  mode: "realtime" | "simulation";
  timestamp?: string;
}

export interface TemperatureWarningPayload {
  event: "temperature_warning";
  device_name: string;
  current_temp: number;
  threshold_temp: number;
  unit: string;
  mode: "realtime" | "simulation";
  timestamp?: string;
}

export interface DeviceOfflinePayload {
  event: "device_offline";
  device_id: string;
  ip_address: string;
  last_seen: string;
  mode: "realtime" | "simulation";
  timestamp?: string;
}

export interface HeartbeatPayload {
  device_id: string;
  ip_address?: string;
  uptime?: number;
  timestamp?: string;
}

export interface ShiftSummaryPayload {
  event: "shift_summary";
  shift_name: string;
  total_products: number;
  sorted_good: number;
  sorted_defect: number;
  accuracy_rate: string;
  emergency_stops_count: number;
  operating_hours: string;
  timestamp?: string;
  mode?: "realtime" | "simulation";
}

export interface MqttDisconnectedPayload {
  event: "mqtt_disconnected";
  broker_url?: string;
  disconnected_duration_seconds: number;
  reconnect_attempt: number;
  timestamp?: string;
  mode?: "realtime" | "simulation";
}

export interface BinCounts {
  bin1: number;
  bin2: number;
  bin3: number;
}

export interface BinCapacities {
  bin1: number;
  bin2: number;
  bin3: number;
}

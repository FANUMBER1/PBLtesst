"use client";

import React, { useState, useMemo } from "react";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { usePermission, useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { formatUptime } from "@/lib/dataProcessor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  Signal,
  Clock,
  HardDrive,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  Sliders,
  Lock,
  Send,
  Volume2,
  Activity,
  Layers,
  Cable,
  Power,
  ShieldAlert,
  Server,
  Terminal,
} from "lucide-react";

type GpioCategory = "all" | "actuators" | "sensors" | "indicators" | "bus";

interface GpioPinSpec {
  pin: string;
  name: string;
  category: "actuators" | "sensors" | "indicators" | "bus";
  categoryLabel: string;
  ioType: string;
  voltage: string;
  physicalLocation: string;
  description: string;
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
  colorScheme: "cyan" | "indigo" | "amber" | "emerald" | "rose" | "purple";
  isError?: boolean;
}

function DiagCard({
  icon: Icon,
  label,
  value,
  subtext,
  status,
  color,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  status: "ok" | "warning" | "error";
  color: string;
}) {
  const statusColor =
    status === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";
  const StatusIcon = status === "ok" ? CheckCircle2 : status === "warning" ? Zap : XCircle;

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-4 transition-all dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-xs shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate font-mono">{value}</p>
        {subtext && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{subtext}</p>}
      </div>
      <StatusIcon className={`h-5 w-5 shrink-0 ${statusColor}`} />
    </div>
  );
}

export default function SettingsDevicesPage() {
  const {
    telemetry,
    mqttStatus,
    pingMs,
    handleResetActuatorStates,
    sorterConfig,
    isMqttAlertActive,
    handleSimulateMqttDisconnect,
    handleReconnectMqtt,
    isSimulation,
  } = useDashboard();
  const { user } = useAuth();
  const canView = usePermission("devices.view");
  const router = useRouter();

  // Reset dialog state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Filter GPIO Category
  const [selectedCategory, setSelectedCategory] = useState<GpioCategory>("all");

  // Mask MQTT Broker URL for security (protect credentials & domain)
  const rawBrokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "Chưa cấu hình";
  const maskedBrokerUrl = rawBrokerUrl === "Chưa cấu hình"
    ? rawBrokerUrl
    : rawBrokerUrl.replace(/(wss?:\/\/)([^/@:]+@)?([^/:]+)/, "$1***");

  // Detailed GPIO Pinout Matrix - Chuẩn hóa WeAct Studio ESP32-C5-A-N8R8
  const gpioList: GpioPinSpec[] = useMemo(() => [
    // Nhóm 1: Cơ cấu chấp hành & Tải công suất
    {
      pin: "GPIO 6",
      name: "Servo Gạt 1 (Khay 1)",
      category: "actuators",
      categoryLabel: "Cơ cấu chấp hành",
      ioType: "LEDC PWM (50Hz / 500-2500µs)",
      voltage: "3.3V Logic → Nuôi 5V từ Buck XL4015",
      physicalLocation: "Dãy Trái Pin 7 • Trạm gạt Khay 1 (Cách S1 200mm)",
      description: "Cánh tay gạt TowerPro MG996R phân loại phôi nhóm 1 (Bơm tiêm / Dao mổ) vào Khay 1",
      isActive: Boolean(telemetry.arm1_active),
      activeLabel: "KÍCH HOẠT (Góc 45°)",
      inactiveLabel: "NGHỈ (Góc 0°)",
      colorScheme: "cyan",
    },
    {
      pin: "GPIO 24",
      name: "Servo Gạt 2 (Khay 2)",
      category: "actuators",
      categoryLabel: "Cơ cấu chấp hành",
      ioType: "LEDC PWM (50Hz / 500-2500µs)",
      voltage: "3.3V Logic → Nuôi 5V từ Buck XL4015",
      physicalLocation: "Dãy Phải Pin 4 • Trạm gạt Khay 2 (Cách S1 400mm)",
      description: "Cánh tay gạt TowerPro MG996R phân loại phôi nhóm 2 (Kẹp phẫu thuật / Kéo) vào Khay 2",
      isActive: Boolean(telemetry.arm2_active),
      activeLabel: "KÍCH HOẠT (Góc 45°)",
      inactiveLabel: "NGHỈ (Góc 0°)",
      colorScheme: "indigo",
    },
    {
      pin: "GPIO 8 & GPIO 9",
      name: "Driver Cầu H L298N (Động cơ 12V)",
      category: "actuators",
      categoryLabel: "Cơ cấu chấp hành",
      ioType: "Digital Output / PWM (IN1: GPIO8, IN2: GPIO9)",
      voltage: "3.3V Logic → Tải Motor 12VDC",
      physicalLocation: "Dãy Trái Pin 9 (IN1) & Pin 10 (IN2)",
      description: "Điều khiển đảo chiều và tốc độ động cơ DC giảm tốc JGB37-520 12V 66RPM kéo băng tải",
      isActive: Boolean(telemetry.conveyor_running),
      activeLabel: `RUN (${telemetry.conveyor_speed ?? 60}%)`,
      inactiveLabel: "STOP",
      colorScheme: "emerald",
    },

    // Nhóm 2: Cảm biến quang & Bộ đếm định vị
    {
      pin: "GPIO 0",
      name: "Cảm biến vật cản hồng ngoại IR S1",
      category: "sensors",
      categoryLabel: "Cảm biến & Encoder",
      ioType: "Digital Input (Active Low, Pull-Up)",
      voltage: "3.3V Logic (Module LM393 nuôi 3.3V Dãy Trái Pin 1)",
      physicalLocation: "Dãy Trái Pin 5 • Cổng quét đầu vào buồng Camera AI",
      description: "Phát hiện vật phẩm y tế tiến vào khu vực chụp ảnh và kích hoạt đếm xung định vị",
      isActive: Boolean(telemetry.s1_entry),
      activeLabel: "BLOCKED (Có phôi)",
      inactiveLabel: "CLEAR (Trống)",
      colorScheme: "cyan",
    },
    {
      pin: "GPIO 1",
      name: "Encoder Động cơ - Kênh A (Pulse)",
      category: "sensors",
      categoryLabel: "Cảm biến & Encoder",
      ioType: "External Interrupt / PCNT (Đếm xung cạnh lên/xuống)",
      voltage: "3.3V Logic (Đĩa từ 11 PPR, ngõ ra ~3960 xung/vòng)",
      physicalLocation: "Dãy Trái Pin 6 • Nối đuôi động cơ JGB37-520",
      description: "Đếm xung định vị phôi chính xác theo chiều dài băng chuyền (~31.5 xung/mm)",
      isActive: Boolean(telemetry.conveyor_running && (telemetry.encoder_count ?? 0) > 0),
      activeLabel: `${telemetry.encoder_count ?? 0} xung`,
      inactiveLabel: "0 xung (Đứng yên)",
      colorScheme: "emerald",
    },
    {
      pin: "GPIO 4",
      name: "Encoder Động cơ - Kênh B (Direction)",
      category: "sensors",
      categoryLabel: "Cảm biến & Encoder",
      ioType: "Digital Input (Pha lệch góc 90 độ)",
      voltage: "3.3V Logic",
      physicalLocation: "Dãy Phải Pin 8 • Nối đuôi động cơ JGB37-520",
      description: "Xác định chiều quay động cơ và khử trôi xung nhiễu (Quadrature decoding)",
      isActive: Boolean(telemetry.conveyor_running),
      activeLabel: "FORWARD",
      inactiveLabel: "IDLE",
      colorScheme: "emerald",
    },
    {
      pin: "GPIO 5",
      name: "Cảm biến ánh sáng quang trở LDR",
      category: "sensors",
      categoryLabel: "Cảm biến & Encoder",
      ioType: "Digital Input (Module LM393 DO)",
      voltage: "3.3V Logic (Nuôi từ Dãy Trái Pin 1)",
      physicalLocation: "Dãy Phải Pin 9 • Trong buồng quét Camera AI",
      description: "Giám sát ngưỡng chiếu sáng buồng chụp để đảm bảo độ tin cậy nhận diện YOLOv8",
      isActive: Boolean(telemetry.ldr_active),
      activeLabel: "LIGHT OK",
      inactiveLabel: "DARK",
      colorScheme: "amber",
    },
    {
      pin: "GPIO 23",
      name: "Nút nhấn Khởi Động (Start Button)",
      category: "sensors",
      categoryLabel: "Cảm biến & Encoder",
      ioType: "Digital Input (Active Low, Pull-Up 10k + C3 0.1uF)",
      voltage: "3.3V Logic (Nút nhấn tự nhả PBS-110)",
      physicalLocation: "Dãy Phải Pin 5 • Mặt trước hộp điều khiển máy",
      description: "Nút cứng kích hoạt chu trình phân loại và tái khởi động an toàn sau E-Stop",
      isActive: Boolean(telemetry.start_btn_pressed),
      activeLabel: "PRESSED",
      inactiveLabel: "RELEASED",
      colorScheme: "purple",
    },

    // Nhóm 3: Đèn hiển thị & Cảnh báo
    {
      pin: "GPIO 10",
      name: "Đèn LED Báo Trạng Thái Hệ Thống",
      category: "indicators",
      categoryLabel: "Đèn báo & Cảnh báo",
      ioType: "Digital Output (Active High qua trở 220Ω)",
      voltage: "3.3V Logic (LED tròn phi 5mm siêu sáng Xanh lá)",
      physicalLocation: "Dãy Trái Pin 11 • Mặt trước tủ điện máy",
      description: "Sáng liên tục khi băng tải đang chạy, chớp nháy cảnh báo khi kẹt phôi/dừng khẩn cấp",
      isActive: Boolean(telemetry.conveyor_running || telemetry.estop_pressed),
      activeLabel: telemetry.estop_pressed ? "ALERT (FLASH)" : "RUNNING (ON)",
      inactiveLabel: "IDLE (OFF)",
      colorScheme: "emerald",
    },

    // Nhóm 4: Giao tiếp & Mạch an toàn lực
    {
      pin: "Mạch Cắt Nguồn 12V",
      name: "Nút Dừng Khẩn Cấp E-STOP (Fail-Safe NC)",
      category: "bus",
      categoryLabel: "An toàn & Bus giao tiếp",
      ioType: "Hardware NC (Tiếp điểm Thường Đóng ZB2-BE102C)",
      voltage: "12VDC Bus Cắt Trực Tiếp",
      physicalLocation: "Nút nấm đỏ phi 22mm trên nắp máy",
      description: "Cắt trực tiếp đường nguồn 12V nuôi motor và buck 5V servo, đảm bảo dừng tuyệt đối khi sự cố",
      isActive: Boolean(telemetry.estop_pressed),
      activeLabel: "KÍCH HOẠT (CẮT NGUỒN ⚠️)",
      inactiveLabel: "AN TOÀN (CẤP ĐIỆN)",
      colorScheme: "rose",
      isError: Boolean(telemetry.estop_pressed),
    },
    {
      pin: "GPIO 13 & GPIO 14",
      name: "Cổng USB Type-C Native (D- / D+)",
      category: "bus",
      categoryLabel: "An toàn & Bus giao tiếp",
      ioType: "USB-CDC / JTAG Console Hardware",
      voltage: "Cổng Type-C Native trên bo WeAct ESP32-C5",
      physicalLocation: "Dãy Phải Pin 14 (D-) & Pin 13 (D+)",
      description: "Dành riêng cho nạp firmware tốc độ cao, debug JTAG và giám sát USB-CDC, không dùng làm GPIO xuất",
      isActive: true,
      activeLabel: "DEDICATED",
      inactiveLabel: "OFFLINE",
      colorScheme: "cyan",
    },
    {
      pin: "GPIO 11 & GPIO 12",
      name: "Cổng Type-C UART Debug (TX0 / RX0)",
      category: "bus",
      categoryLabel: "An toàn & Bus giao tiếp",
      ioType: "UART0 Console (115200 8N1 qua CH343)",
      voltage: "3.3V TTL",
      physicalLocation: "Dãy Phải Pin 2 (TX0) & Pin 3 (RX0)",
      description: "Cổng serial console hiển thị log FreeRTOS / ESP-IDF thời gian thực",
      isActive: true,
      activeLabel: "READY (115200 bps)",
      inactiveLabel: "DISCONNECTED",
      colorScheme: "indigo",
    },
  ], [telemetry]);

  const filteredGpios = useMemo(() => {
    if (selectedCategory === "all") return gpioList;
    return gpioList.filter((g) => g.category === selectedCategory);
  }, [gpioList, selectedCategory]);

  const categoryCounts = useMemo(() => ({
    all: gpioList.length,
    actuators: gpioList.filter((g) => g.category === "actuators").length,
    sensors: gpioList.filter((g) => g.category === "sensors").length,
    indicators: gpioList.filter((g) => g.category === "indicators").length,
    bus: gpioList.filter((g) => g.category === "bus").length,
  }), [gpioList]);

  const confirmReset = async () => {
    try {
      await handleResetActuatorStates();
      setResetFeedback("Đã đặt lại cảm biến & van gạt thành công!");
      setTimeout(() => setResetFeedback(null), 3500);
    } catch {
      setResetFeedback("Không thể kết nối vi điều khiển để đặt lại.");
      setTimeout(() => setResetFeedback(null), 3500);
    } finally {
      setIsResetDialogOpen(false);
    }
  };

  if (!canView) return null;

  return (
    <div className="space-y-6 page-transition-enter pb-8">
      {/* HEADER TRANG THIẾT BỊ VÀ PHẦN CỨNG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/[0.06]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-indigo-500" />
            Thiết bị & Phần cứng
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Khai báo thông số kỹ thuật phần cứng vi điều khiển, sơ đồ phân bổ chân GPIO thời gian thực và nhật ký kiểm toán hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2">
          {resetFeedback && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl animate-in fade-in">
              {resetFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsResetDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đặt lại cảm biến & van gạt</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. KHỐI THÔNG SỐ KỸ THUẬT PHẦN CỨNG CHI TIẾT (SYSTEM HARDWARE SPECS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vi điều khiển ESP32-C5 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-500" />
              Vi điều khiển chính
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
              RISC-V 240MHz
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Chipset:</span>
              <span className="font-bold text-slate-900 dark:text-white">ESP32-C5-WROOM-1</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Flash / PSRAM:</span>
              <span className="text-slate-700 dark:text-slate-300">8MB Flash / 8MB PSRAM</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Bo phát triển:</span>
              <span className="text-slate-700 dark:text-slate-300">WeAct Studio C5-A-N8R8</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Firmware:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">SortiX ESP-IDF v5.x</span>
            </div>
          </div>
        </div>

        {/* Băng tải & Cơ cấu chấp hành */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-500" />
              Cơ khí & Kích thước
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
              Băng tải 66 RPM
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Chiều dài:</span>
              <span className="font-bold text-slate-900 dark:text-white">540mm hành trình</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Động cơ chính:</span>
              <span className="text-slate-700 dark:text-slate-300">JGB37-520 12V (Encoder)</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Driver cầu H:</span>
              <span className="text-slate-700 dark:text-slate-300">L298N (IN1: IO8, IN2: IO9)</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Tay gạt phân loại:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">2 × MG996R (IO6, IO24)</span>
            </div>
          </div>
        </div>

        {/* Nguồn điện & An toàn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Power className="h-4 w-4 text-amber-500" />
              Nguồn cấp & An toàn
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
              12VDC Tổ Ong
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Nguồn cấp chính:</span>
              <span className="font-bold text-slate-900 dark:text-white">Bộ nguồn tổ ong 12V</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Khối hạ áp Servo:</span>
              <span className="text-slate-700 dark:text-slate-300">Buck XL4015 5V / 5A</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Bảo vệ ngược cực:</span>
              <span className="text-slate-700 dark:text-slate-300">Diode Schottky MBR1045</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Khóa E-Stop:</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">Tiếp điểm NC cắt bus 12V</span>
            </div>
          </div>
        </div>

        {/* Kết nối Mạng & SCADA */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-white/[0.07] dark:bg-[#161822] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              Mạng & Giao thức
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Wi-Fi 6 / MQTT
            </span>
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Băng tần:</span>
              <span className="font-bold text-slate-900 dark:text-white">{telemetry.wifi_band || "Dual-Band 5GHz"}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Địa chỉ IP:</span>
              <span className="text-slate-700 dark:text-slate-300">192.168.1.105</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Địa chỉ MAC:</span>
              <span className="text-slate-700 dark:text-slate-300">C4:DE:E2:89:12:F0</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Bảo mật:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">TLS v1.3 / WPA3</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KẾT NỐI MQTT BROKER & CHẨN ĐOÁN THỜI GIAN THỰC */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 dark:border-white/[0.07] dark:bg-[#161822]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyan-500" />
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Trạng thái Mạng & Truyền thông MQTT SCADA
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kênh truyền dữ liệu telemetry hai chiều giữa bộ điều khiển ESP32 và Web Dashboard
              </p>
            </div>
          </div>

          {/* Nút ngắt kết nối an toàn: CHỈ CHO PHÉP TRONG SIMULATION */}
          {isSimulation ? (
            <button
              type="button"
              data-testid="btn-toggle-mqtt-devices"
              onClick={isMqttAlertActive ? handleReconnectMqtt : handleSimulateMqttDisconnect}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                isMqttAlertActive
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-900/40"
              }`}
              title="Mô phỏng ngắt kết nối MQTT Client"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>{isMqttAlertActive ? "Khôi phục kết nối MQTT" : "Ngắt kết nối MQTT Client"}</span>
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.08]"
              title="Bảo vệ an toàn: Không cho phép can thiệp ngắt kết nối MQTT khi đang vận hành thiết bị thực tế"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Chế độ thực tế: Mạch mạng được khóa an toàn</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DiagCard
            icon={Radio}
            label="Trạng thái MQTT Broker"
            value={mqttStatus === "connected" ? "ĐÃ KẾT NỐI (ONLINE)" : mqttStatus === "error" ? "LỖI KẾT NỐI" : "NGẮT KẾT NỐI"}
            subtext="Port 8084 • WSS TLS 1.3"
            status={mqttStatus === "connected" ? "ok" : "error"}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          />
          <DiagCard
            icon={Signal}
            label="Độ trễ Ping (Round-Trip)"
            value={`${pingMs} ms`}
            subtext="Tần số gửi: 1000ms/lần"
            status={pingMs < 50 ? "ok" : pingMs < 100 ? "warning" : "error"}
            color="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
          />
          <DiagCard
            icon={Wifi}
            label="Cường độ sóng WiFi (RSSI)"
            value={`${telemetry.wifi_rssi} dBm`}
            subtext={telemetry.wifi_rssi > -65 ? "Tín hiệu Rất tốt" : telemetry.wifi_rssi > -80 ? "Tín hiệu Trung bình" : "Tín hiệu Yếu"}
            status={telemetry.wifi_rssi > -65 ? "ok" : telemetry.wifi_rssi > -80 ? "warning" : "error"}
            color="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
          />
          <DiagCard
            icon={HardDrive}
            label="Broker Endpoint"
            value={maskedBrokerUrl}
            subtext="QoS 1 • Keepalive 60s"
            status="ok"
            color="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BẢNG PHÂN BỔ CHI TIẾT CHÂN GPIO (HARDWARE PINOUT & IO SPECIFICATION MATRIX) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 dark:border-white/[0.07] dark:bg-[#161822] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Bảng phân bổ chi tiết chân GPIO & Thiết bị ngoại vi
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sơ đồ chân I/O vật lý, định tuyến tín hiệu điện áp và trạng thái logic thời gian thực
              </p>
            </div>
          </div>

          {/* Bộ lọc phân loại chân */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
            {[
              { id: "all", label: `Tất cả (${categoryCounts.all})` },
              { id: "actuators", label: `Cơ cấu chấp hành (${categoryCounts.actuators})` },
              { id: "sensors", label: `Cảm biến & Encoder (${categoryCounts.sensors})` },
              { id: "indicators", label: `Đèn báo trạng thái (${categoryCounts.indicators})` },
              { id: "bus", label: `An toàn & Bus (${categoryCounts.bus})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as GpioCategory)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedCategory === tab.id
                    ? "bg-white dark:bg-[#1f2330] text-cyan-600 dark:text-cyan-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng ma trận GPIO */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4 font-mono">Chân GPIO</th>
                <th className="py-3 px-4">Tên thiết bị ngoại vi</th>
                <th className="py-3 px-4">Phân loại tín hiệu & Điện áp</th>
                <th className="py-3 px-4">Vị trí & Chức năng SCADA</th>
                <th className="py-3 px-4 text-right">Trạng thái Logic (Live)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredGpios.map((gpio) => (
                <tr
                  key={gpio.pin}
                  className="hover:bg-slate-50/70 dark:hover:bg-white/[0.015] transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                    {gpio.pin}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          gpio.isActive
                            ? gpio.isError
                              ? "bg-rose-500 animate-ping"
                              : "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                      <span>{gpio.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 block font-semibold">
                      {gpio.ioType}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {gpio.voltage}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {gpio.description}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      📍 {gpio.physicalLocation}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold border ${
                        gpio.isActive
                          ? gpio.isError
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-slate-400 border-slate-200/80 dark:border-white/[0.06]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${gpio.isActive ? (gpio.isError ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-400"}`} />
                      {gpio.isActive ? gpio.activeLabel : gpio.inactiveLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        title="Xác nhận đặt lại cảm biến & van gạt"
        message="Thao tác này sẽ gửi lệnh đưa các servo gạt và trạng thái cảm biến S1-S3 về trạng thái nhàn rỗi (idle). Bạn có chắc chắn muốn tiến hành?"
        confirmText="Đặt lại ngay"
        cancelText="Hủy bỏ"
        type="warning"
        onConfirm={confirmReset}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

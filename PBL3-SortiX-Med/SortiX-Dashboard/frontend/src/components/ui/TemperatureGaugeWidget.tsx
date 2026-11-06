"use client";

import React from "react";
import {
  Thermometer,
  AlertTriangle,
  ShieldCheck,
  Flame,
  Sliders,
  Radio,
  RefreshCw,
  Zap,
  RotateCw,
  Eye,
  Volume2,
  Activity,
  AlertOctagon,
} from "lucide-react";

export interface HardwareDeviceStatus {
  id: string;
  name: string;
  pin: string;
  category: "actuator" | "sensor" | "alarm";
  type?: "servo" | "motor" | "buzzer" | "sensor" | "estop" | "led";
  isOn: boolean;
  description?: string;
}

export interface TemperatureGaugeWidgetProps {
  currentTemp: number; // e.g. 78.5
  thresholdTemp?: number; // e.g. 75.0
  deviceName?: string; // e.g. "Main_Drive_Motor / Edge_AI_Box"
  unit?: string; // "°C"
  isOnline?: boolean;
  className?: string;
  compact?: boolean;
  isSimulation?: boolean;
  showSimulationControls?: boolean;
  lastUpdated?: string;
  onSimulateTempChange?: (temp: number) => void;
  onCoolDown?: () => void;
  // Trạng thái các thiết bị phần cứng, cảm biến, servo (ON / OFF)
  hardwareDevices?: HardwareDeviceStatus[];
  onToggleHardwareDevice?: (id: string, currentState: boolean) => void;
}

export const TemperatureGaugeWidget: React.FC<TemperatureGaugeWidgetProps> = ({
  currentTemp,
  thresholdTemp = 75.0,
  deviceName = "Cảm biến nhiệt độ nội vi ESP32-C5",
  unit = "°C",
  isOnline = true,
  className = "",
  compact = false,
  isSimulation = false,
  showSimulationControls = false,
  lastUpdated,
  onSimulateTempChange,
  onCoolDown,
  hardwareDevices,
  onToggleHardwareDevice,
}) => {
  const defaultHardwareList: HardwareDeviceStatus[] = [
    {
      id: "servo_1",
      name: "Servo Gạt 1 (MG996R)",
      pin: "GPIO6",
      category: "actuator",
      type: "servo",
      isOn: false,
      description: "Gạt phân loại phôi vào Khay 1 (Vị trí 200mm)",
    },
    {
      id: "servo_2",
      name: "Servo Gạt 2 (MG996R)",
      pin: "GPIO7",
      category: "actuator",
      type: "servo",
      isOn: false,
      description: "Gạt phân loại phôi vào Khay 2 (Vị trí 400mm)",
    },
    {
      id: "conveyor_motor",
      name: "Động cơ Băng Tải L298N",
      pin: "GPIO8/9",
      category: "actuator",
      type: "motor",
      isOn: false,
      description: "Động cơ DC JGB37-520 12V 66RPM kéo băng tải",
    },
    {
      id: "s1_entry",
      name: "Cảm biến vật cản IR LM393",
      pin: "GPIO0",
      category: "sensor",
      type: "sensor",
      isOn: false,
      description: "Phát hiện phôi đầu băng tải trước cổng quét AI",
    },
    {
      id: "encoder",
      name: "Encoder Động cơ (2 Pha A/B)",
      pin: "GPIO1/4",
      category: "sensor",
      type: "sensor",
      isOn: false,
      description: "Đếm xung định vị phôi chính xác theo mm di chuyển",
    },
    {
      id: "ldr_sensor",
      name: "Cảm biến ánh sáng LDR",
      pin: "GPIO5",
      category: "sensor",
      type: "sensor",
      isOn: false,
      description: "Giám sát ngưỡng sáng buồng chụp ảnh nhận diện phôi",
    },
    {
      id: "btn_start",
      name: "Nút nhấn Khởi Động (Start)",
      pin: "GPIO23",
      category: "sensor",
      type: "sensor",
      isOn: false,
      description: "Nút nhấn cứng tái khởi động hệ thống sau dừng máy",
    },
    {
      id: "led_status",
      name: "Đèn LED Trạng Thái",
      pin: "GPIO10",
      category: "alarm",
      type: "led",
      isOn: false,
      description: "Đèn LED xanh lá báo trạng thái vận hành & cảnh báo sự cố",
    },
    {
      id: "estop",
      name: "Nút Dừng Khẩn Cấp (E-Stop)",
      pin: "Cắt 12V",
      category: "sensor",
      type: "estop",
      isOn: false,
      description: "Tiếp điểm NC ngắt nguồn lực 12V an toàn phần cứng",
    },
  ];

  const activeDevices = hardwareDevices ?? defaultHardwareList;
  const onCount = activeDevices.filter((d) => d.isOn).length;

  // Giới hạn giá trị hiển thị từ 0 đến 100
  const clampedTemp = Math.max(0, Math.min(100, currentTemp));
  const isOverheat = isOnline && currentTemp > thresholdTemp;
  const isWarningZone = isOnline && currentTemp >= 60 && currentTemp <= thresholdTemp;

  // Tính góc quay của kim (từ -90° tại 0°C đến +90° tại 100°C)
  // Khi offline: kim quay về vị trí an toàn ban đầu (-90°)
  const needleAngle = isOnline ? (clampedTemp / 100) * 180 - 90 : -90;

  // Màu sắc chủ đạo theo trạng thái
  const statusColor = !isOnline
    ? "#94a3b8" // Xám khi mất tín hiệu
    : isOverheat
    ? "#ef4444" // Đỏ nguy hiểm
    : isWarningZone
    ? "#f59e0b" // Vàng/Cam cận ngưỡng
    : "#3b82f6"; // Xanh an toàn

  const statusBg = !isOnline
    ? "bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-400"
    : isOverheat
    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
    : isWarningZone
    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";

  const statusText = !isOnline
    ? "Mất tín hiệu cảm biến"
    : isOverheat
    ? "Quá nhiệt"
    : isWarningZone
    ? "Cận ngưỡng"
    : "Bình thường";

  // Bán kính cung tròn SVG
  const cx = 100;
  const cy = 92;
  const r = 70;

  // Tọa độ kim đồng hồ
  const needleLength = 54;
  const rad = (needleAngle * Math.PI) / 180;
  const needleX = cx + needleLength * Math.sin(rad);
  const needleY = cy - needleLength * Math.cos(rad);

  if (compact) {
    return (
      <div
        className={`relative flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
          !isOnline
            ? "border-slate-200/80 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
            : isOverheat
            ? "border-rose-500 bg-rose-50/80 dark:border-rose-500/40 dark:bg-rose-950/20 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            : isWarningZone
            ? "border-amber-500/50 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/15"
            : "border-slate-200/80 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]"
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
              !isOnline
                ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                : isOverheat
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                : isWarningZone
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
            }`}
          >
            {isOverheat ? (
              <Flame className="h-4 w-4" />
            ) : !isOnline ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Thermometer className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Nhiệt độ ESP32</span>
              {isSimulation && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                  Sim
                </span>
              )}
            </div>
            <p className="font-mono text-sm font-bold text-slate-900 dark:text-white truncate">
              {isOnline ? `${currentTemp.toFixed(1)}${unit}` : `--.- ${unit}`}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBg}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                !isOnline
                  ? "bg-slate-400"
                  : isOverheat
                  ? "bg-rose-500 animate-pulse"
                  : isWarningZone
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            {statusText}
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {lastUpdated ? `Cập nhật: ${lastUpdated}` : isOnline ? "Thời gian thực" : "Mất tín hiệu"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 ${
        isOverheat
          ? "border-rose-500 bg-rose-50/80 shadow-[0_0_24px_rgba(239,68,68,0.25)] dark:border-rose-500/50 dark:bg-rose-950/20 animate-bounce-subtle"
          : isWarningZone
          ? "border-amber-500/60 bg-amber-50/40 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/15"
          : "border-slate-200/80 bg-white/95 shadow-sm dark:border-white/[0.07] dark:bg-[#161822]"
      } ${className}`}
    >
      {/* KHỐI TRÊN: HEADER + ĐỒNG HỒ NHIỆT ĐỘ THU NHỎ + CHẾ ĐỘ HOẠT ĐỘNG */}
      <div className="w-full flex flex-col items-center">
        {/* Header Widget */}
        <div className="flex w-full items-center justify-between border-b border-slate-100 pb-2 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 ${
                isOverheat
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                  : isWarningZone
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
              }`}
            >
              {isOverheat ? (
                <Flame className="h-3.5 w-3.5" />
              ) : (
                <Thermometer className="h-3.5 w-3.5" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Nhiệt độ
                {isOverheat && (
                  <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-rose-500" />
                )}
              </h4>
              <p className="text-[10px] text-slate-400 truncate max-w-[170px]" title={deviceName}>
                {deviceName}
              </p>
            </div>
          </div>

          {/* Badge trạng thái */}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusBg}`}
          >
            {!isOnline ? (
              <AlertTriangle className="h-3 w-3 text-slate-500" />
            ) : isOverheat ? (
              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            ) : (
              <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            )}
            {statusText}
          </span>
        </div>

        {/* SVG Semicircular Gauge (Thu nhỏ gọn gàng, vừa vặn tỷ lệ màn hình) */}
        <div className="w-full max-w-[145px] flex flex-col items-center justify-center mt-1">
          <svg
            viewBox="0 0 200 108"
            className="w-full h-auto overflow-visible select-none drop-shadow-xs"
          >
            <defs>
              {/* Gradient cho cung an toàn (Xanh) */}
              <linearGradient id="gaugeSafeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>

              {/* Gradient cho cung cảnh báo (Vàng/Cam) */}
              <linearGradient id="gaugeWarnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>

              {/* Gradient cho cung quá nhiệt (Đỏ) */}
              <linearGradient id="gaugeDangerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>

              {/* Filter phát sáng khi quá nhiệt */}
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Vòng cung xám nền phía sau */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              className="text-slate-100 dark:text-white/[0.08]"
              strokeLinecap="round"
            />

            {/* 1. Phân vùng XANH: 0°C -> 60°C (Góc: 0° đến 108°) */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 78.3 25.4`}
              fill="none"
              stroke="url(#gaugeSafeGrad)"
              strokeWidth="11"
              strokeLinecap="round"
              className="transition-all duration-300"
            />

            {/* 2. Phân vùng VÀNG/CAM: 60°C -> 75°C (Góc: 108° đến 135°) */}
            <path
              d={`M 78.3 25.4 A ${r} ${r} 0 0 1 150.5 42.5`}
              fill="none"
              stroke="url(#gaugeWarnGrad)"
              strokeWidth="11"
              className="transition-all duration-300"
            />

            {/* 3. Phân vùng ĐỎ NGUY HIỂM: 75°C -> 100°C (Góc: 135° đến 180°) */}
            <path
              d={`M 150.5 42.5 A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="url(#gaugeDangerGrad)"
              strokeWidth="11"
              strokeLinecap="round"
              filter={isOverheat ? "url(#gaugeGlow)" : undefined}
              className={`transition-all duration-300 ${isOverheat ? "stroke-[13] opacity-100" : "opacity-85"}`}
            />

            {/* Điểm chia ngưỡng 75°C (Threshold Pin) */}
            <circle
              cx="150.5"
              cy="42.5"
              r="3.5"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2"
              className="shadow-sm"
            />
            <text
              x="156"
              y="35"
              fill="#ef4444"
              fontSize="7.5"
              fontWeight="bold"
              fontFamily="monospace"
            >
              75°C
            </text>

            {/* Vạch min (0°C) và max (100°C) */}
            <text
              x="24"
              y="105"
              fill="#94a3b8"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              0°C
            </text>
            <text
              x="165"
              y="105"
              fill="#94a3b8"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              100°C
            </text>

            {/* Kim đồng hồ (Needle) */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke={statusColor}
              strokeWidth="4"
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
              filter={isOverheat ? "url(#gaugeGlow)" : undefined}
            />

            {/* Trục tâm kim (Pivot point) */}
            <circle
              cx={cx}
              cy={cy}
              r="6"
              fill="#1e293b"
              stroke={statusColor}
              strokeWidth="2.5"
              className="dark:fill-slate-900 transition-colors duration-300"
            />
            <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
          </svg>

          {/* Số nhiệt độ tức thời tinh gọn */}
          <div className="flex flex-col items-center text-center -mt-0.5">
            <div className="flex items-baseline gap-0.5">
              <span
                className={`font-mono text-2xl font-black tracking-tight transition-all duration-300 ${
                  isOverheat
                    ? "text-rose-600 dark:text-rose-400 scale-105 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
                    : isWarningZone
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {isOnline ? currentTemp.toFixed(1) : "--.-"}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                {unit}
              </span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
              Ngưỡng an toàn: <strong className="text-rose-500 font-mono">{thresholdTemp}{unit}</strong>
            </span>
          </div>
        </div>

        {/* Cảnh báo nhấp nháy chữ đỏ khi vượt ngưỡng */}
        {isOverheat && (
          <div className="mt-2 w-full rounded-lg border border-rose-500/40 bg-rose-500/15 p-1.5 text-center text-xs font-bold text-rose-700 dark:text-rose-300 animate-pulse">
            🔥 CẢNH BÁO: Động cơ vượt ngưỡng {thresholdTemp}{unit}! Cần giảm tải hoặc bật quạt tản nhiệt.
          </div>
        )}

        {/* HIỂN THỊ ĐIỀU KHIỂN HOẶC TRẠNG THÁI RÚT GỌN */}
        {showSimulationControls && isSimulation ? (
          /* 1. CHẾ ĐỘ MÔ PHỎNG ĐẦY ĐỦ (DÀNH CHO /config HOẶC PANEL KIỂM THỬ) */
          <div className="mt-2.5 w-full rounded-xl border border-amber-500/30 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-950/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Thanh chỉnh nhiệt độ ảo
                </span>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-extrabold uppercase text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Mô Phỏng
                </span>
              </div>
              <span
                className={`font-mono text-xs font-black px-2 py-0.5 rounded-md border ${
                  isOverheat
                    ? "bg-rose-500/20 text-rose-600 border-rose-500/40 animate-pulse"
                    : isWarningZone
                    ? "bg-amber-500/20 text-amber-600 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-600 border-emerald-500/40"
                }`}
              >
                {clampedTemp.toFixed(1)}{unit}
              </span>
            </div>

            {/* Thanh trượt Range slider */}
            <div className="mt-2 space-y-1">
              <input
                type="range"
                min="30.0"
                max="95.0"
                step="0.5"
                value={clampedTemp}
                onChange={(e) => onSimulateTempChange?.(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-amber-500"
                aria-label="Điều chỉnh nhiệt độ mô phỏng"
              />
              <div className="flex justify-between text-xs font-mono text-slate-400 dark:text-slate-500">
                <span>30°C (Mát)</span>
                <span className="font-bold text-amber-500">Ngưỡng: {thresholdTemp}°C</span>
                <span className="text-rose-500">95°C (Quá nhiệt)</span>
              </div>
            </div>

            {/* Các nút bấm thiết lập nhanh */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onSimulateTempChange?.(42.5)}
                className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111319] py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
              >
                ❄️ 42.5°C An toàn
              </button>
              <button
                type="button"
                onClick={() => onSimulateTempChange?.(72.0)}
                className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
              >
                ⚠️ 72.0°C Cận ngưỡng
              </button>
              <button
                type="button"
                onClick={() => onSimulateTempChange?.(78.5)}
                className="rounded-lg border border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
              >
                🔥 78.5°C Quá nhiệt
              </button>
            </div>

            {/* Nút giải nhiệt nhanh khi vượt ngưỡng */}
            {isOverheat && onCoolDown && (
              <button
                type="button"
                onClick={onCoolDown}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Hạ nhiệt độ về 42.5°C (An toàn)
              </button>
            )}
          </div>
        ) : isSimulation ? (
          /* 2. CHẾ ĐỘ MÔ PHỎNG RÚT GỌN TRÊN TRANG TỔNG QUAN (CHỈ HIỆN BADGE MÔ PHỎNG NHỎ) */
          <div className="mt-1.5 w-full flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                Chế độ mô phỏng
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
              Ngưỡng: {thresholdTemp}{unit}
            </span>
          </div>
        ) : (
          /* 3. CHẾ ĐỘ THỰC TẾ: THÔNG TIN CẢM BIẾN NỘI VI TRÊN CHIP ESP32-C5 */
          <div className="mt-1.5 w-full rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-2 dark:border-emerald-500/15 dark:bg-emerald-950/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Đo thực tế từ cảm biến
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                Thực Tế
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
              <span>Trạng thái:</span>
              <span className={`font-semibold flex items-center gap-1 ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                {isOnline ? "Trực tuyến (Live Telemetry)" : "Mất tín hiệu"}
              </span>
            </div>

            <p className="mt-1 border-t border-emerald-500/10 dark:border-emerald-500/15 pt-1 text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
              🔒 Chế độ đo thực tế: Nhiệt độ được đo đạc liên tục từ cảm biến.
            </p>
          </div>
        )}
      </div>

      {/* KHỐI DƯỚI: TRẠNG THÁI CẢM BIẾN & CƠ CẤU CHẤP HÀNH (ON / OFF) */}
      <div className="mt-2 w-full pt-2 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Trạng thái Cảm biến & Servo
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onCount}/{activeDevices.length} ON
          </span>
        </div>

        {/* Lưới 2 cột hiển thị các cảm biến, servo, còi báo dạng ON/OFF (Chế độ chỉ xem - Read-only) */}
        <div className="grid grid-cols-2 gap-1 w-full">
          {activeDevices.map((device) => {
            const isDeviceOn = device.isOn;
            return (
              <div
                key={device.id}
                className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1 select-none transition-all ${
                  isDeviceOn
                    ? "border-emerald-500/30 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-950/20 shadow-2xs"
                    : "border-slate-100 bg-slate-50/60 dark:border-white/[0.04] dark:bg-white/[0.02]"
                }`}
                title={device.description ? `${device.name} (${device.pin}): ${device.description}` : device.name}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[9px] ${
                      isDeviceOn
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-200 bg-white text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-500"
                    }`}
                  >
                    {device.type === "servo" ? (
                      <RotateCw className={`h-2.5 w-2.5 ${isDeviceOn ? "animate-spin text-emerald-500" : ""}`} />
                    ) : device.type === "sensor" ? (
                      <Eye className={`h-2.5 w-2.5 ${isDeviceOn ? "text-emerald-500" : ""}`} />
                    ) : device.type === "led" || device.id === "led_status" ? (
                      <Zap className={`h-2.5 w-2.5 ${isDeviceOn ? "animate-pulse text-emerald-500" : ""}`} />
                    ) : device.type === "buzzer" ? (
                      <Volume2 className={`h-2.5 w-2.5 ${isDeviceOn ? "animate-bounce text-rose-500" : ""}`} />
                    ) : device.type === "estop" ? (
                      <AlertOctagon className={`h-2.5 w-2.5 ${isDeviceOn ? "text-rose-500" : ""}`} />
                    ) : (
                      <Activity className={`h-2.5 w-2.5 ${isDeviceOn ? "animate-pulse text-emerald-500" : ""}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {device.name}
                    </p>
                    <span className="font-mono text-[8px] text-slate-400 dark:text-slate-500">
                      {device.pin}
                    </span>
                  </div>
                </div>

                {/* Badge Trạng thái ON / OFF */}
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 font-mono text-[9px] font-black uppercase transition-all ${
                    isDeviceOn
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      : "border-slate-200/80 bg-slate-100 text-slate-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-500"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isDeviceOn
                        ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_#3b82f6]"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  {isDeviceOn ? "ON" : "OFF"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ghi chú chân trang */}
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
          <span>• 3 Tải: 2 Servo gạt, 1 Còi báo</span>
          <span className="font-medium text-slate-400 dark:text-slate-500">Chỉ xem (Read-only)</span>
        </div>
      </div>
    </div>
  );
};

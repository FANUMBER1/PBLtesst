"use client";

import React from "react";
import { Thermometer, Flame, CheckCircle2, Wind } from "lucide-react";
import { TemperatureWarningPayload } from "@shared/types";

interface TemperatureWarningToastProps {
  isOpen: boolean;
  incident?: TemperatureWarningPayload | null;
  onAcknowledge: () => void;
  onCoolDown?: () => void;
  isSystemLocked?: boolean;
  isJammed?: boolean;
  isBinFull?: boolean;
}

export const TemperatureWarningToast: React.FC<TemperatureWarningToastProps> = ({
  isOpen,
  incident,
  onAcknowledge,
  onCoolDown,
  isSystemLocked = false,
  isJammed = false,
  isBinFull = false,
}) => {
  if (!isOpen) return null;

  const currentTemp = incident?.current_temp ?? 78.5;
  const thresholdTemp = incident?.threshold_temp ?? 75.0;
  const unit = incident?.unit || "°C";
  const deviceName = incident?.device_name || "Main_Drive_Motor / Edge_AI_Box";

  let deviceLabel = "Động cơ truyền động chính";
  if (deviceName.includes("Edge_AI") || deviceName.includes("CPU")) {
    deviceLabel = "CPU máy chủ Edge AI";
  }

  // Tính toán vị trí nổi để không bị đè lên các toast khác (E-Stop, Jam, BinFull)
  let activeAlertsCount = 0;
  if (isSystemLocked) activeAlertsCount += 2;
  if (isJammed) activeAlertsCount += 1;
  if (isBinFull) activeAlertsCount += 1;

  let bottomClass = "bottom-6";
  if (activeAlertsCount >= 3) {
    bottomClass = "bottom-[520px]";
  } else if (activeAlertsCount === 2) {
    bottomClass = "bottom-[370px]";
  } else if (activeAlertsCount === 1) {
    bottomClass = "bottom-[210px]";
  }

  return (
    <div
      role="alert"
      className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-amber-500 bg-[#161208]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle ${bottomClass}`}
      style={{
        boxShadow: "0 10px 40px rgba(245, 158, 11, 0.45), 0 0 25px rgba(217, 119, 6, 0.35)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon nhiệt độ / ngọn lửa nhấp nháy màu vàng cam */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg animate-pulse">
          <Flame className="h-6 w-6 text-yellow-200" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5" />
              Cảnh báo quá nhiệt
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
              WARNING
            </span>
          </div>

          <p className="mt-1.5 text-xs font-bold text-slate-100 leading-snug">
            [QUÁ NHIỆT] {deviceLabel} đang ở mức{" "}
            <strong className="text-rose-400 font-mono font-black text-sm">
              {currentTemp}{unit}
            </strong>{" "}
            (Ngưỡng an toàn: <span className="font-mono text-amber-300 font-bold">{thresholdTemp}{unit}</span>). Khuyến nghị kiểm tra quạt tản nhiệt hoặc giảm tải.
          </p>

          {/* Thanh chỉ số nhiệt độ trực quan */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/90 font-semibold">
              <span>Mức nhiệt độ hiện tại:</span>
              <span className="font-black text-rose-400">{currentTemp}{unit} / 100{unit}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 border border-amber-500/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 animate-pulse shadow-[0_0_10px_#ef4444]"
                style={{ width: `${Math.min(100, Math.max(0, currentTemp))}%` }}
              />
            </div>
          </div>

          {/* Nút hành động */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onAcknowledge}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-2 text-xs font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Xác nhận & tắt còi</span>
            </button>

            {onCoolDown && (
              <button
                onClick={onCoolDown}
                className="flex items-center justify-center gap-1 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50 transition-all active:scale-95"
                title="Tự động hạ nhiệt về mức an toàn 42.5°C (Chế độ mô phỏng)"
              >
                <Wind className="h-3.5 w-3.5 text-cyan-400" />
                <span>Hạ nhiệt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React from "react";
import { WifiOff, CheckCircle2, RotateCcw, ServerOff } from "lucide-react";
import { DeviceOfflinePayload } from "@shared/types";

interface DeviceOfflineToastProps {
  isOpen: boolean;
  incident?: DeviceOfflinePayload | null;
  onAcknowledge: () => void;
  onReconnect?: () => void;
  isSystemLocked?: boolean;
  isJammed?: boolean;
  isBinFull?: boolean;
  isTempWarning?: boolean;
}

export const DeviceOfflineToast: React.FC<DeviceOfflineToastProps> = ({
  isOpen,
  incident,
  onAcknowledge,
  onReconnect,
  isSystemLocked = false,
  isJammed = false,
  isBinFull = false,
  isTempWarning = false,
}) => {
  if (!isOpen) return null;

  const deviceId = incident?.device_id || "ESP32_MAIN_CONTROLLER";
  const ipAddress = incident?.ip_address || "192.168.1.105";
  const lastSeen = incident?.last_seen || "15 giây trước";

  // Tính toán vị trí nổi để không bị đè lên các toast khác (E-Stop, Jam, BinFull, TempWarning)
  let activeAlertsCount = 0;
  if (isSystemLocked) activeAlertsCount += 2;
  if (isJammed) activeAlertsCount += 1;
  if (isBinFull) activeAlertsCount += 1;
  if (isTempWarning) activeAlertsCount += 1;

  let bottomClass = "bottom-6";
  if (activeAlertsCount >= 4) {
    bottomClass = "bottom-[670px]";
  } else if (activeAlertsCount === 3) {
    bottomClass = "bottom-[520px]";
  } else if (activeAlertsCount === 2) {
    bottomClass = "bottom-[370px]";
  } else if (activeAlertsCount === 1) {
    bottomClass = "bottom-[210px]";
  }

  return (
    <div
      role="alert"
      className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-rose-500 bg-[#160b0e]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle ${bottomClass}`}
      style={{
        boxShadow: "0 10px 40px rgba(244, 63, 94, 0.45), 0 0 25px rgba(225, 29, 72, 0.35)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon WifiOff nhấp nháy màu đỏ */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg animate-pulse">
          <WifiOff className="h-6 w-6 text-rose-100" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ServerOff className="h-3.5 w-3.5" />
              Mất kết nối thiết bị
            </span>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
              ERROR
            </span>
          </div>

          <p className="mt-1.5 text-xs font-bold text-slate-100 leading-snug">
            [MẤT KẾT NỐI THIẾT BỊ] Vi điều khiển trung tâm (ESP32) đã ngoại tuyến! Dữ liệu cảm biến thời gian thực bị ngắt.
          </p>

          {/* Chi tiết thiết bị & thời gian heartbeat */}
          <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Node ID:</span>
              <span className="font-bold text-white">{deviceId}</span>
            </div>
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Địa chỉ IP:</span>
              <span className="font-bold text-rose-300">{ipAddress}</span>
            </div>
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Tín hiệu cuối:</span>
              <span className="font-bold text-amber-300">{lastSeen} (Timeout &gt; 6s)</span>
            </div>
          </div>

          {/* Cụm nút thao tác */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onAcknowledge}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 text-xs font-bold transition-all shadow-sm active:scale-95 border border-white/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Đã ghi nhận</span>
            </button>

            {onReconnect && (
              <button
                type="button"
                onClick={onReconnect}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2 px-3 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border border-emerald-400/40"
                title="Khôi phục lại luồng Heartbeat ảo mô phỏng"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Kết nối lại (Mô phỏng)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

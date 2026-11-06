"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Radio, CheckCircle2, AlertTriangle, RefreshCw, X } from "lucide-react";
import { MqttDisconnectedPayload } from "@shared/types";

interface MqttDisconnectedToastProps {
  isOpen: boolean;
  incident?: MqttDisconnectedPayload | null;
  reconnectAttempt?: number;
  onForceReconnect?: () => void;
  onDismiss?: () => void;
  isSystemLocked?: boolean;
  isJammed?: boolean;
  isBinFull?: boolean;
  isTempWarning?: boolean;
  isDeviceOffline?: boolean;
}

export const MqttDisconnectedToast: React.FC<MqttDisconnectedToastProps> = ({
  isOpen,
  incident,
  reconnectAttempt = 1,
  onForceReconnect,
  onDismiss,
  isSystemLocked = false,
  isJammed = false,
  isBinFull = false,
  isTempWarning = false,
  isDeviceOffline = false,
}) => {
  const [showRestored, setShowRestored] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Khi chuyển từ isOpen = true sang false -> hiện thông báo đã phục hồi màu xanh trong 4.5 giây
  useEffect(() => {
    if (isOpen) {
      setWasOpen(true);
      setShowRestored(false);
    } else if (wasOpen) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOpen(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, wasOpen]);

  if (!isOpen && !showRestored) return null;

  const attempt = incident?.reconnect_attempt || reconnectAttempt || 1;
  const brokerUrl = incident?.broker_url || "MQTT broker chưa cấu hình";
  const durationSec = incident?.disconnected_duration_seconds || 5;

  // Tính toán vị trí xếp tầng (stacking offset)
  let activeAlertsCount = 0;
  if (isSystemLocked) activeAlertsCount += 2;
  if (isJammed) activeAlertsCount += 1;
  if (isBinFull) activeAlertsCount += 1;
  if (isTempWarning) activeAlertsCount += 1;
  if (isDeviceOffline) activeAlertsCount += 1;

  let bottomClass = "bottom-6";
  if (activeAlertsCount >= 5) {
    bottomClass = "bottom-[720px]";
  } else if (activeAlertsCount === 4) {
    bottomClass = "bottom-[580px]";
  } else if (activeAlertsCount === 3) {
    bottomClass = "bottom-[440px]";
  } else if (activeAlertsCount === 2) {
    bottomClass = "bottom-[300px]";
  } else if (activeAlertsCount === 1) {
    bottomClass = "bottom-[160px]";
  }

  // Giao diện đã phục hồi xanh lá
  if (showRestored && !isOpen) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="mqtt-restored-toast"
        className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-emerald-500 bg-[#0c1a14]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bottomClass}`}
        style={{
          boxShadow: "0 10px 40px rgba(16, 185, 129, 0.45), 0 0 25px rgba(5, 150, 105, 0.35)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg">
            <CheckCircle2 className="h-6 w-6 text-emerald-100 animate-bounce" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5" />
                MẠNG TIN NHẮN TRỰC TUYẾN
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                RESTORED
              </span>
            </div>

            <p className="mt-1.5 text-xs font-bold text-emerald-200 leading-snug">
              [ĐÃ PHỤC HỒI] Kết nối MQTT Broker thành công
            </p>

            <p className="mt-1 text-[11px] text-slate-300">
              Hệ thống đã kết nối thông suốt tới máy chủ tin nhắn ({brokerUrl}). Dữ liệu telemetry và cảnh báo đang truyền nhận thời gian thực.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRestored(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900/30 transition-colors"
            title="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Giao diện cảnh báo mất kết nối màu đỏ CRITICAL
  return (
    <div
      role="alert"
      data-testid="mqtt-disconnected-toast"
      className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-rose-500 bg-[#190a0d]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle ${bottomClass}`}
      style={{
        boxShadow: "0 10px 40px rgba(244, 63, 94, 0.45), 0 0 25px rgba(225, 29, 72, 0.35)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon WifiOff nhấp nháy đỏ */}
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
              <AlertTriangle className="h-3.5 w-3.5" />
              MẤT KẾT NỐI MẠNG
            </span>
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300 border border-rose-500/40">
              CRITICAL
            </span>
          </div>

          <p className="mt-1.5 text-xs font-bold text-slate-100 leading-snug">
            [MẤT KẾT NỐI MẠNG] Mất liên lạc với MQTT Broker! Đang thử kết nối lại lần thứ {attempt} (Reconnecting...)
          </p>

          {/* Chi tiết broker & chu kỳ thử lại */}
          <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Broker:</span>
              <span className="font-bold text-white truncate max-w-[210px]">{brokerUrl}</span>
            </div>
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Thời gian gián đoạn:</span>
              <span className="font-bold text-amber-300">&gt; {durationSec} giây</span>
            </div>
            <div className="flex items-center justify-between text-rose-200">
              <span className="text-slate-400">Cơ chế Auto-reconnect:</span>
              <span className="font-bold text-emerald-300">Chu kỳ 3s, 5s, 10s</span>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="mt-3 flex items-center gap-2">
            {onForceReconnect && (
              <button
                type="button"
                onClick={onForceReconnect}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-3 py-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Thử kết nối lại ngay</span>
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors"
              >
                Ẩn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import React from "react";
import { ClipboardCheck, Bell, ChevronRight, X, BarChart2 } from "lucide-react";
import { ShiftSummaryPayload } from "@shared/types";

interface ShiftSummaryToastProps {
  isOpen: boolean;
  incident?: ShiftSummaryPayload | null;
  onOpenDetails: () => void;
  onClose: () => void;
  isSystemLocked?: boolean;
  isJammed?: boolean;
  isBinFull?: boolean;
  isTempWarning?: boolean;
  isDeviceOffline?: boolean;
}

export const ShiftSummaryToast: React.FC<ShiftSummaryToastProps> = ({
  isOpen,
  incident,
  onOpenDetails,
  onClose,
  isSystemLocked = false,
  isJammed = false,
  isBinFull = false,
  isTempWarning = false,
  isDeviceOffline = false,
}) => {
  if (!isOpen || !incident) return null;

  const shiftName = incident.shift_name || "1 Ngày làm việc";
  let displayShiftName = shiftName;
  if (displayShiftName.startsWith("Báo cáo 1 ngày làm việc (") && displayShiftName.endsWith(")")) {
    const rawDate = displayShiftName.slice("Báo cáo 1 ngày làm việc (".length, -1);
    displayShiftName = `Ngày ${rawDate}`;
  }
  const total = incident.total_products ?? 0;
  const accuracy = incident.accuracy_rate || "100.0%";

  // Tính toán vị trí nổi để không bị đè lên các toast khác (E-Stop, Jam, BinFull, TempWarning, DeviceOffline)
  let activeAlertsCount = 0;
  if (isSystemLocked) activeAlertsCount += 2;
  if (isJammed) activeAlertsCount += 1;
  if (isBinFull) activeAlertsCount += 1;
  if (isTempWarning) activeAlertsCount += 1;
  if (isDeviceOffline) activeAlertsCount += 1;

  let bottomClass = "bottom-6";
  if (activeAlertsCount >= 5) {
    bottomClass = "bottom-[820px]";
  } else if (activeAlertsCount === 4) {
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
      className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-emerald-500/80 bg-[#091b15]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bottomClass}`}
      style={{
        boxShadow: "0 10px 40px rgba(16, 185, 129, 0.35), 0 0 25px rgba(5, 150, 105, 0.25)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon chuông thông báo màu xanh ngọc nhấp nháy nhẹ */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 shadow-md">
          <Bell className="h-5 w-5 animate-bounce-subtle" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              BÁO CÁO 1 NGÀY LÀM VIỆC
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                INFO
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng thông báo báo cáo ngày"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-1.5 text-xs font-bold text-slate-100 leading-snug">
            [BÁO CÁO 1 NGÀY LÀM VIỆC] {displayShiftName}: Tổng {total.toLocaleString("vi-VN")} sản phẩm (Đạt {accuracy}). Nhấn để xem chi tiết.
          </p>

          {/* Chi tiết nhanh */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3 py-1.5 text-[11px] font-mono text-emerald-200">
            <span>Đạt: <strong className="text-emerald-300 font-bold">{incident.sorted_good.toLocaleString("vi-VN")}</strong></span>
            <span>Lỗi: <strong className={incident.sorted_defect > 0 ? "text-rose-400 font-bold" : "text-emerald-300 font-bold"}>{incident.sorted_defect.toLocaleString("vi-VN")}</strong></span>
            <span>Thời gian: <strong className="text-white font-bold">{incident.operating_hours}</strong></span>
          </div>

          {/* Cụm nút thao tác */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDetails}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-xs font-bold transition-all shadow-xs active:scale-95 border border-emerald-400/40"
            >
              <BarChart2 className="h-3.5 w-3.5 text-emerald-100" />
              <span>Xem chi tiết & biểu đồ</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-2 px-3 text-xs font-semibold transition-all border border-white/10 active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

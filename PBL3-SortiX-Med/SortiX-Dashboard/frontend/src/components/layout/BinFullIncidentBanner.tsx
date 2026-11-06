"use client";

import React from "react";
import { Boxes, PackageCheck, AlertTriangle } from "lucide-react";
import { BinFullPayload } from "@shared/types";

interface BinFullIncidentBannerProps {
  isBinFull: boolean;
  incident?: BinFullPayload | null;
  binNumber?: 1 | 2 | 3;
  onConfirmReplace: () => void;
}

export const BinFullIncidentBanner: React.FC<BinFullIncidentBannerProps> = ({
  isBinFull,
  incident,
  binNumber = 1,
  onConfirmReplace,
}) => {
  if (!isBinFull) return null;

  const binId = incident?.bin_id || (binNumber === 1 ? "BIN_RED_01" : binNumber === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03");
  const count = incident?.current_count ?? 50;
  const max = incident?.max_capacity ?? 50;

  let binLabel = "Đỏ (#01)";
  if (binId.toUpperCase().includes("BLUE") || binNumber === 2) {
    binLabel = "Xanh (#02)";
  } else if (binId.toUpperCase().includes("DEFAULT") || binNumber === 3) {
    binLabel = "Mặc định (#03)";
  }

  const timeStr = incident?.timestamp
    ? new Date(incident.timestamp).toLocaleTimeString("vi-VN")
    : new Date().toLocaleTimeString("vi-VN");

  return (
    <div
      role="alert"
      className="sticky top-0 z-49 w-full overflow-hidden border-b-2 border-amber-400 bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 text-white shadow-2xl transition-all duration-300 animate-pulse"
      style={{
        boxShadow: "0 4px 25px rgba(245, 158, 11, 0.5)",
      }}
    >
      <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Nội dung cảnh báo chính */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs border border-white/40 shadow-inner">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300" />
            </span>
            <Boxes className="h-6 w-6 text-white drop-shadow-md" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/30 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-yellow-200 border border-yellow-300/40">
                <AlertTriangle className="h-3.5 w-3.5" /> Đầy khay (100%)
              </span>
              <span className="text-xs font-mono opacity-90">
                {timeStr} • {incident?.mode === "simulation" ? "Mô phỏng" : "Thực tế"} • Đạt {count}/{max} SP
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-black tracking-tight text-white drop-shadow-sm">
              [Đầy khay chứa] Khay phân loại {binLabel} đã đạt giới hạn {count}/{max}. Vui lòng thay khay mới.
            </h3>
          </div>
        </div>

        {/* Nút hành động xác nhận đã thay khay */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onConfirmReplace}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-amber-900 hover:bg-yellow-50 active:scale-95 transition-all shadow-md hover:shadow-lg uppercase tracking-wider cursor-pointer"
          >
            <PackageCheck className="h-4 w-4 text-amber-600" />
            <span>Đã thay khay mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};

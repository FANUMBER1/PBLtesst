"use client";

import React, { useState } from "react";
import { Package, CheckCircle2, Boxes } from "lucide-react";
import { BinFullPayload } from "@shared/types";

interface BinFullToastProps {
  isOpen: boolean;
  incident?: BinFullPayload | null;
  binNumber?: 1 | 2 | 3;
  onConfirmReplace: () => void;
  isSystemLocked?: boolean;
  isJammed?: boolean;
}

export const BinFullToast: React.FC<BinFullToastProps> = ({
  isOpen,
  incident,
  binNumber = 1,
  onConfirmReplace,
  isSystemLocked = false,
  isJammed = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const binId = incident?.bin_id || (binNumber === 1 ? "BIN_RED_01" : binNumber === 2 ? "BIN_BLUE_02" : "BIN_DEFAULT_03");
  const count = incident?.current_count ?? 50;
  const max = incident?.max_capacity ?? 50;

  let binLabel = "Đỏ (#01)";
  if (binId.toUpperCase().includes("BLUE") || binNumber === 2) {
    binLabel = "Xanh (#02)";
  } else if (binId.toUpperCase().includes("DEFAULT") || binNumber === 3) {
    binLabel = "Mặc định (#03)";
  }

  const handleAction = () => {
    setIsProcessing(true);
    onConfirmReplace();
    setIsProcessing(false);
  };

  // Tính toán vị trí nổi để không bị đè lên JamUnlockToast hay EmergencyUnlockToast
  let bottomClass = "bottom-6";
  if (isSystemLocked && isJammed) {
    bottomClass = "bottom-[420px]";
  } else if (isSystemLocked || isJammed) {
    bottomClass = "bottom-60";
  }

  return (
    <div
      role="alert"
      className={`fixed right-6 z-50 max-w-md w-full rounded-2xl border-2 border-amber-500 bg-[#161208]/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-bounce-subtle ${bottomClass}`}
      style={{
        boxShadow: "0 10px 40px rgba(245, 158, 11, 0.4), 0 0 25px rgba(217, 119, 6, 0.3)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon thùng chứa nhấp nháy màu vàng cam */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg animate-pulse">
          <Boxes className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Đầy khay phân loại
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
              WARNING
            </span>
          </div>

          <p className="mt-1.5 text-xs font-bold text-slate-100 leading-snug">
            [Đầy khay chứa] Khay phân loại <strong className="text-amber-300">{binLabel}</strong> đã đạt giới hạn <span className="font-mono text-amber-400 font-black">{count}/{max}</span> cái. Vui lòng thay thế khay rỗng mới.
          </p>

          {/* Thanh tiến trình 100% nhấp nháy màu vàng cam */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/90 font-semibold">
              <span>Dung lượng khay:</span>
              <span className="font-black text-amber-400">100% đầy</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 border border-amber-500/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse shadow-[0_0_10px_#f59e0b]"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Nút hành động Xác nhận đã thay khay mới */}
          <div className="mt-3">
            <button
              onClick={handleAction}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 py-2.5 px-4 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã thay khay mới</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

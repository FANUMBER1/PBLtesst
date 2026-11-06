"use client";

import React from "react";
import {
  Cpu,
  Pause,
  Play,
  OctagonAlert,
  FlaskConical,
  Radio,
  ShieldAlert,
  Shuffle,
  Lock,
  Box,
  Sliders,
} from "lucide-react";
import type { TelemetryData } from "@/lib/types";

export interface ConveyorToolbarProps {
  telemetry: TelemetryData;
  isRunning: boolean;
  itemsCount: number;
  isSimulation: boolean;
  onToggleRun?: () => void;
  onEmergencyStop?: () => void;
  onSpawnPackage?: (brandKey?: string) => void;
  onGenerateDemoData?: () => void;
  getBrandTargetBinName: (brandKey: string) => string;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isBeltMoving: boolean;
  linearSpeedCms: string;
  rollerRpm: number;
  actuatorPanel?: React.ReactNode;
}

export const ConveyorToolbar: React.FC<ConveyorToolbarProps> = ({
  telemetry,
  isRunning,
  itemsCount,
  isSimulation,
  onToggleRun,
  onEmergencyStop,
  onSpawnPackage,
  onGenerateDemoData,
  getBrandTargetBinName,
  speed,
  onSpeedChange,
  isBeltMoving,
  linearSpeedCms,
  rollerRpm,
  actuatorPanel,
}) => {
  return (
    <>
      {/* TIÊU ĐỀ: Thông tin vận hành và nút điều khiển nhanh */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-sm">
            <Cpu className="h-5 w-5" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                telemetry.estop_pressed
                  ? "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                  : !isRunning
                  ? "bg-amber-400 shadow-[0_0_6px_#f59e0b]"
                  : isBeltMoving
                  ? "bg-emerald-400 shadow-[0_0_6px_#3b82f6]"
                  : "bg-slate-400"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Băng tải & cơ cấu phân loại
              </h3>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border shrink-0 ${
                  telemetry.estop_pressed
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400"
                    : !isRunning
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                    : isBeltMoving
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                    : "bg-white/[0.08] text-slate-300 border-white/[0.05]"
                }`}
              >
                {telemetry.estop_pressed
                  ? "Dừng khẩn"
                  : !isRunning
                  ? itemsCount === 0
                    ? "Đã dừng (Đã vào khay hết)"
                    : "Tạm dừng"
                  : itemsCount > 0 || isBeltMoving
                  ? `Đang chạy (${itemsCount} phôi mẫu)`
                  : "Chờ phôi mẫu (Đã dừng)"}
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {telemetry.estop_pressed
                ? "Băng tải đã ngắt điện do kích hoạt E-Stop"
                : !isRunning
                ? itemsCount === 0
                  ? "Toàn bộ mẫu vật đã vào khay • Băng tải tự động dừng • Đặt thêm mẫu vật lên là tự động chạy"
                  : "Hệ thống đang tạm dừng • Nhấn Khởi động để tiếp tục"
                : itemsCount > 0 || isBeltMoving
                ? `Băng tải đang vận chuyển ${itemsCount} phôi mẫu qua trạm quét AI và cơ cấu gạt`
                : "Băng tải đã tự động dừng khi phôi vào khay hết • Đặt thêm mẫu vật lên là tự động chạy"}
            </p>
          </div>
        </div>

        {/* NÚT THAO TÁC CƠ KHÍ, CHUYỂN ĐỔI CHẾ ĐỘ & ĐIỀU KHIỂN CHÍNH */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-auto">
          {/* HUY HIỆU CHỈ THỊ TRẠNG THÁI CHẾ ĐỘ (READ-ONLY) */}
          {isSimulation ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 shadow-xs select-none">
              <FlaskConical className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>
                Chế độ: <span className="text-amber-700 dark:text-amber-300 font-bold">Mô phỏng (Test Rig)</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs select-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              </span>
              <Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                Chế độ: <span className="text-emerald-600 dark:text-emerald-300 font-bold">Thực tế (ESP32)</span>
              </span>
            </div>
          )}

          {/* Nút Start/Pause */}
          <button
            onClick={onToggleRun}
            disabled={telemetry.estop_pressed}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              isRunning
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
            } disabled:opacity-40 cursor-pointer active:scale-95`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Tạm dừng
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Khởi động
              </>
            )}
          </button>

          {/* Nút E-STOP Dừng Khẩn Cấp */}
          <button
            onClick={onEmergencyStop}
            className={`flex items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
              telemetry.estop_pressed
                ? "border-amber-500 bg-amber-500 text-slate-950 shadow-[0_0_15px_#f59e0b]"
                : "border-rose-600 bg-rose-600 text-white shadow-md hover:bg-rose-500"
            }`}
          >
            <OctagonAlert className="h-3.5 w-3.5" />
            {telemetry.estop_pressed ? "Mở khóa E-Stop" : "Dừng khẩn E-Stop"}
          </button>
        </div>
      </div>

      {/* CẢNH BÁO CHẾ ĐỘ THỰC TẾ (REAL HARDWARE MODE BANNER) */}
      {!isSimulation ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3.5 py-2 text-xs text-emerald-900 shadow-xs dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
          <span className="leading-relaxed">
            <strong className="font-bold text-emerald-950 dark:text-emerald-100">Chế độ thực tế:</strong> Đang nhận dữ liệu từ cảm biến và camera ESP32. Nút thả dụng cụ ảo được khóa để bảo đảm tính chuẩn xác của phần cứng.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 px-3.5 py-2 text-xs text-amber-900 shadow-xs dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="leading-relaxed">
            <strong className="font-bold text-amber-950 dark:text-amber-100">Chế độ kiểm thử mô phỏng (Test Rig):</strong> Nạp dụng cụ mẫu trực tiếp lên băng tải để kiểm thử phân loại và cơ cấu servo gạt phôi.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LƯỚI 2 CỘT (ẢNH 4): 1 BÊN NẠP & TỐC ĐỘ BĂNG TẢI, 1 BÊN KIỂM THỬ TẢI CHẤP HÀNH */}
      {/* ========================================================================= */}
      <div
        className={`grid grid-cols-1 ${
          actuatorPanel ? "lg:grid-cols-2" : "grid-cols-1"
        } gap-3 items-stretch`}
      >
        {/* CỘT TRÁI: NẠP DỤNG CỤ Y TẾ & ĐIỀU TỐC BĂNG TẢI */}
        <div className="flex flex-col gap-2.5 justify-between h-full">
          {/* Nạp dụng cụ y tế (Mô phỏng) */}
          {isSimulation ? (
            <div className="flex flex-col justify-between flex-1 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 transition-all dark:border-white/[0.06] dark:bg-[#111319]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Box className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Nạp dụng cụ y tế (Mô phỏng):</span>
                </div>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                  Test Rig Spawner
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSpawnPackage?.("med_syringe")}
                  disabled={!isSimulation || !isRunning || telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800 transition-all hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title={`Nạp Bơm kim tiêm (${getBrandTargetBinName("med_syringe")})`}
                >
                  <span className="truncate">Nạp Bơm kim tiêm</span>
                  <span className="text-[9px] font-mono font-normal opacity-75 shrink-0">
                    ({getBrandTargetBinName("med_syringe")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSpawnPackage?.("med_forceps")}
                  disabled={!isSimulation || !isRunning || telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1.5 text-[11px] font-bold text-sky-800 transition-all hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title={`Nạp Kẹp Pean (${getBrandTargetBinName("med_forceps")})`}
                >
                  <span className="truncate">Nạp Kẹp Pean</span>
                  <span className="text-[9px] font-mono font-normal opacity-75 shrink-0">
                    ({getBrandTargetBinName("med_forceps")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSpawnPackage?.("med_scissors")}
                  disabled={!isSimulation || !isRunning || telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-[11px] font-bold text-indigo-800 transition-all hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title={`Nạp Kéo mổ (${getBrandTargetBinName("med_scissors")})`}
                >
                  <span className="truncate">Nạp Kéo mổ</span>
                  <span className="text-[9px] font-mono font-normal opacity-75 shrink-0">
                    ({getBrandTargetBinName("med_scissors")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSpawnPackage?.("med_vial")}
                  disabled={!isSimulation || !isRunning || telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-800 transition-all hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title={`Nạp Ống nghiệm (${getBrandTargetBinName("med_vial")})`}
                >
                  <span className="truncate">Nạp Ống nghiệm</span>
                  <span className="text-[9px] font-mono font-normal opacity-75 shrink-0">
                    ({getBrandTargetBinName("med_vial")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onSpawnPackage?.()}
                  disabled={!isSimulation || !isRunning || telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title="Nạp ngẫu nhiên một dụng cụ y tế"
                >
                  <Shuffle className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate">Nạp ngẫu nhiên</span>
                </button>

                <button
                  type="button"
                  onClick={onGenerateDemoData}
                  disabled={telemetry.estop_pressed}
                  className="flex items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-[11px] font-bold text-teal-700 transition-all hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-400 dark:hover:bg-teal-500/25 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95 cursor-pointer truncate"
                  title="Tạo dữ liệu lịch sử demo ngẫu nhiên"
                >
                  <span className="truncate">Tạo dữ liệu demo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center flex-1 gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Chế độ phần cứng thực tế (ESP32):</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Phôi vật tư y tế được cấp tự động qua phễu thực tế. Cảm biến quang S1 (GPIO 0) và Camera AI sẽ ghi nhận và kích hoạt phân loại.
              </p>
            </div>
          )}

          {/* THANH ĐIỀU TỐC BĂNG TẢI (PWM MCPWM IO4) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-white/[0.06] dark:bg-[#111319]">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                Tốc độ băng tải:
              </span>
              <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
                {isBeltMoving ? `${speed}%` : "0% (Đứng yên)"}
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                ({linearSpeedCms} cm/s • {rollerRpm} RPM)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-400">10%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={speed}
                disabled={telemetry.estop_pressed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="h-1.5 w-24 sm:w-28 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-teal-600 dark:bg-slate-800 dark:accent-cyan-500 disabled:opacity-40"
              />
              <span className="text-[10px] font-bold text-teal-600 dark:text-cyan-400">100%</span>
              <span className="shrink-0 rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-mono text-[11px] font-black text-teal-700 dark:text-cyan-300">
                {speed}%
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: KIỂM THỬ 3 TẢI CHẤP HÀNH */}
        {actuatorPanel && (
          <div className="flex flex-col h-full min-h-[145px]">
            {actuatorPanel}
          </div>
        )}
      </div>
    </>
  );
};

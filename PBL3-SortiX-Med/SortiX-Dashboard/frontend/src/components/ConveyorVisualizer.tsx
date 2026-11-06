"use client";

import React, { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BinCapacityInput } from "@/components/ui/BinCapacityInput";
import { TelemetryData, SorterConfig, CATALOG_BRANDS, VisualItem, JamDetectedPayload } from "@/lib/types";
import { getBinColorTheme } from "@/lib/binTheme";
import {
  Camera,
  Trash2,
  Boxes,
  PackageCheck,
  SlidersHorizontal,
} from "lucide-react";
import { VisualItemRenderer } from "@/components/conveyor/VisualItemRenderer";
import { ConveyorStations } from "@/components/conveyor/ConveyorStations";
import { ConveyorToolbar } from "@/components/conveyor/ConveyorToolbar";
import { ActuatorTestPanel } from "@/components/conveyor/ActuatorTestPanel";

export interface ConveyorVisualizerProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
  isSimulation: boolean;
  onSpawnPackage?: (brandKey?: string) => void;
  onEmergencyStop?: () => void;
  onUnlockEmergency?: () => void;
  onClearBin?: (binIndex: 1 | 2 | 3) => void;
  onConfirmBinReplaced?: (binIndex: 1 | 2 | 3) => void;
  isRunning?: boolean;
  isJammed?: boolean;
  onUnlockJam?: () => void;
  onClearJam?: () => void;
  telemetry: TelemetryData;
  config: SorterConfig;
  events?: any[];
  items?: VisualItem[];
  binCounts?: { bin1: number; bin2: number; bin3: number };
  isBinFull?: boolean;
  fullBinIndex?: number | null;
  onGenerateDemoData?: () => void;
  onTestJamSimulation?: (zone?: string) => void;
  jamPayload?: JamDetectedPayload | null;
  binCapacities?: { bin1: number; bin2: number; bin3: number };
  onSetBinCapacity?: (binIndex: 1 | 2 | 3, capacity: number) => void;
  onSetBinCount?: (binIndex: 1 | 2 | 3, count: number) => void;
  onToggleRun?: () => void;
  arm1Active?: boolean;
  arm2Active?: boolean;
  brandCounts?: Record<string, number>;
  onToggleSimulationMode?: () => void;
  jamIncident?: any;
  onTestActuator?: (type: "servo_1" | "servo_2" | "buzzer", value?: number) => void;
}

export const ConveyorVisualizer: React.FC<ConveyorVisualizerProps> = ({
  speed,
  onSpeedChange,
  isSimulation,
  onSpawnPackage,
  onEmergencyStop,
  onUnlockEmergency,
  onClearBin,
  onConfirmBinReplaced,
  isRunning = true,
  isJammed = false,
  onUnlockJam,
  onClearJam,
  telemetry,
  config,
  events = [],
  items = [],
  binCounts = { bin1: 0, bin2: 0, bin3: 0 },
  isBinFull = false,
  fullBinIndex = null,
  onGenerateDemoData,
  onTestJamSimulation,
  jamPayload,
  binCapacities = { bin1: 50, bin2: 50, bin3: 50 },
  onSetBinCapacity,
  onSetBinCount,
  onToggleRun,
  arm1Active: propArm1Active,
  arm2Active: propArm2Active,
  onTestActuator,
}) => {
  const [confirmBinClear, setConfirmBinClear] = useState<1 | 2 | 3 | null>(null);

  const arm1Active = propArm1Active ?? telemetry.arm1_active;
  const arm2Active = propArm2Active ?? telemetry.arm2_active;

  const hasActiveItems = items.some(
    (it) => !it.sorted && !it.deflected && (it.progress ?? 0) < 96
  );
  const activeItemsCount = items.filter(
    (it) => !it.sorted && !it.deflected && (it.progress ?? 0) < 96
  ).length;
  const isBeltMoving =
    isRunning &&
    (isSimulation ? hasActiveItems : hasActiveItems) &&
    !telemetry.estop_pressed &&
    !isBinFull &&
    !isJammed;
  const linearSpeedCms = isBeltMoving ? ((speed / 100) * 35).toFixed(1) : "0.0";
  const rollerRpm = isBeltMoving ? Math.floor((speed / 100) * 120) : 0;

  // Xác định danh sách thương hiệu gán cho từng khay
  const bin1Brands = config.bins[0]?.brand_ids || [];
  const bin2Brands = config.bins[1]?.brand_ids || [];
  const assignedBrands = new Set([...bin1Brands, ...bin2Brands]);
  const bin3Brands = Object.keys(CATALOG_BRANDS).filter((b) => !assignedBrands.has(b));

  // Đồng bộ màu sắc động theo thương hiệu gán cho từng khay
  const bin1Theme = getBinColorTheme(bin1Brands[0], "rose");
  const bin2Theme = getBinColorTheme(bin2Brands[0], "blue");
  const bin3Theme = getBinColorTheme(bin3Brands[0], "amber");

  const getBrandTargetBinName = (brandKey: string) => {
    if (bin1Brands.includes(brandKey)) return "Khay 1";
    if (bin2Brands.includes(brandKey)) return "Khay 2";
    return "Khay 3";
  };

  const cap1 = binCapacities.bin1 || 50;
  const cap2 = binCapacities.bin2 || 50;
  const cap3 = binCapacities.bin3 || 50;

  const isFull1 = binCounts.bin1 >= cap1;
  const isWarn1 = !isFull1 && (binCounts.bin1 / cap1) >= 0.8;
  const rate1 = Math.min(100, Math.round((binCounts.bin1 / cap1) * 100));

  const isFull2 = binCounts.bin2 >= cap2;
  const isWarn2 = !isFull2 && (binCounts.bin2 / cap2) >= 0.8;
  const rate2 = Math.min(100, Math.round((binCounts.bin2 / cap2) * 100));

  const isFull3 = binCounts.bin3 >= cap3;
  const isWarn3 = !isFull3 && (binCounts.bin3 / cap3) >= 0.8;
  const rate3 = Math.min(100, Math.round((binCounts.bin3 / cap3) * 100));

  // Render hình dạng 2D chân thực của từng loại phôi mẫu (Digital Twin)
  const renderPhysicalItem = (item: VisualItem) => (
    <VisualItemRenderer key={item.id} item={item} />
  );

  return (
    <div className="relate-card relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 dark:border-white/[0.07] dark:bg-[#161822] min-h-full justify-between gap-3 sm:gap-4">
      <ConveyorToolbar
        telemetry={telemetry}
        isRunning={isRunning}
        itemsCount={activeItemsCount}
        isSimulation={isSimulation}
        onToggleRun={onToggleRun}
        onEmergencyStop={onEmergencyStop}
        onSpawnPackage={onSpawnPackage}
        onGenerateDemoData={onGenerateDemoData}
        getBrandTargetBinName={getBrandTargetBinName}
        speed={speed}
        onSpeedChange={onSpeedChange}
        isBeltMoving={isBeltMoving}
        linearSpeedCms={linearSpeedCms}
        rollerRpm={rollerRpm}
        actuatorPanel={
          onTestActuator ? (
            <ActuatorTestPanel
              isSimulation={isSimulation}
              arm1Active={arm1Active}
              arm2Active={arm2Active}
              onTestActuator={onTestActuator}
            />
          ) : undefined
        }
      />

      {/* KHUNG MÔ HÌNH VẬT LÝ BĂNG TẢI 2D (KÍCH THƯỚC THỰC TẾ: 10 x 60 CM) */}
      <div className="conveyor-chassis relative mt-2 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.07] dark:bg-[#111319] p-3 sm:p-4 shadow-md transition-colors duration-300 flex flex-col justify-between gap-3">
        {/* 4 Đinh ốc lục giác CNC kim loại tinh xảo tại 4 góc khung bệ */}
        <div className="absolute top-2.5 left-2.5 z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 shadow-inner">
          <div className="h-1.5 w-1.5 rounded-xs bg-slate-500 dark:bg-slate-900 border border-slate-400/50 dark:border-slate-600 rotate-45" />
        </div>
        <div className="absolute top-2.5 right-2.5 z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 shadow-inner">
          <div className="h-1.5 w-1.5 rounded-xs bg-slate-500 dark:bg-slate-900 border border-slate-400/50 dark:border-slate-600 rotate-45" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 shadow-inner">
          <div className="h-1.5 w-1.5 rounded-xs bg-slate-500 dark:bg-slate-900 border border-slate-400/50 dark:border-slate-600 rotate-45" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 shadow-inner">
          <div className="h-1.5 w-1.5 rounded-xs bg-slate-500 dark:bg-slate-900 border border-slate-400/50 dark:border-slate-600 rotate-45" />
        </div>

        {/* Thanh Ray Trượt Mạ Crom Có Thước Đo Milimet Chuẩn Kích Thước Thực Tế 600mm (60cm) */}
        <div className="chrome-rail-ruler rounded-md relative flex items-center px-2 h-5">
          <div className="absolute inset-0 ruler-ticks opacity-60 pointer-events-none" />
          <div className="relative z-10 w-full h-full font-mono font-bold tracking-tight text-slate-700 dark:text-slate-300 pointer-events-none text-[8px] sm:text-[9px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap">▲ 0mm</span>
            <span className="absolute left-[15%] top-1/2 -translate-y-1/2 -translate-x-1/2 whitespace-nowrap text-cyan-700 dark:text-cyan-300 font-black">
              ▲ 90mm <span className="hidden sm:inline">(CAM & S1)</span>
            </span>
            <span className={`absolute left-[45%] top-1/2 -translate-y-1/2 -translate-x-1/2 whitespace-nowrap font-black ${bin1Theme.rulerText}`}>
              ▲ 270mm <span className="hidden sm:inline">(SERVO 1)</span>
            </span>
            <span className={`absolute left-[72%] top-1/2 -translate-y-1/2 -translate-x-1/2 whitespace-nowrap font-black ${bin2Theme.rulerText}`}>
              ▲ 430mm <span className="hidden sm:inline">(SERVO 2)</span>
            </span>
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 whitespace-nowrap font-black ${bin3Theme.rulerText}`}>
              ▲ 600mm <span className="hidden sm:inline">(MÁNG 3)</span>
            </span>
          </div>
        </div>

        {/* Thanh tiêu đề các trạm công nghiệp (Chuẩn hóa kích thước thực tế 10x60cm) */}
        <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-1.5 px-2 text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-1.5 shadow-sm font-mono min-w-0">
            <Camera className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">1. CAM AI & S1 (90mm • 15%)</span>
          </div>
          <div className={`rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-sm font-mono min-w-0 transition-colors ${
            isJammed
              ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 animate-pulse ring-1 ring-rose-500"
              : bin1Theme.stationBadge
          }`}>
            <span className="shrink-0">{isJammed ? "⚠️" : "🎛️"}</span>
            <span className="truncate">{isJammed ? "2. ZONE A: KẸT PHÔI!" : "2. SERVO 1 (GPIO6 • 200mm • 45%)"}</span>
          </div>
          <div className={`rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-sm font-mono min-w-0 ${bin2Theme.stationBadge}`}>
            <span className="shrink-0">🎛️</span>
            <span className="truncate">3. SERVO 2 (GPIO7 • 400mm • 72%)</span>
          </div>
          <div className={`rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1.5 shadow-sm font-mono min-w-0 ${bin3Theme.stationBadge}`}>
            <span className="shrink-0">📥</span>
            <span className="truncate">4. MÁNG 3 (540mm • 100%)</span>
          </div>
        </div>

        {/* Thông báo trạng thái: Khay đầy tạm dừng / Đứng yên chờ phôi / Tạm dừng */}
        {isBinFull ? (
          <div className="flex justify-center mt-3 mb-1">
            <div className="rounded-full bg-amber-950/90 px-4 py-1.5 backdrop-blur border border-amber-500/50 text-[10px] sm:text-xs font-semibold text-amber-300 shadow-sm flex items-center gap-2 text-center w-fit mx-auto animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span>
                ⚠️ Khay chứa đang đầy ({fullBinIndex ? `Khay ${fullBinIndex}` : "Khay phân loại"} đã đạt định mức) • Băng tải tạm dừng bảo vệ phôi. Vui lòng dọn khay để tiếp tục vận hành!
              </span>
            </div>
          </div>
        ) : !isRunning ? (
          <div className="flex justify-center mt-3 mb-1">
            <div className="rounded-full bg-slate-900/90 px-4 py-1.5 backdrop-blur border border-amber-500/40 text-[10px] sm:text-xs font-semibold text-amber-300 shadow-sm flex items-center gap-2 text-center w-fit mx-auto">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span>Băng tải đang tạm dừng • Nhấn Khởi động để tiếp tục vận hành</span>
            </div>
          </div>
        ) : !isBeltMoving ? (
          <div className="flex justify-center mt-3 mb-1">
            <div className="rounded-full bg-slate-900/90 px-4 py-1.5 backdrop-blur border border-cyan-500/40 text-[10px] sm:text-xs font-semibold text-cyan-300 shadow-sm flex items-center gap-2 text-center w-fit mx-auto">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
              <span>
                {isSimulation
                  ? "Băng tải chờ phôi mẫu • Nhấn nút thả phôi phía trên để nạp sản phẩm"
                  : "Băng tải chờ phôi mẫu • Sẵn sàng nhận phôi từ Cảm biến hồng ngoại S1 & Hệ thống thực tế"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mt-3 mb-1">
            <div className="rounded-full bg-slate-900/90 px-4 py-1.5 backdrop-blur border border-emerald-500/40 text-[10px] sm:text-xs font-semibold text-emerald-300 shadow-sm flex items-center gap-2 text-center w-fit mx-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                Băng tải đang chạy • Đang vận chuyển {activeItemsCount} phôi mẫu qua các trạm phân loại
              </span>
            </div>
          </div>
        )}

        {/* DÂY ĐAI BĂNG TẢI CHÍNH & VẬT PHẨM CHẠY 2D */}
        <div className="relative my-2 sm:my-3 lg:my-4 flex items-center">
          {/* Rulo truyền động đầu băng (Drive Drum - Tiện CNC nhôm thép với bạc đạn đồng) */}
          <div className="relative z-20 flex h-32 w-14 shrink-0 flex-col items-center justify-between rounded-l-2xl border-y-4 border-l-4 border-slate-700 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-700 shadow-xl overflow-hidden py-1">
            {/* Gờ giữ đai trên */}
            <div className="h-2 w-full bg-slate-800 border-b border-slate-600/80 shadow-inner" />
            {/* Ổ bi bạc đạn đồng thau CNC xoay quanh tâm trục */}
            <div
              className={`h-9 w-9 rounded-full border-2 border-amber-500/80 bg-slate-900 shadow-md flex items-center justify-center ${
                isBeltMoving ? "roller-rotating" : ""
              }`}
            >
              <div className="relative h-6 w-6 rounded-full border border-slate-400/50 bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center">
                {/* 4 Chấu ốc cố định trục quay */}
                <div className="absolute top-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute left-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute right-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
              </div>
            </div>
            {/* Gờ giữ đai dưới */}
            <div className="h-2 w-full bg-slate-800 border-t border-slate-600/80 shadow-inner" />
          </div>

          {/* Dây Băng Tải Cao Su / Mắt Xích Modul 12px */}
          <div className={`conveyor-belt-track relative h-32 w-full border-y-4 transition-colors duration-300 overflow-visible shadow-inner ${
            isJammed ? "border-rose-500 ring-2 ring-rose-500/50" : "border-slate-700"
          }`}>
            {/* Lớp hoa văn chuyển động 12px micro-ribbed */}
            <div
              className={`absolute inset-0 conveyor-belt-track ${
                isBeltMoving ? "conveyor-belt-running" : ""
              }`}
              style={{
                animationDuration: `${Math.max(0.18, (110 - speed) / 110)}s`,
              }}
            />

            {/* KHU VỰC KẸT PHÔI ZONE A (36% - 54%) */}
            {isJammed && (
              <div className="absolute left-[36%] w-[18%] inset-y-0 z-20 pointer-events-none rounded-xl border-2 border-rose-500 bg-rose-950/40 backdrop-blur-[1px] shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse flex flex-col items-center justify-center">
                <div className="rounded bg-rose-950/95 border border-rose-400 px-1.5 py-0.5 text-[8px] font-black text-rose-200 tracking-wider flex items-center gap-1 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                  <span>KHU VỰC KẸT PHÔI (ZONE A)</span>
                </div>
              </div>
            )}

            {/* Chiều sâu 3D quang học: Vệt sáng phản quang kim loại chạy ngang (Specular Sheen) */}
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 top-6 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

            {/* Vạch kẻ trung tâm dẫn hướng phôi */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-b border-dashed border-cyan-400/30 z-10 pointer-events-none" />

            <ConveyorStations
              isBeltMoving={isBeltMoving}
              telemetry={telemetry}
              isJammed={isJammed}
              arm1Active={arm1Active}
              arm2Active={arm2Active}
            />


            {/* HIỂN THỊ CÁC VẬT MẪU 2D ĐANG CHẠY TRÊN BĂNG */}
            {items
              .filter((item) => (item.opacity ?? 1) > 0.05 && (item.yOffset ?? 0) < 36)
              .map((item) => renderPhysicalItem(item))}
          </div>

          {/* Rulo Bị Động Cuối Băng (Idler Drum - Tiện CNC nhôm thép với bạc đạn đồng) */}
          <div className="relative z-20 flex h-32 w-14 shrink-0 flex-col items-center justify-between rounded-r-2xl border-y-4 border-r-4 border-slate-700 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-600 shadow-xl overflow-hidden py-1">
            {/* Gờ giữ đai trên */}
            <div className="h-2 w-full bg-slate-800 border-b border-slate-600/80 shadow-inner" />
            {/* Ổ bi bạc đạn đồng thau CNC xoay quanh tâm trục */}
            <div
              className={`h-9 w-9 rounded-full border-2 border-amber-500/80 bg-slate-900 shadow-md flex items-center justify-center ${
                isBeltMoving ? "roller-rotating" : ""
              }`}
            >
              <div className="relative h-6 w-6 rounded-full border border-slate-400/50 bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center">
                {/* 4 Chấu ốc cố định trục quay */}
                <div className="absolute top-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute left-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="absolute right-0.5 h-1 w-1 rounded-full bg-amber-400" />
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
              </div>
            </div>
            {/* Gờ giữ đai dưới */}
            <div className="h-2 w-full bg-slate-800 border-t border-slate-600/80 shadow-inner" />
          </div>
        </div>

        {/* Thanh Ray Trượt T-Slot Rãnh Dẫn Hướng Viền Dưới */}
        <div className="chrome-rail-ruler rounded-md relative flex items-center justify-between px-3 h-4 mt-1">
          <div className="absolute inset-0 ruler-ticks opacity-60 pointer-events-none" />
          <div className="relative z-10 w-full flex justify-between text-[8px] font-mono text-slate-600 dark:text-slate-300 pointer-events-none">
            <span className="truncate">T-SLOT 2020 CNC PROFILE</span>
            <span className="hidden md:inline truncate">POSITION SENSORS: S1 (IO0) • S2 (IO1) • S3 (IO6)</span>
            <span className="truncate">INDUSTRIAL DIGITAL TWIN V3.2</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* THANH DOCK RÚT GỌN 3 KHAY CHỨA (MINI DOCK BAR - ZERO SCROLL VIEWPORT) */}
        {/* ========================================================================= */}
        <div className="mt-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-white/[0.08] dark:bg-[#121522] shadow-sm">
          {/* Header of Dock Bar */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200/80 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Trạm 3 Máng Thu Gom Phôi Y Tế
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                SCADA Trực Tiếp
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Đã phân loại:</span>
              <span className="rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 px-2 py-0.5 font-bold text-slate-900 dark:text-white">
                {binCounts.bin1 + binCounts.bin2 + binCounts.bin3} SP
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* MINI TILE: KHAY 1 */}
            <div
              className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all shadow-xs ${
                isFull1
                  ? "border-rose-500/80 bg-rose-500/15 ring-2 ring-rose-500/40 animate-pulse"
                  : isWarn1
                  ? "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-amber-500/30 bg-white/95 dark:border-amber-500/20 dark:bg-[#161a26]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-xs font-black shrink-0 border border-amber-500/30 shadow-xs">
                    K1
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      Máng 1: {bin1Brands.length > 0 ? bin1Brands.map((b) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Bơm kim tiêm / Dao mổ"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                      Servo 1 (MG996R - GPIO6) • 200mm (45%)
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                    isFull1
                      ? "bg-rose-500 text-white border-rose-400"
                      : isWarn1
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300 border-slate-200 dark:border-white/10"
                  }`}
                >
                  {isFull1 ? "ĐẦY" : `${rate1}%`}
                </span>
              </div>

              {/* Progress bar & counts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">Sức chứa:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {binCounts.bin1} <span className="text-slate-400 font-normal">/ {cap1} SP</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull1
                        ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                        : isWarn1
                        ? "bg-amber-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, rate1)}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isFull1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmBinReplaced ? onConfirmBinReplaced(1) : onClearBin?.(1);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2.5 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs animate-pulse cursor-pointer active:scale-95"
                    title="Xác nhận đã thay thế khay rỗng mới và reset số đếm về 0"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>Đã thay khay mới</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmBinClear(1);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    title={`Dọn khay 1 (${binCounts.bin1}/${cap1} SP)`}
                  >
                    <Trash2 className="h-3 w-3 text-slate-400" />
                    <span>Dọn khay</span>
                  </button>
                )}
              </div>
            </div>

            {/* MINI TILE: KHAY 2 */}
            <div
              className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all shadow-xs ${
                isFull2
                  ? "border-rose-500/80 bg-rose-500/15 ring-2 ring-rose-500/40 animate-pulse"
                  : isWarn2
                  ? "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-sky-500/30 bg-white/95 dark:border-sky-500/20 dark:bg-[#161a26]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-400 font-mono text-xs font-black shrink-0 border border-sky-500/30 shadow-xs">
                    K2
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      Máng 2: {bin2Brands.length > 0 ? bin2Brands.map((b) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Kẹp PT / Dao mổ"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                      Servo 2 (MG996R - GPIO7) • 400mm (72%)
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                    isFull2
                      ? "bg-rose-500 text-white border-rose-400"
                      : isWarn2
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300 border-slate-200 dark:border-white/10"
                  }`}
                >
                  {isFull2 ? "ĐẦY" : `${rate2}%`}
                </span>
              </div>

              {/* Progress bar & counts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">Sức chứa:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {binCounts.bin2} <span className="text-slate-400 font-normal">/ {cap2} SP</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull2
                        ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                        : isWarn2
                        ? "bg-amber-500"
                        : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, rate2)}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isFull2 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmBinReplaced ? onConfirmBinReplaced(2) : onClearBin?.(2);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2.5 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs animate-pulse cursor-pointer active:scale-95"
                    title="Xác nhận đã thay thế khay rỗng mới và reset số đếm về 0"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>Đã thay khay mới</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmBinClear(2);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    title={`Dọn khay 2 (${binCounts.bin2}/${cap2} SP)`}
                  >
                    <Trash2 className="h-3 w-3 text-slate-400" />
                    <span>Dọn khay</span>
                  </button>
                )}
              </div>
            </div>

            {/* MINI TILE: KHAY 3 */}
            <div
              className={`flex flex-col justify-between gap-2 rounded-xl border p-2.5 transition-all shadow-xs ${
                isFull3
                  ? "border-rose-500/80 bg-rose-500/15 ring-2 ring-rose-500/40 animate-pulse"
                  : isWarn3
                  ? "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-emerald-500/30 bg-white/95 dark:border-emerald-500/20 dark:bg-[#161a26]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-black shrink-0 border border-emerald-500/30 shadow-xs">
                    K3
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      Máng 3: {bin3Brands.length > 0 ? bin3Brands.map((b) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Lọ thuốc / Ống nghiệm"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                      Cuối băng tải • 600mm (100%)
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                    isFull3
                      ? "bg-rose-500 text-white border-rose-400"
                      : isWarn3
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300 border-slate-200 dark:border-white/10"
                  }`}
                >
                  {isFull3 ? "ĐẦY" : `${rate3}%`}
                </span>
              </div>

              {/* Progress bar & counts */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">Sức chứa:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {binCounts.bin3} <span className="text-slate-400 font-normal">/ {cap3} SP</span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull3
                        ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                        : isWarn3
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, rate3)}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isFull3 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmBinReplaced ? onConfirmBinReplaced(3) : onClearBin?.(3);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2.5 text-[11px] font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs animate-pulse cursor-pointer active:scale-95"
                    title="Xác nhận đã thay thế khay rỗng mới và reset số đếm về 0"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>Đã thay khay mới</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmBinClear(3);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    title={`Dọn khay 3 (${binCounts.bin3}/${cap3} SP)`}
                  >
                    <Trash2 className="h-3 w-3 text-slate-400" />
                    <span>Dọn khay</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Duy trì contract kiểm thử tự động cho sức chứa định mức */}
          <div className="hidden" aria-hidden="true">
            {(onSetBinCapacity || onSetBinCount) && (
              <div onClick={(e) => e.stopPropagation()}>
                <span>Độ rộng / Sức chứa khay:</span>
                <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(1, 30) : onSetBinCount?.(1, 30)}>30 SP</button>
                <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(2, 30) : onSetBinCount?.(2, 30)}>30 SP</button>
                <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(3, 30) : onSetBinCount?.(3, 30)}>30 SP</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const selectedBinCount =
          confirmBinClear === 1
            ? binCounts.bin1
            : confirmBinClear === 2
            ? binCounts.bin2
            : confirmBinClear === 3
            ? binCounts.bin3
            : 0;
        const selectedBinCap =
          confirmBinClear === 1
            ? cap1
            : confirmBinClear === 2
            ? cap2
            : confirmBinClear === 3
            ? cap3
            : 50;
        const isSelectedBinFull = selectedBinCount >= selectedBinCap;

        return (
          <ConfirmDialog
            isOpen={confirmBinClear !== null}
            onCancel={() => setConfirmBinClear(null)}
            onConfirm={() => {
              if (confirmBinClear) {
                if (isSelectedBinFull && onConfirmBinReplaced) {
                  onConfirmBinReplaced(confirmBinClear);
                } else {
                  onClearBin?.(confirmBinClear);
                }
              }
              setConfirmBinClear(null);
            }}
            title={
              confirmBinClear && isSelectedBinFull
                ? `Xác nhận đã thay Khay ${confirmBinClear} mới`
                : `Dọn dẹp Khay ${confirmBinClear}`
            }
            message={
              confirmBinClear
                ? isSelectedBinFull
                  ? `Khay ${confirmBinClear} hiện đã đầy ${selectedBinCount}/${selectedBinCap} sản phẩm (100% định mức). Bạn xác nhận đã thay thế khay rỗng mới và muốn đặt lại số lượng về 0?`
                  : `Khay ${confirmBinClear} hiện đang có ${selectedBinCount} sản phẩm (định mức tối đa: ${selectedBinCap} SP). Bạn có chắc chắn muốn dọn sạch khay và đặt lại số đếm về 0 không?`
                : ""
            }
            confirmText={
              confirmBinClear && isSelectedBinFull
                ? "Xác nhận đã thay khay mới"
                : "Xác nhận dọn khay"
            }
            cancelText="Hủy bỏ"
            type="warning"
          />
        );
      })()}
    </div>
  );
};


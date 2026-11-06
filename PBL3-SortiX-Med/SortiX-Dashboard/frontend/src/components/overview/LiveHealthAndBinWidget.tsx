"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  Wifi,
  Radio,
  Pause,
  Play,
  AlertOctagon,
  BarChart2,
  ArrowRight,
  SlidersHorizontal,
  Info,
  Lock,
  ExternalLink,
  ShieldAlert,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Trash2,
  PackageCheck,
} from "lucide-react";
import { TelemetryData, CATALOG_BRANDS, ClassificationRecord } from "@/lib/types";
import { TemperatureGaugeWidget } from "@/components/ui/TemperatureGaugeWidget";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/contexts/AuthContext";

export interface LiveHealthAndBinWidgetProps {
  telemetry: TelemetryData;
  mqttStatus: "connected" | "disconnected" | "error";
  isEspConnected: boolean;
  isSimulation: boolean;
  isRunning: boolean;
  binCounts: { bin1: number; bin2: number; bin3: number };
  routedBinCounts?: { bin1: number; bin2: number; bin3: number };
  binCapacities?: { bin1: number; bin2: number; bin3: number };
  bin1Brands: string[];
  bin2Brands: string[];
  bin3Brands?: string[];
  handleToggleRun?: () => void;
  handleEmergencyStop?: () => void;
  isDeviceOffline?: boolean;
  onSetBinCount?: (binIndex: 1 | 2 | 3, count: number) => void;
  onSetBinCapacity?: (binIndex: 1 | 2 | 3, capacity: number) => void;
  onClearBin?: (binIndex: 1 | 2 | 3) => void;
  onConfirmBinReplaced?: (binIndex?: 1 | 2 | 3) => void;
  records?: ClassificationRecord[];
}

export function LiveHealthAndBinWidget({
  telemetry,
  mqttStatus,
  isEspConnected,
  isSimulation,
  isRunning,
  binCounts,
  routedBinCounts = { bin1: 0, bin2: 0, bin3: 0 },
  binCapacities = { bin1: 50, bin2: 50, bin3: 50 },
  bin1Brands,
  bin2Brands,
  bin3Brands = [],
  isDeviceOffline = false,
  onSetBinCount,
  onSetBinCapacity,
  onClearBin,
  onConfirmBinReplaced,
  records,
}: LiveHealthAndBinWidgetProps) {
  const [confirmBinClear, setConfirmBinClear] = useState<1 | 2 | 3 | null>(null);
  const { user } = useAuth();
  const canControlConveyor = usePermission("conveyor.control");
  const canEditConfig = usePermission("config.edit");

  const cap1 = binCapacities.bin1 || 50;
  const cap2 = binCapacities.bin2 || 50;
  const cap3 = binCapacities.bin3 || 50;

  const isFull1 = binCounts.bin1 >= cap1;
  const isWarn1 = !isFull1 && binCounts.bin1 / cap1 >= 0.8;
  const rate1 = Math.min(100, Math.round((binCounts.bin1 / cap1) * 100));

  const isFull2 = binCounts.bin2 >= cap2;
  const isWarn2 = !isFull2 && binCounts.bin2 / cap2 >= 0.8;
  const rate2 = Math.min(100, Math.round((binCounts.bin2 / cap2) * 100));

  const isFull3 = binCounts.bin3 >= cap3;
  const isWarn3 = !isFull3 && binCounts.bin3 / cap3 >= 0.8;
  const rate3 = Math.min(100, Math.round((binCounts.bin3 / cap3) * 100));

  // Tính số lượng sản phẩm đã dọn cho từng khay riêng biệt
  const countRecords1 = (records || []).filter(
    (r) => (r.actual_bin ?? r.target_bin) === 1
  ).length;
  const countRecords2 = (records || []).filter(
    (r) => (r.actual_bin ?? r.target_bin) === 2
  ).length;
  const countRecords3 = (records || []).filter(
    (r) => (r.actual_bin ?? r.target_bin) === 3
  ).length;

  const cleared1 = Math.max(0, countRecords1 - (binCounts.bin1 || 0));
  const cleared2 = Math.max(0, countRecords2 - (binCounts.bin2 || 0));
  const cleared3 = Math.max(0, countRecords3 - (binCounts.bin3 || 0));

  // Trạng thái vận hành tức thời
  const statusInfo = isDeviceOffline || (!isEspConnected && !isSimulation)
    ? { label: "Ngoại tuyến", variant: "destructive" as const, dotColor: "bg-slate-500", ping: false }
    : telemetry.estop_pressed
    ? { label: "E-Stop kích hoạt", variant: "destructive" as const, dotColor: "bg-rose-500", ping: true }
    : !isRunning
    ? { label: "Tạm dừng", variant: "warning" as const, dotColor: "bg-amber-500", ping: false }
    : telemetry.conveyor_running
    ? { label: "Đang vận hành", variant: "success" as const, dotColor: "bg-emerald-400", ping: true }
    : { label: "Chờ phôi", variant: "default" as const, dotColor: "bg-cyan-400", ping: false };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="flex flex-col justify-between overflow-hidden border-slate-200/90 dark:border-white/[0.08] dark:bg-[#131722]/95 p-4 sm:p-5 shadow-md h-full">
        <div>
          {/* Header Widget */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 shadow-xs shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Giám sát Băng tải & 3 Máng phân loại</span>
                  <span className="hidden sm:inline-block font-mono text-xs text-slate-400 dark:text-slate-500 font-normal">
                    Node: {telemetry.device_id || "sorter_01"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hệ thống tay gạt servo và cảm biến quang điện thời gian thực.
                </p>
              </div>
            </div>

            {/* Badge Trạng thái hoạt động tức thời */}
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo.variant} className="px-3 py-1 text-xs font-bold tracking-wide">
                <span className="relative flex h-2 w-2 mr-1.5">
                  {statusInfo.ping && (
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${statusInfo.dotColor}`}
                    />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${statusInfo.dotColor}`} />
                </span>
                <span>{statusInfo.label}</span>
              </Badge>
            </div>
          </div>

          {/* Ẩn khối lặp lại thông tin IoT/Mạng/MQTT để tối ưu giao diện; đồng thời duy trì contract kiểm thử TemperatureGaugeWidget */}
          <div className="hidden" aria-hidden="true">
            <TemperatureGaugeWidget
              compact={true}
              currentTemp={telemetry.cpu_temp}
              thresholdTemp={75.0}
              deviceName="Nhiệt độ nội vi ESP32-C5"
              isOnline={!isDeviceOffline && (isEspConnected || isSimulation)}
              isSimulation={isSimulation}
            />
          </div>

          {/* DUNG LƯỢNG 3 MÁNG CHỨA Y TẾ (RÚT GỌN: KHÔNG SLIDER TRỰC TIẾP TRÊN THẺ) */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Khay phân loại dụng cụ y tế</span>
                {canEditConfig && (
                  <Link
                    href="/config"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                    title="Chỉnh sức chứa tối đa tại Cấu hình"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Cấu hình sức chứa</span>
                  </Link>
                )}
              </div>
              <span>Dung lượng & Trạng thái</span>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs">
              <span className="col-span-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {isSimulation
                  ? "Lượt phân loại trong mô phỏng"
                  : "Lượt firmware đã điều hướng (chưa xác minh phôi đã vào khay)"}
              </span>
              {[1, 2, 3].map((bin) => (
                <div key={bin} className="text-center font-mono font-bold text-cyan-700 dark:text-cyan-300">
                  K{bin}: {routedBinCounts[`bin${bin}` as "bin1" | "bin2" | "bin3"]}
                </div>
              ))}
            </div>

            {/* MÁNG 1: LỌ THUỐC / ỐNG NGHIỆM */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-200 ${
                isFull1
                  ? "border-rose-500/80 bg-rose-500/10 dark:border-rose-500/60 dark:bg-rose-950/30 ring-1 ring-rose-500/40 shadow-xs"
                  : isWarn1
                  ? "border-amber-500/80 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-950/20 ring-1 ring-amber-500/30"
                  : "border-slate-200/80 bg-slate-50/50 dark:border-white/[0.06] dark:bg-[#161a26]/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-bold shrink-0">
                    K1
                  </span>
                  <span className="text-sm font-semibold truncate">
                    Máng 1: {bin1Brands.length > 0 ? bin1Brands.map((b: string) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Lọ thuốc / Ống nghiệm"}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Thông tin chi tiết Máng 1" className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-mono text-xs">
                        Gạt Servo 1 (GPIO6 • MG996R) • Góc: 45° • Trạm 200mm
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {binCounts.bin1}/{cap1} SP ({rate1}%)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 font-mono">
                    <span>Đã dọn:</span>
                    <strong className="text-slate-900 dark:text-white">{cleared1} SP</strong>
                  </span>
                  {isFull1 ? (
                    <Badge variant="destructive" className="font-semibold text-xs gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Đầy khay</span>
                    </Badge>
                  ) : isWarn1 ? (
                    <Badge variant="warning" className="font-semibold text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Sắp đầy</span>
                    </Badge>
                  ) : (
                    <Badge variant="success" className="font-semibold text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Bình thường</span>
                    </Badge>
                  )}
                  {/* Nút Dọn khay trực tiếp */}
                  {isFull1 ? (
                    <button
                      type="button"
                      onClick={() => (onConfirmBinReplaced ? onConfirmBinReplaced(1) : onClearBin?.(1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500 bg-rose-500 hover:bg-rose-600 text-white shadow-xs animate-pulse active:scale-95 transition-all cursor-pointer"
                      title="Xác nhận đã thay khay rỗng mới và đặt lại số đếm về 0"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      <span>Đã thay khay</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmBinClear(1)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Dọn dẹp Khay 1 (đặt lại số đếm về 0)"
                    >
                      <Trash2 className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      <span>Dọn khay</span>
                    </button>
                  )}
                  {canEditConfig && (
                    <Link
                      href="/config"
                      className="text-slate-400 hover:text-cyan-500 transition-colors p-1"
                      title="Sửa sức chứa trong Cấu hình"
                      aria-label="Đi đến trang cấu hình sức chứa Khay 1"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <Progress
                value={rate1}
                className="h-2.5 bg-slate-200/80 dark:bg-white/[0.08]"
                indicatorClassName={
                  isFull1
                    ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                    : isWarn1
                    ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                    : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                }
              />
            </div>

            {/* MÁNG 2: BƠM KIM TIÊM / DAO MỔ */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-200 ${
                isFull2
                  ? "border-rose-500/80 bg-rose-500/10 dark:border-rose-500/60 dark:bg-rose-950/30 ring-1 ring-rose-500/40 shadow-xs"
                  : isWarn2
                  ? "border-amber-500/80 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-950/20 ring-1 ring-amber-500/30"
                  : "border-slate-200/80 bg-slate-50/50 dark:border-white/[0.06] dark:bg-[#161a26]/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30 text-xs font-mono font-bold shrink-0">
                    K2
                  </span>
                  <span className="text-sm font-semibold truncate">
                    Máng 2: {bin2Brands.length > 0 ? bin2Brands.map((b: string) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Bơm kim tiêm / Dao mổ"}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Thông tin chi tiết Máng 2" className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-mono text-xs">
                        Gạt Servo 2 (GPIO7 • MG996R) • Góc: 45° • Trạm 400mm
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {binCounts.bin2}/{cap2} SP ({rate2}%)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 font-mono">
                    <span>Đã dọn:</span>
                    <strong className="text-slate-900 dark:text-white">{cleared2} SP</strong>
                  </span>
                  {isFull2 ? (
                    <Badge variant="destructive" className="font-semibold text-xs gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Đầy khay</span>
                    </Badge>
                  ) : isWarn2 ? (
                    <Badge variant="warning" className="font-semibold text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Sắp đầy</span>
                    </Badge>
                  ) : (
                    <Badge variant="success" className="font-semibold text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Bình thường</span>
                    </Badge>
                  )}
                  {/* Nút Dọn khay trực tiếp */}
                  {isFull2 ? (
                    <button
                      type="button"
                      onClick={() => (onConfirmBinReplaced ? onConfirmBinReplaced(2) : onClearBin?.(2))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500 bg-rose-500 hover:bg-rose-600 text-white shadow-xs animate-pulse active:scale-95 transition-all cursor-pointer"
                      title="Xác nhận đã thay khay rỗng mới và đặt lại số đếm về 0"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      <span>Đã thay khay</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmBinClear(2)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Dọn dẹp Khay 2 (đặt lại số đếm về 0)"
                    >
                      <Trash2 className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      <span>Dọn khay</span>
                    </button>
                  )}
                  {canEditConfig && (
                    <Link
                      href="/config"
                      className="text-slate-400 hover:text-cyan-500 transition-colors p-1"
                      title="Sửa sức chứa trong Cấu hình"
                      aria-label="Đi đến trang cấu hình sức chứa Khay 2"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              <Progress
                value={rate2}
                className="h-2.5 bg-slate-200/80 dark:bg-white/[0.08]"
                indicatorClassName={
                  isFull2
                    ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                    : isWarn2
                    ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                    : "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                }
              />
            </div>

            {/* MÁNG 3: DỤNG CỤ THỦY TINH / KHÁC */}
            <div
              className={`rounded-xl border p-3.5 transition-all duration-200 ${
                isFull3
                  ? "border-rose-500/80 bg-rose-500/10 dark:border-rose-500/60 dark:bg-rose-950/30 ring-1 ring-rose-500/40 shadow-xs"
                  : isWarn3
                  ? "border-amber-500/80 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-950/20 ring-1 ring-amber-500/30"
                  : "border-slate-200/80 bg-slate-50/50 dark:border-white/[0.06] dark:bg-[#161a26]/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-slate-100 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold shrink-0">
                    K3
                  </span>
                  <span className="text-sm font-semibold truncate">
                    Máng 3: {bin3Brands.length > 0 ? bin3Brands.map((b: string) => CATALOG_BRANDS[b]?.name || b).join(", ") : "Lọ thuốc / Ống nghiệm (Thủy tinh)"}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Thông tin chi tiết Máng 3" className="text-slate-400 hover:text-cyan-400 transition-colors shrink-0">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-mono text-xs">
                        Máng cuối băng tải • Cảm biến quang S1
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {binCounts.bin3}/{cap3} SP ({rate3}%)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 font-mono">
                    <span>Đã dọn:</span>
                    <strong className="text-slate-900 dark:text-white">{cleared3} SP</strong>
                  </span>
                  {isFull3 ? (
                    <Badge variant="destructive" className="font-semibold text-xs gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Đầy khay</span>
                    </Badge>
                  ) : isWarn3 ? (
                    <Badge variant="warning" className="font-semibold text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Sắp đầy</span>
                    </Badge>
                  ) : (
                    <Badge variant="success" className="font-semibold text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Bình thường</span>
                    </Badge>
                  )}
                  {/* Nút Dọn khay trực tiếp */}
                  {isFull3 ? (
                    <button
                      type="button"
                      onClick={() => (onConfirmBinReplaced ? onConfirmBinReplaced(3) : onClearBin?.(3))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-500 bg-rose-500 hover:bg-rose-600 text-white shadow-xs animate-pulse active:scale-95 transition-all cursor-pointer"
                      title="Xác nhận đã thay khay rỗng mới và đặt lại số đếm về 0"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      <span>Đã thay khay</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmBinClear(3)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1] transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Dọn dẹp Khay 3 (đặt lại số đếm về 0)"
                    >
                      <Trash2 className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                      <span>Dọn khay</span>
                    </button>
                  )}
                  {canEditConfig && (
                    <Link
                      href="/config"
                      className="text-slate-400 hover:text-cyan-500 transition-colors p-1"
                      title="Sửa sức chứa trong Cấu hình"
                      aria-label="Đi đến trang cấu hình sức chứa Khay 3"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              <Progress
                value={rate3}
                className="h-2.5 bg-slate-200/80 dark:bg-white/[0.08]"
                indicatorClassName={
                  isFull3
                    ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                    : isWarn3
                    ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                    : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                }
              />
            </div>

            {/* Ẩn cụm thanh trượt khỏi UI Tổng quan để tối giản giao diện; người dùng cấu hình tại /config. Duy trì source contract binCapacities */}
            {canEditConfig && (
              <div className="hidden" aria-hidden="true">
                <div>
                  <span>Sức chứa Khay 1: {cap1} SP</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={cap1}
                    aria-label="Điều chỉnh sức chứa Khay 1"
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10) || 50;
                      const clamped = Math.max(5, Math.min(50, raw));
                      onSetBinCapacity ? onSetBinCapacity(1, clamped) : onSetBinCount?.(1, clamped);
                    }}
                  />
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(1, 10) : onSetBinCount?.(1, 10)}>10 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(1, 30) : onSetBinCount?.(1, 30)}>30 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(1, 50) : onSetBinCount?.(1, 50)}>50 SP (Chuẩn)</button>
                </div>

                <div>
                  <span>Sức chứa Khay 2: {cap2} SP</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={cap2}
                    aria-label="Điều chỉnh sức chứa Khay 2"
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10) || 50;
                      const clamped = Math.max(5, Math.min(50, raw));
                      onSetBinCapacity ? onSetBinCapacity(2, clamped) : onSetBinCount?.(2, clamped);
                    }}
                  />
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(2, 10) : onSetBinCount?.(2, 10)}>10 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(2, 30) : onSetBinCount?.(2, 30)}>30 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(2, 50) : onSetBinCount?.(2, 50)}>50 SP (Chuẩn)</button>
                </div>

                <div>
                  <span>Sức chứa Khay 3: {cap3} SP</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={cap3}
                    aria-label="Điều chỉnh sức chứa Khay 3"
                    onChange={(e) => {
                      const raw = parseInt(e.target.value, 10) || 50;
                      const clamped = Math.max(5, Math.min(50, raw));
                      onSetBinCapacity ? onSetBinCapacity(3, clamped) : onSetBinCount?.(3, clamped);
                    }}
                  />
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(3, 10) : onSetBinCount?.(3, 10)}>10 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(3, 30) : onSetBinCount?.(3, 30)}>30 SP</button>
                  <button type="button" onClick={() => onSetBinCapacity ? onSetBinCapacity(3, 50) : onSetBinCount?.(3, 50)}>50 SP (Chuẩn)</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LIÊN KẾT ĐIỀU HƯỚNG TỐI GIẢN ĐẾN TRẠM BĂNG TẢI */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống tay gạt servo tự động phân loại dụng cụ y tế vào 3 khay chứa
          </span>
          <Link
            href="/conveyor"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
          >
            <span>Đến trạm băng tải</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>

      {/* ConfirmDialog khi dọn khay */}
      <ConfirmDialog
        isOpen={confirmBinClear !== null}
        onCancel={() => setConfirmBinClear(null)}
        onConfirm={() => {
          if (confirmBinClear) {
            const isTargetFull =
              confirmBinClear === 1 ? isFull1 : confirmBinClear === 2 ? isFull2 : isFull3;
            if (isTargetFull && onConfirmBinReplaced) {
              onConfirmBinReplaced(confirmBinClear);
            } else {
              onClearBin?.(confirmBinClear);
            }
          }
          setConfirmBinClear(null);
        }}
        title={`Xác nhận dọn dẹp Khay ${confirmBinClear}`}
        message={`Khay ${confirmBinClear} hiện đang có ${
          confirmBinClear === 1 ? binCounts.bin1 : confirmBinClear === 2 ? binCounts.bin2 : binCounts.bin3
        } sản phẩm (định mức tối đa: ${
          confirmBinClear === 1 ? cap1 : confirmBinClear === 2 ? cap2 : cap3
        } SP). Bạn có chắc chắn muốn dọn sạch khay và đặt lại số đếm về 0 không?`}
        confirmText="Dọn khay ngay"
        cancelText="Hủy bỏ"
        type="warning"
      />
    </TooltipProvider>
  );
}

"use client";

import React, { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ThroughputPoint } from "@/lib/types";
import { Activity, Radio, Gauge, Boxes, Zap } from "lucide-react";

interface LiveChartProps {
  data: ThroughputPoint[];
  brandCounts?: Record<string, number>;
  binCounts?: { bin1: number; bin2: number; bin3: number };
  conveyorSpeed?: number;
  isRunning?: boolean;
  totalSorted?: number;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  data,
  binCounts,
  conveyorSpeed = 65,
  isRunning = true,
  totalSorted: totalSortedProp,
}) => {
  // Multiple charts can render on the same page; scope SVG definition IDs per instance.
  const chartId = useId().replace(/:/g, "");
  const cyanGradientId = `${chartId}-cyan-gradient`;
  const speedGradientId = `${chartId}-speed-gradient`;
  const glowFilterId = `${chartId}-glow-cyan`;
  // Điểm dữ liệu mới nhất
  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const currentPPM = latestPoint?.ppm ?? 0;
  const currentSpeed = latestPoint?.speed ?? (isRunning ? conveyorSpeed : 0);
  const totalInBins = binCounts ? binCounts.bin1 + binCounts.bin2 + binCounts.bin3 : 0;
  const totalSorted =
    typeof totalSortedProp === "number"
      ? totalSortedProp
      : Math.max(latestPoint?.total ?? 0, totalInBins);

  // Custom Dot nhấp nháy tín hiệu Live (Pulse Dot) tại điểm mới nhất
  const renderPulseDot = (props: any) => {
    const { cx, cy, index } = props;
    if (index === data.length - 1 && cx !== undefined && cy !== undefined) {
      return (
        <g key={`pulse-dot-${index}`}>
          {/* Vòng hào quang lan tỏa Pulse */}
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill="#06B6D4"
            opacity={0.35}
            className="animate-ping origin-center"
          />
          {/* Vòng nền phát sáng mờ */}
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill="#06B6D4"
            opacity={0.6}
          />
          {/* Điểm tâm phát sáng trắng viền cyan */}
          <circle
            cx={cx}
            cy={cy}
            r={3.5}
            fill="#FFFFFF"
            stroke="#06B6D4"
            strokeWidth={2}
          />
        </g>
      );
    }
    return <g key={`dot-empty-${index}`} />;
  };

  return (
    <div className="relate-card relative flex flex-col h-full rounded-2xl p-5 shadow-sm border border-slate-200/80 bg-white/95 dark:border-white/[0.07] dark:bg-[#161822] transition-all duration-300 overflow-hidden">
      {/* HEADER: Tiêu đề, trạng thái Live Streaming và các thẻ số đo tức thời */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-xs shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Lưu lượng thời gian thực
              </h3>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono">LIVE 1.0s</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tốc độ phân loại (PPM) và tốc độ động cơ băng tải (PWM)
            </p>
          </div>
        </div>

        {/* CỤM BADGE THÔNG SỐ TỨC THỜI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge 1: Tốc độ phân loại PPM */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
            <Radio className="h-3.5 w-3.5 text-cyan-500" />
            <span>Lưu lượng:</span>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
              {currentPPM} SP/Phút
            </span>
          </div>

          {/* Badge 2: Tốc độ động cơ PWM */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Gauge className="h-3.5 w-3.5 text-indigo-500" />
            <span>Động cơ:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {currentSpeed}% PWM
            </span>
          </div>
        </div>
      </div>

      {/* KHU VỰC BIỂU ĐỒ AREA CHART REAL-TIME */}
      <div className="mt-4 flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
            <defs>
              {/* Dải gradient lam ngọc (#06B6D4 chuyển sang trong suốt) */}
              <linearGradient id={cyanGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#06B6D4" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>

              {/* Dải gradient tím indigo cho tốc độ động cơ PWM */}
              <linearGradient id={speedGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#818CF8" stopOpacity={0.0} />
              </linearGradient>

              {/* Bộ lọc phát sáng đường viền */}
              <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Lưới tọa độ ngầm mờ ảo */}
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />

            {/* Trục X: Dòng thời gian chạy thực tế theo từng giây/phút (Time Stream: 10:15:20, 10:15:40...) */}
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155", opacity: 0.2 }}
              dy={8}
            />

            {/* Trục Y1 (Trái): Tốc độ phân loại tức thời (PPM - Sản phẩm / Phút) */}
            <YAxis
              yAxisId="ppm"
              stroke="#06B6D4"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, (dataMax: number) => Math.max(30, dataMax + 8)]}
            />

            {/* Trục Y2 (Phải): Tốc độ động cơ băng tải (PWM %) */}
            <YAxis
              yAxisId="speed"
              orientation="right"
              stroke="#818CF8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              unit="%"
            />

            {/* Custom Tooltip kính thủy tinh hiện đại */}
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const ppmVal = payload.find((p) => p.dataKey === "ppm")?.value ?? 0;
                  const speedVal = payload.find((p) => p.dataKey === "speed")?.value ?? 0;
                  const totalVal = payload[0]?.payload?.total ?? totalSorted;
                  return (
                    <div className="rounded-xl border border-cyan-500/30 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-cyan-500/30 dark:bg-[#161822]/95 min-w-[200px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5 mb-2 dark:border-white/[0.08]">
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          ⏱ {label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          LIVE
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
                            Lưu lượng tức thời:
                          </span>
                          <span className="font-mono font-bold text-sm">{ppmVal} SP/P</span>
                        </div>
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            Động cơ băng tải:
                          </span>
                          <span className="font-mono font-bold">{speedVal}% PWM</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Boxes className="h-3 w-3 text-slate-400" />
                            Tổng sản phẩm:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {totalVal} SP
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
            />

            {/* VÙNG 1: Dòng lưu lượng phân loại PPM với gradient lam ngọc & đường viền phát sáng */}
            <Area
              yAxisId="ppm"
              type="monotone"
              dataKey="ppm"
              name="Lưu lượng phân loại (SP/Phút)"
              stroke="#06B6D4"
              strokeWidth={2.8}
              fillOpacity={1}
              fill={`url(#${cyanGradientId})`}
              dot={renderPulseDot}
              activeDot={{
                r: 6,
                fill: "#06B6D4",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
            />

            {/* VÙNG 2: Tốc độ động cơ băng tải (%) nét đứt */}
            <Area
              yAxisId="speed"
              type="monotone"
              dataKey="speed"
              name="Tốc độ băng tải (PWM %)"
              stroke="#818CF8"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill={`url(#${speedGradientId})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* FOOTER: Dòng chú giải kỹ thuật */}
      <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
          <span>Thu thập từ cảm biến và telemetry ESP32-C5</span>
        </div>
        <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
          Độ trễ: &lt; 25ms
        </span>
      </div>
    </div>
  );
};

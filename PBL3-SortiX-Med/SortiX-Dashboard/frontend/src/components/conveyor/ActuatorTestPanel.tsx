"use client";

import React, { useState } from "react";
import {
  Volume2,
  Cpu,
  Radio,
  FlaskConical,
  Power,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ActuatorTestPanelProps {
  isSimulation: boolean;
  arm1Active?: boolean;
  arm2Active?: boolean;
  onTestActuator: (type: "servo_1" | "servo_2" | "buzzer", value?: number) => void;
  className?: string;
}

export const ActuatorTestPanel: React.FC<ActuatorTestPanelProps> = ({
  isSimulation,
  arm1Active = false,
  arm2Active = false,
  onTestActuator,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeBuzzer, setActiveBuzzer] = useState(false);

  // Toggle Servo 1: ON (45°) / OFF (0°)
  const handleToggleServo1 = (targetOn: boolean) => {
    if (targetOn) {
      onTestActuator("servo_1", 45);
    } else {
      onTestActuator("servo_1", 0);
    }
  };

  // Toggle Servo 2: ON (45°) / OFF (0°)
  const handleToggleServo2 = (targetOn: boolean) => {
    if (targetOn) {
      onTestActuator("servo_2", 45);
    } else {
      onTestActuator("servo_2", 0);
    }
  };

  // Toggle Buzzer: ON (Hú liên tục) / OFF (Tắt)
  const handleToggleBuzzer = (targetOn: boolean) => {
    if (targetOn) {
      setActiveBuzzer(true);
      onTestActuator("buzzer", 1);
    } else {
      setActiveBuzzer(false);
      onTestActuator("buzzer", 0);
    }
  };

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#12151e]/85 backdrop-blur-md overflow-hidden shadow-xs transition-all ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200/80 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 shrink-0">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Kiểm thử Tải Chấp Hành
              </h4>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                (2 Servo • 1 Đèn LED)
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hidden xl:inline-block">
            10 × 60 cm
          </span>

          {isSimulation ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 gap-1 text-[10px] font-semibold px-2 py-0.5"
            >
              <FlaskConical className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>Mô phỏng</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1 text-[10px] font-semibold px-2 py-0.5"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span>Thực tế</span>
            </Badge>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 dark:border-white/[0.08] dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={isExpanded ? "Thu gọn bảng test tải" : "Mở rộng bảng test tải"}
            aria-label={isExpanded ? "Thu gọn bảng test tải" : "Mở rộng bảng test tải"}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* 3 Actuator Cards Grid: Designed as BẬT / TẮT Switches */}
      {isExpanded && (
        <div className="p-2 sm:p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          {/* TẢI 1: SERVO 1 (MÁNG 1) */}
          <div
            className={`rounded-xl border p-2 flex flex-col justify-between gap-1.5 transition-all ${
              arm1Active
                ? "border-amber-500/60 bg-amber-500/15 dark:bg-amber-950/30 shadow-xs shadow-amber-500/10"
                : "border-slate-200/90 dark:border-white/[0.06] bg-white/95 dark:bg-[#161a26]"
            }`}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-[9px] font-black shrink-0 border border-amber-500/30">
                    K1
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    Servo 1 (Khay 1)
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                  GPIO 6
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                <span className="flex items-center gap-1 font-bold">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      arm1Active
                        ? "bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span
                    className={
                      arm1Active
                        ? "text-amber-700 dark:text-amber-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {arm1Active ? "BẬT (45°)" : "TẮT (0°)"}
                  </span>
                </span>
              </div>
            </div>

            {/* BẬT / TẮT Segmented Control */}
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 mt-1">
              <button
                type="button"
                onClick={() => handleToggleServo1(false)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  !arm1Active
                    ? "bg-white dark:bg-[#1a1e2d] text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Power className="h-2.5 w-2.5 opacity-60" />
                <span>TẮT</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleServo1(true)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  arm1Active
                    ? "bg-amber-500 text-white font-black shadow-xs shadow-amber-500/40"
                    : "text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                }`}
              >
                <Power className="h-2.5 w-2.5" />
                <span>BẬT (45°)</span>
              </button>
            </div>
          </div>

          {/* TẢI 2: SERVO 2 (MÁNG 2) */}
          <div
            className={`rounded-xl border p-2 flex flex-col justify-between gap-1.5 transition-all ${
              arm2Active
                ? "border-sky-500/60 bg-sky-500/15 dark:bg-sky-950/30 shadow-xs shadow-sky-500/10"
                : "border-slate-200/90 dark:border-white/[0.06] bg-white/95 dark:bg-[#161a26]"
            }`}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-sky-500/20 text-sky-700 dark:text-sky-400 font-mono text-[9px] font-black shrink-0 border border-sky-500/30">
                    K2
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    Servo 2 (Khay 2)
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25 shrink-0">
                  GPIO 24
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                <span className="flex items-center gap-1 font-bold">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      arm2Active
                        ? "bg-sky-500 shadow-[0_0_6px_#0ea5e9] animate-pulse"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span
                    className={
                      arm2Active
                        ? "text-sky-700 dark:text-sky-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {arm2Active ? "BẬT (45°)" : "TẮT (0°)"}
                  </span>
                </span>
              </div>
            </div>

            {/* BẬT / TẮT Segmented Control */}
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 mt-1">
              <button
                type="button"
                onClick={() => handleToggleServo2(false)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  !arm2Active
                    ? "bg-white dark:bg-[#1a1e2d] text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Power className="h-2.5 w-2.5 opacity-60" />
                <span>TẮT</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleServo2(true)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  arm2Active
                    ? "bg-sky-500 text-white font-black shadow-xs shadow-sky-500/40"
                    : "text-slate-500 hover:text-sky-600 dark:hover:text-sky-400"
                }`}
              >
                <Power className="h-2.5 w-2.5" />
                <span>BẬT (45°)</span>
              </button>
            </div>
          </div>

          {/* TẢI 3: ĐÈN LED BÁO TRẠNG THÁI */}
          <div
            className={`rounded-xl border p-2 flex flex-col justify-between gap-1.5 transition-all ${
              activeBuzzer
                ? "border-emerald-500/60 bg-emerald-500/15 dark:bg-emerald-950/30 shadow-xs shadow-emerald-500/10"
                : "border-slate-200/90 dark:border-white/[0.06] bg-white/95 dark:bg-[#161a26]"
            }`}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] font-black shrink-0 border border-emerald-500/30">
                    LED
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    Đèn LED Trạng Thái
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                  GPIO 10
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                <span className="flex items-center gap-1 font-bold">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      activeBuzzer
                        ? "bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span
                    className={
                      activeBuzzer
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {activeBuzzer ? "BẬT (Sáng)" : "TẮT (Tối)"}
                  </span>
                </span>
              </div>
            </div>

            {/* BẬT / TẮT Segmented Control */}
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 mt-1">
              <button
                type="button"
                onClick={() => handleToggleBuzzer(false)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  !activeBuzzer
                    ? "bg-white dark:bg-[#1a1e2d] text-slate-800 dark:text-slate-200 shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Power className="h-2.5 w-2.5 opacity-60" />
                <span>TẮT</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleBuzzer(true)}
                className={`py-1 px-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  activeBuzzer
                    ? "bg-emerald-600 text-white font-black shadow-xs shadow-emerald-500/40"
                    : "text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
              >
                <Power className="h-2.5 w-2.5" />
                <span>BẬT (Sáng)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

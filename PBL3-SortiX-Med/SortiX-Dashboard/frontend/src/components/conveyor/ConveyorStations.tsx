"use client";

import React from "react";
import { Camera } from "lucide-react";
import type { TelemetryData } from "@/lib/types";

export interface ConveyorStationsProps {
  isBeltMoving: boolean;
  telemetry: TelemetryData;
  isJammed: boolean;
  arm1Active: boolean;
  arm2Active: boolean;
}

export const ConveyorStations: React.FC<ConveyorStationsProps> = ({
  isBeltMoving,
  telemetry,
  isJammed,
  arm1Active,
  arm2Active,
}) => {
  return (
    <>
      {/* 1. CỔNG CAMERA THỊ GIÁC MÁY CÔNG NGHIỆP & CẢM BIẾN S1 (INSPECTION GANTRY - 15%) */}
      <div className="absolute left-[15%] -top-6 bottom-0 z-30 flex flex-col items-center pointer-events-none">
        {/* Khung cổng vòm nhôm định hình 2020 anot hóa */}
        <div className="relative flex items-center gap-1.5 rounded-t-md border-x border-t border-slate-600 bg-slate-900 px-2 py-0.5 shadow-sm">
          <div className="flex items-center gap-1">
            <Camera className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="text-[8px] font-mono font-bold tracking-wider text-slate-200 whitespace-nowrap">
              CAM-01
            </span>
          </div>
          {/* LED trạng thái camera */}
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 shrink-0 ${
              telemetry.s1_entry
                ? "bg-emerald-400 shadow-xs"
                : "bg-slate-600"
            }`}
            title={telemetry.s1_entry ? "Đang nhận diện phôi" : "Sẵn sàng"}
          />
        </div>

        {/* Vùng chiếu sáng quang học đồng đều (Medical LED Ring Illumination) */}
        <div className="relative w-14 flex-1 overflow-hidden border-x border-dashed border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 via-cyan-500/5 to-transparent">
          {/* Vạch căn chỉnh tiêu cự camera */}
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-b border-cyan-400/30" />
          {telemetry.s1_entry && (
            <div className="absolute inset-x-1 top-2 bottom-2 rounded bg-cyan-400/10 border border-cyan-400/40 transition-opacity" />
          )}
        </div>

        {/* Cảm biến hồng ngoại S1 (GPIO0) với 2 LED vật lý PWR & OUT */}
        <div className="flex items-center gap-1.5 mt-0.5 bg-slate-950/90 border border-slate-700/80 rounded px-1.5 py-0.5 shadow-xs">
          {/* LED Đỏ: Báo nguồn PWR */}
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" title="LED PWR: Nguồn 5V ON" />
          {/* LED Xanh: Báo tín hiệu OUT */}
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
              telemetry.s1_entry
                ? "bg-emerald-400 shadow-xs"
                : "bg-slate-600"
            }`}
            title="LED OUT: Tín hiệu cảm biến phôi"
          />
          <span className="font-mono text-[7px] font-bold text-slate-300 whitespace-nowrap">
            S1:GPIO0
          </span>
        </div>
      </div>

      {/* 2. CƠ CẤU CÁNH TAY GẠT SERVO 1 (MG996R - GPIO6) & TRẠM ENCODER 200mm (45%) */}
      <div className="absolute left-[45%] -top-4 bottom-0 z-30 flex flex-col items-center justify-between pointer-events-none -translate-x-1/2 w-16">
        {/* Thân Động Cơ Servo TowerPro MG996R Nhôm CNC */}
        <div className="relative z-40 flex flex-col items-center w-14 rounded-md border-2 border-slate-500 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-xl px-1 py-1">
          {/* Cụm dây cấp nguồn 3 pha: Tín hiệu Cam (GPIO6), Nguồn Đỏ (5V XL4015), Mass Nâu (GND) */}
          <div className="flex w-full justify-between px-1 mb-0.5">
            <div
              className="h-1.5 w-1.5 rounded-full bg-amber-500 border border-amber-600 shadow-xs"
              title="Tín hiệu PWM (Cam - GPIO6)"
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-rose-500 border border-rose-600 shadow-xs"
              title="Nguồn +5V Buck XL4015 (Đỏ)"
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-slate-600 border border-slate-700 shadow-xs"
              title="GND Chung (Nâu)"
            />
          </div>

          {/* Nhãn hiệu Servo & Đèn LED trạng thái kích hoạt */}
          <div className="flex items-center justify-between w-full px-0.5">
            <span className="text-[7px] font-mono font-black text-amber-300 leading-none">
              SRV-01
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                arm1Active
                  ? "bg-amber-400 shadow-[0_0_8px_#f59e0b] scale-125"
                  : "bg-slate-600"
              }`}
            />
          </div>
          <div className="flex items-center justify-between w-full px-0.5 text-[6px] font-mono text-slate-400 uppercase tracking-tighter">
            <span>GPIO6</span>
            <span className={arm1Active ? "text-amber-300 font-bold" : ""}>
              {arm1Active ? "SWEEP 45°" : "REST 0°"}
            </span>
          </div>

          {/* Trục servo nhông đồng kim loại */}
          <div className="w-4 h-1 bg-amber-600/90 rounded-b-xs border-t border-slate-600 mt-1" />
        </div>

        {/* CÁNH TAY GẠT SERVO XOAY GÓC (Servo Metal Horn & Deflector Flap) */}
        <div
          className="absolute top-2 flex flex-col items-center pointer-events-none z-35 origin-top"
          style={{
            transform: arm1Active ? "translateY(45px) rotate(45deg)" : "translateY(0px) rotate(0deg)",
            transition: "transform 0.16s cubic-bezier(0.18, 0.9, 0.32, 1.25)",
            willChange: "transform",
          }}
        >
          {/* Cần gạt hợp kim nhôm gắn trên trục servo */}
          <div className="flex items-center justify-center h-8 w-2 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-sm shadow-md border border-amber-300/80">
            <div className="w-0.5 h-6 bg-white/70 rounded-full" />
          </div>

          {/* Bản gạt phôi bọc đệm giảm chấn cao su */}
          <div
            className="relative flex flex-col items-center justify-center w-12 h-4 rounded-md border border-amber-300/80 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 shadow-lg px-1 transition-all"
            style={{
              boxShadow: arm1Active
                ? "0 0 16px rgba(245, 158, 11, 0.95), inset 0 1px 2px rgba(255, 255, 255, 0.6)"
                : "0 2px 4px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[7px] font-mono font-black text-amber-950 tracking-tighter leading-none">
                GẠT 1
              </span>
              <span className="text-[6px] font-mono font-bold text-amber-900 leading-none">
                45°
              </span>
            </div>
          </div>
        </div>

        {/* Vạch định vị trạm Encoder 1 (200mm) / Cảnh báo kẹt phôi Zone A */}
        <div className="flex items-center gap-1 mt-auto pb-0.5">
          <div
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all shrink-0 ${
              isJammed
                ? "border-rose-300 bg-rose-500 shadow-[0_0_14px_#f43f5e] animate-ping"
                : arm1Active
                ? "border-amber-300 bg-amber-400 shadow-[0_0_12px_#f59e0b]"
                : "border-slate-400 bg-slate-800"
            }`}
          />
          <span
            className={`rounded px-1 font-mono text-[8px] font-bold border whitespace-nowrap ${
              isJammed
                ? "bg-rose-950 text-rose-300 border-rose-500 animate-pulse"
                : "bg-slate-950/90 text-amber-400 border-amber-500/30"
            }`}
          >
            {isJammed ? "ZONE 1: KẸT PHÔI" : "TRẠM 1: 200mm"}
          </span>
        </div>
      </div>

      {/* 3. CƠ CẤU CÁNH TAY GẠT SERVO 2 (MG996R - GPIO7) & TRẠM ENCODER 400mm (72%) */}
      <div className="absolute left-[72%] -top-4 bottom-0 z-30 flex flex-col items-center justify-between pointer-events-none -translate-x-1/2 w-16">
        {/* Thân Động Cơ Servo TowerPro MG996R Nhôm CNC */}
        <div className="relative z-40 flex flex-col items-center w-14 rounded-md border-2 border-slate-500 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-xl px-1 py-1">
          {/* Cụm dây cấp nguồn 3 pha: Tín hiệu Xanh (GPIO7), Nguồn Đỏ (5V XL4015), Mass Nâu (GND) */}
          <div className="flex w-full justify-between px-1 mb-0.5">
            <div
              className="h-1.5 w-1.5 rounded-full bg-blue-500 border border-blue-600 shadow-xs"
              title="Tín hiệu PWM (Xanh - GPIO7)"
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-rose-500 border border-rose-600 shadow-xs"
              title="Nguồn +5V Buck XL4015 (Đỏ)"
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-slate-600 border border-slate-700 shadow-xs"
              title="GND Chung (Nâu)"
            />
          </div>

          {/* Nhãn hiệu Servo & Đèn LED trạng thái kích hoạt */}
          <div className="flex items-center justify-between w-full px-0.5">
            <span className="text-[7px] font-mono font-black text-cyan-300 leading-none">
              SRV-02
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                arm2Active
                  ? "bg-blue-400 shadow-[0_0_8px_#3b82f6] scale-125"
                  : "bg-slate-600"
              }`}
            />
          </div>
          <div className="flex items-center justify-between w-full px-0.5 text-[6px] font-mono text-slate-400 uppercase tracking-tighter">
            <span>GPIO7</span>
            <span className={arm2Active ? "text-blue-300 font-bold" : ""}>
              {arm2Active ? "SWEEP 45°" : "REST 0°"}
            </span>
          </div>

          {/* Trục servo nhông đồng kim loại */}
          <div className="w-4 h-1 bg-blue-600/90 rounded-b-xs border-t border-slate-600 mt-1" />
        </div>

        {/* CÁNH TAY GẠT SERVO XOAY GÓC (Servo Metal Horn & Deflector Flap) */}
        <div
          className="absolute top-2 flex flex-col items-center pointer-events-none z-35 origin-top"
          style={{
            transform: arm2Active ? "translateY(45px) rotate(45deg)" : "translateY(0px) rotate(0deg)",
            transition: "transform 0.16s cubic-bezier(0.18, 0.9, 0.32, 1.25)",
            willChange: "transform",
          }}
        >
          {/* Cần gạt hợp kim nhôm gắn trên trục servo */}
          <div className="flex items-center justify-center h-8 w-2 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-sm shadow-md border border-cyan-300/80">
            <div className="w-0.5 h-6 bg-white/70 rounded-full" />
          </div>

          {/* Bản gạt phôi bọc đệm giảm chấn cao su */}
          <div
            className="relative flex flex-col items-center justify-center w-12 h-4 rounded-md border border-cyan-300/80 bg-gradient-to-b from-cyan-500 via-blue-500 to-blue-600 shadow-lg px-1 transition-all"
            style={{
              boxShadow: arm2Active
                ? "0 0 16px rgba(59, 130, 246, 0.95), inset 0 1px 2px rgba(255, 255, 255, 0.6)"
                : "0 2px 4px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[7px] font-mono font-black text-cyan-950 tracking-tighter leading-none">
                GẠT 2
              </span>
              <span className="text-[6px] font-mono font-bold text-cyan-900 leading-none">
                45°
              </span>
            </div>
          </div>
        </div>

        {/* Vạch định vị trạm Encoder 2 (400mm) */}
        <div className="flex items-center gap-1 mt-auto pb-0.5">
          <div
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all shrink-0 ${
              arm2Active
                ? "border-blue-300 bg-blue-400 shadow-[0_0_12px_#3b82f6]"
                : "border-slate-400 bg-slate-800"
            }`}
          />
          <span className="rounded bg-slate-950/90 px-1 font-mono text-[8px] font-bold text-blue-400 border border-blue-500/30 whitespace-nowrap">
            TRẠM 2: 400mm
          </span>
        </div>
      </div>
    </>
  );
};

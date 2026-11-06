"use client";

import React, { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";

interface BinCapacityInputProps {
  value: number;
  onChange: (value: number) => void;
  colorScheme?: "rose" | "blue" | "amber" | "cyan";
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const BinCapacityInput: React.FC<BinCapacityInputProps> = ({
  value,
  onChange,
  colorScheme = "rose",
  min = 5,
  max = 50,
  disabled = false,
}) => {
  const [localText, setLocalText] = useState<string>(String(value || 50));

  useEffect(() => {
    setLocalText(String(value || 50));
  }, [value]);

  const commitValue = (valStr: string) => {
    let num = parseInt(valStr, 10);
    if (isNaN(num)) {
      num = value || 50;
    }
    const clamped = Math.max(min, Math.min(max, num));
    setLocalText(String(clamped));
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  const handleStep = (delta: number) => {
    if (disabled) return;
    const current = value || 50;
    const next = Math.max(min, Math.min(max, current + delta));
    setLocalText(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  const colorStyles = {
    rose: {
      border: "border-rose-300 dark:border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/30",
      text: "text-rose-600 dark:text-rose-400",
      btnHover: "hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300",
      badge: "text-rose-600 dark:text-rose-400",
    },
    blue: {
      border: "border-blue-300 dark:border-blue-500/40 focus:border-blue-500 focus:ring-blue-500/30",
      text: "text-blue-600 dark:text-blue-400",
      btnHover: "hover:bg-blue-100 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-300",
      badge: "text-blue-600 dark:text-blue-400",
    },
    amber: {
      border: "border-amber-300 dark:border-amber-500/40 focus:border-amber-500 focus:ring-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      btnHover: "hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-300",
      badge: "text-amber-600 dark:text-amber-400",
    },
    cyan: {
      border: "border-cyan-300 dark:border-cyan-500/40 focus:border-cyan-500 focus:ring-cyan-500/30",
      text: "text-cyan-600 dark:text-cyan-400",
      btnHover: "hover:bg-cyan-100 dark:hover:bg-cyan-950/40 hover:text-cyan-600 dark:hover:text-cyan-300",
      badge: "text-cyan-600 dark:text-cyan-400",
    },
  }[colorScheme];

  return (
    <div
      className="flex items-center gap-1 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Nút giảm (-) */}
      <button
        type="button"
        onClick={() => handleStep(-1)}
        disabled={disabled || value <= min}
        className={`h-5 w-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer ${colorStyles.btnHover}`}
        title={`Giảm 1 SP (Tối thiểu ${min} SP)`}
      >
        <Minus className="h-2.5 w-2.5 stroke-[3]" />
      </button>

      {/* Ô nhập số lượng trực tiếp */}
      <input
        type="number"
        min={min}
        max={max}
        value={localText}
        disabled={disabled}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={() => commitValue(localText)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitValue(localText);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`w-11 h-5 text-center font-mono font-black text-xs rounded border bg-white dark:bg-slate-900 ${colorStyles.border} ${colorStyles.text} focus:outline-none focus:ring-2 shadow-xs transition-colors`}
        title={`Nhập trực tiếp sức chứa định mức (${min} - ${max} SP)`}
      />

      {/* Nút tăng (+) */}
      <button
        type="button"
        onClick={() => handleStep(1)}
        disabled={disabled || value >= max}
        className={`h-5 w-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer ${colorStyles.btnHover}`}
        title={`Tăng 1 SP (Tối đa ${max} SP)`}
      >
        <Plus className="h-2.5 w-2.5 stroke-[3]" />
      </button>

      {/* Đơn vị */}
      <span className={`font-mono font-bold text-[10px] ${colorStyles.badge}`}>
        SP (Tối đa)
      </span>
    </div>
  );
};

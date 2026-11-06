"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, X, Calendar, Layers, CalendarDays, FileSpreadsheet } from "lucide-react";

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: "day" | "month" | "all", value?: string) => void;
  availableDates: string[]; // ["YYYY-MM-DD", ...]
  totalRecords?: number;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  availableDates,
  totalRecords = 0,
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<"day" | "month" | "all">("all");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    availableDates.forEach((d) => {
      if (d && d.length >= 7) months.add(d.slice(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [availableDates]);

  useEffect(() => {
    if (isOpen) {
      setExportType("all");
      if (availableDates.length > 0) {
        setSelectedDay(availableDates[0]);
      }
      if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      }
    }
  }, [isOpen, availableDates, availableMonths]);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (exportType === "day") {
      onExport("day", selectedDay);
    } else if (exportType === "month") {
      onExport("month", selectedMonth);
    } else {
      onExport("all");
    }
    onClose();
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Đóng hộp thoại xuất file"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h3 id="export-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              Xuất CSV
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Chọn khoảng thời gian để xuất {totalRecords > 0 ? `(${totalRecords} bản ghi)` : "dữ liệu"}.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Lựa chọn ngày */}
          <label className={`flex flex-col gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${exportType === "day" ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                aria-label="Xuất dữ liệu theo ngày"
                name="exportType"
                checked={exportType === "day"}
                onChange={() => setExportType("day")}
                className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
              />
              <Calendar className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Xuất theo ngày
              </span>
            </div>
            {exportType === "day" && (
              <div className="pl-7 mt-1">
                {availableDates.length > 0 ? (
                  <select
                    aria-label="Chọn ngày xuất dữ liệu"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#111319] dark:text-white"
                  >
                    {availableDates.map((dateKey) => {
                      const [y, m, d] = dateKey.split("-");
                      return (
                        <option key={dateKey} value={dateKey}>
                          Ngày {d}/{m}/{y}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-rose-500">Không có dữ liệu ngày nào.</p>
                )}
              </div>
            )}
          </label>

          {/* Lựa chọn tháng */}
          <label className={`flex flex-col gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${exportType === "month" ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                aria-label="Xuất dữ liệu theo tháng"
                name="exportType"
                checked={exportType === "month"}
                onChange={() => setExportType("month")}
                className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
              />
              <CalendarDays className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Xuất theo tháng
              </span>
            </div>
            {exportType === "month" && (
              <div className="pl-7 mt-1">
                {availableMonths.length > 0 ? (
                  <select
                    aria-label="Chọn tháng xuất dữ liệu"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#111319] dark:text-white"
                  >
                    {availableMonths.map((monthKey) => {
                      const [y, m] = monthKey.split("-");
                      return (
                        <option key={monthKey} value={monthKey}>
                          Tháng {m}/{y}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-rose-500">Không có dữ liệu tháng nào.</p>
                )}
              </div>
            )}
          </label>

          {/* Lựa chọn tất cả */}
          <label className={`flex flex-col gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${exportType === "all" ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/10" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"}`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                aria-label="Xuất tất cả dữ liệu"
                name="exportType"
                checked={exportType === "all"}
                onChange={() => setExportType("all")}
                className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
              />
              <Layers className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Xuất tất cả
              </span>
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={(exportType === "day" && !selectedDay) || (exportType === "month" && !selectedMonth)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30 transition-all transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất CSV
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}

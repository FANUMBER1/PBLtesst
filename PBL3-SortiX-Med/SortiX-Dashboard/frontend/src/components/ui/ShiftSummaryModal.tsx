"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  PieChart as PieChartIcon,
  OctagonAlert,
} from "lucide-react";
import { ShiftSummaryPayload } from "@shared/types";
import { useAuth } from "@/contexts/AuthContext";
import { exportShiftSummaryToCSV, printShiftSummaryReport } from "@/lib/exportCsv";
import { useToast } from "@/components/ui/Toast";
import { formatVietnameseDate } from "@/lib/history";

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ShiftSummaryPayload | null;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !summary) return null;

  const total = summary.total_products || 1;
  const good = summary.sorted_good || 0;
  const defect = summary.sorted_defect || 0;
  const goodPct = ((good / total) * 100).toFixed(1);
  const defectPct = ((defect / total) * 100).toFixed(1);

  const handleExportExcel = () => {
    if (!isAdmin) {
      toast.error("Chức năng xuất báo cáo CSV yêu cầu quyền Quản trị viên!", "Truy cập bị từ chối");
      return;
    }
    const success = exportShiftSummaryToCSV(summary);
    if (success) {
      toast.success("Đã xuất báo cáo 1 ngày làm việc ra file CSV thành công!");
    } else {
      toast.error("Không thể xuất file báo cáo.");
    }
  };

  const handleExportPDF = () => {
    if (!isAdmin) {
      toast.error("Chức năng in và lưu báo cáo PDF yêu cầu quyền Quản trị viên!", "Truy cập bị từ chối");
      return;
    }
    printShiftSummaryReport(summary);
    toast.success("Đang mở giao diện in và lưu báo cáo PDF...");
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-summary-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          aria-label="Đóng bảng báo cáo ca"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề & Header */}
        <div className="flex items-start gap-3.5 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="shift-summary-title" className="text-lg font-black text-slate-900 dark:text-white">
                Báo Cáo 1 Ngày Làm Việc
              </h2>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {summary.shift_name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kỳ làm việc: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatVietnameseDate(summary.timestamp).fullTextDate}</strong> • Xuất lúc: {new Date(summary.timestamp || Date.now()).toLocaleString("vi-VN")} • Chế độ: {summary.mode === "simulation" ? "Mô phỏng" : "Thực tế"}
            </p>
          </div>
        </div>

        {/* 4 Thẻ KPI số liệu chính */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng sản lượng</span>
            <p className="font-mono text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summary.total_products.toLocaleString("vi-VN")}
            </p>
            <span className="text-[10px] text-slate-500">100% định mức ca</span>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Đạt chuẩn
            </span>
            <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {summary.sorted_good.toLocaleString("vi-VN")}
            </p>
            <span className="text-[10px] text-emerald-500 font-semibold">{goodPct}% tỷ lệ</span>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Phế phẩm
            </span>
            <p className="font-mono text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {summary.sorted_defect.toLocaleString("vi-VN")}
            </p>
            <span className="text-[10px] text-rose-500 font-semibold">{defectPct}% phế phẩm</span>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <ScanLine className="h-3 w-3" />
              Độ tin cậy Thị giác máy
            </span>
            <p className="font-mono text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {summary.accuracy_rate}
            </p>
            <span className="text-[10px] text-cyan-500 font-semibold">Mô hình YOLOv8</span>
          </div>
        </div>

        {/* Khu vực Biểu Đồ Tròn Donut & Phân Tích An Toàn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Biểu đồ tròn Donut Chart (SVG Vector sắc nét) */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 self-start mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <PieChartIcon className="h-4 w-4 text-emerald-500" />
              Tỷ Lệ Sản Phẩm Đạt vs Phế Phẩm
            </div>

            <div className="relative flex items-center justify-center my-2">
              <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
                {/* Vòng nền phế phẩm (Rose) */}
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  className="stroke-rose-500/80"
                  strokeWidth="18"
                  fill="transparent"
                />
                {/* Vòng sản phẩm đạt chuẩn (Emerald) */}
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  className="stroke-emerald-500 transition-all duration-1000 ease-out"
                  strokeWidth="18"
                  strokeDasharray={`${(good / total) * 376.99} 376.99`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                  {summary.accuracy_rate}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Đạt chuẩn
                </span>
              </div>
            </div>

            {/* Chú giải màu sắc */}
            <div className="flex items-center gap-4 text-xs font-semibold mt-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Đạt: {good} ({goodPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Lỗi: {defect} ({defectPct}%)</span>
              </div>
            </div>
          </div>

          {/* Bảng phân tích chỉ số vận hành & an toàn */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-cyan-500" />
              Chỉ Số An Toàn & Vận Hành
            </span>

            <div className="space-y-2.5 my-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Thời gian máy chạy:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{summary.operating_hours}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Số lần dừng khẩn cấp (E-Stop):</span>
                <span className={`font-mono font-bold flex items-center gap-1 ${summary.emergency_stops_count > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  <OctagonAlert className="h-3.5 w-3.5" />
                  {summary.emergency_stops_count} lần
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Đánh giá an toàn:</span>
                <span className={`font-bold ${summary.emergency_stops_count === 0 ? "text-emerald-500" : "text-amber-500"}`}>
                  {summary.emergency_stops_count === 0 ? "Tối ưu • Không sự cố" : "Cần rà soát hiện trường"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Xác thực hệ thống:</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Đã kiểm chứng tự động
                </span>
              </div>
            </div>

            {/* Thông báo phân quyền */}
            <div className={`rounded-xl border p-2 text-[11px] font-medium flex items-center gap-2 ${isAdmin ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Tài khoản <b>Quản trị viên ({user?.displayName || user?.username})</b> có quyền xuất báo cáo PDF và CSV.</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Tài khoản <b>Người dùng</b> chỉ có quyền xem. Chức năng xuất file yêu cầu quyền Quản trị viên.</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cụm nút tác vụ ở chân Modal */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!isAdmin}
              className={`inline-flex items-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all shadow-sm active:scale-95 border ${
                isAdmin
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40"
                  : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent cursor-not-allowed opacity-50"
              }`}
              title={isAdmin ? "In hoặc lưu báo cáo PDF chuẩn doanh nghiệp" : "Chỉ Quản trị viên mới được xuất file"}
            >
              <Printer className="h-4 w-4" />
              <span>Xuất PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!isAdmin}
              className={`inline-flex items-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all shadow-sm active:scale-95 border ${
                isAdmin
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40"
                  : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent cursor-not-allowed opacity-50"
              }`}
              title={isAdmin ? "Xuất dữ liệu thống kê ra file CSV" : "Chỉ Quản trị viên mới được xuất file"}
            >
              <Download className="h-4 w-4" />
              <span>Xuất CSV</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 py-2.5 px-5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
};

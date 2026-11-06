"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { usePermission, useAuth } from "@/contexts/AuthContext";
import { HistoryTable } from "@/components/HistoryTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  getHardwareAuditLogs,
  clearHardwareAuditLogs,
  exportHardwareAuditToCSV,
  HardwareAuditEntry,
} from "@/lib/hardwareAuditService";
import {
  History,
  Cpu,
  Layers,
  Search,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Wrench,
  Activity,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  Check,
} from "lucide-react";

type HistoryTab = "classification" | "hardware";

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();

  // Tab state: "classification" (Lịch sử phân loại) | "hardware" (Lịch sử test phần cứng)
  const tabParam = searchParams.get("tab");
  const initialTab: HistoryTab =
    tabParam === "hardware" || tabParam === "hardware_test"
      ? "hardware"
      : "classification";
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);

  const dateFilter = searchParams.get("date") || undefined;
  const canDeleteClassification = usePermission("history.delete");
  const canManageHardware = user?.role === "admin" || user?.role === "maintenance";

  const { records, binCounts, handleClearHistory } = useDashboard();

  // Đồng bộ tab khi URL param thay đổi
  useEffect(() => {
    if (tabParam === "hardware" || tabParam === "hardware_test") {
      setActiveTab("hardware");
    } else {
      setActiveTab("classification");
    }
  }, [tabParam]);

  const handleTabChange = (newTab: HistoryTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === "hardware") {
      params.set("tab", "hardware");
    } else {
      params.delete("tab");
    }
    const query = params.toString();
    router.push(`/history${query ? `?${query}` : ""}`, { scroll: false });
  };

  // ==========================================
  // HARDWARE AUDIT LOGS STATE & REAL-TIME SYNC
  // ==========================================
  const [hardwareLogs, setHardwareLogs] = useState<HardwareAuditEntry[]>([]);
  const [hwSearchTerm, setHwSearchTerm] = useState("");
  const [hwCategoryFilter, setHwCategoryFilter] = useState<string>("all");
  const [hwStatusFilter, setHwStatusFilter] = useState<string>("all");
  const [hwCurrentPage, setHwCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isClearHwModalOpen, setIsClearHwModalOpen] = useState(false);

  // Load audit logs on mount & listen to live events from Dashboard dock
  const refreshHardwareLogs = useCallback(() => {
    setHardwareLogs(getHardwareAuditLogs());
  }, []);

  useEffect(() => {
    refreshHardwareLogs();

    const handleLogAdded = () => {
      refreshHardwareLogs();
    };
    const handleLogsCleared = () => {
      refreshHardwareLogs();
    };

    window.addEventListener("sortix_hardware_log_added", handleLogAdded);
    window.addEventListener("sortix_hardware_logs_cleared", handleLogsCleared);

    return () => {
      window.removeEventListener("sortix_hardware_log_added", handleLogAdded);
      window.removeEventListener("sortix_hardware_logs_cleared", handleLogsCleared);
    };
  }, [refreshHardwareLogs]);

  // Thống kê phân loại (Tab 1)
  const classificationStats = useMemo(() => {
    const total = records.length;
    const success = records.filter((r) => r.status === "success").length;
    const error = total - success;
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "100.0";
    return { total, success, error, successRate };
  }, [records]);

  // Thống kê test phần cứng (Tab 2)
  const hardwareStats = useMemo(() => {
    const total = hardwareLogs.length;
    const servoCount = hardwareLogs.filter(
      (l) => l.category === "actuator" || l.action.toLowerCase().includes("servo")
    ).length;
    const buzzerCount = hardwareLogs.filter(
      (l) => l.category === "alarm" || l.action.toLowerCase().includes("còi") || l.action.toLowerCase().includes("buzzer")
    ).length;
    const successCount = hardwareLogs.filter((l) => l.status === "success").length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(0) : "100";
    return { total, servoCount, buzzerCount, successRate };
  }, [hardwareLogs]);

  // Lọc danh sách test phần cứng
  const filteredHardwareLogs = useMemo(() => {
    return hardwareLogs.filter((entry) => {
      const matchSearch =
        hwSearchTerm === "" ||
        entry.action.toLowerCase().includes(hwSearchTerm.toLowerCase()) ||
        entry.actor.toLowerCase().includes(hwSearchTerm.toLowerCase()) ||
        entry.target.toLowerCase().includes(hwSearchTerm.toLowerCase()) ||
        (entry.details && entry.details.toLowerCase().includes(hwSearchTerm.toLowerCase()));

      const matchCategory =
        hwCategoryFilter === "all" || entry.category === hwCategoryFilter;

      const matchStatus =
        hwStatusFilter === "all" || entry.status === hwStatusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [hardwareLogs, hwSearchTerm, hwCategoryFilter, hwStatusFilter]);

  // Phân trang test phần cứng
  const totalHwPages = Math.ceil(filteredHardwareLogs.length / itemsPerPage) || 1;
  const paginatedHardwareLogs = useMemo(() => {
    const start = (hwCurrentPage - 1) * itemsPerPage;
    return filteredHardwareLogs.slice(start, start + itemsPerPage);
  }, [filteredHardwareLogs, hwCurrentPage, itemsPerPage]);

  const handleExportHardwareCsv = () => {
    if (filteredHardwareLogs.length === 0) {
      toast.warning("Không có dữ liệu kiểm thử phần cứng để xuất CSV!");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const success = exportHardwareAuditToCSV(
      filteredHardwareLogs,
      `SortiX_Hardware_Audit_Trail_${today}.csv`
    );
    if (success) {
      toast.success(
        `Đã xuất thành công ${filteredHardwareLogs.length} bản ghi kiểm thử phần cứng ra file CSV!`
      );
    } else {
      toast.error("Xuất file CSV thất bại!");
    }
  };

  const handleConfirmClearHardwareLogs = () => {
    clearHardwareAuditLogs();
    refreshHardwareLogs();
    setIsClearHwModalOpen(false);
    toast.success("Đã xóa toàn bộ nhật ký kiểm toán phần cứng!");
  };

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] w-full flex-col gap-6 pb-8 page-transition-enter">
      {/* HEADER TRANG LỊCH SỬ CHUYÊN DỤNG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-xs shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Lịch sử hệ thống</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeTab === "classification"
                  ? "Tra cứu lịch sử phân loại mẫu vật, bộ lọc theo ngày và xuất báo cáo CSV"
                  : "Nhật ký kiểm toán phần cứng, kiểm thử cơ cấu gạt servo, còi cảnh báo và trạng thái chân GPIO"}
              </p>
            </div>
          </div>
        </div>

        {/* Cụm điều khiển: Chuyển Tab & Nút sang trang Thống kê */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Switcher Segmented Control */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-[#161822] border border-slate-200/80 dark:border-white/[0.08] shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("classification")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "classification"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-[#1E212D] dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Lịch sử phân loại</span>
              <span className="ml-1 rounded-full bg-slate-200/80 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-mono">
                {records.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("hardware")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "hardware"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-[#1E212D] dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Lịch sử test phần cứng</span>
              <span className="ml-1 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.2 text-[10px] font-mono">
                {hardwareLogs.length}
              </span>
            </button>
          </div>

          {/* Quick link sang Thống kê */}
          <Link
            href="/analytics"
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#161822] dark:text-slate-200 dark:hover:bg-white/[0.04] transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Xem Thống kê</span>
            <ArrowUpRight className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LỊCH SỬ PHÂN LOẠI MẪU VẬT                          */}
      {/* ======================================================== */}
      {activeTab === "classification" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Hàng Chip Tóm tắt Phân loại */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs dark:border-white/[0.06] dark:bg-[#161822]">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tổng mẫu đã phân loại
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                  {classificationStats.total}
                </span>
                <span className="text-[10px] text-slate-400">sản phẩm</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 shadow-xs dark:border-emerald-500/15">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Thành công
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {classificationStats.success}
                </span>
                <span className="text-[10px] text-emerald-600/70 font-mono">
                  ({classificationStats.successRate}%)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 shadow-xs dark:border-rose-500/15">
              <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Lỗi / Lạ
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-rose-600 dark:text-rose-400">
                  {classificationStats.error}
                </span>
                <span className="text-[10px] text-rose-600/70">mẫu vật</span>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 shadow-xs dark:border-cyan-500/15">
              <span className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                Sức chứa khay hiện tại
              </span>
              <div className="mt-1 flex items-center gap-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="text-rose-500">K1: {binCounts.bin1}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-blue-500">K2: {binCounts.bin2}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-amber-500">K3: {binCounts.bin3}</span>
              </div>
            </div>
          </div>

          {!canDeleteClassification && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Chỉ có quyền xem và xuất CSV — Xóa lịch sử yêu cầu quyền quản trị viên (Admin)</span>
            </div>
          )}

          {/* Mount HistoryTable Component */}
          <HistoryTable
            records={records}
            onClear={handleClearHistory}
            initialDateFilter={dateFilter}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LỊCH SỬ TEST CÁI PHẦN CỨNG (HARDWARE AUDIT TRAIL)   */}
      {/* ======================================================== */}
      {activeTab === "hardware" && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Hàng Card Thống Kê Test Phần Cứng */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs dark:border-white/[0.06] dark:bg-[#161822]">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tổng lượt test phần cứng
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                  {hardwareStats.total}
                </span>
                <span className="text-[10px] text-slate-400">thao tác</span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 shadow-xs dark:border-indigo-500/15">
              <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Thao tác Servo 1 & 2
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {hardwareStats.servoCount}
                </span>
                <span className="text-[10px] text-indigo-600/70">lượt gạt</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 shadow-xs dark:border-amber-500/15">
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Kiểm thử Còi cảnh báo
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400">
                  {hardwareStats.buzzerCount}
                </span>
                <span className="text-[10px] text-amber-600/70">lượt phát</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 shadow-xs dark:border-emerald-500/15">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Tỷ lệ kiểm thử đạt
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {hardwareStats.successRate}%
                </span>
                <span className="text-[10px] text-emerald-600/70 font-mono">Chuẩn định mức</span>
              </div>
            </div>
          </div>

          {/* Thanh công cụ tìm kiếm, lọc & xuất file cho Test Phần Cứng */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-xs dark:border-white/[0.06] dark:bg-[#161822]">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Ô tìm kiếm */}
              <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm lệnh, người thực hiện, GPIO..."
                  value={hwSearchTerm}
                  onChange={(e) => {
                    setHwSearchTerm(e.target.value);
                    setHwCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Lọc phân loại tải */}
              <select
                value={hwCategoryFilter}
                onChange={(e) => {
                  setHwCategoryFilter(e.target.value);
                  setHwCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <option value="all">Tất cả danh mục tải</option>
                <option value="actuator">Cơ cấu gạt (Servo 1 & 2)</option>
                <option value="sensor">Cảm biến quang (S1-S3)</option>
                <option value="alarm">Còi cảnh báo (Buzzer)</option>
                <option value="system">Hệ thống & MCU ESP32</option>
              </select>

              {/* Lọc trạng thái kết quả */}
              <select
                value={hwStatusFilter}
                onChange={(e) => {
                  setHwStatusFilter(e.target.value);
                  setHwCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <option value="all">Tất cả kết quả</option>
                <option value="success">Thành công</option>
                <option value="warning">Cảnh báo</option>
                <option value="error">Lỗi kiểm thử</option>
              </select>
            </div>

            {/* Các nút hành động: Xuất CSV, Làm mới, Xóa nhật ký */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={refreshHardwareLogs}
                title="Tải lại nhật ký kiểm toán"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

              <button
                type="button"
                onClick={handleExportHardwareCsv}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/20 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất CSV</span>
              </button>

              {canManageHardware && (
                <button
                  type="button"
                  onClick={() => setIsClearHwModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa nhật ký</span>
                </button>
              )}
            </div>
          </div>

          {/* BẢNG KIỂM TOÁN PHẦN CỨNG CHUẨN XÁC THEO ẢNH NGƯỜI DÙNG */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#161822]">
            {/* Header bảng chuẩn ảnh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/[0.06] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Nhật ký kiểm toán & Hoạt động phần cứng (Hardware Audit Trail)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Theo dõi vết kiểm tra vi điều khiển ESP32, kích hoạt van gạt servo và tín hiệu còi
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 self-start sm:self-auto bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-white/[0.06]">
                {filteredHardwareLogs.length} thao tác kỹ thuật gần nhất
              </span>
            </div>

            {/* Khung Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-3 px-4 w-[120px]">Thời gian</th>
                    <th className="py-3 px-4 w-[200px]">Kỹ thuật viên / Tiến trình</th>
                    <th className="py-3 px-4">Lệnh can thiệp</th>
                    <th className="py-3 px-4 w-[240px]">Đối tượng chân GPIO / Mạch</th>
                    <th className="py-3 px-4 text-right w-[120px]">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
                  {paginatedHardwareLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Cpu className="h-8 w-8 opacity-40 text-slate-400" />
                          <p className="text-xs font-semibold">
                            Chưa có dữ liệu kiểm thử phần cứng nào phù hợp với bộ lọc
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setHwSearchTerm("");
                              setHwCategoryFilter("all");
                              setHwStatusFilter("all");
                            }}
                            className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline mt-1"
                          >
                            Xóa điều kiện lọc
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHardwareLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* 1. Thời gian */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        {/* 2. Kỹ thuật viên / Tiến trình */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                log.actor.includes("admin")
                                  ? "bg-cyan-500"
                                  : log.actor.includes("AI") || log.actor.includes("Edge")
                                  ? "bg-purple-500"
                                  : "bg-indigo-500"
                              }`}
                            />
                            <span>{log.actor}</span>
                          </div>
                        </td>

                        {/* 3. Lệnh can thiệp */}
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {log.action}
                          </div>
                          {log.details && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {log.details}
                            </div>
                          )}
                        </td>

                        {/* 4. Đối tượng chân GPIO / Mạch */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-block font-mono text-[11.5px] font-semibold text-cyan-600 dark:text-cyan-400">
                            {log.target}
                          </span>
                        </td>

                        {/* 5. Kết quả */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {log.status === "success" ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span>Thành công</span>
                            </span>
                          ) : log.status === "warning" ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              <span>Cảnh báo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600 dark:text-rose-400">
                              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                              <span>Thất bại</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang bảng test phần cứng */}
            {totalHwPages > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="text-[11px]">
                  Hiển thị{" "}
                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                    {Math.min(
                      (hwCurrentPage - 1) * itemsPerPage + 1,
                      filteredHardwareLogs.length
                    )}
                  </strong>{" "}
                  -{" "}
                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                    {Math.min(hwCurrentPage * itemsPerPage, filteredHardwareLogs.length)}
                  </strong>{" "}
                  trên tổng số{" "}
                  <strong className="font-mono text-slate-700 dark:text-slate-300">
                    {filteredHardwareLogs.length}
                  </strong>{" "}
                  thao tác
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={hwCurrentPage <= 1}
                    onClick={() => setHwCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {hwCurrentPage} / {totalHwPages}
                  </span>
                  <button
                    type="button"
                    disabled={hwCurrentPage >= totalHwPages}
                    onClick={() => setHwCurrentPage((p) => Math.min(totalHwPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear Hardware Logs */}
      <ConfirmDialog
        isOpen={isClearHwModalOpen}
        title="Xác nhận xóa nhật ký kiểm toán phần cứng"
        message="Thao tác này sẽ xóa sạch toàn bộ lịch sử kiểm thử GPIO, van gạt servo và còi cảnh báo đã lưu trên thiết bị. Bạn có chắc chắn muốn xóa không?"
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        onConfirm={handleConfirmClearHardwareLogs}
        onCancel={() => setIsClearHwModalOpen(false)}
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-xs font-medium text-slate-400">
          Đang tải dữ liệu lịch sử...
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}

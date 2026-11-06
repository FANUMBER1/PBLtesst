"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Search,
  ChevronRight,
  Menu,
  Clock,
  Wifi,
  WifiOff,
  X,
  LayoutDashboard,
  Layers,
  BarChart3,
  History,
  SlidersHorizontal,
  Cpu,
  Users,
  FlaskConical,
  Radio,
  ClipboardCheck,
  RefreshCw,
  Info,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
} from "lucide-react";

// Map path → breadcrumb labels
const BREADCRUMB_MAP: Record<string, string> = {
  "/": "Tổng quan",
  "/conveyor": "Băng tải",
  "/analytics": "Thống kê",
  "/history": "Lịch sử",
  "/alerts": "Cảnh báo",
  "/settings": "Cấu hình & Thiết bị",
  "/settings/config": "Cấu hình phân loại",
  "/settings/devices": "Thiết bị & Phần cứng",
  "/users": "Quản lý người dùng",
  "/config": "Cấu hình phân loại",
  "/devices": "Thiết bị & Phần cứng",
};

const SEARCH_LINKS = [
  { label: "Tổng quan", href: "/", icon: LayoutDashboard, group: "Giám sát" },
  { label: "Băng tải", href: "/conveyor", icon: Layers, group: "Giám sát" },
  { label: "Thống kê", href: "/analytics", icon: BarChart3, group: "Dữ liệu" },
  { label: "Lịch sử", href: "/history", icon: History, group: "Dữ liệu" },
  { label: "Cảnh báo hệ thống", href: "/alerts", icon: Bell, group: "Dữ liệu" },
  { label: "Cấu hình phân loại", href: "/settings/config", icon: SlidersHorizontal, group: "Hệ thống" },
  { label: "Thiết bị & Phần cứng", href: "/settings/devices", icon: Cpu, group: "Hệ thống" },
  { label: "Quản lý người dùng", href: "/users", icon: Users, group: "Hệ thống" },
];

interface TopHeaderProps {
  themeMode: "dark" | "light";
  onToggleTheme: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  alertCount?: number;
  onMobileMenuToggle?: () => void;
  mqttStatus?: "connected" | "disconnected" | "error";
  isMqttAlertActive?: boolean;
  reconnectAttempt?: number;
  pingMs?: number;
  isSimulation?: boolean;
  onToggleSimulationMode?: (targetMode?: boolean) => void;
  isDeviceOffline?: boolean;
  onTriggerShiftSummary?: () => void;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  teamName?: string;
  projectName?: string;
  lastUpdated?: string;
  displayDensity?: "compact" | "comfortable";
  onToggleDensity?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const TopHeaderComponent: React.FC<TopHeaderProps> = ({
  themeMode,
  onToggleTheme,
  isMuted,
  onToggleSound,
  alertCount = 0,
  onMobileMenuToggle,
  mqttStatus = "connected",
  isMqttAlertActive = false,
  reconnectAttempt = 0,
  pingMs = 24,
  isSimulation = true,
  onToggleSimulationMode,
  isDeviceOffline = false,
  onTriggerShiftSummary,
  onManualSync,
  isSyncing = false,
  teamName: propTeamName,
  projectName = "SortiX-Med (IoT Phân Loại Y Tế)",
  lastUpdated,
  displayDensity = "comfortable",
  onToggleDensity,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const [teamName, setTeamName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sortix_team_name") || propTeamName || "NHÓM 5";
    }
    return propTeamName || "NHÓM 5";
  });

  const currentPageName = BREADCRUMB_MAP[pathname] || "Tổng quan";

  // Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl + K / Cmd + K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setStatusMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close status menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    if (statusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen]);

  // Filtered links for Command Palette
  const filteredLinks = SEARCH_LINKS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const isRealOnline = !isSimulation && mqttStatus === "connected" && !isMqttAlertActive && !isDeviceOffline;
  const isRealIssue = !isSimulation && (mqttStatus !== "connected" || isMqttAlertActive || isDeviceOffline);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-2 sm:gap-4 border-b border-slate-200/80 bg-white/85 px-3.5 backdrop-blur-md transition-colors dark:border-white/[0.07] dark:bg-[#0E1017]/85 sm:px-5">
        {/* Left Section: Breadcrumb + Chế độ (Mode switch duy nhất) + Trạng thái hệ thống */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
          {/* Mobile Menu Button */}
          {onMobileMenuToggle && (
            <button
              type="button"
              aria-label="Mở danh mục điều hướng"
              onClick={onMobileMenuToggle}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
              {currentPageName}
            </span>
          </div>

          {/* Phân cách */}
          <div className="hidden sm:block h-4 w-[1px] bg-slate-200 dark:bg-white/[0.08]" />

          {/* 1. NÚT CHUYỂN ĐỔI CHẾ ĐỘ DUY NHẤT (Mô phỏng <-> Thực tế) */}
          {onToggleSimulationMode && (
            <div className="flex items-center rounded-full border border-slate-200/90 bg-slate-100/90 p-0.5 dark:border-white/[0.08] dark:bg-[#161822] shadow-2xs shrink-0">
              {/* Nút Mô phỏng */}
              <button
                type="button"
                aria-pressed={isSimulation}
                onClick={() => {
                  if (!isSimulation) onToggleSimulationMode(true);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-xs font-bold transition-all duration-200 ${
                  isSimulation
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs border border-amber-400/50"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Chế độ Mô phỏng (Test Rig): Cho phép nạp phôi ảo và kiểm thử an toàn"
              >
                <FlaskConical className={`h-3.5 w-3.5 ${isSimulation ? "animate-pulse text-slate-950" : ""}`} />
                <span className="hidden xs:inline text-xs">Mô phỏng</span>
              </button>

              {/* Nút Thực tế */}
              <button
                type="button"
                aria-pressed={!isSimulation}
                onClick={() => {
                  if (isSimulation) onToggleSimulationMode(false);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-xs font-bold transition-all duration-200 ${
                  !isSimulation
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xs border border-emerald-400/40"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Chế độ Thực tế: Nhận diện từ Camera và kết nối phần cứng ESP32"
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      !isSimulation ? "bg-emerald-300 shadow-[0_0_6px_#34d399]" : "bg-slate-400 dark:bg-slate-600"
                    }`}
                  />
                </span>
                <Radio className="h-3.5 w-3.5" />
                <span className="hidden xs:inline text-xs">Thực tế</span>
              </button>
            </div>
          )}

          {/* 2. TRẠNG THÁI HỆ THỐNG (HIỂN THỊ TRỰC TIẾP LỖI KHI MẤT KẾT NỐI) */}
          <div className="relative shrink-0" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((prev) => !prev)}
              className={`hidden sm:flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-xs font-bold border transition-all shadow-2xs ${
                isSimulation
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                  : isRealOnline
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                  : "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 animate-pulse"
              }`}
              title="Nhấp để xem chi tiết kết nối MQTT, ESP32 và độ trễ"
            >
              <span className="relative flex h-2 w-2">
                {isRealIssue && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isSimulation
                      ? "bg-amber-500"
                      : isRealOnline
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />
              </span>
              {!isSimulation && (
                <span className="tracking-wide hidden md:inline">
                  {isRealOnline ? `${pingMs}ms` : "Mất kết nối"}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  statusMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Popover Chi tiết Trạng thái Hệ thống */}
            {statusMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl backdrop-blur-md dark:border-white/[0.08] dark:bg-[#161822] z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2 mb-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Trạng thái kết nối
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSimulation
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                        : isRealOnline
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {isSimulation ? "MÔ PHỎNG" : isRealOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* MQTT Status */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                      MQTT Broker:
                    </span>
                    <span className={`font-mono font-bold ${mqttStatus === "connected" ? "text-slate-800 dark:text-slate-200" : "text-rose-600 animate-pulse"}`}>
                      {mqttStatus === "connected" ? `MQTT: ONLINE (${pingMs}ms)` : "MQTT: DISCONNECTED"}
                    </span>
                  </div>

                  {/* ESP32 Hardware */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Radio className="h-3.5 w-3.5 text-indigo-500" />
                      ESP32 Vi điều khiển:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isDeviceOffline
                        ? "Ngoại tuyến"
                        : isSimulation
                        ? "Dữ liệu ảo"
                        : "Đã đồng bộ"}
                    </span>
                  </div>

                  {/* HTTP Telemetry Status */}
                  <div data-testid="http-badge-status" className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Radio className="h-3.5 w-3.5 text-blue-500" />
                      HTTP Đồng Bộ:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      HTTP: POST 5s
                    </span>
                  </div>

                  {/* Team Project Badge */}
                  <div data-testid="team-project-badge" className="flex items-center justify-between text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-white/[0.06] pt-2">
                    <span className="text-slate-500 dark:text-slate-400">Đề tài:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {projectName}
                    </span>
                  </div>

                  {/* Last updated */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/[0.06] pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Cập nhật:
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {lastUpdated || currentTime || "--:--:--"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Cập nhật gần nhất | Báo cáo | Đồng bộ | Tìm kiếm | Bell | Theme | Density | Fullscreen | Audio */}
        <div className="flex items-center gap-1 sm:gap-1.5 2xl:gap-2 shrink-0">
          {/* CẬP NHẬT GẦN NHẤT */}
          <div
            data-testid="telemetry-last-updated"
            className="hidden sm:flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 sm:px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-300 shrink-0"
            title={`Thời gian nhận dữ liệu cập nhật gần nhất từ hệ thống (Cập nhật: ${lastUpdated || currentTime || "--:--:--"})`}
          >
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="sr-only">Cập nhật:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {lastUpdated || currentTime || "--:--:--"}
            </span>
          </div>

          {/* Nút Xem báo cáo 1 ngày làm việc */}
          {onTriggerShiftSummary && (
            <button
              type="button"
              aria-label="Xem báo cáo 1 ngày làm việc & Đồng bộ dữ liệu"
              onClick={onTriggerShiftSummary}
              title="Xem báo cáo 1 ngày làm việc & Đồng bộ dữ liệu"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 transition-all shadow-xs shrink-0"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="sr-only">Báo cáo 1 ngày làm việc</span>
              <span className="hidden sm:inline">Báo cáo</span>
            </button>
          )}

          {/* Nút Đồng bộ dữ liệu tức thời */}
          {onManualSync && (
            <button
              type="button"
              aria-label="Đồng bộ dữ liệu"
              onClick={onManualSync}
              disabled={isSyncing}
              title="Đồng bộ dữ liệu tức thời với máy chủ và thiết bị"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/20 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isSyncing ? "Đang đồng bộ..." : "Đồng bộ"}</span>
            </button>
          )}

          {/* Quick Search Button (Ctrl + K) */}
          <button
            type="button"
            aria-label="Tìm kiếm trong hệ thống (nhấn Ctrl+K hoặc Cmd+K)"
            onClick={() => setSearchOpen(true)}
            title="Tìm kiếm trong hệ thống (Ctrl+K)"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:border-white/10 dark:hover:text-slate-200 shrink-0"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <kbd className="hidden sm:inline-block rounded border border-slate-300/80 bg-white px-1.5 py-0.2 text-[10px] font-mono font-bold text-slate-600 shadow-2xs dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            aria-label={`Xem cảnh báo${alertCount > 0 ? ` (${alertCount} cảnh báo chưa xử lý)` : ""}`}
            onClick={() => router.push("/alerts")}
            title="Xem danh sách cảnh báo"
            className="relative rounded-xl border border-slate-200/80 p-1.5 sm:p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white shrink-0"
          >
            <Bell className="h-4 w-4 shrink-0" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm shadow-rose-500/30">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            aria-label={themeMode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            onClick={onToggleTheme}
            title={themeMode === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
            className="flex items-center justify-center rounded-xl border border-slate-200/80 p-1.5 sm:p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white shrink-0"
          >
            {themeMode === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform shrink-0" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 hover:-rotate-12 transition-transform shrink-0" />
            )}
          </button>

          {/* Display Density Toggle (Compact vs Comfortable) */}
          {onToggleDensity && (
            <button
              type="button"
              aria-label={displayDensity === "compact" ? "Chuyển sang chế độ hiển thị tiêu chuẩn (Mật độ hiển thị)" : "Chuyển sang chế độ hiển thị gọn gàng (Mật độ hiển thị)"}
              onClick={onToggleDensity}
              title={
                displayDensity === "compact"
                  ? "Mật độ hiển thị: Đang ở chế độ Gọn (Compact) - Bấm để chuyển sang Tiêu chuẩn"
                  : "Mật độ hiển thị: Đang ở chế độ Tiêu chuẩn - Bấm để chuyển sang Gọn gàng (Fit màn hình)"
              }
              className="flex items-center justify-center rounded-xl border border-slate-200/80 p-1.5 sm:p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white shrink-0"
            >
              {displayDensity === "compact" ? (
                <Minimize2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <Maximize2 className="h-4 w-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shrink-0" />
              )}
            </button>
          )}

          {/* Fullscreen SCADA Kiosk Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              aria-label={isFullscreen ? "Thoát toàn màn hình SCADA" : "Toàn màn hình SCADA"}
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình SCADA (F11 Kiosk)"}
              className="flex items-center justify-center rounded-xl border border-slate-200/80 p-1.5 sm:p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white shrink-0"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              ) : (
                <Maximize className="h-4 w-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shrink-0" />
              )}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            onClick={onToggleSound}
            title={isMuted ? "Bật âm thanh cơ khí & cảm biến" : "Tắt âm thanh"}
            className="flex items-center justify-center rounded-xl border border-slate-200/80 p-1.5 sm:p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white shrink-0"
          >
            {!isMuted ? (
              <Volume2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />
            )}
          </button>
        </div>
      </header>

      {/* Command Palette Modal (Ctrl + K) */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="relate-card w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl dark:border-white/[0.07] dark:bg-[#161822]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center border-b border-slate-200/80 pb-3 dark:border-white/[0.06]">
              <h2 id="command-palette-title" className="sr-only">Tìm kiếm trong hệ thống</h2>
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Tìm trang hoặc tính năng... (nhấn Esc để đóng)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-100/70 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:bg-[#111319] dark:border dark:border-white/[0.06] dark:text-white"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Xóa nội dung tìm kiếm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300">
                  ESC
                </kbd>
              )}
            </div>

            {/* List results */}
            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {filteredLinks.length > 0 ? (
                filteredLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setSearchOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-400 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {item.group}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Không tìm thấy kết quả phù hợp với &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            <div className="mt-3 border-t border-slate-200/60 pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:border-white/[0.06] dark:text-slate-500">
              <span>Mẹo: Sử dụng phím tắt <kbd className="font-mono">Ctrl + K</kbd> mọi lúc</span>
              <span>SortiX OS</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const TopHeader = React.memo(TopHeaderComponent);

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, usePermission } from "@/contexts/AuthContext";
import { SIDEBAR_MENU } from "@/lib/permissions";
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  History,
  Bell,
  SlidersHorizontal,
  Cpu,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import { ChangePasswordModal } from "@/components/ui/ChangePasswordModal";
import { SortixLogo } from "@/components/ui/SortixLogo";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Layers,
  BarChart3,
  History,
  Bell,
  SlidersHorizontal,
  Cpu,
  Users,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  alertCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  isSimulation?: boolean;
  onToggleSimulationMode?: (targetMode?: boolean) => void;
  mqttStatus?: "connected" | "disconnected" | "error";
  isDeviceOffline?: boolean;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  alertCount = 0,
  mobileOpen = false,
  onCloseMobile,
  isSimulation = false,
  mqttStatus = "connected",
  isDeviceOffline = false,
}) => {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Tự động giải phóng trạng thái pending khi Next.js chuyển route hoàn tất
  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const canViewConfig = usePermission("config.view");
  const canViewDevices = usePermission("devices.view");
  const canViewUsers = usePermission("users.view");

  const permissionCheck = (perm?: string): boolean => {
    if (!perm) return true;
    if (perm === "config.view") return canViewConfig;
    if (perm === "devices.view") return canViewDevices;
    if (perm === "users.view") return canViewUsers;
    return true;
  };

  const isActive = (href: string) => {
    const current = pendingHref || pathname;
    if (href === "/") return current === "/";
    return current.startsWith(href);
  };

  return (
    <>
      <aside
        aria-label="Thanh điều hướng chính"
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[268px]"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } border-slate-200/80 bg-white/95 dark:border-white/[0.06] dark:bg-[#111319] backdrop-blur-xl`}
      >
        {/* Logo Area */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200/80 px-3.5 dark:border-white/[0.06]">
          <Link href="/" className="w-full flex items-center">
            <SortixLogo collapsed={collapsed} />
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Các trang trong hệ thống" className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {SIDEBAR_MENU.map((group) => {
            const visibleItems = group.items.filter((item) =>
              permissionCheck(item.requiredPermission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.groupLabel} className="mb-5">
                {!collapsed && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.groupLabel}
                  </p>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
                    const hasChildren = Boolean(item.children && item.children.length > 0);
                    const isItemActive = hasChildren
                      ? pathname.startsWith("/settings")
                      : isActive(item.href);

                    return (
                      <div key={item.id} className="space-y-1">
                        <Link
                          href={item.href}
                          prefetch={true}
                          onClick={() => {
                            setPendingHref(item.href);
                            onCloseMobile?.();
                          }}
                          title={collapsed ? item.label : undefined}
                          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 border ${
                            isItemActive
                              ? "bg-slate-100 font-bold text-slate-900 shadow-xs border-slate-200/80 dark:bg-[#1E212D] dark:text-white dark:border-white/20 dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.65)]"
                              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-[#161822] dark:hover:text-white"
                          } ${collapsed ? "justify-center px-0" : ""}`}
                        >
                          {isItemActive && (
                            <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-500 dark:bg-cyan-400" />
                          )}
                          <IconComponent
                            className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                              isItemActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                            }`}
                          />
                          {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
                          {!collapsed && item.id === "alerts" && alertCount > 0 && (
                            <span className="ml-auto rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                              {alertCount > 99 ? "99+" : alertCount}
                            </span>
                          )}
                          {collapsed && item.id === "alerts" && alertCount > 0 && (
                            <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#111319]" />
                          )}
                        </Link>

                        {/* Sub-items for nested routes (Settings -> Config & Devices) */}
                        {!collapsed && hasChildren && item.children && (
                          <div className="ml-4 space-y-1 border-l border-slate-200/80 pl-2.5 py-0.5 dark:border-white/[0.08]">
                            {item.children
                              .filter((sub) => permissionCheck(sub.requiredPermission))
                              .map((sub) => {
                                const SubIcon = ICON_MAP[sub.icon] || LayoutDashboard;
                                const isSubActive = pathname === sub.href;
                                return (
                                  <Link
                                    key={sub.id}
                                    href={sub.href}
                                    prefetch={true}
                                    onClick={() => {
                                      setPendingHref(sub.href);
                                      onCloseMobile?.();
                                    }}
                                    className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all border ${
                                      isSubActive
                                        ? "bg-cyan-50 font-bold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-500/30"
                                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-transparent dark:text-slate-400 dark:hover:bg-[#161822] dark:hover:text-white"
                                    }`}
                                  >
                                    <SubIcon
                                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                        isSubActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                      }`}
                                    />
                                    <span className="truncate">{sub.label}</span>
                                  </Link>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-slate-200/80 p-3 dark:border-white/[0.06] space-y-2">
          {/* Trạng thái Hệ thống trực tuyến phản ánh kết nối thực tế */}
          {(() => {
            const isOnlineReal = !isSimulation && mqttStatus === "connected" && !isDeviceOffline;
            const isOfflineReal = !isSimulation && (mqttStatus !== "connected" || isDeviceOffline);

            const dotColor = isSimulation
              ? "bg-amber-500"
              : isOnlineReal
              ? "bg-emerald-500"
              : "bg-rose-500";

            const pingColor = isSimulation ? "bg-amber-400" : isOnlineReal ? "bg-emerald-400" : "bg-rose-400";

            const labelText = isSimulation
              ? "Chế độ mô phỏng"
              : isOnlineReal
              ? "Hệ thống trực tuyến"
              : "Mất kết nối";

            const badgeText = isSimulation ? "SIMULATION" : isOnlineReal ? "ONLINE" : "OFFLINE";

            const badgeStyle = isSimulation
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
              : isOnlineReal
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

            return !collapsed ? (
              <div className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2 border border-slate-200/60 dark:bg-[#161822] dark:border-white/[0.07]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pingColor}`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {labelText}
                  </span>
                </div>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold border shrink-0 ${badgeStyle}`}>
                  {badgeText}
                </span>
              </div>
            ) : (
              <div className="flex justify-center py-1" title={`${labelText} (${badgeText})`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pingColor}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
                </span>
              </div>
            );
          })()}

          {/* User Info & Quick Password Change */}
          {!collapsed && user && (
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/80 p-2.5 dark:border-white/[0.07] dark:bg-[#161822] space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs ${
                    user.role === "admin"
                      ? "bg-indigo-600"
                      : user.role === "maintenance"
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                >
                  {user.role === "admin" ? "AD" : user.role === "maintenance" ? "MT" : "OP"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white" title={user.displayName || user.username}>
                    {user.displayName || user.username}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        user.role === "admin"
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                          : user.role === "maintenance"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                      }`}
                    >
                      {user.role === "admin"
                        ? "Quản trị viên"
                        : user.role === "maintenance"
                        ? "Bảo trì"
                        : "Người dùng"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút Đổi Mật Khẩu */}
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-cyan-600 hover:border-cyan-500/40 dark:border-white/[0.07] dark:bg-[#111319] dark:text-slate-300 dark:hover:text-cyan-400 transition-colors shadow-xs"
              >
                <KeyRound className="h-3 w-3 text-cyan-500" />
                <span>Đổi mật khẩu</span>
              </button>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            type="button"
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.07] dark:bg-[#161822] dark:text-slate-400 dark:hover:bg-[#1E212D] dark:hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Thu gọn thanh bên</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            type="button"
            aria-label="Đăng xuất"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/50 bg-rose-50/60 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Modal Đổi Mật Khẩu */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

export const Sidebar = React.memo(SidebarComponent);

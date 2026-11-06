"use client";

import React, { useState } from "react";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { usePermission } from "@/contexts/AuthContext";
import { AlertEvent, AlertSeverity } from "@/lib/types";
import {
  AlertTriangle,
  Info,
  Trash2,
  ShieldAlert,
  Zap,
  Clock,
  CheckCircle2,
  Download,
  Filter,
} from "lucide-react";
import { exportAlertsToCSV } from "@/lib/exportCsv";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExportDialog } from "@/components/ui/ExportDialog";
import { useToast } from "@/components/ui/Toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: React.FC<{ className?: string }>;
    badgeVariant: "destructive" | "warning" | "default";
    borderClass: string;
    bgClass: string;
    textClass: string;
    label: string;
  }
> = {
  critical: {
    icon: Zap,
    badgeVariant: "destructive",
    borderClass: "border-rose-500/40 dark:border-rose-500/30",
    bgClass: "bg-rose-500/[0.04] dark:bg-rose-950/[0.15]",
    textClass: "text-rose-600 dark:text-rose-400",
    label: "Nghiêm trọng",
  },
  warning: {
    icon: AlertTriangle,
    badgeVariant: "warning",
    borderClass: "border-amber-500/40 dark:border-amber-500/30",
    bgClass: "bg-amber-500/[0.04] dark:bg-amber-950/[0.15]",
    textClass: "text-amber-600 dark:text-amber-400",
    label: "Cảnh báo",
  },
  info: {
    icon: Info,
    badgeVariant: "default",
    borderClass: "border-cyan-500/30 dark:border-cyan-500/20",
    bgClass: "bg-cyan-500/[0.03] dark:bg-cyan-950/[0.10]",
    textClass: "text-cyan-600 dark:text-cyan-400",
    label: "Thông tin",
  },
};

export default function AlertsPage() {
  const { alerts, handleClearAlerts } = useDashboard();
  const toast = useToast();
  const canDelete = usePermission("alerts.delete");

  const [filter, setFilter] = useState<AlertSeverity | "all">("all");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const availableDates = React.useMemo(() => {
    const dates = new Set<string>();
    alerts.forEach((a) => {
      if (a.timestamp) {
        dates.add(new Date(a.timestamp).toISOString().slice(0, 10));
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [alerts]);

  const filteredAlerts = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  const handleExport = (type: "day" | "month" | "all", value?: string) => {
    if (alerts.length === 0) {
      toast.warning("Không có sự cố nào để xuất file!");
      return;
    }

    let filtered: AlertEvent[] = [];
    let filename = "SortiX_CanhBao_ToanBo.csv";

    if (type === "day" && value) {
      filtered = alerts.filter(
        (a) => a.timestamp && new Date(a.timestamp).toISOString().slice(0, 10) === value
      );
      filename = `SortiX_CanhBao_Ngay_${value}.csv`;
    } else if (type === "month" && value) {
      filtered = alerts.filter(
        (a) => a.timestamp && new Date(a.timestamp).toISOString().slice(0, 7) === value
      );
      filename = `SortiX_CanhBao_Thang_${value}.csv`;
    } else {
      filtered = alerts;
    }

    if (filtered.length === 0) {
      toast.warning(`Không có dữ liệu để xuất file!`);
      return;
    }

    const ok = exportAlertsToCSV(filtered, filename);
    if (ok) {
      toast.success(`Đã xuất ${filtered.length} sự kiện cảnh báo ra file CSV!`);
    }
  };

  const executeClearAll = () => {
    handleClearAlerts();
    toast.success("Đã xóa toàn bộ lịch sử cảnh báo thành công!");
  };

  return (
    <div className="space-y-4 page-transition-enter pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Trung tâm Cảnh báo & Sự cố</span>
            <Badge variant="outline" className="font-mono text-xs">
              {alerts.length} Sự kiện
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Giám sát cảnh báo quá nhiệt, kẹt phôi, dừng khẩn cấp và lỗi kết nối vi điều khiển.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc phân loại */}
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 dark:border-white/[0.08] dark:bg-[#111319]">
            {(["all", "critical", "warning", "info"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  filter === sev
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 dark:border-white/20 dark:bg-[#1E212D] dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {sev === "all"
                  ? `Tất cả (${alerts.length})`
                  : sev === "critical"
                  ? `Nghiêm trọng (${severityCounts.critical})`
                  : sev === "warning"
                  ? `Cảnh báo (${severityCounts.warning})`
                  : `Thông tin (${severityCounts.info})`}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={alerts.length === 0}
            className="gap-1.5 font-bold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất CSV</span>
          </Button>

          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
              className="gap-1.5 font-bold shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa tất cả</span>
            </Button>
          )}
        </div>
      </div>

      {!canDelete && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Bạn chỉ có quyền xem cảnh báo — thao tác xóa sự kiện yêu cầu quyền quản trị viên.</span>
        </div>
      )}

      {/* Danh sách Alert Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-slate-200/80 py-16 dark:border-white/[0.08] dark:bg-[#131722]/90">
            <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
            <p className="font-bold text-slate-800 dark:text-white text-base">Hệ thống đang hoạt động an toàn</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Không ghi nhận bất kỳ sự cố hay lỗi cảnh báo nào trong hệ thống.
            </p>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const IconComp = cfg.icon;
            return (
              <Card
                key={alert.event_id}
                className={`flex items-start gap-4 border p-4.5 transition-all shadow-sm ${cfg.borderClass} ${cfg.bgClass}`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl shrink-0 border border-white/10 ${cfg.textClass}`}
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <IconComp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={cfg.badgeVariant} className="text-[10px] uppercase font-bold tracking-wider">
                      {cfg.label}
                    </Badge>
                    <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      {alert.event_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {alert.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-500" />
                      {new Date(alert.timestamp).toLocaleString("vi-VN")}
                    </span>
                    <span>
                      Thiết bị: <strong className="text-slate-700 dark:text-slate-300">{alert.device_id}</strong>
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Xác nhận xóa cảnh báo"
        message={`Bạn có chắc chắn muốn xóa toàn bộ ${alerts.length} sự kiện cảnh báo trong hệ thống? Hành động này không thể hoàn tác.`}
        confirmText="Xóa tất cả"
        cancelText="Hủy bỏ"
        type="danger"
        onConfirm={() => {
          setConfirmClearOpen(false);
          executeClearAll();
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        availableDates={availableDates}
        totalRecords={alerts.length}
      />
    </div>
  );
}

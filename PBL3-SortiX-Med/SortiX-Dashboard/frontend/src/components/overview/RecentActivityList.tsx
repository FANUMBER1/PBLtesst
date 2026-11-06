"use client";

import React from "react";
import Link from "next/link";
import { Package, CheckCircle2, AlertTriangle, ArrowRight, ScanLine } from "lucide-react";
import { ClassificationRecord, CATALOG_BRANDS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RecentActivityListProps {
  records: ClassificationRecord[];
  isSimulation?: boolean;
  onSimulateNewItem?: () => void;
}

export function RecentActivityList({
  records,
  isSimulation = false,
  onSimulateNewItem,
}: RecentActivityListProps) {
  const recentRecords = records.slice(0, 5);

  return (
    <Card className="overflow-hidden border-slate-200/90 dark:border-white/[0.08] dark:bg-[#131722]/95 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-cyan-500" />
            <span>Nhật ký phân loại thời gian thực</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sản phẩm vừa phân loại thành công qua thị giác máy tính YOLOv8 Edge AI
          </p>
        </div>

        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
        >
          <span>Xem tất cả ({records.length} SP)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Bảng 5 sản phẩm tóm tắt */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-3 text-left">STT</th>
              <th className="px-6 py-3 text-left">Sản phẩm Y tế</th>
              <th className="px-6 py-3 text-left">Khay đích</th>
              <th className="px-6 py-3 text-left">Trạng thái</th>
              <th className="px-6 py-3 text-left">Độ tin cậy AI</th>
              <th className="px-6 py-3 text-right">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
            {recentRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                  <Package className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Chưa có sản phẩm trong ca làm việc. Hệ thống đang chờ cảm biến đầu vào.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Khi cảm biến quang điện S1 phát hiện phôi và camera AI phân loại, kết quả sẽ xuất hiện tức thì tại đây.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <Link
                      href="/history"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      <span>Xem lịch sử</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {isSimulation && onSimulateNewItem && (
                      <button
                        type="button"
                        onClick={onSimulateNewItem}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 transition-colors"
                      >
                        Nạp phôi mô phỏng
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              recentRecords.map((rec, idx) => {
                const brand = CATALOG_BRANDS[rec.brand_id];
                const displayId = rec.product_id?.startsWith("#")
                  ? rec.product_id
                  : `#${rec.product_id}`;

                const hasValidConfidence =
                  typeof rec.confidence === "number" &&
                  rec.confidence > 0 &&
                  !isNaN(rec.confidence);
                const confidencePct = hasValidConfidence
                  ? ((rec.confidence as number) * 100).toFixed(1)
                  : null;

                return (
                  <tr
                    key={rec.id}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-400">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-base shadow-sm shrink-0 border border-white/10"
                          style={{
                            background: brand?.color ? `${brand.color}25` : "rgba(6,182,212,0.15)",
                            color: brand?.color || "#06b6d4",
                          }}
                        >
                          {brand?.icon || "📦"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {rec.brand_name || brand?.name || "Vật phẩm y tế"}
                          </p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold font-mono text-xs">
                            {displayId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="outline" className="font-semibold text-xs border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5">
                        {(rec.routed_bin ?? 0) > 0
                          ? `Hướng máng ${rec.routed_bin} (chưa xác minh)`
                          : rec.actual_bin === 0
                            ? "Chưa xác minh"
                            : `Máng ${rec.actual_bin}`}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      {rec.status === "success" ? (
                        <Badge variant="success" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Thành công
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {rec.status === "diverted_default"
                            ? "Mặc định (chưa xác minh)"
                            : rec.status === "held_timeout"
                              ? "Đã giữ, cần kiểm tra"
                              : rec.status === "servo_failed"
                                ? "Lỗi cơ cấu gạt"
                                : rec.status === "unverified"
                                  ? "Chưa xác minh"
                                  : "Cần kiểm tra"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs">
                      {confidencePct ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{confidencePct}%</span>
                          <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full"
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                      {rec.timestamp
                        ? new Date(rec.timestamp).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "--:--:--"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

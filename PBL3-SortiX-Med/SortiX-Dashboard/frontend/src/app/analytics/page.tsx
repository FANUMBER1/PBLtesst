"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { usePermission } from "@/contexts/AuthContext";
import { LiveChart } from "@/components/LiveChart";
import { HistoryTable } from "@/components/HistoryTable";
import { determineTargetBin } from "@/lib/dataProcessor";
import { CATALOG_BRANDS } from "@/lib/types";
import { calculateDailyTotalProduction, getBusinessDateKey, BUSINESS_TIME_ZONE } from "@/lib/history";
import {
  Layers,
  PackageCheck,
  TrendingUp,
  Radio,
  BarChart3,
  PieChart as PieIcon,
  History,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") === "history" ? "history" : "analytics";
  const dateFilter = searchParams.get("date") || undefined;
  const canDelete = usePermission("history.delete");

  const {
    records,
    binCounts,
    routedBinCounts,
    brandCounts,
    throughputHistory,
    isSimulation,
    isRunning,
    conveyorSpeed,
    sorterConfig,
    handleClearHistory,
  } = useDashboard();

  // Tự động chuyển hướng nếu người dùng truy cập ?tab=history sang trang /history chuyên dụng
  React.useEffect(() => {
    if (searchParams.get("tab") === "history") {
      router.replace("/history?tab=classification");
    }
  }, [searchParams, router]);


  // Tổng số sản phẩm đã phân loại tích lũy trong ngày (không bị sụt giảm khi dọn khay)
  const totalSorted = useMemo(() => {
    return calculateDailyTotalProduction(records, binCounts);
  }, [records, binCounts]);

  // DỮ LIỆU BIỂU ĐỒ TRÒN CƠ CẤU SẢN PHẨM & KHAY CHỨA (BRAND SHARE DONUT CHART)
  const brandKeys = Object.keys(CATALOG_BRANDS);

  // Tổng số sản phẩm đã phân loại (theo nhãn hàng) - Dùng cho biểu đồ cơ cấu để đảm bảo luôn = 100%
  const totalBrands = useMemo(() => {
    return brandKeys.reduce((sum, key) => sum + (brandCounts[key] || 0), 0);
  }, [brandCounts, brandKeys]);

  const donutData = useMemo(() => {
    return brandKeys.map((key) => {
      const brand = CATALOG_BRANDS[key];
      const count = brandCounts[key] || 0;
      const percent = totalBrands > 0 ? Number(((count / totalBrands) * 100).toFixed(1)) : 0;
      return {
        key,
        name: brand.name,
        code: brand.code,
        count,
        percent,
        color: brand.color,
      };
    }).filter(item => item.count > 0 || brandKeys.length <= 4); // Hide empty brands if there are many
  }, [brandCounts, totalBrands, brandKeys]);

  // 3. DỮ LIỆU BIỂU ĐỒ CỘT PHÂN BỐ THEO KHUNG GIỜ (HOURLY PRODUCTION BAR CHART)
  const hourlyData = useMemo(() => {
    const todayKey = getBusinessDateKey();

    const getHourInBusinessTz = (d: Date): number => {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: BUSINESS_TIME_ZONE,
          hour: "2-digit",
          hour12: false,
        }).formatToParts(d);
        const val = parts.find((p) => p.type === "hour")?.value;
        return val !== undefined ? parseInt(val, 10) : d.getHours();
      } catch {
        return d.getHours();
      }
    };

    const nowHourNum = getHourInBusinessTz(new Date());
    const nowHourStr = `${String(nowHourNum).padStart(2, "0")}:00`;

    // Đếm số sản phẩm thực tế phân bổ từ records hôm nay
    const hourMap: Record<string, number> = {};
    let recordedCountToday = 0;

    records.forEach((r) => {
      if (!r || !r.timestamp) return;
      if (r.status === "rejected" || r.status === "jammed") return;

      const rDateKey = getBusinessDateKey(r.timestamp);
      if (rDateKey !== todayKey) return;

      const date = new Date(r.timestamp);
      if (isNaN(date.getTime())) return;

      const h = getHourInBusinessTz(date);
      const hStr = `${String(h).padStart(2, "0")}:00`;
      hourMap[hStr] = (hourMap[hStr] || 0) + 1;
      recordedCountToday++;
    });

    if (totalSorted > recordedCountToday) {
      const diff = totalSorted - recordedCountToday;
      hourMap[nowHourStr] = (hourMap[nowHourStr] || 0) + diff;
    }

    const activeHours = Object.keys(hourMap).map(h => parseInt(h));
    const minHour = activeHours.length > 0 ? Math.min(...activeHours, 8) : 8;
    const maxHour = activeHours.length > 0 ? Math.max(...activeHours, nowHourNum) : Math.max(17, nowHourNum);
    
    const allHours = [];
    for (let i = minHour; i <= maxHour; i++) {
      allHours.push(`${String(i).padStart(2, "0")}:00`);
    }

    return allHours.map((hour) => {
      const count = hourMap[hour] || 0;
      const isCurrentHour = hour === nowHourStr;

      return {
        hour,
        count,
        isCurrentHour,
      };
    });
  }, [records, totalSorted]);

  // Tìm khung giờ đạt đỉnh sản lượng thực tế
  const peakHour = useMemo(() => {
    if (hourlyData.length === 0) return { hour: "08:00", count: 0 };
    const sorted = [...hourlyData].sort((a, b) => b.count - a.count);
    if (sorted[0] && sorted[0].count > 0) return sorted[0];
    const current = hourlyData.find((h) => h.isCurrentHour);
    return current || sorted[0] || { hour: "08:00", count: 0 };
  }, [hourlyData]);

  // 4. BẢNG MA TRẬN PHÂN BỐ SẢN PHẨM THEO KHAY (PRODUCT ALLOCATION MATRIX)
  const getBinDetails = (binId: number) => {
    // Generate dynamic names based on configured brands for the bin
    const binBrands = sorterConfig.bins.find((rule) => rule.bin_id === binId)?.brand_ids || [];
    const brandNames = binBrands.length > 0 
      ? binBrands.map(b => CATALOG_BRANDS[b]?.name).join(", ")
      : "Trống";

    switch (binId) {
      case 1:
        return {
          binId: 1,
          name: `Khay 1: ${brandNames}`,
          route: `Servo ${sorterConfig.servo_routes?.["1"]?.io || "GPIO6"} • Góc ${sorterConfig.servo_routes?.["1"]?.angle ?? 45}°`,
          badgeStyle: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
          dot: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
        };
      case 2:
        return {
          binId: 2,
          name: `Khay 2: ${brandNames}`,
          route: `Servo ${sorterConfig.servo_routes?.["2"]?.io || "GPIO7"} • Góc ${sorterConfig.servo_routes?.["2"]?.angle ?? 45}°`,
          badgeStyle: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
          dot: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
        };
      case 3:
      default:
        return {
          binId: 3,
          name: "Khay 3 (Đi thẳng - Mặc định)",
          route: "Thoát tự do cuối line",
          badgeStyle: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
          dot: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
        };
    }
  };

  // Tính độ tin cậy AI trung bình theo từng thương hiệu
  const getAverageConfidence = (brandKey: string) => {
    const brandRecords = records.filter((r) => r.brand_id === brandKey && r.status === "success");
    if (brandRecords.length > 0) {
      const sum = brandRecords.reduce((acc, curr) => acc + curr.confidence, 0);
      return (sum / brandRecords.length) * 100;
    }
    return null; // Don't fake data
  };

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] w-full flex-col gap-6 pb-8 page-transition-enter">
      {/* HEADER TRANG THỐNG KÊ CHUYÊN SÂU */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-xs shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Thống kê</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Giám sát lưu lượng phân loại, sản lượng theo giờ và phân bổ khay chứa
            </p>
          </div>
        </div>

        {/* Nút điều hướng sang trang Lịch sử chuyên dụng */}
        <div className="flex items-center gap-2">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-[#161822] dark:text-slate-200 dark:hover:bg-white/[0.04] transition-all shadow-xs"
          >
            <History className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Xem Lịch sử hệ thống (2 Tab)</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>


      {currentTab === "history" ? (
        <div className="min-h-[calc(100vh-12rem)] w-full flex flex-col pb-4 animate-in fade-in duration-200">
          {!canDelete && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Chỉ có quyền xem và xuất CSV — Xóa lịch sử yêu cầu quyền quản trị viên</span>
            </div>
          )}
          <HistoryTable
            records={records}
            onClear={handleClearHistory}
            initialDateFilter={dateFilter}
          />
        </div>
      ) : (
        <>
          {/* KHỐI 1: LƯỚI BIỂU ĐỒ THỜI GIAN THỰC CHUYÊN SÂU */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* CỘT 1 (2/3 chiều rộng): BIỂU ĐỒ LƯU LƯỢNG THỜI GIAN THỰC (AREA CHART) */}
        <div className="xl:col-span-2 min-h-[380px]">
          <LiveChart
            data={throughputHistory}
            brandCounts={brandCounts}
            binCounts={binCounts}
            conveyorSpeed={conveyorSpeed}
            isRunning={isRunning}
            totalSorted={totalSorted}
          />
        </div>

        {/* CỘT 2 (1/3 chiều rộng): BIỂU ĐỒ TRÒN CƠ CẤU SẢN PHẨM & KHAY CHỨA (BRAND SHARE DONUT CHART) */}
        <div className="relate-card relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#161822]">
          <div>
            {/* Header Donut */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <PieIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    Cơ cấu sản phẩm
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tỷ lệ theo nhãn sản phẩm
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                {brandKeys.length} nhãn
              </span>
            </div>

            {/* Donut Chart Container với tâm hiển thị tổng số sản phẩm */}
            <div className="relative mt-4 flex items-center justify-center h-[210px] w-full">
              {/* Nhãn chính giữa tâm Donut: {totalBrands} Sản Phẩm */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {totalBrands}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Sản phẩm
                </span>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#161822]/95 min-w-[140px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-xs space-y-0.5 font-semibold">
                              <p className="text-slate-500 dark:text-slate-400">
                                Số lượng:{" "}
                                <strong className="text-slate-900 dark:text-white font-mono">
                                  {item.count} SP
                                </strong>
                              </p>
                              <p className="text-cyan-600 dark:text-cyan-400">
                                Tỷ lệ:{" "}
                                <strong className="font-mono">{item.percent}%</strong>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        stroke="#161822"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Danh sách 4 loại sản phẩm chi tiết */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {donutData.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs dark:border-white/[0.05] dark:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-1 text-[11px]">
                    {item.count} SP ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
            {[1, 2, 3].map((bin) => (
              <div key={bin}>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Hướng tới Khay {bin}</div>
                <div className="font-mono text-lg font-bold text-cyan-700 dark:text-cyan-300">
                  {routedBinCounts[`bin${bin}` as "bin1" | "bin2" | "bin3"]}
                </div>
                <div className="text-[9px] text-slate-400">
                  {isSimulation ? "lượt mô phỏng" : "lượt, chưa xác minh vào khay"}
                </div>
              </div>
            ))}
          </div>

          {/* Footer tóm tắt tỷ trọng khay */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Khay 1 (Đỏ) • Khay 2 (Xanh)</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              {(() => {
                const b1 = routedBinCounts.bin1 || 0;
                const b2 = routedBinCounts.bin2 || 0;
                if (b1 === 0 && b2 === 0) return "Chưa có lượt";
                const balance = ((Math.min(b1, b2) / Math.max(b1, b2)) * 100).toFixed(0);
                return `${balance}% Cân bằng`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* KHỐI 3: BIỂU ĐỒ CỘT PHÂN BỐ THEO KHUNG GIỜ (HOURLY PRODUCTION BAR CHART) */}
      <div className="relate-card rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#161822]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Sản lượng theo giờ
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Theo dõi phân bổ sản lượng theo từng giờ trong ca
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
              <span>Đỉnh sản lượng:</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {peakHour.hour} ({peakHour.count} SP)
              </span>
            </div>
          </div>
        </div>

        {/* Biểu đồ BarChart Recharts */}
        <div className="mt-4 h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#334155", opacity: 0.2 }}
                dy={6}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, (dataMax: number) => Math.max(10, Math.ceil((dataMax + 2) / 5) * 5)]}
                unit=" SP"
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const isPeak = peakHour.count > 0 && item.hour === peakHour.hour;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#161822]/95 min-w-[160px]">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 mb-1.5 dark:border-white/[0.08]">
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-white flex items-center gap-1">
                            ⏰ Khung giờ: {item.hour}
                          </span>
                          {isPeak && (
                            <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/20">
                              ĐỈNH CA
                            </span>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-slate-600 dark:text-slate-300 flex items-center justify-between">
                            <span>Sản lượng thực tế:</span>
                            <strong className="font-mono text-sm text-cyan-600 dark:text-cyan-400">
                              {item.count} SP
                            </strong>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" name="Sản lượng (SP)" radius={[6, 6, 0, 0]} minPointSize={4}>
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(val: unknown) => (typeof val === "number" && val > 0 ? `${val} SP` : "")}
                  className="fill-slate-700 dark:fill-slate-200 text-[10px] font-bold font-mono"
                />
                {hourlyData.map((entry) => {
                  const isPeak = peakHour.count > 0 && entry.hour === peakHour.hour;
                  return (
                    <Cell
                      key={`bar-${entry.hour}`}
                      fill={isPeak ? "#06B6D4" : entry.isCurrentHour ? "#3B82F6" : "#6366F1"}
                      opacity={isPeak ? 1 : 0.75}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chú thích biểu đồ giờ */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
              <span>Khung giờ cao điểm nhất</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500 opacity-75" />
              <span>Sản lượng theo giờ</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Tổng sản lượng ghi nhận ca hôm nay: <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{totalSorted} SP</strong>
          </span>
        </div>
      </div>

      {/* KHỐI 4: BẢNG MA TRẬN PHÂN BỐ SẢN PHẨM THEO KHAY (PRODUCT ALLOCATION MATRIX) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/[0.06] dark:bg-[#161822]">
        {/* Header Ma trận */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-xs shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Phân bổ theo khay
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Phân bổ sản phẩm theo từng khay chứa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <PackageCheck className="h-3.5 w-3.5 text-cyan-500" />
              <span>Tổng cộng:</span>
              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                {totalSorted} SP
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Đồng bộ ESP32</span>
            </div>
          </div>
        </div>

        {/* Bảng chi tiết 5 cột theo yêu cầu người dùng */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-4">Sản phẩm</th>
                <th className="py-3 px-4">Khay đích</th>
                <th className="py-3 px-4 text-center">Số lượng</th>
                <th className="py-3 px-4">Tỷ lệ</th>
                <th className="py-3 px-4 text-right">Độ tin cậy AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
              {brandKeys.map((brandKey) => {
                const brand = CATALOG_BRANDS[brandKey];
                const targetBin = determineTargetBin(brandKey, sorterConfig);
                const count = brandCounts[brandKey] || 0;
                
                // Hide if count is 0 and we have many brands
                if (count === 0 && brandKeys.length > 4) return null;

                const percentage =
                  totalBrands > 0 ? ((count / totalBrands) * 100).toFixed(1) : "0.0";
                const binInfo = getBinDetails(targetBin);
                const packaging = {
                  type: brand.packaging || "Bao bì không xác định",
                  icon: brand.icon || "📦",
                };
                /* const legacyPackaging = brandPackaging[brandKey] || {
                  type: brand.name.includes("Chai") ? "Chai nhựa tiêu chuẩn" : "Lon tiêu chuẩn",
                  icon: "📦",
                }; */
                
                const rawConfidence = getAverageConfidence(brandKey);
                const aiConfidence = rawConfidence !== null ? `${rawConfidence.toFixed(1)}%` : "--";

                return (
                  <tr
                    key={brandKey}
                    className="group hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Cột 1: Tên sản phẩm & Icon nhận diện */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black shrink-0 shadow-xs transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${brand.color}18`,
                            border: `1.5px solid ${brand.color}40`,
                          }}
                        >
                          <span>{packaging.icon}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                            <span>{brand.name}</span>
                            <span
                              className="rounded px-1.5 py-0.2 text-[10px] font-mono font-bold"
                              style={{
                                backgroundColor: `${brand.color}20`,
                                color: brand.color,
                              }}
                            >
                              {brand.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {packaging.type} • ID: {brand.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Khay phân loại đích */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold ${binInfo.badgeStyle}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${binInfo.dot}`} />
                            {binInfo.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {binInfo.route}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Số lượng đã phân loại thành công */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-baseline gap-1">
                        <span
                          className="font-mono text-xl font-black"
                          style={{ color: brand.color }}
                        >
                          {count}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          SP
                        </span>
                      </div>
                    </td>

                    {/* Cột 4: Tỷ lệ phần trăm (% progress bar) */}
                    <td className="py-3.5 px-4">
                      <div className="w-48 max-w-full space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {percentage}%
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {count}/{totalBrands} SP
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: brand.color,
                              boxShadow: `0 0 8px ${brand.color}80`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cột 5: Độ tin cậy AI trung bình */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {aiConfidence}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          YOLOv8 Edge
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chú thích chân bảng ma trận */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <Radio className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <span>
              Luật phân nhánh được đồng bộ qua topic MQTT{" "}
              <code className="rounded bg-slate-100 dark:bg-white/5 px-1 py-0.5 font-mono text-cyan-600 dark:text-cyan-400">
                sorter/sorter_01/config/set
              </code>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Khay 1:{" "}
              <strong className="text-slate-700 dark:text-slate-200">{binCounts.bin1} SP</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Khay 2:{" "}
              <strong className="text-slate-700 dark:text-slate-200">{binCounts.bin2} SP</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Khay 3:{" "}
              <strong className="text-slate-700 dark:text-slate-200">{binCounts.bin3} SP</strong>
            </span>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-xs font-medium text-slate-400">
          Đang tải dữ liệu thống kê...
        </div>
      }
    >
      <AnalyticsPageContent />
    </Suspense>
  );
}

import { ClassificationRecord } from "@shared/types";
import { queryClassificationHistory } from "./historyService";

export interface SorterStats {
  totalSorted: number;
  successCount: number;
  successRate: number; // 0 - 100%
  divertedCount: number;
  rejectedCount: number;
  jammedCount: number;
  binBreakdown: { bin1: number; bin2: number; bin3: number };
  brandBreakdown: Record<string, number>;
}

export function computeStatsFromRecords(records: ClassificationRecord[]): SorterStats {
  const total = records.length;
  let successCount = 0;
  let divertedCount = 0;
  let rejectedCount = 0;
  let jammedCount = 0;

  const binBreakdown = { bin1: 0, bin2: 0, bin3: 0 };
  const brandBreakdown: Record<string, number> = {};

  for (const r of records) {
    if (r.status === "success") successCount++;
    else if (r.status === "diverted_default") divertedCount++;
    else if (r.status === "rejected") rejectedCount++;
    else if (r.status === "jammed") jammedCount++;

    if (r.actual_bin === 1) binBreakdown.bin1++;
    else if (r.actual_bin === 2) binBreakdown.bin2++;
    else if (r.actual_bin === 3) binBreakdown.bin3++;

    const brand = r.brand_id || "unknown";
    brandBreakdown[brand] = (brandBreakdown[brand] || 0) + 1;
  }

  const successRate = total > 0 ? Math.round((successCount / total) * 1000) / 10 : 100;

  return {
    totalSorted: total,
    successCount,
    successRate,
    divertedCount,
    rejectedCount,
    jammedCount,
    binBreakdown,
    brandBreakdown,
  };
}

export function getSystemStats(): SorterStats {
  const { data } = queryClassificationHistory({ limit: 1000, offset: 0 });
  return computeStatsFromRecords(data);
}

// Quản lý lưu trữ dữ liệu lịch sử vào LocalStorage phân tách 2 chế độ: Mô phỏng và Thực tế
import { ClassificationRecord, AlertEvent, SorterConfig } from "./types";

export const STORAGE_KEYS = {
  MODE: "pbl3_operating_mode", // "sim" | "real"
  SIM_RECORDS: "pbl3_sim_records",
  SIM_BIN_COUNTS: "pbl3_sim_bin_counts",
  SIM_BIN_CAPACITIES: "pbl3_sim_bin_capacities",
  REAL_RECORDS: "pbl3_real_records",
  REAL_BIN_COUNTS: "pbl3_real_bin_counts",
  REAL_BIN_CAPACITIES: "pbl3_real_bin_capacities",
  LEGACY_RECORDS: "pbl3_sorter_records_v1",
  ALERTS: "pbl3_sorter_alerts_v1",
  CONFIG: "pbl3_sorter_config_v1",
} as const;

export interface BinCounts {
  bin1: number;
  bin2: number;
  bin3: number;
}

export interface BinCapacities {
  bin1: number;
  bin2: number;
  bin3: number;
}

const MAX_RECORDS = 500;
const MAX_ALERTS = 100;

function isRecord(value: unknown): value is ClassificationRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ClassificationRecord>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 200
    && typeof item.product_id === "string" && typeof item.brand_id === "string"
    && typeof item.brand_name === "string" && Number.isFinite(item.confidence)
    && Number.isFinite(item.target_bin) && Number.isFinite(item.actual_bin)
    && (item.routed_bin === undefined || (Number.isInteger(item.routed_bin) && item.routed_bin >= 0 && item.routed_bin <= 3))
    && ["success", "diverted_default", "rejected", "jammed", "unverified", "held_timeout", "servo_failed"].includes(item.status ?? "")
    && typeof item.timestamp === "string";
}

function cloneDefaultConfig(): SorterConfig {
  return {
    ...DEFAULT_INITIAL_CONFIG,
    bins: DEFAULT_INITIAL_CONFIG.bins.map((bin) => ({ ...bin, brand_ids: [...bin.brand_ids] })),
    timestamp: new Date().toISOString(),
  };
}

export const DEFAULT_INITIAL_CONFIG: SorterConfig = {
  schema_version: 1,
  config_version: 1,
  device_id: "sorter_01",
  catalog_version: "catalog_01",
  bins: [
    { bin_id: 1, brand_ids: ["med_syringe"] }, // Khay 1: Bơm kim tiêm / Dao mổ
    { bin_id: 2, brand_ids: ["med_forceps", "med_scissors"] }, // Khay 2: Kẹp phẫu thuật & Kéo phẫu thuật
  ],
  default_bin: 3, // Khay 3: Mặc định (Vật tư y tế, Lọ thuốc / Ống nghiệm hoặc vật phẩm khác)
  apply_mode: "when_line_empty",
  timestamp: new Date().toISOString(),
};

/**
 * Đọc chế độ vận hành đang lưu trữ ('sim' | 'real')
 * @returns true nếu là Mô phỏng, false nếu là Thực tế
 */
export function loadOperatingMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE);
    if (saved === null) return false;
    return saved === "sim";
  } catch {
    return false;
  }
}

/**
 * Lưu chế độ vận hành vào LocalStorage
 */
export function saveOperatingMode(isSim: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.MODE, isSim ? "sim" : "real");
  } catch (err) {
    console.warn("Lỗi lưu operating mode:", err);
  }
}

function countRecordsByBin(records: ClassificationRecord[]): BinCounts {
  const counts: BinCounts = { bin1: 0, bin2: 0, bin3: 0 };
  records.forEach((record) => {
    if (record.actual_bin === 1) counts.bin1++;
    else if (record.actual_bin === 2) counts.bin2++;
    else if (record.actual_bin === 3) counts.bin3++;
  });
  counts.bin1 = Math.min(counts.bin1, 50);
  counts.bin2 = Math.min(counts.bin2, 50);
  counts.bin3 = Math.min(counts.bin3, 50);
  return counts;
}

/**
 * Lấy danh sách lịch sử phân loại theo chế độ (Mô phỏng hoặc Thực tế)
 */
export function loadClassificationHistory(isSim: boolean = true): ClassificationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const key = isSim ? STORAGE_KEYS.SIM_RECORDS : STORAGE_KEYS.REAL_RECORDS;
    let raw = localStorage.getItem(key);
    const isLegacy = isSim && raw === null;
    // Nếu là chế độ Mô phỏng và chưa có key sim mới, kiểm tra key cũ để tương thích ngược
    if (isLegacy) raw = localStorage.getItem(STORAGE_KEYS.LEGACY_RECORDS);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const records = parsed.filter(isRecord).slice(0, MAX_RECORDS);
    if (!isSim) return records;

    // Loại dữ liệu mẫu được phiên bản cũ tự tạo, giữ lịch sử người dùng đã chạy.
    const retained = records.filter((record) => !/^seed_(today|yest|2days)_\d+$/.test(record.id));
    if (retained.length !== records.length) {
      const counts = countRecordsByBin(retained);
      const cached = localStorage.getItem(STORAGE_KEYS.SIM_BIN_COUNTS);
      if (cached) {
        try {
          const previous = JSON.parse(cached) as Partial<BinCounts>;
          // Không tăng lại bộ đếm của khay mà người dùng đã dọn trước đó.
          for (const bin of ["bin1", "bin2", "bin3"] as const) {
            const value = Number(previous?.[bin]);
            if (Number.isFinite(value)) counts[bin] = Math.max(0, Math.min(value, counts[bin]));
          }
        } catch {
          // Cache hỏng: dùng bộ đếm tính từ lịch sử còn hợp lệ.
        }
      }
      localStorage.setItem(STORAGE_KEYS.SIM_BIN_COUNTS, JSON.stringify(counts));
    }
    if (isLegacy || retained.length !== records.length) {
      localStorage.setItem(STORAGE_KEYS.SIM_RECORDS, JSON.stringify(retained));
      if (isLegacy) localStorage.removeItem(STORAGE_KEYS.LEGACY_RECORDS);
    }
    return retained;
  } catch (err) {
    console.warn("Lỗi đọc LocalStorage records:", err);
    return [];
  }
}

/**
 * Lưu một bản ghi phân loại vào chế độ tương ứng (Mô phỏng hoặc Thực tế)
 */
export function saveClassificationRecord(
  record: ClassificationRecord,
  isSim: boolean = true
): ClassificationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const key = isSim ? STORAGE_KEYS.SIM_RECORDS : STORAGE_KEYS.REAL_RECORDS;
    const existing = loadClassificationHistory(isSim);
    const updated = [record, ...existing].slice(0, MAX_RECORDS);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Lỗi ghi LocalStorage records:", err);
    return [];
  }
}

/** Lưu nhiều bản ghi cùng lúc, dùng cho thao tác tạo dữ liệu demo. */
export function saveClassificationRecordsLocal(
  records: ClassificationRecord[],
  isSim: boolean = true
): ClassificationRecord[] {
  if (typeof window === "undefined") return [];
  if (records.length === 0) return loadClassificationHistory(isSim);

  try {
    const key = isSim ? STORAGE_KEYS.SIM_RECORDS : STORAGE_KEYS.REAL_RECORDS;
    const existing = loadClassificationHistory(isSim);
    const updated = [...records, ...existing].slice(0, MAX_RECORDS);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Lỗi ghi danh sách LocalStorage records:", err);
    return [];
  }
}

/**
 * Lấy số lượng từng khay theo chế độ độc lập
 */
export function loadBinCountsLocal(isSim: boolean = true): BinCounts {
  const defaultCounts: BinCounts = { bin1: 0, bin2: 0, bin3: 0 };
  if (typeof window === "undefined") return defaultCounts;

  try {
    const key = isSim ? STORAGE_KEYS.SIM_BIN_COUNTS : STORAGE_KEYS.REAL_BIN_COUNTS;
    // Dọn dữ liệu mẫu cũ trước khi đọc bộ đếm đã lưu.
    const records = loadClassificationHistory(isSim);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const safeCount = (value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.min(Math.floor(n), 50)) : 0;
      };
      return {
        bin1: safeCount(parsed.bin1),
        bin2: safeCount(parsed.bin2),
        bin3: safeCount(parsed.bin3),
      };
    }

    // Nếu chưa có cache số lượng khay, tự động tính từ lịch sử của chế độ đó
    // Đảm bảo không quá 50 khi tính từ lịch sử
    const computed = countRecordsByBin(records);
    localStorage.setItem(key, JSON.stringify(computed));
    return computed;
  } catch (err) {
    console.warn("Lỗi đọc LocalStorage bin counts:", err);
    return defaultCounts;
  }
}

/**
 * Lưu số lượng khay theo chế độ độc lập
 */
export function saveBinCountsLocal(counts: BinCounts, isSim: boolean = true): void {
  if (typeof window === "undefined") return;
  try {
    const key = isSim ? STORAGE_KEYS.SIM_BIN_COUNTS : STORAGE_KEYS.REAL_BIN_COUNTS;
    localStorage.setItem(key, JSON.stringify(counts));
  } catch (err) {
    console.warn("Lỗi ghi LocalStorage bin counts:", err);
  }
}

/**
 * Lấy sức chứa định mức từng khay (mặc định 50, tùy chỉnh 5 - 50 SP)
 */
export function loadBinCapacitiesLocal(isSim: boolean = true): BinCapacities {
  const defaultCapacities: BinCapacities = { bin1: 50, bin2: 50, bin3: 50 };
  if (typeof window === "undefined") return defaultCapacities;

  try {
    const key = isSim ? STORAGE_KEYS.SIM_BIN_CAPACITIES : STORAGE_KEYS.REAL_BIN_CAPACITIES;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const safeCapacity = (value: unknown) => {
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? Math.max(5, Math.min(Math.floor(n), 50)) : 50;
      };
      return {
        bin1: safeCapacity(parsed.bin1),
        bin2: safeCapacity(parsed.bin2),
        bin3: safeCapacity(parsed.bin3),
      };
    }
    return defaultCapacities;
  } catch (err) {
    console.warn("Lỗi đọc LocalStorage bin capacities:", err);
    return defaultCapacities;
  }
}

/**
 * Lưu sức chứa định mức khay
 */
export function saveBinCapacitiesLocal(capacities: BinCapacities, isSim: boolean = true): void {
  if (typeof window === "undefined") return;
  try {
    const key = isSim ? STORAGE_KEYS.SIM_BIN_CAPACITIES : STORAGE_KEYS.REAL_BIN_CAPACITIES;
    localStorage.setItem(key, JSON.stringify(capacities));
  } catch (err) {
    console.warn("Lỗi ghi LocalStorage bin capacities:", err);
  }
}

/**
 * Tăng số lượng khay khi phân loại xong một sản phẩm
 */
export function updateBinCountsLocal(actualBin: number, isSim: boolean = true): BinCounts {
  const current = loadBinCountsLocal(isSim);
  const updated: BinCounts = {
    bin1: actualBin === 1 ? Math.min(current.bin1 + 1, 50) : current.bin1,
    bin2: actualBin === 2 ? Math.min(current.bin2 + 1, 50) : current.bin2,
    bin3: actualBin === 3 ? Math.min(current.bin3 + 1, 50) : current.bin3,
  };
  saveBinCountsLocal(updated, isSim);
  return updated;
}

/**
 * Tính toán số lượng theo từng thương hiệu theo chế độ
 */
export function loadBrandCountsLocal(isSim: boolean = true): Record<string, number> {
  const brCounts: Record<string, number> = {
    med_syringe: 0,
    med_forceps: 0,
    med_scissors: 0,
    med_vial: 0,
  };
  const aliasMap: Record<string, string> = {
    brand_c: "med_syringe",
    brand_a: "med_forceps",
    brand_b: "med_scissors",
    brand_d: "med_vial",
  };
  const records = loadClassificationHistory(isSim);
  records.forEach((r) => {
    const brandKey = aliasMap[r.brand_id] || r.brand_id;
    if (brCounts[brandKey] !== undefined) {
      brCounts[brandKey]++;
    } else {
      brCounts[brandKey] = 1;
    }
  });
  return brCounts;
}

/**
 * Xóa lịch sử phân loại:
 * Nếu isSim truyền vào, chỉ xóa đúng chế độ đó.
 * Nếu không truyền, xóa cả hai chế độ.
 */
export function clearClassificationHistory(isSim?: boolean): void {
  if (typeof window === "undefined") return;

  if (isSim === true || isSim === undefined) {
    localStorage.removeItem(STORAGE_KEYS.SIM_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.SIM_BIN_COUNTS);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_RECORDS);
  }
  if (isSim === false || isSim === undefined) {
    localStorage.removeItem(STORAGE_KEYS.REAL_RECORDS);
    localStorage.removeItem(STORAGE_KEYS.REAL_BIN_COUNTS);
  }
}

export function saveAlertHistory(alert: AlertEvent): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadAlertHistory();
    if (existing.some((e) => e.event_id === alert.event_id)) return;
    const updated = [alert, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updated));
  } catch (err) {
    console.warn("Lỗi ghi LocalStorage alerts:", err);
  }
}

export function loadAlertHistory(): AlertEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is AlertEvent => {
      if (!value || typeof value !== "object") return false;
      const item = value as Partial<AlertEvent>;
      return typeof item.event_id === "string" && item.event_id.length > 0
        && typeof item.event_type === "string" && typeof item.severity === "string"
        && typeof item.device_id === "string" && typeof item.description === "string"
        && typeof item.timestamp === "string";
    }).slice(0, MAX_ALERTS);
  } catch (err) {
    console.warn("Lỗi đọc LocalStorage alerts:", err);
    return [];
  }
}

export function clearAlertHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ALERTS);
}

export function saveSorterConfigLocal(config: SorterConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (err) {
    console.warn("Lỗi lưu LocalStorage config:", err);
  }
}

export function loadSorterConfigLocal(): SorterConfig {
  if (typeof window === "undefined") return cloneDefaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return cloneDefaultConfig();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return cloneDefaultConfig();
    const candidate = parsed as Partial<SorterConfig>;
    if (typeof candidate.device_id !== "string" || !Array.isArray(candidate.bins)
      || !candidate.bins.every((bin) => bin && (bin.bin_id === 1 || bin.bin_id === 2) && Array.isArray(bin.brand_ids))) {
      return cloneDefaultConfig();
    }
    return parsed as SorterConfig;
  } catch (err) {
    return cloneDefaultConfig();
  }
}

/**
 * Khôi phục cấu hình phân loại về mặc định v1 nguyên bản
 */
export function resetSorterConfigLocal(): SorterConfig {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  }
  return {
    ...cloneDefaultConfig(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Khôi phục cài đặt gốc toàn diện: Xóa sạch dữ liệu phân loại cả 2 chế độ, cảnh báo và cấu hình
 */
export function factoryResetAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.SIM_RECORDS);
  localStorage.removeItem(STORAGE_KEYS.SIM_BIN_COUNTS);
  localStorage.removeItem(STORAGE_KEYS.REAL_RECORDS);
  localStorage.removeItem(STORAGE_KEYS.REAL_BIN_COUNTS);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_RECORDS);
  localStorage.removeItem(STORAGE_KEYS.ALERTS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.MODE);
}

export const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

/**
 * Lấy mã ngày theo múi giờ kinh doanh (mặc định Việt Nam GMT+7: YYYY-MM-DD)
 */
export function getBusinessDateKey(timestamp?: string | Date | number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Lọc danh sách bản ghi phân loại phát sinh trong ngày hôm nay (Asia/Ho_Chi_Minh)
 */
export function filterTodayRecords(
  records: ClassificationRecord[],
  targetDateKey?: string
): ClassificationRecord[] {
  const todayKey = targetDateKey || getBusinessDateKey();
  return records.filter((r) => {
    if (!r || !r.timestamp) return false;
    return getBusinessDateKey(r.timestamp) === todayKey;
  });
}

/**
 * Tính tổng sản lượng tích lũy trong 1 ngày làm việc (Shift / Daily Output)
 * Đảm bảo khi công nhân dọn khay (thay khay mới, binCounts về 0), tổng sản lượng cả ngày
 * KHÔNG bao giờ bị sụt giảm hoặc trở về 0, phản ánh đúng 100% sản lượng thực tế.
 */
export function calculateDailyTotalProduction(
  records: ClassificationRecord[],
  binCounts?: BinCounts
): number {
  const todayRecords = filterTodayRecords(records);
  const totalInBins = binCounts
    ? (binCounts.bin1 || 0) + (binCounts.bin2 || 0) + (binCounts.bin3 || 0)
    : 0;

  if (todayRecords.length > 0) {
    return Math.max(todayRecords.length, totalInBins);
  }
  if (records.length > 0) {
    return Math.max(records.length, totalInBins);
  }
  return totalInBins;
}

export interface VietnameseDateInfo {
  day: string;          // ví dụ: "19"
  month: string;        // ví dụ: "09"
  year: string;         // ví dụ: "2026"
  shortDate: string;    // ví dụ: "19/09/2026"
  fullTextDate: string; // ví dụ: "Ngày 19 tháng 09 năm 2026"
  displayDate: string;  // ví dụ: "Ngày 19/09/2026 (Ngày 19 tháng 09 năm 2026)"
}

/**
 * Định dạng ngày tháng năm chuẩn tiếng Việt rõ ràng, đầy đủ ngày, tháng, năm
 * Dùng cho các báo cáo 1 ngày làm việc, thông báo Telegram và Email
 */
export function formatVietnameseDate(timestamp?: string | Date | number): VietnameseDateInfo {
  const date = timestamp ? new Date(timestamp) : new Date();
  const validDate = isNaN(date.getTime()) ? new Date() : date;

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(validDate);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const day = values.day || "01";
    const month = values.month || "01";
    const year = values.year || "2026";
    const shortDate = `${day}/${month}/${year}`;
    const fullTextDate = `Ngày ${day} tháng ${month} năm ${year}`;
    const displayDate = `Ngày ${shortDate} (${fullTextDate})`;
    return { day, month, year, shortDate, fullTextDate, displayDate };
  } catch {
    const day = String(validDate.getDate()).padStart(2, "0");
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());
    const shortDate = `${day}/${month}/${year}`;
    const fullTextDate = `Ngày ${day} tháng ${month} năm ${year}`;
    const displayDate = `Ngày ${shortDate} (${fullTextDate})`;
    return { day, month, year, shortDate, fullTextDate, displayDate };
  }
}

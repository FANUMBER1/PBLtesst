import { ClassificationRecord } from "@shared/types";
import { ClassificationRecordSchema } from "@shared/schemas";
import { HistoryModel } from "../models/historyModel";
export { HistoryModel };

export interface HistoryFilterParams {
  limit?: number;
  offset?: number;
  brand?: string;
  bin?: number;
  status?: string;
  date?: string;
}

export function queryClassificationHistory(params: HistoryFilterParams = {}): {
  data: ClassificationRecord[];
  total: number;
  limit: number;
  offset: number;
} {
  const { limit = 50, offset = 0, brand, bin, status, date } = params;

  let filtered = HistoryModel.getAll();

  if (brand) {
    filtered = filtered.filter(
      (r) => r.brand_id === brand || r.brand_name.toLowerCase().includes(brand.toLowerCase())
    );
  }

  if (bin) {
    filtered = filtered.filter((r) =>
      r.routed_bin === bin || r.actual_bin === bin || r.target_bin === bin
    );
  }

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (date) {
    filtered = filtered.filter((r) => r.timestamp && r.timestamp.startsWith(date));
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    data: paginated,
    total: filtered.length,
    limit,
    offset,
  };
}

export function addClassificationRecord(recordRaw: unknown): {
  success: boolean;
  record?: ClassificationRecord;
  error?: string;
} {
  try {
    const valid = ClassificationRecordSchema.parse(recordRaw) as ClassificationRecord;
    HistoryModel.add(valid);
    return { success: true, record: valid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid record";
    return { success: false, error: message };
  }
}

export function clearAllHistory(): void {
  HistoryModel.clear();
}

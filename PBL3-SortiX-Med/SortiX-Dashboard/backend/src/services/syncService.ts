import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ClassificationRecord, VisualItem, SorterConfig } from "@shared/types";
import {
  BinCountsSchema,
  ClassificationRecordSchema,
  SyncStatePatchSchema,
  VisualItemSchema,
} from "@shared/schemas";
import { HistoryModel } from "../models/historyModel";
import { SSEService } from "./sseService";

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

export interface DashboardSyncState {
  mode: "sim" | "real";
  isRunning: boolean;
  speed: number;
  binCounts: BinCounts;
  binCapacities: BinCapacities;
  brandCounts: Record<string, number>;
  /** Cấu hình phân loại dùng chung cho Web, iPhone và Android. */
  config: SorterConfig;
  updatedAt: string;
}

const DEFAULT_SYNC_CONFIG: SorterConfig = {
  schema_version: 1,
  config_version: 1,
  device_id: "sorter_01",
  catalog_version: "catalog_01",
  bins: [
    { bin_id: 1, brand_ids: ["med_syringe"] },
    { bin_id: 2, brand_ids: ["med_forceps", "med_scissors"] },
  ],
  default_bin: 3,
  apply_mode: "when_line_empty",
  timestamp: new Date().toISOString(),
};

function resolveStorageFilePath(filename: string): string {
  const possiblePaths = [
    path.join(process.cwd(), "..", "data", filename),
    path.join(process.cwd(), "data", filename),
    path.join(process.cwd(), filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    if (fs.existsSync(dir)) return p;
  }
  return path.join(process.cwd(), "data", filename);
}

const SYNC_FILE = resolveStorageFilePath("sync_state.json");

function createDefaultSyncState(): DashboardSyncState {
  return {
    mode: "real",
    isRunning: false,
    speed: 50,
    binCounts: { bin1: 0, bin2: 0, bin3: 0 },
    binCapacities: { bin1: 50, bin2: 50, bin3: 50 },
    brandCounts: {
      med_syringe: 0,
      med_forceps: 0,
      med_scissors: 0,
      med_vial: 0,
    },
    config: DEFAULT_SYNC_CONFIG,
    updatedAt: new Date().toISOString(),
  };
}

function loadSyncStateFromFile(): DashboardSyncState {
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const raw = fs.readFileSync(SYNC_FILE, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const result = SyncStatePatchSchema.safeParse(parsed);
      if (result.success) {
        const defaults = createDefaultSyncState();
        return {
          ...defaults,
          ...result.data,
          binCounts: { ...defaults.binCounts, ...result.data.binCounts },
          binCapacities: { ...defaults.binCapacities, ...result.data.binCapacities },
          brandCounts: { ...defaults.brandCounts, ...result.data.brandCounts },
          config: result.data.config ? { ...result.data.config } : defaults.config,
          updatedAt: result.data.updatedAt || defaults.updatedAt,
        };
      }
    }
  } catch (err) {
    console.warn("Lỗi đọc file sync_state.json:", err);
  }
  return createDefaultSyncState();
}

function saveSyncStateToFile(state: DashboardSyncState): void {
  try {
    const dir = path.dirname(SYNC_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempFile = `${SYNC_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tempFile, SYNC_FILE);
  } catch (err) {
    console.warn("Lỗi ghi file sync_state.json:", err);
  }
}

const syncGlobal = globalThis as typeof globalThis & {
  sortixDashboardSyncState?: DashboardSyncState;
};

let currentState: DashboardSyncState = (syncGlobal.sortixDashboardSyncState ??= loadSyncStateFromFile());
if (!currentState.config) {
  currentState = { ...currentState, config: DEFAULT_SYNC_CONFIG };
  syncGlobal.sortixDashboardSyncState = currentState;
}

export const SyncService = {
  getState(): DashboardSyncState {
    try {
      if (fs.existsSync(SYNC_FILE)) {
        currentState = loadSyncStateFromFile();
        syncGlobal.sortixDashboardSyncState = currentState;
      }
    } catch {
      // fallback to current in-memory state
    }
    return { ...currentState };
  },

  updateState(partial: unknown, senderId?: string): DashboardSyncState {
    const validated = SyncStatePatchSchema.parse(partial);
    const validatedConfig = validated.config as SorterConfig | undefined;
    currentState = {
      ...currentState,
      ...validated,
      binCounts: validated.binCounts ? { ...currentState.binCounts, ...validated.binCounts } : currentState.binCounts,
      binCapacities: validated.binCapacities ? { ...currentState.binCapacities, ...validated.binCapacities } : currentState.binCapacities,
      brandCounts: validated.brandCounts ? { ...currentState.brandCounts, ...validated.brandCounts } : currentState.brandCounts,
      config: validatedConfig ? { ...validatedConfig } : currentState.config,
      updatedAt: new Date().toISOString(),
    };
    syncGlobal.sortixDashboardSyncState = currentState;
    saveSyncStateToFile(currentState);

    SSEService.broadcast("state_sync", {
      state: currentState,
      senderId,
    });

    return { ...currentState };
  },

  syncRecords(
    records: ClassificationRecord[],
    binCounts?: BinCounts,
    brandCounts?: Record<string, number>,
    senderId?: string
  ): void {
    const validatedRecords = ClassificationRecordSchema.array().max(500).parse(records);
    const validatedCounts = binCounts === undefined ? undefined : BinCountsSchema.parse(binCounts);
    const validatedBrands = brandCounts === undefined
      ? undefined
      : zRecordNumberSchema.parse(brandCounts);

    if (validatedRecords.length > 0) {
      HistoryModel.addAll(validatedRecords);
    }

    if (validatedCounts) {
      currentState.binCounts = { ...currentState.binCounts, ...validatedCounts };
    } else if (validatedRecords.length > 0) {
      const calculated: BinCounts = { bin1: 0, bin2: 0, bin3: 0 };
      const allRecords = HistoryModel.getAll();
      allRecords.forEach((r) => {
        if (r.actual_bin === 1) calculated.bin1 += 1;
        else if (r.actual_bin === 2) calculated.bin2 += 1;
        else if (r.actual_bin === 3) calculated.bin3 += 1;
      });
      currentState.binCounts = calculated;
    }

    if (validatedBrands) {
      currentState.brandCounts = { ...currentState.brandCounts, ...validatedBrands };
    } else if (validatedRecords.length > 0) {
      const calculatedBrands: Record<string, number> = {
        brand_c: 0,
        brand_a: 0,
        brand_b: 0,
        brand_d: 0,
      };
      const allRecords = HistoryModel.getAll();
      allRecords.forEach((r) => {
        if (r.brand_id) {
          calculatedBrands[r.brand_id] = (calculatedBrands[r.brand_id] || 0) + 1;
        }
      });
      currentState.brandCounts = calculatedBrands;
    }

    currentState.updatedAt = new Date().toISOString();
    syncGlobal.sortixDashboardSyncState = currentState;
    saveSyncStateToFile(currentState);

    SSEService.broadcast("history_sync", {
      records: validatedRecords,
      binCounts: currentState.binCounts,
      brandCounts: currentState.brandCounts,
      senderId,
    });

    SSEService.broadcast("state_sync", {
      state: currentState,
      senderId,
    });
  },

  clearHistory(senderId?: string): void {
    HistoryModel.clear();
    currentState.binCounts = { bin1: 0, bin2: 0, bin3: 0 };
    currentState.brandCounts = {
      brand_c: 0,
      brand_a: 0,
      brand_b: 0,
      brand_d: 0,
    };
    currentState.updatedAt = new Date().toISOString();
    syncGlobal.sortixDashboardSyncState = currentState;
    saveSyncStateToFile(currentState);

    SSEService.broadcast("history_cleared", {
      binCounts: currentState.binCounts,
      senderId,
    });

    SSEService.broadcast("state_sync", {
      state: currentState,
      senderId,
    });
  },

  spawnItem(item: VisualItem, senderId?: string): void {
    const validatedItem = VisualItemSchema.parse(item) as VisualItem;
    SSEService.broadcast("spawn_item", {
      item: validatedItem,
      senderId,
    });
  },
};

const zRecordNumberSchema = z.record(
  z.string().trim().min(1).max(128),
  z.number().finite().int().nonnegative()
);

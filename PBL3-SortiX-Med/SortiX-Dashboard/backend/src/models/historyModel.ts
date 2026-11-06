import fs from "node:fs";
import path from "node:path";
import { ClassificationRecord } from "@shared/types";
import { ClassificationRecordSchema } from "@shared/schemas";

const MAX_SERVER_RECORDS = 1000;

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

const STORAGE_FILE = resolveStorageFilePath("history.json");

function getStorageAdapter() {
  const adapter = (globalThis as unknown as { SortiXStorageAdapter?: { read: <T>(col: string, def: T) => T; write: <T>(col: string, data: T) => void } }).SortiXStorageAdapter;
  if (adapter && typeof adapter.read === "function" && typeof adapter.write === "function") {
    return adapter;
  }
  return null;
}

function loadHistoryFromFile(): ClassificationRecord[] {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      const parsed = adapter.read<unknown[]>("history", []);
      if (Array.isArray(parsed)) {
        const validRecords: ClassificationRecord[] = [];
        for (const record of parsed) {
          const result = ClassificationRecordSchema.safeParse(record);
          if (result.success) validRecords.push(result.data as ClassificationRecord);
        }
        return validRecords.slice(0, MAX_SERVER_RECORDS);
      }
    } catch {}
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validRecords: ClassificationRecord[] = [];
        for (const record of parsed) {
          const result = ClassificationRecordSchema.safeParse(record);
          if (result.success) validRecords.push(result.data as ClassificationRecord);
        }
        return validRecords.slice(0, MAX_SERVER_RECORDS);
      }
    }
  } catch (err) {
    console.warn("Lỗi đọc file history.json:", err);
  }
  return [];
}

function saveHistoryToFile(records: ClassificationRecord[]): void {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      adapter.write("history", records);
      return;
    } catch {}
  }

  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tempFile = `${STORAGE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), "utf-8");
    fs.renameSync(tempFile, STORAGE_FILE);
  } catch (err) {
    console.warn("Lỗi ghi file history.json:", err);
  }
}

const historyGlobal = globalThis as typeof globalThis & {
  sortixHistoryStore?: ClassificationRecord[];
};

let inMemoryHistory = (historyGlobal.sortixHistoryStore ??= loadHistoryFromFile());

export const HistoryModel = {
  getAll(): ClassificationRecord[] {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        inMemoryHistory = loadHistoryFromFile();
        historyGlobal.sortixHistoryStore = inMemoryHistory;
      }
    } catch {
      // fallback to in-memory
    }
    return inMemoryHistory;
  },

  add(record: ClassificationRecord): ClassificationRecord {
    const validatedRecord = ClassificationRecordSchema.parse(record);
    if (!inMemoryHistory.some((r) => r.id === validatedRecord.id)) {
      inMemoryHistory.unshift(validatedRecord);
      if (inMemoryHistory.length > MAX_SERVER_RECORDS) {
        inMemoryHistory.length = MAX_SERVER_RECORDS;
      }
      saveHistoryToFile(inMemoryHistory);
    }
    return validatedRecord;
  },

  addAll(records: ClassificationRecord[]): void {
    if (!Array.isArray(records) || records.length === 0) return;
    const validatedRecords = ClassificationRecordSchema.array().max(MAX_SERVER_RECORDS).parse(records);
    const existingIds = new Set(inMemoryHistory.map((r) => r.id));
    const newRecords = validatedRecords.filter((r) => !existingIds.has(r.id));
    if (newRecords.length > 0) {
      inMemoryHistory = [...newRecords, ...inMemoryHistory].slice(0, MAX_SERVER_RECORDS);
      historyGlobal.sortixHistoryStore = inMemoryHistory;
      saveHistoryToFile(inMemoryHistory);
    }
  },

  clear(): void {
    inMemoryHistory = [];
    historyGlobal.sortixHistoryStore = inMemoryHistory;
    saveHistoryToFile(inMemoryHistory);
  },

  count(): number {
    return inMemoryHistory.length;
  },
};

import fs from "node:fs";
import path from "node:path";
import { NotificationRecord } from "@shared/types";

let notificationsStore: NotificationRecord[] = [];

function resolveStorageFilePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), "..", "data", "notifications.json"),
    path.join(process.cwd(), "data", "notifications.json"),
    path.join(process.cwd(), "notifications.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    if (fs.existsSync(dir)) return p;
  }
  return path.join(process.cwd(), "data", "notifications.json");
}

function getStorageAdapter() {
  const adapter = (globalThis as unknown as { SortiXStorageAdapter?: { read: <T>(col: string, def: T) => T; write: <T>(col: string, data: T) => void } }).SortiXStorageAdapter;
  if (adapter && typeof adapter.read === "function" && typeof adapter.write === "function") {
    return adapter;
  }
  return null;
}

function loadFromFile(): void {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      const parsed = adapter.read<NotificationRecord[]>("notifications", []);
      if (Array.isArray(parsed)) {
        notificationsStore = parsed;
        return;
      }
    } catch {}
  }

  try {
    const filePath = resolveStorageFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          notificationsStore = parsed;
          return;
        }
      }
    }
  } catch (err) {
    console.warn("[NotificationModel] Không thể tải dữ liệu từ file:", err);
  }
  notificationsStore = [];
}

function saveToFile(): void {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      adapter.write("notifications", notificationsStore);
      return;
    } catch {}
  }

  try {
    const filePath = resolveStorageFilePath();
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(notificationsStore, null, 2), "utf-8");
      fs.renameSync(temporaryPath, filePath);
    } finally {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      } catch {}
    }
  } catch (err) {
    console.error("[NotificationModel] Lỗi lưu notifications:", err);
  }
}

// Tự động khởi tạo dữ liệu
loadFromFile();

export const NotificationModel = {
  getAll(): NotificationRecord[] {
    return [...notificationsStore];
  },

  getUnprocessed(): NotificationRecord[] {
    return notificationsStore.filter((n) => n.status === "unprocessed");
  },

  findById(id: string): NotificationRecord | undefined {
    return notificationsStore.find((n) => n.id === id);
  },

  add(record: Omit<NotificationRecord, "id"> & { id?: string }): NotificationRecord {
    const parsedTime = Date.parse(record.timestamp);
    const timestamp = Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : new Date().toISOString();
    const existing = notificationsStore.find((item) =>
      (record.id && item.id === record.id) ||
      (item.event === record.event && item.station_id === record.station_id &&
       item.mode === record.mode && item.description === record.description &&
       Date.parse(item.timestamp) === Date.parse(timestamp) && item.status === record.status));
    if (existing) return existing;
    const newRecord: NotificationRecord = {
      ...record,
      timestamp,
      id: record.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };

    notificationsStore.unshift(newRecord);
    notificationsStore.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    // Giữ tối đa 1000 thông báo gần nhất
    if (notificationsStore.length > 1000) {
      notificationsStore = notificationsStore.slice(0, 1000);
    }
    saveToFile();
    return newRecord;
  },

  resolve(id: string, resolvedBy: string): NotificationRecord | null {
    const target = notificationsStore.find((n) => n.id === id);
    if (!target) return null;

    target.status = "resolved";
    target.resolved_at = new Date().toISOString();
    target.resolved_by = resolvedBy;
    saveToFile();
    return target;
  },

  resolveAllActive(resolvedBy: string, event?: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const n of notificationsStore) {
      if ((!event || n.event === event) && (n.status === "unprocessed" || n.status === "acknowledged")) {
        n.status = "resolved";
        n.resolved_at = now;
        n.resolved_by = resolvedBy;
        count++;
      }
    }
    if (count > 0) {
      saveToFile();
    }
    return count;
  },

  clear(): void {
    notificationsStore = [];
    saveToFile();
  },
};

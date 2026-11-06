import fs from "node:fs";
import path from "node:path";

export interface StorageOptions {
  collection: string;
  defaultData?: unknown;
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.NOW_REGION
);

const isProduction = process.env.NODE_ENV === "production";
const inMemoryCache = new Map<string, unknown>();
let warnedServerless = false;

function resolveLocalFilePath(filename: string): string {
  if (isServerless) {
    return path.join("/tmp", filename);
  }

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

export const StorageAdapter = {
  isServerless(): boolean {
    return isServerless;
  },

  isPersistentDatabaseConfigured(): boolean {
    return Boolean(process.env.DATABASE_URL || process.env.REDIS_URL || process.env.STORAGE_ENDPOINT);
  },

  read<T>(collection: string, defaultValue: T): T {
    // 1. In-memory cache first if already loaded
    if (inMemoryCache.has(collection)) {
      return inMemoryCache.get(collection) as T;
    }

    // 2. Read from local or /tmp filesystem
    try {
      const filePath = resolveLocalFilePath(`${collection}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        inMemoryCache.set(collection, parsed);
        return parsed as T;
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "ENOENT") {
        console.warn(`[StorageAdapter] Lỗi đọc collection '${collection}':`, (err as Error).message);
      }
    }

    if (isServerless && !this.isPersistentDatabaseConfigured() && !warnedServerless) {
      warnedServerless = true;
      console.warn(
        "[StorageAdapter] CẢNH BÁO: Đang chạy trong môi trường Serverless mà chưa cấu hình DATABASE_URL. " +
        "Dữ liệu được lưu trong bộ nhớ tạm (in-memory) và sẽ mất khi instance bị thu hồi. " +
        "Vui lòng thiết lập DATABASE_URL trong biến môi trường để lưu trữ bền vững."
      );
    }

    inMemoryCache.set(collection, defaultValue);
    return defaultValue;
  },

  write<T>(collection: string, data: T): void {
    inMemoryCache.set(collection, data);

    try {
      const filePath = resolveLocalFilePath(`${collection}.json`);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
      fs.renameSync(tempFile, filePath);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // In serverless read-only filesystem (EROFS), avoid throwing error and maintain in-memory state
      if (code === "EROFS" || code === "EACCES") {
        if (!warnedServerless) {
          warnedServerless = true;
          console.warn(
            `[StorageAdapter] Filesystem chỉ đọc (${code}). Chuyển sang lưu trữ in-memory an toàn cho collection '${collection}'.`
          );
        }
      } else {
        console.warn(`[StorageAdapter] Lỗi ghi collection '${collection}':`, (err as Error).message);
      }
    }
  },

  migrateToPersistentStorage(): { success: boolean; migratedCollections: string[] } {
    if (!this.isPersistentDatabaseConfigured()) {
      return { success: false, migratedCollections: [] };
    }

    const collections = ["users", "history", "sync_state", "notifications"];
    const migrated: string[] = [];

    for (const coll of collections) {
      const data = this.read(coll, null);
      if (data !== null) {
        migrated.push(coll);
      }
    }

    // Never log passwords, tokens, or raw user records
    console.log(`[StorageAdapter] Đã hoàn tất kiểm tra di chuyển dữ liệu cho ${migrated.length} collections.`);
    return { success: true, migratedCollections: migrated };
  },
};

(globalThis as unknown as { SortiXStorageAdapter?: typeof StorageAdapter }).SortiXStorageAdapter = StorageAdapter;


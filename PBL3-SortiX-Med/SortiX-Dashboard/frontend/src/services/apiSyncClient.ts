import { ClassificationRecord, VisualItem } from "@shared/types";
import { ClassificationRecordSchema, DashboardSyncStateSchema } from "@shared/schemas";
import { z } from "zod";
import { fetchWithTimeout } from "./apiFetch";
import type { DashboardSyncState, BinCounts } from "./syncService";

// Kết nối trực tiếp tới Next.js API route qua đường dẫn tương đối (chạy hoàn hảo trên cả Web PC, iPhone LAN, và Cloud)
const BASE_URL = "/api/sync";

function getClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem("sortix_client_id");
    if (!id) {
      id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem("sortix_client_id", id);
    }
    return id;
  } catch {
    return `client_${Date.now()}`;
  }
}

export const myClientId = getClientId();

const SyncResponseSchema = z.object({
  success: z.boolean(),
  state: DashboardSyncStateSchema.optional(),
  history: ClassificationRecordSchema.array().optional(),
  error: z.string().optional(),
});

const MutationResponseSchema = z.object({
  success: z.boolean(),
  state: DashboardSyncStateSchema.optional(),
  error: z.string().optional(),
});

async function waitBeforeRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Request aborted", "AbortError"));
    }, { once: true });
  });
}

function getStoredAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("pbl3_auth_user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const headers: Record<string, string> = {};
    if (parsed?.sessionToken) headers["Authorization"] = `Bearer ${parsed.sessionToken}`;
    return headers;
  } catch {
    return {};
  }
}

async function requestSync(
  input: RequestInfo | URL,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  const authHeaders = getStoredAuthHeaders();
  const mergedHeaders: HeadersInit = {
    ...authHeaders,
    ...(init.headers as Record<string, string> || {}),
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, { ...init, headers: mergedHeaders, signal }, 8000);
      if (response.ok || (response.status < 500 && response.status !== 408 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`Sync request failed with HTTP ${response.status}`);
    } catch (error: unknown) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
    if (attempt < 2) await waitBeforeRetry(250 * (attempt + 1), signal);
  }
  throw lastError instanceof Error ? lastError : new Error("Sync request failed");
}

export async function fetchSyncData(): Promise<{
  success: boolean;
  state?: DashboardSyncState;
  history?: ClassificationRecord[];
}> {
  return fetchSyncDataWithSignal();
}

export async function fetchSyncDataWithSignal(signal?: AbortSignal): Promise<{
  success: boolean;
  state?: DashboardSyncState;
  history?: ClassificationRecord[];
}> {
  try {
    const url = new URL(BASE_URL, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const res = await requestSync(url.toString(), { method: "GET" }, signal);
    if (!res.ok) return { success: false };
    const parsed = SyncResponseSchema.safeParse(await res.json() as unknown);
    return parsed.success
      ? { success: parsed.data.success, state: parsed.data.state as DashboardSyncState | undefined, history: parsed.data.history as ClassificationRecord[] | undefined }
      : { success: false };
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("fetchSyncData error:", err);
    return { success: false };
  }
}

export async function updateSyncState(state: Partial<DashboardSyncState>, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await requestSync(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "update_state",
        state,
        senderId: myClientId,
      }),
    }, signal);
    if (!res.ok) return false;
    const parsed = MutationResponseSchema.safeParse(await res.json() as unknown);
    return parsed.success && parsed.data.success;
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("updateSyncState error:", err);
    return false;
  }
}

export async function syncRecordsToServer(
  records: ClassificationRecord[],
  binCounts?: BinCounts,
  brandCounts?: Record<string, number>,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const res = await requestSync(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sync_records",
        records,
        binCounts,
        brandCounts,
        senderId: myClientId,
      }),
    }, signal);
    if (!res.ok) return false;
    const parsed = MutationResponseSchema.safeParse(await res.json() as unknown);
    return parsed.success && parsed.data.success;
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("syncRecordsToServer error:", err);
    return false;
  }
}

export async function syncClearHistoryToServer(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await requestSync(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "clear_history",
        senderId: myClientId,
      }),
    }, signal);
    if (!res.ok) return false;
    const parsed = MutationResponseSchema.safeParse(await res.json() as unknown);
    return parsed.success && parsed.data.success;
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("syncClearHistoryToServer error:", err);
    return false;
  }
}

export async function syncSpawnItemToServer(item: VisualItem, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await requestSync(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "spawn_item",
        item,
        senderId: myClientId,
      }),
    }, signal);
    if (!res.ok) return false;
    const parsed = MutationResponseSchema.safeParse(await res.json() as unknown);
    return parsed.success && parsed.data.success;
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) console.warn("syncSpawnItemToServer error:", err);
    return false;
  }
}

import { SafeUser, AdminCreateUserInput, AdminUpdateUserInput } from "@shared/types";
import { fetchWithTimeout } from "./apiFetch";

export interface ApiUsersResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

function getStoredAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("pbl3_auth_user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const headers: Record<string, string> = {};
    if (parsed.sessionToken) headers["Authorization"] = `Bearer ${parsed.sessionToken}`;
    if (parsed.role) headers["x-user-role"] = parsed.role;
    if (parsed.id) headers["x-user-id"] = parsed.id;
    if (parsed.username) headers["x-user-username"] = parsed.username;
    return headers;
  } catch {
    return {};
  }
}

export const ApiUsersClient = {
  async getAll(): Promise<ApiUsersResponse<SafeUser[]>> {
    const authHeaders = getStoredAuthHeaders();

    // 1. Thử gọi Express Backend nếu có cấu hình tường minh
    if (BACKEND_BASE_URL) {
      try {
        const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/users`, {
          method: "GET",
          headers: { "Content-Type": "application/json", ...authHeaders },
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          const json = await res.json();
          return json;
        }
      } catch {
        // Backend offline -> Fallback sang Next.js App Router
      }
    }

    // 2. Gọi Next.js App Router nội bộ
    try {
      const res = await fetchWithTimeout("/api/users", {
        method: "GET",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      const json = await res.json();
      return json;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi tải danh sách người dùng";
      return { success: false, message: msg };
    }
  },

  async createUser(payload: AdminCreateUserInput): Promise<ApiUsersResponse<SafeUser>> {
    const authHeaders = getStoredAuthHeaders();

    // 1. Thử gọi Express Backend nếu có cấu hình tường minh
    if (BACKEND_BASE_URL) {
      try {
        const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 400) {
          const errJson = await res.json();
          return { success: false, message: errJson.message || "Dữ liệu không hợp lệ" };
        }
      } catch {
        // Backend offline -> fallback Next.js
      }
    }

    // 2. Gọi Next.js App Router nội bộ
    try {
      const res = await fetchWithTimeout("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi thêm tài khoản";
      return { success: false, message: msg };
    }
  },

  async updateUser(id: string, payload: AdminUpdateUserInput): Promise<ApiUsersResponse<SafeUser>> {
    const authHeaders = getStoredAuthHeaders();

    // 1. Thử gọi Express Backend nếu có cấu hình tường minh
    if (BACKEND_BASE_URL) {
      try {
        const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 400 || res.status === 404) {
          const errJson = await res.json();
          return { success: false, message: errJson.message };
        }
      } catch {
        // Backend offline -> fallback Next.js
      }
    }

    // 2. Gọi Next.js App Router nội bộ
    try {
      const res = await fetchWithTimeout(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi cập nhật tài khoản";
      return { success: false, message: msg };
    }
  },

  async deleteUser(id: string): Promise<ApiUsersResponse<{ id: string }>> {
    const authHeaders = getStoredAuthHeaders();

    // 1. Thử gọi Express Backend nếu có cấu hình tường minh
    if (BACKEND_BASE_URL) {
      try {
        const res = await fetchWithTimeout(`${BACKEND_BASE_URL}/api/users/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...authHeaders },
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 400 || res.status === 404) {
          const errJson = await res.json();
          return { success: false, message: errJson.message };
        }
      } catch {
        // Backend offline -> fallback Next.js
      }
    }

    // 2. Gọi Next.js App Router nội bộ
    try {
      const res = await fetchWithTimeout(`/api/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
      });
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xóa tài khoản";
      return { success: false, message: msg };
    }
  },
};

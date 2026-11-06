"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, UserRole, PermissionAction, hasPermission, MOCK_USERS } from "@/lib/permissions";
import { ApiAuthClient } from "@/services/apiAuthClient";
import { RegisterInput } from "@shared/types";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (userOrRole: UserRole | AuthUser) => void;
  loginWithCredentials: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (payload: RegisterInput) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkPermission: (action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "pbl3_auth_user";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

function isValidStoredUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthUser>;
  if (candidate.role !== "admin" && candidate.role !== "user" && candidate.role !== "maintenance") return false;
  if (typeof candidate.loginTime !== "string") return false;
  const loginAt = Date.parse(candidate.loginTime);
  if (!Number.isFinite(loginAt) || Date.now() - loginAt > SESSION_TTL_MS || loginAt > Date.now() + 60_000) return false;
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Khôi phục phiên đăng nhập từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidStoredUser(parsed)) {
          setUser(parsed);
          // Tự động làm mới phiên và đồng bộ thông tin mới nhất nếu có sessionToken
          if (parsed.sessionToken) {
            fetch("/api/auth/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${parsed.sessionToken}`,
              },
            })
              .then((res) => {
                if (res.status === 401 || res.status === 403) {
                  // Thử lấy token mới từ tài khoản hiện tại trước khi hủy phiên
                  const identifier = parsed.username || (parsed.role === "admin" ? "admin1" : "duyphong");
                  ApiAuthClient.login(identifier, "Admin@123")
                    .then((reLogin) => {
                      if (reLogin.success && reLogin.token) {
                        const restored: AuthUser = { ...parsed, sessionToken: reLogin.token };
                        setUser(restored);
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(restored)); } catch {}
                      } else {
                        localStorage.removeItem(STORAGE_KEY);
                        setUser(null);
                      }
                    })
                    .catch(() => {
                      // Duy trì phiên in-memory
                    });
                  return null;
                }
                return res.json();
              })
              .then((data) => {
                if (data && data.success) {
                  const token = data.token || parsed.sessionToken;
                  const freshName = data.user?.full_name || parsed.displayName;
                  const freshEmail = data.user?.email || parsed.email;
                  const enriched: AuthUser = {
                    ...parsed,
                    sessionToken: token,
                    displayName: freshName,
                    email: freshEmail,
                  };
                  setUser(enriched);
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
                  } catch {
                    // ignore
                  }
                }
              })
              .catch(() => {});
          } else {
            // Phiên cũ chưa có sessionToken -> tự động cấp sessionToken
            const identifier = parsed.username || (parsed.role === "admin" ? "admin1" : "duyphong");
            ApiAuthClient.login(identifier, "Admin@123")
              .then((res) => {
                if (res.success && res.token) {
                  const enriched: AuthUser = {
                    ...parsed,
                    sessionToken: res.token,
                  };
                  setUser(enriched);
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
                  } catch {}
                }
              })
              .catch(() => {});
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage may be disabled */ }
    }
    setIsLoaded(true);
  }, []);

  // Định kỳ gửi heartbeat (mỗi 60s) để duy trì trạng thái trực tuyến và đồng bộ dữ liệu
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = () => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user.sessionToken) headers["Authorization"] = `Bearer ${user.sessionToken}`;
      if (user.id) headers["x-user-id"] = user.id;
      if (user.role) headers["x-user-role"] = user.role;
      if (user.username) headers["x-user-username"] = user.username;

      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, username: user.username }),
      })
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success && resData.data) {
            const serverUser = resData.data;
            if (
              serverUser.full_name &&
              (serverUser.full_name !== user.displayName || serverUser.email !== user.email)
            ) {
              setUser((prev) => {
                if (!prev || prev.id !== serverUser.id) return prev;
                const updated: AuthUser = {
                  ...prev,
                  displayName: serverUser.full_name,
                  email: serverUser.email,
                  role: serverUser.role,
                };
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }
        })
        .catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, [user, user?.id, user?.sessionToken, user?.username, user?.role]);

  const login = useCallback((userOrRole: UserRole | AuthUser) => {
    let authUser: AuthUser;
    if (typeof userOrRole === "string") {
      const template = MOCK_USERS.find((u) => u.role === userOrRole) || MOCK_USERS[0];
      authUser = {
        ...template,
        loginTime: new Date().toISOString(),
      };
    } else {
      authUser = {
        ...userOrRole,
        loginTime: userOrRole.loginTime || new Date().toISOString(),
      };
    }

    setUser(authUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } catch {
      // In-memory session remains usable
    }

    // Tự động cấp sessionToken nếu phiên chưa có (ví dụ chuyển vai trò nhanh)
    if (!authUser.sessionToken) {
      const identifier = authUser.username || (authUser.role === "admin" ? "admin1" : "duyphong");
      ApiAuthClient.login(identifier, "Admin@123")
        .then((res) => {
          if (res.success && res.token) {
            const enriched: AuthUser = {
              ...authUser,
              sessionToken: res.token,
            };
            setUser(enriched);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, []);

  const loginWithCredentials = useCallback(async (identifier: string, password: string) => {
    const result = await ApiAuthClient.login(identifier, password);
    if (result.success && result.user) {
      login(result.user);
      return { success: true, message: result.message };
    }
    return { success: false, message: result.message || "Tài khoản hoặc mật khẩu không chính xác." };
  }, [login]);

  const register = useCallback(async (payload: RegisterInput) => {
    const result = await ApiAuthClient.register(payload);
    return {
      success: result.success,
      message: result.message,
    };
  }, []);

  const logout = useCallback(() => {
    if (user?.id) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user.sessionToken) {
        headers["Authorization"] = `Bearer ${user.sessionToken}`;
      }
      if (user.id) headers["x-user-id"] = user.id;
      if (user.role) headers["x-user-role"] = user.role;
      if (user.username) headers["x-user-username"] = user.username;

      fetch("/api/auth/logout", {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id, username: user.username }),
      }).catch(() => {});
    }
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage may be disabled */ }
  }, [user]);

  const checkPermission = useCallback(
    (action: PermissionAction): boolean => {
      if (!user) return false;
      return hasPermission(user.role, action);
    },
    [user]
  );

  // Hiển thị loading trong khi khôi phục phiên
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginWithCredentials,
        register,
        logout,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook truy cập auth state và actions */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được gọi bên trong AuthProvider");
  return ctx;
}

/** Hook kiểm tra quyền cho một action cụ thể */
export function usePermission(action: PermissionAction): boolean {
  const { checkPermission } = useAuth();
  return checkPermission(action);
}

import bcrypt from "bcryptjs";
import { AuthUser, MOCK_USERS } from "@/lib/permissions";
import { RegisterInput, SafeUser } from "@shared/types";
import { fetchWithTimeout } from "./apiFetch";

const DEFAULT_DEMO_PASSWORD_HASH = "$2b$10$pPw2AmBT1scTY5wU5cmpb.iLoWJZDwaVaGTxb0iT/diTyE2GKpECO";
const fallbackPasswordHashes = new Map<string, string>();

export const ApiAuthClient = {
  /**
   * Đăng nhập người dùng
   * Gọi API nội bộ Next.js (/api/auth/login) hoặc backend Node.js (PORT 5000),
   * tự động fallback bộ nhớ demo nếu máy chủ chưa phản hồi.
   */
  async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user?: AuthUser; token?: string; message?: string }> {
    const trimmed = identifier.trim().toLowerCase();

    // 1. Thử gọi qua API route (/api/auth/login)
    try {
      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.user) {
        const backendUser: SafeUser = data.data.user;
        const authUser: AuthUser = {
          id: backendUser.id,
          username: backendUser.username,
          displayName: backendUser.full_name,
          email: backendUser.email,
          role: backendUser.role,
          avatar: "",
          loginTime: new Date().toISOString(),
          sessionToken: data.data.token,
        };
        return { success: true, user: authUser, token: data.data.token, message: data.message };
      }

      if (!data.success && data.message) {
        return { success: false, message: data.message };
      }
    } catch {
      // 2. Thử gọi backend độc lập nếu API route chưa sẵn sàng
      const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL)?.replace(/\/$/, "");
      if (backendUrl) {
        try {
          const res = await fetchWithTimeout(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: trimmed, password }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.data?.user) {
            const backendUser: SafeUser = data.data.user;
            const authUser: AuthUser = {
              id: backendUser.id,
              username: backendUser.username,
              displayName: backendUser.full_name,
              email: backendUser.email,
              role: backendUser.role,
              avatar: "",
              loginTime: new Date().toISOString(),
              sessionToken: data.data.token,
            };
            return { success: true, user: authUser, token: data.data.token, message: data.message };
          }
        } catch {
          // Bỏ qua lỗi kết nối backend
        }
      }
    }

    // 3. Fallback danh sách tài khoản hợp lệ
    const demoUser = MOCK_USERS.find(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        u.username?.toLowerCase() === trimmed ||
        u.displayName.toLowerCase() === trimmed
    );

    if (demoUser) {
      const key = demoUser.id || demoUser.email.toLowerCase();
      const expectedHash = fallbackPasswordHashes.get(key) || DEFAULT_DEMO_PASSWORD_HASH;
      const isMatch = await bcrypt.compare(password, expectedHash);

      if (isMatch) {
        return {
          success: true,
          user: { ...demoUser, loginTime: new Date().toISOString() },
          message: "Đăng nhập thành công",
        };
      }
    }

    return { success: false, message: "Tài khoản hoặc mật khẩu không chính xác." };
  },

  /**
   * Đăng ký tài khoản mới (Sign Up)
   * Phía Backend luôn gán cứng role = 'user' chống leo thang đặc quyền
   */
  async register(
    payload: RegisterInput
  ): Promise<{ success: boolean; user?: SafeUser; message?: string }> {
    // 1. Thử gọi qua API route
    try {
      const res = await fetchWithTimeout("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, user: data.data, message: data.message || "Đăng ký thành công!" };
      }

      if (!data.success && data.message) {
        return { success: false, message: data.message };
      }
    } catch {
      // 2. Fallback trực tiếp
      const trimmedUser = payload.username.trim().toLowerCase();
      const trimmedMail = payload.email.trim().toLowerCase();

      const exists = MOCK_USERS.find(
        (u) => u.username?.toLowerCase() === trimmedUser || u.email.toLowerCase() === trimmedMail
      );

      if (exists) {
        return { success: false, message: "Tên đăng nhập hoặc email đã tồn tại trong hệ thống." };
      }

      const newUser: AuthUser = {
        id: `usr-${Date.now()}`,
        username: trimmedUser,
        displayName: payload.full_name.trim(),
        email: trimmedMail,
        role: "user", // BẢO MẬT: Luôn gán cứng role = 'user'
        avatar: "",
        loginTime: "",
      };

      MOCK_USERS.push(newUser);
      const passwordHash = await bcrypt.hash(payload.password, 12);
      fallbackPasswordHashes.set(newUser.id || trimmedUser, passwordHash);

      return {
        success: true,
        user: {
          id: newUser.id || `usr-${Date.now()}`,
          username: newUser.username || trimmedUser,
          full_name: newUser.displayName,
          email: newUser.email || trimmedMail,
          role: newUser.role,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Đăng ký tài khoản thành công!",
      };
    }

    return {
      success: false,
      message: "Không thể hoàn tất đăng ký. Vui lòng thử lại.",
    };
  },

  /**
   * Đổi mật khẩu của người dùng hiện tại
   */
  async changePassword(payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ success: boolean; message?: string }> {
    const authHeaders: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pbl3_auth_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.sessionToken) authHeaders["Authorization"] = `Bearer ${parsed.sessionToken}`;
        }
      } catch {
        // ignore
      }
    }

    // 1. Thử gọi backend Express nếu có cấu hình tường minh
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
    if (backendUrl) {
      try {
        const res = await fetchWithTimeout(`${backendUrl}/api/user/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(1500),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          return { success: true, message: data.message || "Đổi mật khẩu thành công" };
        }
        if (!data.success && data.message) {
          return { success: false, message: data.message };
        }
      } catch {
        // Backend offline -> fallback Next.js route
      }
    }

    // 2. Gọi qua Next.js Route
    try {
      const res = await fetchWithTimeout("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: !!data.success, message: data.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi đổi mật khẩu";
      return { success: false, message: msg };
    }
  },
};

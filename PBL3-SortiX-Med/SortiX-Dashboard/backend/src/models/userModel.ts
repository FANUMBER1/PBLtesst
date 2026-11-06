import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { UserAccount, SafeUser, UserRole, UserStatus } from "@shared/types";

const INITIAL_ADMIN_LIST: Omit<UserAccount, "id" | "password_hash" | "created_at" | "updated_at">[] = [
  {
    username: "admin1",
    email: "admin1@system.local",
    full_name: "Nguyễn Tá Duy Phong",
    role: "admin",
    status: "active",
  },
  {
    username: "admin2",
    email: "admin2@system.local",
    full_name: "Nguyễn Nhật Minh",
    role: "admin",
    status: "active",
  },
  {
    username: "admin3",
    email: "admin3@system.local",
    full_name: "Trần Đăng Lợi",
    role: "admin",
    status: "active",
  },
  {
    username: "admin4",
    email: "admin4@system.local",
    full_name: "Nguyễn Đình Anh Tuấn",
    role: "admin",
    status: "active",
  },
];

let usersStore: UserAccount[] = [];

function resolveStorageFilePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), "..", "data", "users.json"),
    path.join(process.cwd(), "data", "users.json"),
    path.join(process.cwd(), "users.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    if (fs.existsSync(dir)) {
      return p;
    }
  }

  return path.join(process.cwd(), "..", "data", "users.json");
}

function getStorageAdapter() {
  const adapter = (globalThis as unknown as { SortiXStorageAdapter?: { read: <T>(col: string, def: T) => T; write: <T>(col: string, data: T) => void } }).SortiXStorageAdapter;
  if (adapter && typeof adapter.read === "function" && typeof adapter.write === "function") {
    return adapter;
  }
  return null;
}

function loadUsersFromDisk(): UserAccount[] | null {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      const parsed = adapter.read<UserAccount[]>("users", []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let hasFixes = false;
        for (const u of parsed) {
          const legacyRecord = u as UserAccount & Record<string, unknown>;
          if ("plain_password" in legacyRecord) {
            delete legacyRecord.plain_password;
            hasFixes = true;
          }
          if (u.reset_otp === undefined) {
            u.reset_otp = null;
            hasFixes = true;
          }
          if (u.reset_otp_expires_at === undefined) {
            u.reset_otp_expires_at = null;
            hasFixes = true;
          }
        }
        if (hasFixes) {
          saveUsersToDisk(parsed);
        }
        return parsed;
      }
    } catch {}
  }

  const filePath = resolveStorageFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed: UserAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let hasFixes = false;
        for (const u of parsed) {
          const legacyRecord = u as UserAccount & Record<string, unknown>;
          if ("plain_password" in legacyRecord) {
            delete legacyRecord.plain_password;
            hasFixes = true;
          }
          if (u.reset_otp === undefined) {
            u.reset_otp = null;
            hasFixes = true;
          }
          if (u.reset_otp_expires_at === undefined) {
            u.reset_otp_expires_at = null;
            hasFixes = true;
          }
        }
        if (hasFixes) {
          saveUsersToDisk(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("[UserModel] Lỗi đọc users.json:", err);
  }
  return null;
}

function saveUsersToDisk(users: UserAccount[]): void {
  const adapter = getStorageAdapter();
  if (adapter) {
    try {
      adapter.write("users", users);
      return;
    } catch {}
  }

  const filePath = resolveStorageFilePath();
  try {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
    );
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(users, null, 2), "utf-8");
      fs.renameSync(temporaryPath, filePath);
    } finally {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      } catch {
        // Best effort cleanup; the atomic rename already completed if this runs.
      }
    }
  } catch (err) {
    console.error("[UserModel] Lỗi lưu users.json:", err);
  }
}

export function toSafeUser(user: UserAccount): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safe } = user;
  delete (safe as Record<string, unknown>).plain_password;
  return safe;
}

export const UserModel = {
  /**
   * Khởi tạo hoặc nạp 4 tài khoản Admin ban đầu một cách idempotent và đồng bộ với users.json
   */
  seedAdmins(customPassword?: string): void {
    const diskUsers = loadUsersFromDisk();
    if (diskUsers && diskUsers.length > 0) {
      usersStore = diskUsers;
      return;
    }

    const envPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
    const passwordToUse = customPassword || envPassword;
    // Tuyệt đối không dùng mật khẩu cố định có thể đoán được như 123456.
    // Nếu không cấu hình BOOTSTRAP_ADMIN_PASSWORD, tạo chuỗi ngẫu nhiên an toàn.
    const hash = passwordToUse
      ? bcrypt.hashSync(passwordToUse, 10)
      : bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);
    const now = new Date().toISOString();

    for (let i = 0; i < INITIAL_ADMIN_LIST.length; i++) {
      const adminData = INITIAL_ADMIN_LIST[i];
      const existing = usersStore.find(
        (u) => u.username.toLowerCase() === adminData.username.toLowerCase() || u.email.toLowerCase() === adminData.email.toLowerCase()
      );

      if (!existing) {
        usersStore.push({
          id: `admin-00${i + 1}`,
          ...adminData,
          password_hash: hash,
          created_at: now,
          updated_at: now,
        });
      } else {
        existing.full_name = adminData.full_name;
        existing.role = "admin";
        existing.status = "active";
      }
    }
    saveUsersToDisk(usersStore);
  },

  getAll(): SafeUser[] {
    return usersStore.map(toSafeUser);
  },

  findById(id: string): UserAccount | undefined {
    return usersStore.find((u) => u.id === id);
  },

  findByUsername(username: string): UserAccount | undefined {
    return usersStore.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  },

  findByEmail(email: string): UserAccount | undefined {
    return usersStore.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  updateProfile(
    id: string,
    data: { username?: string; full_name?: string; email?: string }
  ): UserAccount | undefined {
    const user = this.findById(id);
    if (!user) return undefined;

    if (data.username !== undefined) user.username = data.username.trim();
    if (data.full_name !== undefined) user.full_name = data.full_name.trim();
    if (data.email !== undefined) user.email = data.email.trim().toLowerCase();

    user.updated_at = new Date().toISOString();
    saveUsersToDisk(usersStore);
    return user;
  },

  updatePassword(id: string, newPasswordHash: string): UserAccount | undefined {
    const user = this.findById(id);
    if (!user) return undefined;

    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    saveUsersToDisk(usersStore);
    return user;
  },

  createUser(data: { full_name: string; username: string; email: string; password_hash: string }): UserAccount {
    const now = new Date().toISOString();
    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      full_name: data.full_name.trim(),
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash,
      role: "user", // BẢO MẬT: Luôn gán cứng role = 'user' chống leo thang đặc quyền
      status: "active",
      created_at: now,
      updated_at: now,
    };
    usersStore.push(newUser);
    saveUsersToDisk(usersStore);
    return newUser;
  },

  adminCreateUser(data: {
    full_name: string;
    username: string;
    email: string;
    password_hash: string;
    role?: UserRole;
    status?: UserStatus;
  }): UserAccount {
    const now = new Date().toISOString();
    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      full_name: data.full_name.trim(),
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash,
      role: data.role || "user",
      status: data.status || "active",
      created_at: now,
      updated_at: now,
    };
    usersStore.push(newUser);
    saveUsersToDisk(usersStore);
    return newUser;
  },

  adminUpdateUser(
    id: string,
    data: {
      full_name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      password_hash?: string;
    }
  ): UserAccount | undefined {
    const user = this.findById(id);
    if (!user) return undefined;

    if (data.full_name !== undefined) user.full_name = data.full_name.trim();
    if (data.email !== undefined) user.email = data.email.trim().toLowerCase();
    if (data.role !== undefined) user.role = data.role;
    if (data.status !== undefined) user.status = data.status;
    if (data.password_hash !== undefined) user.password_hash = data.password_hash;

    user.updated_at = new Date().toISOString();
    saveUsersToDisk(usersStore);
    return user;
  },

  adminDeleteUser(targetId: string, currentAdminId: string): { success: boolean; message?: string } {
    if (targetId === currentAdminId) {
      return { success: false, message: "Không được phép tự xóa tài khoản của chính mình" };
    }

    const targetUser = this.findById(targetId);
    if (!targetUser) {
      return { success: false, message: "Tài khoản không tồn tại" };
    }

    if (targetUser.role === "admin") {
      const remainingAdmins = usersStore.filter((u) => u.role === "admin");
      if (remainingAdmins.length <= 1) {
        return {
          success: false,
          message: "Không được phép xóa nếu số lượng tài khoản Admin còn lại <= 1",
        };
      }
    }

    usersStore = usersStore.filter((u) => u.id !== targetId);
    saveUsersToDisk(usersStore);
    return { success: true, message: "Đã xóa tài khoản thành công" };
  },

  findByIdentifier(identifier: string): UserAccount | undefined {
    const term = identifier.trim().toLowerCase();
    return usersStore.find(
      (u) => u.username.toLowerCase() === term || u.email.toLowerCase() === term
    );
  },

  setResetOtp(identifier: string, otp: string, expiresAt: string): UserAccount | undefined {
    const term = identifier.trim().toLowerCase();
    const user = usersStore.find(
      (u) => u.username.toLowerCase() === term || u.email.toLowerCase() === term
    );
    if (!user) return undefined;

    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    user.reset_otp = otpHash;
    user.reset_otp_expires_at = expiresAt;
    user.reset_otp_attempts = 0;
    user.updated_at = new Date().toISOString();
    saveUsersToDisk(usersStore);
    return user;
  },

  resetPasswordWithOtp(
    identifier: string,
    otp: string,
    newPasswordHash: string
  ): { success: boolean; message: string; user?: UserAccount } {
    const term = identifier.trim().toLowerCase();
    const user = usersStore.find(
      (u) => u.username.toLowerCase() === term || u.email.toLowerCase() === term
    );
    if (!user) {
      return { success: false, message: "Không tìm thấy tài khoản trong hệ thống" };
    }

    // BẢO MẬT: Tài khoản Quản trị viên (Admin) chỉ được phép đổi mật khẩu khi đã đăng nhập bên trong hệ thống
    if (user.role === "admin") {
      return {
        success: false,
        message: "Vì lý do an toàn bảo mật, tài khoản Quản trị viên (Admin) chỉ có thể đổi mật khẩu sau khi đã đăng nhập vào hệ thống.",
      };
    }

    if (!user.reset_otp || !user.reset_otp_expires_at) {
      return { success: false, message: "Yêu cầu khôi phục không tồn tại hoặc đã bị hủy. Vui lòng tạo yêu cầu mới." };
    }

    if (new Date(user.reset_otp_expires_at).getTime() <= Date.now()) {
      user.reset_otp = null;
      user.reset_otp_expires_at = null;
      user.reset_otp_attempts = 0;
      saveUsersToDisk(usersStore);
      return { success: false, message: "Mã OTP đã hết hạn hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới." };
    }

    if ((user.reset_otp_attempts || 0) >= 5) {
      user.reset_otp = null;
      user.reset_otp_expires_at = null;
      user.reset_otp_attempts = 0;
      saveUsersToDisk(usersStore);
      return { success: false, message: "Bạn đã thử sai mã OTP quá 5 lần. Mã OTP đã bị hủy vì lý do an toàn." };
    }

    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
    if (user.reset_otp !== inputHash) {
      user.reset_otp_attempts = (user.reset_otp_attempts || 0) + 1;
      saveUsersToDisk(usersStore);
      const remaining = 5 - user.reset_otp_attempts;
      return { success: false, message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` };
    }

    user.password_hash = newPasswordHash;
    user.reset_otp = null;
    user.reset_otp_expires_at = null;
    user.reset_otp_attempts = 0;
    user.updated_at = new Date().toISOString();
    saveUsersToDisk(usersStore);

    return {
      success: true,
      message: "Đổi mật khẩu thành công!",
      user,
    };
  },

  reset(): void {
    usersStore = [];
    this.seedAdmins();
  },
};

// Auto-seed on load
UserModel.seedAdmins();

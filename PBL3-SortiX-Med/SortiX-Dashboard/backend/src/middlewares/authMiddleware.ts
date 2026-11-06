import http from "node:http";
import { UserRole } from "@shared/types";
import { UserModel } from "../models/userModel";
import { verifyAuthToken } from "../services/authToken";

export interface AuthenticatedContext {
  userId: string;
  role: UserRole;
  username: string;
  isAuthenticated: boolean;
}

/**
 * Trích xuất và giải mã danh tính người dùng từ Request Headers
 * Hỗ trợ:
 * Authorization: Bearer <signed session token>
 */
export function resolveUserFromRequest(req: http.IncomingMessage): AuthenticatedContext {
  const authHeader = req.headers.authorization;
  // Chỉ token phiên đã ký mới được dùng để xác thực. Các header nhận từ client
  // không được tin cậy vì có thể bị giả mạo.
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const claims = verifyAuthToken(authHeader.slice(7).trim());
    if (claims) {
      const dbUser = UserModel.findById(claims.id);
      if (dbUser && dbUser.status === "active" && dbUser.role === claims.role && dbUser.username === claims.username) {
        return {
          userId: dbUser.id,
          role: dbUser.role,
          username: dbUser.username,
          isAuthenticated: true,
        };
      }
    }
  }

  return {
    userId: "guest",
    role: "user",
    username: "guest",
    isAuthenticated: false,
  };
}

/**
 * Kiểm tra phân quyền RBAC
 * Trả về HTTP 403 Forbidden nếu vai trò hiện tại không nằm trong danh sách cho phép
 */
export function checkRolePermission(
  currentRole: UserRole,
  allowedRoles: UserRole[]
): { allowed: boolean; status?: number; error?: string } {
  if (allowedRoles.includes(currentRole)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    error: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)",
  };
}

export function requireAdmin(req: http.IncomingMessage): AuthenticatedContext | { status: 403; error: string } {
  const context = resolveUserFromRequest(req);
  if (!context.isAuthenticated || context.role !== "admin") {
    return { status: 403, error: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" };
  }
  return context;
}

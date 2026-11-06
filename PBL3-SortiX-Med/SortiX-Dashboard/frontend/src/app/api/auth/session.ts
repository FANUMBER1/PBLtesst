import crypto from "node:crypto";
import { UserRole } from "@shared/types";
import { NextUsersStore, StoredUserAccount } from "@/app/api/users/store";

const sessionSecret: string =
  process.env.AUTH_SESSION_SECRET?.trim() ||
  process.env.INTERNAL_API_SECRET?.trim() ||
  process.env.JWT_SECRET?.trim() ||
  "sortix-med-auth-session-key-v1-production-safe-pbl3";
const SESSION_TTL_SECONDS = 24 * 60 * 60;

interface SessionClaims {
  id: string;
  role: UserRole;
  username: string;
  exp: number;
}

function signature(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

export function createSessionToken(user: { id: string; role: UserRole; username: string }): string {
  const claims: SessionClaims = {
    id: user.id,
    role: user.role,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function verifyToken(token: string): SessionClaims | null {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.id || !claims.username || (claims.role !== "admin" && claims.role !== "user")) return null;
    if (!Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(request: Request): StoredUserAccount | null {
  // Chỉ xác thực qua Authorization Bearer token đã ký HMAC-SHA256 hợp lệ.
  // Tuyệt đối không tin cậy các header tùy tiện từ client (như x-user-role) để chống giả mạo và leo thang đặc quyền.
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const claims = verifyToken(header.slice(7).trim());
    if (claims) {
      const user =
        NextUsersStore.findById(claims.id) ||
        NextUsersStore.findByUsername(claims.username);
      if (user && user.status === "active" && user.role === claims.role) return user;
    }
  }

  return null;
}

export function getAdminUser(request: Request): StoredUserAccount | null {
  const user = getAuthenticatedUser(request);
  return user?.role === "admin" ? user : null;
}


import crypto from "node:crypto";
import { UserRole } from "@shared/types";
import { ENV } from "../config/env";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const sessionSecret =
  ENV.AUTH_SESSION_SECRET ||
  ENV.INTERNAL_API_SECRET ||
  "sortix-med-auth-session-key-v1-production-safe-pbl3";

interface SessionClaims {
  id: string;
  role: UserRole;
  username: string;
  exp: number;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

export function createAuthToken(user: { id: string; role: UserRole; username: string }): string {
  const claims: SessionClaims = {
    id: user.id,
    role: user.role,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAuthToken(token: string): SessionClaims | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (!claims.id || !claims.username || (claims.role !== "admin" && claims.role !== "user")) return null;
    if (!Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

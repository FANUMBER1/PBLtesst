import { z } from "zod";

const EVENT_TYPES = [
  "emergency_stop",
  "jam_detected",
  "motor_stall",
  "sensor_fault",
  "camera_disconnected",
  "vision_service_down",
  "config_rejected",
  "mqtt_disconnected",
  "device_offline",
  "temperature_warning",
  "bin_full",
] as const;

/** Request payload accepted by both alert endpoints. Unknown fields are rejected. */
export const AlertPayloadSchema = z
  .object({
    event_id: z.string().trim().min(1).max(128),
    event_type: z.enum(EVENT_TYPES),
    severity: z.enum(["critical", "warning", "info"]),
    device_id: z.string().trim().min(1).max(128),
    description: z.string().trim().min(1).max(4000),
    timestamp: z.string().datetime({ offset: true }),
    resolved: z.boolean().optional(),
    mode: z.enum(["simulation", "realtime"]).optional(),
  })
  .strict();

export type AlertPayload = z.infer<typeof AlertPayloadSchema>;

export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Small bounded in-memory limiter suitable for a single dashboard instance. */
export function allowRequest(cache: Map<string, number>, key: string, windowMs = 5000): boolean {
  const now = Date.now();
  for (const [cachedKey, timestamp] of cache) {
    if (now - timestamp >= windowMs) cache.delete(cachedKey);
  }
  const last = cache.get(key);
  if (last !== undefined && now - last < windowMs) return false;
  if (cache.size >= 2000) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, now);
  return true;
}

export function hasValidInternalSecret(authHeader: string | null, configuredSecret: string): boolean {
  if (!configuredSecret) return true;
  return authHeader === `Bearer ${configuredSecret}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[match]!);
}

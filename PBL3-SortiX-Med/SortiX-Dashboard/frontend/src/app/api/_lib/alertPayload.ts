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
  "shift_summary",
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

export function clientAddress(request: Request): string {
  // Only use the first forwarded address; this keeps the key stable behind a proxy.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Small bounded in-memory limiter suitable for a single dashboard instance. */
export function allowRequest(cache: Map<string, number>, key: string, windowMs = 5000): boolean {
  const now = Date.now();
  for (const [cachedKey, timestamp] of cache) {
    if (now - timestamp >= windowMs) cache.delete(cachedKey);
  }
  const last = cache.get(key);
  if (last !== undefined && now - last < windowMs) return false;
  // Avoid unbounded memory growth if a proxy forwards arbitrary addresses.
  if (cache.size >= 2000) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, now);
  return true;
}

export function hasValidInternalSecret(request: Request): boolean {
  const configured = process.env.INTERNAL_API_SECRET?.trim();
  // Browser clients call these same-origin routes and cannot safely receive a
  // server secret. Deployments that invoke the endpoint from a trusted backend
  // can set INTERNAL_API_SECRET to require a bearer token.
  if (!configured) return true;
  const supplied = request.headers.get("authorization");
  return supplied === `Bearer ${configured}`;
}

export async function readAlertPayload(request: Request): Promise<AlertPayload> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("CONTENT_TYPE");
  }
  const raw = await request.json();
  return AlertPayloadSchema.parse(raw);
}

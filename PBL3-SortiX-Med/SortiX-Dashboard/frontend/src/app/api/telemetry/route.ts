import { NextResponse } from "next/server";
import { TelemetryController } from "@/services/telemetryService";
import { SafetyService } from "../../../../../backend/src/services/safetyService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const telemetry = SafetyService.getTelemetry();
    return NextResponse.json({
      success: true,
      ...telemetry,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers: Record<string, string | undefined> = {
      "x-device-token": request.headers.get("x-device-token") || undefined,
      "authorization": request.headers.get("authorization") || undefined,
    };
    const result = TelemetryController.handlePostTelemetry(body, headers);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON payload";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

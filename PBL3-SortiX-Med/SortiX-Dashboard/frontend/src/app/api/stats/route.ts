import { NextResponse } from "next/server";
import { getSystemStats } from "@/services/statsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getSystemStats();
  return NextResponse.json({
    success: true,
    data: stats,
  });
}

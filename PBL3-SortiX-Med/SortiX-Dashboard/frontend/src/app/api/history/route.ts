import { NextResponse } from "next/server";
import {
  queryClassificationHistory,
  addClassificationRecord,
  clearAllHistory,
} from "@/services/historyService";
import { HistoryQuerySchema } from "@/lib/schemas";
import { getAdminUser } from "../auth/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryObj = {
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      brand: searchParams.get("brand") || undefined,
      bin: searchParams.get("bin") || undefined,
      status: searchParams.get("status") || undefined,
      date: searchParams.get("date") || undefined,
    };

    const parsedQuery = HistoryQuerySchema.parse(queryObj);
    const result = queryClassificationHistory(parsedQuery);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid query parameters";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = addClassificationRecord(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: "Record added", data: result.record },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!getAdminUser(request)) {
    return NextResponse.json({ success: false, message: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin)" }, { status: 403 });
  }
  clearAllHistory();
  return NextResponse.json({ success: true, message: "Classification history cleared" });
}

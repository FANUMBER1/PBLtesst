import { NextResponse } from "next/server";
import { NotificationModel } from "../../../../../backend/src/models/notificationModel";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") || undefined;

  let list = NotificationModel.getAll();
  if (statusParam) {
    list = list.filter((n) => n.status === statusParam);
  }

  return NextResponse.json({
    success: true,
    data: list,
    total: list.length,
  });
}

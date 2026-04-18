import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHistoryImport } from "@/lib/server/history-import-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getHistoryImport(id);
  if (!item) {
    return NextResponse.json({ message: "任务不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: item });
}

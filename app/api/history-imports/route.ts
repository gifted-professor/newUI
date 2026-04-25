import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createHistoryImport, listHistoryImports } from "@/lib/server/history-import-store";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  const items = await listHistoryImports();
  return NextResponse.json({ ok: true, data: { items } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as { corpusPath?: string; keywords?: string[]; limit?: number };
  if (payload.corpusPath?.trim()) {
    return NextResponse.json({ message: "历史解析仅支持通过 ZIP 上传创建任务。" }, { status: 400 });
  }

  const keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
  const limit = payload.limit ?? 0;

  const item = await createHistoryImport({
    corpusPath: "",
    keywords,
    limit,
  });

  return NextResponse.json({ ok: true, data: item });
}

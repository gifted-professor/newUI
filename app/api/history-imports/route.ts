import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runHistoryImportTask } from "@/lib/server/history-import-runner";
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
  const corpusPath = payload.corpusPath?.trim() || "";
  const keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
  const limit = payload.limit ?? 0;

  const item = await createHistoryImport({
    corpusPath,
    keywords,
    limit,
  });

  if (corpusPath) {
    queueMicrotask(() => {
      runHistoryImportTask({
        id: item.id,
        corpusPath,
        keywords,
        limit,
      }).catch(async (error) => {
        const { updateHistoryImport } = await import("@/lib/server/history-import-store");
        await updateHistoryImport(item.id, { status: "failed", error: error instanceof Error ? error.message : "任务失败" });
      });
    });
  }

  return NextResponse.json({ ok: true, data: item });
}

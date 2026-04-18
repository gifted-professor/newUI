import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runHistoryImportTask } from "@/lib/server/history-import-runner";
import { createHistoryImport, getHistoryImport, updateHistoryImport } from "@/lib/server/history-import-store";
import { saveUploadedZipAndExtract } from "@/lib/server/history-import-upload";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
   const keywordsValue = formData.get("keywords");
  const limitValue = formData.get("limit");
  const parsedKeywords = typeof keywordsValue === "string"
    ? (() => {
        try {
          const value = JSON.parse(keywordsValue);
          return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
        } catch {
          return [];
        }
      })()
    : [];
  const parsedLimit = typeof limitValue === "string" ? Number(limitValue) || 0 : 0;

  let item = await getHistoryImport(id);
  if (!item) {
    item = await createHistoryImport({ id, corpusPath: "", keywords: parsedKeywords, limit: parsedLimit });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请上传 ZIP 文件。" }, { status: 400 });
  }

  const saved = await saveUploadedZipAndExtract(id, file);
  const effectiveKeywords = parsedKeywords.length ? parsedKeywords : item.keywords;
  const effectiveLimit = parsedLimit > 0 ? parsedLimit : item.limit;
  const latest = await updateHistoryImport(id, {
    corpusPath: saved.extractedDir,
    status: "created",
    keywords: effectiveKeywords,
    limit: effectiveLimit,
  });

  if (process.env.VERCEL) {
    try {
      await runHistoryImportTask({ id, corpusPath: saved.extractedDir, keywords: effectiveKeywords, limit: effectiveLimit });
      const completed = await getHistoryImport(id);
      return NextResponse.json({ ok: true, data: { id, extractedDir: saved.extractedDir, item: completed ?? latest } });
    } catch (error) {
      const failed = await updateHistoryImport(id, { status: "failed", error: error instanceof Error ? error.message : "任务失败" });
      return NextResponse.json({ ok: false, message: failed?.error || "任务失败" }, { status: 500 });
    }
  }

  queueMicrotask(() => {
    runHistoryImportTask({ id, corpusPath: saved.extractedDir, keywords: effectiveKeywords, limit: effectiveLimit }).catch(async (error) => {
      await updateHistoryImport(id, { status: "failed", error: error instanceof Error ? error.message : "任务失败" });
    });
  });

  return NextResponse.json({ ok: true, data: { id, extractedDir: saved.extractedDir, item: latest } });
}

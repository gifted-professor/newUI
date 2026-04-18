import { executeHistoryImport } from "../shared/history-import-executor";
import { updateHistoryImport } from "./history-import-store";

export async function runHistoryImportTask({ id, corpusPath, keywords, limit = 0 }: { id: string; corpusPath: string; keywords: string[]; limit?: number }) {
  await updateHistoryImport(id, { status: "running" });
  const result = await executeHistoryImport({ corpusPath, keywords, limit });
  await updateHistoryImport(id, {
    status: "completed",
    result,
  });
  return result;
}

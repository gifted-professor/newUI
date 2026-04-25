import { resolveHistoryImportProviderName, type HistoryImportProviderName } from "@/lib/history-import-provider";
import {
  createLocalHistoryImport,
  getLocalHistoryImport,
  listLocalHistoryImports,
  uploadLocalHistoryImportZip,
} from "@/lib/history-import-local-client";

type CreatePayload = { corpusPath?: string; keywords: string[]; limit?: number };
type UploadOptions = { keywords?: string[]; limit?: number };

async function listWebHistoryImports() {
  const response = await fetch("/api/history-imports", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.message || "无法获取历史解析任务");
  return data.data.items ?? [];
}

async function createWebHistoryImport(payload: CreatePayload) {
  const response = await fetch("/api/history-imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.message || "无法创建历史解析任务");
  return data.data;
}

async function uploadWebHistoryImportZip(id: string, file: File, options?: UploadOptions) {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.keywords?.length) {
    formData.append("keywords", JSON.stringify(options.keywords));
  }
  if (typeof options?.limit === "number") {
    formData.append("limit", String(options.limit));
  }
  const response = await fetch(`/api/history-imports/${id}/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.message || "无法上传历史邮件 ZIP");
  return data.data;
}

async function getWebHistoryImport(id: string) {
  const response = await fetch(`/api/history-imports/${id}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.message || "无法获取任务详情");
  return data.data;
}

export async function listHistoryImports() {
  const provider = await resolveHistoryImportProviderName();
  return listHistoryImportsForProvider(provider);
}

export async function createHistoryImport(payload: CreatePayload) {
  const provider = await resolveHistoryImportProviderName();
  return createHistoryImportForProvider(provider, payload);
}

export async function uploadHistoryImportZip(id: string, file: File, options?: UploadOptions) {
  const provider = await resolveHistoryImportProviderName();
  return uploadHistoryImportZipForProvider(provider, id, file, options);
}

export async function getHistoryImport(id: string) {
  const provider = await resolveHistoryImportProviderName();
  return getHistoryImportForProvider(provider, id);
}

export async function listHistoryImportsForProvider(provider: HistoryImportProviderName) {
  return provider === "local" ? listLocalHistoryImports() : listWebHistoryImports();
}

export async function createHistoryImportForProvider(provider: HistoryImportProviderName, payload: CreatePayload) {
  return provider === "local" ? createLocalHistoryImport(payload) : createWebHistoryImport(payload);
}

export async function uploadHistoryImportZipForProvider(provider: HistoryImportProviderName, id: string, file: File, options?: UploadOptions) {
  return provider === "local" ? uploadLocalHistoryImportZip(id, file, options) : uploadWebHistoryImportZip(id, file, options);
}

export async function getHistoryImportForProvider(provider: HistoryImportProviderName, id: string) {
  return provider === "local" ? getLocalHistoryImport(id) : getWebHistoryImport(id);
}

import { LOCAL_CONNECTOR_BASE } from "@/lib/local-connector";

type UploadOptions = { keywords?: string[]; limit?: number };

async function parseResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || data?.message || "本地历史解析请求失败");
  }
  return data.data;
}

export async function listLocalHistoryImports() {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/history-imports`, { cache: "no-store" });
  const data = await parseResponse(response);
  return data.items ?? [];
}

export async function createLocalHistoryImport(payload: { corpusPath?: string; keywords: string[]; limit?: number }) {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/history-imports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function getLocalHistoryImport(id: string) {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/history-imports/${id}`, { cache: "no-store" });
  return parseResponse(response);
}

export async function uploadLocalHistoryImportZip(id: string, file: File, options?: UploadOptions) {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.keywords?.length) {
    formData.append("keywords", JSON.stringify(options.keywords));
  }
  if (typeof options?.limit === "number") {
    formData.append("limit", String(options.limit));
  }

  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/history-imports/${id}/upload`, {
    method: "POST",
    body: formData,
  });
  return parseResponse(response);
}

import { buildLocalConnectorHeaders, LOCAL_CONNECTOR_BASE } from "@/lib/local-connector";

type UploadOptions = { keywords?: string[]; limit?: number };

function mapConnectorError(response: Response, data: any) {
  const code = data?.error?.code;
  const message = data?.error?.message || data?.message;
  if (code === "UNAUTHORIZED") return `${message || "本地连接器授权失败。"}请检查 LOCAL_CONNECTOR_TOKEN / NEXT_PUBLIC_LOCAL_CONNECTOR_TOKEN 是否一致。`;
  if (code === "FORBIDDEN_ORIGIN") return `${message || "当前页面来源不被本地连接器允许。"}请检查 LOCAL_CONNECTOR_ALLOWED_ORIGINS。`;
  if (code === "INVALID_INPUT" || code === "INVALID_UPLOAD") return message || "本地连接器输入无效。";
  return message || `本地连接器请求失败 (${response.status})。`;
}

async function parseResponse(response: Response) {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("本地连接器返回了无法识别的响应。");
  }

  if (!response.ok || !data?.ok) {
    throw new Error(mapConnectorError(response, data));
  }
  return data.data;
}

async function requestLocalConnector(path: string, init: RequestInit = {}, timeoutMs = 8000) {
  try {
    const response = await fetch(`${LOCAL_CONNECTOR_BASE}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
    return parseResponse(response);
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("本地连接器响应超时，请确认它仍在运行。");
    }
    if (error instanceof TypeError) {
      throw new Error("无法连接本地连接器，请确认 local-connector 已启动，且 Origin / token 配置正确。");
    }
    throw error;
  }
}

export async function listLocalHistoryImports() {
  const data = await requestLocalConnector("/history-imports", {
    cache: "no-store",
    headers: buildLocalConnectorHeaders(),
  });
  return data.items ?? [];
}

export async function createLocalHistoryImport(payload: { corpusPath?: string; keywords: string[]; limit?: number }) {
  return requestLocalConnector("/history-imports", {
    method: "POST",
    headers: buildLocalConnectorHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function getLocalHistoryImport(id: string) {
  return requestLocalConnector(`/history-imports/${id}`, {
    cache: "no-store",
    headers: buildLocalConnectorHeaders(),
  });
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

  return requestLocalConnector(`/history-imports/${id}/upload`, {
    method: "POST",
    headers: buildLocalConnectorHeaders(),
    body: formData,
  }, 120000);
}

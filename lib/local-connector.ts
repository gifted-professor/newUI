export const LOCAL_CONNECTOR_BASE = process.env.NEXT_PUBLIC_LOCAL_CONNECTOR_BASE || "http://127.0.0.1:48721/v1";

export async function isLocalConnectorReachable() {
  try {
    const response = await fetch(`${LOCAL_CONNECTOR_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchConnectorStatus() {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/status`, { cache: "no-store" });
  if (!response.ok) throw new Error("无法获取本地连接器状态");
  const data = await response.json();
  return data?.data ?? null;
}

export async function fetchConnectorScopes() {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/mail/scopes`, { cache: "no-store" });
  if (!response.ok) throw new Error("无法获取抓取范围");
  const data = await response.json();
  return data?.data ?? null;
}

type SaveConnectorScopesPayload = {
  includeSent: boolean;
  excludeSystemFolders: boolean;
  onlyUnread: boolean;
  maxEmailsPerRun: number;
  uploadPolicy: string;
  scopes: Array<{ id: string; enabled: boolean }>;
};

export async function saveConnectorScopes(payload: SaveConnectorScopesPayload) {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/mail/scopes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || "抓取范围保存失败");
  }
  return data?.data ?? null;
}

export async function startConnectorRun(limit?: number) {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/parse/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(typeof limit === "number" ? { limit } : {}),
  });

  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || "无法启动本地同步");
  }
  return data?.data ?? null;
}

export async function fetchConnectorLogs(limit = 50) {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/logs?limit=${limit}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || "无法获取本地运行日志");
  }
  return data?.data?.items ?? [];
}

export async function fetchConnectorJobs() {
  const response = await fetch(`${LOCAL_CONNECTOR_BASE}/jobs`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message || "无法获取本地任务状态");
  }
  return data?.data?.items ?? [];
}

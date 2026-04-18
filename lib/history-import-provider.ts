import { isLocalConnectorReachable } from "@/lib/local-connector";

export type HistoryImportProviderName = "local" | "web";

export async function resolveHistoryImportProviderName(): Promise<HistoryImportProviderName> {
  return (await isLocalConnectorReachable()) ? "local" : "web";
}

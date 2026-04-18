import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type HistoryImportResult = {
  stats: Record<string, number>;
  items: unknown[];
  conversationGroups: unknown[];
  leadReviewRows: unknown[];
};

export type HistoryImportItem = {
  id: string;
  status: "created" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  keywords: string[];
  corpusPath: string;
  limit: number;
  result: HistoryImportResult | null;
  error?: string;
};

type HistoryImportState = {
  items: HistoryImportItem[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeRoot = process.env.VERCEL ? "/tmp/newui-history-imports" : path.resolve(__dirname, "../../../data/history-imports");
const dataDir = runtimeRoot;
const stateFile = path.join(dataDir, "imports.json");

function createDefaultState(): HistoryImportState {
  return { items: [] };
}

async function ensureStore(): Promise<HistoryImportState> {
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw) as HistoryImportState;
  } catch {
    const next = createDefaultState();
    await writeFile(stateFile, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
}

async function persist(state: HistoryImportState) {
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export async function listHistoryImports(): Promise<HistoryImportItem[]> {
  const state = await ensureStore();
  return state.items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getHistoryImport(id: string): Promise<HistoryImportItem | null> {
  const state = await ensureStore();
  return state.items.find((item) => item.id === id) ?? null;
}

export async function createHistoryImport(payload: { id?: string; corpusPath?: string; keywords: string[]; limit?: number }): Promise<HistoryImportItem> {
  const state = await ensureStore();
  const item: HistoryImportItem = {
    id: payload.id || `hist_${Date.now()}`,
    status: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keywords: payload.keywords || [],
    corpusPath: payload.corpusPath || "",
    limit: payload.limit ?? 0,
    result: null,
  };
  state.items.unshift(item);
  await persist(state);
  return item;
}

export async function updateHistoryImport(id: string, patch: Partial<HistoryImportItem>): Promise<HistoryImportItem | null> {
  const state = await ensureStore();
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  await persist(state);
  return item;
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data/history-imports");
const stateFile = path.join(dataDir, "imports.json");

function createDefaultState() {
  return { items: [] };
}

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw);
  } catch {
    const next = createDefaultState();
    await writeFile(stateFile, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
}

async function persist(state) {
  await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export async function listHistoryImports() {
  const state = await ensureStore();
  return state.items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getHistoryImport(id) {
  const state = await ensureStore();
  return state.items.find((item) => item.id === id) || null;
}

export async function createHistoryImport({ id, corpusPath = "", keywords = [], limit = 0 }) {
  const state = await ensureStore();
  const item = {
    id: id || `hist_local_${Date.now()}`,
    status: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keywords,
    corpusPath,
    limit,
    result: null,
  };
  state.items.unshift(item);
  await persist(state);
  return item;
}

export async function updateHistoryImport(id, patch) {
  const state = await ensureStore();
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  await persist(state);
  return item;
}

export function getHistoryImportDataDir() {
  return dataDir;
}

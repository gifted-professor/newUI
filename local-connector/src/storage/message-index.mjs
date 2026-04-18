import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const indexFile = path.join(dataDir, "message-index.json");

let indexCache = null;

function createDefaultIndex() {
  return {
    version: 1,
    items: {},
  };
}

function normalizeKeySegment(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildMessageKey({ accountEmail, remoteId, uid }) {
  return [normalizeKeySegment(accountEmail), normalizeKeySegment(remoteId), String(uid)].join("::");
}

async function ensureIndexFile() {
  await mkdir(dataDir, { recursive: true });
  if (indexCache) return;

  try {
    const raw = await readFile(indexFile, "utf8");
    indexCache = JSON.parse(raw);
  } catch {
    indexCache = createDefaultIndex();
    await persist();
  }
}

async function persist() {
  await writeFile(indexFile, JSON.stringify(indexCache, null, 2), "utf8");
}

export async function readMessageIndex() {
  await ensureIndexFile();
  return structuredClone(indexCache);
}

export async function getKnownMessageKeys() {
  await ensureIndexFile();
  return new Set(Object.keys(indexCache.items || {}));
}

export async function recordIndexedMessages(entries) {
  await ensureIndexFile();
  const now = new Date().toISOString();

  for (const entry of entries) {
    indexCache.items[entry.key] = {
      runId: entry.runId,
      fileName: entry.fileName,
      remoteId: entry.remoteId,
      uid: entry.uid,
      savedAt: entry.savedAt || now,
    };
  }

  await persist();
  return structuredClone(indexCache);
}

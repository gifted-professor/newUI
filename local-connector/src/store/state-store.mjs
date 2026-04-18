import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultState } from "./default-state.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const stateFile = path.join(dataDir, "state.json");

let stateCache = null;

async function ensureStateFile() {
  await mkdir(dataDir, { recursive: true });
  if (stateCache) return;

  try {
    const raw = await readFile(stateFile, "utf8");
    stateCache = JSON.parse(raw);
  } catch {
    stateCache = createDefaultState();
    await persist();
  }
}

async function persist() {
  await writeFile(stateFile, JSON.stringify(stateCache, null, 2), "utf8");
}

export async function readState() {
  await ensureStateFile();
  return structuredClone(stateCache);
}

export async function updateState(mutator) {
  await ensureStateFile();
  const nextState = structuredClone(stateCache);
  await mutator(nextState);
  stateCache = nextState;
  await persist();
  return structuredClone(stateCache);
}

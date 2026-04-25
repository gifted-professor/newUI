import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../data/history-imports/uploads");
const maxZipBytes = 50 * 1024 * 1024;
const maxEntries = 2000;
const maxEntryBytes = 25 * 1024 * 1024;
const maxExtractedBytes = 250 * 1024 * 1024;

function assertSafeImportId(importId) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(importId)) {
    throw new Error("历史解析任务 ID 不合法。");
  }
}

function isZipSymlink(entry) {
  const mode = (entry.attr >>> 16) & 0o170000;
  return mode === 0o120000;
}

function resolveInside(rootDir, entryName) {
  const targetPath = path.resolve(rootDir, entryName);
  const normalizedRoot = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;

  if (targetPath !== rootDir && !targetPath.startsWith(normalizedRoot)) {
    throw new Error("ZIP 文件包含不安全路径。");
  }

  return targetPath;
}

async function extractSafeEmlEntries(bytes, extractedDir) {
  const zip = new AdmZip(bytes);
  const entries = zip.getEntries();

  if (entries.length > maxEntries) {
    throw new Error("ZIP 文件内文件数量过多。");
  }

  let extractedBytes = 0;
  let emlCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (isZipSymlink(entry)) {
      throw new Error("ZIP 文件不能包含符号链接。");
    }

    const entryName = entry.entryName.replace(/\\/g, "/");
    if (!entryName.toLowerCase().endsWith(".eml")) continue;

    const entrySize = entry.header.size;
    if (entrySize > maxEntryBytes) {
      throw new Error("单封 EML 文件过大。");
    }

    extractedBytes += entrySize;
    if (extractedBytes > maxExtractedBytes) {
      throw new Error("ZIP 解压后体积过大。");
    }

    const targetPath = resolveInside(extractedDir, entryName);
    const data = entry.getData();
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, data);
    emlCount += 1;
  }

  if (!emlCount) {
    throw new Error("ZIP 中未找到 EML 文件。");
  }
}

export async function saveUploadedZipAndExtract(importId, { fileName, bytes }) {
  assertSafeImportId(importId);
  if (!Buffer.isBuffer(bytes) || bytes.length > maxZipBytes) {
    throw new Error("ZIP 文件过大。");
  }

  const importDir = path.join(uploadsDir, importId);
  const extractedDir = path.join(importDir, "emails");
  await rm(extractedDir, { recursive: true, force: true });
  await mkdir(extractedDir, { recursive: true });
  const zipPath = path.join(importDir, "emails.zip");
  await writeFile(zipPath, bytes);

  await extractSafeEmlEntries(bytes, extractedDir);

  return { zipPath, extractedDir };
}

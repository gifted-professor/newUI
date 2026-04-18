import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.VERCEL
  ? "/tmp/newui-history-imports/uploads"
  : path.resolve(__dirname, "../../../data/history-imports/uploads");

export async function saveUploadedZipAndExtract(importId: string, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const importDir = path.join(uploadsDir, importId);
  const extractedDir = path.join(importDir, "emails");
  await mkdir(extractedDir, { recursive: true });
  const zipPath = path.join(importDir, file.name || "emails.zip");
  await writeFile(zipPath, bytes);

  const zip = new AdmZip(bytes);
  zip.extractAllTo(extractedDir, true);

  return { zipPath, extractedDir };
}

import { realpath, stat } from "node:fs/promises";
import path from "node:path";

function getConfiguredRoots() {
  const raw = process.env.LOCAL_CONNECTOR_ALLOWED_IMPORT_ROOTS || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isInsideRoot(candidatePath, rootPath) {
  const normalizedRoot = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  return candidatePath === rootPath || candidatePath.startsWith(normalizedRoot);
}

export async function resolveAllowedCorpusPath(corpusPath) {
  if (typeof corpusPath !== "string" || !corpusPath.trim()) {
    throw new Error("本地目录不能为空。");
  }

  const configuredRoots = getConfiguredRoots();
  if (!configuredRoots.length) {
    throw new Error("请先配置 LOCAL_CONNECTOR_ALLOWED_IMPORT_ROOTS，明确允许扫描的本地根目录。");
  }

  const resolvedPath = await realpath(corpusPath.trim());
  const info = await stat(resolvedPath);
  if (!info.isDirectory()) {
    throw new Error("本地路径必须是目录。");
  }

  const roots = await Promise.all(
    configuredRoots.map(async (root) => {
      try {
        return await realpath(root);
      } catch {
        return null;
      }
    }),
  );
  const allowedRoots = roots.filter(Boolean);

  if (!allowedRoots.some((root) => isInsideRoot(resolvedPath, root))) {
    throw new Error("该目录不在本地连接器允许扫描的根目录内。");
  }

  return resolvedPath;
}

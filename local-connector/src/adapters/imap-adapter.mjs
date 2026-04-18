import { ImapFlow } from "imapflow";
import { buildMessageKey } from "../storage/message-index.mjs";

function normalizeFolderName(name) {
  const lower = name.toLowerCase();
  if (lower === "inbox") return { id: "inbox", kind: "inbox", recommended: true, system: true };
  if (lower.includes("sent")) return { id: "sent", kind: "sent", recommended: true, system: true };
  if (lower.includes("spam") || lower.includes("junk")) return { id: "spam", kind: "spam", recommended: false, system: true, selectable: false };
  if (lower.includes("trash") || lower.includes("deleted")) return { id: "trash", kind: "trash", recommended: false, system: true, selectable: false };
  if (lower.includes("archive")) return { id: "archive", kind: "archive", recommended: false, system: true };
  return { id: `scope_${Buffer.from(name).toString("base64url")}`, kind: "custom", recommended: false, system: false };
}

function detectHost(email) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain.includes("qq.com")) return { host: "imap.qq.com", port: 993, secure: true };
  if (domain.includes("gmail.com")) return { host: "imap.gmail.com", port: 993, secure: true };
  if (domain.includes("outlook.com") || domain.includes("hotmail.com") || domain.includes("live.com")) return { host: "outlook.office365.com", port: 993, secure: true };
  return { host: `imap.${domain}`, port: 993, secure: true };
}

function createClient({ email, secret }) {
  const server = detectHost(email);
  const client = new ImapFlow({
    host: server.host,
    port: server.port,
    secure: server.secure,
    auth: {
      user: email,
      pass: secret,
    },
  });

  return { client, server };
}

function pickEnvelopeAddress(addresses = []) {
  const first = Array.isArray(addresses) ? addresses[0] : null;
  if (!first) return null;
  const mailbox = first.mailbox || "";
  const host = first.host || "";
  const name = first.name || "";
  return {
    name,
    address: mailbox && host ? `${mailbox}@${host}` : mailbox || host || null,
  };
}

async function readDownloadBuffer(download) {
  if (!download?.content) return null;
  const chunks = [];
  for await (const chunk of download.content) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}

export async function connectImapMailbox({ email, secret }) {
  const { client, server } = createClient({ email, secret });

  await client.connect();
  const mailboxes = await client.list();
  const scopes = mailboxes.map((box) => {
    const normalized = normalizeFolderName(box.path);
    return {
      id: normalized.id,
      kind: normalized.kind,
      remoteId: box.path,
      displayName: box.name || box.path,
      recommended: normalized.recommended,
      defaultEnabled: normalized.kind === "inbox" || normalized.kind === "sent",
      selectable: normalized.selectable !== false,
      system: normalized.system,
    };
  });
  await client.logout();

  return {
    accountEmail: email,
    scopes,
    connectionMeta: {
      host: server.host,
      port: server.port,
      secure: server.secure,
    },
  };
}

export async function fetchMailboxMessages({
  email,
  secret,
  scopes,
  onlyUnread = false,
  maxEmailsPerRun = 50,
  existingMessageKeys = new Set(),
}) {
  const { client } = createClient({ email, secret });
  const messages = [];
  const failures = [];
  let totalScanned = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  await client.connect();

  try {
    for (const scope of scopes) {
      if (messages.length >= maxEmailsPerRun) break;

      const lock = await client.getMailboxLock(scope.remoteId);
      try {
        const query = onlyUnread ? { seen: false } : { all: true };
        const uids = await client.search(query, { uid: true });
        const selectedUids = [...uids].slice(-Math.max(maxEmailsPerRun - messages.length, 0)).reverse();

        totalScanned += selectedUids.length;
        if (!selectedUids.length) {
          continue;
        }

        for (const uid of selectedUids) {
          if (messages.length >= maxEmailsPerRun) break;

          const dedupeKey = buildMessageKey({
            accountEmail: email,
            remoteId: scope.remoteId,
            uid,
          });

          if (existingMessageKeys.has(dedupeKey)) {
            duplicateCount += 1;
            continue;
          }

          try {
            const message = await client.fetchOne(
              String(uid),
              {
                uid: true,
                envelope: true,
                internalDate: true,
                size: true,
                source: true,
              },
              { uid: true },
            );

            let rawSource = message?.source || null;
            if (!rawSource) {
              try {
                const downloaded = await client.download(String(uid), undefined, { uid: true });
                rawSource = await readDownloadBuffer(downloaded);
              } catch (downloadError) {
                failedCount += 1;
                failures.push({
                  scopeId: scope.id,
                  scopeName: scope.displayName,
                  remoteId: scope.remoteId,
                  uid,
                  reason: `原始 MIME source 缺失，download 回退失败：${downloadError instanceof Error ? downloadError.message : "未知下载错误"}`,
                });
                continue;
              }
            }

            if (!rawSource?.length) {
              failedCount += 1;
              failures.push({
                scopeId: scope.id,
                scopeName: scope.displayName,
                remoteId: scope.remoteId,
                uid,
                reason: "邮件缺少原始 MIME source，download 回退后仍为空",
              });
              continue;
            }

            messages.push({
              dedupeKey,
              scopeId: scope.id,
              scopeName: scope.displayName,
              remoteId: scope.remoteId,
              uid: Number(message?.uid || uid),
              subject: message?.envelope?.subject || null,
              from: pickEnvelopeAddress(message?.envelope?.from),
              date: message?.internalDate ? new Date(message.internalDate).toISOString() : null,
              size: message?.size ?? rawSource.length,
              source: rawSource,
            });
            existingMessageKeys.add(dedupeKey);
          } catch (error) {
            failedCount += 1;
            failures.push({
              scopeId: scope.id,
              scopeName: scope.displayName,
              remoteId: scope.remoteId,
              uid,
              reason: error instanceof Error ? error.message : "未知抓取错误",
            });
          }
        }
      } finally {
        lock.release();
      }
    }
  } finally {
    await client.logout().catch(() => null);
  }

  return {
    scannedCount: totalScanned,
    fetchedCount: messages.length,
    duplicateCount,
    failedCount,
    failures,
    messages,
  };
}

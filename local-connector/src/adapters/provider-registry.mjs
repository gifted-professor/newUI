const baseScopes = {
  inbox: {
    id: "inbox",
    kind: "inbox",
    remoteId: "INBOX",
    displayName: "收件箱",
    recommended: true,
    defaultEnabled: true,
    selectable: true,
    system: true,
  },
  sent: {
    id: "sent",
    kind: "sent",
    remoteId: "SENT",
    displayName: "已发送",
    recommended: true,
    defaultEnabled: true,
    selectable: true,
    system: true,
  },
  partnerships: {
    id: "partnerships",
    kind: "custom",
    remoteId: "PARTNERSHIPS",
    displayName: "合作达人",
    recommended: false,
    defaultEnabled: false,
    selectable: true,
    system: false,
  },
  archive: {
    id: "archive",
    kind: "archive",
    remoteId: "ARCHIVE",
    displayName: "归档",
    recommended: false,
    defaultEnabled: false,
    selectable: true,
    system: true,
  },
  spam: {
    id: "spam",
    kind: "spam",
    remoteId: "SPAM",
    displayName: "垃圾邮件",
    recommended: false,
    defaultEnabled: false,
    selectable: false,
    system: true,
  },
  trash: {
    id: "trash",
    kind: "trash",
    remoteId: "TRASH",
    displayName: "废纸篓",
    recommended: false,
    defaultEnabled: false,
    selectable: false,
    system: true,
  },
};

const providerScopes = {
  gmail: [baseScopes.inbox, baseScopes.sent, baseScopes.partnerships, baseScopes.archive, baseScopes.spam, baseScopes.trash],
  qq: [baseScopes.inbox, baseScopes.sent, baseScopes.partnerships, baseScopes.archive, baseScopes.spam],
  imap: [baseScopes.inbox, baseScopes.sent, baseScopes.partnerships, baseScopes.archive, baseScopes.spam],
  outlook: [baseScopes.inbox, baseScopes.sent, baseScopes.partnerships, baseScopes.archive, baseScopes.trash],
};

export function normalizeProvider(provider) {
  if (["gmail", "gmail-oauth"].includes(provider)) return "gmail";
  if (["qq", "qq-mail"].includes(provider)) return "qq";
  if (["outlook", "microsoft365"].includes(provider)) return "outlook";
  return "imap";
}

export function getScopesForProvider(provider) {
  return providerScopes[normalizeProvider(provider)].map((item) => ({ ...item }));
}

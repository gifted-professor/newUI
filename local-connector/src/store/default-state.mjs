export function createDefaultState() {
  return {
    mailbox: {
      connected: false,
      provider: null,
      authMode: null,
      accountEmail: null,
      nickname: null,
      hasSecret: false,
      secret: null,
      availableScopes: [],
      selectedScopeIds: [],
      includeSent: true,
      excludeSystemFolders: true,
      onlyUnread: false,
      maxEmailsPerRun: 50,
      uploadPolicy: "selected-and-related-thread",
      lastSyncAt: null,
      lastRun: null,
    },
    feishu: {
      connected: false,
      webhookUrl: null,
      savedAt: null,
    },
    metrics: {
      pendingEmails: 128,
      syncedRows: 46,
      remainingCredits: 1854,
      activeJobs: 0,
    },
    jobs: [],
    historyImports: [],
    logs: [
      {
        ts: new Date().toISOString(),
        level: "info",
        message: "本地连接器已启动，等待连接邮箱。",
      },
    ],
  };
}

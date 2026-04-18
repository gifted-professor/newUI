export type SavedMailConfig = {
  providerKey: string;
  mode: "oauth" | "imap";
  email: string;
  nickname?: string;
  connected: boolean;
  savedAt: string;
  secret?: string;
  feishuWebhookUrl?: string;
  feishuWebhookSavedAt?: string;
};

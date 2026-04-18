export type HistoryImportResult = {
  stats: {
    checked: number;
    parsed: number;
    failed: number;
    matched: number;
    filteredOut: number;
    conversationGroups: number;
    withPlatform: number;
    withPrice: number;
    withCreator: number;
    manualReview: number;
  };
  items: Array<Record<string, unknown>>;
  conversationGroups: Array<Record<string, unknown>>;
  leadReviewRows: Array<Record<string, unknown>>;
};

export function executeHistoryImport(args: { corpusPath: string; keywords?: string[]; limit?: number }): Promise<HistoryImportResult>;

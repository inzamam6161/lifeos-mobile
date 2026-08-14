import type {
  MemoryDocument,
  MemoryEmbeddingState,
  MemorySearchResult,
  MemorySourceType,
  MemoryStatus,
} from '../../features/memory/types';

export type UpsertMemoryDocumentInput = {
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  contentText: string;
  occurredAt: string | null;
  sourceUpdatedAt: string;
  runId: string;
};

export interface MemoryRepository {
  upsertSource(input: UpsertMemoryDocumentInput): Promise<{changed: boolean}>;
  removeUnseen(runId: string): Promise<number>;
  listDocuments(): Promise<MemoryDocument[]>;
  listPending(limit?: number): Promise<MemoryDocument[]>;
  saveEmbedding(input: {
    documentId: string;
    embedding: number[];
    modelName: string;
  }): Promise<void>;
  markEmbeddingState(documentId: string, state: MemoryEmbeddingState): Promise<void>;
  getStatus(): Promise<MemoryStatus>;
  setLastRefresh(iso: string): Promise<void>;
  getLastRefresh(): Promise<string | null>;
  logQuery(input: {
    queryText: string;
    retrievalMode: 'semantic' | 'lexical';
    results: MemorySearchResult[];
  }): Promise<void>;
}

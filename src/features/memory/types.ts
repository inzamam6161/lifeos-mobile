export type MemorySourceType =
  | 'task'
  | 'reminder'
  | 'transaction'
  | 'workout'
  | 'study'
  | 'study_session'
  | 'goal'
  | 'habit'
  | 'life_review'
  | 'work_focus';

export type MemoryEmbeddingState = 'pending' | 'ready' | 'failed';

export type MemoryDocument = {
  id: string;
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  contentText: string;
  occurredAt: string | null;
  sourceUpdatedAt: string;
  embeddingState: MemoryEmbeddingState;
  embeddingDim: number | null;
  embeddingModel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryStatus = {
  total: number;
  ready: number;
  pending: number;
  failed: number;
  lastRefreshedAt: string | null;
};

export type MemorySearchResult = {
  document: MemoryDocument;
  score: number;
  mode: 'semantic' | 'lexical';
};

export type MemoryAnswer = {
  text: string;
  mode: 'semantic' | 'lexical';
  sources: MemorySearchResult[];
};

export type MemoryRefreshResult = {
  total: number;
  changed: number;
  removed: number;
};

export type MemoryEmbeddingBuildResult = {
  attempted: number;
  completed: number;
  failed: number;
};

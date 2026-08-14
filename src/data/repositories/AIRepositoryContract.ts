import type {
  AIActionType,
  AIConversation,
  AIEmbeddingModelConfig,
  AIMessage,
  AIModelConfig,
  AIProviderKind,
} from '../../features/ai/types';

export interface AIRepository {
  getOrCreateDefaultConversation(): Promise<AIConversation>;
  listMessages(conversationId: string, limit?: number): Promise<AIMessage[]>;
  appendMessage(input: {
    conversationId: string;
    role: AIMessage['role'];
    content: string;
    provider: AIProviderKind;
    actionType?: AIActionType;
  }): Promise<AIMessage>;
  getModelConfig(): Promise<AIModelConfig>;
  saveModelConfig(config: AIModelConfig): Promise<void>;
  clearModelConfig(): Promise<void>;
  getEmbeddingModelConfig(): Promise<AIEmbeddingModelConfig>;
  saveEmbeddingModelConfig(config: AIEmbeddingModelConfig): Promise<void>;
  clearEmbeddingModelConfig(): Promise<void>;
  logAction(input: {
    conversationId: string;
    actionType: AIActionType;
    payload: unknown;
    status: 'success' | 'failed' | 'ignored';
    resultText: string;
  }): Promise<void>;
}

import {database} from '../database/client';
import {createId} from '../../utils/createId';
import type {AIRepository} from './AIRepositoryContract';
import type {AIConversation, AIMessage, AIModelConfig, AIEmbeddingModelConfig, AIActionType, AIProviderKind} from '../../features/ai/types';

const DEFAULT_CONVERSATION_ID = 'conversation_default';

type MessageRow = {
  id: string;
  conversation_id: string;
  role: AIMessage['role'];
  content: string;
  provider: AIProviderKind;
  action_type: AIActionType;
  created_at: string;
};

function mapMessage(row: MessageRow): AIMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    provider: row.provider,
    actionType: row.action_type,
    createdAt: row.created_at,
  };
}

async function getSetting(key: string): Promise<string | null> {
  const result = await database.execute(
    'SELECT value FROM ai_settings WHERE key = ? LIMIT 1;',
    [key],
  );
  const row = result.rows[0] as {value?: string} | undefined;
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null) {
  const now = new Date().toISOString();
  if (value == null) {
    await database.execute('DELETE FROM ai_settings WHERE key = ?;', [key]);
    return;
  }
  await database.execute(
    `INSERT INTO ai_settings(key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [key, value, now],
  );
}

class SQLiteAIRepository implements AIRepository {
  async getOrCreateDefaultConversation(): Promise<AIConversation> {
    const now = new Date().toISOString();
    await database.execute(
      `INSERT OR IGNORE INTO ai_conversations(id, title, created_at, updated_at)
       VALUES (?, 'LifeOS Assistant', ?, ?);`,
      [DEFAULT_CONVERSATION_ID, now, now],
    );
    const result = await database.execute(
      'SELECT id, title, created_at, updated_at FROM ai_conversations WHERE id = ? LIMIT 1;',
      [DEFAULT_CONVERSATION_ID],
    );
    const row = result.rows[0] as {id: string; title: string; created_at: string; updated_at: string};
    return {id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at};
  }

  async listMessages(conversationId: string, limit = 30): Promise<AIMessage[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
    const result = await database.execute(
      `SELECT id, conversation_id, role, content, provider, action_type, created_at
       FROM ai_messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC
       LIMIT ?;`,
      [conversationId, safeLimit],
    );
    return (result.rows as unknown as MessageRow[]).reverse().map(mapMessage);
  }

  async appendMessage(input: {
    conversationId: string;
    role: AIMessage['role'];
    content: string;
    provider: AIProviderKind;
    actionType?: AIActionType;
  }): Promise<AIMessage> {
    const now = new Date().toISOString();
    const message: AIMessage = {
      id: createId('ai_msg'),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content.trim(),
      provider: input.provider,
      actionType: input.actionType ?? 'none',
      createdAt: now,
    };
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO ai_messages(id, conversation_id, role, content, provider, action_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.conversationId,
          message.role,
          message.content,
          message.provider,
          message.actionType,
          message.createdAt,
        ],
      );
      await tx.execute(
        'UPDATE ai_conversations SET updated_at = ? WHERE id = ?;',
        [now, message.conversationId],
      );
    });
    return message;
  }

  async getModelConfig(): Promise<AIModelConfig> {
    const [modelUri, modelName, importedAt] = await Promise.all([
      getSetting('model_uri'),
      getSetting('model_name'),
      getSetting('model_imported_at'),
    ]);
    return {modelUri, modelName, importedAt};
  }

  async saveModelConfig(config: AIModelConfig): Promise<void> {
    await setSetting('model_uri', config.modelUri);
    await setSetting('model_name', config.modelName);
    await setSetting('model_imported_at', config.importedAt);
  }

  async clearModelConfig(): Promise<void> {
    await Promise.all([
      setSetting('model_uri', null),
      setSetting('model_name', null),
      setSetting('model_imported_at', null),
    ]);
  }

  async getEmbeddingModelConfig(): Promise<AIEmbeddingModelConfig> {
    const [modelUri, modelName, importedAt] = await Promise.all([
      getSetting('embedding_model_uri'),
      getSetting('embedding_model_name'),
      getSetting('embedding_model_imported_at'),
    ]);
    return {modelUri, modelName, importedAt};
  }

  async saveEmbeddingModelConfig(config: AIEmbeddingModelConfig): Promise<void> {
    await setSetting('embedding_model_uri', config.modelUri);
    await setSetting('embedding_model_name', config.modelName);
    await setSetting('embedding_model_imported_at', config.importedAt);
  }

  async clearEmbeddingModelConfig(): Promise<void> {
    await Promise.all([
      setSetting('embedding_model_uri', null),
      setSetting('embedding_model_name', null),
      setSetting('embedding_model_imported_at', null),
    ]);
  }

  async logAction(input: {
    conversationId: string;
    actionType: AIActionType;
    payload: unknown;
    status: 'success' | 'failed' | 'ignored';
    resultText: string;
  }): Promise<void> {
    await database.execute(
      `INSERT INTO ai_action_log(
         id, conversation_id, action_type, payload_json, status, result_text, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        createId('ai_action'),
        input.conversationId,
        input.actionType,
        JSON.stringify(input.payload ?? {}),
        input.status,
        input.resultText,
        new Date().toISOString(),
      ],
    );
  }
}

export const aiRepository: AIRepository = new SQLiteAIRepository();

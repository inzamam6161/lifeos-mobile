import {database} from '../database/client';
import {createId} from '../../utils/createId';
import type {MemoryRepository, UpsertMemoryDocumentInput} from './MemoryRepositoryContract';
import type {
  MemoryDocument,
  MemoryEmbeddingState,
  MemorySearchResult,
  MemorySourceType,
  MemoryStatus,
} from '../../features/memory/types';

type MemoryRow = {
  id: string;
  source_type: MemorySourceType;
  source_id: string;
  title: string;
  content_text: string;
  occurred_at: string | null;
  source_updated_at: string;
  embedding_json: string | null;
  embedding_dim: number | null;
  embedding_model: string | null;
  embedding_state: MemoryEmbeddingState;
  created_at: string;
  updated_at: string;
};

function mapDocument(row: MemoryRow): MemoryDocument {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    contentText: row.content_text,
    occurredAt: row.occurred_at,
    sourceUpdatedAt: row.source_updated_at,
    embeddingState: row.embedding_state,
    embeddingDim: row.embedding_dim == null ? null : Number(row.embedding_dim),
    embeddingModel: row.embedding_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getMetadata(key: string): Promise<string | null> {
  const result = await database.execute(
    'SELECT value FROM memory_index_metadata WHERE key = ? LIMIT 1;',
    [key],
  );
  const row = result.rows[0] as {value?: string} | undefined;
  return row?.value ?? null;
}

async function setMetadata(key: string, value: string) {
  const now = new Date().toISOString();
  await database.execute(
    `INSERT INTO memory_index_metadata(key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [key, value, now],
  );
}

class SQLiteMemoryRepository implements MemoryRepository {
  async upsertSource(input: UpsertMemoryDocumentInput): Promise<{changed: boolean}> {
    const current = await database.execute(
      `SELECT content_text, title, occurred_at, source_updated_at
       FROM memory_documents
       WHERE source_type = ? AND source_id = ?
       LIMIT 1;`,
      [input.sourceType, input.sourceId],
    );
    const row = current.rows[0] as {
      content_text?: string;
      title?: string;
      occurred_at?: string | null;
      source_updated_at?: string;
    } | undefined;
    const changed = !row ||
      row.content_text !== input.contentText ||
      row.title !== input.title ||
      (row.occurred_at ?? null) !== input.occurredAt ||
      row.source_updated_at !== input.sourceUpdatedAt;

    const now = new Date().toISOString();
    await database.execute(
      `INSERT INTO memory_documents(
         id, source_type, source_id, title, content_text, occurred_at, source_updated_at,
         embedding_json, embedding_dim, embedding_model, embedding_state, last_seen_run,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'pending', ?, ?, ?)
       ON CONFLICT(source_type, source_id) DO UPDATE SET
         title = excluded.title,
         content_text = excluded.content_text,
         occurred_at = excluded.occurred_at,
         source_updated_at = excluded.source_updated_at,
         embedding_json = CASE
           WHEN memory_documents.content_text = excluded.content_text AND memory_documents.title = excluded.title
             THEN memory_documents.embedding_json
           ELSE NULL
         END,
         embedding_dim = CASE
           WHEN memory_documents.content_text = excluded.content_text AND memory_documents.title = excluded.title
             THEN memory_documents.embedding_dim
           ELSE NULL
         END,
         embedding_model = CASE
           WHEN memory_documents.content_text = excluded.content_text AND memory_documents.title = excluded.title
             THEN memory_documents.embedding_model
           ELSE NULL
         END,
         embedding_state = CASE
           WHEN memory_documents.content_text = excluded.content_text AND memory_documents.title = excluded.title
             THEN memory_documents.embedding_state
           ELSE 'pending'
         END,
         last_seen_run = excluded.last_seen_run,
         updated_at = excluded.updated_at;`,
      [
        createId('memory'),
        input.sourceType,
        input.sourceId,
        input.title,
        input.contentText,
        input.occurredAt,
        input.sourceUpdatedAt,
        input.runId,
        now,
        now,
      ],
    );
    return {changed};
  }

  async removeUnseen(runId: string): Promise<number> {
    const countResult = await database.execute(
      'SELECT COUNT(*) AS count FROM memory_documents WHERE last_seen_run <> ?;',
      [runId],
    );
    const count = Number((countResult.rows[0] as {count?: number} | undefined)?.count ?? 0);
    await database.execute('DELETE FROM memory_documents WHERE last_seen_run <> ?;', [runId]);
    return count;
  }

  async listDocuments(): Promise<MemoryDocument[]> {
    const result = await database.execute(
      `SELECT id, source_type, source_id, title, content_text, occurred_at, source_updated_at,
              embedding_json, embedding_dim, embedding_model, embedding_state, created_at, updated_at
       FROM memory_documents
       ORDER BY COALESCE(occurred_at, source_updated_at) DESC;`,
    );
    return (result.rows as unknown as MemoryRow[]).map(mapDocument);
  }

  async listPending(limit = 200): Promise<MemoryDocument[]> {
    const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
    const result = await database.execute(
      `SELECT id, source_type, source_id, title, content_text, occurred_at, source_updated_at,
              embedding_json, embedding_dim, embedding_model, embedding_state, created_at, updated_at
       FROM memory_documents
       WHERE embedding_state <> 'ready'
       ORDER BY updated_at ASC
       LIMIT ?;`,
      [safeLimit],
    );
    return (result.rows as unknown as MemoryRow[]).map(mapDocument);
  }

  async saveEmbedding(input: {documentId: string; embedding: number[]; modelName: string}): Promise<void> {
    const vector = input.embedding.filter(value => Number.isFinite(value));
    if (!vector.length) throw new Error('Embedding model returned an empty vector.');
    await database.execute(
      `UPDATE memory_documents
       SET embedding_json = ?, embedding_dim = ?, embedding_model = ?, embedding_state = 'ready', updated_at = ?
       WHERE id = ?;`,
      [JSON.stringify(vector), vector.length, input.modelName, new Date().toISOString(), input.documentId],
    );
  }

  async markEmbeddingState(documentId: string, state: MemoryEmbeddingState): Promise<void> {
    await database.execute(
      `UPDATE memory_documents SET embedding_state = ?, updated_at = ? WHERE id = ?;`,
      [state, new Date().toISOString(), documentId],
    );
  }

  async getStatus(): Promise<MemoryStatus> {
    const result = await database.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN embedding_state = 'ready' THEN 1 ELSE 0 END) AS ready,
              SUM(CASE WHEN embedding_state = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN embedding_state = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM memory_documents;`,
    );
    const row = result.rows[0] as {total?: number; ready?: number; pending?: number; failed?: number} | undefined;
    return {
      total: Number(row?.total ?? 0),
      ready: Number(row?.ready ?? 0),
      pending: Number(row?.pending ?? 0),
      failed: Number(row?.failed ?? 0),
      lastRefreshedAt: await this.getLastRefresh(),
    };
  }

  async setLastRefresh(iso: string): Promise<void> {
    await setMetadata('last_refreshed_at', iso);
  }

  async getLastRefresh(): Promise<string | null> {
    return getMetadata('last_refreshed_at');
  }

  async logQuery(input: {
    queryText: string;
    retrievalMode: 'semantic' | 'lexical';
    results: MemorySearchResult[];
  }): Promise<void> {
    await database.execute(
      `INSERT INTO memory_query_log(id, query_text, retrieval_mode, result_ids_json, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [
        createId('memory_query'),
        input.queryText,
        input.retrievalMode,
        JSON.stringify(input.results.map(item => ({id: item.document.id, score: item.score}))),
        new Date().toISOString(),
      ],
    );
  }
}

export const memoryRepository: MemoryRepository = new SQLiteMemoryRepository();

export async function readStoredEmbedding(documentId: string): Promise<number[] | null> {
  const result = await database.execute(
    'SELECT embedding_json FROM memory_documents WHERE id = ? LIMIT 1;',
    [documentId],
  );
  const value = (result.rows[0] as {embedding_json?: string | null} | undefined)?.embedding_json;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    const vector = parsed.map(Number).filter(Number.isFinite);
    return vector.length ? vector : null;
  } catch {
    return null;
  }
}

export async function listDocumentsWithStoredEmbeddings(): Promise<Array<{document: MemoryDocument; embedding: number[]}>> {
  const result = await database.execute(
    `SELECT id, source_type, source_id, title, content_text, occurred_at, source_updated_at,
            embedding_json, embedding_dim, embedding_model, embedding_state, created_at, updated_at
     FROM memory_documents
     WHERE embedding_state = 'ready' AND embedding_json IS NOT NULL
     ORDER BY COALESCE(occurred_at, source_updated_at) DESC;`,
  );
  const output: Array<{document: MemoryDocument; embedding: number[]}> = [];
  for (const row of result.rows as unknown as MemoryRow[]) {
    try {
      const parsed = JSON.parse(row.embedding_json ?? '[]') as unknown;
      if (!Array.isArray(parsed)) continue;
      const embedding = parsed.map(Number).filter(Number.isFinite);
      if (!embedding.length) continue;
      output.push({document: mapDocument(row), embedding});
    } catch {}
  }
  return output;
}

export async function invalidateEmbeddingsForModel(modelName: string): Promise<void> {
  await database.execute(
    `UPDATE memory_documents
     SET embedding_json = NULL,
         embedding_dim = NULL,
         embedding_model = NULL,
         embedding_state = 'pending',
         updated_at = ?
     WHERE embedding_state = 'ready'
       AND COALESCE(embedding_model, '') <> ?;`,
    [new Date().toISOString(), modelName],
  );
}

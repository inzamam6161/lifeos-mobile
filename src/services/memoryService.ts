import {database} from '../data/database/client';
import {aiRepository} from '../data/repositories/aiRepository';
import {
  invalidateEmbeddingsForModel,
  listDocumentsWithStoredEmbeddings,
  memoryRepository,
} from '../data/repositories/memoryRepository';
import {answerMemoryWithLocalModel, embedTextLocally} from './aiModelService';
import type {
  MemoryAnswer,
  MemoryDocument,
  MemoryEmbeddingBuildResult,
  MemoryRefreshResult,
  MemorySearchResult,
  MemorySourceType,
} from '../features/memory/types';
import {createId} from '../utils/createId';
import {formatMoney} from '../utils/money';

type Source = {
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  contentText: string;
  occurredAt: string | null;
  sourceUpdatedAt: string;
};

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function compact(parts: Array<string | null | undefined>) {
  return parts.map(clean).filter(Boolean).join(' · ');
}

async function taskSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT id, title, notes, status, context, priority, due_at, start_at, completed_at, created_at, updated_at
     FROM tasks WHERE deleted_at IS NULL;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'task',
    sourceId: clean(row.id),
    title: clean(row.title),
    contentText: compact([
      `Task: ${clean(row.title)}`,
      clean(row.notes),
      `context ${clean(row.context)}`,
      `status ${clean(row.status)}`,
      `priority ${clean(row.priority)}`,
      row.start_at ? `scheduled ${clean(row.start_at)}` : '',
      row.due_at ? `due ${clean(row.due_at)}` : '',
      row.completed_at ? `completed ${clean(row.completed_at)}` : '',
    ]),
    occurredAt: row.completed_at ? clean(row.completed_at) : row.start_at ? clean(row.start_at) : row.created_at ? clean(row.created_at) : null,
    sourceUpdatedAt: clean(row.updated_at || row.created_at),
  }));
}

async function reminderSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT id, title, notes, context, scheduled_at, repeat_rule, status, completed_at, created_at, updated_at
     FROM reminders;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'reminder',
    sourceId: clean(row.id),
    title: clean(row.title),
    contentText: compact([
      `Reminder: ${clean(row.title)}`,
      clean(row.notes),
      `context ${clean(row.context)}`,
      `scheduled ${clean(row.scheduled_at)}`,
      `repeat ${clean(row.repeat_rule)}`,
      `status ${clean(row.status)}`,
      row.completed_at ? `completed ${clean(row.completed_at)}` : '',
    ]),
    occurredAt: row.completed_at ? clean(row.completed_at) : clean(row.scheduled_at),
    sourceUpdatedAt: clean(row.updated_at || row.created_at),
  }));
}

async function transactionSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT t.id, t.kind, t.amount_minor, t.merchant, t.notes, t.occurred_at, t.source, t.created_at, t.updated_at,
            c.name AS category_name
     FROM transactions t
     JOIN finance_categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => {
    const amount = Number(row.amount_minor ?? 0);
    const merchant = clean(row.merchant) || clean(row.category_name);
    return {
      sourceType: 'transaction' as const,
      sourceId: clean(row.id),
      title: `${clean(row.kind) === 'income' ? 'Income' : 'Expense'} · ${merchant}`,
      contentText: compact([
        `${clean(row.kind) === 'income' ? 'Income' : 'Expense'} ${formatMoney(amount)}`,
        `merchant ${merchant}`,
        `category ${clean(row.category_name)}`,
        clean(row.notes),
        `source ${clean(row.source)}`,
        `occurred ${clean(row.occurred_at)}`,
      ]),
      occurredAt: clean(row.occurred_at),
      sourceUpdatedAt: clean(row.updated_at || row.created_at),
    };
  });
}

async function workoutSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT ws.id, ws.title, ws.started_at, ws.ended_at, ws.duration_seconds, ws.notes, ws.updated_at,
            wr.name AS routine_name,
            SUM(CASE WHEN sets.completed = 1 THEN 1 ELSE 0 END) AS completed_sets,
            SUM(CASE WHEN sets.completed = 1 THEN sets.weight_grams * sets.reps ELSE 0 END) AS volume_gram_reps,
            GROUP_CONCAT(DISTINCT CASE WHEN sets.completed = 1 THEN e.name END) AS exercises
     FROM workout_sessions ws
     LEFT JOIN workout_routines wr ON wr.id = ws.routine_id
     LEFT JOIN workout_sets sets ON sets.session_id = ws.id
     LEFT JOIN exercises e ON e.id = sets.exercise_id
     WHERE ws.status = 'completed'
     GROUP BY ws.id;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'workout',
    sourceId: clean(row.id),
    title: clean(row.routine_name) || clean(row.title) || 'Workout',
    contentText: compact([
      `Workout ${clean(row.routine_name) || clean(row.title)}`,
      `${Number(row.completed_sets ?? 0)} completed sets`,
      row.duration_seconds != null ? `${Math.round(Number(row.duration_seconds) / 60)} minutes` : '',
      Number(row.volume_gram_reps ?? 0) > 0 ? `training volume ${Math.round(Number(row.volume_gram_reps) / 1000)} kg-reps` : '',
      row.exercises ? `exercises ${clean(row.exercises)}` : '',
      clean(row.notes),
    ]),
    occurredAt: clean(row.ended_at || row.started_at),
    sourceUpdatedAt: clean(row.updated_at || row.ended_at || row.started_at),
  }));
}

async function studySources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT c.id, c.content_text, c.updated_at,
            m.title AS material_title, m.kind, m.progress_percent, m.updated_at AS material_updated_at,
            s.name AS subject_name
     FROM study_knowledge_chunks c
     JOIN study_materials m ON m.id = c.material_id
     JOIN study_subjects s ON s.id = m.subject_id
     WHERE m.deleted_at IS NULL;`,
  );
  const chunks = (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'study' as const,
    sourceId: clean(row.id),
    title: `${clean(row.subject_name)} · ${clean(row.material_title)}`,
    contentText: compact([
      `Study knowledge from ${clean(row.subject_name)}`,
      `material ${clean(row.material_title)}`,
      clean(row.content_text),
      `progress ${Number(row.progress_percent ?? 0)}%`,
    ]),
    occurredAt: null,
    sourceUpdatedAt: clean(row.updated_at || row.material_updated_at),
  }));

  const sessionResult = await database.execute(
    `SELECT ss.id, ss.started_at, ss.ended_at, ss.duration_seconds, ss.notes, ss.updated_at,
            sub.name AS subject_name, m.title AS material_title
     FROM study_sessions ss
     JOIN study_subjects sub ON sub.id = ss.subject_id
     LEFT JOIN study_materials m ON m.id = ss.material_id
     WHERE ss.status = 'completed';`,
  );
  const sessions = (sessionResult.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'study_session' as const,
    sourceId: clean(row.id),
    title: `Study session · ${clean(row.subject_name)}`,
    contentText: compact([
      `Studied ${clean(row.subject_name)}`,
      row.material_title ? `material ${clean(row.material_title)}` : '',
      `${Math.round(Number(row.duration_seconds ?? 0) / 60)} minutes`,
      clean(row.notes),
    ]),
    occurredAt: clean(row.ended_at || row.started_at),
    sourceUpdatedAt: clean(row.updated_at || row.ended_at || row.started_at),
  }));
  return [...chunks, ...sessions];
}

async function goalSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT g.id, g.title, g.description, g.area, g.status, g.target_value, g.current_value, g.unit,
            g.due_at, g.completed_at, g.created_at, g.updated_at,
            SUM(CASE WHEN gm.completed = 1 THEN 1 ELSE 0 END) AS milestones_done,
            COUNT(gm.id) AS milestones_total,
            GROUP_CONCAT(CASE WHEN gm.completed = 0 THEN gm.title END) AS open_milestones
     FROM goals g
     LEFT JOIN goal_milestones gm ON gm.goal_id = g.id
     GROUP BY g.id;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'goal',
    sourceId: clean(row.id),
    title: clean(row.title),
    contentText: compact([
      `Goal ${clean(row.title)}`,
      clean(row.description),
      `area ${clean(row.area)}`,
      `status ${clean(row.status)}`,
      `progress ${Number(row.current_value ?? 0)}/${Number(row.target_value ?? 0)} ${clean(row.unit)}`,
      `${Number(row.milestones_done ?? 0)}/${Number(row.milestones_total ?? 0)} milestones completed`,
      row.open_milestones ? `open milestones ${clean(row.open_milestones)}` : '',
      row.due_at ? `due ${clean(row.due_at)}` : '',
    ]),
    occurredAt: row.completed_at ? clean(row.completed_at) : null,
    sourceUpdatedAt: clean(row.updated_at || row.created_at),
  }));
}

function dateKeyDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

async function habitSources(): Promise<Source[]> {
  const since = dateKeyDaysAgo(30);
  const result = await database.execute(
    `SELECT h.id, h.name, h.context, h.frequency, h.target_per_week, h.updated_at,
            SUM(CASE WHEN hc.completed = 1 AND hc.date_key >= ? THEN 1 ELSE 0 END) AS completed_30d,
            GROUP_CONCAT(CASE WHEN hc.completed = 1 AND hc.date_key >= ? THEN hc.date_key END) AS completed_dates
     FROM habits h
     LEFT JOIN habit_checkins hc ON hc.habit_id = h.id
     WHERE h.active = 1
     GROUP BY h.id;`,
    [since, since],
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'habit',
    sourceId: clean(row.id),
    title: `Habit · ${clean(row.name)}`,
    contentText: compact([
      `Habit ${clean(row.name)}`,
      `context ${clean(row.context)}`,
      `frequency ${clean(row.frequency)}`,
      `target ${Number(row.target_per_week ?? 0)} per week`,
      `${Number(row.completed_30d ?? 0)} completions in the last 30 days`,
      row.completed_dates ? `completion dates ${clean(row.completed_dates)}` : '',
    ]),
    occurredAt: null,
    sourceUpdatedAt: clean(row.updated_at),
  }));
}

async function reviewSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT id, review_type, period_key, rating, wins, friction, next_focus, created_at, updated_at
     FROM life_reviews;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'life_review',
    sourceId: clean(row.id),
    title: `${clean(row.review_type)} review · ${clean(row.period_key)}`,
    contentText: compact([
      `${clean(row.review_type)} review for ${clean(row.period_key)}`,
      row.rating != null ? `rating ${Number(row.rating)}/5` : '',
      clean(row.wins) ? `wins ${clean(row.wins)}` : '',
      clean(row.friction) ? `friction ${clean(row.friction)}` : '',
      clean(row.next_focus) ? `next focus ${clean(row.next_focus)}` : '',
    ]),
    occurredAt: clean(row.updated_at || row.created_at),
    sourceUpdatedAt: clean(row.updated_at || row.created_at),
  }));
}

async function workFocusSources(): Promise<Source[]> {
  const result = await database.execute(
    `SELECT fs.id, fs.started_at, fs.ended_at, fs.duration_seconds, fs.created_at,
            t.title AS task_title, t.context
     FROM focus_sessions fs
     LEFT JOIN tasks t ON t.id = fs.task_id;`,
  );
  return (result.rows as unknown as Array<Record<string, unknown>>).map(row => ({
    sourceType: 'work_focus',
    sourceId: clean(row.id),
    title: `Focus · ${clean(row.task_title) || 'Work session'}`,
    contentText: compact([
      `Focused on ${clean(row.task_title) || 'work'}`,
      `${Math.round(Number(row.duration_seconds ?? 0) / 60)} minutes`,
      row.context ? `context ${clean(row.context)}` : '',
    ]),
    occurredAt: clean(row.ended_at || row.started_at),
    sourceUpdatedAt: clean(row.ended_at || row.created_at),
  }));
}

async function collectSources(): Promise<Source[]> {
  const groups = await Promise.all([
    taskSources(),
    reminderSources(),
    transactionSources(),
    workoutSources(),
    studySources(),
    goalSources(),
    habitSources(),
    reviewSources(),
    workFocusSources(),
  ]);
  return groups.flat().filter(source => source.sourceId && source.title && source.contentText);
}

export async function refreshPersonalMemory(): Promise<MemoryRefreshResult> {
  const sources = await collectSources();
  const runId = createId('memory_run');
  let changed = 0;
  for (const source of sources) {
    const result = await memoryRepository.upsertSource({...source, runId});
    if (result.changed) changed += 1;
  }
  const removed = await memoryRepository.removeUnseen(runId);
  await memoryRepository.setLastRefresh(new Date().toISOString());
  return {total: sources.length, changed, removed};
}

export async function buildSemanticMemoryIndex(limit = 500): Promise<MemoryEmbeddingBuildResult> {
  await refreshPersonalMemory();
  const config = await aiRepository.getEmbeddingModelConfig();
  if (!config.modelUri || !config.modelName) {
    throw new Error('Import a dedicated embedding GGUF model first.');
  }
  await invalidateEmbeddingsForModel(config.modelName);
  const pending = await memoryRepository.listPending(limit);
  let completed = 0;
  let failed = 0;
  for (const document of pending) {
    try {
      const {embedding, modelName} = await embedTextLocally(`search_document: ${document.title}\n${document.contentText}`);
      await memoryRepository.saveEmbedding({documentId: document.id, embedding, modelName});
      completed += 1;
    } catch {
      await memoryRepository.markEmbeddingState(document.id, 'failed');
      failed += 1;
    }
  }
  return {attempted: pending.length, completed, failed};
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','to','of','in','on','for','with','my','me','i','is','are','was','were','did','do','does',
  'what','when','where','which','how','have','has','had','this','that','it','about','from','recently','please','tell','show',
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  accomplish: ['completed', 'done', 'finished'],
  accomplished: ['completed', 'done', 'finished'],
  spending: ['expense', 'spent', 'transaction'],
  spend: ['expense', 'spent', 'transaction'],
  studied: ['study', 'learning'],
  workout: ['workout', 'gym', 'training'],
  workouts: ['workout', 'gym', 'training'],
  learning: ['study', 'learning'],
  goals: ['goal', 'milestone'],
  goal: ['goal', 'milestone'],
};

function tokens(text: string) {
  const base = text.toLowerCase().match(/[a-z0-9]+/g)?.filter(token => token.length > 1 && !STOP_WORDS.has(token)) ?? [];
  return Array.from(new Set(base.flatMap(token => [token, ...(TOKEN_SYNONYMS[token] ?? [])])));
}

function lexicalScore(query: string, document: MemoryDocument) {
  const q = tokens(query);
  if (!q.length) return 0;
  const title = document.title.toLowerCase();
  const content = document.contentText.toLowerCase();
  let score = 0;
  for (const token of q) {
    if (title.includes(token)) score += 3;
    if (content.includes(token)) score += 1;
  }
  const phrase = query.trim().toLowerCase();
  if (phrase.length > 4 && content.includes(phrase)) score += 6;
  const ageAnchor = document.occurredAt || document.sourceUpdatedAt;
  const age = Date.now() - new Date(ageAnchor).getTime();
  if (Number.isFinite(age) && age >= 0) {
    const days = age / 86400000;
    if (days <= 7) score += 1;
    else if (days <= 30) score += 0.5;
  }
  return score;
}

function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return -1;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (!aa || !bb) return -1;
  return dot / Math.sqrt(aa * bb);
}

export async function searchPersonalMemory(query: string, limit = 8): Promise<MemorySearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  await refreshPersonalMemory();
  const safeLimit = Math.max(1, Math.min(20, Math.round(limit)));
  const embeddingConfig = await aiRepository.getEmbeddingModelConfig();
  const stored = await listDocumentsWithStoredEmbeddings();
  const compatible = embeddingConfig.modelName
    ? stored.filter(item => item.document.embeddingModel === embeddingConfig.modelName)
    : [];

  if (embeddingConfig.modelUri && compatible.length) {
    try {
      const {embedding} = await embedTextLocally(`search_query: ${cleanQuery}`);
      const results = compatible
        .map(item => {
          const semantic = (cosine(embedding, item.embedding) + 1) / 2;
          const lexical = Math.min(1, lexicalScore(cleanQuery, item.document) / 8);
          return {
            document: item.document,
            score: semantic * 0.88 + lexical * 0.12,
            mode: 'semantic' as const,
          };
        })
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, safeLimit);
      await memoryRepository.logQuery({queryText: cleanQuery, retrievalMode: 'semantic', results});
      return results;
    } catch {
      // Fall through to lexical retrieval if the embedding runtime cannot initialize.
    }
  }

  const documents = await memoryRepository.listDocuments();
  const results = documents
    .map(document => {
      const raw = lexicalScore(cleanQuery, document);
      return {document, raw, score: Math.min(1, raw / 10), mode: 'lexical' as const};
    })
    .filter(item => item.raw > 0)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, safeLimit)
    .map(({document, score, mode}) => ({document, score, mode}));
  await memoryRepository.logQuery({queryText: cleanQuery, retrievalMode: 'lexical', results});
  return results;
}

function sourceLabel(result: MemorySearchResult, index: number) {
  const date = result.document.occurredAt
    ? new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(result.document.occurredAt))
    : null;
  return `[S${index + 1}] ${result.document.sourceType.replace(/_/g, ' ')} · ${result.document.title}${date ? ` · ${date}` : ''}`;
}

function deterministicMemoryAnswer(question: string, results: MemorySearchResult[]) {
  if (!results.length) {
    return 'I could not find enough matching evidence in your local LifeOS memory yet. Refresh Personal Memory, or add more data in Tasks, Money, Gym, Study, Goals, Habits, and Reviews.';
  }
  const lines = [`I found ${results.length} relevant local record${results.length === 1 ? '' : 's'}:`];
  results.slice(0, 5).forEach((result, index) => {
    const snippet = result.document.contentText.length > 180
      ? `${result.document.contentText.slice(0, 177)}…`
      : result.document.contentText;
    lines.push(`${sourceLabel(result, index)}\n${snippet}`);
  });
  lines.push(`\nThis is evidence retrieval for “${question}”. Import/load a local instruct model for a synthesized answer across these sources.`);
  return lines.join('\n\n');
}

export async function answerFromPersonalMemory(question: string): Promise<MemoryAnswer> {
  const sources = await searchPersonalMemory(question, 8);
  const mode = sources[0]?.mode ?? 'lexical';
  const model = await aiRepository.getModelConfig();
  if (model.modelUri && sources.length) {
    try {
      const text = await answerMemoryWithLocalModel({question, sources});
      const sourceList = sources.slice(0, 5).map(sourceLabel).join('\n');
      return {
        text: `${text}\n\nLocal sources\n${sourceList}`,
        mode,
        sources,
      };
    } catch {
      // Deterministic evidence view is the safe fallback.
    }
  }
  return {text: deterministicMemoryAnswer(question, sources), mode, sources};
}

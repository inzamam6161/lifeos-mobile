import {Platform} from 'react-native';
import {errorCodes, isErrorWithCode, keepLocalCopy, pick, types} from '@react-native-documents/picker';
import {initLlama, loadLlamaModelInfo} from 'llama.rn';
import {aiRepository} from '../data/repositories/aiRepository';
import type {
  AIFacts,
  AIEmbeddingModelConfig,
  AIIntent,
  AIMessage,
  AIModelConfig,
} from '../features/ai/types';
import type {MemorySearchResult} from '../features/memory/types';

type LlamaContextLike = {
  completion: (params: unknown, callback?: (data: {token?: string}) => void) => Promise<{text?: string}>;
  embedding: (content: string) => Promise<{embedding?: number[]}>;
  release: () => Promise<void>;
};

let loadedContext: LlamaContextLike | null = null;
let loadedUri: string | null = null;
let embeddingContext: LlamaContextLike | null = null;
let embeddingUri: string | null = null;

const intentSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['none', 'create_task', 'add_expense', 'create_reminder', 'plan_day', 'review_day', 'next_action', 'ask_memory'],
    },
    reply: {type: 'string'},
    title: {type: 'string'},
    notes: {type: 'string'},
    context: {type: 'string', enum: ['personal', 'work', 'study', 'gym', 'shopping']},
    priority: {type: 'string', enum: ['low', 'medium', 'high', 'urgent']},
    amountAED: {type: 'number'},
    merchant: {type: 'string'},
    categoryHint: {type: 'string'},
    scheduledAt: {type: 'string'},
    repeat: {type: 'string', enum: ['none', 'daily', 'weekly']},
    query: {type: 'string'},
  },
  required: ['action', 'reply'],
  additionalProperties: false,
};

function normalizeIntent(value: unknown): AIIntent {
  const object = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const validActions = new Set(['none','create_task','add_expense','create_reminder','plan_day','review_day','next_action','ask_memory']);
  const validContexts = new Set(['personal','work','study','gym','shopping']);
  const validPriorities = new Set(['low','medium','high','urgent']);
  const validRepeats = new Set(['none','daily','weekly']);
  const action = validActions.has(String(object.action)) ? String(object.action) as AIIntent['action'] : 'none';
  const result: AIIntent = {
    action,
    reply: typeof object.reply === 'string' ? object.reply.trim() : '',
  };
  if (typeof object.title === 'string') result.title = object.title.trim();
  if (typeof object.notes === 'string') result.notes = object.notes.trim();
  if (validContexts.has(String(object.context))) result.context = String(object.context) as AIIntent['context'];
  if (validPriorities.has(String(object.priority))) result.priority = String(object.priority) as AIIntent['priority'];
  if (typeof object.amountAED === 'number' && Number.isFinite(object.amountAED)) result.amountAED = object.amountAED;
  if (typeof object.merchant === 'string') result.merchant = object.merchant.trim();
  if (typeof object.categoryHint === 'string') result.categoryHint = object.categoryHint.trim();
  if (typeof object.scheduledAt === 'string') result.scheduledAt = object.scheduledAt.trim();
  if (validRepeats.has(String(object.repeat))) result.repeat = String(object.repeat) as AIIntent['repeat'];
  if (typeof object.query === 'string') result.query = object.query.trim();
  return result;
}

function factsText(facts: AIFacts) {
  return JSON.stringify(facts);
}

function historyText(history: AIMessage[]) {
  return history
    .slice(-8)
    .map(item => `${item.role.toUpperCase()}: ${item.content}`)
    .join('\n');
}

async function ensureContext(uri: string): Promise<LlamaContextLike> {
  if (loadedContext && loadedUri === uri) return loadedContext;
  if (loadedContext) {
    try { await loadedContext.release(); } catch {}
  }

  const context = await initLlama({
    model: uri,
    use_mlock: false,
    n_ctx: 4096,
    n_batch: 256,
    n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
  } as never);

  loadedContext = context as unknown as LlamaContextLike;
  loadedUri = uri;
  return loadedContext;
}

async function ensureEmbeddingContext(uri: string): Promise<LlamaContextLike> {
  if (embeddingContext && embeddingUri === uri) return embeddingContext;
  if (embeddingContext) {
    try { await embeddingContext.release(); } catch {}
  }

  const context = await initLlama({
    model: uri,
    use_mlock: false,
    n_ctx: 2048,
    n_batch: 256,
    embedding: true,
    n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
  } as never);

  embeddingContext = context as unknown as LlamaContextLike;
  embeddingUri = uri;
  return embeddingContext;
}

async function importGGUF(): Promise<{localUri: string; name: string} | null> {
  try {
    const [file] = await pick({
      type: [types.allFiles],
      allowMultiSelection: false,
      mode: 'import',
    });
    const name = file.name ?? 'local-model.gguf';
    if (!name.toLowerCase().endsWith('.gguf')) {
      throw new Error('Choose a GGUF model file.');
    }
    const [copy] = await keepLocalCopy({
      files: [{uri: file.uri, fileName: name}],
      destination: 'documentDirectory',
    });
    if (copy.status !== 'success') {
      throw new Error(copy.copyError || 'Could not keep the AI model offline.');
    }
    await loadLlamaModelInfo(copy.localUri);
    return {localUri: copy.localUri, name};
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}

export async function importLocalGGUFModel(): Promise<AIModelConfig | null> {
  const imported = await importGGUF();
  if (!imported) return null;
  const config: AIModelConfig = {
    modelUri: imported.localUri,
    modelName: imported.name,
    importedAt: new Date().toISOString(),
  };
  await aiRepository.saveModelConfig(config);
  await releaseLocalModel();
  return config;
}

export async function importLocalEmbeddingGGUFModel(): Promise<AIEmbeddingModelConfig | null> {
  const imported = await importGGUF();
  if (!imported) return null;
  const config: AIEmbeddingModelConfig = {
    modelUri: imported.localUri,
    modelName: imported.name,
    importedAt: new Date().toISOString(),
  };
  await aiRepository.saveEmbeddingModelConfig(config);
  await releaseEmbeddingModel();
  return config;
}

export async function loadConfiguredLocalModel(): Promise<AIModelConfig> {
  const config = await aiRepository.getModelConfig();
  if (!config.modelUri) throw new Error('Import a GGUF model first.');
  await ensureContext(config.modelUri);
  return config;
}

export async function loadConfiguredEmbeddingModel(): Promise<AIEmbeddingModelConfig> {
  const config = await aiRepository.getEmbeddingModelConfig();
  if (!config.modelUri) throw new Error('Import an embedding GGUF model first.');
  await ensureEmbeddingContext(config.modelUri);
  return config;
}

export async function releaseLocalModel() {
  if (loadedContext) {
    try { await loadedContext.release(); } finally {
      loadedContext = null;
      loadedUri = null;
    }
  }
}

export async function releaseEmbeddingModel() {
  if (embeddingContext) {
    try { await embeddingContext.release(); } finally {
      embeddingContext = null;
      embeddingUri = null;
    }
  }
}

export function isLocalModelLoaded() {
  return Boolean(loadedContext);
}

export function isEmbeddingModelLoaded() {
  return Boolean(embeddingContext);
}

export async function embedTextLocally(text: string): Promise<{embedding: number[]; modelName: string}> {
  const config = await aiRepository.getEmbeddingModelConfig();
  if (!config.modelUri) throw new Error('Import an embedding model first.');
  const context = await ensureEmbeddingContext(config.modelUri);
  const result = await context.embedding(text.trim());
  const embedding = Array.isArray(result.embedding)
    ? result.embedding.map(Number).filter(Number.isFinite)
    : [];
  if (!embedding.length) throw new Error('Embedding model returned no vector.');
  return {embedding, modelName: config.modelName ?? 'local-embedding-model'};
}

export async function interpretWithLocalModel(input: {
  text: string;
  facts: AIFacts;
  history: AIMessage[];
}): Promise<AIIntent> {
  const config = await aiRepository.getModelConfig();
  if (!config.modelUri) throw new Error('No local AI model configured.');
  const context = await ensureContext(config.modelUri);

  const system = [
    'You are the private on-device intent router for LifeOS, a personal operating system.',
    'Your job is to understand the user and return one structured intent.',
    'Do not claim that a database write has happened. LifeOS executes actions after your response.',
    'Use create_task only when the user explicitly wants a task created.',
    'Use add_expense only when the user explicitly reports an expense to record.',
    'Use create_reminder only when the user explicitly asks to be reminded. scheduledAt must be a valid ISO 8601 timestamp calculated from the supplied current local time.',
    'Use plan_day, review_day, or next_action for those explicit requests.',
    'Use ask_memory whenever the user asks about their own history, study knowledge, accomplishments, spending history, workouts, goals, habits, previous reviews, completed work, or anything that should be retrieved from Personal Memory. Put the actual search question in query.',
    'For ordinary general questions unrelated to the user or LifeOS history, action must be none and reply with a concise answer.',
    'For questions about the user, do not answer from the summary facts; route to ask_memory so LifeOS can retrieve evidence.',
    `Current local time ISO: ${input.facts.nowIso}`,
    `Current compact LifeOS facts JSON: ${factsText(input.facts)}`,
    historyText(input.history) ? `Recent conversation:\n${historyText(input.history)}` : '',
  ].filter(Boolean).join('\n\n');

  const result = await context.completion({
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: input.text},
    ],
    temperature: 0.1,
    top_p: 0.9,
    n_predict: 300,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'lifeos_intent',
        strict: true,
        schema: intentSchema,
      },
    },
  } as never);

  const text = String(result.text ?? '').trim();
  if (!text) throw new Error('Local model returned an empty response.');
  return normalizeIntent(JSON.parse(text));
}

export async function answerMemoryWithLocalModel(input: {
  question: string;
  sources: MemorySearchResult[];
}): Promise<string> {
  const config = await aiRepository.getModelConfig();
  if (!config.modelUri) throw new Error('No local answer model configured.');
  const context = await ensureContext(config.modelUri);
  const evidence = input.sources.map((item, index) => {
    const d = item.document;
    return [
      `[S${index + 1}] ${d.sourceType.toUpperCase()} · ${d.title}`,
      d.occurredAt ? `Date: ${d.occurredAt}` : '',
      d.contentText,
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const result = await context.completion({
    messages: [
      {
        role: 'system',
        content: [
          'You are LifeOS Personal Memory, running on device.',
          'Answer the user only from the retrieved LifeOS evidence below.',
          'Do not invent missing facts or infer precise historical facts that the evidence does not support.',
          'Use concise natural language.',
          'When making an important claim, cite the supporting local source tag such as [S1] or [S2].',
          'If the evidence is insufficient, say what LifeOS does not yet know.',
          `Retrieved evidence:\n${evidence || '(no evidence)'}`,
        ].join('\n\n'),
      },
      {role: 'user', content: input.question},
    ],
    temperature: 0.2,
    top_p: 0.9,
    n_predict: 420,
  } as never);

  const text = String(result.text ?? '').trim();
  if (!text) throw new Error('Local model returned an empty memory answer.');
  return text;
}

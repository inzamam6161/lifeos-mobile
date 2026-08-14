export type AIProviderKind = 'deterministic' | 'llama';

export type AIActionType =
  | 'none'
  | 'create_task'
  | 'add_expense'
  | 'create_reminder'
  | 'plan_day'
  | 'review_day'
  | 'next_action'
  | 'ask_memory';

export type AIIntent = {
  action: AIActionType;
  reply: string;
  title?: string;
  notes?: string;
  context?: 'personal' | 'work' | 'study' | 'gym' | 'shopping';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  amountAED?: number;
  merchant?: string;
  categoryHint?: string;
  scheduledAt?: string;
  repeat?: 'none' | 'daily' | 'weekly';
  query?: string;
};

export type AIMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider: AIProviderKind;
  actionType: AIActionType;
  createdAt: string;
};

export type AIConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AIModelConfig = {
  modelUri: string | null;
  modelName: string | null;
  importedAt: string | null;
};

export type AIEmbeddingModelConfig = {
  modelUri: string | null;
  modelName: string | null;
  importedAt: string | null;
};

export type AIFacts = {
  nowIso: string;
  tasks: Array<{
    id: string;
    title: string;
    context: string;
    priority: string;
    dueAt: string | null;
    startAt: string | null;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    context: string;
    scheduledAt: string;
  }>;
  money: {
    currentBalanceMinor: number;
    monthExpenseMinor: number;
    safeToSpendMinor: number;
  };
  progress: {
    lifeScore: number;
    tasksCompletedToday: number;
    workoutsToday: number;
    studyMinutesToday: number;
    habitsCompletedToday: number;
    habitsTotal: number;
  };
};

export type AssistantResult = {
  provider: AIProviderKind;
  intent: AIIntent;
  response: string;
  conversationId: string;
};

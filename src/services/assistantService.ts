import {taskRepository} from '../data/repositories/taskRepository';
import {reminderRepository} from '../data/repositories/reminderRepository';
import {moneyRepository} from '../data/repositories/moneyRepository';
import {progressRepository} from '../data/repositories/progressRepository';
import {scheduleReminderNotification} from './notificationService';
import {aiRepository} from '../data/repositories/aiRepository';
import {interpretWithLocalModel} from './aiModelService';
import {answerFromPersonalMemory} from './memoryService';
import type {AIFacts, AIIntent, AssistantResult, AIProviderKind} from '../features/ai/types';
import type {Task} from '../features/tasks/types';

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function moneySnapshotNumbers(snapshot: Awaited<ReturnType<typeof moneyRepository.loadSnapshot>>) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const income = snapshot.transactions
    .filter(t => t.kind === 'income' && new Date(t.occurredAt) >= monthStart)
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const expense = snapshot.transactions
    .filter(t => t.kind === 'expense' && new Date(t.occurredAt) >= monthStart)
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const opening = snapshot.accounts.reduce((sum, account) => sum + account.openingBalanceMinor, 0);
  const allIncome = snapshot.transactions.filter(t => t.kind === 'income').reduce((sum, t) => sum + t.amountMinor, 0);
  const allExpense = snapshot.transactions.filter(t => t.kind === 'expense').reduce((sum, t) => sum + t.amountMinor, 0);
  const balance = opening + allIncome - allExpense;
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const obligations = snapshot.recurringPayments
    .filter(item => item.active && new Date(item.nextDueAt) >= now && new Date(item.nextDueAt) <= next30)
    .reduce((sum, item) => sum + item.amountMinor, 0);
  return {
    currentBalanceMinor: balance,
    monthExpenseMinor: expense,
    safeToSpendMinor: Math.max(0, balance - obligations),
    monthIncomeMinor: income,
  };
}

async function buildFacts(): Promise<AIFacts> {
  const [tasks, reminders, money, progress] = await Promise.all([
    taskRepository.listActive(),
    reminderRepository.listActive(),
    moneyRepository.loadSnapshot(),
    progressRepository.loadSnapshot(),
  ]);
  const moneyNumbers = moneySnapshotNumbers(money);
  return {
    nowIso: new Date().toISOString(),
    tasks: tasks
      .filter(task => task.status !== 'done')
      .slice(0, 24)
      .map(task => ({
        id: task.id,
        title: task.title,
        context: task.context,
        priority: task.priority,
        dueAt: task.dueAt,
        startAt: task.startAt,
      })),
    reminders: reminders.slice(0, 20).map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      context: reminder.context,
      scheduledAt: reminder.scheduledAt,
    })),
    money: {
      currentBalanceMinor: moneyNumbers.currentBalanceMinor,
      monthExpenseMinor: moneyNumbers.monthExpenseMinor,
      safeToSpendMinor: moneyNumbers.safeToSpendMinor,
    },
    progress: {
      lifeScore: progress.lifeScore.total,
      tasksCompletedToday: progress.todayMetrics.tasksCompleted,
      workoutsToday: progress.todayMetrics.workoutSessions,
      studyMinutesToday: progress.todayMetrics.studyMinutes,
      habitsCompletedToday: progress.todayMetrics.habitsCompleted,
      habitsTotal: progress.todayMetrics.habitsTotal,
    },
  };
}

function parseTimeFallback(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();
  if (/\bin\s+1\s*(hour|hr)\b/.test(lower)) {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
  const tomorrow = /\btomorrow\b/.test(lower);
  const today = /\btoday\b/.test(lower);
  const at = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (tomorrow || today || at) {
    const value = new Date(now);
    if (tomorrow) value.setDate(value.getDate() + 1);
    let hour = at ? Number(at[1]) : 9;
    const minute = at?.[2] ? Number(at[2]) : 0;
    const suffix = at?.[3];
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    value.setHours(hour, minute, 0, 0);
    if (!tomorrow && !today && value <= now) value.setDate(value.getDate() + 1);
    return value.toISOString();
  }
  return null;
}

function fallbackIntent(text: string): AIIntent {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (/^(plan my day|plan today|make.*day plan)/.test(lower)) {
    return {action: 'plan_day', reply: ''};
  }
  if (/^(review my day|how did i do today|daily review)/.test(lower)) {
    return {action: 'review_day', reply: ''};
  }
  if (/^(what should i do next|what next|next task)/.test(lower)) {
    return {action: 'next_action', reply: ''};
  }

  const spent = lower.match(/\b(?:spent|paid)\s+(?:aed\s*)?(\d+(?:\.\d{1,2})?)/);
  if (spent) {
    const merchantMatch = trimmed.match(/\b(?:at|on)\s+(.+)$/i);
    return {
      action: 'add_expense',
      reply: '',
      amountAED: Number(spent[1]),
      merchant: merchantMatch?.[1]?.trim() || 'Expense',
      categoryHint: merchantMatch?.[1]?.trim() || 'other',
    };
  }

  if (/\bremind me\b/.test(lower)) {
    const scheduledAt = parseTimeFallback(trimmed);
    const afterRemind = trimmed.replace(/^.*?\bremind me\b\s*/i, '').trim();
    const toMatch = afterRemind.match(/\bto\s+(.+)$/i);
    let title = toMatch?.[1]?.trim() || afterRemind;
    title = title
      .replace(/\b(today|tomorrow)\b/gi, '')
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, '')
      .replace(/\bin\s+1\s*(hour|hr)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      action: 'create_reminder',
      reply: '',
      title: title || 'Reminder',
      scheduledAt: scheduledAt ?? undefined,
      repeat: 'none',
    };
  }

  const taskMatch = trimmed.match(/^(?:add|create|make)\s+(?:a\s+)?task(?:\s+to)?\s+(.+)$/i);
  if (taskMatch) {
    return {
      action: 'create_task',
      reply: '',
      title: taskMatch[1].trim(),
      context: /\bwork\b/i.test(trimmed) ? 'work' : /\bstudy\b/i.test(trimmed) ? 'study' : 'personal',
      priority: /\burgent\b/i.test(trimmed) ? 'urgent' : /\bhigh\b/i.test(trimmed) ? 'high' : 'medium',
    };
  }

  if (/\b(what did i|what have i|what do i know|how often have i|which goals|which tasks|my spending|my expenses|my workouts|my study|my goals|my habits|my reviews|my history|personal memory|accomplish|accomplished|studied recently|spent too much)\b/i.test(trimmed)) {
    return {action: 'ask_memory', reply: '', query: trimmed};
  }

  return {
    action: 'none',
    reply: 'I can work offline with tasks, expenses, reminders, day planning, daily reviews and next-action suggestions. Import a local GGUF model for broader natural-language understanding.',
  };
}

function priorityRank(task: Task) {
  return ({urgent: 4, high: 3, medium: 2, low: 1})[task.priority] ?? 0;
}

function formatAED(minor: number) {
  return `AED ${(minor / 100).toFixed(2)}`;
}

function categoryIdForHint(hint = '', merchant = '') {
  const value = `${hint} ${merchant}`.toLowerCase();
  if (/grocery|groceries|carrefour|lulu|supermarket/.test(value)) return 'cat_groceries';
  if (/restaurant|food|dining|coffee|cafe|starbucks|lunch|dinner|breakfast/.test(value)) return 'cat_food';
  if (/fuel|petrol|transport|taxi|uber|careem|parking/.test(value)) return 'cat_transport';
  if (/gym|fitness|sport/.test(value)) return 'cat_fitness';
  if (/course|book|study|learning|udemy/.test(value)) return 'cat_learning';
  if (/rent|internet|electric|water|home|bill/.test(value)) return 'cat_home';
  if (/shopping|clothes|amazon|noon|electronics/.test(value)) return 'cat_shopping';
  return 'cat_other';
}

async function planDay() {
  const [tasks, reminders] = await Promise.all([taskRepository.listActive(), reminderRepository.listActive()]);
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const todayTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => !task.startAt || new Date(task.startAt) <= end)
    .sort((a, b) => {
      const aOver = a.dueAt && new Date(a.dueAt) < now ? 1 : 0;
      const bOver = b.dueAt && new Date(b.dueAt) < now ? 1 : 0;
      return bOver - aOver || priorityRank(b) - priorityRank(a);
    })
    .slice(0, 4);
  const todayReminders = reminders
    .filter(reminder => new Date(reminder.scheduledAt) <= end)
    .slice(0, 3);

  if (!todayTasks.length && !todayReminders.length) {
    return 'Your schedule is clear. Pick one important goal and protect a focused block for it.';
  }

  const lines = ['Here is a practical plan from your local LifeOS data:'];
  todayTasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task.title} · ${task.priority}${task.estimateMinutes ? ` · ${task.estimateMinutes}m` : ''}`);
  });
  if (todayReminders.length) {
    lines.push(`Reminders: ${todayReminders.map(item => item.title).join(', ')}.`);
  }
  return lines.join('\n');
}

async function reviewDay() {
  const progress = await progressRepository.loadSnapshot();
  const money = await moneyRepository.loadSnapshot();
  const todayStart = startOfDay();
  const spent = money.transactions
    .filter(item => item.kind === 'expense' && new Date(item.occurredAt) >= todayStart)
    .reduce((sum, item) => sum + item.amountMinor, 0);
  const m = progress.todayMetrics;
  return [
    `Today: ${m.tasksCompleted} tasks completed, ${m.workoutSessions} workout${m.workoutSessions === 1 ? '' : 's'}, ${m.studyMinutes} study minutes.`,
    `${m.habitsCompleted}/${m.habitsTotal} habits completed. Spending today: ${formatAED(spent)}.`,
    `Current Life Score: ${progress.lifeScore.total}%.`,
  ].join('\n');
}

async function nextAction() {
  const tasks = (await taskRepository.listActive()).filter(task => task.status !== 'done');
  if (!tasks.length) return 'You have no open tasks. Use the time for a goal, study session, workout, or recovery.';
  const now = new Date();
  tasks.sort((a, b) => {
    const aOver = a.dueAt && new Date(a.dueAt) < now ? 1 : 0;
    const bOver = b.dueAt && new Date(b.dueAt) < now ? 1 : 0;
    return bOver - aOver || priorityRank(b) - priorityRank(a) ||
      (new Date(a.dueAt ?? '2999-01-01').getTime() - new Date(b.dueAt ?? '2999-01-01').getTime());
  });
  const task = tasks[0];
  return `Do this next: ${task.title}. Priority: ${task.priority}${task.estimateMinutes ? ` · about ${task.estimateMinutes} minutes` : ''}.`;
}

async function executeIntent(intent: AIIntent): Promise<string> {
  switch (intent.action) {
    case 'create_task': {
      if (!intent.title?.trim()) throw new Error('The task needs a title.');
      const task = await taskRepository.create({
        title: intent.title,
        notes: intent.notes,
        context: intent.context ?? 'personal',
        priority: intent.priority ?? 'medium',
      });
      return `Added task: ${task.title}.`;
    }
    case 'add_expense': {
      const amount = Number(intent.amountAED ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('The expense needs a valid amount.');
      const amountMinor = Math.round(amount * 100);
      const merchant = intent.merchant?.trim() || 'Expense';
      await moneyRepository.createTransaction({
        accountId: 'account_main',
        categoryId: categoryIdForHint(intent.categoryHint, merchant),
        kind: 'expense',
        amountMinor,
        merchant,
        notes: intent.notes,
        source: 'manual',
      });
      return `Recorded ${formatAED(amountMinor)} at ${merchant}.`;
    }
    case 'create_reminder': {
      if (!intent.title?.trim()) throw new Error('The reminder needs a title.');
      const scheduledAt = intent.scheduledAt && Number.isFinite(new Date(intent.scheduledAt).getTime())
        ? new Date(intent.scheduledAt).toISOString()
        : null;
      if (!scheduledAt) throw new Error('I need a valid reminder time.');
      const reminder = await reminderRepository.create({
        title: intent.title,
        notes: intent.notes,
        context: intent.context ?? 'personal',
        scheduledAt,
        repeat: intent.repeat ?? 'none',
      });
      await scheduleReminderNotification(reminder).catch(() => null);
      return `Reminder created for ${new Intl.DateTimeFormat(undefined, {weekday: 'short', hour: 'numeric', minute: '2-digit'}).format(new Date(reminder.scheduledAt))}: ${reminder.title}.`;
    }
    case 'plan_day':
      return planDay();
    case 'review_day':
      return reviewDay();
    case 'next_action':
      return nextAction();
    case 'ask_memory': {
      const question = intent.query?.trim() || intent.reply?.trim();
      if (!question) throw new Error('Personal Memory needs a question.');
      const answer = await answerFromPersonalMemory(question);
      return answer.text;
    }
    case 'none':
    default:
      return intent.reply || 'Done.';
  }
}

export async function runAssistant(text: string): Promise<AssistantResult> {
  const input = text.trim();
  if (!input) throw new Error('Enter a message first.');

  const conversation = await aiRepository.getOrCreateDefaultConversation();
  const history = await aiRepository.listMessages(conversation.id, 12);
  const facts = await buildFacts();
  const model = await aiRepository.getModelConfig();

  await aiRepository.appendMessage({
    conversationId: conversation.id,
    role: 'user',
    content: input,
    provider: model.modelUri ? 'llama' : 'deterministic',
  });

  let provider: AIProviderKind = 'deterministic';
  let intent: AIIntent;
  if (model.modelUri) {
    try {
      intent = await interpretWithLocalModel({text: input, facts, history});
      provider = 'llama';
    } catch {
      intent = fallbackIntent(input);
      provider = 'deterministic';
    }
  } else {
    intent = fallbackIntent(input);
  }

  let response = '';
  let status: 'success' | 'failed' | 'ignored' = intent.action === 'none' ? 'ignored' : 'success';
  try {
    const execution = await executeIntent(intent);
    response = intent.action === 'none' || intent.action === 'ask_memory'
      ? execution
      : [intent.reply, execution].filter(Boolean).join('\n');
  } catch (error) {
    status = 'failed';
    const message = error instanceof Error ? error.message : 'Action failed.';
    response = `I understood the request, but LifeOS did not write anything: ${message}`;
  }

  await aiRepository.appendMessage({
    conversationId: conversation.id,
    role: 'assistant',
    content: response,
    provider,
    actionType: intent.action,
  });
  await aiRepository.logAction({
    conversationId: conversation.id,
    actionType: intent.action,
    payload: intent,
    status,
    resultText: response,
  });

  return {provider, intent, response, conversationId: conversation.id};
}

export async function loadAssistantMessages() {
  const conversation = await aiRepository.getOrCreateDefaultConversation();
  return aiRepository.listMessages(conversation.id, 40);
}

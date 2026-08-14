import {database} from '../database/client';
import type {CreateReminderInput, Reminder, ReminderRepeat} from '../../features/reminders/types';
import {createId} from '../../utils/createId';
import type {ReminderRepository} from './ReminderRepositoryContract';

type ReminderRow = {
  id: string;
  title: string;
  notes: string | null;
  context: Reminder['context'];
  scheduled_at: string;
  repeat_rule: ReminderRepeat;
  status: Reminder['status'];
  linked_task_id: string | null;
  notification_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const reminderSelect = `SELECT id, title, notes, context, scheduled_at, repeat_rule, status,
  linked_task_id, notification_id, completed_at, created_at, updated_at FROM reminders`;

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    context: row.context,
    scheduledAt: row.scheduled_at,
    repeat: row.repeat_rule,
    status: row.status,
    linkedTaskId: row.linked_task_id,
    notificationId: row.notification_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getReminder(id: string) {
  let row: ReminderRow | undefined;
  await database.transaction(async tx => {
    const result = await tx.execute(`${reminderSelect} WHERE id = ? LIMIT 1;`, [id]);
    row = result.rows[0] as unknown as ReminderRow | undefined;
  });
  if (!row) throw new Error('Reminder not found.');
  return mapReminder(row);
}

function nextOccurrence(iso: string, repeat: ReminderRepeat) {
  const next = new Date(iso);
  const now = Date.now();
  const days = repeat === 'weekly' ? 7 : 1;
  do {
    next.setDate(next.getDate() + days);
  } while (next.getTime() <= now);
  return next.toISOString();
}

class SQLiteReminderRepository implements ReminderRepository {
  async listActive() {
    let rows: ReminderRow[] = [];
    await database.transaction(async tx => {
      const result = await tx.execute(
        `${reminderSelect} WHERE status = 'scheduled' ORDER BY scheduled_at ASC;`,
      );
      rows = result.rows as unknown as ReminderRow[];
    });
    return rows.map(mapReminder);
  }

  async create(input: CreateReminderInput) {
    const title = input.title.trim();
    if (!title) throw new Error('Reminder title is required.');
    if (!Number.isFinite(new Date(input.scheduledAt).getTime())) throw new Error('Invalid reminder date.');
    const now = new Date().toISOString();
    const reminder: Reminder = {
      id: createId('reminder'),
      title,
      notes: input.notes?.trim() || null,
      context: input.context ?? 'personal',
      scheduledAt: input.scheduledAt,
      repeat: input.repeat ?? 'none',
      status: 'scheduled',
      linkedTaskId: input.linkedTaskId ?? null,
      notificationId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await database.transaction(async tx => {
      await tx.execute(
        `INSERT INTO reminders(id, title, notes, context, scheduled_at, repeat_rule, status,
          linked_task_id, notification_id, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, NULL, NULL, ?, ?);`,
        [reminder.id, reminder.title, reminder.notes, reminder.context, reminder.scheduledAt,
          reminder.repeat, reminder.linkedTaskId, now, now],
      );
    });
    return reminder;
  }

  async complete(id: string) {
    const reminder = await getReminder(id);
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      if (reminder.repeat === 'none') {
        await tx.execute(
          `UPDATE reminders SET status = 'completed', completed_at = ?, notification_id = NULL, updated_at = ? WHERE id = ?;`,
          [now, now, id],
        );
      } else {
        await tx.execute(
          `UPDATE reminders SET scheduled_at = ?, completed_at = ?, notification_id = NULL, updated_at = ? WHERE id = ?;`,
          [nextOccurrence(reminder.scheduledAt, reminder.repeat), now, now, id],
        );
      }
    });
    return getReminder(id);
  }

  async snooze(id: string, minutes: number) {
    const next = new Date(Date.now() + Math.max(1, minutes) * 60_000).toISOString();
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `UPDATE reminders SET scheduled_at = ?, notification_id = NULL, updated_at = ? WHERE id = ? AND status = 'scheduled';`,
        [next, now, id],
      );
    });
    return getReminder(id);
  }

  async cancel(id: string) {
    const now = new Date().toISOString();
    await database.transaction(async tx => {
      await tx.execute(
        `UPDATE reminders SET status = 'cancelled', notification_id = NULL, updated_at = ? WHERE id = ?;`,
        [now, id],
      );
    });
    return getReminder(id);
  }

  async attachNotificationId(id: string, notificationId: string | null) {
    await database.transaction(async tx => {
      await tx.execute('UPDATE reminders SET notification_id = ?, updated_at = ? WHERE id = ?;', [notificationId, new Date().toISOString(), id]);
    });
  }
}

export const reminderRepository: ReminderRepository = new SQLiteReminderRepository();

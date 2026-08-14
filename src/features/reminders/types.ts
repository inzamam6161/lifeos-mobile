import type {TaskContext} from '../tasks/types';

export type ReminderRepeat = 'none' | 'daily' | 'weekly';
export type ReminderStatus = 'scheduled' | 'completed' | 'cancelled';

export type Reminder = {
  id: string;
  title: string;
  notes: string | null;
  context: TaskContext;
  scheduledAt: string;
  repeat: ReminderRepeat;
  status: ReminderStatus;
  linkedTaskId: string | null;
  notificationId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderInput = {
  title: string;
  notes?: string;
  context?: TaskContext;
  scheduledAt: string;
  repeat?: ReminderRepeat;
  linkedTaskId?: string;
};

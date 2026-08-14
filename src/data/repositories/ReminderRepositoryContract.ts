import type {CreateReminderInput, Reminder} from '../../features/reminders/types';

export interface ReminderRepository {
  listActive(): Promise<Reminder[]>;
  create(input: CreateReminderInput): Promise<Reminder>;
  complete(id: string): Promise<Reminder>;
  snooze(id: string, minutes: number): Promise<Reminder>;
  cancel(id: string): Promise<Reminder>;
  attachNotificationId(id: string, notificationId: string | null): Promise<void>;
}

import {Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import type {Reminder} from '../features/reminders/types';
import {reminderRepository} from '../data/repositories/reminderRepository';

const CHANNEL_ID = 'lifeos-reminders';

export type NotificationAccess = {
  notifications: boolean;
  exactAlarms: boolean;
};

export async function ensureReminderChannel() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'LifeOS reminders',
      importance: AndroidImportance.HIGH,
    });
  }
}

export async function getNotificationAccess(): Promise<NotificationAccess> {
  const settings = await notifee.getNotificationSettings();
  const notifications = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  const exactAlarms = Platform.OS !== 'android' || settings.android.alarm === AndroidNotificationSetting.ENABLED;
  return {notifications, exactAlarms};
}

export async function requestNotificationAccess() {
  await notifee.requestPermission();
  await ensureReminderChannel();
  return getNotificationAccess();
}

export async function openExactAlarmSettings() {
  if (Platform.OS === 'android') await notifee.openAlarmPermissionSettings();
}

function repeatFrequency(reminder: Reminder) {
  if (reminder.repeat === 'daily') return RepeatFrequency.DAILY;
  if (reminder.repeat === 'weekly') return RepeatFrequency.WEEKLY;
  return undefined;
}

export async function cancelReminderNotification(reminder: Reminder) {
  if (reminder.notificationId) {
    await notifee.cancelTriggerNotification(reminder.notificationId).catch(() => undefined);
  }
}

export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  const access = await getNotificationAccess();
  if (!access.notifications || !access.exactAlarms || reminder.status !== 'scheduled') return null;
  const timestamp = new Date(reminder.scheduledAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;

  await ensureReminderChannel();
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    repeatFrequency: repeatFrequency(reminder),
    ...(Platform.OS === 'android' ? {alarmManager: {allowWhileIdle: true}} : {}),
  };
  const notificationId = reminder.id;
  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: reminder.title,
      body: reminder.notes ?? 'LifeOS reminder',
      data: {reminderId: reminder.id, linkedTaskId: reminder.linkedTaskId ?? ''},
      android: {channelId: CHANNEL_ID, pressAction: {id: 'default'}},
    },
    trigger,
  );
  await reminderRepository.attachNotificationId(reminder.id, notificationId);
  return notificationId;
}

export async function syncReminderNotifications(reminders?: Reminder[]) {
  const access = await getNotificationAccess();
  if (!access.notifications || !access.exactAlarms) return access;
  const active = reminders ?? await reminderRepository.listActive();
  // Stay below platform trigger limits and prioritize the nearest reminders.
  const future = active
    .filter(item => new Date(item.scheduledAt).getTime() > Date.now())
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 40);
  for (const reminder of future) {
    await scheduleReminderNotification(reminder);
  }
  return access;
}

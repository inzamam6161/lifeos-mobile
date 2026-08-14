import {createAsyncThunk, createEntityAdapter, createSlice} from '@reduxjs/toolkit';
import {reminderRepository} from '../../data/repositories/reminderRepository';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
  syncReminderNotifications,
} from '../../services/notificationService';
import type {CreateReminderInput, Reminder} from './types';

const remindersAdapter = createEntityAdapter<Reminder>({
  sortComparer: (a, b) => a.scheduledAt.localeCompare(b.scheduledAt),
});

export const loadReminders = createAsyncThunk('reminders/load', async () => reminderRepository.listActive());

export const addReminder = createAsyncThunk('reminders/add', async (input: CreateReminderInput) => {
  const reminder = await reminderRepository.create(input);
  await scheduleReminderNotification(reminder).catch(() => null);
  return reminderRepository.listActive().then(items => items.find(item => item.id === reminder.id) ?? reminder);
});

export const completeReminder = createAsyncThunk('reminders/complete', async (id: string) => {
  const active = await reminderRepository.listActive();
  const previous = active.find(item => item.id === id);
  if (previous) await cancelReminderNotification(previous);
  const reminder = await reminderRepository.complete(id);
  if (reminder.status === 'scheduled') await scheduleReminderNotification(reminder).catch(() => null);
  return reminder;
});

export const snoozeReminder = createAsyncThunk(
  'reminders/snooze',
  async ({id, minutes}: {id: string; minutes: number}) => {
    const active = await reminderRepository.listActive();
    const previous = active.find(item => item.id === id);
    if (previous) await cancelReminderNotification(previous);
    const reminder = await reminderRepository.snooze(id, minutes);
    await scheduleReminderNotification(reminder).catch(() => null);
    return reminder;
  },
);

export const cancelReminder = createAsyncThunk('reminders/cancel', async (id: string) => {
  const active = await reminderRepository.listActive();
  const previous = active.find(item => item.id === id);
  if (previous) await cancelReminderNotification(previous);
  await reminderRepository.cancel(id);
  return id;
});

export const resyncReminderNotifications = createAsyncThunk('reminders/resync', async () => {
  const reminders = await reminderRepository.listActive();
  await syncReminderNotifications(reminders);
  return reminderRepository.listActive();
});

const remindersSlice = createSlice({
  name: 'reminders',
  initialState: remindersAdapter.getInitialState({
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    error: null as string | null,
  }),
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadReminders.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadReminders.fulfilled, (state, action) => {
        remindersAdapter.setAll(state, action.payload);
        state.status = 'ready';
      })
      .addCase(loadReminders.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Unable to load reminders.';
      })
      .addCase(addReminder.fulfilled, remindersAdapter.upsertOne)
      .addCase(completeReminder.fulfilled, (state, action) => {
        if (action.payload.status === 'scheduled') remindersAdapter.upsertOne(state, action.payload);
        else remindersAdapter.removeOne(state, action.payload.id);
      })
      .addCase(snoozeReminder.fulfilled, remindersAdapter.upsertOne)
      .addCase(cancelReminder.fulfilled, remindersAdapter.removeOne)
      .addCase(resyncReminderNotifications.fulfilled, remindersAdapter.setAll);
  },
});

export const remindersReducer = remindersSlice.reducer;
export {remindersAdapter};

import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from '../../app/store';
import {endOfLocalDay, startOfLocalDay} from '../../utils/dateTime';
import {remindersAdapter} from './remindersSlice';

export const reminderSelectors = remindersAdapter.getSelectors<RootState>(state => state.reminders);

export const selectTodayReminders = createSelector(reminderSelectors.selectAll, reminders => {
  const start = startOfLocalDay().getTime();
  const end = endOfLocalDay().getTime();
  return reminders.filter(item => {
    const time = new Date(item.scheduledAt).getTime();
    return time >= start && time <= end;
  });
});

export const selectOverdueReminders = createSelector(reminderSelectors.selectAll, reminders => {
  const now = Date.now();
  return reminders.filter(item => new Date(item.scheduledAt).getTime() < now);
});

export const selectUpcomingReminders = createSelector(reminderSelectors.selectAll, reminders => {
  const now = Date.now();
  return reminders.filter(item => new Date(item.scheduledAt).getTime() >= now);
});

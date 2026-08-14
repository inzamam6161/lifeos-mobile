import {createSelector} from '@reduxjs/toolkit';
import {tasksAdapter} from './tasksSlice';
import type {RootState} from '../../app/store';

export const taskSelectors = tasksAdapter.getSelectors<RootState>(state => state.tasks);

export const selectTaskSummary = createSelector(taskSelectors.selectAll, tasks => {
  const completed = tasks.filter(task => task.status === 'done').length;
  return {total: tasks.length, completed, open: tasks.length - completed};
});

export const selectBoards = (state: RootState) => state.boards.boards;
export const selectColumns = (state: RootState) => state.boards.columns;
export const selectLabels = (state: RootState) => state.boards.labels;
export const selectSubtasks = (state: RootState) => state.boards.subtasks;
export const selectTaskLabels = (state: RootState) => state.boards.taskLabels;

export const selectWorkTasks = createSelector(taskSelectors.selectAll, tasks =>
  tasks.filter(task => task.context === 'work' && task.status !== 'done'),
);

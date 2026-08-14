import {configureStore} from '@reduxjs/toolkit';
import {boardsReducer} from '../features/tasks/boardsSlice';
import {tasksReducer} from '../features/tasks/tasksSlice';
import {remindersReducer} from '../features/reminders/remindersSlice';
import {moneyReducer} from '../features/money/moneySlice';
import {shoppingReducer} from '../features/shopping/shoppingSlice';
import {gymReducer} from '../features/gym/gymSlice';
import {studyReducer} from '../features/study/studySlice';
import {progressReducer} from '../features/progress/progressSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    boards: boardsReducer,
    reminders: remindersReducer,
    money: moneyReducer,
    shopping: shoppingReducer,
    gym: gymReducer,
    study: studyReducer,
    progress: progressReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

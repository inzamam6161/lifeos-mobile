import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {taskBoardRepository} from '../../data/repositories/taskBoardRepository';
import {Subtask, TaskSystemSnapshot} from './types';

const emptySnapshot: TaskSystemSnapshot = {
  workspaces: [],
  boards: [],
  columns: [],
  labels: [],
  subtasks: [],
  taskLabels: {},
};

type BoardsState = TaskSystemSnapshot & {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

const initialState: BoardsState = {...emptySnapshot, status: 'idle', error: null};

export const loadTaskSystem = createAsyncThunk('boards/load', async () =>
  taskBoardRepository.loadSnapshot(),
);

export const addSubtask = createAsyncThunk(
  'boards/addSubtask',
  async ({taskId, title}: {taskId: string; title: string}) =>
    taskBoardRepository.addSubtask(taskId, title),
);

export const toggleSubtask = createAsyncThunk(
  'boards/toggleSubtask',
  async ({id, completed}: {id: string; completed: boolean}) =>
    taskBoardRepository.toggleSubtask(id, completed),
);


export const recordFocusSession = createAsyncThunk(
  'boards/recordFocusSession',
  async ({taskId, startedAt, endedAt, durationSeconds}: {taskId: string | null; startedAt: string; endedAt: string; durationSeconds: number}) => {
    await taskBoardRepository.recordFocusSession(taskId, startedAt, endedAt, durationSeconds);
  },
);

export const toggleTaskLabel = createAsyncThunk(
  'boards/toggleTaskLabel',
  async (
    {taskId, labelId, attached}: {taskId: string; labelId: string; attached: boolean},
  ) => {
    if (attached) await taskBoardRepository.detachLabel(taskId, labelId);
    else await taskBoardRepository.attachLabel(taskId, labelId);
    return {taskId, labelId, attached: !attached};
  },
);

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    replaceSubtask(state, action: PayloadAction<Subtask>) {
      const index = state.subtasks.findIndex(item => item.id === action.payload.id);
      if (index >= 0) state.subtasks[index] = action.payload;
      else state.subtasks.push(action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadTaskSystem.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadTaskSystem.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.status = 'ready';
      })
      .addCase(loadTaskSystem.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message ?? 'Unable to load boards.';
      })
      .addCase(addSubtask.fulfilled, (state, action) => {
        state.subtasks.push(action.payload);
      })
      .addCase(toggleSubtask.fulfilled, (state, action) => {
        const index = state.subtasks.findIndex(item => item.id === action.payload.id);
        if (index >= 0) state.subtasks[index] = action.payload;
      })
      .addCase(toggleTaskLabel.fulfilled, (state, action) => {
        const {taskId, labelId, attached} = action.payload;
        const current = state.taskLabels[taskId] ?? [];
        state.taskLabels[taskId] = attached
          ? Array.from(new Set([...current, labelId]))
          : current.filter(id => id !== labelId);
      });
  },
});

export const boardsReducer = boardsSlice.reducer;
